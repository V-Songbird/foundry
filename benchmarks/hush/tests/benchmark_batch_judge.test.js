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
    await assert.rejects(runBatch(items, { go: true }), /usage: --max-usd needs a positive number of USD, got nothing/);
  });

  test('a cap that is not a number is refused, not coerced', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    global.fetch = async () => { throw new Error('no request expected'); };
    for (const maxUsd of ['5', true]) {
      await assert.rejects(runBatch(items, { go: true, maxUsd }), new RegExp(`usage: --max-usd needs a positive number of USD, got ${maxUsd}$`), String(maxUsd));
    }
  });

  test('a cap that is not a finite number above 0 is refused before any request', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    global.fetch = async () => { throw new Error('no request expected'); };
    for (const maxUsd of [Infinity, 1e999, NaN, 0, -1]) {
      await assert.rejects(runBatch(items, { go: true, maxUsd }), new RegExp(`usage: --max-usd needs a positive number of USD, got ${maxUsd}$`), String(maxUsd));
    }
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

describe('answerable on Batches', () => {
  const { ANSWERS_SCHEMA, ABSENT, parseAnswers } = require('../runner/answerable.js');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { keylessEnv } = require('../../test-env.js');
  const BENCH = path.resolve(__dirname, '..');
  const TASK = JSON.parse(fs.readFileSync(path.join(BENCH, 'tasks.json'), 'utf8'))[0].id;

  test('the schema asks for exactly A1, A2 and A3 as strings', () => {
    assert.deepStrictEqual(ANSWERS_SCHEMA.required, ['A1', 'A2', 'A3']);
    assert.strictEqual(ANSWERS_SCHEMA.additionalProperties, false);
    const [req] = buildRequests([{ prompt: 'p', schema: ANSWERS_SCHEMA }], 'claude-sonnet-5-5');
    assert.deepStrictEqual(req.params.output_config.format.schema, ANSWERS_SCHEMA);
  });

  test('the schema JSON parses like the line format; a blank field is absent', () => {
    const json = JSON.stringify({ A1: 'The build broke', A2: ' ', A3: `${ABSENT}` });
    assert.deepStrictEqual(parseAnswers(json), ['The build broke', ABSENT, ABSENT]);
    assert.deepStrictEqual(parseAnswers('A1: one\nA2: two\nA3: three'), ['one', 'two', 'three']);
  });

  // Runs the shipped script with fetch replaced by a preload: a plan must not
  // call it at all, and a --go run gets a canned batch back.
  function run(args, env = {}) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-answerable-batch-'));
    const records = path.join(tmp, 'records');
    fs.mkdirSync(records);
    fs.writeFileSync(path.join(records, 'r1.json'), JSON.stringify({ arm: 'hush', task: TASK, finalText: 'Fixed it.' }));
    const sent = path.join(tmp, 'sent.json');
    const reply = JSON.stringify({ A1: 'It was fixed', A2: 'src/a.js', A3: 'Nothing left to do' });
    const preload = path.join(tmp, 'fetch-stub.js');
    fs.writeFileSync(preload, `
      const fs = require('node:fs');
      global.fetch = async (url, init = {}) => {
        if (!process.env.STUB_GO) throw new Error('network call in a plan-only run');
        let body = '';
        if (init.method === 'POST') { fs.writeFileSync(${JSON.stringify(sent)}, init.body); body = JSON.stringify({ id: 'msgbatch_test', processing_status: 'ended' }); }
        else body = JSON.stringify({ custom_id: 'j0', result: { type: 'succeeded', message: { stop_reason: 'end_turn',
          content: [{ type: 'text', text: ${JSON.stringify(reply)} }], usage: { input_tokens: 500, output_tokens: 50 } } } });
        return { ok: true, status: 200, text: async () => body };
      };`);
    const full = keylessEnv({ BENCH_DATA_DIR: tmp, ...env });
    const r = spawnSync(process.execPath, ['--require', preload, path.join(BENCH, 'runner', 'answerable.js'), '--records', records, ...args],
      { cwd: BENCH, encoding: 'utf8', env: full, timeout: 60000 });
    const published = path.join(records, 'published', 'answerable.md');
    const out = {
      ...r,
      sent: fs.existsSync(sent) ? JSON.parse(fs.readFileSync(sent, 'utf8')) : null,
      published: fs.existsSync(published) ? fs.readFileSync(published, 'utf8') : null,
    };
    fs.rmSync(tmp, { recursive: true, force: true });
    return out;
  }

  test('a run without --go plans on Batches and sends nothing', () => {
    const out = run([]);
    assert.strictEqual(out.status, 0, out.stderr);
    assert.match(out.stdout, /claude-sonnet-5-5@batch/);
    assert.match(out.stdout, /instrument: Batches API judge/);
    assert.match(out.stdout, /worst case \$/);
    assert.match(out.stdout, /plan only/);
    assert.strictEqual(out.sent, null);
    assert.strictEqual(out.published, null);
  });

  test('--cli plans the claude -p judge and builds no batch', () => {
    const out = run(['--cli']);
    assert.strictEqual(out.status, 0, out.stderr);
    assert.match(out.stdout, /instrument: claude -p judge/);
    assert.doesNotMatch(out.stdout, /@batch|worst case/);
  });

  test('a --go run sends the schema and labels rows, report and published file', () => {
    const tmpRows = path.join(os.tmpdir(), `hush-answerable-rows-${process.pid}.jsonl`);
    try {
      const out = run(['--go', '--max-usd', '1', '--save', tmpRows], { STUB_GO: '1', ANTHROPIC_API_KEY: 'test-key' });
      assert.strictEqual(out.status, 0, out.stderr);
      assert.deepStrictEqual(out.sent.requests[0].params.output_config.format.schema, ANSWERS_SCHEMA);
      assert.match(out.stdout, /judge: claude-sonnet-5-5@batch; instrument: Batches API judge/);
      assert.match(out.published, /judged on claude-sonnet-5-5@batch/);
      assert.match(out.published, /Instrument: Batches API judge/);
      const row = JSON.parse(fs.readFileSync(tmpRows, 'utf8'));
      assert.strictEqual(row.judge, 'claude-sonnet-5-5@batch');
      assert.deepStrictEqual(row.perQuestion, [true, true, true]);
    } finally {
      fs.rmSync(tmpRows, { force: true });
    }
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
