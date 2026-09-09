"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { git, verifyEntry, verifyCatalogs } = require("./check-platform-marketplaces");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-platforms-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, "demo");
  fs.mkdirSync(repo);
  git(repo, ["init", "-q"]);
  git(repo, ["config", "user.name", "Fixture"]);
  git(repo, ["config", "user.email", "fixture@example.com"]);
  const write = (name, text) => {
    fs.mkdirSync(path.dirname(path.join(repo, name)), { recursive: true });
    fs.writeFileSync(path.join(repo, name), text);
  };
  const commit = () => {
    git(repo, ["add", "."]);
    git(repo, ["commit", "-qm", "fixture"]);
    return git(repo, ["rev-parse", "HEAD"]);
  };
  write("README.md", "Platform front page\n");
  const base = commit();
  const owner = { name: "Fixture", email: "fixture@example.com" };
  git(repo, ["switch", "-c", "Claude"]);
  write(".claude-plugin/plugin.json", JSON.stringify({ name: "demo", author: owner }));
  const claude = commit();
  git(repo, ["switch", "--detach", base]);
  git(repo, ["switch", "-c", "Codex"]);
  write(".codex-plugin/plugin.json", JSON.stringify({ name: "demo", author: owner, version: "1.0.0", interface: { composerIcon: "./assets/icon.svg" } }));
  write("assets/icon.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const codex = commit();
  git(repo, ["switch", "--detach", base]);
  const entry = (platform) => ({
    name: "demo",
    source: { source: "url", url: "https://github.com/V-Songbird/demo.git", ref: platform, sha: platform === "Codex" ? codex : claude },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Productivity",
  });
  return { root, repo, base, claude, codex, owner, entry };
}

test("validates both platform pins while the checkout is a documentation-only commit", (t) => {
  const f = fixture(t);
  for (const platform of ["Claude", "Codex"]) assert.deepEqual(verifyEntry(f.root, f.entry(platform), platform, f.owner), []);
});

test("rejects a commit from the other platform branch", (t) => {
  const f = fixture(t); const entry = f.entry("Codex"); entry.source.sha = f.claude;
  assert.match(verifyEntry(f.root, entry, "Codex", f.owner).join("\n"), /cannot validate/);
});

test("rejects wrong branch, repository, and abbreviated pins", (t) => {
  const f = fixture(t); const entry = f.entry("Codex");
  Object.assign(entry.source, { ref: "main", url: "https://github.com/example/demo.git", sha: f.codex.slice(0, 7) });
  assert.equal(verifyEntry(f.root, entry, "Codex", f.owner).length, 3);
});

test("checks the pinned author rather than trusting catalog metadata", (t) => {
  const f = fixture(t);
  assert.match(verifyEntry(f.root, f.entry("Codex"), "Codex", { name: "Someone else" }).join("\n"), /author/);
});

test("unimplemented Codex branches without a plugin manifest cannot enter the catalog", (t) => {
  const f = fixture(t); const entry = f.entry("Codex"); entry.source.sha = f.base;
  assert.match(verifyEntry(f.root, entry, "Codex", f.owner).join("\n"), /cannot validate/);
});

test("works with remote tracking branches in a fresh checkout", (t) => {
  const f = fixture(t);
  git(f.repo, ["update-ref", "refs/remotes/origin/Codex", f.codex]);
  git(f.repo, ["branch", "-D", "Codex"]);
  assert.deepEqual(verifyEntry(f.root, f.entry("Codex"), "Codex", f.owner), []);
});

test("validates both same-name catalogs and rejects duplicate entries", (t) => {
  const f = fixture(t);
  const write = (file, data) => { fs.mkdirSync(path.dirname(path.join(f.root, file)), { recursive: true }); fs.writeFileSync(path.join(f.root, file), JSON.stringify(data)); };
  write(".claude-plugin/marketplace.json", { name: "foundry", owner: f.owner, plugins: [f.entry("Claude")] });
  const codex = { name: "foundry", interface: { displayName: "Foundry" }, plugins: [f.entry("Codex")] };
  write(".agents/plugins/marketplace.json", codex);
  assert.deepEqual(verifyCatalogs(f.root), []);
  codex.plugins.push(f.entry("Codex"));
  write(".agents/plugins/marketplace.json", codex);
  assert.match(verifyCatalogs(f.root).join("\n"), /duplicate plugin/);
});
