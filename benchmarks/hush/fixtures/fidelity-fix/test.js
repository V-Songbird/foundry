'use strict';

const { applyDiscount } = require('./src/discount.js');

const cases = [
  [100, 10, 90],
  [80, 25, 60],
  [19.99, 0, 19.99],
  [50, 100, 0],
];

let passed = 0;
for (const [price, pct, want] of cases) {
  const got = applyDiscount(price, pct);
  if (got === want) passed++;
  else console.log(`FAIL applyDiscount(${price}, ${pct}) returned ${got}, expected ${want}`);
}
console.log(`${passed} of ${cases.length} pass`);
process.exitCode = passed === cases.length ? 0 : 1;
