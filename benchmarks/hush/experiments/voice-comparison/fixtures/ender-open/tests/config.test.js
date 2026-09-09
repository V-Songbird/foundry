'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

test('config loads when STRIPE_KEY is set', () => {
  process.env.STRIPE_KEY = 'sk_test_123';
  const config = require('../src/config.js');
  assert.strictEqual(config.stripeKey, 'sk_test_123');
});

test('defaults apply for optional vars', () => {
  const config = require('../src/config.js');
  assert.strictEqual(config.logLevel, 'info');
});
