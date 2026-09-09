'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { pluralize } = require('../src/pluralize.js');

test('pluralize leaves a singular count alone', () => {
  assert.strictEqual(pluralize('cat', 1), 'cat');
});

test('pluralize handles consonant-y nouns', () => {
  assert.strictEqual(pluralize('city', 3), 'cities');
});

test('pluralize adds -es after a sibilant ending', () => {
  assert.strictEqual(pluralize('box', 2), 'boxes');
});

test('pluralize adds plain -s otherwise', () => {
  assert.strictEqual(pluralize('cat', 2), 'cats');
});
