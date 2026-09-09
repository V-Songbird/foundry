'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert');
const { retry } = require('../src/retry.js');

const noSleep = async () => {};

describe('retry', () => {
  test('returns the first successful result without retrying', async () => {
    let calls = 0;
    const result = await retry(async () => { calls += 1; return 'ok'; }, { sleep: noSleep });
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
  });

  test('retries until success and passes the attempt number', async () => {
    const seen = [];
    const result = await retry(async (attempt) => {
      seen.push(attempt);
      if (attempt < 2) throw new Error('transient');
      return 'recovered';
    }, { attempts: 5, sleep: noSleep });
    assert.equal(result, 'recovered');
    assert.deepEqual(seen, [0, 1, 2]);
  });

  test('throws the last error once attempts are exhausted', async () => {
    let calls = 0;
    await assert.rejects(
      retry(async () => { calls += 1; throw new Error(`fail ${calls}`); }, { attempts: 3, sleep: noSleep }),
      /fail 3/
    );
    assert.equal(calls, 3);
  });

  test('stops immediately when shouldRetry says no', async () => {
    let calls = 0;
    const fatal = new Error('fatal');
    await assert.rejects(
      retry(async () => { calls += 1; throw fatal; }, {
        attempts: 5,
        shouldRetry: (err) => err !== fatal,
        sleep: noSleep,
      }),
      /fatal/
    );
    assert.equal(calls, 1);
  });

  test('backoff delay never exceeds the doubling cap or maxMs', async () => {
    const delays = [];
    await retry(async (attempt) => {
      if (attempt < 3) throw new Error('transient');
      return 'done';
    }, {
      attempts: 4,
      baseMs: 100,
      maxMs: 250,
      sleep: async (ms) => { delays.push(ms); },
    });
    assert.equal(delays.length, 3);
    assert.ok(delays[0] <= 100);
    assert.ok(delays[1] <= 200);
    assert.ok(delays[2] <= 250);
  });

  test('rejects a non-positive or fractional attempts value', async () => {
    for (const attempts of [0, -1, 1.5]) {
      await assert.rejects(retry(async () => 'x', { attempts, sleep: noSleep }), RangeError);
    }
  });
});
