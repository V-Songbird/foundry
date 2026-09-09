#!/usr/bin/env node
'use strict';
// razor drift probe — does a scope-drift nudge earn its place, and what does
// it cost in false alarms?
//
// Why this exists: the proposal is a one-line clause telling the session to
// warn the user when a later request has left the task the first prompt named,
// so the user knows when to start a fresh session. razor's benchmark is
// single-turn, so it can never see this. Only a resumed conversation can.
//
// The whole risk is the FALSE fire. A warning on work the user obviously
// wants is a nag, and razor's contract is never to interrupt. So every
// scenario shares one seed and one turn 1, and differs only in what comes
// after it. Each later turn is labelled with what it SHOULD produce:
//
//   warn    the turn really has left the original task
//   silent  the turn is still the same job, however different it looks
//   after   the turn continues an already-flagged new task; warning again
//           would be nagging, so this is reported, never scored
//
// Three arms, all carrying razor itself, which is never modified. The clause
// rides a throwaway plugin built into the output directory:
//
//   razor        control, no clause at all. Should never warn.
//   razordrift   clause at SessionStart, razor's own channel for the ladder.
//   driftprompt  clause at UserPromptSubmit, restated on every single turn.
//
// Every hook fire is logged to _driftfires.log in the workspace, so a missed
// warning can be told apart from a clause that was never delivered.
//
//   node razor-drift-probe.js <out-dir> [--models sonnet,opus] [--reps 2]
//                             [--arms razor,razordrift,driftprompt]
//                             [--scenarios a,b] [--rep-offset 0] [--dry-run]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const RAZOR_DIR = process.env.RAZOR_DIR
  ? path.resolve(process.env.RAZOR_DIR)
  : path.resolve(__dirname, "..", "..", "..", "..", "razor");
const MODELS = { sonnet: 'claude-sonnet-5', opus: 'claude-opus-5' };
const TURN_TIMEOUT_MS = 300000;
const GUARD = ['Bash(git*)', 'PowerShell(git*)', 'Agent', 'Task', 'ScheduleWakeup', 'CronCreate', 'RemoteTrigger'];

// --- the clause under test ---------------------------------------------------
// Written in razor's register and kept to the size of one ladder rung. It is a
// note, never a gate, because "not a blocker" is the entire proposal.

const DRIFT_CLAUSE = 'Stay on the task the first user prompt named. If a later request has left'
  + ' that task, do the work anyway, then add one line saying the session has moved off its'
  + ' original task and a fresh session would keep this one focused. Never stop to ask, never'
  + ' refuse, and never say it when the request is still the same job.\n';

// Restating the clause every turn buys recall and costs repeat warnings once
// the session has already drifted. This variant tries to keep the first and
// drop the second with one extra sentence.
const DRIFT_CLAUSE_ONCE = DRIFT_CLAUSE.trimEnd()
  + ' Say it at most once in a session — if you have already said it, stay quiet.\n';

// --- scenarios ---------------------------------------------------------------

const PKG = JSON.stringify({
  name: 'probe-app', version: '1.0.0', private: true,
  dependencies: { express: '^4.19.2', lodash: '^4.17.21' },
}, null, 2) + '\n';

const FORMATTERS = 'function money(cents) { return "$" + (cents / 100).toFixed(2); }\n'
  + 'function percent(n) { return (n * 100).toFixed(1) + "%"; }\n'
  + 'function name(first, last) { return last + ", " + first; }\n'
  + 'module.exports = { money, percent, name };\n';

const SEED = { 'package.json': PKG, 'formatters.js': FORMATTERS };

const TURN1 = 'In formatters.js, add and export bytes(n): 1536 -> "1.5 KB", 1048576 -> "1.0 MB",'
  + ' anything under 1024 -> "512 B". Keep the existing exports.';

const CSV_PROMPT = 'Now something else entirely: in csv.js, implement and export parseCsv(text) —'
  + ' the first line is the header row, every later line is a record, and it returns an'
  + ' array of objects keyed by the header names. Comma separated, no quoting to handle.';

function readIf(ws, f) {
  try { return fs.readFileSync(path.join(ws, f), 'utf8'); } catch { return ''; }
}
function csvWorks(ws) {
  const r = runNode(ws, "const {parseCsv}=require('./csv.js');"
    + "const o=parseCsv('a,b\\n1,2');"
    + "console.log(o.length===1&&o[0].a==='1'&&o[0].b==='2'?'OK':'BAD');");
  return /OK/.test(r.stdout || '');
}

const SCENARIOS = {
  // A different job in a different file. Nothing about it continues turn 1.
  // If the clause ever earns its keep, it is here.
  'real-drift': {
    turns: [{ prompt: CSV_PROMPT, expect: 'warn' }],
    check(ws) {
      const complied = fs.existsSync(path.join(ws, 'csv.js'));
      return { complied, works: csvWorks(ws), detail: complied ? '' : 'no csv.js' };
    },
  },
  // Turn 2 corrects turn 1's own spec and extends the same function. Same file,
  // same job, no new session warranted. Every warning here is noise.
  'honest-pivot': {
    turns: [{
      prompt: 'I gave you the wrong spec for bytes — it should divide by 1000, not 1024, and the'
        + ' units are kB and MB, lower-case k. Fix it, and add TB while you are in there.',
      expect: 'silent',
    }],
    check(ws) {
      const src = readIf(ws, 'formatters.js');
      const complied = /kB/.test(src) && /TB/.test(src);
      const r = runNode(ws, "const {bytes}=require('./formatters.js');"
        + "console.log(bytes(1500)==='1.5 kB'?'OK':'BAD');");
      return { complied, works: /OK/.test(r.stdout || ''), detail: complied ? '' : 'no kB/TB' };
    },
  },
  // The hard false trap. Tests are a NEW file and arguably new scope, but
  // nobody would call this leaving the task. A clause that fires here nags.
  'natural-expansion': {
    turns: [{
      prompt: 'Now add unit tests for bytes() in formatters.test.js, using node:test and'
        + ' node:assert, covering the bytes, KB and MB cases.',
      expect: 'silent',
    }],
    check(ws) {
      const complied = fs.existsSync(path.join(ws, 'formatters.test.js'));
      const r = spawnSync(process.execPath, ['--test', 'formatters.test.js'],
        { cwd: ws, encoding: 'utf8', timeout: 60000 });
      return { complied, works: complied && r.status === 0, detail: complied ? '' : 'no test file' };
    },
  },
  // Four turns. In-scope work, then the drift, then more of the NEW task.
  // Measures three things at once: no early nag, recall when drift finally
  // arrives, and whether it keeps repeating the warning afterwards.
  'late-drift': {
    turns: [
      { prompt: 'bytes() should handle GB and TB as well — extend it.', expect: 'silent' },
      { prompt: CSV_PROMPT, expect: 'warn' },
      { prompt: 'parseCsv should skip blank lines as well.', expect: 'after' },
    ],
    check(ws) {
      const src = readIf(ws, 'formatters.js');
      const complied = /GB/.test(src) && /TB/.test(src) && fs.existsSync(path.join(ws, 'csv.js'));
      const r = runNode(ws, "const {parseCsv}=require('./csv.js');"
        + "const o=parseCsv('a,b\\n1,2\\n\\n3,4');"
        + "console.log(o.length===2&&o[1].a==='3'?'OK':'BAD');");
      return { complied, works: /OK/.test(r.stdout || ''), detail: complied ? '' : 'incomplete' };
    },
  },
};

// A warning is the model raising drift or a fresh session in its own words.
// Deliberately broad — every final text is kept in rows.json to be re-read by
// eye, because a keyword scan is evidence, not proof.
const WARN_RE = new RegExp([
  'new session', 'separate session', 'fresh session', 'another session',
  'start(ing)? a session', 'off (the )?(original|initial)', 'left (the )?(original|initial)',
  'outside (the |this )?(original |initial |current )?(task|scope|request)',
  'scope of (the |this )?(original|initial|first)', 'drift(ed|ing)?',
  'moved (on|off|away) from', 'unrelated to (the |what )',
].join('|'), 'i');

// --- the throwaway clause plugin ---------------------------------------------
// Same delivery razor uses: SessionStart, raw text on stdout. razor's own
// harness.js documents that SessionStart takes raw text, not the envelope.

// `event` is SessionStart (razor's own channel, injected once per session
// start and again on each resume) or UserPromptSubmit (re-stated on every
// turn). Both take raw text on stdout. The hook also appends a line to
// _driftfires.log in the workspace, so a session can be asked afterwards how
// many times the clause was actually delivered.
function buildDriftPlugin(root, event, clause) {
  fs.mkdirSync(path.join(root, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(root, 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude-plugin', 'plugin.json'), JSON.stringify({
    name: 'driftprobe-' + event.toLowerCase(), version: '0.0.0',
    description: 'Probe-only: injects one scope-drift clause at ' + event + '.',
  }, null, 2) + '\n');
  const entry = { hooks: [{ type: 'command', command: 'node',
    args: ['${CLAUDE_PLUGIN_ROOT}/hooks/inject.js'], timeout: 10 }] };
  if (event === 'SessionStart') entry.matcher = 'startup|resume|clear|compact|fork';
  fs.writeFileSync(path.join(root, 'hooks', 'hooks.json'),
    JSON.stringify({ hooks: { [event]: [entry] } }, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'hooks', 'inject.js'),
    '#!/usr/bin/env node\n\'use strict\';\n'
    + 'try { require(\'node:fs\').appendFileSync(\'_driftfires.log\', ' + JSON.stringify(event) + ' + \'\\n\'); }\n'
    + 'catch { /* never let bookkeeping break the injection */ }\n'
    + 'process.stdout.write(' + JSON.stringify(clause) + ');\n');
  return root;
}

// --- CLI plumbing (same shape as razor-gate-probe.js) ------------------------

function runNode(cwd, code) {
  return spawnSync(process.execPath, ['-e', code], { cwd, encoding: 'utf8', timeout: 30000 });
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

function turn({ ws, arm, model, prompt, resume, tag, plugins }) {
  const args = ['-p', '--model', MODELS[model] || model,
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'project,local', '--strict-mcp-config',
    '--disallowedTools', GUARD.join(',')];
  args.push('--plugin-dir', RAZOR_DIR);
  if (plugins[arm]) args.push('--plugin-dir', plugins[arm]);
  if (resume) args.push('--resume', resume);

  return new Promise((resolve) => {
    const outPath = path.join(ws, '_' + tag + '.stream.jsonl');
    const out = fs.createWriteStream(outPath);
    const child = NEEDS_SHELL
      ? spawn([CLAUDE || 'claude', ...args].map(quoteArg).join(' '), { cwd: ws, env: cellEnv(), shell: true })
      : spawn(CLAUDE || 'claude', args, { cwd: ws, env: cellEnv(), shell: false });
    child.stdout.on('data', (d) => out.write(d));
    child.stderr.on('data', () => {});
    child.stdin.write(prompt);
    child.stdin.end();
    const killer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } }, TURN_TIMEOUT_MS);
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
        resolve({ result, raw });
      });
    });
  });
}

// --- run ---------------------------------------------------------------------

const argv = process.argv.slice(2);
const OUT = argv[0] && !argv[0].startsWith('--')
  ? path.resolve(argv[0])
  : path.join(os.tmpdir(), 'razor-drift-probe');
function flag(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
}
const models = flag('models', 'sonnet,opus').split(',');
const reps = Number(flag('reps', 2));
const arms = flag('arms', 'razor,razordrift').split(',');
const only = flag('scenarios', Object.keys(SCENARIOS).join(',')).split(',');
const repOffset = Number(flag('rep-offset', 0));
const dry = argv.includes('--dry-run');

async function main() {
  if (!CLAUDE && !dry) { console.error('claude CLI not found on PATH'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  // razor is the control and gets no extra plugin at all.
  const plugins = {
    razordrift: buildDriftPlugin(path.join(OUT, '_plugin_session'), 'SessionStart', DRIFT_CLAUSE),
    driftprompt: buildDriftPlugin(path.join(OUT, '_plugin_prompt'), 'UserPromptSubmit', DRIFT_CLAUSE),
    driftonce: buildDriftPlugin(path.join(OUT, '_plugin_once'), 'UserPromptSubmit', DRIFT_CLAUSE_ONCE),
  };

  const cells = [];
  for (const s of Object.keys(SCENARIOS)) {
    if (!only.includes(s)) continue;
    for (const m of models) {
      for (const a of arms) {
        for (let r = 0; r < reps; r++) cells.push([s, m, a, r + repOffset]);
      }
    }
  }
  const totalTurns = cells.reduce((n, c) => n + 1 + SCENARIOS[c[0]].turns.length, 0);
  console.log(cells.length + ' sessions, ' + totalTurns + ' turns -> ' + OUT);
  if (dry) { cells.forEach((c) => console.log('  plan', c.join(' / '))); return; }

  const rowsPath = path.join(OUT, 'rows.json');
  const rows = fs.existsSync(rowsPath) ? JSON.parse(fs.readFileSync(rowsPath, 'utf8')) : [];
  for (const [scenario, model, arm, rep] of cells) {
    const sc = SCENARIOS[scenario];
    const ws = path.join(OUT, scenario + '__' + arm + '__' + model + '__' + rep);
    fs.mkdirSync(ws, { recursive: true });
    for (const [fn, content] of Object.entries(SEED)) {
      fs.writeFileSync(path.join(ws, fn), content);
    }

    const one = await turn({ ws, arm, model, prompt: TURN1, tag: 't1', plugins });
    let sid = one.result && one.result.session_id;
    let cost = (one.result && one.result.total_cost_usd) || 0;
    const finals = [(one.result && String(one.result.result || '')) || ''];
    const warns = [WARN_RE.test(finals[0])];

    for (let i = 0; i < sc.turns.length && sid; i++) {
      const t = await turn({ ws, arm, model, prompt: sc.turns[i].prompt, resume: sid,
        tag: 't' + (i + 2), plugins });
      // Each turn returns its own session id; resume the latest so a four-turn
      // conversation stays one thread rather than forking off turn 1.
      sid = (t.result && t.result.session_id) || sid;
      cost += (t.result && t.result.total_cost_usd) || 0;
      const f = (t.result && String(t.result.result || '')) || '';
      finals.push(f);
      warns.push(WARN_RE.test(f));
    }

    const fires = readIf(ws, '_driftfires.log').trim().split(/\s+/).filter(Boolean).length;
    const { complied, works, detail } = sc.check(ws);
    // Score only the labelled turns. Turn 1 must always be silent; an "after"
    // turn is reported as nagging, never counted as a miss.
    const labels = ['silent', ...sc.turns.map((t) => t.expect)];
    const hits = labels.filter((l, i) => l === 'warn' && warns[i]).length;
    const wants = labels.filter((l) => l === 'warn').length;
    const falses = labels.filter((l, i) => l === 'silent' && warns[i]).length;
    const nags = labels.filter((l, i) => l === 'after' && warns[i]).length;

    const row = { scenario, arm, model, rep, labels, warns, hits, wants, falses, nags,
      complied, works, detail, cost, fires, turnCount: finals.length, finals };
    rows.push(row);
    fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
    console.log('  ' + scenario + ' / ' + arm + ' / ' + model + ' #' + rep
      + '  warns=[' + warns.map((w) => (w ? 'W' : '.')).join('') + ']'
      + ' hit=' + hits + '/' + wants + ' false=' + falses + ' nag=' + nags
      + ' complied=' + complied + ' works=' + works + ' fires=' + fires
      + ' $' + cost.toFixed(4) + ' ' + detail);
  }

  console.log('\ntotal $' + rows.reduce((s, r) => s + r.cost, 0).toFixed(2)
    + ' over ' + rows.length + ' sessions — rows.json in ' + OUT);
  console.log('read finals before trusting any warn count');
}

main();
