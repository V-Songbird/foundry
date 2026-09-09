'use strict';

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry an async operation with exponential backoff and full jitter.
//
// fn receives the zero-based attempt number. attempts counts every try
// including the first. Delay before retry N is a uniform random draw from
// [0, min(maxMs, baseMs * 2^N)] — full jitter, per the AWS architecture
// blog's recommendation. shouldRetry lets callers stop early on
// non-retryable errors (e.g. 4xx responses). sleep is injectable so tests
// run without real waiting.
async function retry(fn, options = {}) {
  const {
    attempts = 3,
    baseMs = 100,
    maxMs = 5000,
    shouldRetry = () => true,
    sleep = defaultSleep,
  } = options;

  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError(`attempts must be a positive integer, got ${attempts}`);
  }

  let attempt = 0;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (err) {
      attempt += 1;
      if (attempt >= attempts || !shouldRetry(err)) throw err;
      const cap = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
      await sleep(Math.random() * cap);
    }
  }
}

module.exports = { retry };
