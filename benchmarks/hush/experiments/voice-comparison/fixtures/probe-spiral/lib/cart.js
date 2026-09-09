'use strict';

// Shopping cart totals. Items: [{ sku, price, qty }]

function lineTotal(item) {
  return item.price * item.qty;
}

function cartTotal(items) {
  let sum = 0;
  for (const item of items) {
    sum += lineTotal(item);
  }
  return sum;
}

function applyDiscount(total, percent) {
  return Math.round(total * (1 - percent / 100) * 100) / 100;
}

module.exports = { cartTotal, applyDiscount, lineTotal };
