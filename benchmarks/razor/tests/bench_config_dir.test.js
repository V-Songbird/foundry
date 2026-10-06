'use strict';

// The Claude runner never set CLAUDE_CONFIG_DIR, so a live run registered its
// temp working folders in the user's own ~/.claude.json and left transcripts
// under ~/.claude/projects. It must refuse to start a session without
// BENCH_CONFIG_DIR. PATH points at an empty folder so no claude binary can be
// found: even a regression cannot start a model session from this test.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('the Claude runner refuses to start a session without BENCH_CONFIG_DIR', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-cfg-'));
  const results = path.join(fixture, 'runs');
  const emptyBin = path.join(fixture, 'bin');
  fs.mkdirSync(emptyBin);
  const env = { ...process.env, RAZOR_BENCH_RUNS: results, PATH: emptyBin };
  delete env.BENCH_CONFIG_DIR;
  try {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../runner/run.js'), '--smoke'], {
      encoding: 'utf8', timeout: 60000, env,
    });
    assert.ifError(run.error);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /Set BENCH_CONFIG_DIR/);
    assert.equal(fs.existsSync(results), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
