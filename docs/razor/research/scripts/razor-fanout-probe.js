#!/usr/bin/env node
'use strict';
// razor fan-out probe — what N subagents cost, and what they buy.
//
// razor injects its ladder at SubagentStart (razor/hooks/subagent-start.js),
// ~500 tokens PER SPAWNED AGENT. Every published razor number comes from a
// single-agent session, because the shipped harness bans subagents outright
// (benchmarks/razor/runner/run.js:75, GUARD_TOOLS = ['Agent','Task',...]).
// So nobody knows whether a 6-agent fan-out multiplies razor's benefit or
// multiplies its tax.
//
// THESE NUMBERS ARE NOT COMPARABLE WITH ANY PUBLISHED RAZOR FIGURE. The tool
// allowlist differs by construction: Agent/Task are ALLOWED here and banned
// in every shipped benchmark cell. Nothing here may be quoted next to a
// README table.
//
// Two facts from subagent-start.js shape the whole design, both re-read in
// the code below rather than trusted from memory:
//
//   1. DEFAULT_SKIP = ['explore','plan','claude-code-guide','statusline-setup',
//      'output-style-setup'] — the two types a headless session reaches for
//      most are skipped, so a naive fan-out test would measure a plugin that
//      deliberately did nothing. The task workspaces therefore ship their own
//      `implementer` agent type, which writes code and is not skipped, and the
//      probe re-asks razor's OWN shouldInject() which spawns it would inject
//      into. That call is a read-only require of razor's module.
//   2. Gate state is namespaced per subagent (harness.gateStateId ->
//      "<session>--<agent_id>"), so each subagent gets a FRESH file budget and
//      a FRESH deny ledger. Six agents can add six undeclared packages with
//      six separate one-time nudges. The probe points CLAUDE_PLUGIN_DATA at a
//      per-cell directory and counts the per-agent state files that appear.
//
// The preflight is the point. If razor's ladder never reaches a subagent
// context, the whole item dies for fifty cents and the grid is never run.
//
//   node razor-fanout-probe.js [out-dir] [--dry-run] [--selftest]
//                              [--full] [--models sonnet,opus] [--reps 3]
//                              [--arms baseline,razor] [--seed 12345]
//
// Default mode is the preflight alone. --full opts into the 24-session grid
// and still runs (or reuses) the preflight first, refusing the grid if it
// does not pass.

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const RAZOR_DIR = process.env.RAZOR_DIR
  ? path.resolve(process.env.RAZOR_DIR)
  : path.resolve(__dirname, "..", "..", "..", "..", "razor");
const MODELS = { sonnet: 'claude-sonnet-5', opus: 'claude-opus-5' };

// A fan-out session is 3-6x a single-agent one and runs its agents in
// parallel; five minutes is not enough.
const TURN_TIMEOUT_MS = 900000;

// Agent/Task are DELIBERATELY ABSENT — this probe exists to let them run.
// Everything else that could escape the workspace stays banned.
const GUARD = ['Bash(git*)', 'PowerShell(git*)', 'ScheduleWakeup', 'CronCreate', 'RemoteTrigger'];

// Run root: NOT os.tmpdir(). razor/hooks/file-meter.js:50 exempts anything
// under the temp dir (and any path containing "/scratchpad/") as scratch, so
// the new-file check has never been able to fire in any benchmark on record.
// It is also outside every git tree, so a bypassPermissions session cannot
// reach a real repository.
const DEFAULT_OUT = 'D:/razor-probe-runs/fanout';

// A phrase from razor's RULESET (razor/hooks/razor-lib.js) that cannot occur
// by chance and appears in NONE of this probe's own prompts — so finding it
// inside a subagent event is proof of injection, not an echo of the task.
const LADDER_LITERAL = 'stop at the first rung that holds and act on it without checking the rungs below';

// The behavioural backstop: each subagent is told to print one of these.
// "RAZOR ACTIVE" (the RULESET's first line) is what it is asked to look for,
// which is why the literal above is used for the textual scan instead.
const SELF_YES = 'CTX:RAZOR-YES';
const SELF_NO = 'CTX:RAZOR-NO';

// The question a subagent is asked must not itself contain any string the
// contamination detector counts, or PARENT-PASTED can never read 0 and the
// verdict is INCONCLUSIVE by construction. Two preflights were burned proving
// that: the old wording asked the subagent to look for "RAZOR ACTIVE", which
// the parent then had to relay verbatim into every Task prompt, which is
// exactly what line ~294 counts as contamination. So the ladder is described
// here, never quoted, and the trigger words never appear.
const SELF_REPORT_CLAUSE = 'Give every subagent you spawn this instruction verbatim, as the last line'
  + ' of its prompt: "When you are finished, print ' + SELF_YES + ' if your context contains a'
  + ' numbered checklist of rules about avoiding unnecessary code that did not come from this'
  + ' prompt, otherwise print ' + SELF_NO + '." Then repeat each subagent\'s CTX line in your own'
  + ' final message.'
  + ' CRITICAL: a Task prompt must contain ONLY the module contract and the CTX line above.'
  + ' Do NOT copy, quote, paraphrase or summarise any other instruction you were given'
  + ' — no checklists, no rules, no numbered guidance — into any subagent prompt. Each subagent'
  + ' must discover its own context on its own. Copying your instructions into a subagent'
  + ' prompt invalidates this run.';

// Every deny razor can emit starts with this marker.
const DENY_RE = /razor: [^"\\\n]{0,180}/g;

// Per-session price used only by --dry-run's estimate.
const EST = { sonnet: 0.50, opus: 0.90 };

// Hard ceiling. The grid stops the moment the next cell could cross it, so a
// runaway session cannot quietly spend past what was approved.
const DEFAULT_BUDGET = 25;

// --- the two tasks -----------------------------------------------------------

const PKG = JSON.stringify({
  name: 'fanout-probe', version: '1.0.0', private: true,
  dependencies: { express: '^4.19.2' },
}, null, 2) + '\n';

// A code-writing agent type that is NOT in razor's DEFAULT_SKIP, so the
// SubagentStart injection actually happens. No `tools: Task`, so a subagent
// cannot recurse and blow the budget.
const IMPLEMENTER_AGENT = [
  '---',
  'name: implementer',
  'description: Writes the implementation for one small self-contained module. Use for parallel per-file implementation work.',
  'tools: Read, Write, Edit, Glob, Grep',
  '---',
  '',
  'You implement exactly the one file you are given. Write the code, then stop.',
  '',
].join('\n');

function stub(name, spec) {
  return '// ' + spec + '\n'
    + 'function ' + name + '() {\n'
    + "  throw new Error('not implemented');\n"
    + '}\n'
    + 'module.exports = { ' + name + ' };\n';
}

const FIVE = {
  'lib/money.js': stub('money', 'money(cents): integer cents -> "$12.34" for 1234, "$0.05" for 5. Always two decimals.'),
  'lib/percent.js': stub('percent', 'percent(n): fraction -> "12.3%" for 0.1234. Always one decimal.'),
  'lib/bytes.js': stub('bytes', 'bytes(n): under 1024 -> "512 B"; under 1048576 -> "1.5 KB" (one decimal); else "1.0 MB" (one decimal).'),
  'lib/duration.js': stub('duration', 'duration(ms): whole seconds. Under 60s -> "5s". Otherwise "1m 5s" for 65000.'),
  'lib/slug.js': stub('slug', 'slug(s): lowercase, every run of non-alphanumeric characters becomes one "-", no leading or trailing "-". "Hello,  World!" -> "hello-world".'),
};

const NORMALIZE = '// normalize(name): the shared key used by every report module.\n'
  + 'function normalize(name) {\n'
  + '  return String(name).trim().toLowerCase();\n'
  + '}\n'
  + 'module.exports = { normalize };\n';

function caller(n) {
  return "const { normalize } = require('../lib/normalize.js');\n"
    + '\n'
    + '// Report ' + n + ' keys its records by name.\n'
    + 'function key(record) {\n'
    + '  return normalize(record);\n'
    + '}\n'
    + 'module.exports = { key };\n';
}

const CALLERS = ['a', 'b', 'c', 'd', 'e'];

function checkScript(ws, code) {
  const r = spawnSync(process.execPath, ['-e', code], { cwd: ws, encoding: 'utf8', timeout: 30000 });
  return String((r.stdout || '') + (r.stderr || ''));
}

const TASKS = {
  // Fan-out is GENUINELY the right call: five independent modules, no shared
  // state, nothing to coordinate.
  'fanout-right': {
    fanoutIsRight: true,
    seed: Object.assign({ 'package.json': PKG, '.claude/agents/implementer.md': IMPLEMENTER_AGENT }, FIVE),
    prompt: 'Implement all five formatter modules under lib/. Each stub names its exact contract in'
      + ' its comment. The five are independent of one another.\n\n'
      + 'Do this as a parallel fan-out: spawn one `implementer` subagent per module — five Task calls'
      + ' in a single message — and let each one write its own file. Do not write the modules yourself.'
      + ' If the `implementer` agent type is unavailable, use `general-purpose` instead.\n\n'
      + SELF_REPORT_CLAUSE,
    check(ws) {
      const out = checkScript(ws, 'try{'
        + "const a=require('./lib/money.js'),b=require('./lib/percent.js'),c=require('./lib/bytes.js'),"
        + "d=require('./lib/duration.js'),e=require('./lib/slug.js');"
        + "const cases=[['money',a.money(1234),'$12.34'],['money-small',a.money(5),'$0.05'],"
        + "['percent',b.percent(0.1234),'12.3%'],['bytes-b',c.bytes(512),'512 B'],"
        + "['bytes-k',c.bytes(1536),'1.5 KB'],['bytes-m',c.bytes(1048576),'1.0 MB'],"
        + "['dur-m',d.duration(65000),'1m 5s'],['dur-s',d.duration(5000),'5s'],"
        + "['slug',e.slug('Hello,  World!'),'hello-world']];"
        + "const bad=cases.filter(x=>String(x[1])!==x[2]).map(x=>x[0]+'='+x[1]);"
        + "console.log(bad.length?'BAD '+bad.join(','):'OK');"
        + "}catch(err){console.log('BAD load '+err.message);}");
      const ok = /(^|\n)OK/.test(out);
      // minimal is NOT scored here — five independent modules have no shared
      // fix to prefer. null, not true, so the summary cannot print a discipline
      // that was never measured.
      return { ok, minimal: null, detail: ok ? '5/5' : out.trim().split('\n').pop().slice(0, 90) };
    },
  },

  // Fan-out is OVER-ENGINEERING: one bug, in one shared helper, that five
  // callers merely pass through. razor's own doctrine — "one fix in the
  // shared function beats a guard in every caller" — is the minimal answer.
  'fanout-wrong': {
    fanoutIsRight: false,
    seed: (() => {
      const s = { 'package.json': PKG, '.claude/agents/implementer.md': IMPLEMENTER_AGENT, 'lib/normalize.js': NORMALIZE };
      for (const n of CALLERS) s['reports/' + n + '.js'] = caller(n);
      return s;
    })(),
    prompt: 'Every report module keys its records by name and the keys are wrong: "Ada  Lovelace"'
      + ' (two spaces) and "Ada Lovelace" must produce the same key. Internal runs of whitespace have'
      + ' to collapse to a single space. Fix it so all five report modules key correctly.\n\n'
      + 'Subagents are available: there is an `implementer` agent type, and you may spawn one per'
      + ' report file if you judge that to be the right call.\n\n'
      + SELF_REPORT_CLAUSE,
    check(ws) {
      const out = checkScript(ws, 'try{'
        + "const m=['a','b','c','d','e'].map(n=>require('./reports/'+n+'.js'));"
        + "const ok=m.every(x=>x.key('Ada  Lovelace')==='ada lovelace'&&x.key(' Ada Lovelace ')==='ada lovelace');"
        + "console.log(ok?'OK':'BAD keys');"
        + "}catch(err){console.log('BAD load '+err.message);}");
      const ok = /(^|\n)OK/.test(out);
      // The minimal fix is one line in the shared helper; every caller left
      // byte-identical is the discipline this task scores.
      const touched = CALLERS.filter((n) => {
        try {
          return fs.readFileSync(path.join(ws, 'reports', n + '.js'), 'utf8') !== caller(n);
        } catch { return true; }
      });
      return {
        ok,
        minimal: touched.length === 0,
        detail: (ok ? 'keys ok' : out.trim().split('\n').pop().slice(0, 60))
          + ', callers touched ' + touched.length + '/5',
      };
    },
  },
};

// --- instruments -------------------------------------------------------------

function countOf(hay, needle) {
  let n = 0;
  let i = hay.indexOf(needle);
  while (i >= 0) { n++; i = hay.indexOf(needle, i + needle.length); }
  return n;
}

// Flatten a tool_result's content, which is a string on some events and an
// array of blocks on others.
function blockText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((b) => (b && typeof b.text === 'string' ? b.text : '')).join('\n');
}

// Walk one stream-json transcript.
//
// `spawns`  — Task/Agent tool_use blocks, i.e. subagents the parent asked for.
// `subEvents` — events carrying parent_tool_use_id, i.e. turns that happened
//               INSIDE a subagent. Present only if the CLI nests them.
// `subLiteral` — the ladder's own text seen inside a subagent event. The
//               strongest evidence, and the one that may read zero purely
//               because the CLI does not surface subagent context.
// `mainLiteral` — the same text in the parent's own events; expected to be
//               non-zero on the razor arm from SessionStart alone, which is
//               exactly why it is counted SEPARATELY and never used as proof.
// `selfYes`/`selfNo` — the behavioural backstop, counted only in tool_result
//               blocks and subagent events, never in the Task input that
//               carries the instruction itself (that would count the question
//               as an answer).
// `taskInputLadder` — the contamination check. The parent runs with the ladder
//               in its own SessionStart context and can paste it into a Task
//               prompt by hand. If it did, a subagent's CTX:RAZOR-YES proves
//               the parent copied the text, NOT that SubagentStart injected it,
//               so a self-report-only PASS is downgraded when this is non-zero.
function scanStream(raw) {
  const s = {
    spawns: 0, subEvents: 0, subLiteral: 0, mainLiteral: 0,
    selfYes: 0, selfNo: 0, agentNames: [], taskInputLadder: 0,
  };
  for (const line of String(raw).split('\n')) {
    const t = line.trim();
    if (!t) continue;
    let ev;
    try { ev = JSON.parse(t); } catch { continue; }
    const isSub = ev.parent_tool_use_id !== undefined
      && ev.parent_tool_use_id !== null && ev.parent_tool_use_id !== '';
    if (isSub) s.subEvents++;
    const blocks = ev.message && Array.isArray(ev.message.content) ? ev.message.content : [];
    for (const b of blocks) {
      if (!b || typeof b !== 'object') continue;
      if (b.type === 'tool_use') {
        if (b.name === 'Task' || b.name === 'Agent') {
          s.spawns++;
          const type = b.input && (b.input.subagent_type || b.input.agent_type);
          if (type) s.agentNames.push(String(type));
          const inp = JSON.stringify(b.input || {});
          s.taskInputLadder += countOf(inp, LADDER_LITERAL) + countOf(inp, 'RAZOR ACTIVE');
        }
        continue; // never scan our own instruction text as an answer
      }
      const text = b.type === 'text' ? String(b.text || '')
        : b.type === 'tool_result' ? blockText(b.content)
          : '';
      if (!text) continue;
      if (b.type === 'tool_result' || isSub) {
        s.selfYes += countOf(text, SELF_YES);
        s.selfNo += countOf(text, SELF_NO);
      }
      if (isSub) s.subLiteral += countOf(text, LADDER_LITERAL);
      else s.mainLiteral += countOf(text, LADDER_LITERAL);
    }
  }
  return s;
}

// Every distinct razor deny reason in a transcript.
function denyStrings(raw) {
  const seen = [];
  for (const m of String(raw).match(DENY_RE) || []) {
    const clean = m.trim();
    if (!seen.includes(clean)) seen.push(clean);
  }
  return seen;
}

// Ground truth on which spawns razor WOULD inject into: the spy hook logs
// every agent_type SubagentStart saw, and razor's own shouldInject decides.
// Read-only use of the shipped module; razor is never modified by this probe.
let shouldInject;
try {
  ({ shouldInject } = require(path.join(RAZOR_DIR, 'hooks', 'subagent-start.js')));
} catch {
  shouldInject = null;
}

function spawnLog(ws) {
  try {
    return fs.readFileSync(path.join(ws, '_spawns.log'), 'utf8')
      .split('\n').map((l) => l.trim()).filter(Boolean);
  } catch { return []; }
}

// The replay MUST use the same environment the cell ran under — cellEnv()
// strips RAZOR_*, so asking razor with process.env would let a RAZOR_AGENT_SKIP
// in the operator's own shell answer for a cell that never saw it.
function injectable(types) {
  if (!shouldInject) return { injected: 0, skipped: types.length, types };
  const env = cellEnv();
  let injected = 0;
  for (const t of types) if (shouldInject(t, env)) injected++;
  return { injected, skipped: types.length - injected, types };
}

// Per-subagent gate state. harness.gateStateId() namespaces a subagent's file
// budget and deny ledger as "<session>--<agent_id>", so a file named with a
// "--" is one subagent that got its own fresh budget.
function gateState(dir) {
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => /^razor-.*\.json$/.test(n)); } catch { /* none */ }
  return { total: names.length, perAgent: names.filter((n) => n.includes('--')).length };
}

// Non-empty lines of JavaScript the session is responsible for.
function countLoc(ws, seed) {
  const seedNames = new Set(Object.keys(seed || {}).map((f) => f.replace(/\\/g, '/')));
  let total = 0;
  let fresh = 0;
  const walk = (dir, rel) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.name === 'node_modules' || e.name === '.claude' || e.name.startsWith('_')) continue;
      if (e.isDirectory()) { walk(path.join(dir, e.name), r); continue; }
      if (!/\.js$/.test(e.name)) continue;
      let lines = 0;
      try {
        lines = fs.readFileSync(path.join(dir, e.name), 'utf8').split('\n').filter((l) => l.trim()).length;
      } catch { continue; }
      total += lines;
      if (!seedNames.has(r)) fresh += lines;
    }
  };
  walk(ws, '');
  const seedLines = Object.entries(seed || {})
    .filter(([f]) => /\.js$/.test(f) && !f.startsWith('.claude'))
    .reduce((n, [, c]) => n + c.split('\n').filter((l) => l.trim()).length, 0);
  return { locTotal: total, locNew: fresh, locDelta: total - seedLines };
}

// The preflight's whole answer, as a pure function of its measurements.
//   DEAD          razor claims to inject into these agents and the ladder is
//                 nowhere in a subagent context. The item dies for $0.50.
//   INCONCLUSIVE  no fan-out happened, no agent type was observed at all, every
//                 spawned type is on razor's skip list, or the only evidence is
//                 a self-report the parent could have planted — the prompt or
//                 the instrument failed, not razor.
//   PASS          the ladder demonstrably reached a subagent.
function verdict({ spawns, typesSeen, injectableCount, subLiteral, selfYes, taskInputLadder }) {
  if (spawns === 0) {
    return { code: 'INCONCLUSIVE', reason: 'NO SUBAGENTS WERE SPAWNED — THE PROMPT FAILED TO FORCE A FAN-OUT' };
  }
  // Without a type, "razor would have skipped them all" is a guess. Say so
  // rather than blaming the skip list for a hook that never ran.
  if (!typesSeen) {
    return { code: 'INCONCLUSIVE', reason: 'SUBAGENTS RAN BUT NO AGENT TYPE WAS OBSERVED — THE SPY HOOK NEVER FIRED, SO INJECTION CANNOT BE RULED IN OR OUT' };
  }
  if (injectableCount === 0) {
    return { code: 'INCONCLUSIVE', reason: 'EVERY SPAWNED AGENT TYPE IS ON RAZOR\'S SKIP LIST — RETUNE THE PROMPT' };
  }
  if (subLiteral === 0 && selfYes === 0) {
    return { code: 'DEAD', reason: 'THE LADDER NEVER REACHED A SUBAGENT CONTEXT — THIS ITEM IS DEAD' };
  }
  if (subLiteral === 0 && taskInputLadder > 0) {
    return { code: 'INCONCLUSIVE', reason: 'CONTAMINATED — THE ONLY EVIDENCE IS A SELF-REPORT AND THE PARENT PASTED RAZOR\'S OWN TEXT INTO THE TASK PROMPT' };
  }
  return { code: 'PASS', reason: 'THE LADDER REACHED A SUBAGENT CONTEXT' };
}

// --- CLI plumbing (same shape as razor-gate-probe.js) ------------------------

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

function cellEnv(extra) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(RAZOR_|HUSH_)/.test(k)) continue;
    env[k] = v;
  }
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return Object.assign(env, extra || {});
}

// A probe-only plugin carrying ONE SubagentStart hook that injects nothing and
// logs the agent_type it saw. Loaded on BOTH arms so its cost is symmetric.
// It is the only way to know which agent types were actually spawned when the
// CLI does not surface a subagent's own turns.
function buildSpyPlugin(root) {
  fs.mkdirSync(path.join(root, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(root, 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude-plugin', 'plugin.json'), JSON.stringify({
    name: 'fanout-spy', version: '0.0.0',
    description: 'Probe-only: records each spawned agent_type. Injects nothing.',
  }, null, 2) + '\n');
  // command is the ABSOLUTE node binary: node is not on PATH on this machine
  // (fnm registers it per shell), and a spy hook that silently fails to start
  // reads as "razor skipped every agent", which is a confident wrong answer.
  fs.writeFileSync(path.join(root, 'hooks', 'hooks.json'), JSON.stringify({
    hooks: {
      SubagentStart: [{ hooks: [{ type: 'command', command: process.execPath, args: ['${CLAUDE_PLUGIN_ROOT}/hooks/spy.js'], timeout: 10 }] }],
    },
  }, null, 2) + '\n');
  // The log path comes from the env, not from cwd: a hook's working directory
  // is the host's business, and a log written somewhere else is a zero.
  fs.writeFileSync(path.join(root, 'hooks', 'spy.js'),
    '#!/usr/bin/env node\n\'use strict\';\n'
    + "const fs = require('node:fs'), p = require('node:path');\n"
    + 'let d = {};\n'
    + "try { d = JSON.parse(fs.readFileSync(0, 'utf-8') || '{}'); } catch { d = {}; }\n"
    + "const dest = process.env.FANOUT_SPY_LOG || p.join(d.cwd || process.cwd(), '_spawns.log');\n"
    + "try { fs.appendFileSync(dest, String(d.agent_type || 'unknown') + '\\n'); }\n"
    + 'catch { /* never let bookkeeping break a cell */ }\n');
  return root;
}

// One headless turn. Returns the CLI's own result event plus the raw stream.
function turn({ ws, arm, model, prompt, plugins, tag, dataDir }) {
  const args = ['-p', '--model', MODELS[model] || model,
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'project,local', '--strict-mcp-config',
    '--disallowedTools', GUARD.join(',')];
  for (const p of plugins) args.push('--plugin-dir', p);

  return new Promise((resolve) => {
    const outPath = path.join(ws, `_${tag}.stream.jsonl`);
    const out = fs.createWriteStream(outPath);
    const env = cellEnv({
      CLAUDE_PLUGIN_DATA: dataDir,
      FANOUT_SPY_LOG: path.join(ws, '_spawns.log'),
    });
    const started = Date.now();
    let done = false;
    const finish = (killed) => {
      if (done) return;
      done = true;
      out.end();
      out.on('finish', () => {
        let raw = '';
        try { raw = fs.readFileSync(outPath, 'utf8'); } catch { raw = ''; }
        let result = null;
        for (const line of raw.split('\n')) {
          const t = line.trim();
          if (!t) continue;
          try { const ev = JSON.parse(t); if (ev.type === 'result') result = ev; } catch { /* partial */ }
        }
        resolve({ result, raw, wallMs: Date.now() - started, killed: !!killed });
      });
    };
    const child = NEEDS_SHELL
      ? spawn([CLAUDE || 'claude', ...args].map(quoteArg).join(' '), { cwd: ws, env, shell: true })
      : spawn(CLAUDE || 'claude', args, { cwd: ws, env, shell: false });
    child.stdout.on('data', (d) => out.write(d));
    child.stderr.on('data', () => {});
    // A dead stdin (EPIPE) or a failed spawn must resolve the cell, never throw
    // out of the promise and hang the whole run on a half-finished grid.
    child.on('error', () => finish(false));
    child.stdin.on('error', () => {});
    try { child.stdin.write(prompt); child.stdin.end(); } catch { /* handled above */ }
    const killer = setTimeout(() => {
      // shell:true means `child` is cmd.exe, not claude — killing it leaves the
      // real session running and still billing. Take the whole tree.
      if (process.platform === 'win32' && child.pid) {
        try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* gone */ }
      }
      try { child.kill('SIGKILL'); } catch { /* gone */ }
      setTimeout(() => finish(true), 2000);
    }, TURN_TIMEOUT_MS);
    child.on('close', () => { clearTimeout(killer); finish(false); });
  });
}

// --- run ---------------------------------------------------------------------

const argv = process.argv.slice(2);
const OUT = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : path.resolve(DEFAULT_OUT);
function flag(name, dflt) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
}
const models = flag('models', 'sonnet,opus').split(',').map((s) => s.trim()).filter(Boolean);
const reps = Number(flag('reps', 3));
const arms = flag('arms', 'baseline,razor').split(',').map((s) => s.trim()).filter(Boolean);
const seed = Number(flag('seed', (Date.now() % 100000)));
const budget = Number(flag('budget', DEFAULT_BUDGET));
const dry = argv.includes('--dry-run');
const full = argv.includes('--full');

// Validate before anything can spawn. An unknown --models value would be passed
// through to --model verbatim and spend a session on a name the API rejects,
// and Haiku is retired as a test model by standing house rule.
function bail(msg) { console.error(msg); process.exit(2); }
for (const m of models) if (!MODELS[m]) bail(`unknown model "${m}" — only ${Object.keys(MODELS).join(', ')} are allowed here`);
for (const a of arms) if (a !== 'baseline' && a !== 'razor') bail(`unknown arm "${a}" — only baseline, razor`);
if (!models.length || !arms.length) bail('--models and --arms cannot be empty');
if (!Number.isInteger(reps) || reps < 1) bail(`--reps must be a positive integer, got "${flag('reps', 3)}"`);
if (!Number.isFinite(seed)) bail(`--seed must be a number, got "${flag('seed', '')}"`);
if (!Number.isFinite(budget) || budget <= 0) bail(`--budget must be a positive number of dollars, got "${flag('budget', '')}"`);

// mulberry32 — a seeded shuffle so the arms interleave the same way twice.
function rng(s) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, s) {
  const r = rng(s);
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildCells() {
  const cells = [];
  for (const task of Object.keys(TASKS)) {
    for (const model of models) for (const arm of arms) for (let rep = 0; rep < reps; rep++) {
      cells.push({ task, arm, model, rep });
    }
  }
  return shuffle(cells, seed);
}

function estimate(cells) {
  return cells.reduce((n, c) => n + (EST[c.model] || 0.9), 0);
}

function seedWorkspace(ws, task) {
  // A rerun into the same out-dir MUST start clean: leftover lib/*.js from a
  // previous cell would score as this cell's answer, and a leftover
  // _spawns.log would be appended to, doubling the spawn count.
  fs.rmSync(ws, { recursive: true, force: true });
  fs.mkdirSync(ws, { recursive: true });
  for (const [fn, content] of Object.entries(TASKS[task].seed)) {
    const dest = path.join(ws, fn);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

// One measured session, fully scored.
async function runCell({ task, arm, model, rep, spyDir, label }) {
  const t = TASKS[task];
  const ws = path.join(OUT, label);
  seedWorkspace(ws, task);
  const dataDir = path.join(ws, '_razorstate');
  fs.mkdirSync(dataDir, { recursive: true });

  const plugins = [spyDir];
  if (arm === 'razor') plugins.push(RAZOR_DIR);

  const r = await turn({ ws, arm, model, prompt: t.prompt, plugins, tag: 'main', dataDir });
  const raw = r.raw;
  const s = scanStream(raw);
  // The spy hook is the primary source of agent types; the parent's own Task
  // inputs are the fallback, so a hook that never fired degrades to a weaker
  // instrument instead of silently reading "razor skipped everything".
  const logged = spawnLog(ws);
  const types = logged.length ? logged : s.agentNames;
  const inj = injectable(types);
  const denials = (r.result && (r.result.permission_denials || []).length) || 0;
  const state = gateState(dataDir);
  const loc = countLoc(ws, t.seed);
  const { ok, minimal, detail } = t.check(ws);
  const usage = (r.result && r.result.usage) || {};

  return Object.assign({
    task, arm, model, rep, label,
    // A cell the CLI never finished has no cost event: it is a $0.00 row that
    // is NOT a cheap success. Never average a row with completed === false.
    completed: !!r.result,
    killed: !!r.killed,
    cost: (r.result && r.result.total_cost_usd) || 0,
    numTurns: (r.result && r.result.num_turns) || 0,
    wallMs: r.wallMs,
    denials,
    razorText: /razor: /.test(raw),
    denyStrings: denyStrings(raw),
    spawns: s.spawns,
    spawnTypesLogged: logged,
    spawnTypesSeen: types,
    agentNamesFromStream: s.agentNames,
    taskInputLadder: s.taskInputLadder,
    ladderWouldInject: inj.injected,
    ladderWouldSkip: inj.skipped,
    subEvents: s.subEvents,
    subLiteral: s.subLiteral,
    mainLiteral: s.mainLiteral,
    selfYes: s.selfYes,
    selfNo: s.selfNo,
    gateStateFiles: state.total,
    gateStatePerAgent: state.perAgent,
    outputTokens: usage.output_tokens || 0,
    correct: ok,
    minimal,
    detail,
    fanoutIsRight: t.fanoutIsRight,
  }, loc);
}

function saveRows(name, rows) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(rows, null, 2));
}

function line(row, running) {
  return `  ${row.task} / ${row.arm} / ${row.model} #${row.rep}`
    + (row.completed ? '' : row.killed ? '  [KILLED ON TIMEOUT — NOT A RESULT]' : '  [NO RESULT EVENT — NOT A RESULT]')
    + `  spawns=${row.spawns} inject=${row.ladderWouldInject}/${row.spawnTypesSeen.length}`
    + (row.spawnTypesLogged.length ? '' : '(no spy log)')
    + ` sub=${row.subEvents} lit=${row.subLiteral} self=${row.selfYes}/${row.selfNo}`
    + (row.taskInputLadder ? ` PARENT-PASTED=${row.taskInputLadder}` : '')
    + ` state=${row.gateStatePerAgent}/${row.gateStateFiles} denials=${row.denials}`
    + ` loc=${row.locTotal}(+${row.locNew}) correct=${row.correct}`
    + ` minimal=${row.minimal === null ? 'n/a' : row.minimal}`
    + ` turns=${row.numTurns} ${(row.wallMs / 1000).toFixed(0)}s $${row.cost.toFixed(4)}`
    + ` | running $${running.toFixed(4)} | ${row.detail}`;
}

async function preflight(spyDir) {
  const existing = path.join(OUT, 'preflight.json');
  if (fs.existsSync(existing)) {
    try {
      const prev = JSON.parse(fs.readFileSync(existing, 'utf8'));
      if (prev && prev.verdict && prev.verdict.code === 'PASS') {
        console.log('preflight already passed in this out-dir — reusing it, no spend on this invocation');
        return Object.assign({}, prev, { reused: true });
      }
    } catch { /* rerun it */ }
  }
  console.log('--- preflight: one Sonnet razor session, ~$0.50 ---');
  const row = await runCell({
    task: 'fanout-right', arm: 'razor', model: 'sonnet', rep: 0,
    spyDir, label: 'preflight__fanout-right__razor__sonnet',
  });
  console.log(line(row, row.cost));
  const v = verdict({
    spawns: Math.max(row.spawns, row.spawnTypesSeen.length),
    typesSeen: row.spawnTypesSeen.length,
    injectableCount: row.ladderWouldInject,
    subLiteral: row.subLiteral,
    selfYes: row.selfYes,
    taskInputLadder: row.taskInputLadder,
  });
  const out = { verdict: v, row };
  saveRows('preflight.json', out);
  console.log('');
  console.log('  agent types seen: ' + (row.spawnTypesSeen.join(', ') || '(none)')
    + (row.spawnTypesLogged.length ? ' (spy hook)' : ' (from Task inputs — the spy hook never fired)'));
  console.log('  ladder literal in subagent events: ' + row.subLiteral
    + '   (in the parent session: ' + row.mainLiteral + ', which proves nothing)');
  console.log('  subagent self-reports: ' + row.selfYes + ' yes / ' + row.selfNo + ' no'
    + (row.taskInputLadder ? '   [the parent pasted razor text into ' + row.taskInputLadder + ' Task input(s) — self-reports are contaminated]' : ''));
  console.log('');
  console.log(v.code + ': ' + v.reason);
  return out;
}

async function main() {
  if (argv.includes('--selftest')) return selftest();

  const cells = buildCells();
  const est = estimate(cells);

  if (dry) {
    console.log('out-dir       ' + OUT + '   (deliberately NOT os.tmpdir(): file-meter.js:50 exempts it)');
    console.log('mode          ' + (full ? 'preflight + full grid' : 'preflight only (pass --full for the grid)'));
    console.log('seed          ' + seed + '   (replay with --seed ' + seed + ')');
    console.log('grid          ' + arms.length + ' arms x ' + Object.keys(TASKS).length + ' tasks x '
      + reps + ' reps x ' + models.length + ' models = ' + cells.length + ' sessions');
    console.log('arms          ' + arms.join(', '));
    console.log('models        ' + models.map((m) => m + ' -> ' + (MODELS[m] || m)).join(', '));
    console.log('tasks         ' + Object.keys(TASKS).join(', '));
    console.log('Agent/Task    ALLOWED (banned in every shipped benchmark — numbers are NOT comparable)');
    console.log('');
    console.log('  preflight  fanout-right / razor / sonnet #0   ~$' + EST.sonnet.toFixed(2));
    if (full) cells.forEach((c, i) => console.log('  cell ' + String(i + 1).padStart(2)
      + '  ' + c.task + ' / ' + c.arm + ' / ' + c.model + ' #' + c.rep
      + '   ~$' + (EST[c.model] || 0.9).toFixed(2)));
    console.log('');
    console.log('estimate      preflight $' + EST.sonnet.toFixed(2)
      + (full ? ' + grid $' + est.toFixed(2) + ' = $' + (est + EST.sonnet).toFixed(2) : ' (grid not requested)'));
    console.log('hard stop     $' + budget.toFixed(2) + ' (--budget N) — the grid halts before any cell that would cross it');
    console.log('\n(--dry-run: nothing was spawned, nothing was spent)');
    return;
  }

  if (!CLAUDE) { console.error('claude CLI not found on PATH'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });

  // Keep the run out of the real Claude state directory (parent repo helper).
  try { require(path.resolve(__dirname, "..", "..", "..", "..", "benchmarks", "bench-config-dir.js")); } catch {
    console.log('note: bench-config-dir unavailable — this run will write to the real ~/.claude');
  }

  const spyDir = buildSpyPlugin(path.join(OUT, '_spy-plugin'));
  const pre = await preflight(spyDir);
  if (pre.verdict.code !== 'PASS') {
    console.log('\nnot running the grid. rows in ' + OUT);
    process.exit(1);
  }
  if (!full) {
    console.log('\npreflight passed. Re-run with --full to buy the ' + cells.length + '-session grid (~$'
      + est.toFixed(2) + ').');
    return;
  }

  console.log('\n--- grid: ' + cells.length + ' sessions, seed ' + seed + ', est $' + est.toFixed(2)
    + ', hard stop at $' + budget.toFixed(2) + ' (--budget) ---');
  const rows = [];
  let running = pre.reused ? 0 : pre.row.cost;
  let stopped = null;
  for (const c of cells) {
    // Stop BEFORE buying a cell that could cross the ceiling, not after.
    if (running + (EST[c.model] || 0.9) > budget) {
      stopped = 'budget';
      console.log('\nSTOPPING: $' + running.toFixed(4) + ' spent, next cell (~$'
        + (EST[c.model] || 0.9).toFixed(2) + ') would cross the $' + budget.toFixed(2)
        + ' ceiling. ' + rows.length + ' of ' + cells.length + ' cells run. Raise --budget to continue.');
      break;
    }
    const row = await runCell(Object.assign({}, c, {
      spyDir, label: [c.task, c.arm, c.model, c.rep].join('__'),
    }));
    rows.push(row);
    running += row.cost;
    saveRows('rows.json', rows);
    console.log(line(row, running));
  }

  console.log('\n--- summary (unfinished sessions excluded from every average) ---');
  for (const task of Object.keys(TASKS)) {
    const scoresMinimal = TASKS[task].fanoutIsRight === false;
    for (const model of models) for (const arm of arms) {
      const all = rows.filter((r) => r.task === task && r.model === model && r.arm === arm);
      const c = all.filter((r) => r.completed);
      if (!all.length) continue;
      if (!c.length) {
        console.log(task.padEnd(13) + ' ' + arm.padEnd(9) + ' ' + model.padEnd(7)
          + '  NO COMPLETED SESSIONS (' + all.length + ' unfinished) — nothing to report');
        continue;
      }
      const avg = (f) => (c.reduce((s, r) => s + f(r), 0) / c.length);
      console.log(task.padEnd(13) + ' ' + arm.padEnd(9) + ' ' + model.padEnd(7)
        + ' spawns ' + avg((r) => r.spawns).toFixed(1)
        + '  injected ' + avg((r) => r.ladderWouldInject).toFixed(1)
        + '  perAgentState ' + avg((r) => r.gateStatePerAgent).toFixed(1)
        + '  loc ' + avg((r) => r.locTotal).toFixed(0)
        + '  correct ' + c.filter((r) => r.correct).length + '/' + c.length
        + '  minimal ' + (scoresMinimal ? c.filter((r) => r.minimal === true).length + '/' + c.length : 'n/a')
        + '  denials ' + avg((r) => r.denials).toFixed(1)
        + '  $' + avg((r) => r.cost).toFixed(4) + '/session'
        + (all.length > c.length ? '   [' + (all.length - c.length) + ' unfinished, excluded]' : ''));
    }
  }
  const unfinished = rows.filter((r) => !r.completed).length;
  if (unfinished) console.log('\nWARNING: ' + unfinished + ' of ' + rows.length + ' cells never returned a result event. Their $0.00 is missing spend, not a saving.');
  if (stopped) console.log('WARNING: the grid stopped early on --budget. It is NOT the full ' + cells.length + '-cell design.');
  console.log('\ntotal $' + running.toFixed(4)
    + (pre.reused ? ' (a previously-paid preflight is NOT counted)' : ' (preflight included)')
    + ' over ' + (rows.length + (pre.reused ? 0 : 1)) + ' sessions bought in this run');
  console.log('rows.json + preflight.json in ' + OUT);
  console.log('NOT COMPARABLE with any published razor figure: Agent/Task are allowed here.');
}

// --- selftest: prove every instrument with zero API spend ---------------------

function assert(cond, msg) {
  if (!cond) { console.error('SELFTEST FAILED: ' + msg); process.exit(1); }
  console.log('  ok  ' + msg);
}

function tmpWs(name) {
  const dir = path.join(OUT, '_selftest', name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeAll(ws, files) {
  for (const [f, c] of Object.entries(files)) {
    const dest = path.join(ws, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, c);
  }
}

const GOOD_FIVE = {
  'lib/money.js': 'function money(c){return "$"+(c/100).toFixed(2);}\nmodule.exports={money};\n',
  'lib/percent.js': 'function percent(n){return (n*100).toFixed(1)+"%";}\nmodule.exports={percent};\n',
  'lib/bytes.js': 'function bytes(n){if(n<1024)return n+" B";if(n<1048576)return (n/1024).toFixed(1)+" KB";return (n/1048576).toFixed(1)+" MB";}\nmodule.exports={bytes};\n',
  'lib/duration.js': 'function duration(ms){const s=Math.floor(ms/1000);return s<60?s+"s":Math.floor(s/60)+"m "+(s%60)+"s";}\nmodule.exports={duration};\n',
  'lib/slug.js': 'function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}\nmodule.exports={slug};\n',
};

const GOOD_NORMALIZE = '// normalize(name)\nfunction normalize(name){return String(name).trim().replace(/\\s+/g," ").toLowerCase();}\nmodule.exports={normalize};\n';

// A hand-written stream-json transcript: two Task spawns, one nested subagent
// event carrying the ladder, three subagent reports (2 yes, 1 no), one parent
// text block carrying the ladder (which must NOT count as subagent evidence),
// and one razor deny.
function goodStream() {
  const ev = [
    { type: 'assistant', parent_tool_use_id: null, message: { content: [{ type: 'text', text: 'context said: ' + LADDER_LITERAL }] } },
    { type: 'assistant', parent_tool_use_id: null, message: { content: [
      { type: 'tool_use', name: 'Task', input: { subagent_type: 'implementer', prompt: 'print ' + SELF_YES + ' or ' + SELF_NO } },
      { type: 'tool_use', name: 'Task', input: { subagent_type: 'implementer', prompt: 'print ' + SELF_YES + ' or ' + SELF_NO } },
    ] } },
    { type: 'assistant', parent_tool_use_id: 'toolu_1', message: { content: [{ type: 'text', text: 'my instructions include: ' + LADDER_LITERAL }] } },
    { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: 'done. ' + SELF_YES }] }] } },
    { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', content: 'done. ' + SELF_YES }] } },
    { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', content: 'done. ' + SELF_NO }] } },
    { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', content: "razor: new file #5 this turn (budget 4). Reuse an existing file." }] } },
    { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', content: "razor: 'left-pad' adds a new npm dependency. Use the stdlib." }] } },
    { type: 'result', total_cost_usd: 0.5, num_turns: 9, session_id: 'x' },
  ];
  return ev.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

// The contamination case: no nested subagent event at all, a self-report that
// says YES, and a parent that pasted razor's own words into the Task prompt.
// Evidence-wise this is indistinguishable from the parent doing razor's job.
function contaminatedStream() {
  const ev = [
    { type: 'assistant', parent_tool_use_id: null, message: { content: [
      { type: 'tool_use', name: 'Task', input: { subagent_type: 'implementer', prompt: 'You are RAZOR ACTIVE. ' + LADDER_LITERAL + ' Now print ' + SELF_YES + ' or ' + SELF_NO } },
    ] } },
    { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'tool_result', content: 'done. ' + SELF_YES }] } },
    { type: 'result', total_cost_usd: 0.4, num_turns: 4, session_id: 'z' },
  ];
  return ev.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

function badStream() {
  const ev = [
    { type: 'assistant', parent_tool_use_id: null, message: { content: [{ type: 'text', text: 'I wrote all five files myself.' }] } },
    { type: 'result', total_cost_usd: 0.2, num_turns: 3, session_id: 'y' },
  ];
  return ev.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

function selftest() {
  console.log('razor-fanout-probe selftest — no API spend\n');

  // 1. fanout-right scorer
  let ws = tmpWs('right-good');
  writeAll(ws, Object.assign({}, TASKS['fanout-right'].seed, GOOD_FIVE));
  let r = TASKS['fanout-right'].check(ws);
  assert(r.ok === true, 'fanout-right scorer PASSES a correct five-module answer (' + r.detail + ')');
  assert(r.minimal === null, 'fanout-right reports minimal=null, never a hardcoded true the summary could print as a win');

  ws = tmpWs('right-bad');
  writeAll(ws, Object.assign({}, TASKS['fanout-right'].seed, GOOD_FIVE, {
    'lib/percent.js': 'function percent(n){return n+"%";}\nmodule.exports={percent};\n',
  }));
  r = TASKS['fanout-right'].check(ws);
  assert(r.ok === false && /percent/.test(r.detail), 'fanout-right scorer FAILS a wrong percent (' + r.detail + ')');

  ws = tmpWs('right-unimpl');
  writeAll(ws, TASKS['fanout-right'].seed);
  r = TASKS['fanout-right'].check(ws);
  assert(r.ok === false, 'fanout-right scorer FAILS the untouched seed');

  // 2. fanout-wrong scorer — behaviour and minimality are scored separately
  ws = tmpWs('wrong-good');
  writeAll(ws, Object.assign({}, TASKS['fanout-wrong'].seed, { 'lib/normalize.js': GOOD_NORMALIZE }));
  r = TASKS['fanout-wrong'].check(ws);
  assert(r.ok === true && r.minimal === true, 'fanout-wrong scorer PASSES the one-line shared fix, minimal=true (' + r.detail + ')');

  ws = tmpWs('wrong-sprawl');
  const sprawl = { 'lib/normalize.js': NORMALIZE };
  for (const n of CALLERS) {
    sprawl['reports/' + n + '.js'] = "const { normalize } = require('../lib/normalize.js');\n"
      + 'function key(record){return normalize(String(record).replace(/\\s+/g," "));}\n'
      + 'module.exports = { key };\n';
  }
  writeAll(ws, Object.assign({}, TASKS['fanout-wrong'].seed, sprawl));
  r = TASKS['fanout-wrong'].check(ws);
  assert(r.ok === true && r.minimal === false, 'fanout-wrong scorer PASSES behaviour but marks the 5-caller sprawl minimal=false (' + r.detail + ')');

  ws = tmpWs('wrong-bad');
  writeAll(ws, TASKS['fanout-wrong'].seed);
  r = TASKS['fanout-wrong'].check(ws);
  assert(r.ok === false, 'fanout-wrong scorer FAILS the untouched seed (' + r.detail + ')');

  // 3. stream scanner
  const g = scanStream(goodStream());
  assert(g.spawns === 2, 'scanStream counts 2 Task spawns (got ' + g.spawns + ')');
  assert(g.agentNames.join(',') === 'implementer,implementer', 'scanStream records the spawned agent types');
  assert(g.subEvents === 1 && g.subLiteral === 1, 'scanStream finds the ladder inside a subagent event (sub=' + g.subEvents + ' lit=' + g.subLiteral + ')');
  assert(g.mainLiteral === 1, 'scanStream counts the parent-session ladder SEPARATELY, never as proof (main=' + g.mainLiteral + ')');
  assert(g.selfYes === 2 && g.selfNo === 1, 'scanStream counts self-reports from tool_results only, not the Task input that asks for them (' + g.selfYes + '/' + g.selfNo + ')');
  assert(g.taskInputLadder === 0, 'scanStream reports taskInputLadder=0 when the parent pasted nothing of razor into a Task prompt');
  const b = scanStream(badStream());
  assert(b.spawns === 0 && b.subLiteral === 0 && b.selfYes === 0, 'scanStream reads all zeros on a no-fan-out transcript');
  const cont = scanStream(contaminatedStream());
  assert(cont.taskInputLadder === 2 && cont.selfYes === 1 && cont.subLiteral === 0,
    'scanStream CATCHES the parent pasting razor text into a Task prompt (taskInputLadder=' + cont.taskInputLadder + ')');

  // 4. deny strings
  const d = denyStrings(goodStream());
  assert(d.length === 2 && d.some((x) => /new file #5/.test(x)) && d.some((x) => /left-pad/.test(x)),
    'denyStrings finds both distinct razor denies (' + d.length + ')');
  assert(denyStrings(badStream()).length === 0, 'denyStrings finds none in a clean transcript');

  // 5. LOC counter
  ws = tmpWs('loc');
  writeAll(ws, Object.assign({}, TASKS['fanout-right'].seed, GOOD_FIVE, { 'lib/extra.js': 'a\n\nb\nc\n' }));
  const loc = countLoc(ws, TASKS['fanout-right'].seed);
  assert(loc.locNew === 3, 'countLoc counts 3 non-empty lines in the one file absent from the seed (got ' + loc.locNew + ')');
  assert(loc.locTotal === 13, 'countLoc counts 13 non-empty .js lines in total, skipping .claude/ and _dirs (got ' + loc.locTotal + ')');
  assert(countLoc(tmpWs('loc-empty'), TASKS['fanout-right'].seed).locTotal === 0, 'countLoc reads 0 on an empty workspace');

  // 6. injectable() — checked against razor's OWN shouldInject, so this test
  //    fails loudly if DEFAULT_SKIP ever changes under the probe.
  assert(shouldInject !== null, 'razor subagent-start.js loaded read-only from ' + RAZOR_DIR);
  const good = injectable(['implementer', 'general-purpose']);
  assert(good.injected === 2, 'injectable(): razor WOULD inject into implementer + general-purpose (got ' + good.injected + ')');
  const bad = injectable(['explore', 'plan']);
  assert(bad.injected === 0 && bad.skipped === 2, 'injectable(): razor would inject into NEITHER explore NOR plan — the trap this probe exists to avoid (got ' + bad.injected + ')');

  // 7. gate-state reader — the per-subagent budget instrument
  const sd = tmpWs('state');
  fs.writeFileSync(path.join(sd, 'razor-abc.json'), '{}');
  fs.writeFileSync(path.join(sd, 'razor-abc--agent1.json'), '{}');
  fs.writeFileSync(path.join(sd, 'razor-abc--agent2.json'), '{}');
  fs.writeFileSync(path.join(sd, 'unrelated.txt'), 'x');
  const gs = gateState(sd);
  assert(gs.total === 3 && gs.perAgent === 2, 'gateState finds 2 per-subagent state files out of 3 (fresh budget each)');
  assert(gateState(tmpWs('state-empty')).perAgent === 0, 'gateState reads 0 when no subagent gate ever ran');

  // 8. spawn log reader
  const lw = tmpWs('spawnlog');
  fs.writeFileSync(path.join(lw, '_spawns.log'), 'implementer\n\nexplore\n');
  assert(spawnLog(lw).join(',') === 'implementer,explore', 'spawnLog reads the spy hook log and drops blanks');
  assert(spawnLog(tmpWs('spawnlog-empty')).length === 0, 'spawnLog reads empty when the hook never fired');

  // 9. the preflight verdict itself
  const V = (o) => verdict(Object.assign({ spawns: 5, typesSeen: 5, injectableCount: 5, subLiteral: 0, selfYes: 0, taskInputLadder: 0 }, o));
  assert(V({ subLiteral: 1 }).code === 'PASS', 'verdict PASSes on subagent-event evidence alone');
  assert(V({ selfYes: 4 }).code === 'PASS', 'verdict PASSes on self-report evidence alone');
  assert(V({}).code === 'DEAD', 'verdict is DEAD when razor injects and nothing arrives');
  assert(V({ spawns: 0, typesSeen: 0, injectableCount: 0 }).code === 'INCONCLUSIVE', 'verdict is INCONCLUSIVE, not DEAD, when no fan-out happened');
  assert(V({ injectableCount: 0 }).code === 'INCONCLUSIVE', 'verdict is INCONCLUSIVE when every spawned type is skipped by design');
  assert(/NO AGENT TYPE WAS OBSERVED/.test(V({ typesSeen: 0, injectableCount: 0 }).reason),
    'verdict blames the SPY HOOK, not the skip list, when subagents ran but no type was ever seen');
  assert(V({ selfYes: 4, taskInputLadder: 2 }).code === 'INCONCLUSIVE',
    'verdict REFUSES a self-report-only PASS when the parent pasted razor text into the Task prompt');
  assert(V({ subLiteral: 1, selfYes: 4, taskInputLadder: 2 }).code === 'PASS',
    'verdict still PASSes on contaminated self-reports IF a subagent event carries the ladder independently');

  // 10. grid + estimate + seeded interleave
  const cells = buildCells();
  assert(cells.length === arms.length * Object.keys(TASKS).length * reps * models.length,
    'buildCells produces ' + cells.length + ' cells for ' + arms.length + ' arms x 2 tasks x ' + reps + ' reps x ' + models.length + ' models');
  const a = shuffle(cells, 4242).map((c) => c.task + c.arm + c.model + c.rep).join('|');
  const bb = shuffle(cells, 4242).map((c) => c.task + c.arm + c.model + c.rep).join('|');
  assert(a === bb, 'shuffle is deterministic for a given --seed');
  assert(shuffle(cells, 1).map((c) => c.arm).join('') !== cells.map((c) => c.arm).join('') || cells.length < 4,
    'shuffle actually interleaves the arms');
  assert(Math.abs(estimate(cells) - 16.8) < 0.001 || models.length !== 2 || reps !== 3,
    'estimate of the default 24-cell grid is $' + estimate(cells).toFixed(2));

  // 11. the tool allowlist that makes this probe incomparable
  assert(!GUARD.includes('Agent') && !GUARD.includes('Task'),
    'Agent/Task are ALLOWED here — numbers are not comparable with any published razor figure');

  // 12. the run root must not be scratch-exempt
  const exemptish = /\/scratchpad\//.test(OUT.replace(/\\/g, '/').toLowerCase());
  const tmp = path.resolve(require('node:os').tmpdir()).replace(/\\/g, '/').toLowerCase();
  const outN = OUT.replace(/\\/g, '/').toLowerCase();
  assert(!exemptish, 'out-dir contains no "/scratchpad/" segment, which file-meter.js:50 would exempt');
  assert(outN !== tmp && !outN.startsWith(tmp + '/'),
    'out-dir is OUTSIDE os.tmpdir() (' + tmp + '), so razor\'s file check can actually fire — the zero that was guaranteed by construction in every earlier run');

  // 13. a rerun must not score the previous cell's files
  const rw = tmpWs('reseed');
  fs.writeFileSync(path.join(rw, 'stale.js'), 'a\n');
  fs.mkdirSync(path.join(rw, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(rw, 'lib', 'money.js'), 'module.exports={money:()=>"$12.34"};\n');
  fs.writeFileSync(path.join(rw, '_spawns.log'), 'implementer\n');
  seedWorkspace(rw, 'fanout-right');
  assert(!fs.existsSync(path.join(rw, 'stale.js')) && !fs.existsSync(path.join(rw, '_spawns.log')),
    'seedWorkspace WIPES a reused workspace — no leftover answer file and no leftover spawn log');
  assert(TASKS['fanout-right'].check(rw).ok === false,
    'a reseeded workspace scores as unimplemented, not as the previous run\'s pass');

  // 14. the spy plugin the whole injection instrument depends on
  const spy = buildSpyPlugin(tmpWs('spy'));
  const hooksJson = JSON.parse(fs.readFileSync(path.join(spy, 'hooks', 'hooks.json'), 'utf8'));
  const cmd = hooksJson.hooks.SubagentStart[0].hooks[0].command;
  assert(path.isAbsolute(cmd) && fs.existsSync(cmd),
    'spy hook runs an ABSOLUTE node binary, not bare "node" — node is not on PATH on this machine');
  const spySrc = fs.readFileSync(path.join(spy, 'hooks', 'spy.js'), 'utf8');
  assert(/FANOUT_SPY_LOG/.test(spySrc), 'spy hook writes to the absolute path the probe hands it, not a cwd-relative one');
  // Feed the hook a real SubagentStart payload and read the log back.
  const spyLog = path.join(tmpWs('spy-log'), 'out.log');
  spawnSync(process.execPath, [path.join(spy, 'hooks', 'spy.js')], {
    input: JSON.stringify({ agent_type: 'implementer', session_id: 's', cwd: OUT }),
    env: Object.assign({}, process.env, { FANOUT_SPY_LOG: spyLog }), encoding: 'utf8', timeout: 15000,
  });
  assert(fs.readFileSync(spyLog, 'utf8').trim() === 'implementer',
    'the spy hook END-TO-END: a real SubagentStart payload lands the agent type in the log it was given');

  // 15. argument validation — the guard on spending a session on a bad name
  assert(models.every((m) => MODELS[m]) && !Object.keys(MODELS).includes('haiku'),
    'only sonnet and opus are reachable — haiku is retired as a test model');
  assert(budget > 0 && estimate(buildCells()) + EST.sonnet <= budget,
    'the default grid ($' + (estimate(buildCells()) + EST.sonnet).toFixed(2) + ') fits under the default --budget $' + budget.toFixed(2));

  console.log('\nall instruments valid');
}

// A crash must never look like a clean finish — a half-spent grid that exits 0
// is how a partial run gets quoted as a whole one.
main().catch((err) => { console.error('\nPROBE CRASHED: ' + (err && err.stack || err)); process.exit(1); });
