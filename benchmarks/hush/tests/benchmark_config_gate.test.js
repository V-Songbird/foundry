'use strict';

// BENCH_CONFIG_DIR is required only once a runner is about to start a Claude
// session. A dry run or a plan-only run starts none and must work without it,
// and a live run that refuses must leave nothing on its tag for a retry to trip
// over. Each case spawns the shipped script with the variable unset and run
// data pointed at a temporary folder. Nothing here starts a session.

const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-config-gate-'));
const EMPTY = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-config-gate-records-'));
// A stub `claude` first on PATH, so a regression that lets a run past the gate
// fails fast instead of starting a billed session.
const STUB = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-config-gate-bin-'));
fs.writeFileSync(path.join(STUB, 'claude.cmd'), '@exit /b 97\r\n');
fs.writeFileSync(path.join(STUB, 'claude'), '#!/bin/sh\nexit 97\n', { mode: 0o755 });
after(() => {
  for (const d of [DATA, EMPTY, STUB]) fs.rmSync(d, { recursive: true, force: true });
});

function run(script, ...args) {
  const env = { ...process.env, BENCH_DATA_DIR: DATA };
  for (const k of ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  env[pathKey] = `${STUB}${path.delimiter}${env[pathKey] || ''}`;
  return spawnSync(process.execPath, [path.join(BENCH, 'runner', script), ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 60000 });
}

describe('without BENCH_CONFIG_DIR', () => {
  test('answerable.js plans without refusing', () => {
    const r = run('answerable.js', '--records', EMPTY);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /plan only/);
  });

  test('retold.js plans without refusing', () => {
    const r = run('retold.js', '--records', EMPTY);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /plan only/);
  });

  test('run.js --dry-run plans and writes the tag manifest', () => {
    const tag = `gate-dry-${process.pid}`;
    const r = run('run.js', '--tag', tag, '--dry-run', '--tasks', 'log-triage');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(DATA, 'hush', 'results', tag, 'batch.json')));
  });

  test('a live run.js refuses before it creates the tag folder', () => {
    const tag = `gate-live-${process.pid}`;
    const r = run('run.js', '--tag', tag, '--tasks', 'log-triage');
    assert.strictEqual(r.status, 2, r.stderr);
    assert.match(r.stderr, /Set BENCH_CONFIG_DIR/);
    assert.ok(!fs.existsSync(path.join(DATA, 'hush', 'results', tag)),
      'a refused run left a tag folder behind');
  });
});

// The seed runs whenever <dir>/.claude.json is missing, so a folder made in
// advance, or one a failed seed left half-filled, is still seeded. A fake home
// stands in for ~/.claude.
test('bench-config-dir.js seeds a folder that exists but has no registry', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-config-seed-home-'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-config-seed-dir-'));
  try {
    fs.mkdirSync(path.join(home, '.claude'));
    fs.writeFileSync(path.join(home, '.claude', 'settings.json'), '{}');
    fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ onboarded: true, projects: { x: {} } }));
    const env = { ...process.env, HOME: home, USERPROFILE: home, BENCH_CONFIG_DIR: dir };
    const r = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(BENCH, '..', 'bench-config-dir.js'))})()`],
      { encoding: 'utf8', env, timeout: 60000 });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, '.claude.json'), 'utf8')),
      { onboarded: true, projects: {} });
    assert.ok(fs.existsSync(path.join(dir, 'settings.json')));
  } finally {
    for (const d of [home, dir]) fs.rmSync(d, { recursive: true, force: true });
  }
});

// A home with no ~/.claude.json, such as an API-key user who never ran claude,
// stops with exit 2 and a message, not an uncaught ENOENT.
test('bench-config-dir.js refuses a home with no ~/.claude.json before it seeds', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-config-seed-nohome-'));
  const dir = path.join(home, 'bench');
  try {
    const env = { ...process.env, HOME: home, USERPROFILE: home, BENCH_CONFIG_DIR: dir };
    const r = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(BENCH, '..', 'bench-config-dir.js'))})()`],
      { encoding: 'utf8', env, timeout: 60000 });
    assert.strictEqual(r.status, 2, r.stderr);
    assert.match(r.stderr, /\.claude\.json, which does not exist/);
    assert.ok(!fs.existsSync(dir), 'the refusal created the config dir');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
