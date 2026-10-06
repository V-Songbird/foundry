"use strict";

// publish.js must prove a batch complete before it publishes it. A manifest
// that is missing, names another batch, or plans no runs proves nothing, so
// each of those is refused and names the batch.

const { test } = require("node:test");
const assert = require("node:assert");
const { assertBatchComplete, buildClaims } = require("../runner/publish.js");

const BATCH = "mine-20260101-abc123";
const run = (key, arm) => ({
  key, batchId: BATCH, seed: "1", task: "t", segment: "coding", arm, model: "sonnet",
  costUsd: 0.1, cost: 0.1, wallMs: 1000, finalWords: 10,
});
const runs = [run("t__baseline__r1", "baseline"), run("t__hush__r1", "hush")];
const manifest = (over) => ({ batchId: BATCH, order: runs.map((r) => r.key), ...over });

test("no manifest at all is refused, naming the batch", () => {
  assert.throws(() => assertBatchComplete(runs, [], BATCH), new RegExp(BATCH));
  assert.throws(() => assertBatchComplete(runs, undefined, BATCH), new RegExp(BATCH));
  assert.throws(() => buildClaims(runs, []), new RegExp(BATCH));
});

test("a manifest naming another batch is refused, naming the records' batch", () => {
  const other = [manifest({ batchId: "other-batch" })];
  assert.throws(() => assertBatchComplete(runs, other, BATCH), new RegExp(BATCH));
  assert.throws(() => buildClaims(runs, other), new RegExp(BATCH));
});

test("a manifest with no order array or an empty one is refused, naming the batch", () => {
  for (const bad of [{ order: undefined }, { order: "a,b" }, { order: [] }]) {
    assert.throws(() => assertBatchComplete(runs, [manifest(bad)], BATCH), new RegExp(BATCH));
    assert.throws(() => buildClaims(runs, [manifest(bad)]), new RegExp(BATCH));
  }
});

test("a complete batch publishes", () => {
  assert.doesNotThrow(() => assertBatchComplete(runs, [manifest()], BATCH));
  assert.doesNotThrow(() => buildClaims(runs, [manifest()]));
});

test("a record missing against the manifest is still refused", () => {
  assert.throws(() => assertBatchComplete(runs.slice(0, 1), [manifest()], BATCH), /1 of 2 planned runs/);
});
