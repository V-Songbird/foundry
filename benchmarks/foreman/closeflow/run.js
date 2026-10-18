#!/usr/bin/env node
'use strict';
// Close-protocol eval: does a worker that follows the Foreman entry paragraph
// open the entry, take the commit boundary, stage only its own files and close
// with the right status and a `Foreman: <id>` commit? Each case runs in a
// simulated Claude Code session (sim.js) on a throwaway git repository. There
// is no model path yet; the paid comparison against entry 1078's task.js arm
// adds one.
//
//   node closeflow/run.js            # plan only: cases and prompt sizes, nothing sent
//   node closeflow/run.js --smoke    # oracle and null replies through sim and grader

const fs = require('node:fs');
const path = require('node:path');
const sim = require('./sim.js');

function parseArgs(argv) {
  const v = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  return {
    arms: v('arms', 'current').split(','),
    scenarios: v('scenarios', null)?.split(',') ?? null,
    reps: Number(v('reps', 1)),
    maxRounds: Number(v('max-rounds', 20)),
    smoke: argv.includes('--smoke'),
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
    cases.push({ key: `c${cases.length}`, arm, rep, scenario: s, st: sim.newCase(s, arm), messages: [sim.firstMessage(s, arm)], rounds: 0, toolCalls: 0, stop: null, error: null });
  }
  return cases;
}

// send(requests, round, activeCases) -> Map(key -> {message} | {error})
async function runCases(cases, send, o) {
  for (let round = 1; round <= o.maxRounds; round++) {
    const active = cases.filter((c) => !c.stop);
    if (!active.length) break;
    const replies = await send(active.map((c) => ({ id: c.key })), round, active);
    for (const c of active) {
      const r = replies.get(c.key);
      c.rounds++;
      if (!r || r.error) { c.stop = 'error'; c.error = r?.error || 'no result'; continue; }
      const msg = r.message;
      c.messages.push({ role: 'assistant', content: msg.content });
      const uses = msg.content.filter((b) => b.type === 'tool_use');
      if (msg.stop_reason !== 'tool_use' || !uses.length) { c.stop = 'end_turn'; continue; }
      const results = uses.map((u) => {
        c.toolCalls++;
        return { type: 'tool_result', tool_use_id: u.id, content: sim.handleTool(c.st, u).content || '(no output)' };
      });
      c.messages.push({ role: 'user', content: results });
    }
  }
  for (const c of cases) if (!c.stop) c.stop = 'round_cap';
}

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

// What a model that follows the crafted paragraph exactly would send next.
// mutate breaks one step: add-all, no-begin, wrong-status, no-trailer, skip-open.
function oracleTurn(c, mutate = null) {
  const s = c.scenario;
  const st = c.st;
  const n = c.rounds;
  const cmd = promptCommands(st.prompt);
  const bash = (command, k = n) => toolUse('Bash', { command }, k);
  const begin = st.events.find((e) => e.kind === 'begin');
  const dirty = begin?.dirty === true;
  const status = mutate === 'wrong-status' ? 'done' : s.expected.status;
  let close = cmd.close.replace('"<status>"', JSON.stringify(status)).replace('"<findings>"', '"Read windowMs in src/limiter.js; node --test tests/ passes.","model":"opus"');
  if (dirty) close = close.replace(',"staged":true', '');
  const steps = [
    mutate !== 'skip-open' && (() => [bash(cmd.open)]),
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

const offlineSender = (kind, mutate = null) => async (reqs, round, active) =>
  new Map(active.map((c) => [c.key, kind === 'null' ? reply([{ type: 'text', text: 'I cannot help with that.' }]) : reply(oracleTurn(c, mutate))]));

async function smoke(o) {
  let wrong = 0;
  for (const kind of ['oracle', 'null']) {
    const cases = makeCases({ ...o, reps: 1 });
    try {
      await runCases(cases, offlineSender(kind), o);
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

function plan(o) {
  const scenarios = pickScenarios(o);
  console.log(`${scenarios.length * o.arms.length * o.reps} cases: ${o.arms.join(', ')} x ${scenarios.length} scenarios x ${o.reps} reps, up to ${o.maxRounds} rounds`);
  for (const s of scenarios) {
    const lines = sim.craftPrompt(s).split('\n');
    const from = lines.findIndex((l) => l.startsWith('This task is ROADMAP.jsonl entry'));
    const to = lines.findIndex((l, i) => i > from && l.startsWith('Also add `model`'));
    console.log(`${s.id}: prompt ${lines.join('\n').length} chars, entry paragraph ${to - from + 1} lines; expects ${s.expected.status}, ${s.expected.commit ? 'one commit' : 'no commit'}`);
  }
  console.log('plan only: nothing was sent. This eval has no model path yet.');
  return 0;
}

async function main(argv = process.argv.slice(2)) {
  const o = parseArgs(argv);
  for (const a of o.arms) if (!sim.ARMS[a]) { console.error(`unknown arm ${a}; valid: ${Object.keys(sim.ARMS).join(', ')}`); return 2; }
  return o.smoke ? smoke(o) : plan(o);
}

module.exports = { parseArgs, makeCases, runCases, oracleTurn, offlineSender, smoke, promptCommands };
if (require.main === module) main().then((code) => { process.exitCode = code; }, (err) => { console.error(err.message); process.exitCode = 1; });
