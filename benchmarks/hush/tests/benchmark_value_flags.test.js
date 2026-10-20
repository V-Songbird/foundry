'use strict';

// A value flag given without a value used to crash run.js with a TypeError
// (--arms has no value, so .split ran on undefined) or, for --rival-*, bind
// the next flag as its value. run.js now exits with a usage line naming the
// flag. Every case is a --dry-run, which starts no session.

const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-value-flags-'));
after(() => fs.rmSync(DATA, { recursive: true, force: true }));

// A dry run of the given tasks under its own tag; `extraEnv` overrides the environment.
function plan(tag, tasks, extraEnv, ...args) {
  const env = { ...process.env, BENCH_DATA_DIR: DATA, ...extraEnv };
  for (const k of ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD', 'ANTHROPIC_API_KEY']) delete env[k];
  return spawnSync(process.execPath,
    [path.join(BENCH, 'runner', 'run.js'), '--tag', tag, '--dry-run', '--tasks', tasks, ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 60000 });
}
const run = (...args) => plan('value-flags', 'log-triage', {}, ...args);

describe('value flags', () => {
  test('a trailing --arms is refused with a usage line, not a TypeError', () => {
    const r = run('--arms');
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /usage: --arms needs a value/);
    assert.doesNotMatch(r.stderr, /TypeError/);
  });

  test('--arms followed by another flag is refused, naming --arms', () => {
    const r = run('--arms', '--reps', '1');
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /usage: --arms needs a value, got --reps/);
    assert.doesNotMatch(r.stderr, /TypeError/);
  });

  test('a repeatable --rival-dir without a value is refused', () => {
    const r = run('--rival-dir');
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /usage: --rival-dir needs a value/);
  });

  for (const name of ['reps', 'concurrency']) {
    test(`a non-numeric or non-positive --${name} is refused with exit 2`, () => {
      for (const bad of ['abc', '0', '1.5', '']) {
        const r = run(`--${name}`, bad);
        assert.strictEqual(r.status, 2, `${bad}: ${r.stdout}${r.stderr}`);
        assert.match(r.stderr, new RegExp(`usage: --${name} needs a whole number of at least 1`));
        assert.doesNotMatch(r.stdout, /NaN/);
      }
    });
  }

  test('a --tasks id that names no task is refused with exit 2, naming it', () => {
    for (const tasks of ['log-triage,explain-rebase', 'explain-rebase']) {
      const r = plan('value-flags-unknown', tasks, {});
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, /usage: --tasks names no task called explain-rebase/);
      assert.doesNotMatch(r.stdout, /runs \(/);
    }
  });

  test('an empty --tasks value is refused with exit 2, not widened to the default set', () => {
    const r = plan('value-flags-empty', '', {});
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /usage: --tasks names no task called \(empty id\);/);
    assert.doesNotMatch(r.stdout, /runs \(/);
  });

  test('a trailing comma in --tasks is refused with a named empty id', () => {
    const r = plan('value-flags-trailing', 'log-triage,', {});
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /names no task called \(empty id\);/);
  });

  test('a dry run creates no work folder in the temp directory', () => {
    const tmp = fs.mkdtempSync(path.join(DATA, 'tmp-'));
    const r = plan('value-flags-tmp', 'log-triage', { TEMP: tmp, TMP: tmp, TMPDIR: tmp });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.deepStrictEqual(fs.readdirSync(tmp), []);
  });

  test('a valid --arms value plans exactly those arms', () => {
    const r = run('--arms', 'baseline,hush');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /arms: baseline, hush/);
  });
});

describe('arm names', () => {
  test('an --arms name that is no arm is refused with exit 2 before anything is planned', () => {
    const r = plan('value-flags-arm', 'log-triage', {}, '--arms', 'baseline,nope');
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /usage: --arms names no arm called nope; known arms: baseline, hush/);
    assert.doesNotMatch(r.stdout, /runs \(|arm nope/);
    assert.doesNotMatch(r.stderr, /TypeError/);
    assert.ok(!fs.existsSync(path.join(DATA, 'hush', 'results', 'value-flags-arm')), 'a refused run still wrote a batch manifest');
  });

  test('an empty --arms value and an object-prototype name are refused as arms', () => {
    for (const [arms, named] of [['', '(empty name)'], ['baseline,constructor', 'constructor']]) {
      const r = run('--arms', arms);
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.ok(r.stderr.includes(`names no arm called ${named};`), r.stderr);
    }
  });

  test('a rival arm is a known arm', () => {
    const r = run('--rival-name', 'mine', '--rival-dir', '', '--arms', 'baseline,mine');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /arms: baseline, mine/);
  });
});
