"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { git, layoutOf, editionPlugins, verifyEntry, verifyCatalogs } = require("./check-platform-marketplaces");

function fixture(t, icon = "./assets/icon.svg") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-platforms-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ["init", "-q"]);
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
  const icons = () => {
    write("assets/icon.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>');
    write("assets/icon.png", Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5ZkAAAAASUVORK5CYII=', 'base64'));
  };
  write("README.md", "Platform front page\n");
  const base = commit();
  const owner = { name: "Fixture", email: "fixture@example.com" };
  git(repo, ["switch", "-c", "Claude"]);
  write(".claude-plugin/plugin.json", JSON.stringify({ name: "demo", author: owner }));
  const claude = commit();
  git(repo, ["switch", "--detach", base]);
  git(repo, ["switch", "-c", "Codex"]);
  write(".codex-plugin/plugin.json", JSON.stringify({ name: "demo", author: owner, version: "1.0.0", interface: { composerIcon: icon } }));
  icons();
  const codex = commit();
  // A single package: each release on main carries both manifests.
  git(repo, ["switch", "--detach", base]);
  git(repo, ["switch", "-C", "main"]);
  let releases = 0;
  const release = (version, codexVersion = version) => {
    git(repo, ["switch", "main"]);
    write(".claude-plugin/plugin.json", JSON.stringify({ name: "demo", author: owner, version }));
    // A null Codex version releases a package that ships for Claude Code only.
    if (codexVersion === null) fs.rmSync(path.join(repo, ".codex-plugin"), { recursive: true, force: true });
    else write(".codex-plugin/plugin.json", JSON.stringify({ name: "demo", author: owner, version: codexVersion, interface: { composerIcon: icon } }));
    icons();
    write("CHANGELOG.md", `release ${++releases}\n`);
    const sha = commit();
    git(repo, ["switch", "--detach", base]);
    return sha;
  };
  const main = release("1.0.0");
  const entry = (platform, source = {}) => ({
    name: "demo",
    source: { source: "url", url: "https://github.com/V-Songbird/demo.git", ref: platform, sha: platform === "Codex" ? codex : claude, ...source },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Productivity",
  });
  return { root, repo, base, claude, codex, main, owner, entry, release };
}

function catalogs(f, claude, codex) {
  const write = (file, data) => { fs.mkdirSync(path.dirname(path.join(f.root, file)), { recursive: true }); fs.writeFileSync(path.join(f.root, file), JSON.stringify(data)); };
  write(".claude-plugin/marketplace.json", { name: "foundry", owner: f.owner, plugins: claude });
  write(".agents/plugins/marketplace.json", { name: "foundry", interface: { displayName: "Foundry" }, plugins: codex });
}

const pinned = (f, sha) => [[f.entry("Claude", { ref: "main", sha })], [f.entry("Codex", { ref: "main", sha })]];

function commitCatalogs(f) {
  git(f.root, ["add", ".claude-plugin", ".agents"]);
  git(f.root, ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "-c", "core.hooksPath=", "commit", "-qm", "pins"]);
}

test("validates both platform pins while the checkout is a documentation-only commit", (t) => {
  const f = fixture(t);
  for (const platform of ["Claude", "Codex"]) assert.deepEqual(verifyEntry(f.root, f.entry(platform), platform, f.owner), []);
});

test("rejects a commit from the other platform branch", (t) => {
  const f = fixture(t); const entry = f.entry("Codex"); entry.source.sha = f.claude;
  assert.match(verifyEntry(f.root, entry, "Codex", f.owner).join("\n"), /cannot validate/);
});

test("accepts a packaged PNG icon and rejects a missing asset or escaping path", (t) => {
  for (const icon of ['./assets/icon.png', './assets/missing.png', './assets/../icon.png']) {
    const f = fixture(t, icon);
    const errors = verifyEntry(f.root, f.entry('Codex'), 'Codex', f.owner);
    assert.equal(errors.length === 0, icon === './assets/icon.png');
  }
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

test("the Claude catalog's main ref selects the package layout; any other ref keeps editions", (t) => {
  const f = fixture(t);
  catalogs(f, [f.entry("Claude", { ref: "main" }), { ...f.entry("Claude"), name: "other" }], []);
  const claude = JSON.parse(fs.readFileSync(path.join(f.root, ".claude-plugin/marketplace.json"), "utf8"));
  assert.equal(layoutOf(claude, "demo"), "package");
  assert.equal(layoutOf(claude, "other"), "editions");
  assert.equal(layoutOf(claude, "missing"), "editions");
  assert.deepEqual(editionPlugins(f.root), ["other"]);
});

test("a package plugin pins one main commit in both catalogs", (t) => {
  const f = fixture(t);
  catalogs(f, ...pinned(f, f.main));
  assert.deepEqual(verifyCatalogs(f.root), []);
});

test("a package plugin rejects split pins, a missing Codex entry, an edition ref and a commit outside main", (t) => {
  const f = fixture(t);
  const later = f.release("1.1.0");
  const claude = [f.entry("Claude", { ref: "main", sha: f.main })];
  for (const [claudePlugins, codexPlugins, error] of [
    [claude, [f.entry("Codex", { ref: "main", sha: later })], /demo: both catalogs must pin the same main commit/],
    [claude, [], /demo: a package plugin needs an entry in both catalogs/],
    [claude, [f.entry("Codex")], /demo: expected ref main/],
    [...pinned(f, f.claude), /demo: cannot validate Claude pin/],
  ]) {
    catalogs(f, claudePlugins, codexPlugins);
    assert.match(verifyCatalogs(f.root).join("\n"), error);
  }
});

test("a package without a Codex manifest needs only its Claude catalog entry", (t) => {
  const f = fixture(t);
  // The Codex catalog stays empty here, so only this plugin's own findings count.
  const demoErrors = () => verifyCatalogs(f.root).filter((error) => error.startsWith("demo:")).join("\n");
  const claudeOnly = f.release("1.1.0", null);
  catalogs(f, [f.entry("Claude", { ref: "main", sha: claudeOnly })], []);
  assert.equal(demoErrors(), "");
  catalogs(f, ...pinned(f, claudeOnly));
  assert.match(demoErrors(), /demo: cannot validate Codex pin/);
  catalogs(f, [f.entry("Claude", { ref: "main", sha: f.release(undefined, null) })], []);
  assert.match(demoErrors(), /demo: the Claude manifest at [0-9a-f]{12} needs a version/);
  catalogs(f, [{ ...f.entry("Claude"), version: "1.1.0" }], []);
  commitCatalogs(f);
  catalogs(f, [f.entry("Claude", { ref: "main", sha: claudeOnly })], []);
  assert.match(demoErrors(), /demo: version 1\.1\.0 was already pinned/);
});

test("an editions plugin cannot install either host from main", (t) => {
  const f = fixture(t);
  catalogs(f, [f.entry("Claude")], [f.entry("Codex", { ref: "main", sha: f.main })]);
  assert.match(verifyCatalogs(f.root).join("\n"), /demo: expected ref Codex/);
});

test("a package plugin's version lives in both manifests, not in the Claude catalog", (t) => {
  const f = fixture(t);
  const [claude, codex] = pinned(f, f.main);
  catalogs(f, [{ ...claude[0], version: "1.0.0" }], codex);
  assert.match(verifyCatalogs(f.root).join("\n"), /version belongs in its manifests/);
  catalogs(f, ...pinned(f, f.release("1.1.0", "1.2.0")));
  assert.match(verifyCatalogs(f.root).join("\n"), /both manifests at [0-9a-f]{12} need the same version/);
});

test("a moved package pin needs a version other than the previously committed pin's", (t) => {
  const f = fixture(t);
  catalogs(f, [{ ...f.entry("Claude"), version: "0.9.0" }], [f.entry("Codex")]);
  commitCatalogs(f);
  // From editions: the Claude entry's version and the Codex manifest's version were both released.
  catalogs(f, ...pinned(f, f.main));
  assert.match(verifyCatalogs(f.root).join("\n"), new RegExp(`version 1\\.0\\.0 was already pinned at ${f.codex.slice(0, 12)}`));
  catalogs(f, ...pinned(f, f.release("0.9.0")));
  assert.match(verifyCatalogs(f.root).join("\n"), new RegExp(`version 0\\.9\\.0 was already pinned at ${f.claude.slice(0, 12)}`));
  catalogs(f, ...pinned(f, f.release("1.1.0")));
  assert.deepEqual(verifyCatalogs(f.root), []);
  git(f.root, ["add", ".claude-plugin", ".agents"]);
  assert.deepEqual(verifyCatalogs(f.root, true), []);
  commitCatalogs(f);
  // A clean checkout is the commit under test, compared with its parent.
  assert.deepEqual(verifyCatalogs(f.root), []);
  // Between packages the old version is read from the manifests at the old pin.
  catalogs(f, ...pinned(f, f.release("1.1.0")));
  assert.match(verifyCatalogs(f.root).join("\n"), /version 1\.1\.0 was already pinned/);
  git(f.root, ["add", ".claude-plugin", ".agents"]);
  assert.match(verifyCatalogs(f.root, true).join("\n"), /version 1\.1\.0 was already pinned/);
  commitCatalogs(f);
  assert.match(verifyCatalogs(f.root).join("\n"), /version 1\.1\.0 was already pinned/);
});
