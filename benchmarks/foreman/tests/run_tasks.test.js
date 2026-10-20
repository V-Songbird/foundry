'use strict';

// runner/run.js must refuse a task whose fixture has no arm prompts before it
// plans anything, instead of crashing on a missing prompt file mid-run. Every
// call here is a --dry-run, so nothing starts a session.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const RUN = path.resolve(__dirname, '..', 'runner', 'run.js');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'foreman-run-data-'));
const TAG = `run-test-${process.pid}`;
const WORK = path.join(os.tmpdir(), 'foreman-bench', TAG);
after(() => { for (const d of [DATA, WORK]) fs.rmSync(d, { recursive: true, force: true }); });

const dryRun = (tasks) => spawnSync(process.execPath,
  [RUN, '--dry-run', '--tag', TAG, '--tasks', tasks, '--arms', 'foreman-std'],
  { env: { ...process.env, BENCH_DATA_DIR: DATA }, encoding: 'utf8' });

test('a task with no arm prompts is refused by name before anything is planned', () => {
  const r = dryRun('gamed-check');
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /task "gamed-check" has no arm prompts/);
  assert.ok(!fs.existsSync(WORK), 'a refused run still made workdirs');
});

test('a task with arm prompts still plans', () => {
  const r = dryRun('api-constraint');
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.ok(!fs.existsSync(WORK), 'a dry run left workdirs in the temp dir');
});

test('a trailing comma in --tasks is refused with a named empty id, not a blank', () => {
  const r = dryRun('api-constraint,');
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /names no task called \(empty id\);/);
});

test('an empty --tasks value is refused with a named empty id, not widened to the default set', () => {
  const r = dryRun('');
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /names no task called \(empty id\);/);
});

test('a --tasks id that names no task is a usage error that plans nothing', () => {
  const r = dryRun('api-constraint,no-such-task');
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /--tasks names no task called no-such-task; known tasks: .*api-constraint/);
  assert.ok(!fs.existsSync(WORK), 'a refused run still made workdirs');
});

// A value flag with no value, or with another flag where its value belongs,
// used to crash at .split on undefined (--tasks, --arms) or swallow the next
// flag. Each is now a usage line naming the flag and exit 2, never a stack trace.
const dryArgs = (...args) => spawnSync(process.execPath, [RUN, '--dry-run', ...args],
  { env: { ...process.env, BENCH_DATA_DIR: DATA }, encoding: 'utf8' });

for (const name of ['tasks', 'arms', 'tag', 'model', 'reps']) {
  test(`a trailing --${name} is refused with a usage line, not a stack trace`, () => {
    const given = { tag: TAG, arms: 'foreman-std' };
    delete given[name];
    const r = dryArgs(...Object.entries(given).flatMap(([k, v]) => [`--${k}`, v]), `--${name}`);
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, new RegExp(`usage: --${name} needs a value but none was given`));
    assert.doesNotMatch(r.stderr, /TypeError|\n\s+at /);
  });
}

test('--tasks followed by another flag is refused, naming both', () => {
  const r = dryArgs('--tag', TAG, '--tasks', '--reps', '1');
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /usage: --tasks needs a value, got --reps/);
  assert.ok(!fs.existsSync(WORK), 'a refused run still made workdirs');
});
