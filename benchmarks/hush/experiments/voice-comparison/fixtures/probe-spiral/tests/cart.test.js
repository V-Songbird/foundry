'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { cartTotal, applyDiscount } = require('../lib/cart.js');

test('cartTotal sums line totals', () => {
  const items = [
    { sku: 'a', price: 10, qty: 2 },
    { sku: 'b', price: 5, qty: 1 },
  ];
  assert.strictEqual(cartTotal(items), 25);
});

test('cartTotal of empty cart is 0', () => {
  assert.strictEqual(cartTotal([]), 0);
});

test('applyDiscount rounds to cents', () => {
  assert.strictEqual(applyDiscount(25, 10), 22.5);
});
