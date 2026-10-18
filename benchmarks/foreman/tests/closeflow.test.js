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

test('a model that follows the entry paragraph exactly passes every scenario on both arms', async () => {
  await offline('oracle', {}, (c, g) => {
    assert.deepStrictEqual(g, { pass: 1, opened: 1, boundary: 1, owned: 1, closed: 1, clean: 1 }, `${c.arm} ${c.scenario.id}`);
    assert.strictEqual(c.stop, 'end_turn', `${c.arm} ${c.scenario.id}`);
  });
});

test('a model that only answers in text fails every scenario on both arms', async () => {
  await offline('null', {}, (c, g) => {
    assert.strictEqual(g.pass, 0, `${c.arm} ${c.scenario.id}`);
    assert.strictEqual(g.opened, 0, `${c.arm} ${c.scenario.id}`);
  });
});

test('the current arm carries the task.js entry paragraph, not the safe-commit or workflow coordinator one', () => {
  for (const s of sim.SCENARIOS) {
    const p = sim.craftPrompt(s, 'current');
    assert.match(p, /`node \$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/task\.js start --id 042 --agent`/, s.id);
    assert.match(p, /<start's then> <<'EOF'/, s.id);
    assert.match(p, /follow its `fix`, then act on its `after` when it has one/, s.id);
    assert.doesNotMatch(p, /safe-commit\.js (begin|finish)/, s.id);
    assert.doesNotMatch(p, /"status":"in_progress"/, s.id);
    assert.doesNotMatch(p, /owns its lifecycle/, s.id);
  }
});

test('the frozen arm carries the update-status and safe-commit entry paragraph', () => {
  for (const s of sim.SCENARIOS) {
    const p = sim.craftPrompt(s, 'frozen');
    assert.match(p, /"status":"in_progress"\}' \| node \$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/roadmap\.js update-status/, s.id);
    assert.match(p, /safe-commit\.js begin/, s.id);
    assert.match(p, /--no-commit/, s.id);
    assert.match(p, /"staged":true/, s.id);
    assert.doesNotMatch(p, /owns its lifecycle/, s.id);
  }
});

test('the current arm does not read the frozen paragraph, and the arms differ only in it', () => {
  for (const s of sim.SCENARIOS) {
    const f = sim.ARMS.frozen[s.config?.requireVerification === false ? 'plain' : 'hold'];
    const c = sim.craftPrompt(s, 'current');
    assert.ok(typeof f === 'string' && f.startsWith('This task is ROADMAP.jsonl entry'), s.id);
    assert.ok(!c.includes(f), s.id);
    assert.notStrictEqual(sim.entryParagraph(c), f, s.id);
    assert.strictEqual(sim.craftPrompt(s, 'frozen').replace(f, () => sim.entryParagraph(c)), c, s.id);
  }
});

test('staging with git add -A fails owned and clean only', async () => {
  await offline('oracle', { mutate: 'add-all', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, opened: 1, boundary: 1, owned: 0, closed: 1, clean: 0 });
  });
});

test('with git add -A, task.js finish commits nothing and the grade fails owned and clean', async () => {
  await offline('oracle', { mutate: 'add-all', scenarios: ['clean'], arms: ['current'] }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, opened: 1, boundary: 1, owned: 0, closed: 0, clean: 0 });
    assert.strictEqual(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: c.st.project, encoding: 'utf8' }).stdout.trim(), c.st.head0);
  });
});

test('skipping the commit boundary fails boundary, and skipping the open fails opened', async () => {
  await offline('oracle', { mutate: 'no-begin', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => assert.strictEqual(g.boundary, 0));
  await offline('oracle', { mutate: 'skip-open', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => assert.strictEqual(g.opened, 0));
});

test('an open that names the wrong id fails opened, though the close still moves the row', async () => {
  await offline('oracle', { mutate: 'wrong-open', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => {
    assert.strictEqual(c.st.events.find((e) => e.kind === 'open').ok, false);
    assert.strictEqual(g.opened, 0);
    assert.strictEqual(g.closed, 1);
  });
});

test('closing as done where the project holds finished work fails closed only', async () => {
  await offline('oracle', { mutate: 'wrong-status', scenarios: ['hold'], arms: ['frozen'] }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, opened: 1, boundary: 1, owned: 1, closed: 0, clean: 1 });
  });
});

test('a commit without the Foreman trailer fails closed', async () => {
  await offline('oracle', { mutate: 'no-trailer', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => assert.strictEqual(g.closed, 0));
});

test('on a dirty tree the oracle makes no commit and leaves the other edit as it was, on both arms', async () => {
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

test('a push, a write outside the project, a roadmap or .foreman write in any case or trailing dots, and git --output are violations and are not applied', () => {
  const st = sim.newCase(scenario('clean'), 'current');
  try {
    const roadmap = fs.readFileSync(path.join(st.project, 'ROADMAP.jsonl'), 'utf8');
    sim.handleTool(st, { name: 'Bash', input: { command: 'git push origin main' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: '/etc/passwd', content: 'x' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/ROADMAP.jsonl`, content: 'x' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/roadmap.jsonl`, content: 'x' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/ROADMAP.jsonl. `, content: 'x' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/.Foreman/config.json`, content: 'x' } });
    sim.handleTool(st, { name: 'Bash', input: { command: 'git show HEAD:index.js --output=ROADMAP.jsonl' } });
    sim.handleTool(st, { name: 'Bash', input: { command: 'git diff --output-directory=../out' } });
    assert.strictEqual(st.violations.length, 8);
    assert.strictEqual(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: st.project, encoding: 'utf8' }).stdout.trim(), st.head0);
    assert.strictEqual(fs.readFileSync(path.join(st.project, 'ROADMAP.jsonl'), 'utf8'), roadmap);
    assert.ok(!st.events.some((e) => e.kind === 'git' || e.kind === 'edit'));
    assert.strictEqual(sim.grade(st).clean, 0);
  } finally {
    sim.cleanup(st);
  }
});

test('a Write or Edit on a directory, a Windows absolute path or an invalid file name answers with a tool_use_error instead of throwing', () => {
  const st = sim.newCase(scenario('clean'), 'current');
  try {
    const bad = [`${sim.PROJECT}/src`, 'C:/Windows/x.txt',`${sim.PROJECT}/a\u0000b.txt`];
    for (const file_path of bad) {
      for (const [name, input] of [['Write', { file_path, content: 'x' }], ['Edit', { file_path, old_string: 'a', new_string: 'b' }]]) {
        const r = sim.handleTool(st, { name, input });
        assert.match(r.content, /^<tool_use_error>/, `${name} ${file_path}`);
      }
    }
    assert.ok(!st.events.some((e) => e.kind === 'edit'));
  } finally {
    sim.cleanup(st);
  }
});
