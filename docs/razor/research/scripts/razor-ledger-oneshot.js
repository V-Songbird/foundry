#!/usr/bin/env node
'use strict';
// razor build ledger — the ONE case razor-ledger-headless-2026-08-29.md left open.
//
// Every observed headless fire had the baseline written by turn 1's
// SessionStart:startup process and the Stop fired in turn 2's --resume process.
// A run where SessionStart:startup writes the baseline AND Stop crosses the
// threshold inside the SAME `claude -p` invocation has never been observed.
// This buys exactly that, once.
//
// Three channels are read afterwards, and they must agree:
//   spy      an independent settings.json Stop hook (NOT razor's, so it cannot
//            share razor's failure mode) appends one line per Stop and injects
//            nothing. Proves whether the host dispatches Stop at all.
//   state    razor's own state file, in the directory the HOST chose --
//            ~/.claude/plugins/data/<plugin>-<market>/, never the probe's.
//   text     the host-saved transcript, the only place a Stop injection lands.
//            The stream log is blind by construction unless --include-hook-events.
//
//   node razor-ledger-oneshot.js [--model sonnet] [--dry-run]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const RAZOR = path.resolve(__dirname, "..", "..", "..", "..", "razor");
const ROOT = 'D:/razor-probe-runs/ledger-oneshot';
const WS = path.join(ROOT, 'ws');
const SPY_LOG = path.join(ROOT, 'spy.jsonl');
const MODELS = { sonnet: 'claude-sonnet-5', opus: 'claude-opus-5' };
const LEDGER_RE = /razor ledger: \+\d+/;
const TIMEOUT_MS = 300000;

const argv = process.argv.slice(2);
const model = (argv.includes('--model') ? argv[argv.indexOf('--model') + 1] : 'sonnet');
if (!MODELS[model]) { console.error(`unknown model ${model}`); process.exit(2); }
const dry = argv.includes('--dry-run');

// The run root must not be os.tmpdir(): file-meter.js exempts it, and while
// this probe targets the ledger, a scaffold that silently skipped the meter
// would make a mixed result unreadable.
{
  const n = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();
  if (n(ROOT).startsWith(n(os.tmpdir()) + '/')) { console.error('run root is inside tmpdir'); process.exit(2); }
}

const FMT = 'function money(cents) { return "$" + (cents / 100).toFixed(2); }\n'
  + 'function percent(n) { return (n * 100).toFixed(1) + "%"; }\n'
  + 'function name(first, last) { return last + ", " + first; }\n'
  + 'function day(d) { return d.toISOString().slice(0, 10); }\n'
  + 'function phone(digits) { return "(" + digits.slice(0, 3) + ") " + digits.slice(3, 6) + "-" + digits.slice(6); }\n'
  + 'function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }\n'
  + 'function ordinal(n) { return n + (n % 10 === 1 && n % 100 !== 11 ? "st" : "th"); }\n'
  + 'function truncate(s, n) { return s.length <= n ? s : s.slice(0, n - 1) + "..."; }\n'
  + 'function pluralize(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }\n'
  + 'function bytes(n) { return n < 1024 ? n + " B" : (n / 1024).toFixed(1) + " KB"; }\n'
  + 'module.exports = { money, percent, name, day, phone, slug, ordinal, truncate, pluralize, bytes };\n';

const FUNCS = ['money', 'percent', 'name', 'day', 'phone', 'slug', 'ordinal', 'truncate', 'pluralize', 'bytes'];
const DOCS = [...FUNCS.map((f) => `docs/${f}.md`), 'docs/index.md'];

const PROMPT = 'Write the reference docs for this module — one page per formatter under docs/:'
  + ' ' + FUNCS.map((f) => `docs/${f}.md`).join(', ')
  + ', plus docs/index.md linking to all ten. Every page needs the signature, one sentence'
  + ' on what it does, and one example. That is eleven files; write all eleven.';

// The spy is deliberately NOT part of razor and injects nothing: empty stdout,
// exit 0. If it logs a Stop and razor's state says nothing fired, the host
// dispatched Stop and razor declined — a different answer than no dispatch.
const SPY = `'use strict';
const fs = require('fs');
let raw = '';
try { raw = fs.readFileSync(0, 'utf-8'); } catch {}
let d = {};
try { d = JSON.parse(raw || '{}'); } catch {}
fs.appendFileSync(${JSON.stringify(SPY_LOG)}, JSON.stringify({
  hook_event_name: d.hook_event_name || null,
  session_id: d.session_id || null,
  cwd: d.cwd || null,
  stop_hook_active: d.stop_hook_active ?? null,
  transcript_path: d.transcript_path || null,
  pluginData: process.env.CLAUDE_PLUGIN_DATA ?? null,
  pluginRoot: process.env.CLAUDE_PLUGIN_ROOT ?? null,
  keys: Object.keys(d),
}) + '\\n');
process.exit(0);
`;

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 10000 });
  return r.status === 0 ? String(r.stdout).trim() : null;
}

function seed() {
  fs.rmSync(ROOT, { recursive: true, force: true });
  fs.mkdirSync(path.join(WS, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'spy.js'), SPY);
  fs.writeFileSync(path.join(WS, 'formatters.js'), FMT);
  fs.writeFileSync(path.join(WS, 'package.json'),
    JSON.stringify({ name: 'oneshot-app', version: '1.0.0', private: true }, null, 2) + '\n');
  fs.writeFileSync(path.join(WS, '.claude', 'settings.json'), JSON.stringify({
    hooks: {
      Stop: [{ hooks: [{ type: 'command', command: `node ${path.join(ROOT, 'spy.js').replace(/\\/g, '/')}`, timeout: 10 }] }],
      SessionStart: [{ hooks: [{ type: 'command', command: `node ${path.join(ROOT, 'spy.js').replace(/\\/g, '/')}`, timeout: 10 }] }],
    },
  }, null, 2) + '\n');
  git(['init', '-q'], WS);
  git(['add', '-A'], WS);
  git(['-c', 'user.email=probe@localhost', '-c', 'user.name=probe',
    'commit', '-q', '--no-verify', '-m', 'seed'], WS);
  return git(['rev-parse', 'HEAD'], WS);
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
const quote = (a) => (/[\s"^&|<>()]/.test(a) ? '"' + String(a).replace(/"/g, '\\"') + '"' : a);

function cellEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(RAZOR_|HUSH_)/.test(k)) continue;
    env[k] = v;
  }
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

// Every directory the host might have put razor's state in. The probe cannot
// choose it: Claude Code overwrites CLAUDE_PLUGIN_DATA in the hook's env.
function stateDirs() {
  const dirs = [os.tmpdir()];
  const root = path.join(os.homedir(), '.claude', 'plugins', 'data');
  try { for (const d of fs.readdirSync(root)) dirs.push(path.join(root, d)); } catch { /* none */ }
  return dirs;
}

function readState(sid) {
  const name = `razor-${String(sid || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_')}.json`;
  for (const dir of stateDirs()) {
    try { return { dir, state: JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) }; } catch { /* next */ }
  }
  return { dir: null, state: null };
}

// The only place a Stop hook's injection is recorded.
function transcript(sid) {
  const root = path.join(os.homedir(), '.claude', 'projects');
  let slugs;
  try { slugs = fs.readdirSync(root); } catch { return { file: null, text: '' }; }
  for (const slug of slugs) {
    const f = path.join(root, slug, `${sid}.jsonl`);
    try { return { file: f, text: fs.readFileSync(f, 'utf8') }; } catch { /* next */ }
  }
  return { file: null, text: '' };
}

function run() {
  const args = ['-p', '--model', MODELS[model],
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose', '--include-hook-events',
    '--setting-sources', 'project,local', '--strict-mcp-config',
    '--plugin-dir', RAZOR,
    '--disallowedTools', 'Bash(git*),PowerShell(git*),Agent,Task,ScheduleWakeup,CronCreate,RemoteTrigger'];
  const outPath = path.join(ROOT, 't1.stream.jsonl');
  return new Promise((resolve) => {
    const out = fs.createWriteStream(outPath);
    const child = NEEDS_SHELL
      ? spawn([CLAUDE || 'claude', ...args].map(quote).join(' '), { cwd: WS, env: cellEnv(), shell: true })
      : spawn(CLAUDE || 'claude', args, { cwd: WS, env: cellEnv(), shell: false });
    child.stdout.on('data', (d) => out.write(d));
    child.stderr.on('data', () => {});
    child.stdin.write(PROMPT);
    child.stdin.end();
    let timedOut = false;
    const killer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { timeout: 15000 });
        child.kill('SIGKILL');
      } catch { /* gone */ }
    }, TIMEOUT_MS);
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

async function main() {
  console.log(`razor    ${RAZOR}  (${git(['rev-parse', '--short', 'HEAD'], RAZOR)})`);
  console.log(`root     ${ROOT}`);
  console.log(`model    ${model}`);
  console.log('sessions 1 (one turn, one process)  estimate $0.10-0.20\n');
  if (dry) { console.log('--dry-run: nothing spawned, nothing spent'); return; }
  if (!CLAUDE) { console.error('claude CLI not found on PATH'); process.exit(1); }

  const baseSha = seed();
  console.log(`seeded   ${baseSha}`);
  const one = await run();
  const sid = one.result && one.result.session_id;
  const cost = (one.result && one.result.total_cost_usd) || 0;

  const spy = fs.existsSync(SPY_LOG)
    ? fs.readFileSync(SPY_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  const { dir, state } = readState(sid);
  const { file, text } = transcript(sid);
  const made = DOCS.filter((f) => { try { return fs.statSync(path.join(WS, f)).size >= 60; } catch { return false; } });
  const newFiles = (git(['ls-files', '--others', '--exclude-standard'], WS) || '').split('\n').filter(Boolean).length;

  console.log(`\nsession  ${sid}  $${cost.toFixed(4)}  turns=${(one.result && one.result.num_turns) || 0}`
    + `${one.timedOut ? '  TIMED OUT' : ''}`);
  console.log(`docs     ${made.length}/${DOCS.length} written, ${newFiles} untracked files at the end`);
  console.log(`\nspy      ${spy.length} hook line(s): `
    + (spy.map((s) => s.hook_event_name).join(', ') || 'NONE'));
  for (const s of spy) console.log(`         ${s.hook_event_name}  cwd=${s.cwd}  pluginData=${s.pluginData}  keys=${(s.keys || []).join(',')}`);
  console.log(`\nstate    ${dir ? dir : 'NO STATE FILE FOUND'}`);
  if (state) console.log(`         ledger=${JSON.stringify(state.ledger)}\n         turn=${JSON.stringify(state.turn)}`);
  console.log(`\ntext     transcript ${file || 'NOT FOUND'}`);
  console.log(`         ledger question present: ${LEDGER_RE.test(text)}`);
  console.log(`         stream log carries it:   ${LEDGER_RE.test(one.raw)}`);

  const spyStop = spy.some((s) => s.hook_event_name === 'Stop');
  const fired = !!(state && state.ledger && state.ledger.fired);
  const delivered = LEDGER_RE.test(text);
  console.log('\n--- verdict ---');
  if (!spyStop) console.log('(4) the host did NOT dispatch Stop in a fresh single-process headless run -> document the limit');
  else if (!state || !state.ledger || !state.ledger.baseSha) console.log('(3) Stop ran, but SessionStart:startup recorded NO baseline -> document the limit');
  else if (!fired) console.log(`(2) Stop ran with a baseline and did not fire at ${newFiles} new files -> thresholds are wrong`);
  else if (!delivered) console.log('(2b) the ledger fired but the injection is absent from the transcript -> delivery limit');
  else console.log('(1) fresh single-process headless behaves like the resumed case -> entry 270 fully closed, no product change');

  fs.writeFileSync(path.join(ROOT, 'rows.json'), JSON.stringify({
    model, sid, cost, baseSha, newFiles, docs: made.length,
    spy, stateDir: dir, state, transcriptFile: file,
    textLedger: delivered, streamLedger: LEDGER_RE.test(one.raw),
    spyStop, fired, timedOut: one.timedOut,
  }, null, 2));
  console.log(`\nrows.json in ${ROOT}   total $${cost.toFixed(4)}`);
}

main();
