'use strict';

// Simulates 20 clients whose first call fails at the same moment, while the
// API is down, and prints when each one retries.
const { delays } = require('./src/retry.js');

const CLIENTS = 20;
const byTime = new Map();
for (let c = 0; c < CLIENTS; c++) {
  let t = 0;
  for (const wait of delays(5)) {
    t += wait;
    byTime.set(t, (byTime.get(t) || 0) + 1);
  }
}

console.log('time (ms)  clients retrying');
for (const [t, n] of [...byTime].sort((a, b) => a[0] - b[0])) console.log(`${String(t).padStart(9)}  ${n}`);
const peak = Math.max(...byTime.values());
console.log(`peak: ${peak} of ${CLIENTS} clients retry in the same millisecond`);
