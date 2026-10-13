'use strict';

// The razor-start arm is a copy of the razor checkout whose drift note rides
// the SessionStart injection instead of every user prompt, so a note run can
// compare the two delivery routes. These tests run the copy's real hooks and
// the runner against a fake claude first on PATH, so no session can start.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildSessionStartArm } = require('../runner/run.js');

const BENCH = path.resolve(__dirname, '..');
const RAZOR = process.env.RAZOR_DIR ? path.resolve(process.env.RAZOR_DIR) : require('../../paths.js').pluginDir('razor');
const FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-start-arm-'));
after(() => fs.rmSync(FIXTURE, { recursive: true, force: true }));

const { RULESET, DRIFT_NOTE } = require(path.join(RAZOR, 'hooks', 'razor-lib.js'));

function hook(root, name, input, extra = {}) {
  const env = { CLAUDE_PLUGIN_DATA: path.join(FIXTURE, 'state'), ...extra };
  for (const [k, v] of Object.entries(process.env)) {
    if (!/^(RAZOR_|CLAUDE_PLUGIN_|NODE_TEST_CONTEXT$)/.test(k) && !(k in env)) env[k] = v;
  }
  const r = spawnSync(process.execPath, [path.join(root, 'hooks', name)],
    { input: JSON.stringify(input), encoding: 'utf8', env, timeout: 30000 });
  assert.ifError(r.error);
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout;
}

const cwd = fs.mkdtempSync(path.join(FIXTURE, 'ws-'));
const start = { session_id: 'arm-s1', cwd };
const prompt = { session_id: 'arm-s1', cwd, prompt: 'Now something else entirely: write csv.js.' };

test('the copy delivers the drift note at SessionStart and on no later prompt', () => {
  const before = fs.readFileSync(path.join(RAZOR, 'hooks', 'mode-toggle.js'), 'utf8');
  const arm = buildSessionStartArm(RAZOR, path.join(FIXTURE, 'arm'));
  assert.strictEqual(fs.readFileSync(path.join(RAZOR, 'hooks', 'mode-toggle.js'), 'utf8'), before, 'razor checkout changed');
  assert.strictEqual(fs.existsSync(path.join(arm, '.git')), false);
  assert.ok(fs.existsSync(path.join(arm, '.claude-plugin', 'plugin.json')));

  assert.strictEqual(hook(arm, 'session-start.js', start), `${RULESET}\n\n${DRIFT_NOTE}`);
  assert.strictEqual(hook(arm, 'mode-toggle.js', prompt), '');
  assert.strictEqual(hook(arm, 'session-start.js', start, { RAZOR_DRIFT_NOTE: 'off' }), RULESET);

  // The shipped razor delivers it the other way round.
  assert.strictEqual(hook(RAZOR, 'session-start.js', start), RULESET);
  assert.strictEqual(hook(RAZOR, 'mode-toggle.js', prompt), DRIFT_NOTE);
});

test('a razor checkout whose hooks moved the edited lines refuses to build', () => {
  const src = path.join(FIXTURE, 'moved');
  fs.mkdirSync(path.join(src, 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(src, 'hooks', 'session-start.js'), "emitContext('SessionStart', LADDER);\n");
  fs.writeFileSync(path.join(src, 'hooks', 'mode-toggle.js'), "emitContext('UserPromptSubmit', DRIFT_NOTE);\n");
  assert.throws(() => buildSessionStartArm(src, path.join(FIXTURE, 'moved-arm')), /session-start\.js no longer holds/);
});

test('--arms razor-start builds the copy in the run folder and loads it', () => {
  const bin = path.join(FIXTURE, 'bin');
  const config = path.join(FIXTURE, 'config');
  const runs = path.join(FIXTURE, 'runs');
  fs.mkdirSync(bin);
  fs.mkdirSync(config);
  fs.writeFileSync(path.join(config, '.claude.json'), '{}'); // already seeded: nothing is copied from ~/.claude
  const argsFile = path.join(bin, 'args.json');
  const stream = [
    { type: 'system', subtype: 'init', model: 'claude-test-model', session_id: 's1' },
    { type: 'result', subtype: 'success', is_error: false, result: 'done', total_cost_usd: 0, num_turns: 1,
      duration_ms: 10, session_id: 's1', usage: { input_tokens: 1, output_tokens: 1 } },
  ].map((o) => JSON.stringify(o)).join('\n') + '\n';
  const fake = path.join(bin, 'fake-claude.js');
  fs.writeFileSync(fake, `if (process.argv.includes('--version')) { console.log('0.0.0 (fake)'); return; }\n`
    + `require('fs').writeFileSync(${JSON.stringify(argsFile)}, JSON.stringify(process.argv.slice(2)));\n`
    + `process.stdout.write(${JSON.stringify(stream)});\n`);
  fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
  fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`, { mode: 0o755 });
  const env = { ...process.env, RAZOR_DIR: RAZOR, RAZOR_BENCH_RUNS: runs, RAZOR_BENCH_ALLOW_TEMP: '1', BENCH_CONFIG_DIR: config };
  for (const k of ['CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  env[pathKey] = `${bin}${path.delimiter}${env[pathKey] || ''}`;

  const r = spawnSync(process.execPath, [path.join(BENCH, 'runner', 'run.js'),
    '--task', 'oh-question', '--arms', 'razor-start', '--runs', '1', '--workers', '1'],
  { cwd: BENCH, encoding: 'utf8', env, timeout: 120000 });
  assert.ifError(r.error);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const [stamp] = fs.readdirSync(runs);
  const arm = path.join(runs, stamp, '_arms', 'razor-start');
  const res = JSON.parse(fs.readFileSync(path.join(runs, stamp, 'results.json'), 'utf8'));
  assert.strictEqual(res.arms['razor-start'], arm);
  const args = JSON.parse(fs.readFileSync(argsFile, 'utf8'));
  assert.strictEqual(path.resolve(args[args.indexOf('--plugin-dir') + 1]), arm);
  assert.strictEqual(hook(arm, 'mode-toggle.js', prompt), '');
});
