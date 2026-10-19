'use strict';

// When the login copied into BENCH_CONFIG_DIR has expired, every session
// answers "Login expired · Run /login ..." as an error result with non-empty
// stdout. The runner used to keep sending a multi-prompt task's --continue
// calls and keep starting cells; now it stops after the first such call, names
// BENCH_CONFIG_DIR, and hillclimb files the attempt as auth_error. A fake
// claude first on PATH answers every call that way, so no session can start.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..');
const FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-login-lost-'));
after(() => fs.rmSync(FIXTURE, { recursive: true, force: true }));

const line = (o) => JSON.stringify(o);
const TEXT = 'Login expired · Run /login to sign in again, or re-authenticate your Anthropic profile';
const STREAM = [
  line({ type: 'system', subtype: 'init', model: 'claude-test-model', session_id: 's1' }),
  line({ type: 'assistant', message: { model: '<synthetic>', content: [{ type: 'text', text: TEXT }] }, error: 'invalid_request', is_api_error_message: true }),
  line({ type: 'result', subtype: 'success', is_error: true, terminal_reason: 'api_error', api_error_status: null,
    result: TEXT, total_cost_usd: 0, num_turns: 1, duration_ms: 2600, session_id: 's1',
    usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }),
].join('\n') + '\n';

test('a lost login stops the chain and the batch after one call', () => {
  const bin = path.join(FIXTURE, 'bin');
  const data = path.join(FIXTURE, 'data');
  const config = path.join(FIXTURE, 'config');
  fs.mkdirSync(bin);
  fs.mkdirSync(config);
  fs.writeFileSync(path.join(config, '.claude.json'), '{}'); // already seeded: nothing is copied from ~/.claude
  const calls = path.join(bin, 'calls.txt');
  const fake = path.join(bin, 'fake-claude.js');
  fs.writeFileSync(fake, `require('fs').appendFileSync(${JSON.stringify(calls)}, 'x');\n`
    + `process.stdout.write(${JSON.stringify(STREAM)});\nprocess.exitCode = 1;\n`);
  fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
  fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`, { mode: 0o755 });

  // The temp variables put the cell's workspace under this fixture, removed after the suite.
  const env = { ...process.env, BENCH_DATA_DIR: data, BENCH_CONFIG_DIR: config, TEMP: FIXTURE, TMP: FIXTURE, TMPDIR: FIXTURE };
  for (const k of ['CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  env[pathKey] = `${bin}${path.delimiter}${env[pathKey] || ''}`;
  // Two multi-prompt tasks: without the stop, the first sends all its prompts
  // and the second cell starts as well.
  const tag = `login-lost-${process.pid}`;
  const r = spawnSync(process.execPath, [path.join(BENCH, 'runner', 'run.js'), '--tag', tag,
    '--tasks', 'feature-drift,incident-forensics', '--arms', 'baseline', '--reps', '1', '--concurrency', '1'],
  { cwd: BENCH, encoding: 'utf8', env, timeout: 120000 });
  assert.ifError(r.error);
  assert.strictEqual(fs.readFileSync(calls, 'utf8'), 'x', 'calls sent after the lost login');
  assert.strictEqual(r.status, 1, r.stderr);
  assert.match(r.stderr, /feature-drift__baseline__r1 reported a lost login, so 1 cells were not started/);
  assert.match(r.stderr, /BENCH_CONFIG_DIR/);

  process.env.BENCH_DATA_DIR = data; // read by paths.js when the suite loads
  const suite = require('../runner/hillclimb.js');
  assert.deepStrictEqual(suite.adapt(tag, 'baseline').map((a) => [a.prompt_id, a.stream.failure]),
    [['feature-drift', 'auth_error']]);
});
