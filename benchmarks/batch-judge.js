'use strict';
// One-turn judge prompts on the Message Batches API.
//
// A judge started with `claude -p` bills the Claude Code plan. This sends the
// same prompts to the Batches API instead, which bills the Console API key
// behind ANTHROPIC_API_KEY, at half the Messages price. Nobody waits on a
// judge, so the batch delay costs nothing.
//
// Billing guards:
// - The key comes only from the environment. Load it for one command with
//   `node --env-file=<file>`, never as a global variable: a global key makes
//   Claude Code itself bill the API.
// - The endpoint is fixed. ANTHROPIC_BASE_URL is ignored, so a machine that
//   routes Claude Code elsewhere cannot redirect a judge.
// - A spend cap is required. The worst case (every reply at max_tokens) is
//   checked against it before anything is sent.
// - Every result that did not succeed is returned as an error, never as text.

const fs = require('node:fs');
const { usdCapValueUsage } = require('./flags.js');

const API = 'https://api.anthropic.com/v1/messages/batches';
const HEADERS = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' };

// The aliases the judges already accept, mapped to current model ids.
const MODELS = { sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5', haiku: 'claude-haiku-5-5' };
// USD per million tokens [input, output], list price, from the claude-api
// skill's model table cached 2026-10-06. Batches bill half of it.
const PRICES = {
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
  'claude-haiku-5-5': [0.1, 0.5],
};
const BATCH_DISCOUNT = 0.5;
// Room for adaptive thinking plus a short verdict. A reply that hits it ends
// with stop_reason max_tokens and comes back as an error.
const MAX_TOKENS = 4096;
// Three characters per token over-counts English text, so the estimate errs high.
const CHARS_PER_TOKEN = 3;

const modelId = (alias) => MODELS[alias] || alias;

function priceOf(model) {
  const p = PRICES[model];
  if (!p) throw new Error(`no price for ${model}; add it to PRICES in batch-judge.js`);
  return p;
}

/**
 * items: [{prompt, schema?}]. custom_id is the item's index, so any id string
 * is safe. A schema becomes structured output: the API then returns JSON in
 * that shape instead of whatever the model chose to write.
 */
function buildRequests(items, model) {
  return items.map((it, i) => ({
    custom_id: `j${i}`,
    params: {
      model, max_tokens: MAX_TOKENS, messages: [{ role: 'user', content: it.prompt }],
      ...(it.schema && { output_config: { format: { type: 'json_schema', schema: it.schema } } }),
    },
  }));
}

/** Worst case: every reply runs to max_tokens. */
function estimate(items, model) {
  const [pin, pout] = priceOf(model);
  const inTok = items.reduce((n, it) => n + Math.ceil(it.prompt.length / CHARS_PER_TOKEN), 0);
  const outTok = items.length * MAX_TOKENS;
  return {
    requests: items.length,
    inputTokens: inTok,
    worstUsd: ((inTok * pin + outTok * pout) / 1e6) * BATCH_DISCOUNT,
  };
}

function costOf(usage, model) {
  const [pin, pout] = priceOf(model);
  const input = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0)
    + (usage.cache_read_input_tokens || 0);
  return ((input * pin + (usage.output_tokens || 0) * pout) / 1e6) * BATCH_DISCOUNT;
}

/** Results JSONL -> array indexed like the items: {text, costUsd} or {error}. */
function parseResults(jsonl, count, model) {
  const out = new Array(count).fill(null).map(() => ({ error: 'no result returned' }));
  for (const line of String(jsonl).split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const i = Number(String(row.custom_id).slice(1));
    if (!(i >= 0 && i < count)) continue;
    const r = row.result || {};
    if (r.type !== 'succeeded') {
      out[i] = { error: `${r.type || 'unknown'}: ${JSON.stringify(r.error || {}).slice(0, 200)}` };
      continue;
    }
    const msg = r.message;
    const costUsd = costOf(msg.usage || {}, model);
    if (msg.stop_reason !== 'end_turn') {
      out[i] = { error: `stop_reason ${msg.stop_reason}`, costUsd };
      continue;
    }
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    out[i] = text ? { text, costUsd } : { error: 'empty reply', costUsd };
  }
  return out;
}

async function call(url, key, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, 'x-api-key': key } });
  const body = await res.text();
  if (!res.ok) throw new Error(`Batches API ${res.status}: ${body.slice(0, 300)}`);
  return body;
}

/**
 * Plan, or send and wait. Without `go` it returns the plan and makes no
 * network call. With `go` it refuses a missing key or a worst case above
 * maxUsd before sending anything.
 */
async function runBatch(items, { model: alias = 'sonnet', maxUsd, go = false, rawOut = null,
  pollMs = 30000, log = console.log } = {}) {
  const model = modelId(alias);
  const plan = { model, ...estimate(items, model) };
  if (!go) return { plan };
  // Infinity and 1e999 are refused too: no worst case is above them, so the cap would not cap.
  const badCap = usdCapValueUsage('--max-usd', maxUsd);
  if (badCap) throw new Error(badCap);
  if (plan.worstUsd > maxUsd) {
    throw new Error(`worst case $${plan.worstUsd.toFixed(2)} is above --max-usd ${maxUsd}; nothing was sent`);
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set; run with node --env-file=<file>');

  const created = JSON.parse(await call(API, key, {
    method: 'POST', body: JSON.stringify({ requests: buildRequests(items, model) }),
  }));
  log(`batch ${created.id}: ${items.length} requests on ${model}, worst case $${plan.worstUsd.toFixed(2)}`);
  let batch = created;
  while (batch.processing_status !== 'ended') {
    await new Promise((r) => setTimeout(r, pollMs));
    batch = JSON.parse(await call(`${API}/${created.id}`, key));
    log(`batch ${created.id}: ${batch.processing_status}, ${JSON.stringify(batch.request_counts)}`);
  }
  const jsonl = await call(`${API}/${created.id}/results`, key);
  if (rawOut) fs.writeFileSync(rawOut, jsonl);
  const results = parseResults(jsonl, items.length, model);
  const spentUsd = results.reduce((n, r) => n + (r.costUsd || 0), 0);
  return { plan, batchId: created.id, results, spentUsd };
}

module.exports = {
  MODELS, PRICES, MAX_TOKENS, modelId, buildRequests, estimate, costOf, parseResults, runBatch,
};
