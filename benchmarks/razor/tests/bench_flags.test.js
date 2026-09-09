'use strict';

// The runner ignored any flag it did not recognise, so `--dry-run` -- a flag the
// sibling harness has and this one never did -- started a real billed run.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { unknownFlags, KNOWN_FLAGS } = require('../runner/run.js');

describe('benchmark CLI flags', () => {
  test('a documented flag set passes', () => {
    const argv = ['--full', '--runs', '3', '--models', 'sonnet,opus', '--effort', 'high',
      '--arms', 'baseline,razor', '--seed', '12345', '--arm-dir', 'cut=/tmp/cut'];
    assert.deepStrictEqual(unknownFlags(argv), []);
  });

  test('an unknown flag is named back', () => {
    assert.deepStrictEqual(unknownFlags(['--full', '--dry-run', '--runs', '2']), ['--dry-run']);
  });

  test('every flag the runner reads is listed as known', () => {
    for (const f of ['task', 'arms', 'full', 'counter', 'note', 'runs', 'models', 'effort',
      'workers', 'seed', 'rescore', 'arm-dir', 'rival-dir', 'rival-name', 'selftest', 'smoke', 'default']) {
      assert.ok(KNOWN_FLAGS.includes(f), `--${f} missing from KNOWN_FLAGS`);
    }
  });
});

test('the Claude live runner refuses native Codex hooks before starting a model session', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const root = process.env.RAZOR_DIR ? path.resolve(process.env.RAZOR_DIR) : path.resolve(__dirname, '../../../razor');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-host-'));
  const results = path.join(fixture, 'must-not-be-created');
  try {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../runner/run.js'), '--smoke'], {
      encoding: 'utf8', timeout: 30000,
      env: { ...process.env, RAZOR_DIR: root, RAZOR_BENCH_RUNS: results },
    });
    assert.ifError(run.error);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Claude benchmark runner; Codex hook arms cannot run here/);
    assert.equal(fs.existsSync(results), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('offline instruments work from the Codex package without legacy metadata', () => {
  const fs = require('fs');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const root = process.env.RAZOR_DIR ? path.resolve(process.env.RAZOR_DIR) : path.resolve(__dirname, '../../../razor');
  assert.equal(fs.existsSync(path.join(root, '.claude-plugin', 'plugin.json')), false);
  const run = spawnSync(process.execPath, [path.resolve(__dirname, '../runner/run.js'), '--selftest'], {
    encoding: 'utf8', timeout: 30000,
    env: { ...process.env, RAZOR_DIR: root },
  });
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /selftest: all instruments valid/);
});
