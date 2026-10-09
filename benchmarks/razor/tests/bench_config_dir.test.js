'use strict';

// The Claude runner never set CLAUDE_CONFIG_DIR, so a live run registered its
// temp working folders in the user's own ~/.claude.json and left transcripts
// under ~/.claude/projects. It must refuse to start a session without
// BENCH_CONFIG_DIR. Its cells run with bypassPermissions, so it must also
// refuse a RAZOR_BENCH_RUNS inside a Git work tree, where a cell's git could
// sweep files into the repository. Each test removes BENCH_CONFIG_DIR, so even
// a regression stops before a model session starts, and points RAZOR_DIR at a
// fixture plugin, so no Razor checkout is needed.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function smoke(fixture, env) {
  const razor = path.join(fixture, 'razor');
  fs.mkdirSync(path.join(razor, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(razor, '.claude-plugin', 'plugin.json'), '{"name":"razor"}');
  const full = { ...process.env, RAZOR_DIR: razor, ...env };
  delete full.BENCH_CONFIG_DIR;
  const run = spawnSync(process.execPath, [path.resolve(__dirname, '../runner/run.js'), '--smoke'], {
    encoding: 'utf8', timeout: 60000, env: full,
  });
  assert.ifError(run.error);
  return run;
}

test('the Claude runner refuses to start a session without BENCH_CONFIG_DIR', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-cfg-'));
  const results = path.join(fixture, 'runs');
  // PATH names an empty folder so no claude binary can be found.
  const emptyBin = path.join(fixture, 'bin');
  fs.mkdirSync(emptyBin);
  try {
    const run = smoke(fixture, { RAZOR_BENCH_RUNS: results, PATH: emptyBin });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /Set BENCH_CONFIG_DIR/);
    assert.equal(fs.existsSync(results), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('the Claude runner refuses a RAZOR_BENCH_RUNS inside a Git work tree', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-git-'));
  const repo = path.join(fixture, 'repo');
  fs.mkdirSync(repo);
  const init = spawnSync('git', ['init', '-q', repo], { encoding: 'utf8' });
  assert.equal(init.status, 0, init.stderr);
  const results = path.join(repo, 'runs', 'nested');
  try {
    const run = smoke(fixture, { RAZOR_BENCH_RUNS: results });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /RAZOR_BENCH_RUNS .* is inside a Git work tree/);
    assert.equal(fs.existsSync(path.join(repo, 'runs')), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
