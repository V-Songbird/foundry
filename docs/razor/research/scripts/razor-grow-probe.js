#!/usr/bin/env node
'use strict';
// razor grow probe — does the lean answer stay lean, and does it stay correct,
// over five turns of feature growth on one codebase?
//
// Why this exists: every razor number on record is a single request. The ladder
// could be a first-turn effect that washes out by turn 3, and worse, turn-1
// minimalism could leave no seam to extend, so razor pays for it at turn 4 and
// turn 5 in CORRECTNESS. That false-economy result is the most damaging finding
// available and this probe instruments for it directly.
//
// Two growth conversations, five fixed turns each, resumed in one session:
//   cli    add -> list+tags -> BUG FIX in turn 2's tag code -> done -> stats
//   http   health -> items store -> BUG FIX in turn 2's POST -> get/delete -> filter
// Turn 3 in both genuinely depends on turn 2: a session that shortcut turn 2
// (substring tag match / no request validation) fails turn 3's check.
//
// Per turn, per session, this records:
//   trajectory   git diff --numstat turn(n-1)..turn(n): insertions, deletions,
//                files changed, new files (by name), plus the cumulative tree
//                LOC and file count. The trajectory IS the finding — an endpoint
//                cannot tell "stayed lean" from "front-loaded".
//   checks       every feature 1..n re-scored by node against a fixed contract,
//                in a COPY of the tree, so a turn-4 regression in turn-1 code is
//                visible as a turn-4 regression.
//   cost, num_turns, wall ms, the CLI's own permission_denials
//   gate         'razor: '       appears in the raw stream (a gate denied)
//   ledger       'razor ledger:' appears (the >8-new-files / +500-LOC meter,
//                seen firing exactly once ever — a second sighting is free here)
//
//   node razor-grow-probe.js [out-dir] [--models sonnet,opus] [--reps 3]
//                            [--arms baseline,razor] [--conversations cli,http]
//                            [--seed 12345] [--dry-run] [--selftest]
//
// A cell already recorded in rows.json is skipped, never re-billed, so a killed
// run resumes by being re-invoked with the same out-dir. Delete a row by hand to
// buy that cell again.
//
// Run root defaults to D:/razor-probe-runs/grow, NOT os.tmpdir(): razor's
// hooks/file-meter.js:50 exempts everything under the temp dir as scratch, so
// every benchmark ever run there had the new-file check disabled by
// construction. It is also outside every git tree, so a bypassPermissions
// session cannot reach a real repository.

const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const RAZOR_DIR = process.env.RAZOR_DIR
  ? path.resolve(process.env.RAZOR_DIR)
  : path.resolve(__dirname, "..", "..", "..", "..", "razor");
const MODELS = { sonnet: 'claude-sonnet-5', opus: 'claude-opus-5' };
const TURN_TIMEOUT_MS = 420000; // five-turn sessions on a growing tree
const GUARD = ['Bash(git*)', 'PowerShell(git*)', 'Agent', 'Task', 'ScheduleWakeup', 'CronCreate', 'RemoteTrigger'];
const EST = { sonnet: 0.30, opus: 0.45 }; // per 5-turn session; see the header table in the plan

// --- shared seed -------------------------------------------------------------

const PKG = JSON.stringify({
  name: 'grow-app', version: '1.0.0', private: true,
  dependencies: { express: '^4.19.2', lodash: '^4.17.21' },
}, null, 2) + '\n';

// Keeps run artifacts and the CLI's own data file out of the measured diff.
const GITIGNORE = 'node_modules/\nnotes.json\n*.log\n_*\n';

// --- local execution helpers -------------------------------------------------

function runCli(dir, args) {
  const r = spawnSync(process.execPath, ['cli.js', ...args], { cwd: dir, encoding: 'utf8', timeout: 20000 });
  return { out: String(r.stdout || '').trim(), code: r.status };
}
function lines(s) { return String(s).split('\n').map((l) => l.trim()).filter(Boolean); }
function fresh(dir) { try { fs.rmSync(path.join(dir, 'notes.json')); } catch { /* none */ } }
function fail(detail) { return { ok: false, detail }; }
function pass() { return { ok: true, detail: '' }; }

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}
function waitPort(port, ms) {
  const deadline = Date.now() + ms;
  return new Promise((resolve) => {
    const tick = () => {
      const c = net.connect(port, '127.0.0.1');
      c.on('connect', () => { c.destroy(); resolve(true); });
      c.on('error', () => {
        c.destroy();
        if (Date.now() > deadline) resolve(false); else setTimeout(tick, 100);
      });
    };
    tick();
  });
}
// Every HTTP check gets its own process, so turn N never inherits turn N-1's
// in-memory items.
async function withServer(dir, fn) {
  if (!fs.existsSync(path.join(dir, 'server.js'))) return fail('no server.js');
  const port = await freePort();
  const child = spawn(process.execPath, ['server.js'],
    { cwd: dir, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  try {
    if (!await waitPort(port, 10000)) return fail('server did not listen');
    return await fn('http://127.0.0.1:' + port);
  } catch (e) {
    return fail('threw: ' + String(e && e.message).slice(0, 120));
  } finally {
    try { child.kill('SIGKILL'); } catch { /* gone */ }
  }
}
async function req(base, method, urlPath, body, raw) {
  const init = { method, signal: AbortSignal.timeout(8000) };
  if (body !== undefined) {
    init.body = raw ? body : JSON.stringify(body);
    init.headers = { 'content-type': 'application/json' };
  }
  const res = await fetch(base + urlPath, init);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, text, json, headers: res.headers };
}

// --- the two conversations ---------------------------------------------------
// Prompt text is FIXED and identical for both arms. Each turn states the whole
// observable contract, so a lean answer is never punished for style — only for
// not doing the job.

const CONVERSATIONS = {
  cli: {
    seed: { 'package.json': PKG, '.gitignore': GITIGNORE },
    turns: [
      {
        prompt: 'Create cli.js, a note-taking CLI run as `node cli.js <command>`. Implement the'
          + ' `add` command: `node cli.js add buy milk` stores a note whose text is `buy milk` and'
          + ' prints exactly `added 1`. Ids are integers starting at 1 and incrementing by one per'
          + ' note. Notes persist in a file notes.json in the working directory, so a later run'
          + ' sees the notes an earlier run added.',
        check(dir) {
          fresh(dir);
          if (!fs.existsSync(path.join(dir, 'cli.js'))) return fail('no cli.js');
          const a = runCli(dir, ['add', 'buy', 'milk']);
          const b = runCli(dir, ['add', 'call', 'bob']);
          if (a.out !== 'added 1') return fail('add#1 said ' + JSON.stringify(a.out));
          if (b.out !== 'added 2') return fail('add#2 said ' + JSON.stringify(b.out));
          if (!fs.existsSync(path.join(dir, 'notes.json'))) return fail('no notes.json');
          return pass();
        },
      },
      {
        prompt: 'Add the `list` command: `node cli.js list` prints one line per note, formatted'
          + ' `<id>: <text>`, in the order the notes were added. Any word in a note that starts'
          + ' with `#` is a tag: `node cli.js add pay rent #home` stores the tag `home` and the'
          + ' text still keeps the `#home`. `node cli.js list --tag home` prints only the notes'
          + ' carrying that tag, in the same format.',
        check(dir) {
          fresh(dir);
          runCli(dir, ['add', 'buy', 'milk']);
          runCli(dir, ['add', 'pay', 'rent', '#home']);
          runCli(dir, ['add', 'call', 'bob']);
          const all = lines(runCli(dir, ['list']).out);
          const want = ['1: buy milk', '2: pay rent #home', '3: call bob'];
          if (all.join('|') !== want.join('|')) return fail('list was ' + JSON.stringify(all));
          const tagged = lines(runCli(dir, ['list', '--tag', 'home']).out);
          if (tagged.join('|') !== '2: pay rent #home') return fail('--tag home was ' + JSON.stringify(tagged));
          return pass();
        },
      },
      {
        // Depends on turn 2's tag storage. A turn-2 shortcut that filtered by
        // substring on the raw text passes turn 2 and fails here on #homework.
        prompt: 'Bug: `node cli.js list --tag Home` prints nothing for a note tagged `#home`, and'
          + ' `node cli.js list --tag home` wrongly matches a note tagged `#homework`. Tag matching'
          + ' must compare the whole tag, ignoring case in both directions, and a note\'s text must'
          + ' still print exactly as it was entered.',
        check(dir) {
          fresh(dir);
          runCli(dir, ['add', 'pay', 'rent', '#Home']);
          runCli(dir, ['add', 'read', 'chapter', '#homework']);
          const lower = lines(runCli(dir, ['list', '--tag', 'home']).out);
          if (lower.length !== 1) return fail('--tag home returned ' + lower.length + ' lines');
          if (!/#Home/.test(lower[0])) return fail('case not preserved: ' + JSON.stringify(lower[0]));
          if (/homework/.test(lower[0])) return fail('prefix-matched #homework');
          const upper = lines(runCli(dir, ['list', '--tag', 'HOME']).out);
          if (upper.join('|') !== lower.join('|')) return fail('--tag HOME was ' + JSON.stringify(upper));
          return pass();
        },
      },
      {
        prompt: 'Add the `done` command: `node cli.js done 2` marks note 2 done and prints exactly'
          + ' `done 2`; if no note has that id it prints exactly `no note 2` and exits with status'
          + ' 1. `list` now hides done notes unless it is given `--all`; under `--all` a done'
          + " note's line is prefixed with `[x] ` — `[x] 2: call bob` — and a note that is not done"
          + ' prints unchanged.',
        check(dir) {
          fresh(dir);
          runCli(dir, ['add', 'buy', 'milk']);
          runCli(dir, ['add', 'call', 'bob']);
          runCli(dir, ['add', 'pay', 'rent']);
          const d = runCli(dir, ['done', '2']);
          if (d.out !== 'done 2') return fail('done said ' + JSON.stringify(d.out));
          const open = lines(runCli(dir, ['list']).out);
          if (open.join('|') !== '1: buy milk|3: pay rent') return fail('list was ' + JSON.stringify(open));
          const all = lines(runCli(dir, ['list', '--all']).out);
          if (all.join('|') !== '1: buy milk|[x] 2: call bob|3: pay rent') return fail('--all was ' + JSON.stringify(all));
          const miss = runCli(dir, ['done', '9']);
          if (miss.out !== 'no note 9' || miss.code !== 1) return fail('done 9 -> ' + JSON.stringify(miss));
          return pass();
        },
      },
      {
        prompt: 'Add the `stats` command: `node cli.js stats` prints exactly three lines —'
          + ' `total: <n>`, then `done: <n>`, then `open: <n>` — counting every note, the done'
          + ' ones, and the rest.',
        check(dir) {
          fresh(dir);
          runCli(dir, ['add', 'buy', 'milk']);
          runCli(dir, ['add', 'call', 'bob']);
          runCli(dir, ['add', 'pay', 'rent']);
          runCli(dir, ['done', '1']);
          const out = lines(runCli(dir, ['stats']).out);
          if (out.join('|') !== 'total: 3|done: 1|open: 2') return fail('stats was ' + JSON.stringify(out));
          return pass();
        },
      },
    ],
  },

  http: {
    seed: { 'package.json': PKG, '.gitignore': GITIGNORE },
    turns: [
      {
        prompt: 'Create server.js: an HTTP service started by `node server.js`, listening on the'
          + ' port in process.env.PORT and on 3000 when that is unset. `GET /health` responds 200'
          + ' with the JSON body {"status":"ok"} and a Content-Type of application/json.',
        check: (dir) => withServer(dir, async (base) => {
          const r = await req(base, 'GET', '/health');
          if (r.status !== 200) return fail('/health status ' + r.status);
          if (!/application\/json/i.test(r.headers.get('content-type') || '')) return fail('content-type ' + r.headers.get('content-type'));
          if (!r.json || r.json.status !== 'ok') return fail('/health body ' + r.text.slice(0, 80));
          return pass();
        }),
      },
      {
        prompt: 'Add an in-memory item store. `POST /items` with the JSON body {"name":"..."}'
          + ' responds 201 with the created item as JSON — {"id":1,"name":"..."} — where ids are'
          + ' integers starting at 1 and incrementing by one per item. `GET /items` responds 200'
          + ' with a JSON array of every item, in creation order. Nothing persists across a'
          + ' restart.',
        check: (dir) => withServer(dir, async (base) => {
          const a = await req(base, 'POST', '/items', { name: 'alpha' });
          if (a.status !== 201 || !a.json || a.json.id !== 1 || a.json.name !== 'alpha') return fail('POST#1 ' + a.status + ' ' + a.text.slice(0, 80));
          const b = await req(base, 'POST', '/items', { name: 'beta' });
          if (b.status !== 201 || !b.json || b.json.id !== 2) return fail('POST#2 ' + b.status + ' ' + b.text.slice(0, 80));
          const l = await req(base, 'GET', '/items');
          if (l.status !== 200 || !Array.isArray(l.json)) return fail('GET /items ' + l.status + ' ' + l.text.slice(0, 80));
          if (l.json.length !== 2 || l.json[0].name !== 'alpha' || l.json[1].name !== 'beta') return fail('list was ' + l.text.slice(0, 120));
          return pass();
        }),
      },
      {
        // Depends on turn 2's POST handler. A turn-2 shortcut with no request
        // parsing to speak of has nothing to hang this on.
        prompt: 'Bug: `POST /items` with the body {} creates a nameless item, and a body that is'
          + ' not valid JSON crashes the request. Both must instead respond 400 with the JSON body'
          + ' {"error":"name required"} and create nothing. A name that is not a non-empty string'
          + ' is the same error.',
        check: (dir) => withServer(dir, async (base) => {
          for (const [label, body, raw] of [['{}', {}, false], ['bad json', 'not json at all', true],
            ['empty name', { name: '' }, false], ['number name', { name: 7 }, false]]) {
            const r = await req(base, 'POST', '/items', body, raw);
            if (r.status !== 400) return fail(label + ' -> ' + r.status);
            if (!r.json || r.json.error !== 'name required') return fail(label + ' body ' + r.text.slice(0, 80));
          }
          const ok = await req(base, 'POST', '/items', { name: 'alpha' });
          if (ok.status !== 201) return fail('valid POST broke: ' + ok.status);
          const l = await req(base, 'GET', '/items');
          if (!Array.isArray(l.json) || l.json.length !== 1) return fail('rejected bodies still stored: ' + l.text.slice(0, 120));
          return pass();
        }),
      },
      {
        prompt: 'Add `GET /items/<id>`, responding 200 with that item as JSON, or 404 with'
          + ' {"error":"not found"} when no item has that id. Add `DELETE /items/<id>`, responding'
          + ' 204 with an empty body and removing the item, or 404 with {"error":"not found"} when'
          + ' no item has that id.',
        check: (dir) => withServer(dir, async (base) => {
          await req(base, 'POST', '/items', { name: 'alpha' });
          await req(base, 'POST', '/items', { name: 'beta' });
          const one = await req(base, 'GET', '/items/1');
          if (one.status !== 200 || !one.json || one.json.name !== 'alpha') return fail('GET /items/1 ' + one.status + ' ' + one.text.slice(0, 80));
          const miss = await req(base, 'GET', '/items/99');
          if (miss.status !== 404 || !miss.json || miss.json.error !== 'not found') return fail('GET /items/99 ' + miss.status + ' ' + miss.text.slice(0, 80));
          const del = await req(base, 'DELETE', '/items/1');
          if (del.status !== 204 || del.text !== '') return fail('DELETE ' + del.status + ' ' + JSON.stringify(del.text.slice(0, 40)));
          const left = await req(base, 'GET', '/items');
          if (!Array.isArray(left.json) || left.json.length !== 1 || left.json[0].id !== 2) return fail('after delete ' + left.text.slice(0, 120));
          const again = await req(base, 'DELETE', '/items/1');
          if (again.status !== 404) return fail('second DELETE ' + again.status);
          return pass();
        }),
      },
      {
        prompt: 'Add filtering: `GET /items?q=<text>` returns only the items whose name contains'
          + ' <text>, ignoring case. Every `GET /items` response also carries an X-Total-Count'
          + ' header holding the number of items in the body it returned.',
        check: (dir) => withServer(dir, async (base) => {
          for (const name of ['Widget', 'gadget', 'Sprocket']) await req(base, 'POST', '/items', { name });
          const all = await req(base, 'GET', '/items');
          if (all.headers.get('x-total-count') !== '3') return fail('X-Total-Count on all = ' + all.headers.get('x-total-count'));
          const q = await req(base, 'GET', '/items?q=get');
          if (!Array.isArray(q.json)) return fail('?q body ' + q.text.slice(0, 80));
          const names = q.json.map((i) => i.name).sort().join(',');
          if (names !== 'Widget,gadget') return fail('?q=get returned ' + names);
          if (q.headers.get('x-total-count') !== '2') return fail('X-Total-Count on ?q = ' + q.headers.get('x-total-count'));
          const upper = await req(base, 'GET', '/items?q=GET');
          if (!Array.isArray(upper.json) || upper.json.length !== 2) return fail('?q=GET returned ' + upper.text.slice(0, 80));
          return pass();
        }),
      },
    ],
  },
};

// --- git trajectory ----------------------------------------------------------

function gitIn(repo, args) {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8', timeout: 30000 });
  return r.status === 0 ? String(r.stdout) : null;
}
function initRepo(repo) {
  gitIn(repo, ['init', '-q', '-b', 'main']);
  gitIn(repo, ['config', 'user.email', 'probe@local']);
  gitIn(repo, ['config', 'user.name', 'razor probe']);
  gitIn(repo, ['add', '-A']);
  gitIn(repo, ['commit', '-q', '-m', 'seed']);
  return (gitIn(repo, ['rev-parse', 'HEAD']) || '').trim();
}
function commitTurn(repo, n) {
  gitIn(repo, ['add', '-A']);
  gitIn(repo, ['commit', '-q', '--allow-empty', '-m', 'turn' + n]);
  return (gitIn(repo, ['rev-parse', 'HEAD']) || '').trim();
}
function numstat(repo, from, to) {
  let insertions = 0; let deletions = 0; let filesChanged = 0;
  for (const line of String(gitIn(repo, ['diff', '--numstat', from, to]) || '').split('\n')) {
    const [ins, del, file] = line.split('\t');
    if (!file) continue;
    filesChanged++;
    insertions += Number(ins) || 0;
    deletions += Number(del) || 0;
  }
  const newFiles = String(gitIn(repo, ['diff', '--diff-filter=A', '--name-only', from, to]) || '')
    .split('\n').filter(Boolean);
  return { insertions, deletions, filesChanged, newFiles: newFiles.length, newFileNames: newFiles };
}
// Size of the whole tracked tree at HEAD: the cumulative number the trajectory
// is really about.
function treeSize(repo) {
  const files = String(gitIn(repo, ['ls-files']) || '').split('\n').filter(Boolean);
  let loc = 0;
  for (const f of files) {
    try { loc += fs.readFileSync(path.join(repo, f), 'utf8').split('\n').length; } catch { /* binary/gone */ }
  }
  return { cumFiles: files.length, cumLoc: loc };
}

// --- claude CLI plumbing (shape copied from razor-gate-probe.js) -------------

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
// `let`, not `const`, so the selftest can point it at a binary that does not
// exist and prove a dead cell resolves instead of hanging the queue.
let CLAUDE = process.env.CLAUDE_BIN || whichClaude();
let NEEDS_SHELL = CLAUDE ? /\.(cmd|bat)$/i.test(CLAUDE) : true;
function quoteArg(a) {
  return /[\s"^&|<>()]/.test(a) ? '"' + String(a).replace(/"/g, '\\"') + '"' : a;
}
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
// The CLI's own result event, last one wins; partial lines are ignored.
function parseStream(raw) {
  let result = null;
  for (const line of String(raw).split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { const ev = JSON.parse(t); if (ev.type === 'result') result = ev; } catch { /* partial */ }
  }
  return result;
}
const gateFired = (raw) => /razor: /.test(String(raw));
const ledgerFired = (raw) => /razor ledger:/.test(String(raw));

// One headless turn. The stream log is written to logDir, OUTSIDE the measured
// repo, or it would land in the diff it is measuring.
function turn({ ws, logDir, arm, model, prompt, resume, tag }) {
  const args = ['-p', '--model', MODELS[model] || model,
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'project,local', '--strict-mcp-config',
    '--disallowedTools', GUARD.join(',')];
  if (arm === 'razor') args.push('--plugin-dir', RAZOR_DIR);
  if (resume) args.push('--resume', resume);

  return new Promise((resolve) => {
    const outPath = path.join(logDir, '_' + tag + '.stream.jsonl');
    const out = fs.createWriteStream(outPath);
    let killed = false;
    let settled = false;
    // One resolve, always. A spawn that fails emits 'error' and may never emit
    // 'close'; without this the queue hangs on a dead cell instead of moving on.
    const finish = (extra) => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      out.end();
      out.on('finish', () => {
        let raw = '';
        try { raw = fs.readFileSync(outPath, 'utf8'); } catch { /* never opened */ }
        resolve({ result: parseStream(raw), raw, killed, ...extra });
      });
    };
    const child = NEEDS_SHELL
      ? spawn([CLAUDE || 'claude', ...args].map(quoteArg).join(' '), { cwd: ws, env: cellEnv(), shell: true })
      : spawn(CLAUDE || 'claude', args, { cwd: ws, env: cellEnv(), shell: false });
    const killer = setTimeout(() => {
      killed = true;
      try { child.kill('SIGKILL'); } catch { /* gone */ }
    }, TURN_TIMEOUT_MS);
    child.stdout.on('data', (d) => out.write(d));
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => { /* EPIPE if the CLI died first */ });
    child.on('error', (e) => finish({ spawnError: String(e && e.message).slice(0, 200) }));
    try { child.stdin.write(prompt); child.stdin.end(); } catch { /* gone */ }
    child.on('close', () => finish({}));
  });
}

// --- scoring -----------------------------------------------------------------

// Score features 1..upTo in a COPY of the tree: the checks run the code, which
// writes notes.json and binds ports, and the measured tree must stay pristine.
// node_modules is shared by link, not copied: an arm that ran `npm install`
// must still be able to require what it installed (or its server fails a check
// it actually passed), and deep-copying a dependency tree five times per cell
// costs minutes. Nothing in a check writes there, so sharing is safe.
async function scoreTurns(conv, repo, cellDir, upTo) {
  const dir = path.join(cellDir, '_check');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(repo, dir, {
    recursive: true,
    filter: (src) => !/[\\/]\.git([\\/]|$)/.test(src) && !/[\\/]node_modules([\\/]|$)/.test(src),
  });
  const nm = path.join(repo, 'node_modules');
  if (fs.existsSync(nm)) {
    try { fs.symlinkSync(nm, path.join(dir, 'node_modules'), 'junction'); }
    catch { fs.cpSync(nm, path.join(dir, 'node_modules'), { recursive: true }); }
  }
  const out = [];
  for (let i = 0; i < upTo; i++) {
    let r;
    try { r = await CONVERSATIONS[conv].turns[i].check(dir); } catch (e) { r = fail('check threw: ' + String(e && e.message).slice(0, 120)); }
    out.push({ feature: i + 1, ok: !!r.ok, detail: r.detail || '' });
  }
  return out;
}

// --- run ---------------------------------------------------------------------

const argv = process.argv.slice(2);
// Its own subdir: D:/razor-probe-runs is a shared root and a sibling probe's
// rows.json at the top of it would be read as this run's resume state.
const OUT = path.resolve(argv[0] && !argv[0].startsWith('--') ? argv[0] : 'D:/razor-probe-runs/grow');
function flag(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
}
const list = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean);
const models = list(flag('models', 'sonnet,opus'));
const reps = Number(flag('reps', 3));
const arms = list(flag('arms', 'baseline,razor'));
const convs = list(flag('conversations', Object.keys(CONVERSATIONS).join(',')));
const SEED = Number(flag('seed', Date.now() % 100000));
const dry = argv.includes('--dry-run');

const ARMS = ['baseline', 'razor'];

// Everything that would otherwise spend money on a run that cannot mean
// anything. Returns the complaints rather than exiting, so the selftest can
// prove the guard both ways.
function configErrors(o) {
  const bad = [];
  // The load-bearing one. razor/hooks/file-meter.js:50 exempts os.tmpdir() as
  // scratch, so a run rooted there has the new-file gate disabled by
  // construction and its zero is the harness's, not razor's.
  const t = path.resolve(os.tmpdir()).replace(/\\/g, '/').toLowerCase();
  const r = path.resolve(o.out).replace(/\\/g, '/').toLowerCase();
  if (r === t || r.startsWith(t + '/') || r.includes('/scratchpad/')) {
    bad.push('out-dir ' + o.out + ' is inside os.tmpdir() (' + os.tmpdir() + ') or a scratchpad —'
      + " razor's file meter is exempt there, so the run cannot measure it. Use D:/razor-probe-runs.");
  }
  // Without this, a wrong RAZOR_DIR makes --plugin-dir load nothing and the
  // razor arm is a second baseline — a full-price run of one arm twice.
  if (o.arms.includes('razor')) {
    if (!fs.existsSync(path.join(o.razorDir, '.claude-plugin', 'plugin.json'))
      || !fs.existsSync(path.join(o.razorDir, 'hooks', 'hooks.json'))) {
      bad.push('RAZOR_DIR ' + o.razorDir + ' is not a razor plugin (no .claude-plugin/plugin.json + hooks/hooks.json)'
        + ' — the razor arm would run as a second baseline');
    }
  }
  for (const m of o.models) if (!MODELS[m]) bad.push('unknown model "' + m + '" — only ' + Object.keys(MODELS).join(', ') + ' (house rule: no haiku)');
  for (const a of o.arms) if (!ARMS.includes(a)) bad.push('unknown arm "' + a + '" — only ' + ARMS.join(', '));
  for (const c of o.convs) if (!CONVERSATIONS[c]) bad.push('unknown conversation "' + c + '" — only ' + Object.keys(CONVERSATIONS).join(', '));
  if (!Number.isInteger(o.reps) || o.reps < 1) bad.push('--reps must be a positive integer, got ' + JSON.stringify(flag('reps', 3)));
  if (!Number.isFinite(o.seed)) bad.push('--seed must be a number, got ' + JSON.stringify(flag('seed', '')));
  if (!o.models.length || !o.arms.length || !o.convs.length) bad.push('empty models/arms/conversations list');
  return bad;
}

// A feature that passed at one turn and fails at a later one. This is the
// false-economy result the probe exists to find, so it is a first-class number
// and not something a reader has to reconstruct from _turnstats.json.
function regressions(turnRows) {
  const seen = new Map();
  const out = [];
  for (const t of turnRows) {
    for (const c of t.checks || []) {
      if (seen.get(c.feature) === true && !c.ok) out.push({ feature: c.feature, brokeAtTurn: t.turn, detail: c.detail });
      seen.set(c.feature, !!c.ok);
    }
  }
  return out;
}
const cellKey = (conv, arm, model, rep) => [conv, arm, model, rep].join('__');

// What razor was ACTUALLY loaded. --plugin-dir loads a working tree, not a
// release, so an uncommitted edit to a gate hook would be measured and then
// written up as the released version. Record it on every row and say so.
// `git status --porcelain` puts the status in columns 0-1 and the path from
// column 3. A leading unstaged marker is a SPACE, so trimming the whole block
// before splitting eats the first line's first path character.
function parsePorcelain(text) {
  return String(text).split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length > 3)
    .map((l) => l.slice(3).trim())
    .filter(Boolean);
}
function razorRev() {
  const g = (args) => {
    const r = spawnSync('git', args, { cwd: RAZOR_DIR, encoding: 'utf8', timeout: 15000 });
    return r.status === 0 ? String(r.stdout) : null;
  };
  const head = g(['rev-parse', '--short', 'HEAD']);
  if (head === null) return { head: 'unknown', dirty: null, files: [] };
  const files = parsePorcelain(g(['status', '--porcelain']) || '');
  return { head: head.trim(), dirty: files.length > 0, files };
}

// Deterministic shuffle so neither arm eats more of the cold-start cost, and
// the exact order can be replayed with --seed.
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, seed) {
  const rnd = mulberry32(seed);
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCells() {
  const cells = [];
  for (const c of convs) {
    for (const m of models) for (const a of arms) for (let r = 0; r < reps; r++) cells.push([c, m, a, r]);
  }
  return shuffle(cells, SEED);
}

async function main() {
  const errs = configErrors({ out: OUT, models, arms, convs, reps, seed: SEED, razorDir: RAZOR_DIR });
  if (errs.length) { errs.forEach((e) => console.error('config: ' + e)); process.exit(2); }
  if (!CLAUDE && !dry) { console.error('claude CLI not found on PATH'); process.exit(1); }
  const cells = buildCells();
  const turnsPerCell = 5;
  const est = cells.reduce((s, [, m]) => s + (EST[m] || 0.35), 0);

  const REV = arms.includes('razor') ? razorRev() : { head: 'n/a', dirty: false, files: [] };
  console.log('razor grow probe — seed ' + SEED);
  console.log('arms ' + arms.join(',') + ' x models ' + models.join(',')
    + ' x conversations ' + convs.join(',') + ' x ' + reps + ' reps');
  console.log('razor arm loads ' + RAZOR_DIR + ' @ ' + REV.head);
  if (REV.dirty) {
    console.log('  !! that working tree is DIRTY — ' + REV.files.length + ' uncommitted file(s): '
      + REV.files.slice(0, 8).join(' ') + (REV.files.length > 8 ? ' …' : ''));
    console.log('  !! --plugin-dir loads the tree, not the release. Whatever this run measures is'
      + ' "' + REV.head + ' + local edits", and it must NOT be written up as a released version.');
    console.log('  !! commit or stash first if you meant to measure the release.');
  }
  console.log(cells.length + ' sessions, ' + (cells.length * turnsPerCell) + ' turns -> ' + OUT);
  console.log('estimate $' + est.toFixed(2) + ' ('
    + models.map((m) => m + ' $' + (EST[m] || 0.35).toFixed(2) + '/session').join(', ') + ')');
  if (dry) {
    const rowsPath = path.join(OUT, 'rows.json');
    let already = new Set();
    try { already = new Set(JSON.parse(fs.readFileSync(rowsPath, 'utf8')).map((r) => cellKey(r.conversation, r.arm, r.model, r.rep))); } catch { /* first run */ }
    cells.forEach((c, i) => {
      const skip = already.has(cellKey(c[0], c[2], c[1], c[3]));
      console.log('  ' + String(i + 1).padStart(3) + '  ' + [c[0], c[2], c[1], '#' + c[3]].join(' / ')
        + (skip ? '   [already in rows.json — skipped]' : ''));
    });
    if (already.size) {
      const todo = cells.filter((c) => !already.has(cellKey(c[0], c[2], c[1], c[3])));
      console.log(todo.length + ' of ' + cells.length + ' cells would actually run — $'
        + todo.reduce((s, [, m]) => s + (EST[m] || 0.35), 0).toFixed(2));
    }
    console.log('dry run — nothing spawned, nothing spent');
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const rowsPath = path.join(OUT, 'rows.json');
  const rows = fs.existsSync(rowsPath) ? JSON.parse(fs.readFileSync(rowsPath, 'utf8')) : [];
  // Resume, and never pay twice: a cell already in rows.json is not re-run,
  // even a short one. Delete its row by hand to buy it again.
  const done = new Set(rows.map((r) => cellKey(r.conversation, r.arm, r.model, r.rep)));
  if (done.size) {
    const short = rows.filter((r) => r.turnsCompleted < 5).map((r) => cellKey(r.conversation, r.arm, r.model, r.rep));
    console.log('resuming: ' + done.size + ' cell(s) already in rows.json will be skipped, not re-billed'
      + (short.length ? '\n  incomplete, delete the row to re-buy: ' + short.join(' ') : ''));
  }
  let total = 0;
  let ran = 0;

  for (const [conv, model, arm, rep] of cells) {
    if (done.has(cellKey(conv, arm, model, rep))) continue;
    const spec = CONVERSATIONS[conv];
    const cellDir = path.join(OUT, conv + '__' + arm + '__' + model + '__' + rep);
    const repo = path.join(cellDir, 'repo');
    // Wipe first. A left-over cell dir from an earlier run would hand turn 1 a
    // repo where all five features are already implemented, and every number
    // off that session would be a fiction.
    fs.rmSync(cellDir, { recursive: true, force: true });
    fs.mkdirSync(repo, { recursive: true });
    ran++;
    for (const [fn, content] of Object.entries(spec.seed)) fs.writeFileSync(path.join(repo, fn), content);
    const seedSha = initRepo(repo);

    let sid = null;
    let prevSha = seedSha;
    let cost = 0;
    const turnRows = [];
    for (let i = 0; i < spec.turns.length; i++) {
      const started = Date.now();
      const t = await turn({ ws: repo, logDir: cellDir, arm, model,
        prompt: spec.turns[i].prompt, resume: sid, tag: 't' + (i + 1) });
      const wallMs = Date.now() - started;
      // Each resumed turn returns its own session id; resume the latest so the
      // five turns stay one thread instead of forking off turn 1.
      sid = (t.result && t.result.session_id) || sid;
      cost += (t.result && t.result.total_cost_usd) || 0;

      const sha = commitTurn(repo, i + 1);
      const delta = numstat(repo, prevSha, sha);
      const cum = numstat(repo, seedSha, sha);
      prevSha = sha;
      const checks = await scoreTurns(conv, repo, cellDir, i + 1);

      turnRows.push({
        turn: i + 1,
        cost: (t.result && t.result.total_cost_usd) || 0,
        numTurns: (t.result && t.result.num_turns) || 0,
        wallMs,
        denials: (t.result && (t.result.permission_denials || []).length) || 0,
        gate: gateFired(t.raw),
        ledger: ledgerFired(t.raw),
        sessionId: sid,
        delta,
        cumulative: { insertions: cum.insertions, deletions: cum.deletions, newFiles: cum.newFiles, ...treeSize(repo) },
        checks,
        final: ((t.result && String(t.result.result || '')) || '').slice(0, 4000),
        failed: !t.result,
        killed: !!t.killed,
        spawnError: t.spawnError || null,
      });
      fs.writeFileSync(path.join(cellDir, '_turnstats.json'), JSON.stringify(turnRows, null, 2));
      console.log('    t' + (i + 1) + '  +' + delta.insertions + '/-' + delta.deletions
        + ' files+' + delta.newFiles + ' cum ' + turnRows[i].cumulative.cumLoc + 'L/'
        + turnRows[i].cumulative.cumFiles + 'F  checks '
        + checks.map((c) => (c.ok ? 'P' : 'F')).join('') + '  $' + cost.toFixed(4)
        + (turnRows[i].gate ? ' GATE' : '') + (turnRows[i].ledger ? ' LEDGER' : ''));
      if (!t.result) {
        console.log('    turn ' + (i + 1) + ' produced no result ('
          + (t.spawnError ? 'spawn: ' + t.spawnError : t.killed ? 'timed out after ' + TURN_TIMEOUT_MS + 'ms — its spend is REAL but unreported' : 'no result event')
          + ') — abandoning this session');
        break;
      }
    }

    total += cost;
    const last = turnRows[turnRows.length - 1] || { checks: [], cumulative: {} };
    const row = {
      conversation: conv, arm, model, rep, seed: SEED,
      razorRev: REV.head, razorDirty: REV.dirty,
      cost,
      numTurns: turnRows.reduce((s, t) => s + t.numTurns, 0),
      wallMs: turnRows.reduce((s, t) => s + t.wallMs, 0),
      denials: turnRows.reduce((s, t) => s + t.denials, 0),
      gate: turnRows.some((t) => t.gate),
      ledger: turnRows.some((t) => t.ledger),
      turnsCompleted: turnRows.length,
      complete: turnRows.length === spec.turns.length && !!turnRows[turnRows.length - 1],
      killedTurns: turnRows.filter((t) => t.killed).length,
      finalChecks: last.checks.map((c) => c.ok),
      finalPass: last.checks.filter((c) => c.ok).length,
      finalCum: last.cumulative,
      regressions: regressions(turnRows),
      turns: turnRows,
    };
    rows.push(row);
    fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
    console.log('  ' + conv + ' / ' + arm + ' / ' + model + ' #' + rep
      + '  pass ' + row.finalPass + '/' + last.checks.length
      + '  cum ' + (last.cumulative.cumLoc || 0) + 'L/' + (last.cumulative.cumFiles || 0) + 'F'
      + '  $' + cost.toFixed(4) + '  running $' + total.toFixed(2));
  }

  // Feature pass is scored over COMPLETE sessions only. A session abandoned at
  // turn 3 has no opinion about features 4 and 5, and counting its blanks as
  // failures would let a slow arm look like a wrong one — which is exactly the
  // finding this probe is meant to detect, so it must not be able to invent it.
  // Incomplete sessions are reported on their own line instead of being hidden.
  console.log('\n--- summary (complete sessions only; read _turnstats.json for the trajectory) ---');
  for (const conv of convs) {
    for (const model of models) for (const arm of arms) {
      const all = rows.filter((r) => r.conversation === conv && r.model === model && r.arm === arm);
      if (!all.length) continue;
      const c = all.filter((r) => r.complete);
      const n = c.length;
      const avg = (f) => (n ? c.reduce((s, r) => s + f(r), 0) / n : 0);
      const perTurn = [1, 2, 3, 4, 5].map((k) => (n ? c.filter((r) => r.finalChecks[k - 1]).length : 0) + '/' + n);
      console.log(conv.padEnd(5) + ' ' + arm.padEnd(9) + ' ' + model.padEnd(7)
        + ' feature pass ' + perTurn.join(' ')
        + '  regress ' + c.filter((r) => r.regressions.length).length + '/' + n
        + '  cumLoc ' + avg((r) => r.finalCum.cumLoc || 0).toFixed(0)
        + '  cumFiles ' + avg((r) => r.finalCum.cumFiles || 0).toFixed(1)
        + '  gate ' + c.filter((r) => r.gate).length + '/' + n
        + '  ledger ' + c.filter((r) => r.ledger).length + '/' + n
        + '  $' + avg((r) => r.cost).toFixed(4)
        + (all.length > n ? '   [' + (all.length - n) + ' of ' + all.length + ' sessions incomplete, excluded]' : ''));
    }
  }
  const regressed = rows.filter((r) => r.regressions && r.regressions.length);
  if (regressed.length) {
    console.log('\nregressions — a feature that passed, then broke at a later turn:');
    for (const r of regressed) {
      for (const g of r.regressions) {
        console.log('  ' + r.conversation + ' / ' + r.arm + ' / ' + r.model + ' #' + r.rep
          + '  feature ' + g.feature + ' broke at turn ' + g.brokeAtTurn + '  — ' + (g.detail || ''));
      }
    }
  }
  const killed = rows.reduce((s, r) => s + (r.killedTurns || 0), 0);
  console.log('\nthis run $' + total.toFixed(2) + ' over ' + ran + ' sessions; rows.json holds '
    + rows.length + ' sessions totalling $' + rows.reduce((s, r) => s + r.cost, 0).toFixed(2) + ' in ' + OUT);
  if (killed) console.log(killed + ' turn(s) were killed on the timeout — their real spend is NOT in these totals');
  console.log('report first: a turn-4/5 feature-pass drop or any regress in the razor arm is the false-economy'
    + ' result; a razor arm that is smaller AND equal on every feature is the win. Read the `detail` string and'
    + ' the kept final text on every razor failure by eye before calling it a correctness loss — the checks are'
    + ' exact-contract and will score a working-but-differently-worded answer as a failure.');
}

// --- selftest ----------------------------------------------------------------
// Proves every instrument against hand-written GOOD and BAD implementations.
// No API spend. A scorer that has not been shown to reject a bad answer AND
// accept a good one is not evidence.

const GOOD_CLI = `const fs = require('node:fs');
const FILE = 'notes.json';
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } }
function save(n) { fs.writeFileSync(FILE, JSON.stringify(n, null, 2)); }
function tagsOf(text) { return (text.match(/#[A-Za-z0-9_]+/g) || []).map((t) => t.slice(1)); }
const [cmd, ...rest] = process.argv.slice(2);
const notes = load();
if (cmd === 'add') {
  const text = rest.join(' ');
  const id = notes.reduce((m, n) => Math.max(m, n.id), 0) + 1;
  notes.push({ id, text, tags: tagsOf(text), done: false });
  save(notes);
  console.log('added ' + id);
} else if (cmd === 'list') {
  const all = rest.includes('--all');
  const ti = rest.indexOf('--tag');
  const tag = ti >= 0 ? String(rest[ti + 1] || '').toLowerCase() : null;
  for (const n of notes) {
    if (!all && n.done) continue;
    if (tag && !n.tags.some((t) => t.toLowerCase() === tag)) continue;
    console.log((n.done ? '[x] ' : '') + n.id + ': ' + n.text);
  }
} else if (cmd === 'done') {
  const id = Number(rest[0]);
  const n = notes.find((x) => x.id === id);
  if (!n) { console.log('no note ' + id); process.exit(1); }
  n.done = true; save(notes); console.log('done ' + id);
} else if (cmd === 'stats') {
  const done = notes.filter((n) => n.done).length;
  console.log('total: ' + notes.length);
  console.log('done: ' + done);
  console.log('open: ' + (notes.length - done));
}
`;

const GOOD_SERVER = `const http = require('node:http');
const items = [];
let nextId = 1;
function json(res, code, body, extra) {
  res.writeHead(code, { 'content-type': 'application/json', ...(extra || {}) });
  res.end(JSON.stringify(body));
}
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok' });
  if (req.method === 'POST' && url.pathname === '/items') {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      let parsed = null;
      try { parsed = JSON.parse(body); } catch { return json(res, 400, { error: 'name required' }); }
      if (!parsed || typeof parsed.name !== 'string' || !parsed.name) return json(res, 400, { error: 'name required' });
      const item = { id: nextId++, name: parsed.name };
      items.push(item);
      json(res, 201, item);
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/items') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const out = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
    return json(res, 200, out, { 'x-total-count': String(out.length) });
  }
  const m = /^\\/items\\/(\\d+)$/.exec(url.pathname);
  if (m) {
    const i = items.findIndex((x) => x.id === Number(m[1]));
    if (req.method === 'GET') return i < 0 ? json(res, 404, { error: 'not found' }) : json(res, 200, items[i]);
    if (req.method === 'DELETE') {
      if (i < 0) return json(res, 404, { error: 'not found' });
      items.splice(i, 1);
      res.writeHead(204);
      return res.end();
    }
  }
  json(res, 404, { error: 'not found' });
}).listen(Number(process.env.PORT) || 3000);
`;

// Each mutation breaks exactly one feature. `keeps` names features that must
// still pass afterwards — that is what proves a check targets its own turn and
// is not just detecting "the file is broken".
const MUTANTS = {
  cli: [
    { feature: 1, from: "console.log('added ' + id);", to: "console.log('added');", keeps: [] },
    { feature: 2, from: 'if (tag && !n.tags.some((t) => t.toLowerCase() === tag)) continue;', to: '', keeps: [1] },
    { feature: 3, from: 'n.tags.some((t) => t.toLowerCase() === tag)', to: "n.text.toLowerCase().includes('#' + tag)", keeps: [1, 2] },
    { feature: 4, from: 'if (!all && n.done) continue;', to: '', keeps: [1, 2, 3] },
    { feature: 5, from: "console.log('open: '", to: "console.log('remaining: '", keeps: [1, 2, 3, 4] },
  ],
  http: [
    { feature: 1, from: "{ status: 'ok' }", to: "{ status: 'up' }", keeps: [] },
    { feature: 2, from: 'id: nextId++', to: 'id: nextId', keeps: [1] },
    { feature: 3, from: "if (!parsed || typeof parsed.name !== 'string' || !parsed.name) return json(res, 400, { error: 'name required' });", to: '', keeps: [1, 2] },
    { feature: 4, from: 'res.writeHead(204);', to: 'res.writeHead(200);', keeps: [1, 2, 3] },
    { feature: 5, from: "{ 'x-total-count': String(out.length) }", to: 'undefined', keeps: [1, 2, 3, 4] },
  ],
};

const FILES = { cli: 'cli.js', http: 'server.js' };
const GOOD = { cli: GOOD_CLI, http: GOOD_SERVER };

async function scoreSource(conv, dir, source) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, FILES[conv]), source);
  const out = [];
  for (const t of CONVERSATIONS[conv].turns) {
    let r;
    try { r = await t.check(dir); } catch (e) { r = fail('threw: ' + String(e && e.message)); }
    out.push(r);
  }
  return out;
}

let bad = 0;
function assert(cond, label, detail) {
  if (cond) { console.log('  ok   ' + label); return; }
  bad++;
  console.log('  FAIL ' + label + (detail ? '  — ' + detail : ''));
}

async function selftest() {
  const root = path.join(OUT, '_selftest');
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });

  for (const conv of Object.keys(CONVERSATIONS)) {
    console.log(conv + ' scorers');
    const good = await scoreSource(conv, path.join(root, conv + '-good'), GOOD[conv]);
    good.forEach((r, i) => assert(r.ok, conv + ' GOOD passes feature ' + (i + 1), r.detail));

    const empty = await scoreSource(conv, path.join(root, conv + '-empty'), '// nothing\n');
    assert(empty.every((r) => !r.ok), conv + ' empty file fails every feature');

    for (const mut of MUTANTS[conv]) {
      const src = GOOD[conv].replace(mut.from, mut.to);
      assert(src !== GOOD[conv], conv + ' mutant ' + mut.feature + ' actually applied');
      const scored = await scoreSource(conv, path.join(root, conv + '-bad' + mut.feature), src);
      assert(!scored[mut.feature - 1].ok, conv + ' BAD feature ' + mut.feature + ' is caught');
      for (const k of mut.keeps) {
        assert(scored[k - 1].ok, conv + ' mutant ' + mut.feature + ' leaves feature ' + k + ' passing',
          scored[k - 1].detail);
      }
    }
  }

  console.log('git trajectory');
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo, { recursive: true });
  fs.writeFileSync(path.join(repo, 'a.js'), 'one\ntwo\nthree\n');
  fs.writeFileSync(path.join(repo, '.gitignore'), GITIGNORE);
  const seedSha = initRepo(repo);
  assert(/^[0-9a-f]{40}$/.test(seedSha), 'seed commit made', seedSha);
  fs.writeFileSync(path.join(repo, 'a.js'), 'one\ntwo\n');       // -1 line
  fs.writeFileSync(path.join(repo, 'b.js'), 'x\ny\nz\nw\n');     // +4 lines, new file
  fs.writeFileSync(path.join(repo, 'ignored.log'), 'noise\n');   // must not count
  const sha1 = commitTurn(repo, 1);
  const d1 = numstat(repo, seedSha, sha1);
  assert(d1.insertions === 4 && d1.deletions === 1, 'numstat counts +4/-1', JSON.stringify(d1));
  assert(d1.newFiles === 1 && d1.newFileNames[0] === 'b.js', 'numstat names the new file', JSON.stringify(d1.newFileNames));
  const size = treeSize(repo);
  assert(size.cumFiles === 3 && size.cumLoc === 3 + 5 + GITIGNORE.split('\n').length,
    'treeSize counts tracked files only', JSON.stringify(size));
  fs.writeFileSync(path.join(repo, 'b.js'), 'x\ny\nz\nw\nv\n');
  const sha2 = commitTurn(repo, 2);
  const d2 = numstat(repo, sha1, sha2);
  const cum = numstat(repo, seedSha, sha2);
  assert(d2.insertions === 1 && d2.newFiles === 0, 'per-turn delta is turn-scoped', JSON.stringify(d2));
  assert(cum.insertions === 5 && cum.newFiles === 1, 'cumulative is measured against the seed', JSON.stringify(cum));

  // The seam the run loop actually uses: score a git-tracked tree through the
  // copy step. .git must not come along — the checks run code in there.
  console.log('scoreTurns over a real repo');
  const cellDir = path.join(root, 'cell');
  const cellRepo = path.join(cellDir, 'repo');
  fs.mkdirSync(cellRepo, { recursive: true });
  fs.writeFileSync(path.join(cellRepo, 'cli.js'), GOOD_CLI);
  fs.writeFileSync(path.join(cellRepo, '.gitignore'), GITIGNORE);
  initRepo(cellRepo);
  const scored = await scoreTurns('cli', cellRepo, cellDir, 5);
  assert(scored.length === 5 && scored.every((s) => s.ok), 'scoreTurns passes a good tracked tree',
    JSON.stringify(scored.filter((s) => !s.ok)));
  assert(!fs.existsSync(path.join(cellDir, '_check', '.git')), '.git is left out of the check copy');
  assert(!fs.existsSync(path.join(cellRepo, 'notes.json')), 'the measured tree is untouched by scoring');

  console.log('stream readers');
  const stream = [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }] } }),
    '{ this line is truncated',
    JSON.stringify({ type: 'result', total_cost_usd: 0.1234, num_turns: 7,
      session_id: 'abc-123', permission_denials: [{ tool_name: 'Write' }, { tool_name: 'Edit' }],
      result: 'done' }),
  ].join('\n') + '\n';
  const res = parseStream(stream);
  assert(!!res && res.total_cost_usd === 0.1234 && res.num_turns === 7 && res.session_id === 'abc-123',
    'parseStream survives a truncated line and reads the result');
  assert(res.permission_denials.length === 2, 'parseStream carries permission_denials');
  assert(parseStream('') === null, 'parseStream returns null with no result event');
  assert(gateFired('...tool_use_id...razor: new file #5 this turn (budget 4).') === true, 'gate marker found');
  assert(gateFired('nothing razory here, razor ledger: +10 / -0 LOC') === false, 'gate marker not confused by the ledger');
  assert(ledgerFired('razor ledger: +600 / -0 LOC, 9 new files') === true, 'ledger marker found');
  assert(ledgerFired('razor: new file #5 this turn') === false, 'ledger marker not confused by a gate');

  // The check copy must be able to require what an arm installed, and scoring
  // must not eat the original tree's node_modules on the next turn's rmSync.
  console.log('node_modules reaches the check copy');
  const nmCell = path.join(root, 'nmcell');
  const nmRepo = path.join(nmCell, 'repo');
  fs.mkdirSync(path.join(nmRepo, 'node_modules', 'dep'), { recursive: true });
  fs.writeFileSync(path.join(nmRepo, 'node_modules', 'dep', 'index.js'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(nmRepo, 'node_modules', 'dep', 'package.json'), '{"name":"dep","main":"index.js"}\n');
  fs.writeFileSync(path.join(nmRepo, 'cli.js'), GOOD_CLI);
  fs.writeFileSync(path.join(nmRepo, '.gitignore'), GITIGNORE);
  initRepo(nmRepo);
  await scoreTurns('cli', nmRepo, nmCell, 1);
  assert(fs.existsSync(path.join(nmCell, '_check', 'node_modules', 'dep', 'index.js')),
    'an installed dependency is reachable from the check copy');
  await scoreTurns('cli', nmRepo, nmCell, 1); // second pass rms the copy first
  assert(fs.existsSync(path.join(nmRepo, 'node_modules', 'dep', 'index.js')),
    'rescoring does not delete the measured tree\'s node_modules through the link');

  console.log('regression detector');
  const clean = [{ turn: 1, checks: [{ feature: 1, ok: true }] },
    { turn: 2, checks: [{ feature: 1, ok: true }, { feature: 2, ok: true }] }];
  assert(regressions(clean).length === 0, 'a session that never breaks reports no regression');
  const broke = [{ turn: 1, checks: [{ feature: 1, ok: true }] },
    { turn: 2, checks: [{ feature: 1, ok: true }, { feature: 2, ok: true }] },
    { turn: 3, checks: [{ feature: 1, ok: false, detail: 'add#1 said ""' }, { feature: 2, ok: true }, { feature: 3, ok: true }] },
    { turn: 4, checks: [{ feature: 1, ok: false }, { feature: 2, ok: true }, { feature: 3, ok: true }, { feature: 4, ok: true }] }];
  const reg = regressions(broke);
  assert(reg.length === 1 && reg[0].feature === 1 && reg[0].brokeAtTurn === 3,
    'a feature that passed then broke is caught once, at the turn it broke', JSON.stringify(reg));
  const never = [{ turn: 1, checks: [{ feature: 1, ok: false }] }, { turn: 2, checks: [{ feature: 1, ok: false }] }];
  assert(regressions(never).length === 0, 'a feature that never passed is not a regression');

  console.log('config guard');
  const okCfg = { out: 'D:/razor-probe-runs', models: ['sonnet', 'opus'], arms: ['baseline', 'razor'], convs: ['cli', 'http'], reps: 3, seed: 1, razorDir: RAZOR_DIR };
  assert(configErrors(okCfg).length === 0, 'the shipped defaults pass the guard', JSON.stringify(configErrors(okCfg)));
  const tmpErr = configErrors({ ...okCfg, out: path.join(os.tmpdir(), 'razor-grow') });
  assert(tmpErr.length === 1 && /tmpdir/.test(tmpErr[0]), 'an out-dir under os.tmpdir() is refused', JSON.stringify(tmpErr));
  assert(configErrors({ ...okCfg, out: path.join(os.homedir(), 'scratchpad', 'x') }).some((e) => /scratchpad/.test(e)),
    'a scratchpad out-dir is refused');
  assert(configErrors({ ...okCfg, models: ['haiku'] }).some((e) => /unknown model/.test(e)), 'haiku is refused');
  assert(configErrors({ ...okCfg, models: ['sonnet', 'gpt'] }).some((e) => /unknown model/.test(e)), 'an unknown model is refused');
  assert(configErrors({ ...okCfg, arms: ['baseline', 'rzor'] }).some((e) => /unknown arm/.test(e)),
    'a misspelt arm is refused instead of silently running as a second baseline');
  assert(configErrors({ ...okCfg, convs: ['grpc'] }).some((e) => /unknown conversation/.test(e)), 'an unknown conversation is refused');
  assert(configErrors({ ...okCfg, reps: NaN }).some((e) => /--reps/.test(e)), 'a non-numeric --reps is refused');
  assert(configErrors({ ...okCfg, reps: 0 }).some((e) => /--reps/.test(e)), '--reps 0 is refused');
  assert(configErrors({ ...okCfg, seed: NaN }).some((e) => /--seed/.test(e)), 'a non-numeric --seed is refused');
  assert(configErrors({ ...okCfg, out: OUT }).length === 0, 'this run\'s own out-dir passes the guard', OUT);
  assert(configErrors({ ...okCfg, razorDir: path.join(root, 'not-razor') }).some((e) => /not a razor plugin/.test(e)),
    'a wrong RAZOR_DIR is refused instead of running the razor arm as a second baseline');
  assert(configErrors({ ...okCfg, razorDir: path.join(root, 'not-razor'), arms: ['baseline'] }).length === 0,
    'RAZOR_DIR is only required when the razor arm is in the run');

  // The gate/ledger columns are read out of razor's own deny text. If razor
  // ever renames that prefix these regexes go quietly to zero, which is the
  // same failure that made the file-check zero meaningless before. Tie the
  // instrument to the product rather than to a string typed in this file.
  console.log('markers match razor\'s live source');
  for (const [f, marker] of [['file-meter.js', 'razor: '], ['import-guard.js', 'razor: '],
    ['manifest-guard.js', 'razor: '], ['dep-guard.js', 'razor: '], ['build-ledger.js', 'razor ledger:']]) {
    let src = '';
    try { src = fs.readFileSync(path.join(RAZOR_DIR, 'hooks', f), 'utf8'); } catch { /* reported below */ }
    assert(src.includes('`' + marker) || src.includes("'" + marker) || src.includes('"' + marker),
      'hooks/' + f + ' still emits "' + marker + '"');
  }

  console.log('a dead cell does not hang the queue');
  const savedClaude = CLAUDE; const savedShell = NEEDS_SHELL;
  CLAUDE = path.join(root, 'no-such-claude-binary'); NEEDS_SHELL = false;
  const deadDir = path.join(root, 'dead');
  fs.mkdirSync(deadDir, { recursive: true });
  const dead = await Promise.race([
    turn({ ws: deadDir, logDir: deadDir, arm: 'baseline', model: 'sonnet', prompt: 'x', tag: 'dead' }),
    new Promise((r) => setTimeout(() => r('HUNG'), 10000)),
  ]);
  CLAUDE = savedClaude; NEEDS_SHELL = savedShell;
  assert(dead !== 'HUNG' && dead.result === null && !!dead.spawnError,
    'a spawn failure resolves with no result instead of hanging or throwing', JSON.stringify(dead && dead.spawnError));

  console.log('razor provenance');
  const porc = parsePorcelain(' M hooks/dep-guard.js\nM  scripts/x.js\n?? new/thing.js\n\n');
  assert(JSON.stringify(porc) === JSON.stringify(['hooks/dep-guard.js', 'scripts/x.js', 'new/thing.js']),
    'porcelain paths survive the leading unstaged space', JSON.stringify(porc));
  assert(parsePorcelain('').length === 0, 'a clean tree parses to no files');
  const rev = razorRev();
  assert(rev.head !== 'unknown' && Array.isArray(rev.files),
    'razorRev reads the plugin dir it will actually load', rev.head);
  assert(rev.dirty === (rev.files.length > 0), 'dirty is true exactly when files are uncommitted',
    rev.head + (rev.dirty ? ' DIRTY: ' + rev.files.join(' ') : ' clean'));
  if (rev.dirty) {
    console.log('  note: razor is dirty right now — the run banner will say so and every row will'
      + ' carry razorDirty:true. Commit or stash before measuring a release.');
  }

  console.log('cell queue');
  const a = buildCells();
  const b = buildCells();
  assert(JSON.stringify(a) === JSON.stringify(b), 'the same seed replays the same order');
  assert(JSON.stringify(shuffle(a, SEED + 1)) !== JSON.stringify(a), 'a different seed reorders');
  const half = a.slice(0, Math.ceil(a.length / 2)).filter((c) => c[2] === 'razor').length;
  assert(arms.length < 2 || (half > 0 && half < Math.ceil(a.length / 2)),
    'both arms appear in the first half of the queue', 'razor cells in first half: ' + half);

  fs.rmSync(root, { recursive: true, force: true });
  if (bad) { console.log('\n' + bad + ' instrument(s) INVALID — do not run this probe'); process.exit(1); }
  console.log('\nall instruments valid');
}

(argv.includes('--selftest') ? selftest() : main()).catch((e) => {
  console.error(e);
  process.exit(1);
});
