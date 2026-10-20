#!/usr/bin/env node
'use strict';
// Discovery-reminder eval: after a session's first commit, Foreman's
// post-commit hook sends Claude Code a one-line pointer to the discovery rules
// instead of the full text. Does a model still check an unrelated defect it
// noticed against the roadmap and ask before adding it? Each case replays a
// scripted session (sim.js) whose last commit leaves the defect unreported,
// then grades the model's next turn. Two arms: `old`, the full rules on every
// commit, and `new`, the one-line reminder after the first. The model path
// and its billing guards are ../pickflow/api.js's.
//
//   node discoveryflow/run.js            # plan only: cases, hook sizes and cost bounds, nothing sent
//   node discoveryflow/run.js --smoke    # oracle and null replies through sim and grader
//   node --env-file=<key file> discoveryflow/run.js --go --max-usd 3 --tag mine

const sim = require('./sim.js');
const api = require('../pickflow/api.js');

const FLOW = { SYSTEM: sim.SYSTEM, TOOLS: sim.TOOLS, handle: sim.handle };

function parseArgs(argv) {
  const o = api.apiArgs(argv, { reps: 1, maxRounds: 12 });
  const v = api.flagReader(argv, o);
  return Object.assign(o, {
    arms: v('arms', 'old,new').split(','),
    scenarios: v('scenarios', null)?.split(',') ?? null,
  });
}

function pickScenarios(o) {
  const scenarios = o.scenarios ? sim.SCENARIOS.filter((s) => o.scenarios.includes(s.id)) : sim.SCENARIOS;
  if (o.scenarios && scenarios.length !== o.scenarios.length) throw new Error(`unknown scenario in ${o.scenarios.join(',')}`);
  return scenarios;
}

function makeCases(o) {
  const cases = [];
  try {
    for (const s of pickScenarios(o)) for (const arm of o.arms) for (let rep = 0; rep < o.reps; rep++) {
      const st = sim.newCase(s, arm);
      cases.push({ key: `c${cases.length}`, arm, rep, scenario: s, st, messages: [...st.messages], ...api.meter(), rounds: 0, toolCalls: 0, stop: null, error: null });
    }
  } catch (e) {
    for (const c of cases) sim.cleanup(c.st);
    throw e;
  }
  return cases;
}

// send(requests, round, activeCases) -> Map(key -> {message} | {error}).
// A question to the user ends the case after the round's other calls run: the
// grade needs nothing after it.
const runCases = (cases, send, o, log = () => {}) => api.runCases(cases, send, o, FLOW, log);

// --- offline replies ------------------------------------------------------------

const toolUse = (name, input, n) => ({ type: 'tool_use', id: `toolu_${n}`, name, input });
const reply = (content) => ({ message: { model: 'offline', content, stop_reason: content.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn' } });
// The defect in the replay's own words, not a copy of tracked's entry 003.
const CANDIDATE = { title: 'SlidingCounter never deletes per-key windows', why: 'SlidingCounter adds a window to this.windows for every key and never deletes one, so memory grows with each distinct key.' };
const SCRIPT = `node "${sim.ROOT}/scripts/roadmap.js"`;
const LABELS = ['Add to roadmap', 'Execute here', 'Execute with a background Agent', 'Reject'];
const ask = (labels, n) => toolUse('AskUserQuestion', {
  questions: [{
    question: 'SlidingCounter never deletes a key\'s window, so memory grows with each distinct key (src/limiter.js, allow). What should I do with it?',
    header: 'Foreman', multiSelect: false,
    options: labels.map((label) => ({ label, description: label })),
  }],
}, n);

// What a model that follows the discovery rules would send in the live turn:
// check-duplicate, then the four-way question when nothing matches, or a text
// reply naming the match. mutate breaks one rule: no-check (ask before the
// check), add-first (add before asking), short-menu (two options), spawn (offer
// a chip as well), ask-tracked (ask though the check found a match), bad-check
// (call the script at a wrong path, then answer in text).
function oracleTurn(c, mutate = null) {
  const n = c.rounds;
  const checkCmd = `echo '${JSON.stringify(CANDIDATE)}' | ${mutate === 'bad-check' ? 'node "/wrong/scripts/roadmap.js"' : SCRIPT} check-duplicate`;
  const check = () => toolUse('Bash', { command: checkCmd }, `${n}c`);
  if (n === 0) return mutate === 'no-check' ? [ask(LABELS, n), check()] : [check()];
  if (n > 1) return [{ type: 'text', text: 'Done.' }];
  const found = c.st.events.slice(c.st.liveFrom).find((e) => e.kind === 'check');
  if (found?.duplicate === false || mutate === 'ask-tracked') {
    if (mutate === 'short-menu') return [ask(['Add to roadmap', 'Skip'], n)];
    if (mutate === 'add-first') {
      const row = { ...CANDIDATE, what: 'Delete each expired key window in src/limiter.js.', source: 'claude-suggested', status: 'planned' };
      return [toolUse('Bash', { command: `echo '${JSON.stringify(row)}' | ${SCRIPT} add` }, `${n}a`), ask(LABELS, n)];
    }
    if (mutate === 'spawn') return [toolUse('mcp__ccd_session__spawn_task', { title: CANDIDATE.title, prompt: CANDIDATE.why }, `${n}s`), ask(LABELS, n)];
    return [ask(LABELS, n)];
  }
  return [{ type: 'text', text: `The window-map growth is already on the roadmap as entry ${found?.matches?.[0]?.id ?? '?'}; nothing to add.` }];
}

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
        console.log(`${ok ? 'ok   ' : 'WRONG'} ${kind.padEnd(6)} ${c.arm.padEnd(3)} ${c.scenario.id.padEnd(7)} ${c.stop.padEnd(8)} ${JSON.stringify(g)}${c.st.violations.length ? ` ${c.st.violations.join('; ')}` : ''}`);
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
  const cases = makeCases({ ...o, scenarios: scenarios.map((s) => s.id), reps: 1 });
  try {
    for (const c of cases) {
      const hooks = c.st.hooks.map((h) => h.text.length);
      log(`${c.arm} ${c.scenario.id}: ${hooks.length} commits; last hook block ${hooks.at(-1)} chars, all hook blocks ${hooks.reduce((a, b) => a + b, 0)} chars; conversation at the live turn ${JSON.stringify(c.messages).length} chars of JSON; expects ${c.scenario.expected.duplicate ? 'a match, no question' : 'no match, a question'}`);
    }
    const { round1, oracleUsd } = await api.costPlan(cases, offlineSender('oracle'), o, FLOW);
    log(`round 1 worst case $${round1.toFixed(2)}; oracle-path estimate without cache, 1500 output tokens a round: $${oracleUsd.toFixed(2)}`);
  } finally {
    for (const c of cases) sim.cleanup(c.st);
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
  return api.live({ name: 'discoveryflow', title: 'Discovery-reminder eval', o, makeCases, flow: FLOW, grade: sim.grade, cleanup: sim.cleanup, outRoot, log });
}

module.exports = { parseArgs, makeCases, runCases, oracleTurn, offlineSender, smoke, main };
if (require.main === module) main().then((code) => { process.exitCode = code; }, (err) => { console.error(err.message); process.exitCode = 1; });
