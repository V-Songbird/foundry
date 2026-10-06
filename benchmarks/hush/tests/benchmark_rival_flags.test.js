'use strict';

// The --rival-* flags describe one rival each, bound by position, so a flag
// left out for one rival used to shift every later rival's settings, env or
// overlay onto the wrong arm. run.js now refuses a flag whose count differs
// from the number of rivals, naming it. Every case is a --dry-run, which
// starts no session.

const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-rival-flags-'));
after(() => fs.rmSync(DATA, { recursive: true, force: true }));

function dryRun(tag, ...args) {
  const env = { ...process.env, BENCH_DATA_DIR: DATA };
  for (const k of ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
  return spawnSync(process.execPath,
    [path.join(BENCH, 'runner', 'run.js'), '--tag', tag, '--dry-run', '--tasks', 'explain-rebase', ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 60000 });
}

describe('--rival-* flag counts', () => {
  test('a settings flag left out for one of two rivals is refused, naming the flag', () => {
    const r = dryRun('rival-short',
      '--rival-name', 'first', '--rival-name', 'second', '--rival-settings', 'only-one.json');
    assert.notStrictEqual(r.status, 0, 'a mismatched call was accepted');
    assert.match(r.stderr, /--rival-settings/);
    assert.match(r.stderr, /2 rivals/);
  });

  test('an env flag given for fewer rivals than --rival-dir names is refused', () => {
    const r = dryRun('rival-env-short',
      '--rival-dir', 'a', '--rival-dir', 'b', '--rival-env', 'X=1');
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /--rival-env/);
  });

  test('a call with one value per rival plans every arm, and an empty value leaves one field out', () => {
    const r = dryRun('rival-ok',
      '--rival-name', 'first', '--rival-name', 'second',
      '--rival-dir', '', '--rival-dir', 'plugin-b',
      '--rival-settings', 'a.json', '--rival-settings', '');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /arms: baseline, hush, first, second/);
  });

  test('one rival with only some flags still works', () => {
    const r = dryRun('rival-one', '--rival-dir', 'plugin-a');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /arms: baseline, hush, rival\b/);
  });
});
