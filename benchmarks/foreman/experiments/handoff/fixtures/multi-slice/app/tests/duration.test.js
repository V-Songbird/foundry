'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { formatDuration } = require('../src/duration.js');

test('formatDuration floors partial minutes instead of rounding', () => {
  assert.strictEqual(formatDuration(150), '2m 30s');
});

test('formatDuration on a plain two-minute mark', () => {
  assert.strictEqual(formatDuration(125), '2m 5s');
});

test('formatDuration under a minute', () => {
  assert.strictEqual(formatDuration(59), '0m 59s');
});
