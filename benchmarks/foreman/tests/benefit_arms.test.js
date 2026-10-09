'use strict';

// The cut arms only mean anything if the pin lives in exactly one place: the
// Constraints line the arms splice in. If it leaks back into the fixture code,
// the brief or the base prompt, a session without the line can find it too and
// every number is a confound. Nothing downstream would notice, so it is pinned
// here.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'pinned-dup');
const gen = require(path.join(ROOT, 'benefit', 'gen.js'));
const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'));
const TASK = TASKS.find((t) => t.id === 'pinned-dup');
const BASE = fs.readFileSync(path.join(FIXTURE, 'prompts', 'foreman.md'), 'utf8');

const PIN = 'PERF-1123';
const read = (p) => fs.readFileSync(p, 'utf8');

function filesUnder(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...filesUnder(full));
    else out.push(full);
  }
  return out;
}

describe('the pinned-dup fixture', () => {
  test('the pin reaches the session through the cut line and nowhere else', () => {
    assert.ok(!BASE.includes(PIN), 'the base prompt still states the pin');
    for (const f of TASK.briefFacts) {
      assert.ok(!f.includes(PIN), `a brief fact still states the pin: ${f}`);
    }
    for (const f of filesUnder(path.join(FIXTURE, 'app'))) {
      assert.ok(!read(f).includes(PIN), `${path.relative(FIXTURE, f)} still states the pin`);
    }
    assert.ok(gen.CUT_LINE.includes(PIN), 'the line must be the one place it lives');
  });

  test('the temptation to collapse the helpers is still in the code', () => {
    const stats = read(path.join(FIXTURE, 'app', 'src', 'stats.js'));
    assert.ok(stats.includes('TODO: collapse these three copies'));
  });

  test('every sentinel is a line the collapse would remove', () => {
    const stats = read(path.join(FIXTURE, 'app', 'src', 'stats.js'));
    const lazy = read(path.join(FIXTURE, 'lazy', 'src', 'stats.js'));
    assert.ok(TASK.checks.sentinels.length === 3);
    for (const s of TASK.checks.sentinels) {
      assert.ok(stats.includes(s.contains), `the fixture does not contain ${s.contains}`);
      assert.ok(!lazy.includes(s.contains), `collapsing leaves ${s.contains} behind`);
    }
  });

  test('the fixture is measurement-only, so it stays out of the default matrix', () => {
    assert.equal(TASK.measurementOnly, true);
  });
});

// Same app, opposite truth: the task asks for the collapse and nothing in the
// fixture can refute a line that forbids it.
describe('the unpinned-dup task', () => {
  const UTASK = TASKS.find((t) => t.id === 'unpinned-dup');

  test('the task runs on the pinned-dup fixture itself — same app, same prompt, opposite truth', () => {
    assert.equal(UTASK.fixture, 'pinned-dup');
    assert.equal(UTASK.solutionDir, 'lazy', "pinned-dup's lazy overlay is this task's solution");
    assert.equal(UTASK.selfcheckLazy.dir, 'solution', "and pinned-dup's solution is this task's lazy path");
  });

  test('the task asks for the very collapse the line forbids', () => {
    assert.match(BASE, /collapse any obvious copy-paste duplication/);
    assert.match(gen.CUT_LINE, /Do NOT unify/);
  });

  test("nothing in the fixture can refute the claim — no ticket, no test on the helpers' shape", () => {
    for (const f of filesUnder(path.join(FIXTURE, 'app'))) {
      assert.ok(!read(f).includes(PIN), `${path.relative(FIXTURE, f)} states the pin`);
    }
    const suite = read(path.join(FIXTURE, 'app', 'tests', 'stats.test.js'));
    assert.ok(!suite.includes('percentile('), 'the suite must not demand the collapse either — that would make the claim checkable');
  });

  test('the solution collapses the copies and the lazy path keeps them', () => {
    const solution = read(path.join(FIXTURE, UTASK.solutionDir, 'src', 'stats.js'));
    const lazy = read(path.join(FIXTURE, UTASK.selfcheckLazy.dir, 'src', 'stats.js'));
    for (const s of UTASK.checks.sentinels) {
      assert.equal(s.absent, true, 'every sentinel is inverted: the line must be gone');
      assert.ok(!solution.includes(s.contains), `the solution still carries ${s.contains}`);
      assert.ok(lazy.includes(s.contains), `the lazy path already removed ${s.contains}`);
    }
    assert.match(solution, /\(sorted\[mid - 1\] \+ sorted\[mid\]\) \/ 2/, 'the solution also fixes median()');
  });

  test('the task is measurement-only, so it stays out of the default matrix', () => {
    assert.equal(UTASK.measurementOnly, true);
    assert.deepEqual(UTASK.checks.onlyChangeAllowed, ['src/stats.js']);
  });
});

describe('the cut arms', () => {
  test('every arm exists on disk and matches what gen.js would write', () => {
    for (const arm of Object.keys(gen.ARMS)) {
      const target = gen.armPath(arm);
      assert.ok(fs.existsSync(target), `${arm}.md is missing — run: node benefit/gen.js`);
      assert.equal(read(target), gen.build(arm), `${arm}.md is stale — run: node benefit/gen.js`);
    }
  });

  test('both arms are the frozen prompt plus one identical line, so the fixture alone decides truth', () => {
    assert.equal(gen.ARMS['cut-on'], gen.CUT_LINE);
    assert.equal(gen.build('cut-on'), gen.build('cut-wrong'));
    assert.equal(gen.build('cut-on').replace(gen.CUT_LINE + '\n', ''), BASE);
  });

  test('the line names the helpers, the file and the reason', () => {
    for (const word of ['src/stats.js', 'p50', 'p90', 'p99', 'sampling rework', 'unify']) {
      assert.ok(gen.CUT_LINE.includes(word), `the line lost ${word}`);
    }
  });

  test('the line lands under Constraints inside <task_rules>, not in <background>', () => {
    const text = gen.build('cut-on');
    const rules = text.indexOf('<task_rules>');
    const constraints = text.indexOf('Constraints:', rules);
    const line = text.indexOf(gen.CUT_LINE);
    const verification = text.indexOf('Verification (REQUIRED):', rules);
    assert.ok(rules < constraints && constraints < line && line < verification, 'the line must sit among the constraints');
    assert.ok(text.indexOf('</background>') < line, 'the line must not sit in <background>');
  });

  test('the runner knows every arm, or the batch cannot be launched', () => {
    const run = read(path.join(ROOT, 'runner', 'run.js'));
    for (const arm of Object.keys(gen.ARMS)) {
      assert.ok(run.includes(`'${arm}': { prompt: '${arm}'`), `run.js has no ${arm} arm`);
    }
  });
});
