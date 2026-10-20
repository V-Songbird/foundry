'use strict';

// The Razor benchmark's scripts that read their own flags refuse a value flag with no value, or with
// another flag as its value, with a usage line naming it, as flags.js does, and keep the
// exit code their other failures already had. Every case stops at the flag check, so no
// session starts and nothing is written.

const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'local-flag-readers-'));
after(() => fs.rmSync(DATA, { recursive: true, force: true }));

function run(script, ...args) {
  const env = { ...process.env, BENCH_DATA_DIR: DATA };
  for (const k of ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD', 'ANTHROPIC_API_KEY', 'TYPESAFE_API_KEY']) delete env[k];
  return spawnSync(process.execPath, [path.join(BENCH, script), ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 60000 });
}

describe('exit 2 readers', () => {
  const cases = [
    ['razor/runner/run.js', '--selftest', '--effort'],
  ];
  for (const [script, ...args] of cases) {
    const name = args[args.length - 1];
    test(`${script} refuses ${name} with no value`, () => {
      const r = run(script, ...args);
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, new RegExp(`usage: ${name} needs a value but none was given`));
    });
    test(`${script} refuses ${name} followed by another flag`, () => {
      const r = run(script, ...args, '--go');
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, new RegExp(`usage: ${name} needs a value, got --go`));
    });
  }
});

describe('codex-run.js --effort', () => {
  // codex-run requires run.js, whose own --effort read must not pre-empt codex-run's exit 1.
  test('razor/runner/codex-run.js keeps exit 1 for --effort with no value', () => {
    const r = run('razor/runner/codex-run.js', '--effort');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout + r.stderr, /usage: --effort needs a value but none was given/);
  });
});

describe('codex-parity.js flags', () => {
  for (const args of [['--model'], ['--model', '--effort']]) {
    test(`razor/runner/codex-parity.js refuses ${args.join(' ')} with a usage line, exit 1`, () => {
      const r = run('razor/runner/codex-parity.js', ...args);
      assert.strictEqual(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stderr, /usage: --model needs a value(?: but none was given|, got --effort)/);
    });
  }
});

describe('run.js --seed', () => {
  test('razor/runner/run.js refuses --seed with no value before making a run folder', () => {
    const runs = path.join(DATA, 'seed-runs');
    const env = { RAZOR_BENCH_RUNS: runs, RAZOR_BENCH_ALLOW_TEMP: '1' };
    const saved = {};
    for (const k of Object.keys(env)) { saved[k] = process.env[k]; process.env[k] = env[k]; }
    let r;
    try { r = run('razor/runner/run.js', '--smoke', '--seed'); }
    finally { for (const k of Object.keys(env)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /usage: --seed needs a value but none was given/);
    assert.strictEqual(fs.existsSync(runs) ? fs.readdirSync(runs).length : 0, 0);
  });
});

describe('run.js --arm-dir', () => {
  // A trailing --arm-dir was skipped by a loop that stopped one short, so the arm was never read and a run went ahead without it.
  for (const args of [['--arm-dir'], ['--arm-dir', '--full']]) {
    test(`razor/runner/run.js refuses ${args.join(' ')} before making a run folder, exit 1`, () => {
      const r = run('razor/runner/run.js', '--smoke', ...args);
      assert.strictEqual(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stderr, /usage: --arm-dir needs a value(?: but none was given|, got --full)/);
    });
  }
});

describe('exit 1 readers', () => {
  const cases = [
    ['razor/runner/demo.js', '--task'],
  ];
  for (const [script, name] of cases) {
    test(`${script} refuses ${name} with no value, exit 1`, () => {
      const r = run(script, name);
      assert.strictEqual(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout + r.stderr, new RegExp(`usage: ${name} needs a value but none was given`));
    });
    test(`${script} refuses ${name} followed by another flag, exit 1`, () => {
      const r = run(script, name, '--x');
      assert.strictEqual(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout + r.stderr, new RegExp(`usage: ${name} needs a value, got --x`));
    });
  }
});
