'use strict';

// The Foreman benchmark's scripts that read their own flags refuse a value flag with no value, or with
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
  for (const k of ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
  return spawnSync(process.execPath, [path.join(BENCH, script), ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 60000 });
}

describe('exit 2 readers', () => {
  const cases = [
    ['foreman/picks/run.js', '--dry-run', '--tag'],
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

describe('exit 1 readers', () => {
  const cases = [
    ['foreman/validation/validate-records.js', '--records'],
    ['foreman/picks/ranking-replay.js', '--roadmap'],
    ['foreman/runner/demo.js', '--out'],
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
