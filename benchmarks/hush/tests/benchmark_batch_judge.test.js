'use strict';

// Batches judge plumbing (batch-judge.js) and the parity comparison
// (runner/judge-parity.js). All offline: fetch is replaced so any network
// call fails the test, and no key is needed.

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const {
  MAX_TOKENS, modelId, buildRequests, estimate, parseResults, runBatch,
} = require('../../batch-judge.js');
const { agreement, armShares, storedVerdicts } = require('../runner/judge-parity.js');

const items = [{ prompt: 'a'.repeat(300) }, { prompt: 'b'.repeat(600) }];

describe('requests and estimate', () => {
  test('aliases map to current ids and unknown ids pass through', () => {
    assert.strictEqual(modelId('sonnet'), 'claude-sonnet-5-5');
    assert.strictEqual(modelId('claude-opus-5-5'), 'claude-opus-5-5');
  });

  test('each request keeps the prompt unchanged and is keyed by index', () => {
    const reqs = buildRequests(items, 'claude-sonnet-5-5');
    assert.deepStrictEqual(reqs.map((r) => r.custom_id), ['j0', 'j1']);
    assert.strictEqual(reqs[1].params.messages[0].content, items[1].prompt);
    assert.strictEqual(reqs[0].params.max_tokens, MAX_TOKENS);
  });

  test('a schema becomes structured output; no schema sends none', () => {
    const { VERDICTS_SCHEMA } = require('../runner/retention.js');
    const [plain, shaped] = buildRequests([items[0], { ...items[1], schema: VERDICTS_SCHEMA }], 'claude-sonnet-5-5');
    assert.strictEqual(plain.params.output_config, undefined);
    assert.deepStrictEqual(shaped.params.output_config, { format: { type: 'json_schema', schema: VERDICTS_SCHEMA } });
  });

  test('worst case charges every reply at max_tokens, at half price', () => {
    const e = estimate(items, 'claude-sonnet-5-5');
    assert.strictEqual(e.inputTokens, 300);
    const want = ((300 * 2 + 2 * MAX_TOKENS * 10) / 1e6) * 0.5;
    assert.ok(Math.abs(e.worstUsd - want) < 1e-12);
  });

  test('a model with no price is refused', () => {
    assert.throws(() => estimate(items, 'claude-unknown'), /no price/);
  });
});

describe('runBatch guards', () => {
  let realFetch, savedKey;
  beforeEach(() => {
    realFetch = global.fetch;
    global.fetch = () => { throw new Error('network call in an offline test'); };
    savedKey = process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    global.fetch = realFetch;
    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedKey;
  });

  test('without go it returns the plan and sends nothing', async () => {
    const out = await runBatch(items, { model: 'sonnet' });
    assert.strictEqual(out.plan.requests, 2);
    assert.strictEqual(out.results, undefined);
  });

  test('a paid run needs a cap', async () => {
    await assert.rejects(runBatch(items, { go: true }), /max-usd is required/);
  });

  test('a worst case above the cap is refused before any request', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    await assert.rejects(runBatch(items, { go: true, maxUsd: 0.001 }), /nothing was sent/);
  });

  test('a missing key is refused before any request', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await assert.rejects(runBatch(items, { go: true, maxUsd: 100 }), /ANTHROPIC_API_KEY is not set/);
  });
});

describe('parseResults', () => {
  const ok = (id, text, stop = 'end_turn') => JSON.stringify({
    custom_id: id,
    result: {
      type: 'succeeded',
      message: {
        stop_reason: stop,
        content: [{ type: 'thinking', thinking: '' }, { type: 'text', text }],
        usage: { input_tokens: 1000, output_tokens: 100 },
      },
    },
  });

  test('results arrive out of order and land by custom_id; thinking blocks are skipped', () => {
    const out = parseResults([ok('j1', 'second'), ok('j0', 'first')].join('\n'), 2, 'claude-sonnet-5-5');
    assert.strictEqual(out[0].text, 'first');
    assert.strictEqual(out[1].text, 'second');
    assert.ok(Math.abs(out[0].costUsd - ((1000 * 2 + 100 * 10) / 1e6) * 0.5) < 1e-12);
  });

  test('errored, truncated and missing results are errors, never text', () => {
    const errored = JSON.stringify({ custom_id: 'j0', result: { type: 'errored', error: { type: 'invalid_request' } } });
    const out = parseResults([errored, ok('j1', 'cut', 'max_tokens')].join('\n'), 3, 'claude-sonnet-5-5');
    assert.match(out[0].error, /^errored/);
    assert.match(out[1].error, /max_tokens/);
    assert.match(out[2].error, /no result/);
    assert.ok(out.every((r) => r.text === undefined));
  });
});

describe('parity comparison', () => {
  test('agreement counts matching positions and skips missing verdicts', () => {
    const a = [[true, false], null, [true]];
    const b = [[true, true], [false], [true]];
    assert.deepStrictEqual(agreement(a, b), { agree: 2, total: 3, pct: (100 * 2) / 3 });
  });

  test('arm shares pool every verdict of an arm', () => {
    const recs = [{ arm: 'x' }, { arm: 'x' }, { arm: 'y' }];
    const s = armShares(recs, [[true, false], [true, true], [false]]);
    assert.strictEqual(s.x.pct, 75);
    assert.strictEqual(s.y.pct, 0);
  });

  test('stored answerable rows must line up with the records', () => {
    const recs = [{ arm: 'x', task: 't1', key: 'k', batchId: 'b' }];
    assert.throws(() => storedVerdicts(recs, [{ arm: 'y', task: 't1' }], {}, 'sonnet'), /record is/);
    assert.throws(() => storedVerdicts(recs, [], {}, 'sonnet'), /0 answerable rows/);
  });
});
