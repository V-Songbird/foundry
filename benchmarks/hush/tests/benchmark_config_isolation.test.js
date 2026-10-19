'use strict';

// A hush cell used to read the operator's saved ~/.claude/hush/config.json,
// because cleanEnv strips HUSH_* and only fidelity cells set HUSH_CONFIG_FILE.
// A fake claude first on PATH records the HUSH_CONFIG_FILE and file contents
// each cell sees, so no session starts.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BENCH = path.resolve(__dirname, '..');
const FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-config-iso-'));
after(() => fs.rmSync(FIXTURE, { recursive: true, force: true }));

test('hush and baseline cells never see the home config', () => {
  const bin = path.join(FIXTURE, 'bin');
  const config = path.join(FIXTURE, 'config');
  const home = path.join(FIXTURE, 'home');
  fs.mkdirSync(bin);
  fs.mkdirSync(config);
  fs.mkdirSync(path.join(home, '.claude', 'hush'), { recursive: true });
  fs.writeFileSync(path.join(config, '.claude.json'), '{}');
  fs.writeFileSync(path.join(home, '.claude', 'hush', 'config.json'), '{"checks":"off"}');
  const log = path.join(bin, 'seen.jsonl');
  const fake = path.join(bin, 'fake-claude.js');
  fs.writeFileSync(fake, `const fs = require('fs');\nconst f = process.env.HUSH_CONFIG_FILE;\n`
    + `fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ f: f || null, body: f && fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null }) + '\\n');\n`
    + `process.exitCode = 1;\n`);
  fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
  fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`, { mode: 0o755 });

  const env = { ...process.env, BENCH_DATA_DIR: path.join(FIXTURE, 'data'), BENCH_CONFIG_DIR: config,
    HOME: home, USERPROFILE: home, TEMP: FIXTURE, TMP: FIXTURE, TMPDIR: FIXTURE }; // the cells' workspaces land in this fixture
  for (const k of ['CLAUDE_CONFIG_DIR', 'HUSH_CONFIG_FILE', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  env[pathKey] = `${bin}${path.delimiter}${env[pathKey] || ''}`;
  const r = spawnSync(process.execPath, [path.join(BENCH, 'runner', 'run.js'), '--tag', `config-iso-${process.pid}`,
    '--tasks', 'log-triage', '--arms', 'baseline,hush', '--reps', '1', '--concurrency', '1'],
  { cwd: BENCH, encoding: 'utf8', env, timeout: 120000 });
  assert.ifError(r.error);
  assert.ok(fs.existsSync(log), r.stderr + r.stdout);
  const seen = fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.strictEqual(seen.length, 2, r.stderr);
  const hush = seen.find((s) => s.f);
  assert.ok(hush, 'the hush cell set no HUSH_CONFIG_FILE');
  assert.strictEqual(hush.body, '{}');
  assert.ok(!hush.f.startsWith(home), 'the config file sits under the home folder');
  assert.strictEqual(seen.filter((s) => !s.f).length, 1, 'baseline loads no plugin and needs no file');
});
