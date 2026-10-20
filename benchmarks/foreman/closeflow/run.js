#!/usr/bin/env node
'use strict';
// Close-protocol eval: does a worker that follows the Foreman entry paragraph
// open the entry, take the commit boundary, stage only its own files and close
// with the right status and a `Foreman: <id>` commit? Each case runs in a
// simulated Claude Code session (sim.js) on a throwaway git repository. Two
// arms: `current`, today's task.js paragraph, and `frozen`, the update-status
// and safe-commit paragraph from before entry 1078. The model path and its
// billing guards are ../pickflow/api.js's.
//
//   node closeflow/run.js            # plan only: cases, prompt sizes and cost bounds, nothing sent
//   node closeflow/run.js --smoke    # oracle and null replies through sim and grader
//   node --env-file=<key file> closeflow/run.js --go --max-usd 5 --tag mine

const fs = require('node:fs');
const path = require('node:path');
const sim = require('./sim.js');
const api = require('../pickflow/api.js');

const FLOW = { SYSTEM: sim.SYSTEM, TOOLS: sim.TOOLS, handle: sim.handleTool };

function parseArgs(argv) {
  const v = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  return {
    ...api.apiArgs(argv, { reps: 1, maxRounds: 20 }),
    arms: v('arms', 'current,frozen').split(','),
    scenarios: v('scenarios', null)?.split(',') ?? null,
  };
}

function pickScenarios(o) {
  const scenarios = o.scenarios ? sim.SCENARIOS.filter((s) => o.scenarios.includes(s.id)) : sim.SCENARIOS;
  if (o.scenarios && scenarios.length !== o.scenarios.length) throw new Error(`unknown scenario in ${o.scenarios.join(',')}`);
  return scenarios;
}

function makeCases(o) {
  const cases = [];
  for (const s of pickScenarios(o)) for (const arm of o.arms) for (let rep = 0; rep < o.reps; rep++) {
    cases.push({ key: `c${cases.length}`, arm, rep, scenario: s, st: sim.newCase(s, arm), messages: [sim.firstMessage(s, arm)], ...api.meter(), rounds: 0, toolCalls: 0, stop: null, error: null });
  }
  return cases;
}

// send(requests, round, activeCases) -> Map(key -> {message} | {error})
const runCases = (cases, send, o, log = () => {}) => api.runCases(cases, send, o, FLOW, log);

// --- offline replies ------------------------------------------------------------

const toolUse = (name, input, n) => ({ type: 'tool_use', id: `toolu_${n}`, name, input });
const reply = (content) => ({ message: { model: 'offline', content, stop_reason: content.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn' } });
const SOLUTION = (s) => fs.readFileSync(path.join(__dirname, '..', 'fixtures', s.fixture, 'solution', 'src', 'limiter.js'), 'utf8');

// The paragraph's bookkeeping commands: its lines that are one backticked command.
function promptCommands(prompt) {
  const lines = [...prompt.matchAll(/^`([^`]+)`$/gm)].map((m) => m[1]);
  const find = (re) => lines.find((l) => re.test(l));
  return {
    open: find(/"status":"in_progress".*update-status/),
    begin: find(/safe-commit\.js begin/),
    finish: find(/safe-commit\.js finish/),
    close: find(/"<status>".*update-status/),
  };
}

// What a model that follows the current paragraph exactly would send next:
// task.js start, the work, then the close JSON to start's `then` through a
// quoted heredoc. mutate add-all stages everything before the close.
function currentTurn(c, mutate = null) {
  const s = c.scenario;
  const st = c.st;
  const n = c.rounds;
  const bash = (command, k = n) => toolUse('Bash', { command }, k);
  const lines = st.prompt.split('\n');
  const start = [...st.prompt.matchAll(/^`([^`]+)`$/gm)].map((m) => m[1]).find((l) => /task\.js start/.test(l));
  const template = lines.find((l) => l.startsWith('{"status":"<status>"'));
  if (!start) throw new Error('current paragraph lacks the task.js start line');
  if (!template) throw new Error('current paragraph lacks the close JSON template');
  const close = () => {
    const begin = st.events.find((e) => e.kind === 'begin' && e.via === 'task');
    if (!begin?.then) throw new Error('task.js start returned no then');
    // task.js records an earned done as awaiting_acceptance where the project holds finished work.
    const payload = { ...JSON.parse(template), status: 'done', files: s.owned, message: 'Fix the limiter', notes: 'Read windowMs in src/limiter.js; node --test tests/ passes.', model: 'opus' };
    return [bash(`${begin.then} <<'EOF'\n${JSON.stringify(payload)}\nEOF`)];
  };
  const steps = [
    () => [bash(start)],
    () => [toolUse('Write', { file_path: `${sim.PROJECT}/src/limiter.js`, content: SOLUTION(s) }, n),
      ...(mutate === 'add-all' ? [toolUse('Write', { file_path: `${sim.PROJECT}/notes.txt`, content: 'scratch notes\n' }, `${n}b`)] : [])],
    () => [bash(sim.VERIFY)],
    mutate === 'add-all' && (() => [bash('git add -A')]),
    close,
  ].filter(Boolean);
  return n < steps.length ? steps[n]() : [{ type: 'text', text: 'Done: entry 042 is closed.' }];
}

// What a model that follows the frozen paragraph exactly would send next.
// mutate breaks one step: add-all, no-begin, wrong-status, no-trailer, skip-open,
// wrong-open.
function frozenTurn(c, mutate = null) {
  const s = c.scenario;
  const st = c.st;
  const n = c.rounds;
  const cmd = promptCommands(st.prompt);
  for (const k of ['open', 'begin', 'finish', 'close']) if (!cmd[k]) throw new Error(`frozen paragraph lacks ${k}`);
  const bash = (command, k = n) => toolUse('Bash', { command }, k);
  const begin = st.events.find((e) => e.kind === 'begin');
  const dirty = begin?.dirty === true;
  const status = mutate === 'wrong-status' ? 'done' : s.expected.status;
  let close = cmd.close.replace('"<status>"', JSON.stringify(status)).replace('"<findings>"', '"Read windowMs in src/limiter.js; node --test tests/ passes.","model":"opus"');
  if (dirty) close = close.replace(',"staged":true', '');
  const steps = [
    mutate !== 'skip-open' && (() => [bash(mutate === 'wrong-open' ? cmd.open.replace(`"${s.entry.id}"`, '"42"') : cmd.open)]),
    mutate !== 'no-begin' && (() => [bash(cmd.begin)]),
    () => [toolUse('Write', { file_path: `${sim.PROJECT}/src/limiter.js`, content: SOLUTION(s) }, n),
      ...(mutate === 'add-all' ? [toolUse('Write', { file_path: `${sim.PROJECT}/notes.txt`, content: 'scratch notes\n' }, `${n}b`)] : [])],
    () => [bash(sim.VERIFY)],
    !dirty && (() => [bash(mutate === 'add-all' ? 'git add -A'
      : cmd.finish.replace('["<the files this task owns>"]', JSON.stringify(s.owned)).replace('<baseline.head>', mutate === 'no-begin' ? st.head0 : begin.head))]),
    () => [bash(close)],
    !dirty && (() => [bash(mutate === 'no-trailer' ? 'git commit -m "Fix the limiter"' : 'git commit -m "Fix the limiter" -m "Foreman: 042"')]),
  ].filter(Boolean);
  return n < steps.length ? steps[n]() : [{ type: 'text', text: 'Done: entry 042 is closed.' }];
}

const oracleTurn = (c, mutate = null) => (c.arm === 'frozen' ? frozenTurn : currentTurn)(c, mutate);

const offlineSender = (kind, mutate = null) => async (reqs, round, active) =>
  new Map(active.map((c) => [c.key, kind === 'null' ? reply([{ type: 'text', text: 'I cannot help with that.' }]) : reply(oracleTurn(c, mutate))]));

async function smoke(o) {
  let wrong = 0;
  for (const kind of ['oracle', 'null']) {
    const cases = makeCases({ ...o, reps: 1 });
    try {
      await runCases(cases, offlineSender(kind), { ...o, maxUsd: null });
      for (const c of cases) {
        const g = sim.grade(c.st);
        const ok = kind === 'oracle' ? g.pass === 1 : g.pass === 0;
        if (!ok) wrong++;
        console.log(`${ok ? 'ok   ' : 'WRONG'} ${kind.padEnd(6)} ${c.arm.padEnd(7)} ${c.scenario.id.padEnd(6)} ${JSON.stringify(g)}${c.st.violations.length ? ` ${c.st.violations.join('; ')}` : ''}`);
      }
    } finally {
      for (const c of cases) sim.cleanup(c.st);
    }
  }
  return wrong ? 1 : 0;
}

async function plan(o, log = console.log) {
  const scenarios = pickScenarios(o);
  log(`${scenarios.length * o.arms.length * o.reps} cases: ${o.arms.join(', ')} x ${scenarios.length} scenarios x ${o.reps} reps, ${o.model}, ${o.api} API, up to ${o.maxRounds} rounds`);
  for (const arm of o.arms) for (const s of scenarios) {
    const prompt = sim.craftPrompt(s, arm);
    log(`${arm} ${s.id}: prompt ${prompt.length} chars, entry paragraph ${sim.entryParagraph(prompt).split('\n').length} lines; expects ${s.expected.status}, ${s.expected.commit ? 'one commit' : 'no commit'}`);
  }
  const probe = makeCases({ ...o, reps: 1 });
  try {
    const { round1, oracleUsd } = await api.costPlan(probe, offlineSender('oracle'), o, FLOW);
    log(`round 1 worst case $${round1.toFixed(2)}; oracle-path estimate without cache, 1500 output tokens a round: $${oracleUsd.toFixed(2)}`);
  } finally {
    for (const c of probe) sim.cleanup(c.st);
  }
}

async function main(argv = process.argv.slice(2), log = console.log, outRoot) {
  const o = parseArgs(argv);
  const bad = api.countUsage(o);
  if (bad) { log(bad); return 2; }
  for (const a of o.arms) if (!sim.ARMS[a]) { log(`unknown arm ${a}; valid: ${Object.keys(sim.ARMS).join(', ')}`); return 2; }
  if (!['batches', 'messages'].includes(o.api)) { log('--api must be batches or messages'); return 2; }
  if (o.smoke) return smoke(o);
  await plan(o, log);
  return api.live({ name: 'closeflow', title: 'Close-protocol eval', o, makeCases, flow: FLOW, grade: sim.grade, cleanup: sim.cleanup, outRoot, log });
}

module.exports = { parseArgs, makeCases, runCases, oracleTurn, currentTurn, frozenTurn, offlineSender, smoke, promptCommands, main };
if (require.main === module) main().then((code) => { process.exitCode = code; }, (err) => { console.error(err.message); process.exitCode = 1; });
