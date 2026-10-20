'use strict';

// sdk-session.js runs a session through the Agent SDK for the runners' --sdk
// flag. These tests replace its loadSdk() with a fake query, so no SDK session
// starts and nothing is billed: the helper's flag mapping and output, then the
// razor runner's --sdk path and its stop, before any cell, without
// ANTHROPIC_API_KEY, the SDK package or a mapping for a flag. A fake
// claude first on PATH proves claude -p is never spawned under --sdk.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..');
const SDK_SESSION = path.resolve(__dirname, '../../sdk-session.js');
const session = require(SDK_SESSION);
const FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-sdk-session-'));
after(() => fs.rmSync(FIXTURE, { recursive: true, force: true }));

const STREAM = [
  { type: 'system', subtype: 'init', model: 'claude-test-model', session_id: 's1', output_style: 'default' },
  { type: 'assistant', message: { model: 'claude-test-model', content: [{ type: 'text', text: 'done' }] }, session_id: 's1' },
  { type: 'result', subtype: 'success', is_error: false, result: 'done', total_cost_usd: 0.25, num_turns: 2,
    duration_ms: 10, session_id: 's1', usage: { input_tokens: 1, output_tokens: 1 } },
];

// A preload that swaps the SDK for a fake query. It logs the options a session
// would get, never options.env, which carries this process's environment.
// With noSdk, loadSdk fails as the import does before npm ci.
function writePreload(dir, log, noSdk) {
  const file = path.join(dir, 'fake-sdk.js');
  fs.writeFileSync(file, `const fs = require('fs');
const s = require(${JSON.stringify(SDK_SESSION)});
s.loadSdk = async () => ({ query: async function* ({ prompt, options: o }) {
  fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ prompt, cwd: o.cwd, model: o.model, maxTurns: o.maxTurns,
    permissionMode: o.permissionMode, settingSources: o.settingSources, plugins: o.plugins, allowedTools: o.allowedTools,
    disallowedTools: o.disallowedTools, systemPrompt: o.systemPrompt, settings: o.settings, effort: o.effort,
    resume: o.resume, continue: o.continue, hasKey: Boolean(o.env && o.env.ANTHROPIC_API_KEY) }) + '\\n');
  for (const m of ${JSON.stringify(STREAM)}) yield m;
} });
${noSdk ? 's.loadSdk = async () => { throw new Error("Cannot find package \'@anthropic-ai/claude-agent-sdk\'"); };' : ''}
`);
  return file;
}

function writeFakeClaude(bin, calls) {
  fs.mkdirSync(bin, { recursive: true });
  const fake = path.join(bin, 'fake-claude.js');
  fs.writeFileSync(fake, `require('fs').appendFileSync(${JSON.stringify(calls)}, 'x');\n`);
  fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
  fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`, { mode: 0o755 });
}

async function withFakeSdk(query, fn) {
  const real = session.loadSdk;
  session.loadSdk = async () => ({ query });
  try { return await fn(); } finally { session.loadSdk = real; }
}

test('sdkOptions maps a razor cell\'s claude -p flags', () => {
  const o = session.sdkOptions(['-p', '--model', 'claude-sonnet-5', '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project,local', '--strict-mcp-config',
    '--disallowedTools', 'Bash,PowerShell,Agent', '--effort', 'high', '--plugin-dir', '/p/razor',
    '--append-system-prompt', 'Write the code.', '--resume', 's1']);
  assert.deepStrictEqual(o, {
    systemPrompt: { type: 'preset', preset: 'claude_code', append: 'Write the code.' },
    plugins: [{ type: 'local', path: '/p/razor' }],
    model: 'claude-sonnet-5', permissionMode: 'bypassPermissions', allowDangerouslySkipPermissions: true,
    settingSources: ['project', 'local'], strictMcpConfig: true, disallowedTools: ['Bash', 'PowerShell', 'Agent'],
    effort: 'high', resume: 's1',
  });
});

test('sdkOptions maps a hush or foreman session\'s claude -p flags', () => {
  const o = session.sdkOptions(['-p', '--output-format', 'stream-json', '--verbose', '--model', 'sonnet',
    '--max-turns', '60', '--setting-sources', 'project', '--strict-mcp-config', '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read,Edit,Bash', '--disallowedTools', 'Bash(git*),Agent',
    '--plugin-dir', '/p/hush', '--plugin-dir', '/p/razor', '--settings', '/s/settings-trio.json', '--continue']);
  assert.deepStrictEqual(o, {
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    plugins: [{ type: 'local', path: '/p/hush' }, { type: 'local', path: '/p/razor' }],
    model: 'sonnet', maxTurns: 60, settingSources: ['project'], strictMcpConfig: true, permissionMode: 'acceptEdits',
    allowedTools: ['Read', 'Edit', 'Bash'], disallowedTools: ['Bash(git*)', 'Agent'],
    settings: '/s/settings-trio.json', continue: true,
  });
});

test('sdkOptions refuses a flag it has no mapping for', () => {
  assert.throws(() => session.sdkOptions(['-p', '--add-dir', '/x']), /no Agent SDK mapping for --add-dir/);
});

test('sdkOptions refuses a --max-turns that is not a whole number of at least 1', () => {
  for (const bad of ['Infinity', '1e999', 'NaN', 'abc', '0', '-1', '1.5', '']) {
    assert.throws(() => session.sdkOptions(['-p', '--max-turns', bad]), /--max-turns needs a whole number of at least 1/, bad);
  }
  assert.throws(() => session.sdkOptions(['-p', '--max-turns']), /--max-turns needs a whole number of at least 1, got undefined/);
});

test('runSession returns the stream as stream-json lines plus the result fields', async () => {
  const seen = [];
  const r = await withFakeSdk(async function* ({ prompt, options }) {
    seen.push({ prompt, cwd: options.cwd, model: options.model });
    for (const m of STREAM) yield m;
  }, () => session.runSession({ args: ['-p', '--model', 'sonnet'], prompt: 'hi', cwd: FIXTURE, env: {} }));
  assert.deepStrictEqual(r.stdout.trim().split('\n').map((l) => JSON.parse(l)), STREAM);
  assert.deepStrictEqual({ code: r.code, timedOut: r.timedOut, costUsd: r.costUsd, numTurns: r.numTurns,
    resultText: r.resultText, sessionId: r.sessionId },
  { code: 0, timedOut: false, costUsd: 0.25, numTurns: 2, resultText: 'done', sessionId: 's1' });
  assert.deepStrictEqual(seen, [{ prompt: 'hi', cwd: FIXTURE, model: 'sonnet' }]);
});

test('runSession keeps the stream so far when the query throws', async () => {
  const r = await withFakeSdk(async function* () {
    yield STREAM[0];
    throw new Error('boom');
  }, () => session.runSession({ args: [], prompt: 'hi', cwd: FIXTURE, env: {} }));
  assert.strictEqual(r.code, 1);
  assert.match(r.stderr, /boom/);
  assert.deepStrictEqual(r.stdout.trim().split('\n').map((l) => JSON.parse(l)), [STREAM[0]]);
  assert.strictEqual(r.costUsd, null);
});

test('runSession aborts a session past its timeout', async () => {
  const r = await withFakeSdk(async function* ({ options }) {
    await new Promise((resolve, reject) => options.abortController.signal.addEventListener('abort',
      () => reject(new Error('aborted'))));
    yield STREAM[2];
  }, () => session.runSession({ args: [], prompt: 'hi', cwd: FIXTURE, env: {}, timeoutMs: 50 }));
  assert.deepStrictEqual([r.timedOut, r.code], [true, 1]);
  assert.match(r.stderr, /aborted/);
});

test('--sdk is a flag the razor runner reads', () => {
  assert.deepStrictEqual(require('../runner/run.js').unknownFlags(['--sdk']), []);
});

function runRazor(name, key, noSdk) {
  const dir = path.join(FIXTURE, name);
  const bin = path.join(dir, 'bin');
  const config = path.join(dir, 'config');
  const calls = path.join(bin, 'calls.txt');
  const log = path.join(dir, 'sdk-log.jsonl');
  writeFakeClaude(bin, calls);
  fs.mkdirSync(config);
  fs.writeFileSync(path.join(config, '.claude.json'), '{}'); // already seeded: nothing is copied from ~/.claude
  const env = { ...process.env, RAZOR_BENCH_RUNS: path.join(dir, 'runs'), RAZOR_BENCH_ALLOW_TEMP: '1', BENCH_CONFIG_DIR: config };
  for (const k of ['CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD', 'ANTHROPIC_API_KEY']) delete env[k];
  if (key) env.ANTHROPIC_API_KEY = key;
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  env[pathKey] = `${bin}${path.delimiter}${env[pathKey] || ''}`;
  const r = spawnSync(process.execPath, ['-r', writePreload(dir, log, noSdk), path.join(BENCH, 'runner', 'run.js'), '--sdk',
    '--task', 'oh-question', '--arms', 'baseline,razor', '--runs', '1', '--workers', '1'],
  { cwd: BENCH, encoding: 'utf8', env, timeout: 120000 });
  assert.ifError(r.error);
  return { r, dir, calls, log };
}

test('the razor runner sends every cell through the Agent SDK under --sdk', () => {
  const { r, dir, calls, log } = runRazor('live', 'test-not-a-key');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(calls), 'claude -p was spawned under --sdk');
  const seen = fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.strictEqual(seen.length, 2);
  const razorDir = process.env.RAZOR_DIR ? path.resolve(process.env.RAZOR_DIR) : require('../../paths.js').pluginDir('razor');
  const byPlugins = seen.map((s) => s.plugins).sort((a, b) => a.length - b.length);
  assert.deepStrictEqual(byPlugins, [[], [{ type: 'local', path: razorDir }]]);
  for (const s of seen) {
    assert.deepStrictEqual([s.permissionMode, s.settingSources, s.hasKey], ['bypassPermissions', ['project', 'local'], true]);
  }
  const [stamp] = fs.readdirSync(path.join(dir, 'runs'));
  const res = JSON.parse(fs.readFileSync(path.join(dir, 'runs', stamp, 'results.json'), 'utf8'));
  assert.strictEqual(res.session, 'agent-sdk');
  assert.strictEqual(res.claude, `agent-sdk ${session.sdkVersion()}`);
  assert.strictEqual(res.cost_total, 0.5);
});

test('the razor runner refuses --sdk without ANTHROPIC_API_KEY before any session', () => {
  const { r, dir, calls, log } = runRazor('nokey', null);
  assert.strictEqual(r.status, 2, r.stderr);
  assert.match(r.stderr, /ANTHROPIC_API_KEY/);
  assert.ok(!fs.existsSync(log), 'a session started without the key');
  assert.ok(!fs.existsSync(calls), 'claude -p was spawned under --sdk');
  assert.ok(!fs.existsSync(path.join(dir, 'runs')), 'the refusal left a run folder');
});

test('the razor runner stops --sdk without the SDK package before any cell', () => {
  const { r, dir, calls } = runRazor('nosdk', 'test-not-a-key', true);
  assert.strictEqual(r.status, 2, r.stderr);
  assert.match(r.stderr, /npm ci .*Cannot find package '@anthropic-ai\/claude-agent-sdk'/);
  assert.ok(!fs.existsSync(calls), 'claude -p was spawned under --sdk');
  assert.ok(!fs.existsSync(path.join(dir, 'runs')), 'the stop left a run folder');
});

test('prepareSdk stops on a flag with no mapping before any session', async () => {
  const [exit, error] = [process.exit, console.error];
  const said = [];
  let code = null;
  let queried = false;
  process.exit = (c) => { code = c; };
  console.error = (m) => said.push(m);
  try {
    await withFakeSdk(async function* () { queried = true; }, () => session.prepareSdk(
      [['-p', '--model', 'sonnet'], ['-p', '--add-dir', '/x']], { ANTHROPIC_API_KEY: 'test-not-a-key' }));
  } finally {
    [process.exit, console.error] = [exit, error];
  }
  assert.deepStrictEqual([code, queried], [2, false]);
  assert.match(said.join('\n'), /no Agent SDK mapping for --add-dir/);
});
