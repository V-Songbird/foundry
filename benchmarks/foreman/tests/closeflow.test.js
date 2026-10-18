'use strict';

// closeflow/ grades the close protocol of a Foreman entry handoff in a throwaway
// git repository. Every case here uses scripted replies; nothing calls the network.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sim = require('../closeflow/sim.js');
const run = require('../closeflow/run.js');

const scenario = (id) => sim.SCENARIOS.find((s) => s.id === id);

// Runs the offline sender and hands the graded cases to check, then removes
// every scratch repository.
async function offline(kind, { mutate = null, scenarios = null } = {}, check) {
  const o = { ...run.parseArgs([]), scenarios };
  const cases = run.makeCases(o);
  try {
    await run.runCases(cases, run.offlineSender(kind, mutate), o);
    for (const c of cases) check(c, sim.grade(c.st));
  } finally {
    for (const c of cases) sim.cleanup(c.st);
  }
}

test('a model that follows the entry paragraph exactly passes every scenario', async () => {
  await offline('oracle', {}, (c, g) => {
    assert.deepStrictEqual(g, { pass: 1, opened: 1, boundary: 1, owned: 1, closed: 1, clean: 1 }, c.scenario.id);
    assert.strictEqual(c.stop, 'end_turn');
  });
});

test('a model that only answers in text fails every scenario', async () => {
  await offline('null', {}, (c, g) => {
    assert.strictEqual(g.pass, 0, c.scenario.id);
    assert.strictEqual(g.opened, 0, c.scenario.id);
  });
});

test('the crafted prompt carries the current entry paragraph, not the workflow coordinator one', () => {
  for (const s of sim.SCENARIOS) {
    const p = sim.craftPrompt(s);
    assert.match(p, /"status":"in_progress"\}' \| node \$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/roadmap\.js update-status/, s.id);
    assert.match(p, /safe-commit\.js begin/, s.id);
    assert.match(p, /--no-commit/, s.id);
    assert.match(p, /"staged":true/, s.id);
    assert.doesNotMatch(p, /owns its lifecycle/, s.id);
  }
});

test('staging with git add -A fails owned and clean only', async () => {
  await offline('oracle', { mutate: 'add-all', scenarios: ['clean'] }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, opened: 1, boundary: 1, owned: 0, closed: 1, clean: 0 });
  });
});

test('skipping the commit boundary fails boundary, and skipping the open fails opened', async () => {
  await offline('oracle', { mutate: 'no-begin', scenarios: ['clean'] }, (c, g) => assert.strictEqual(g.boundary, 0));
  await offline('oracle', { mutate: 'skip-open', scenarios: ['clean'] }, (c, g) => assert.strictEqual(g.opened, 0));
});

test('closing as done where the project holds finished work fails closed only', async () => {
  await offline('oracle', { mutate: 'wrong-status', scenarios: ['hold'] }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, opened: 1, boundary: 1, owned: 1, closed: 0, clean: 1 });
  });
});

test('a commit without the Foreman trailer fails closed', async () => {
  await offline('oracle', { mutate: 'no-trailer', scenarios: ['clean'] }, (c, g) => assert.strictEqual(g.closed, 0));
});

test('on a dirty tree the oracle makes no commit and leaves the other edit as it was', async () => {
  const s = scenario('dirty');
  const original = fs.readFileSync(path.join(__dirname, '..', 'fixtures', s.fixture, 'app', s.dirty.file), 'utf8') + s.dirty.append;
  await offline('oracle', { scenarios: ['dirty'] }, (c) => {
    const git = (...a) => spawnSync('git', a, { cwd: c.st.project, encoding: 'utf8' }).stdout.trim();
    assert.strictEqual(c.st.events.find((e) => e.kind === 'begin').dirty, true);
    assert.strictEqual(git('rev-parse', 'HEAD'), c.st.head0);
    assert.strictEqual(fs.readFileSync(path.join(c.st.project, s.dirty.file), 'utf8'), original);
    assert.ok(!git('diff', '--cached', '--name-only').split('\n').includes(s.dirty.file));
  });
});

test('a push, a write outside the project and a direct roadmap write are violations and are not applied', () => {
  const st = sim.newCase(scenario('clean'), 'current');
  try {
    const roadmap = fs.readFileSync(path.join(st.project, 'ROADMAP.jsonl'), 'utf8');
    sim.handleTool(st, { name: 'Bash', input: { command: 'git push origin main' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: '/etc/passwd', content: 'x' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/ROADMAP.jsonl`, content: 'x' } });
    assert.strictEqual(st.violations.length, 3);
    assert.strictEqual(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: st.project, encoding: 'utf8' }).stdout.trim(), st.head0);
    assert.strictEqual(fs.readFileSync(path.join(st.project, 'ROADMAP.jsonl'), 'utf8'), roadmap);
    assert.ok(!st.events.some((e) => e.kind === 'git' || e.kind === 'edit'));
    assert.strictEqual(sim.grade(st).clean, 0);
  } finally {
    sim.cleanup(st);
  }
});
