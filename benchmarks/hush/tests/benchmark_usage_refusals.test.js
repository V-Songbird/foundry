'use strict';

// Usage-level refusals in runner/run.js end in the message alone and exit 2,
// not an uncaught Error with a stack trace. Every case is a --dry-run, so no
// session starts.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-usage-refusals-'));
const CONFIG = JSON.parse(fs.readFileSync(path.join(BENCH, 'config.json'), 'utf8'));
after(() => fs.rmSync(DATA, { recursive: true, force: true }));

function run(tag, args, root = BENCH) {
  const env = { ...process.env, BENCH_DATA_DIR: DATA };
  for (const k of ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
  return spawnSync(process.execPath,
    [path.join(root, 'runner', 'run.js'), '--tag', tag, '--dry-run', '--tasks', 'log-triage', ...args],
    { cwd: root, encoding: 'utf8', env, timeout: 60000 });
}

function assertRefused(r, pattern) {
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, pattern);
  assert.ok(!/^\s+at /m.test(r.stderr) && !/Error:/.test(r.stderr), `a stack trace reached stderr:\n${r.stderr}`);
}

test('--resume with no manifest and no --seed is refused with a message', () => {
  assertRefused(run('usage-no-manifest', ['--resume']), /--resume cannot find the seed/);
});

test('--resume on a different hush build is refused with a message', () => {
  const tag = 'usage-mixed-build';
  const first = run(tag, []);
  assert.strictEqual(first.status, 0, first.stderr);
  const [batchId, seed] = first.stdout.match(/batch (\S+) · seed (\S+)/).slice(1, 3);
  const dir = path.join(DATA, 'hush', 'results', tag);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'batch.json'), JSON.stringify({
    batchId, seed, model: CONFIG.model, effort: null, reps: CONFIG.reps,
    arms: ['baseline', 'hush'], tasks: [{ id: 'log-triage' }],
    hush: { head: '0'.repeat(40), dirty: false, version: '0.0.0' },
  }));
  assertRefused(run(tag, ['--resume']), /--resume would mix hush builds/);
});

test('a rival flag given for fewer rivals than are described is refused with a message', () => {
  assertRefused(run('usage-rival-count',
    ['--rival-name', 'a', '--rival-name', 'b', '--rival-settings', 'x.json']), /--rival-settings appears 1 time/);
});

test('a rival named after a built-in arm is refused with a message', () => {
  assertRefused(run('usage-rival-name', ['--rival-name', 'hush', '--rival-dir', 'a']),
    /--rival-name hush is a built-in arm/);
});

test('a task with an unknown segment is refused with a message', () => {
  const top = path.resolve(BENCH, '..');
  for (const f of fs.readdirSync(top)) {
    if (f.endsWith('.js')) fs.copyFileSync(path.join(top, f), path.join(DATA, f));
  }
  fs.cpSync(BENCH, path.join(DATA, 'hush'), { recursive: true, filter: (p) => !p.includes(`${path.sep}tests`) });
  const tasksFile = path.join(DATA, 'hush', 'tasks.json');
  const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
  tasks.find((t) => t.id === 'log-triage').segment = 'no-such-segment';
  fs.writeFileSync(tasksFile, JSON.stringify(tasks));
  assertRefused(run('usage-segment', [], path.join(DATA, 'hush')), /task log-triage has unknown segment "no-such-segment"/);
});
