'use strict';

// The foreman runner's --sdk flag sends every session through the Agent SDK
// (benchmarks/sdk-session.js) instead of claude -p. A preload replaces the
// SDK's query with a fake, so no session starts and nothing is billed; a fake
// claude first on PATH proves claude -p is never spawned under --sdk. The trio
// arm carries two plugins and a settings file, the most a foreman arm passes.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..');
const RUN = path.join(BENCH, 'runner', 'run.js');
const SDK_SESSION = path.resolve(__dirname, '../../sdk-session.js');
const { pluginDir } = require('../../paths.js');
const { keylessEnv } = require('../../test-env.js');
const FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), 'foreman-sdk-session-'));
const TAG = `sdk-${process.pid}`;
after(() => {
  fs.rmSync(FIXTURE, { recursive: true, force: true });
  fs.rmSync(path.join(os.tmpdir(), 'foreman-bench', TAG), { recursive: true, force: true });
});

const STREAM = [
  { type: 'system', subtype: 'init', model: 'claude-test-model', session_id: 's1', output_style: 'default' },
  { type: 'assistant', message: { model: 'claude-test-model', content: [{ type: 'text', text: 'done' }] }, session_id: 's1' },
  { type: 'result', subtype: 'success', is_error: false, result: 'done', total_cost_usd: 0.25, num_turns: 2,
    duration_ms: 10, session_id: 's1', usage: { input_tokens: 1, output_tokens: 1 } },
];

// Logs the options a session would get, never options.env, which carries this
// process's environment.
// With `missing`, loadSdk rejects the way a missing package does.
function writePreload(dir, log, stream = STREAM, missing = false) {
  const file = path.join(dir, 'fake-sdk.js');
  fs.writeFileSync(file, `const fs = require('fs');
const s = require(${JSON.stringify(SDK_SESSION)});
s.loadSdk = ${missing ? "async () => { throw new Error('Cannot find package'); }" : `async () => ({ query: async function* ({ prompt, options: o }) {
  fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ prompt, cwd: o.cwd, model: o.model, maxTurns: o.maxTurns,
    permissionMode: o.permissionMode, settingSources: o.settingSources, plugins: o.plugins, settings: o.settings,
    hasKey: Boolean(o.env && o.env.ANTHROPIC_API_KEY) }) + '\\n');
  for (const m of ${JSON.stringify(stream)}) yield m;
} })`};
`);
  return file;
}

function runForeman(name, key, args, stream, missing = false) {
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
  const env = keylessEnv({ BENCH_DATA_DIR: data, BENCH_CONFIG_DIR: config });
  if (key) env.ANTHROPIC_API_KEY = key;
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  env[pathKey] = `${bin}${path.delimiter}${env[pathKey] || ''}`;
  const r = spawnSync(process.execPath, ['-r', writePreload(dir, log, stream, missing), RUN, ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 300000 });
  assert.ifError(r.error);
  return { r, data, calls, log };
}

const LIVE = ['--sdk', '--tag', TAG, '--tasks', 'api-constraint', '--arms', 'trio', '--reps', '1', '--concurrency', '1'];

test('the foreman runner sends every session through the Agent SDK under --sdk', () => {
  const { r, data, calls, log } = runForeman('live', 'test-not-a-key', LIVE);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(calls), 'claude -p was spawned under --sdk');
  const seen = fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.strictEqual(seen.length, 1);
  const s = seen[0];
  const hushDir = process.env.HUSH_PLUGIN_DIR ? path.resolve(process.env.HUSH_PLUGIN_DIR) : pluginDir('hush');
  const razorDir = process.env.RAZOR_PLUGIN_DIR ? path.resolve(process.env.RAZOR_PLUGIN_DIR) : pluginDir('razor');
  assert.deepStrictEqual(s.plugins, [{ type: 'local', path: hushDir }, { type: 'local', path: razorDir }]);
  assert.ok(s.settings.endsWith('settings-trio.json'), s.settings);
  const config = JSON.parse(fs.readFileSync(path.join(BENCH, 'config.json'), 'utf8'));
  assert.deepStrictEqual([s.maxTurns, s.permissionMode, s.settingSources, s.hasKey],
    [config.maxTurns, 'acceptEdits', ['project'], true]);
  assert.strictEqual(s.prompt, fs.readFileSync(path.join(BENCH, 'fixtures', 'api-constraint', 'prompts', 'foreman.md'), 'utf8'));

  // The fake session edits nothing, so the record's check fails; it still names the SDK path.
  const rec = JSON.parse(fs.readFileSync(path.join(data, 'foreman', 'results', TAG, 'runs', 'api-constraint__trio__r1.json'), 'utf8'));
  assert.deepStrictEqual([rec.costUsd, rec.session], [0.25, 'agent-sdk'], JSON.stringify(rec).slice(0, 400));
});

test('a foreman --sdk record that fails to parse still names the session path', () => {
  // A null content block makes parseTranscript throw, so the runner writes its error record.
  const broken = [STREAM[0], { type: 'assistant', message: { content: [null] } }, STREAM[2]];
  const { r, data } = runForeman('broken', 'test-not-a-key', LIVE, broken);
  assert.strictEqual(r.status, 0, r.stderr);
  const rec = JSON.parse(fs.readFileSync(path.join(data, 'foreman', 'results', TAG, 'runs', 'api-constraint__trio__r1.json'), 'utf8'));
  assert.ok(rec.error, JSON.stringify(rec).slice(0, 400));
  assert.strictEqual(rec.session, 'agent-sdk');
});

test('sdkVersion names the installed SDK build, not the package.json pin', () => {
  const dir = path.join(FIXTURE, 'version');
  const pkg = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-agent-sdk');
  fs.mkdirSync(pkg, { recursive: true });
  fs.copyFileSync(SDK_SESSION, path.join(dir, 'sdk-session.js'));
  fs.copyFileSync(path.join(path.dirname(SDK_SESSION), 'flags.js'), path.join(dir, 'flags.js'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { '@anthropic-ai/claude-agent-sdk': '0.0.1' } }));
  fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: '@anthropic-ai/claude-agent-sdk', version: '0.0.2' }));
  assert.strictEqual(require(path.join(dir, 'sdk-session.js')).sdkVersion(), '0.0.2');
});

test('the foreman runner refuses --sdk without ANTHROPIC_API_KEY before any session', () => {
  const { r, calls, log } = runForeman('nokey', null, LIVE);
  assert.strictEqual(r.status, 2, r.stderr);
  assert.match(r.stderr, /ANTHROPIC_API_KEY/);
  assert.ok(!fs.existsSync(log), 'a session started without the key');
  assert.ok(!fs.existsSync(calls), 'claude -p was spawned under --sdk');
});

test('the foreman runner stops at exit 2 when the Agent SDK package is missing, before any session', () => {
  const { r, calls, log } = runForeman('nosdk', 'test-not-a-key', LIVE, undefined, true);
  assert.strictEqual(r.status, 2, r.stderr);
  assert.match(r.stderr, /needs @anthropic-ai\/claude-agent-sdk/);
  assert.ok(!fs.existsSync(log), 'a session started without the SDK');
  assert.ok(!fs.existsSync(calls), 'claude -p was spawned under --sdk');
});

test('a foreman --sdk dry run names the session path', () => {
  const { r } = runForeman('dry', null, ['--dry-run', ...LIVE]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /session: agent-sdk/);
});
