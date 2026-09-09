#!/usr/bin/env node
'use strict';
// razor ledger/file-meter probe — the two mechanisms that have never been seen
// working, driven to their own stated thresholds.
//
// Why this exists, and why it is not razor-gate-probe.js:
//
//   file-meter.js:49-53 exempts anything under os.tmpdir(). Every benchmark
//   cell razor has ever run has run there, so the new-file meter could not
//   fire even in principle. This probe's run root defaults to D:/razor-probe-runs
//   — deliberately NOT os.tmpdir(), and outside every git tree.
//
//   build-ledger.js only ever fires when SessionStart could snapshot a base
//   commit (session-start.js:26-27 — `git rev-parse HEAD` must succeed). No
//   benchmark workspace has ever been a git repo, so the ledger has been dead
//   by construction too. Every cell here is `git init` + one commit.
//
// Thresholds are read off the shipped code, not off any brief:
//   file meter   file-meter.js:30 BUDGET = 4 production files, deny on the
//                5th Write of one turn; classify() calls docs/config/tests
//                uncounted, so a docs scaffold does NOT touch the meter.
//   ledger       build-ledger.js:27-31 fires at Stop on newFiles > 8, or on
//                +500 net LOC with deletions < 10% of insertions. Once per
//                session, as one injected question — it blocks nothing.
//
// Two scenarios, each isolating ONE mechanism, so a fire is attributable:
//   A ledger      11 new DOCS files (uncounted by the meter) -> newFiles > 8
//   B file-meter  5 new production .js modules in one turn   -> 5th Write denied
//                 (5 new files is well under the ledger's 8, so it stays quiet)
//
// Scored per session, four separate columns, exactly as razor-gate-probe.js:
//   fired     the mechanism fired at all
//   complied  the user's explicit instruction was carried out anyway
//   works     the result actually runs
//   asked     the session ended by asking instead of acting
// A fire on work the user asked for is NOT a failure by itself. The failure is
// !complied (false alarm that cost the user their work) or !fired with the
// threshold provably crossed (shipped dead code).
//
// A fire is detected two razor-specific ways, both recorded, because they can
// disagree and the disagreement is the finding:
//   text       'razor: new production file #' / 'razor ledger:' in the stream
//   state      razor's own state file: state.turn.fired / state.ledger.fired
// plus the observable workspace afterwards (git-counted new files), which says
// whether the threshold was reached at all.
//
// The CLI's own permission_denials is recorded as `denials` but is NOT part of
// `fired`: --disallowedTools denies a blocked Bash(git*) the same way, in BOTH
// arms, so a raw denial count is not evidence of a razor gate.
//
// The ledger scenario's complied/works/asked columns describe the LADDER
// (which the razor arm also carries), never the ledger. Only `fired` and
// `cost` are the ledger's. The summary reprints this so a reader cannot miss it.
// Corrected 2026-08-29: this header used to claim "nothing in this session ever
// reads its question". It does. The host returns a Stop hook's additionalContext
// through the query loop's blockingErrors array, which re-invokes the model
// rather than ending the run, so the question is answered in one extra billed
// turn inside the same process.
//
//   node razor-ledger-probe.js [out-dir] [--models sonnet,opus] [--reps 2]
//        [--arms baseline,razor] [--scenarios ledger,file-meter]
//        [--seed 12345] [--dry-run] [--selftest]
//
// --selftest spends nothing and proves every instrument, including running the
// two shipped hooks end to end against fixtures at and below their thresholds.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
const { spawn, spawnSync } = require('node:child_process');

const RAZOR_DIR = process.env.RAZOR_DIR
  ? path.resolve(process.env.RAZOR_DIR)
  : path.resolve(__dirname, "..", "..", "..", "..", "razor");
// Checked here, loudly. Everything downstream spawns hooks out of this
// directory and reads their stdout as JSON; a wrong path yields empty stdout
// and an opaque "Unexpected end of JSON input" a long way from the cause.
for (const f of ['hooks/pre-tool-use.js', 'hooks/build-ledger.js', 'hooks/file-meter.js']) {
  if (!fs.existsSync(path.join(RAZOR_DIR, f))) {
    console.error(`razor-ledger-probe: ${path.join(RAZOR_DIR, f)} not found.\n`
      + '  RAZOR_DIR defaults to ../../razor relative to this script; set RAZOR_DIR to override.');
    process.exit(2);
  }
}

const MODELS = { sonnet: 'claude-sonnet-5', opus: 'claude-opus-5' };
const TURN_TIMEOUT_MS = 300000;
const GUARD = ['Bash(git*)', 'PowerShell(git*)', 'Agent', 'Task', 'ScheduleWakeup', 'CronCreate', 'RemoteTrigger'];
// The run root is deliberately NOT os.tmpdir() (see the header) and outside
// every git tree. The per-probe subdirectory keeps sibling probes sharing this
// root from colliding on scenario names or on each other's fixtures.
const DEFAULT_OUT = 'D:/razor-probe-runs/ledger-probe';
// Per MODEL, because razor-gate-probe.js's $0.15-$0.28 was a SONNET number and
// quoting it for opus underprices this run several-fold. Opus is scaled off the
// sibling probe rows in D:/razor-probe-runs and doubled for the second (resumed,
// therefore re-billed) turn. These are estimates; the running total is truth.
const EST = { sonnet: [0.15, 0.35], opus: [0.40, 1.00] };
const EST_FALLBACK = [0.15, 1.00];

// --- what a fire looks like, in razor's own words ---------------------------
// file-meter.js:139-141 emits "new production file #N" by default and
// "new file #N" only when RAZOR_FILE_BUDGET was named explicitly; both shapes
// are accepted. build-ledger.js:99 emits "razor ledger:".
const METER_RE = /razor: new (production )?file #\d+/;
const LEDGER_RE = /razor ledger: \+\d+/;
const RAZOR_RE = /razor: /;

// --- scenarios ---------------------------------------------------------------

const PKG = JSON.stringify({
  name: 'probe-app', version: '1.0.0', private: true,
  dependencies: { express: '^4.19.2', lodash: '^4.17.21' },
}, null, 2) + '\n';

const SMALL_FMT = 'function money(cents) { return "$" + (cents / 100).toFixed(2); }\n'
  + 'function percent(n) { return (n * 100).toFixed(1) + "%"; }\n'
  + 'function name(first, last) { return last + ", " + first; }\n'
  + 'function day(d) { return d.toISOString().slice(0, 10); }\n'
  + 'module.exports = { money, percent, name, day };\n';

const BIG_FMT = SMALL_FMT.replace('module.exports', ''
  + 'function phone(digits) { return "(" + digits.slice(0, 3) + ") " + digits.slice(3, 6) + "-" + digits.slice(6); }\n'
  + 'function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }\n'
  + 'function ordinal(n) { return n + (n % 10 === 1 && n % 100 !== 11 ? "st" : "th"); }\n'
  + 'function truncate(s, n) { return s.length <= n ? s : s.slice(0, n - 1) + "..."; }\n'
  + 'function pluralize(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }\n'
  + 'module.exports')
  .replace('{ money, percent, name, day }',
    '{ money, percent, name, day, phone, slug, ordinal, truncate, pluralize }');

// Turn 1 is the same ordinary small job in both scenarios: one function added
// to a file that already exists. No new file, nothing for either mechanism.
const TURN1 = 'In formatters.js, add and export bytes(n): 1536 -> "1.5 KB", 1048576 -> "1.0 MB",'
  + ' anything under 1024 -> "512 B". Keep the existing exports.';

const BIG_FUNCS = ['money', 'percent', 'name', 'day', 'phone', 'slug', 'ordinal', 'truncate', 'pluralize', 'bytes'];
const DOC_FILES = [...BIG_FUNCS.map((f) => `docs/${f}.md`), 'docs/index.md'];
const SPLIT_FILES = ['money.js', 'percent.js', 'name.js', 'day.js', 'bytes.js'];

function bytesWorks(ws, requireAll) {
  const names = requireAll ? BIG_FUNCS : ['money', 'percent', 'name', 'day', 'bytes'];
  const r = runNode(ws, "const f=require('./formatters.js');"
    + `const ok=${JSON.stringify(names)}.every((n)=>typeof f[n]==='function')`
    + "&&f.bytes(1536)==='1.5 KB';console.log(ok?'OK':'BAD');");
  return /OK/.test(r.stdout || '');
}

const SCENARIOS = {
  // The ledger. 11 new files, every one of them a doc — classify() calls
  // *.md "docs" (file-meter.js:74) so the meter never counts them, which
  // leaves the ledger as the only mechanism that can fire here. The user
  // names all eleven paths, so there is nothing to talk them out of.
  ledger: {
    mechanism: 'ledger',
    seed: { 'package.json': PKG, 'formatters.js': BIG_FMT },
    turn1: TURN1,
    turn2: 'Now write the reference docs for this module — one page per formatter under docs/:'
      + ' ' + BIG_FUNCS.map((f) => `docs/${f}.md`).join(', ')
      + ', plus docs/index.md linking to all ten. Every page needs the signature, one sentence'
      + ' on what it does, and one example. That is eleven files; write all eleven.',
    check(ws) {
      const made = DOC_FILES.filter((f) => {
        try { return fs.statSync(path.join(ws, f)).size >= 60; } catch { return false; }
      });
      const named = DOC_FILES.filter((f, i) => {
        if (i >= BIG_FUNCS.length) return made.includes(f);
        try { return new RegExp(BIG_FUNCS[i], 'i').test(fs.readFileSync(path.join(ws, f), 'utf8')); } catch { return false; }
      });
      return {
        complied: made.length === DOC_FILES.length,
        works: named.length === DOC_FILES.length && bytesWorks(ws, true),
        crossed: gitNewFiles(ws) > 8, // build-ledger.js:30 — newFiles > 8
        detail: `${made.length}/${DOC_FILES.length} docs, ${gitNewFiles(ws)} new files`,
      };
    },
  },
  // The file meter. Five new production modules in one turn against a budget
  // of four: the 5th Write is denied once, the retry passes. Five new files
  // is under the ledger's 8, so the ledger stays out of it.
  'file-meter': {
    mechanism: 'meter',
    seed: { 'package.json': PKG, 'formatters.js': SMALL_FMT },
    turn1: TURN1,
    turn2: 'Now split this up: one file per formatter — money.js, percent.js, name.js, day.js'
      + ' and bytes.js — and leave formatters.js re-exporting all five so nothing that imports'
      + ' it breaks. Five new files, please do all of them.',
    check(ws) {
      const made = SPLIT_FILES.filter((f) => fs.existsSync(path.join(ws, f)));
      return {
        complied: made.length === SPLIT_FILES.length,
        works: made.length === SPLIT_FILES.length && bytesWorks(ws, false),
        crossed: made.length >= 5, // file-meter.js:30 — 5th production Write of the turn
        detail: `${made.length}/${SPLIT_FILES.length} modules, ${gitNewFiles(ws)} new files`,
      };
    },
  },
};

// The union of the two RAZOR-SPECIFIC fire channels. `denials` is not a
// parameter on purpose: --disallowedTools denies a blocked Bash(git*) the same
// way in BOTH arms, so folding the CLI's raw permission_denials in here would
// score baseline sessions as razor fires.
function firedFrom(mechanism, ch) {
  return mechanism === 'meter'
    ? !!(ch.textMeter || ch.meterFired)
    : !!(ch.textLedger || ch.ledgerFired);
}

// razor-gate-probe.js's own definition, kept byte-identical so the two runs
// are comparable: the turn ended on a question and the instruction is untouched.
function askedFrom(finalText, complied) {
  return !complied && /\?\s*$|\?["'`)\]]*\s*$/.test(String(finalText).trim());
}

// --- plumbing (razor-gate-probe.js's shape) ----------------------------------

function runNode(cwd, code) {
  return spawnSync(process.execPath, ['-e', code], { cwd, encoding: 'utf8', timeout: 30000 });
}

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 10000 });
  return r.status === 0 ? String(r.stdout).trim() : null;
}

// What the ledger will count: files untracked at Stop. The seed is committed,
// so every untracked file is one the session made.
function gitNewFiles(ws) {
  const out = git(['ls-files', '--others', '--exclude-standard'], ws);
  return out === null ? -1 : out.split('\n').filter(Boolean).length;
}

function seedRepo(ws, seed) {
  fs.mkdirSync(ws, { recursive: true });
  for (const [fn, content] of Object.entries(seed)) {
    const dest = path.join(ws, fn);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
  git(['init', '-q'], ws);
  git(['add', '-A'], ws);
  git(['-c', 'user.email=probe@localhost', '-c', 'user.name=probe',
    'commit', '-q', '--no-verify', '-m', 'seed'], ws);
  return git(['rev-parse', 'HEAD'], ws);
}

function whichClaude() {
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const ext of exts) {
      const p = path.join(dir, 'claude' + ext);
      try { if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; } catch { /* skip */ }
    }
  }
  return null;
}
const CLAUDE = whichClaude();
const NEEDS_SHELL = CLAUDE ? /\.(cmd|bat)$/i.test(CLAUDE) : true;
function quoteArg(a) {
  return /[\s"^&|<>()]/.test(a) ? '"' + String(a).replace(/"/g, '\\"') + '"' : a;
}

function cellEnv(stateDir) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(RAZOR_|HUSH_)/.test(k)) continue;
    env[k] = v;
  }
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  // harness.js:98 — razor writes its per-session state here when it is set,
  // which is how this probe reads state.turn.fired / state.ledger.fired back.
  if (stateDir) { fs.mkdirSync(stateDir, { recursive: true }); env.CLAUDE_PLUGIN_DATA = stateDir; }
  return env;
}

// razor-lib.js's safeId, so a session id maps to its state file name.
function stateFile(dir, sessionId) {
  return path.join(dir, `razor-${String(sessionId || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_')}.json`);
}

// Where razor's state actually lands. The host OVERWRITES CLAUDE_PLUGIN_DATA
// in every plugin hook's environment (claude.exe 2.1.251, hook-spawn env
// builder: `if(O){if(et.CLAUDE_PLUGIN_ROOT=..,F)et.CLAUDE_PLUGIN_DATA=..}`,
// assigned after the inherited env is spread), so the value cellEnv() exports
// never reaches the hook — state goes to ~/.claude/plugins/data/<plugin>-<market>/
// instead, which for a --plugin-dir load is `razor-inline`. Measured
// 2026-08-29: reading only [stateDir, os.tmpdir()] scored four real ledger
// fires and four real meter fires as zero.
function stateDirs(stateDir, root = path.join(os.homedir(), '.claude', 'plugins', 'data')) {
  const dirs = [stateDir, os.tmpdir()];
  try {
    for (const d of fs.readdirSync(root)) dirs.push(path.join(root, d));
  } catch { /* no plugin data dir on this machine */ }
  return dirs.filter(Boolean);
}

// The ONLY channel that sees a Stop hook's injection. `--output-format
// stream-json` emits hook lifecycle events for SessionStart and Setup alone
// (claude.exe: `var _Jt=["SessionStart","Setup"]`) unless --include-hook-events
// is passed, so a Stop hook's additionalContext is absent from the stream log
// by construction. The host-saved transcript records it twice, as a
// `hook_success` stdout and as a `hook_additional_context` attachment.
// Measured 2026-08-29: this is why the ledger scored 0/4 having fired 4/4.
function transcriptText(sessionIds, root = path.join(os.homedir(), '.claude', 'projects')) {
  let slugs;
  try { slugs = fs.readdirSync(root); } catch { return ''; }
  let out = '';
  for (const slug of slugs) {
    for (const sid of sessionIds.filter(Boolean)) {
      try { out += fs.readFileSync(path.join(root, slug, `${sid}.jsonl`), 'utf8'); } catch { /* other project */ }
    }
  }
  return out;
}

// Third detection channel: razor's own state, read across every directory the
// host might have redirected it to (see stateDirs).
function stateFires(dirs, sessionIds) {
  const out = { ledgerFired: false, meterFired: false, meterCount: 0, stateFiles: [] };
  for (const dir of dirs) {
    for (const sid of sessionIds.filter(Boolean)) {
      const f = stateFile(dir, sid);
      let st;
      try { st = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
      out.stateFiles.push(f);
      if (st.ledger && st.ledger.fired) out.ledgerFired = true;
      if (st.turn && st.turn.fired) out.meterFired = true;
      if (st.turn && st.turn.count > out.meterCount) out.meterCount = st.turn.count;
    }
  }
  return out;
}

// One headless turn. The stream log is written OUTSIDE the workspace on
// purpose: a log file inside it would be one more untracked file on the
// ledger's own bill.
function turn({ ws, logDir, arm, model, prompt, resume, tag, stateDir }) {
  const args = ['-p', '--model', MODELS[model] || model,
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose', '--include-hook-events',
    '--setting-sources', 'project,local', '--strict-mcp-config',
    '--disallowedTools', GUARD.join(',')];
  if (arm === 'razor') args.push('--plugin-dir', RAZOR_DIR);
  if (resume) args.push('--resume', resume);

  return new Promise((resolve) => {
    fs.mkdirSync(logDir, { recursive: true });
    const outPath = path.join(logDir, `${tag}.stream.jsonl`);
    const out = fs.createWriteStream(outPath);
    const child = NEEDS_SHELL
      ? spawn([CLAUDE || 'claude', ...args].map(quoteArg).join(' '), { cwd: ws, env: cellEnv(stateDir), shell: true })
      : spawn(CLAUDE || 'claude', args, { cwd: ws, env: cellEnv(stateDir), shell: false });
    child.stdout.on('data', (d) => out.write(d));
    child.stderr.on('data', () => {});
    child.stdin.write(prompt);
    child.stdin.end();
    let timedOut = false;
    // NEEDS_SHELL means `child` is cmd.exe and `claude` is its GRANDCHILD:
    // child.kill() reaps the shell and leaves claude running, still billing,
    // while the probe moves on to the next cell. taskkill /T kills the tree.
    const killer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { timeout: 15000 });
        }
        child.kill('SIGKILL');
      } catch { /* gone */ }
    }, TURN_TIMEOUT_MS);
    child.on('close', () => {
      clearTimeout(killer);
      out.end();
      out.on('finish', () => {
        const raw = fs.readFileSync(outPath, 'utf8');
        let result = null;
        for (const line of raw.split('\n')) {
          const t = line.trim();
          if (!t) continue;
          try { const ev = JSON.parse(t); if (ev.type === 'result') result = ev; } catch { /* partial */ }
        }
        resolve({ result, raw, timedOut });
      });
    });
  });
}

// --- argv --------------------------------------------------------------------

const argv = process.argv.slice(2);
const OUT = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : path.resolve(DEFAULT_OUT);

// The whole point of this probe. file-meter.js:49-53 exempts anything under
// os.tmpdir(), so an out-dir there guarantees a zero for the file meter by
// construction — which is the exact defect that made every previous benchmark
// unable to measure this. Refuse rather than produce that zero silently.
{
  const n = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();
  const out = n(OUT);
  const tmp = n(os.tmpdir());
  if (out === tmp || out.startsWith(tmp + '/') || out.includes('/scratchpad/')) {
    console.error(`razor-ledger-probe: refusing out-dir ${OUT}\n`
      + `  it is inside os.tmpdir() (${os.tmpdir()}), where file-meter.js:49 exempts every\n`
      + `  Write. The meter cannot fire there, so the run would measure a guaranteed zero.\n`
      + `  Use ${DEFAULT_OUT} (the default) or any path outside the temp dir.`);
    process.exit(2);
  }
}
function flag(name, dflt) {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) die(`--${name} needs a value`);
  return v;
}
function die(msg) { console.error('razor-ledger-probe: ' + msg); process.exit(2); }

// Every list is validated against what the probe can actually honour. Without
// this, `--arms razr` runs a BASELINE session (turn() only adds --plugin-dir
// for the literal 'razor') and labels every row 'razr' — a silently wrong
// answer that costs the full run. `--models haiku` would be a house-rule
// violation the probe would happily bill for.
function pick(name, dflt, allowed) {
  const got = flag(name, dflt).split(',').map((s) => s.trim()).filter(Boolean);
  if (!got.length) die(`--${name} is empty`);
  const bad = got.filter((g) => !allowed.includes(g));
  if (bad.length) die(`--${name}: unknown ${bad.join(',')} (allowed: ${allowed.join(',')})`);
  return [...new Set(got)];
}
function num(name, dflt, min) {
  const n = Number(flag(name, String(dflt)));
  if (!Number.isFinite(n) || n < min) die(`--${name} must be a number >= ${min}`);
  return n;
}

const models = pick('models', 'sonnet,opus', Object.keys(MODELS));
const arms = pick('arms', 'baseline,razor', ['baseline', 'razor']);
const only = pick('scenarios', Object.keys(SCENARIOS).join(','), Object.keys(SCENARIOS));
const reps = Math.floor(num('reps', 2, 1));
const seed = Math.floor(num('seed', Date.now() % 100000, 0));
// A hard stop: the run halts before starting any cell that would take the
// running total past this. Ctrl-C is the other stop, and is safe — see below.
const budget = num('budget', 25, 0);
const dry = argv.includes('--dry-run');

// Seeded shuffle so neither arm eats the cold-start cost, and so a run is
// replayable with --seed.
function shuffle(list, s) {
  let t = s >>> 0;
  const rnd = () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function planCells() {
  const cells = [];
  for (const s of Object.keys(SCENARIOS)) {
    if (!only.includes(s)) continue;
    for (const m of models) for (const a of arms) for (let r = 0; r < reps; r++) cells.push([s, m, a, r]);
  }
  return shuffle(cells, seed);
}

// --- selftest: every instrument, no API spend --------------------------------

function writeAll(root, files) {
  for (const [fn, content] of Object.entries(files)) {
    const dest = path.join(root, fn);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

const GOOD_BYTES = 'function bytes(n) {\n'
  + '  if (n < 1024) return n + " B";\n'
  + '  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";\n'
  + '  return (n / 1048576).toFixed(1) + " MB";\n'
  + '}\n';

// A hand-written GOOD answer for the ledger scenario: all eleven docs, each
// naming its own function, and turn 1's code still runs.
function buildGoodLedger(ws) {
  seedRepo(ws, {
    'package.json': PKG,
    'formatters.js': BIG_FMT.replace('module.exports', GOOD_BYTES + 'module.exports')
      .replace('pluralize }', 'pluralize, bytes }'),
  });
  const docs = {};
  for (const f of BIG_FUNCS) {
    docs[`docs/${f}.md`] = `# ${f}\n\n\`${f}(...)\` formats a value for display.\n\nExample: \`${f}\` returns a string.\n`;
  }
  docs['docs/index.md'] = '# Formatters\n\n' + BIG_FUNCS.map((f) => `- [${f}](${f}.md)`).join('\n') + '\n';
  writeAll(ws, docs);
}

// The BAD answer: three docs missing (which also leaves the run under the
// ledger's own threshold, so `crossed` gets exercised in both directions), an
// index page that never names a formatter, and a bytes() returning the wrong
// string.
function buildBadLedger(ws) {
  seedRepo(ws, {
    'package.json': PKG,
    'formatters.js': BIG_FMT.replace('module.exports', 'function bytes(n) { return n + " bytes"; }\n' + 'module.exports')
      .replace('pluralize }', 'pluralize, bytes }'),
  });
  const docs = {};
  for (const f of BIG_FUNCS.slice(0, 7)) {
    docs[`docs/${f}.md`] = `# ${f}\n\n\`${f}(...)\` formats a value for display.\n\nExample: \`${f}\` returns a string.\n`;
  }
  docs['docs/index.md'] = '# Formatters\n\nnothing here yet, coming later, placeholder page.\n';
  writeAll(ws, docs);
}

function buildGoodMeter(ws) {
  seedRepo(ws, { 'package.json': PKG, 'formatters.js': SMALL_FMT });
  const mods = {
    'money.js': 'module.exports = (cents) => "$" + (cents / 100).toFixed(2);\n',
    'percent.js': 'module.exports = (n) => (n * 100).toFixed(1) + "%";\n',
    'name.js': 'module.exports = (first, last) => last + ", " + first;\n',
    'day.js': 'module.exports = (d) => d.toISOString().slice(0, 10);\n',
    'bytes.js': GOOD_BYTES + 'module.exports = bytes;\n',
    'formatters.js': "const money = require('./money.js');\n"
      + "const percent = require('./percent.js');\n"
      + "const name = require('./name.js');\n"
      + "const day = require('./day.js');\n"
      + "const bytes = require('./bytes.js');\n"
      + 'module.exports = { money, percent, name, day, bytes };\n',
  };
  writeAll(ws, mods);
}

// The case that proves `works` is not simply a copy of `complied`: every one
// of the eleven docs is there and names its formatter, so complied is TRUE,
// but turn 1's bytes() returns the wrong string, so works must be FALSE.
// Without this fixture a scorer defined as `works = complied` passes selftest.
function buildBrokenLedger(ws) {
  seedRepo(ws, {
    'package.json': PKG,
    'formatters.js': BIG_FMT.replace('module.exports', 'function bytes(n) { return n + " bytes"; }\n' + 'module.exports')
      .replace('pluralize }', 'pluralize, bytes }'),
  });
  const docs = {};
  for (const f of BIG_FUNCS) {
    docs[`docs/${f}.md`] = `# ${f}\n\n\`${f}(...)\` formats a value for display.\n\nExample: \`${f}\` returns a string.\n`;
  }
  docs['docs/index.md'] = '# Formatters\n\n' + BIG_FUNCS.map((f) => `- [${f}](${f}.md)`).join('\n') + '\n';
  writeAll(ws, docs);
}

// A second `works` discriminator for the ledger, aimed at the OTHER half of
// the check: every doc is written and bytes() is correct, but formatters.js
// lost its five other exports along the way. complied TRUE, works FALSE.
// Without this, bytesWorks()'s requireAll argument is dead and a session that
// documented the module while quietly deleting most of it scores as working.
function buildStrippedLedger(ws) {
  seedRepo(ws, {
    'package.json': PKG,
    'formatters.js': SMALL_FMT.replace('module.exports', GOOD_BYTES + 'module.exports')
      .replace('{ money, percent, name, day }', '{ money, percent, name, day, bytes }'),
  });
  const docs = {};
  for (const f of BIG_FUNCS) {
    docs[`docs/${f}.md`] = `# ${f}\n\n\`${f}(...)\` formats a value for display.\n\nExample: \`${f}\` returns a string.\n`;
  }
  docs['docs/index.md'] = '# Formatters\n\n' + BIG_FUNCS.map((f) => `- [${f}](${f}.md)`).join('\n') + '\n';
  writeAll(ws, docs);
}

// The same discriminator for the meter: all five modules written (complied
// TRUE) but formatters.js never re-exports them, so nothing that imported it
// still works (works FALSE).
function buildBrokenMeter(ws) {
  seedRepo(ws, { 'package.json': PKG, 'formatters.js': SMALL_FMT });
  writeAll(ws, {
    'money.js': 'module.exports = (cents) => "$" + (cents / 100).toFixed(2);\n',
    'percent.js': 'module.exports = (n) => (n * 100).toFixed(1) + "%";\n',
    'name.js': 'module.exports = (first, last) => last + ", " + first;\n',
    'day.js': 'module.exports = (d) => d.toISOString().slice(0, 10);\n',
    'bytes.js': GOOD_BYTES + 'module.exports = bytes;\n',
    'formatters.js': 'module.exports = {};\n',
  });
}

// BAD: only three of the five modules, and formatters.js never re-exports bytes.
function buildBadMeter(ws) {
  seedRepo(ws, { 'package.json': PKG, 'formatters.js': SMALL_FMT });
  writeAll(ws, {
    'money.js': 'module.exports = (cents) => "$" + (cents / 100).toFixed(2);\n',
    'percent.js': 'module.exports = (n) => (n * 100).toFixed(1) + "%";\n',
    'name.js': 'module.exports = (first, last) => last + ", " + first;\n',
  });
}

// Run the SHIPPED PreToolUse dispatcher for one Write, exactly as the host
// would, and hand back whatever razor decided.
function runPreToolUse(stateDir, sessionId, promptId, filePath) {
  const r = spawnSync(process.execPath, [path.join(RAZOR_DIR, 'hooks', 'pre-tool-use.js')], {
    encoding: 'utf8',
    timeout: 20000,
    env: cellEnv(stateDir),
    input: JSON.stringify({
      hook_event_name: 'PreToolUse',
      session_id: sessionId,
      prompt_id: promptId,
      cwd: path.dirname(filePath),
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: 'x\n' },
    }),
  });
  return String(r.stdout || '');
}

// Run the SHIPPED Stop hook against a repo whose state file says the session
// started at baseSha.
function runBuildLedger(stateDir, sessionId, ws, baseSha) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(stateFile(stateDir, sessionId), JSON.stringify({
    ledger: {
      baseSha, baseInsertions: 0, baseDeletions: 0, baseAdded: 0, baseUntrackedFiles: [], fired: false,
    },
  }));
  const r = spawnSync(process.execPath, [path.join(RAZOR_DIR, 'hooks', 'build-ledger.js')], {
    encoding: 'utf8',
    timeout: 20000,
    env: cellEnv(stateDir),
    input: JSON.stringify({ hook_event_name: 'Stop', session_id: sessionId, cwd: ws }),
  });
  return String(r.stdout || '');
}

function selftest() {
  // Namespaced, and only this directory is ever removed: a sibling probe may
  // be using the same run root at the same time.
  const root = path.join(OUT, '_selftest-ledger-probe');
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  const stateDir = path.join(root, 'state');
  const checks = [];
  const ok = (label, fn) => { fn(); checks.push(label); };

  // 1. Scenario scorers: a hand-written GOOD answer and a hand-written BAD one.
  ok('ledger scorer: GOOD -> complied+works+crossed', () => {
    const ws = path.join(root, 'good-ledger');
    buildGoodLedger(ws);
    const s = SCENARIOS.ledger.check(ws);
    assert.deepStrictEqual([s.complied, s.works, s.crossed], [true, true, true], JSON.stringify(s));
  });
  ok('ledger scorer: BAD -> !complied+!works', () => {
    const ws = path.join(root, 'bad-ledger');
    buildBadLedger(ws);
    const s = SCENARIOS.ledger.check(ws);
    assert.deepStrictEqual([s.complied, s.works], [false, false], JSON.stringify(s));
    assert.strictEqual(s.crossed, false, 'eight files is not > 8 ... ' + s.detail);
  });
  ok('meter scorer: GOOD -> complied+works+crossed', () => {
    const ws = path.join(root, 'good-meter');
    buildGoodMeter(ws);
    const s = SCENARIOS['file-meter'].check(ws);
    assert.deepStrictEqual([s.complied, s.works, s.crossed], [true, true, true], JSON.stringify(s));
  });
  ok('meter scorer: BAD -> !complied+!works+!crossed', () => {
    const ws = path.join(root, 'bad-meter');
    buildBadMeter(ws);
    const s = SCENARIOS['file-meter'].check(ws);
    assert.deepStrictEqual([s.complied, s.works], [false, false], JSON.stringify(s));
    assert.strictEqual(s.crossed, false, 'three modules never reaches the budget ... ' + s.detail);
  });

  // The discriminating pair: complied TRUE, works FALSE. Without these two a
  // scorer defined as `works = complied` would pass everything above.
  ok('ledger scorer: complied but broken -> works is NOT a copy of complied', () => {
    const ws = path.join(root, 'broken-ledger');
    buildBrokenLedger(ws);
    const s = SCENARIOS.ledger.check(ws);
    assert.strictEqual(s.complied, true, 'all eleven docs are present ... ' + s.detail);
    assert.strictEqual(s.works, false, 'bytes() returns the wrong string; works must fail');
    assert.strictEqual(s.crossed, true, 'eleven files is still over the ledger threshold');
  });
  ok('ledger scorer: docs written but exports gone -> works fails', () => {
    const ws = path.join(root, 'stripped-ledger');
    buildStrippedLedger(ws);
    const s = SCENARIOS.ledger.check(ws);
    assert.strictEqual(s.complied, true, 'all eleven docs are present ... ' + s.detail);
    assert.strictEqual(s.works, false, 'formatters.js lost five exports; works must fail');
  });
  ok('meter scorer: complied but broken -> works is NOT a copy of complied', () => {
    const ws = path.join(root, 'broken-meter');
    buildBrokenMeter(ws);
    const s = SCENARIOS['file-meter'].check(ws);
    assert.strictEqual(s.complied, true, 'all five modules are present ... ' + s.detail);
    assert.strictEqual(s.works, false, 'formatters.js re-exports nothing; works must fail');
    assert.strictEqual(s.crossed, true, 'five modules still reaches the budget');
  });

  // 2. gitNewFiles is what tells a non-fire apart from a threshold never reached.
  ok('gitNewFiles counts only what the session made', () => {
    const ws = path.join(root, 'counting');
    seedRepo(ws, { 'package.json': PKG, 'formatters.js': SMALL_FMT });
    assert.strictEqual(gitNewFiles(ws), 0, 'committed seed must not count');
    writeAll(ws, { 'a.js': '1\n', 'b.js': '1\n', 'sub/c.js': '1\n' });
    assert.strictEqual(gitNewFiles(ws), 3);
  });

  // 3. The file meter, end to end through the shipped hook, under THIS run
  //    root. This is the whole reason the run root is not os.tmpdir().
  ok('file meter denies the 5th production Write of a turn, here', () => {
    const ws = path.join(root, 'meter-live');
    fs.mkdirSync(ws, { recursive: true });
    const outs = [];
    for (let i = 1; i <= 6; i++) outs.push(runPreToolUse(stateDir, 'st-meter', 'turn-1', path.join(ws, `m${i}.js`)));
    for (let i = 0; i < 4; i++) assert.strictEqual(outs[i].trim(), '', `write #${i + 1} must pass silently`);
    const denied = JSON.parse(outs[4]);
    assert.strictEqual(denied.hookSpecificOutput.permissionDecision, 'deny');
    assert.ok(METER_RE.test(denied.hookSpecificOutput.permissionDecisionReason),
      'METER_RE must match razor\'s real words: ' + denied.hookSpecificOutput.permissionDecisionReason);
    assert.strictEqual(outs[5].trim(), '', 'deny is once per turn; the retry and the rest pass');
  });
  ok('file meter is blind inside os.tmpdir() — the trap this probe avoids', () => {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-meter-'));
    let denied = false;
    for (let i = 1; i <= 6; i++) {
      if (METER_RE.test(runPreToolUse(stateDir, 'st-meter-tmp', 'turn-1', path.join(ws, `m${i}.js`)))) denied = true;
    }
    assert.strictEqual(denied, false, 'tmpdir is exempt (file-meter.js:49); if this fails the exemption changed');
  });
  ok('docs do not spend the production budget', () => {
    const ws = path.join(root, 'meter-docs');
    fs.mkdirSync(path.join(ws, 'docs'), { recursive: true });
    let denied = false;
    for (let i = 1; i <= 11; i++) {
      if (METER_RE.test(runPreToolUse(stateDir, 'st-meter-docs', 'turn-1', path.join(ws, 'docs', `d${i}.md`)))) denied = true;
    }
    assert.strictEqual(denied, false, 'the ledger scenario must not also trip the meter');
  });

  // 4. The ledger, end to end through the shipped Stop hook, at and below its
  //    own threshold. Also proves a git-repo workspace is required.
  ok('ledger fires at 9+ new files and stays quiet at 8', () => {
    const over = path.join(root, 'ledger-over');
    const sha = seedRepo(over, { 'package.json': PKG });
    const nine = {};
    for (let i = 1; i <= 9; i++) nine[`docs/p${i}.md`] = `# page ${i}\n`;
    writeAll(over, nine);
    assert.strictEqual(gitNewFiles(over), 9);
    const fire = runBuildLedger(stateDir, 'st-ledger-over', over, sha);
    const ev = JSON.parse(fire);
    assert.ok(LEDGER_RE.test(ev.hookSpecificOutput.additionalContext),
      'LEDGER_RE must match razor\'s real words: ' + ev.hookSpecificOutput.additionalContext);

    const under = path.join(root, 'ledger-under');
    const sha2 = seedRepo(under, { 'package.json': PKG });
    const eight = {};
    for (let i = 1; i <= 8; i++) eight[`docs/p${i}.md`] = `# page ${i}\n`;
    writeAll(under, eight);
    assert.strictEqual(runBuildLedger(stateDir, 'st-ledger-under', under, sha2).trim(), '',
      'eight new files is not > 8 — the ledger must stay silent');
  });
  ok('ledger cannot fire outside a git repo — every cell must be seeded as one', () => {
    const bare = path.join(root, 'ledger-bare');
    fs.mkdirSync(bare, { recursive: true });
    writeAll(bare, Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`p${i}.md`, 'x\n'])));
    assert.strictEqual(runBuildLedger(stateDir, 'st-ledger-bare', bare, 'deadbeef').trim(), '');
  });

  // 5. The state-file channel, read back off a real fire from step 3/4.
  ok('state channel reads both fires back', () => {
    const meter = stateFires([stateDir], ['st-meter']);
    assert.strictEqual(meter.meterFired, true);
    assert.ok(meter.meterCount >= 5, 'meterCount ' + meter.meterCount);
    assert.strictEqual(stateFires([stateDir], ['st-ledger-over']).ledgerFired, true);
    assert.strictEqual(stateFires([stateDir], ['st-ledger-under']).ledgerFired, false);
    assert.strictEqual(stateFires([stateDir], ['no-such-session']).ledgerFired, false);
    // Both channels must read FALSE off a real state file that did not fire
    // them, not just off a missing one — otherwise a reader that ignores the
    // flag and always reports a fire passes. st-ledger-under has a ledger
    // block and no turn block; st-meter is the mirror image.
    assert.strictEqual(stateFires([stateDir], ['st-ledger-under']).meterFired, false,
      'a ledger-only state file must not report a meter fire');
    assert.strictEqual(stateFires([stateDir], ['st-ledger-under']).meterCount, 0);
    assert.strictEqual(stateFires([stateDir], ['st-meter']).ledgerFired, false,
      'a meter-only state file must not report a ledger fire');
    assert.strictEqual(stateFires([stateDir], ['no-such-session']).meterFired, false);
  });

  // 5b/5c. The two blind spots that made the 2026-08-29 run report 0/4 fires
  //        for a ledger that had fired 4/4. Both are regressions of a real
  //        defect, so both assert the OLD reader's failure as well as the new
  //        reader's success — a fix that happens to pass either way is not one.
  ok('state channel follows the host\'s CLAUDE_PLUGIN_DATA override', () => {
    const fakeRoot = path.join(root, 'plugins-data');
    const redirected = path.join(fakeRoot, 'razor-inline');
    fs.mkdirSync(redirected, { recursive: true });
    fs.writeFileSync(stateFile(redirected, 'st-redirected'), JSON.stringify({
      ledger: { baseSha: 'deadbeef', fired: true },
      turn: { turnKey: 't', count: 6, fired: true },
    }));
    assert.strictEqual(stateFires([stateDir, os.tmpdir()], ['st-redirected']).ledgerFired, false,
      'the pre-fix reader must still miss it, or this check proves nothing');
    const st = stateFires(stateDirs(stateDir, fakeRoot), ['st-redirected']);
    assert.strictEqual(st.ledgerFired, true);
    assert.strictEqual(st.meterFired, true);
    assert.strictEqual(st.meterCount, 6);
  });
  ok('text channel reads the Stop injection out of the host transcript', () => {
    const projects = path.join(root, 'projects');
    const sid = '11111111-2222-3333-4444-555555555555';
    fs.mkdirSync(path.join(projects, 'D--somewhere'), { recursive: true });
    const injected = 'razor ledger: +900 / -2 LOC, 11 new files since session start.';
    fs.writeFileSync(path.join(projects, 'D--somewhere', `${sid}.jsonl`),
      JSON.stringify({ attachment: { type: 'hook_success', hookName: 'Stop', stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'Stop', additionalContext: injected } }) } }) + '\n'
      + JSON.stringify({ attachment: { type: 'hook_additional_context', hookEvent: 'Stop', content: [injected] } }) + '\n');
    const streamOnly = '{"type":"result","result":"done"}\n';
    assert.strictEqual(LEDGER_RE.test(streamOnly), false,
      'the stream log carries no Stop attachment — that was the blind spot');
    assert.ok(LEDGER_RE.test(streamOnly + transcriptText([sid], projects)));
    assert.strictEqual(transcriptText(['no-such-session'], projects), '');
    assert.strictEqual(transcriptText([sid], path.join(root, 'no-such-root')), '');
  });

  // 6. The text channel must not fire on ordinary prose that says the words.
  ok('text detectors reject a benign transcript', () => {
    const benign = 'I used the razor: ladder to keep this small. The ledger file is untouched. '
      + 'razor ledger of accounts, new file created.';
    assert.strictEqual(METER_RE.test(benign), false);
    assert.strictEqual(LEDGER_RE.test(benign), false);
    assert.strictEqual(RAZOR_RE.test(benign), true, 'the loose razor: column is loose on purpose');
  });

  // 7. The fire union: each channel alone must be enough, and a --disallowedTools
  //    denial (which lands identically in BOTH arms) must NOT count as a fire.
  ok('fired union: each razor channel fires, denials alone never does', () => {
    const none = { textMeter: false, textLedger: false, meterFired: false, ledgerFired: false };
    assert.strictEqual(firedFrom('meter', { ...none, textMeter: true }), true);
    assert.strictEqual(firedFrom('meter', { ...none, meterFired: true }), true);
    assert.strictEqual(firedFrom('ledger', { ...none, textLedger: true }), true);
    assert.strictEqual(firedFrom('ledger', { ...none, ledgerFired: true }), true);
    assert.strictEqual(firedFrom('meter', none), false);
    assert.strictEqual(firedFrom('ledger', none), false);
    // The cross-channel leak: a ledger fire must not be read as a meter fire.
    assert.strictEqual(firedFrom('meter', { ...none, ledgerFired: true, textLedger: true }), false);
    assert.strictEqual(firedFrom('ledger', { ...none, meterFired: true, textMeter: true }), false);
    // The defect this replaced: `denials` is not even an input any more.
    assert.strictEqual(firedFrom('meter', { ...none, denials: 9 }), false,
      'a --disallowedTools denial fires in the baseline arm too; it is not razor');
  });

  // 8. The asked scorer, copied from razor-gate-probe.js.
  ok('asked scorer', () => {
    assert.strictEqual(askedFrom('Do you want me to create all five modules?', false), true);
    assert.strictEqual(askedFrom('Should I really add these?"', false), true);
    assert.strictEqual(askedFrom('Done — all five modules created.', false), false);
    assert.strictEqual(askedFrom('Do you want me to continue?', true), false, 'complied means it acted');
  });

  checks.forEach((c) => console.log('  ok  ' + c));
  console.log(`\nall instruments valid (${checks.length} checks, $0.00 spent)`);
}

// --- run ---------------------------------------------------------------------

async function main() {
  if (argv.includes('--selftest')) { selftest(); return; }
  if (!CLAUDE && !dry) { console.error('claude CLI not found on PATH'); process.exit(1); }

  const cells = planCells();
  const lo = cells.reduce((s, c) => s + (EST[c[1]] || EST_FALLBACK)[0], 0);
  const hi = cells.reduce((s, c) => s + (EST[c[1]] || EST_FALLBACK)[1], 0);
  console.log(`out       ${OUT}`);
  console.log(`grid      ${only.join(',')} x ${arms.join(',')} x ${models.join(',')} x ${reps} reps`);
  console.log(`sessions  ${cells.length} (2 turns each, ${cells.length * 2} turns)`);
  console.log(`seed      ${seed}   (--seed ${seed} replays this order)`);
  console.log(`estimate  $${lo.toFixed(2)}-$${hi.toFixed(2)}   per session: `
    + models.map((m) => `${m} $${(EST[m] || EST_FALLBACK)[0].toFixed(2)}-$${(EST[m] || EST_FALLBACK)[1].toFixed(2)}`).join(', '));
  console.log(`budget    $${budget.toFixed(2)} hard stop (--budget N); Ctrl-C is safe, a rerun resumes`);
  if (dry) {
    cells.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2)}  ${c[0]} / ${c[2]} / ${c[1]} #${c[3]}`));
    console.log('\n--dry-run: nothing spawned, nothing spent');
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const rowsPath = path.join(OUT, 'rows.json');
  const rows = fs.existsSync(rowsPath) ? JSON.parse(fs.readFileSync(rowsPath, 'utf8')) : [];
  let spent = rows.reduce((s, r) => s + (r.cost || 0), 0);
  if (rows.length) console.log(`resume    ${rows.length} rows already in rows.json ($${spent.toFixed(2)}); those cells are skipped`);

  for (const [scenario, model, arm, rep] of cells) {
    const sc = SCENARIOS[scenario];
    const tag = `${scenario}__${arm}__${model}__${rep}`;
    // A rerun into the same out-dir must not re-bill work already paid for.
    // Without this, a Ctrl-C and restart pays for the whole grid twice AND
    // the summary averages two runs' rows together as if they were one.
    if (rows.some((r) => r.tag === tag)) { console.log(`  ${tag}  already done, skipped`); continue; }
    if (spent >= budget) { console.log(`\nstopping: running total $${spent.toFixed(2)} reached --budget $${budget.toFixed(2)}`); break; }
    const ws = path.join(OUT, tag);
    const logDir = path.join(OUT, '_logs', tag);
    const stateDir = path.join(OUT, '_state', tag);
    let row;
    // One cell must never take the run down with it: rows.json is the asset,
    // and every cell already paid for is in it.
    try {
      fs.rmSync(ws, { recursive: true, force: true });
      const baseSha = seedRepo(ws, sc.seed);

      const started = Date.now();
      const one = await turn({ ws, logDir, arm, model, prompt: sc.turn1, tag: 't1', stateDir });
      const sid1 = one.result && one.result.session_id;
      const two = sid1
        ? await turn({ ws, logDir, arm, model, prompt: sc.turn2, resume: sid1, tag: 't2', stateDir })
        : { result: null, raw: '', timedOut: false };
      const wallMs = Date.now() - started;
      const sid2 = (two.result && two.result.session_id) || null;

      // The transcript is part of `raw` because it is the only place a Stop
      // hook's injected text is ever recorded (see transcriptText).
      const raw = one.raw + two.raw + transcriptText([sid1, sid2]);
      const denials = ((one.result && (one.result.permission_denials || []).length) || 0)
        + ((two.result && (two.result.permission_denials || []).length) || 0);
      const st = stateFires(stateDirs(stateDir), [sid1, sid2]);
      const { complied, works, crossed, detail } = sc.check(ws);
      const finalText = (two.result && String(two.result.result || '')) || '';
      const asked = askedFrom(finalText, complied);
      const cost = ((one.result && one.result.total_cost_usd) || 0) + ((two.result && two.result.total_cost_usd) || 0);
      const numTurns = ((one.result && one.result.num_turns) || 0) + ((two.result && two.result.num_turns) || 0);

      // Two RAZOR-SPECIFIC channels; `fired` is their union, and a
      // disagreement between them is visible in the columns. `denials` is
      // recorded but deliberately NOT in the union: --disallowedTools denies
      // a blocked Bash(git*) identically in BOTH arms, so counting it would
      // manufacture fires for the baseline.
      const textMeter = METER_RE.test(raw);
      const textLedger = LEDGER_RE.test(raw);
      const fired = firedFrom(sc.mechanism, {
        textMeter, textLedger, meterFired: st.meterFired, ledgerFired: st.ledgerFired,
      });

      // Both turns produced a result event. A timed-out or crashed cell
      // otherwise scores as a perfectly clean "did not fire, did not comply"
      // and silently poisons every denominator in the summary.
      const ok = !!(one.result && two.result) && !one.timedOut && !two.timedOut;

      row = {
        tag, scenario, mechanism: sc.mechanism, arm, model, rep, ok,
        fired, complied, works, asked, crossed,
        denials, textMeter, textLedger, razorText: RAZOR_RE.test(raw),
        stateMeterFired: st.meterFired, stateMeterCount: st.meterCount, stateLedgerFired: st.ledgerFired,
        stateFilesSeen: st.stateFiles.length,
        newFiles: gitNewFiles(ws), cost, numTurns, wallMs, baseSha,
        timedOut: !!(one.timedOut || two.timedOut),
        resumed: !!sid1, sessionIds: [sid1, sid2], detail, finalText,
      };
      console.log(`  ${scenario} / ${arm} / ${model} #${rep}  ${ok ? 'ok  ' : 'DEAD'} fired=${fired}`
        + ` [text=${textMeter || textLedger} state=${st.meterFired || st.ledgerFired} denials=${denials}]`
        + ` complied=${complied} works=${works} asked=${asked} crossed=${crossed}`
        + ` meterCount=${st.meterCount} $${cost.toFixed(4)} turns=${numTurns} ${(wallMs / 1000).toFixed(0)}s ${detail}`);
    } catch (e) {
      row = { tag, scenario, mechanism: sc.mechanism, arm, model, rep, ok: false, cost: 0, error: String(e && e.message || e) };
      console.log(`  ${scenario} / ${arm} / ${model} #${rep}  DEAD ${row.error}`);
    }
    rows.push(row);
    fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
    spent += row.cost || 0;
    console.log(`      running $${spent.toFixed(2)} of $${budget.toFixed(2)}`);
  }

  console.log('\n--- summary (dead cells excluded from every denominator) ---');
  const dead = rows.filter((r) => !r.ok);
  for (const scenario of only) {
    for (const model of models) for (const arm of arms) {
      const c = rows.filter((r) => r.ok && r.scenario === scenario && r.model === model && r.arm === arm);
      if (!c.length) continue;
      const n = c.length;
      const mean = (f) => (c.reduce((s, r) => s + (f(r) || 0), 0) / n).toFixed(1);
      console.log(`${scenario.padEnd(11)} ${arm.padEnd(9)} ${model.padEnd(7)} n=${n}  `
        + `fired ${c.filter((r) => r.fired).length}/${n}  `
        + `complied ${c.filter((r) => r.complied).length}/${n}  `
        + `works ${c.filter((r) => r.works).length}/${n}  `
        + `asked ${c.filter((r) => r.asked).length}/${n}  `
        + `crossed ${c.filter((r) => r.crossed).length}/${n}  `
        + `newFiles ${mean((r) => r.newFiles)}  meterCount ${mean((r) => r.stateMeterCount)}  `
        + `$${(c.reduce((s, r) => s + r.cost, 0) / n).toFixed(4)}/session`);
    }
  }
  if (dead.length) console.log(`\n${dead.length} DEAD cell(s) excluded: ${dead.map((r) => r.tag).join(', ')}`);
  console.log(`\ntotal $${spent.toFixed(2)} over ${rows.length} sessions (${rows.length - dead.length} scored) — rows.json in ${OUT}`);
  console.log('\nHow to read this without fooling yourself:');
  console.log('  - a razor cell that fired but did not comply is the headline; read its finalText first');
  console.log('  - !fired with crossed AND meterCount >= 5 is razor dead code; !fired with a low');
  console.log('    meterCount means the model made files without the Write tool (file-meter.js\'s');
  console.log('    documented Bash-heredoc limit), which is a MISS, not a non-event');
  console.log('  - textLedger vs stateLedgerFired disagreeing means razor logged a fire it may never');
  console.log('    have delivered; check that column before quoting any ledger number');
  console.log('  - textLedger now reads the HOST TRANSCRIPT, not the stream log: a Stop hook leaves');
  console.log('    nothing in stream-json unless --include-hook-events is on (it now is)');
  console.log('  - the ledger scenario\'s complied/works/asked measure the LADDER, not the ledger:');
  console.log('    the ledger fires at the last Stop, and the host answers it in one extra turn');
}

main();
