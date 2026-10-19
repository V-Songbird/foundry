#!/usr/bin/env node
'use strict';
// Discovery-reminder eval: after a session's first commit, Foreman's
// post-commit hook sends Claude Code a one-line pointer to the discovery rules
// instead of the full text. Does a model still check an unrelated defect it
// noticed against the roadmap and ask before adding it? Each case replays a
// scripted session (sim.js) whose last commit leaves the defect unreported,
// then grades the model's next turn. Two arms: `old`, the full rules on every
// commit, and `new`, the one-line reminder after the first. There is no model
// path yet; the paid comparison of the two arms adds one.
//
//   node discoveryflow/run.js            # plan only: cases and hook sizes, nothing sent
//   node discoveryflow/run.js --smoke    # oracle and null replies through sim and grader

const sim = require('./sim.js');

function parseArgs(argv) {
  const v = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  return {
    arms: v('arms', 'old,new').split(','),
    scenarios: v('scenarios', null)?.split(',') ?? null,
    reps: Number(v('reps', 1)),
    maxRounds: Number(v('max-rounds', 12)),
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
  try {
    for (const s of pickScenarios(o)) for (const arm of o.arms) for (let rep = 0; rep < o.reps; rep++) {
      const st = sim.newCase(s, arm);
      cases.push({ key: `c${cases.length}`, arm, rep, scenario: s, st, messages: [...st.messages], rounds: 0, toolCalls: 0, stop: null, error: null });
    }
  } catch (e) {
    for (const c of cases) sim.cleanup(c.st);
    throw e;
  }
  return cases;
}

// send(requests, round, activeCases) -> Map(key -> {message} | {error}).
// A question to the user ends the case: the grade needs nothing after it.
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
      let stop = null;
      const results = uses.map((u) => {
        c.toolCalls++;
        const res = sim.handle(c.st, u);
        stop = stop || res.stop || null;
        return { type: 'tool_result', tool_use_id: u.id, content: res.content || '(no output)' };
      });
      c.messages.push({ role: 'user', content: results });
      if (stop) c.stop = stop;
    }
  }
  for (const c of cases) if (!c.stop) c.stop = 'round_cap';
}

// --- offline replies ------------------------------------------------------------

const toolUse = (name, input, n) => ({ type: 'tool_use', id: `toolu_${n}`, name, input });
const reply = (content) => ({ message: { model: 'offline', content, stop_reason: content.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn' } });
const CANDIDATE = { title: 'Evict expired keys from the rate limiter window map', why: 'SlidingCounter keeps a window for every key forever, so memory grows with each distinct key.' };
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
// a chip as well), ask-tracked (ask though the check found a match).
function oracleTurn(c, mutate = null) {
  const n = c.rounds;
  const checkCmd = `echo '${JSON.stringify(CANDIDATE)}' | ${SCRIPT} check-duplicate`;
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
      await runCases(cases, offlineSender(kind), o);
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

function plan(o) {
  const scenarios = pickScenarios(o);
  console.log(`${scenarios.length * o.arms.length * o.reps} cases: ${o.arms.join(', ')} x ${scenarios.length} scenarios x ${o.reps} reps, up to ${o.maxRounds} rounds`);
  const cases = makeCases({ ...o, scenarios: scenarios.map((s) => s.id), reps: 1 });
  try {
    for (const c of cases) {
      const hooks = c.st.hooks.map((h) => h.text.length);
      console.log(`${c.arm} ${c.scenario.id}: ${hooks.length} commits; last hook block ${hooks.at(-1)} chars, all hook blocks ${hooks.reduce((a, b) => a + b, 0)} chars; conversation at the live turn ${JSON.stringify(c.messages).length} chars of JSON; expects ${c.scenario.expected.duplicate ? 'a match, no question' : 'no match, a question'}`);
    }
  } finally {
    for (const c of cases) sim.cleanup(c.st);
  }
  console.log('plan only: nothing was sent. This eval has no model path yet.');
  return 0;
}

async function main(argv = process.argv.slice(2)) {
  const o = parseArgs(argv);
  for (const a of o.arms) if (!sim.ARMS[a]) { console.error(`unknown arm ${a}; valid: ${Object.keys(sim.ARMS).join(', ')}`); return 2; }
  return o.smoke ? smoke(o) : plan(o);
}

module.exports = { parseArgs, makeCases, runCases, oracleTurn, offlineSender, smoke };
if (require.main === module) main().then((code) => { process.exitCode = code; }, (err) => { console.error(err.message); process.exitCode = 1; });
