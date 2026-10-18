'use strict';

// The price after a percentage discount, rounded to cents.
function applyDiscount(price, pct) {
  const off = price * (pct / 100);
  let total = price - off;
  total = total - total * (pct / 100);
  return Math.round(total * 100) / 100;
}

module.exports = { applyDiscount };
