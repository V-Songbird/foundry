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

const PLUGINS = path.dirname(require('../../paths.js').pluginDir('foreman'));
const dryRun = (tasks) => spawnSync(process.execPath,
  [RUN, '--dry-run', '--tag', TAG, '--tasks', tasks, '--arms', 'foreman-std'],
  { env: { ...process.env, BENCH_DATA_DIR: DATA }, encoding: 'utf8' });

test('a task with no arm prompts is refused by name before anything is planned', () => {
  const r = dryRun('gamed-check');
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
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

for (const name of ['reps', 'concurrency']) {
  for (const bad of ['abc', '0', '1.5', '']) {
    test(`--${name} "${bad}" is refused with a usage line and plans nothing`, () => {
      const r = dryArgs('--tag', TAG, '--tasks', 'api-constraint', '--arms', 'foreman-std', `--${name}`, bad);
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, new RegExp(`usage: --${name} needs a whole number of at least 1`));
      assert.doesNotMatch(r.stdout, /NaN|planned runs/);
    });
  }
}

test('--tasks followed by another flag is refused, naming both', () => {
  const r = dryArgs('--tag', TAG, '--tasks', '--reps', '1');
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /usage: --tasks needs a value, got --reps/);
  assert.ok(!fs.existsSync(WORK), 'a refused run still made workdirs');
});

// The other usage refusals share the exit code: an unknown arm (an inherited
// object key included, which used to pass the check and crash on a TypeError),
// an arm whose plugin checkout is missing, an arm whose settings file is missing.
const armsRun = (value, env = {}, run = RUN) => spawnSync(process.execPath,
  [run, '--dry-run', '--tag', TAG, '--tasks', 'api-constraint', '--arms', value],
  { env: { ...process.env, BENCH_DATA_DIR: DATA, ...env }, encoding: 'utf8' });

for (const arm of ['nope', 'constructor']) {
  test(`an unknown arm ${arm} is a usage error that plans nothing`, () => {
    const r = armsRun(arm);
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.ok(r.stderr.includes(`unknown arm "${arm}" — valid: vibe, `), r.stderr);
    assert.doesNotMatch(r.stderr, /TypeError/);
  });
}

test('an arm whose plugin checkout is missing is a usage error naming the folder', () => {
  const gone = path.join(DATA, 'no-such-plugin');
  const r = armsRun('trio', { HUSH_PLUGIN_DIR: gone });
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.ok(r.stderr.includes(`arm "trio" needs a plugin at ${gone}`), r.stderr);
});

test('an arm whose settings file is missing is a usage error naming the file', () => {
  // Run a copy of the harness without settings-trio.json, with stub plugins.
  const bench = path.join(DATA, 'harness');
  const top = path.resolve(__dirname, '..', '..');
  fs.mkdirSync(bench, { recursive: true });
  for (const f of fs.readdirSync(top)) if (f.endsWith('.js')) fs.copyFileSync(path.join(top, f), path.join(bench, f));
  const copy = path.join(bench, 'foreman');
  fs.cpSync(path.join(top, 'foreman'), copy, {
    recursive: true,
    filter: (p) => !p.includes(`${path.sep}tests`) && path.basename(p) !== 'settings-trio.json',
  });
  const env = { BENCH_PLUGINS_DIR: PLUGINS };
  for (const name of ['hush', 'razor']) {
    const dir = path.join(bench, 'plugins', name);
    fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), '{}');
    env[`${name.toUpperCase()}_PLUGIN_DIR`] = dir;
  }
  const r = armsRun('trio', env, path.join(copy, 'runner', 'run.js'));
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /arm "trio": settings file missing: .*settings-trio\.json/);
});
