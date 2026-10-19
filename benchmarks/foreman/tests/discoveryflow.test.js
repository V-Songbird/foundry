'use strict';

// discoveryflow/ grades the turn after a commit whose hook carried Foreman's
// discovery rules, full or as the one-line reminder. Every case here uses
// scripted replies; nothing calls the network.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sim = require('../discoveryflow/sim.js');
const run = require('../discoveryflow/run.js');

const FULL = /CONFIRMED opportunities/;
const REMINDER = /full discovery rules given earlier in this session/;

// Runs the offline sender and hands the graded cases to check, then removes
// every case folder.
async function offline(kind, { mutate = null, scenarios = null, arms = null } = {}, check) {
  const o = { ...run.parseArgs([]), scenarios, ...(arms ? { arms } : {}) };
  const cases = run.makeCases(o);
  try {
    await run.runCases(cases, run.offlineSender(kind, mutate), o);
    for (const c of cases) check(c, sim.grade(c.st));
  } finally {
    for (const c of cases) sim.cleanup(c.st);
  }
}

// The replayed cases of every scenario on both arms, removed after check.
function replayed(check) {
  const cases = run.makeCases(run.parseArgs([]));
  try {
    check(cases);
  } finally {
    for (const c of cases) sim.cleanup(c.st);
  }
}

test('a model that follows the discovery rules passes every scenario on both arms', async () => {
  await offline('oracle', {}, (c, g) => {
    assert.deepStrictEqual(g, { pass: 1, checked: 1, asked: 1, menu: 1, held: 1, clean: 1 }, `${c.arm} ${c.scenario.id}`);
    assert.strictEqual(c.stop, c.scenario.id === 'tracked' ? 'end_turn' : 'asked', `${c.arm} ${c.scenario.id}`);
  });
});

test('a model that only answers in text fails every scenario on both arms', async () => {
  await offline('null', {}, (c, g) => {
    assert.strictEqual(g.pass, 0, `${c.arm} ${c.scenario.id}`);
    assert.strictEqual(g.checked, 0, `${c.arm} ${c.scenario.id}`);
  });
});

test('the replay lands the scenario\'s commits in a real repository and breaks no rule', () => {
  replayed((cases) => {
    for (const c of cases) {
      const count = spawnSync('git', ['rev-list', '--count', `${c.st.head0}..HEAD`], { cwd: c.st.project, encoding: 'utf8' }).stdout.trim();
      assert.strictEqual(Number(count), c.scenario.expected.commits, `${c.arm} ${c.scenario.id}`);
      assert.strictEqual(c.st.hooks.length, c.scenario.expected.commits, `${c.arm} ${c.scenario.id}`);
      assert.deepStrictEqual(c.st.violations, [], `${c.arm} ${c.scenario.id}`);
    }
  });
});

test('the old arm gets the full rules on every commit; the new arm gets them once, then the shorter reminder; nothing else differs', () => {
  replayed((cases) => {
    for (const s of sim.SCENARIOS) {
      const old = cases.find((c) => c.scenario === s && c.arm === 'old');
      const neu = cases.find((c) => c.scenario === s && c.arm === 'new');
      for (const h of old.st.hooks) assert.match(h.text, FULL, s.id);
      assert.match(neu.st.hooks[0].text, FULL, s.id);
      assert.strictEqual(neu.st.hooks[0].text, old.st.hooks[0].text, s.id);
      for (const [i, h] of neu.st.hooks.entries()) {
        if (!i) continue;
        assert.match(h.text, REMINDER, s.id);
        assert.doesNotMatch(h.text, FULL, s.id);
        assert.ok(h.text.length < old.st.hooks[i].text.length, s.id);
      }
      const bare = (c) => JSON.stringify(c.st.messages)
        .replace(/\\n\\n<system-reminder>\\nPostToolUse:Bash hook additional context: .*?\\n<\/system-reminder>/g, '')
        .replace(/\b[0-9a-f]{7,40}\b/g, '<sha>');
      assert.strictEqual(bare(neu), bare(old), s.id);
    }
  });
});

test('the oracle\'s duplicate check matches the tracked entry and nothing in the other scenarios', async () => {
  await offline('oracle', {}, (c) => {
    const check = c.st.events.slice(c.st.liveFrom).find((e) => e.kind === 'check');
    assert.strictEqual(check.duplicate, c.scenario.expected.duplicate, `${c.arm} ${c.scenario.id}`);
    if (check.duplicate) assert.strictEqual(check.matches[0].id, '003');
  });
});

test('each broken rule fails its own dimension', async () => {
  const only = (dims) => ({ pass: 0, checked: 1, asked: 1, menu: 1, held: 1, clean: 1, ...dims });
  await offline('oracle', { mutate: 'no-check', scenarios: ['finding'] }, (c, g) => assert.deepStrictEqual(g, only({ checked: 0 }), c.arm));
  await offline('oracle', { mutate: 'add-first', scenarios: ['finding'] }, (c, g) => assert.deepStrictEqual(g, only({ held: 0 }), c.arm));
  await offline('oracle', { mutate: 'short-menu', scenarios: ['finding'] }, (c, g) => assert.deepStrictEqual(g, only({ menu: 0 }), c.arm));
  await offline('oracle', { mutate: 'spawn', scenarios: ['finding'] }, (c, g) => assert.deepStrictEqual(g, only({ held: 0, clean: 0 }), c.arm));
  await offline('oracle', { mutate: 'ask-tracked', scenarios: ['tracked'] }, (c, g) => assert.deepStrictEqual(g, only({ asked: 0 }), c.arm));
});

test('a duplicate check that never ran, followed by silence, fails every scenario on both arms', async () => {
  await offline('oracle', { mutate: 'bad-check' }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, checked: 0, asked: 0, menu: 1, held: 1, clean: 1 }, `${c.arm} ${c.scenario.id}`);
    assert.ok(!c.st.events.slice(c.st.liveFrom).some((e) => e.kind === 'check'), `${c.arm} ${c.scenario.id}`);
  });
});

test('the new arm keeps the hook\'s discovery state in the case folder, and cleanup removes the folder', () => {
  const { discoveryStatePath } = require(path.join(sim.FOREMAN, 'hooks', 'post-commit.js'));
  const st = sim.newCase(sim.SCENARIOS[0], 'new');
  try {
    const system = discoveryStatePath(path.resolve(st.project), `discoveryflow-${path.basename(st.dir)}`);
    assert.ok(fs.existsSync(path.join(st.dir, 'tmp', path.basename(system))));
    assert.ok(system.startsWith(os.tmpdir()));
    assert.ok(!fs.existsSync(system));
  } finally {
    sim.cleanup(st);
  }
  assert.ok(!fs.existsSync(st.dir));
});

test('a hook block names the simulated install\'s roadmap.js, not the checkout\'s', () => {
  replayed((cases) => {
    for (const c of cases) for (const h of c.st.hooks.filter((x) => x.full)) {
      assert.ok(h.text.includes(`node "${sim.ROOT}/scripts/roadmap.js"`), `${c.arm} ${c.scenario.id}`);
      assert.ok(!h.text.includes(sim.FOREMAN) && !h.text.includes(sim.FOREMAN.replaceAll('\\', '/')), `${c.arm} ${c.scenario.id}`);
    }
  });
});
