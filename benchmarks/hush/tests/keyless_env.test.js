'use strict';
// keylessEnv() must drop each paid-provider key and the bench config folder whatever the parent
// shell sets, and keep what a test passes explicitly.
const test = require('node:test');
const assert = require('node:assert/strict');
const { keylessEnv } = require('../../test-env.js');

for (const key of ['ANTHROPIC_API_KEY', 'TYPESAFE_API_KEY', 'BENCH_CONFIG_DIR']) {
  test(`keylessEnv strips ${key} and keeps an explicit extra`, () => {
    const had = Object.prototype.hasOwnProperty.call(process.env, key);
    const old = process.env[key];
    process.env[key] = 'sentinel';
    try {
      assert.equal(keylessEnv()[key], undefined);
      assert.equal(keylessEnv({ [key]: 'on-purpose' })[key], 'on-purpose');
    } finally {
      if (had) process.env[key] = old; else delete process.env[key];
    }
  });
}

test('keylessEnv strips a mixed-case spelling of a stripped name', () => {
  const key = 'Typesafe_Api_Key';
  const had = Object.prototype.hasOwnProperty.call(process.env, key);
  const old = process.env[key];
  process.env[key] = 'sentinel';
  try {
    assert.deepEqual(Object.keys(keylessEnv()).filter((k) => k.toUpperCase() === 'TYPESAFE_API_KEY'), []);
  } finally {
    if (had) process.env[key] = old; else delete process.env[key];
  }
});
