"use strict";

// The picks foreman arm starts no Claude session, so it must run without
// BENCH_CONFIG_DIR. A stub roadmap.js stands in for the plugin, and run data
// goes to a temporary folder.

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const BENCH = path.resolve(__dirname, "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "foreman-config-gate-"));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

test("picks/run.js --arms foreman runs without BENCH_CONFIG_DIR", () => {
  const foreman = path.join(TMP, "foreman");
  fs.mkdirSync(path.join(foreman, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(foreman, "scripts", "roadmap.js"),
    "console.log(JSON.stringify({ ok: true, candidates: [{ title: 'First' }], total_unblocked: 1 }));\n");
  const env = { ...process.env, FOREMAN_DIR: foreman, BENCH_DATA_DIR: path.join(TMP, "data") };
  for (const k of ["BENCH_CONFIG_DIR", "CLAUDE_CONFIG_DIR", "NODE_TEST_CONTEXT", "NODE_CHANNEL_FD"]) delete env[k];

  const r = spawnSync(process.execPath,
    [path.join(BENCH, "picks", "run.js"), "--tag", "gate", "--arms", "foreman", "--sizes", "10", "--reps", "1"],
    { cwd: BENCH, encoding: "utf8", env, timeout: 60000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /foreman size=10 {2}top="First"/);
});

// A count flag wrapped in a bare Number() planned NaN reps or a NaN backlog size.
test("picks/run.js refuses a --reps or --sizes that is not a whole number of at least 1", () => {
  const env = { ...process.env, BENCH_DATA_DIR: path.join(TMP, "data") };
  for (const k of ["BENCH_CONFIG_DIR", "CLAUDE_CONFIG_DIR", "NODE_TEST_CONTEXT", "NODE_CHANNEL_FD"]) delete env[k];
  const picks = (...args) => spawnSync(process.execPath,
    [path.join(BENCH, "picks", "run.js"), "--tag", "refuse", "--arms", "foreman", "--dry-run", ...args],
    { cwd: BENCH, encoding: "utf8", env, timeout: 60000 });
  for (const [name, bad] of [["reps", "abc"], ["reps", "0"], ["reps", "1.5"], ["reps", ""], ["sizes", "10,abc"], ["sizes", "0"]]) {
    const r = picks(`--${name}`, bad);
    assert.equal(r.status, 2, `${name} "${bad}": ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, new RegExp(`usage: --${name} needs a whole number of at least 1`));
    assert.doesNotMatch(r.stdout, /NaN/);
  }
  const bare = picks("--reps");
  assert.equal(bare.status, 2, bare.stdout + bare.stderr);
  assert.match(bare.stderr, /usage: --reps needs a whole number of at least 1, got undefined/);
});
