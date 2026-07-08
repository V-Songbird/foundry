"use strict";

// Tests for plugin-pre-commit-template.js -- the canonical pre-commit hook
// copied into every plugin repo. Exercises it end-to-end against throwaway
// git repos so the copies installed in each submodule can be trusted
// without re-testing identical boilerplate six times.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const HOOK_PATH = path.join(__dirname, "plugin-pre-commit-template.js");
const { cleanEnv } = require("./plugin-pre-commit-template");

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "claude-plugins-pctest-"));
  execSync("git init -q", { cwd: root });
  return root;
}

function writeTest(root, name, body) {
  const testsDir = path.join(root, "tests");
  fs.mkdirSync(testsDir, { recursive: true });
  fs.writeFileSync(path.join(testsDir, name), body, "utf-8");
}

function runHook(root) {
  return spawnSync("node", [HOOK_PATH], { cwd: root, encoding: "utf-8", timeout: 20000 });
}

describe("plugin pre-commit template", () => {
  test("no-ops (exit 0) when there is no tests/ directory", () => {
    const root = makeRepo();
    const result = runHook(root);
    assert.equal(result.status, 0);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("passes (exit 0) when all tests pass", () => {
    const root = makeRepo();
    writeTest(root, "ok.test.js", "require('node:test')('ok', () => {});");
    const result = runHook(root);
    assert.equal(result.status, 0);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("blocks (exit 1) when a test fails", () => {
    const root = makeRepo();
    writeTest(
      root,
      "fail.test.js",
      "const assert = require('node:assert/strict'); require('node:test')('fails', () => assert.equal(1, 2));"
    );
    const result = runHook(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pre-commit/);
    fs.rmSync(root, { recursive: true, force: true });
  });

  // Regression test for a real incident (2026-07-07): when this hook runs
  // through an actual `git commit`, git sets GIT_DIR/GIT_WORK_TREE/etc. in
  // its environment. Without stripping those before spawning the nested
  // `node --test`, a plugin's own test suite shelling out to `git` against
  // a temp fixture (via a `cwd` override) has its commands silently
  // redirected to THIS repo's real .git instead -- which is exactly what
  // corrupted foreman's real submodule config the first time this hook ran
  // for real.
  test("strips inherited GIT_* env vars so a nested git command can't escape the fixture", () => {
    const root = makeRepo();
    // Simulate a test that does the same thing foreman's initGitRepo() does:
    // spawn `git config` with a `cwd` override, trusting that to scope it.
    writeTest(
      root,
      "leak.test.js",
      [
        "const { spawnSync } = require('node:child_process');",
        "const fs = require('node:fs');",
        "const os = require('node:os');",
        "const path = require('node:path');",
        "const assert = require('node:assert/strict');",
        "require('node:test')('does not leak into the real repo', () => {",
        "  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'leak-fixture-'));",
        "  spawnSync('git', ['init', '-q'], { cwd: fixture });",
        "  const result = spawnSync('git', ['config', '--local', 'user.email', 'leaked@example.com'], { cwd: fixture });",
        "  assert.equal(result.status, 0);",
        "});",
      ].join("\n")
    );

    // Simulate git invoking this hook for a real commit: GIT_DIR/GIT_WORK_TREE
    // point at `root` the way git would set them for root's own hook.
    const gitDir = path.join(root, ".git");
    const result = spawnSync("node", [HOOK_PATH], {
      cwd: root,
      encoding: "utf-8",
      timeout: 20000,
      env: { ...process.env, GIT_DIR: gitDir, GIT_WORK_TREE: root },
    });

    assert.equal(result.status, 0, result.stdout + result.stderr);
    // The real repo's own config must be untouched by the nested test's
    // "isolated" git config call.
    const realConfig = fs.readFileSync(path.join(gitDir, "config"), "utf-8");
    assert.doesNotMatch(realConfig, /leaked@example\.com/);

    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("cleanEnv", () => {
  test("strips NODE_TEST_CONTEXT and NODE_CHANNEL_FD", () => {
    const original = { ...process.env, NODE_TEST_CONTEXT: "1", NODE_CHANNEL_FD: "3" };
    const restore = process.env;
    process.env = original;
    const cleaned = cleanEnv();
    process.env = restore;
    assert.equal("NODE_TEST_CONTEXT" in cleaned, false);
    assert.equal("NODE_CHANNEL_FD" in cleaned, false);
  });

  test("strips every GIT_-prefixed env var", () => {
    const original = { ...process.env, GIT_DIR: "/x/.git", GIT_WORK_TREE: "/x", GIT_INDEX_FILE: "/x/.git/index" };
    const restore = process.env;
    process.env = original;
    const cleaned = cleanEnv();
    process.env = restore;
    for (const key of Object.keys(cleaned)) {
      assert.equal(key.startsWith("GIT_"), false, `expected ${key} to be stripped`);
    }
  });

  test("leaves unrelated env vars alone", () => {
    const original = { ...process.env, MY_APP_SETTING: "keep-me" };
    const restore = process.env;
    process.env = original;
    const cleaned = cleanEnv();
    process.env = restore;
    assert.equal(cleaned.MY_APP_SETTING, "keep-me");
  });
});
