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
