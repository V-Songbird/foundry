'use strict';
// The one test of test-env.js for all three suites; only the foreman suite runs it.
// keylessEnv() must drop every *_API_KEY, *_AUTH_TOKEN and *_OAUTH_TOKEN and the named folders and markers whatever the parent
// shell sets and however the name is cased, and keep what a test passes explicitly.
const test = require('node:test');
const assert = require('node:assert/strict');
const { keylessEnv } = require('../../test-env.js');

function withEnv(key, fn) {
  const had = Object.prototype.hasOwnProperty.call(process.env, key);
  const old = process.env[key];
  process.env[key] = 'sentinel';
  try { fn(); } finally { if (had) process.env[key] = old; else delete process.env[key]; }
}

for (const key of ['ANTHROPIC_API_KEY', 'TYPESAFE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) {
  test(`keylessEnv strips ${key} and keeps an explicit extra`, () => {
    withEnv(key, () => {
      assert.equal(keylessEnv()[key], undefined);
      assert.equal(keylessEnv({ [key]: 'on-purpose' })[key], 'on-purpose');
    });
  });
}

test('keylessEnv strips a mixed-case *_API_KEY that no shell sets', () => {
  withEnv('Bench_Probe_Api_Key', () => {
    assert.deepEqual(Object.keys(keylessEnv()).filter((k) => k.toUpperCase() === 'BENCH_PROBE_API_KEY'), []);
  });
});

// GITHUB_TOKEN and GH_TOKEN pass through: neither reaches a paid model provider, and a spawned git or gh may need them.
for (const key of ['GITHUB_TOKEN', 'GH_TOKEN']) {
  test(`keylessEnv keeps ${key}`, () => {
    withEnv(key, () => assert.equal(keylessEnv()[key], 'sentinel'));
  });
}

test('keylessEnv leaves one spelling of a variable an extra replaces', () => {
  withEnv('Bench_Probe_Path', () => {
    const env = keylessEnv({ BENCH_PROBE_PATH: 'x' });
    assert.deepEqual(Object.keys(env).filter((k) => k.toUpperCase() === 'BENCH_PROBE_PATH'), ['BENCH_PROBE_PATH']);
  });
});
