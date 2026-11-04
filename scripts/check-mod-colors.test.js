"use strict";

// Tests for check-mod-colors.js against the fixtures in scripts/fixtures/mod-colors/: a mod
// that paints only with theme keys and approved Svg colors passes, and each kind of raw color
// fails. The types file there stands in for the engine's, so the tests need no Claude Code.

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT = path.join(__dirname, "check-mod-colors.js");
const FIX = path.join(__dirname, "fixtures", "mod-colors");
const TYPES = path.join(FIX, "types.d.ts");
const EXCEPTIONS = path.join(FIX, "exceptions.json");

// Every temp folder a test makes is removed when the file ends.
const made = [];
const tempDir = prefix => { const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); made.push(d); return d; };
after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }); });

function run(args) {
  const out = path.join(tempDir("mod-colors-"), "out.json");
  const r = spawnSync(process.execPath, [SCRIPT, "--types", TYPES, "--json", out, ...args], { encoding: "utf8" });
  return { status: r.status, report: r.status === 2 ? null : JSON.parse(fs.readFileSync(out, "utf8")), stderr: r.stderr };
}

test("a mod with theme keys and approved Svg colors passes", () => {
  const r = run(["--exceptions", EXCEPTIONS, path.join(FIX, "pass-mod")]);
  assert.equal(r.status, 0, JSON.stringify(r.report));
  assert.deepEqual(r.report.summary, { mods: 1, themeKeys: 5, violations: 0, pending: 0 });
});

test("raw hex, a CSS color name and an unknown key each fail", () => {
  const r = run(["--exceptions", EXCEPTIONS, path.join(FIX, "fail-mod")]);
  assert.equal(r.status, 1);
  const got = r.report.findings.map(f => `${f.rule}:${f.value}`).sort();
  assert.deepEqual(got, ["raw-color-literal:#2a78d61a", "raw-color-literal:#ff0000", "raw-color-prop:red", "unknown-theme-key:brand"]);
});

test("Svg colors without an exceptions file fail", () => {
  const r = run([path.join(FIX, "pass-mod")]);
  assert.equal(r.status, 1);
  assert.equal(r.report.summary.violations, 2);
});

test("an exception without approval is pending, and one the source no longer holds is stale", () => {
  const dir = tempDir("mod-colors-ex-");
  const file = path.join(dir, "exceptions.json");
  const base = JSON.parse(fs.readFileSync(EXCEPTIONS, "utf8")).exceptions[0];
  fs.writeFileSync(file, JSON.stringify({ exceptions: [
    { ...base, approvedBy: null, approvedOn: null },
    { ...base, values: ["#123456"], reason: "a value the mod dropped" },
  ] }));
  const r = run(["--exceptions", file, path.join(FIX, "pass-mod")]);
  assert.equal(r.status, 1);
  assert.equal(r.report.summary.pending, 2);
  assert.deepEqual(r.report.findings.filter(f => f.rule === "stale-exception").map(f => f.value), ["#123456"]);
});

test("a types file with no ThemeKey union is a usage error", () => {
  const bad = spawnSync(process.execPath, [SCRIPT, "--types", EXCEPTIONS, path.join(FIX, "pass-mod")], { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /no ThemeKey union/);
});
