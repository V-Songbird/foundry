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

function run(...args) {
  const env = { ...process.env, BENCH_DATA_DIR: DATA };
  for (const k of ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
  return spawnSync(process.execPath,
    [path.join(BENCH, 'runner', 'run.js'), '--tag', 'value-flags', '--dry-run', '--tasks', 'explain-rebase', ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 60000 });
}

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

  test('a valid --arms value plans exactly those arms', () => {
    const r = run('--arms', 'baseline,hush');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /arms: baseline, hush/);
  });
});
