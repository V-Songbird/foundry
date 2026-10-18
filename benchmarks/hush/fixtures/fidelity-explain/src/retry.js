'use strict';

// Retry a failing call with exponential backoff.

// The wait before each retry, in milliseconds: base, then twice that, and so on.
function delays(attempts, base = 100) {
  const out = [];
  for (let i = 0; i < attempts; i++) out.push(base * 2 ** i);
  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(call, attempts = 5) {
  let lastError;
  for (const wait of [0, ...delays(attempts)]) {
    if (wait) await sleep(wait);
    try {
      return await call();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

module.exports = { delays, withRetry };
