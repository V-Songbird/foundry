"use strict";

// Tests for verify-marketplace-pins.js -- the CI backstop that checks
// marketplace.json's pinned source.sha against each submodule's actual
// checked-out commit (absolute truth, not a diff).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { verify } = require("./verify-marketplace-pins");

describe("verify", () => {
  // verify() calls the module-level submoduleHead(), which does real fs/git
  // work -- so we test it through a small root/marketplace fixture instead
  // of mocking, using the same fake-repo approach as the other hook tests.
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const { execSync } = require("child_process");

  function makeFakeRoot(pluginShas) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-pins-"));
    const plugins = Object.entries(pluginShas).map(([name, sha]) => {
      const dir = path.join(root, name);
      fs.mkdirSync(dir, { recursive: true });
      execSync("git init -q", { cwd: dir });
      fs.writeFileSync(path.join(dir, "f.txt"), "x", "utf-8");
      execSync("git add f.txt", { cwd: dir });
      execSync('git -c user.email=t@t -c user.name=t commit -q -m init', { cwd: dir });
      const actualSha = execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf-8" }).trim();
      return { name, actualSha };
    });
    return { root, plugins };
  }

  test("passes when marketplace.json's sha matches the real checked-out commit", () => {
    const { root, plugins } = makeFakeRoot({ demo: null });
    const actualSha = plugins[0].actualSha;
    const marketplace = { plugins: [{ name: "demo", source: { source: "url", sha: actualSha } }] };
    const problems = verify(root, marketplace);
    assert.deepEqual(problems, []);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("flags a mismatch between marketplace.json's sha and the real checked-out commit", () => {
    const { root } = makeFakeRoot({ demo: null });
    const marketplace = { plugins: [{ name: "demo", source: { source: "url", sha: "f".repeat(40) } }] };
    const problems = verify(root, marketplace);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /demo/);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("flags a plugin whose directory is not checked out at all", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-pins-missing-"));
    const marketplace = { plugins: [{ name: "missing-plugin", source: { source: "url", sha: "b".repeat(40) } }] };
    const problems = verify(root, marketplace);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /not checked out/);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("ignores plugins with a non-url source (e.g. a relative path)", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-pins-relpath-"));
    const marketplace = { plugins: [{ name: "local-plugin", source: "./local-plugin" }] };
    const problems = verify(root, marketplace);
    assert.deepEqual(problems, []);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("checks multiple plugins independently", () => {
    const { root, plugins } = makeFakeRoot({ good: null, bad: null });
    const goodSha = plugins.find((p) => p.name === "good").actualSha;
    const marketplace = {
      plugins: [
        { name: "good", source: { source: "url", sha: goodSha } },
        { name: "bad", source: { source: "url", sha: "c".repeat(40) } },
      ],
    };
    const problems = verify(root, marketplace);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /bad/);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
