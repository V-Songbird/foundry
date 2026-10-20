'use strict';

// The --rival-* flags describe one rival each, bound by position, so a flag
// left out for one rival used to shift every later rival's settings, env or
// overlay onto the wrong arm. run.js now refuses a flag whose count differs
// from the number of rivals, naming it, and refuses a rival name that would
// replace a built-in arm or another rival. Every case is a --dry-run, which
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
  for (const k of ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD', 'ANTHROPIC_API_KEY', 'TYPESAFE_API_KEY']) delete env[k];
  return spawnSync(process.execPath,
    [path.join(BENCH, 'runner', 'run.js'), '--tag', tag, '--dry-run', '--tasks', 'log-triage', ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 60000 });
}

// The dry run prints each arm's binding as `arm <name> <json>`.
function arms(stdout) {
  const out = {};
  for (const m of stdout.matchAll(/^ {2}arm (\S+) (.*)$/gm)) out[m[1]] = JSON.parse(m[2]);
  return out;
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

  test('a call with one value per rival binds each value to its own arm', () => {
    const r = dryRun('rival-ok',
      '--rival-name', 'first', '--rival-name', 'second',
      '--rival-dir', '', '--rival-dir', 'plugin-b',
      '--rival-settings', 'a.json', '--rival-settings', '',
      '--rival-env', 'A=1', '--rival-env', 'B=2,C=3');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /arms: baseline, hush, first, second/);
    assert.match(r.stdout, /1 tasks x 4 arms/, 'the plan holds no task');
    const a = arms(r.stdout);
    assert.deepStrictEqual(a.first, { pluginDirs: [], settings: path.resolve(BENCH, 'a.json'), env: { A: '1' } });
    assert.deepStrictEqual(a.second, { pluginDirs: [path.resolve(BENCH, 'plugin-b')], env: { B: '2', C: '3' } });
  });

  test('one rival with only some flags still works', () => {
    const r = dryRun('rival-one', '--rival-dir', 'plugin-a');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /arms: baseline, hush, rival\b/);
    assert.deepStrictEqual(arms(r.stdout).rival, { pluginDirs: [path.resolve(BENCH, 'plugin-a')], env: {} });
  });
});

describe('--rival-* names and values', () => {
  for (const name of ['hush', 'baseline', 'hush-core-only']) {
    test(`a rival named ${name} is refused instead of replacing that arm`, () => {
      const r = dryRun(`rival-reserved-${name}`, '--rival-name', name, '--rival-dir', 'other-plugin');
      assert.notStrictEqual(r.status, 0, `--rival-name ${name} was accepted:\n${r.stdout}`);
      assert.match(r.stderr, new RegExp(`--rival-name ${name} is a built-in arm`));
    });
  }

  test('two rivals with one name are refused', () => {
    const r = dryRun('rival-dup',
      '--rival-name', 'same', '--rival-name', 'same', '--rival-dir', 'a', '--rival-dir', 'b');
    assert.notStrictEqual(r.status, 0, `a duplicate name was accepted:\n${r.stdout}`);
    assert.match(r.stderr, /--rival-name same is given to more than one rival/);
  });

  test('a trailing --rival-dir with no value is refused, not planned as a plugin-less rival', () => {
    const r = dryRun('rival-trailing', '--rival-dir');
    assert.strictEqual(r.status, 2, r.stdout);
    assert.match(r.stderr, /--rival-dir needs a value/);
  });
});
