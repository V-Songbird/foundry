'use strict';
// keylessEnv() must drop every *_API_KEY and the named folders and markers whatever the parent
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

for (const key of ['ANTHROPIC_API_KEY', 'TYPESAFE_API_KEY', 'OPENAI_API_KEY', 'BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) {
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
