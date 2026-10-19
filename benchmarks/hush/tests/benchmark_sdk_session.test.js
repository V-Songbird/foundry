'use strict';

// The hush runner's --sdk flag sends every session through the Agent SDK
// (benchmarks/sdk-session.js) instead of claude -p. A preload replaces the
// SDK's query with a fake, so no session starts and nothing is billed; a fake
// claude first on PATH proves claude -p is never spawned under --sdk.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..');
const RUN = path.join(BENCH, 'runner', 'run.js');
const SDK_SESSION = path.resolve(__dirname, '../../sdk-session.js');
const FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-sdk-session-'));
after(() => fs.rmSync(FIXTURE, { recursive: true, force: true }));

const STREAM = [
  { type: 'system', subtype: 'init', model: 'claude-test-model', session_id: 's1', output_style: 'default' },
  { type: 'assistant', message: { model: 'claude-test-model', content: [{ type: 'text', text: 'done' }] }, session_id: 's1' },
  { type: 'result', subtype: 'success', is_error: false, result: 'done', total_cost_usd: 0.25, num_turns: 2,
    duration_ms: 10, session_id: 's1', usage: { input_tokens: 1, output_tokens: 1 } },
];

// Logs the options a session would get, never options.env, which carries this
// process's environment.
function writePreload(dir, log) {
  const file = path.join(dir, 'fake-sdk.js');
  fs.writeFileSync(file, `const fs = require('fs');
const s = require(${JSON.stringify(SDK_SESSION)});
s.loadSdk = async () => ({ query: async function* ({ prompt, options: o }) {
  fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ prompt, cwd: o.cwd, model: o.model, maxTurns: o.maxTurns,
    permissionMode: o.permissionMode, settingSources: o.settingSources, plugins: o.plugins, settings: o.settings,
    hasKey: Boolean(o.env && o.env.ANTHROPIC_API_KEY) }) + '\\n');
  for (const m of ${JSON.stringify(STREAM)}) yield m;
} });
`);
  return file;
}

function runHush(name, key, args) {
  const dir = path.join(FIXTURE, name);
  const bin = path.join(dir, 'bin');
  const config = path.join(dir, 'config');
  const calls = path.join(bin, 'calls.txt');
  const log = path.join(dir, 'sdk-log.jsonl');
  fs.mkdirSync(bin, { recursive: true });
  fs.mkdirSync(config);
  fs.writeFileSync(path.join(config, '.claude.json'), '{}'); // already seeded: nothing is copied from ~/.claude
  const fake = path.join(bin, 'fake-claude.js');
  fs.writeFileSync(fake, `require('fs').appendFileSync(${JSON.stringify(calls)}, 'x');\n`);
  fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
  fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`, { mode: 0o755 });

  const data = path.join(dir, 'data');
  const env = { ...process.env, BENCH_DATA_DIR: data, BENCH_CONFIG_DIR: config };
  for (const k of ['CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD', 'ANTHROPIC_API_KEY']) delete env[k];
  if (key) env.ANTHROPIC_API_KEY = key;
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  env[pathKey] = `${bin}${path.delimiter}${env[pathKey] || ''}`;
  const r = spawnSync(process.execPath, ['-r', writePreload(dir, log), RUN, ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 120000 });
  assert.ifError(r.error);
  return { r, data, calls, log };
}

const TAG = `sdk-${process.pid}`;
const LIVE = ['--sdk', '--tag', TAG, '--tasks', 'log-triage', '--arms', 'hush', '--reps', '1', '--concurrency', '1'];

test('the hush runner sends every session through the Agent SDK under --sdk', () => {
  const { r, data, calls, log } = runHush('live', 'test-not-a-key', LIVE);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(calls), 'claude -p was spawned under --sdk');
  const seen = fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.strictEqual(seen.length, 1);
  const hushDir = process.env.HUSH_PLUGIN_DIR ? path.resolve(process.env.HUSH_PLUGIN_DIR) : require('../../paths.js').pluginDir('hush');
  assert.deepStrictEqual(seen[0].plugins, [{ type: 'local', path: hushDir }]);
  assert.ok(seen[0].settings.endsWith('settings-hush.json'), seen[0].settings);
  assert.deepStrictEqual([seen[0].settingSources, seen[0].permissionMode, seen[0].hasKey], [['project'], 'acceptEdits', true]);

  const results = path.join(data, 'hush', 'results', TAG);
  const rec = JSON.parse(fs.readFileSync(path.join(results, 'runs', 'log-triage__hush__r1.json'), 'utf8'));
  assert.deepStrictEqual([rec.costUsd, rec.session], [0.25, 'agent-sdk'], JSON.stringify(rec).slice(0, 400));
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(results, 'batch.json'), 'utf8')).session, 'agent-sdk');
});

test('the hush runner refuses --sdk without ANTHROPIC_API_KEY and leaves no tag folder', () => {
  const { r, data, calls, log } = runHush('nokey', null, LIVE);
  assert.strictEqual(r.status, 2, r.stderr);
  assert.match(r.stderr, /ANTHROPIC_API_KEY/);
  assert.ok(!fs.existsSync(log), 'a session started without the key');
  assert.ok(!fs.existsSync(calls), 'claude -p was spawned under --sdk');
  assert.ok(!fs.existsSync(path.join(data, 'hush', 'results', TAG)), 'the refusal left a tag folder');
});

test('an --sdk batch gets its own batch id, and a claude -p batch keeps its id', () => {
  const plan = (name, ...extra) => {
    const { r } = runHush(name, null, ['--dry-run', '--tag', 'ids', '--seed', '7', '--tasks', 'log-triage', ...extra]);
    assert.strictEqual(r.status, 0, r.stderr);
    return (r.stdout.match(/batch (\S+) · seed/) || [])[1];
  };
  const cli = plan('plan-cli');
  assert.ok(cli, 'no batch line');
  assert.strictEqual(plan('plan-cli-again'), cli);
  assert.notStrictEqual(plan('plan-sdk', '--sdk'), cli);
});
