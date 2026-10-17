'use strict';

// pickflow/ runs Foreman's pick flow in a simulated Claude Code session on the
// Claude API. Every case here uses scripted replies; nothing calls the network.

const { test } = require('node:test');
const assert = require('node:assert');

const sim = require('../pickflow/sim.js');
const run = require('../pickflow/run.js');

const opts = (extra = {}) => ({ ...run.parseArgs([]), reps: 1, maxUsd: null, ...extra });

async function offline(kind, extra) {
  const o = opts(extra);
  const cases = run.makeCases(o);
  await run.runCases(cases, run.offlineSender(kind), o, () => {});
  return cases;
}

test('a model that follows each arm exactly passes every scenario', async () => {
  for (const c of await offline('oracle')) {
    assert.deepStrictEqual(sim.grade(c.st), { pass: 1, q1: 1, q2: 1, events: 1, clean: 1 }, `${c.arm} ${c.scenario.id}`);
    assert.strictEqual(c.stop, 'q2', `${c.arm} ${c.scenario.id} reached the destination question`);
  }
});

test('a model that only answers in text fails every scenario', async () => {
  for (const c of await offline('null')) assert.strictEqual(sim.grade(c.st).pass, 0, `${c.arm} ${c.scenario.id}`);
});

test('the P1 arm reads the swapped pick.md and the prose arm reads Foreman\'s own', () => {
  assert.match(sim.skillFile('p1', 'skills/roadmap/pick.md'), /\| `ask_q1` \|/);
  assert.doesNotMatch(sim.skillFile('prose', 'skills/roadmap/pick.md'), /\| `ask_q1` \|/);
  assert.strictEqual(sim.skillFile('p1', 'skills/roadmap/destination-question.md'), sim.skillFile('prose', 'skills/roadmap/destination-question.md'));
});

test('a moved (Recommended) on the destination question fails Q2 only', async () => {
  const [c] = (await offline('oracle', { arms: ['prose'], scenarios: ['plain'] }));
  c.st.q2.options = c.st.q2.options.map((o) => ({ ...o, label: sim.baseLabel(o.label) + (o.label.includes('(Caution)') ? ' (Caution)' : '') }));
  c.st.q2.options[3].label += ' (Recommended)';
  assert.deepStrictEqual(sim.grade(c.st), { pass: 0, q1: 1, q2: 0, events: 1, clean: 1 });
});

test('a Q1 that drops the finish-first row fails Q1', async () => {
  const [c] = await offline('oracle', { arms: ['prose'], scenarios: ['finish-first'] });
  c.st.q1s[0].options.shift();
  assert.strictEqual(sim.grade(c.st).q1, 0);
});

test('reading the project, running another command or crafting early is a violation', () => {
  const st = sim.newCase(sim.SCENARIOS[0], 'prose');
  assert.match(sim.handleTool(st, { name: 'Read', input: { file_path: `${sim.PROJECT}/ROADMAP.jsonl` } }).content, /does not exist/);
  sim.handleTool(st, { name: 'Bash', input: { command: 'grep -n webhook src/webhooks/send.js' } });
  assert.strictEqual(sim.handleTool(st, { name: 'Bash', input: { command: `echo '{}' | node ${sim.ROOT}/scripts/craft-handoff.js` } }).stop, 'crafted');
  sim.noteText(st, 'Here is the menu: {"ok":true,"candidates":[]}');
  assert.strictEqual(st.violations.length, 4);
  assert.strictEqual(sim.grade(st).clean, 0);
});

test('the roadmap pre-check is answered as the file existing, and delegation tools are on offer', () => {
  const st = sim.newCase(sim.SCENARIOS[0], 'prose');
  assert.strictEqual(sim.handleTool(st, { name: 'Bash', input: { command: 'test -f ROADMAP.jsonl && echo EXISTS || echo MISSING' } }).content, 'EXISTS');
  assert.match(sim.handleTool(st, { name: 'Bash', input: { command: `ls -la ${sim.PROJECT}/ROADMAP.jsonl` } }).content, /ROADMAP\.jsonl$/);
  assert.strictEqual(sim.handleTool(st, { name: 'Bash', input: { command: 'ls ROADMAP.jsonl 2>&1' } }).content, 'ROADMAP.jsonl');
  sim.handleTool(st, { name: 'Bash', input: { command: 'cat ROADMAP.jsonl' } });
  assert.deepStrictEqual(st.violations, ['command cat ROADMAP.jsonl']);
  assert.ok(sim.TOOLS.some((t) => t.name === 'Agent') && sim.TOOLS.some((t) => t.name === 'TaskCreate'));
  assert.strictEqual(sim.handleTool(st, { name: 'Bash', input: { command: 'date +%F' } }).content, '2026-03-20');
  assert.match(sim.SYSTEM, /Today's date: 2026-03-20/);
  assert.strictEqual(st.violations.length, 1);
  // Seen in run p1-opus: the pre-check chained with a cat of the branch file.
  const chained = sim.handleTool(st, { name: 'Bash', input: { command: `ls ROADMAP.jsonl; cat ${sim.ROOT}/skills/roadmap/pick.md` } }).content;
  assert.match(chained, /^ROADMAP\.jsonl\n# Branch: Pick the next task/);
  sim.handleTool(st, { name: 'Bash', input: { command: `node ${sim.ROOT}/scripts/roadmap.js next-candidates --menu; grep -rn webhook src` } });
  assert.deepStrictEqual(st.violations, ['command cat ROADMAP.jsonl', 'command grep -rn webhook src']);
});

test('a skill file read through ${CLAUDE_PLUGIN_ROOT} resolves and is not a violation', () => {
  const st = sim.newCase(sim.SCENARIOS[0], 'prose');
  const r = sim.handleTool(st, { name: 'Read', input: { file_path: '${CLAUDE_PLUGIN_ROOT}/skills/roadmap/pick.md' } });
  assert.match(r.content, /^\s+1\t# Branch: Pick the next task/);
  assert.deepStrictEqual(st.violations, []);
});

test('a script path held in a shell variable expands before the command is matched', () => {
  // Seen in run p1-real: P=<root>/scripts; node $P/roadmap.js ...
  assert.strictEqual(sim.expandVars(`P="${sim.ROOT}/scripts"; node $P/roadmap.js step pick`), `node ${sim.ROOT}/scripts/roadmap.js step pick`);
  assert.strictEqual(sim.expandVars(`export R=${sim.ROOT} && node \${R}/scripts/roadmap.js`), `node ${sim.ROOT}/scripts/roadmap.js`);
  assert.strictEqual(sim.expandVars('node $HOME/x.js'), 'node $HOME/x.js');
});

test('only the last block of the conversation and the system prompt carry a cache breakpoint', () => {
  const o = opts();
  const [c] = run.makeCases({ ...o, arms: ['prose'], scenarios: ['plain'] });
  c.messages.push({ role: 'assistant', content: [{ type: 'text', text: 'a' }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'b' }] });
  const p = run.request(c, o);
  const marked = p.messages.flatMap((m) => m.content).filter((b) => b.cache_control);
  assert.strictEqual(marked.length, 1);
  assert.strictEqual(marked[0].tool_use_id, 't');
  assert.ok(p.system[0].cache_control);
  assert.ok(!c.messages.at(-1).content[0].cache_control, 'the stored conversation is not changed');
});

test('a round whose worst case passes the cap is not sent', async () => {
  const o = opts({ maxUsd: 0.01 });
  const cases = run.makeCases({ ...o, arms: ['prose'], scenarios: ['plain'] });
  let sent = 0;
  await run.runCases(cases, async () => { sent++; return new Map(); }, o, () => {});
  assert.strictEqual(sent, 0);
  assert.strictEqual(cases[0].stop, 'cap');
  assert.strictEqual(run.record(cases[0]).grade, null);
});

test('cache reads and writes are priced apart, and batches bill half', () => {
  const u = { input_tokens: 1e6, cache_creation_input_tokens: 1e6, cache_read_input_tokens: 1e6, output_tokens: 1e6 };
  const o = opts({ model: 'claude-sonnet-5-5' });
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
  near(run.costOf(u, { ...o, api: 'messages' }), 2 + 2.5 + 0.2 + 10);
  near(run.costOf(u, o), (2 + 2.5 + 0.2 + 10) / 2);
});
