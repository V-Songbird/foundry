'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { slugify } = require('../src/slug.js');

test('slugify strips leading/trailing punctuation runs', () => {
  assert.strictEqual(slugify('Hello, World!'), 'hello-world');
});

test('slugify collapses internal punctuation to one hyphen', () => {
  assert.strictEqual(slugify('foo   bar--baz'), 'foo-bar-baz');
});

test('slugify never leaves a trailing hyphen', () => {
  assert.strictEqual(slugify('trailing---'), 'trailing');
});
