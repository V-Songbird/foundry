"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const editions = ["foreman", "hush", "razor",
  ".claude/worktrees/platform-isolation/foreman-Claude",
  ".claude/worktrees/platform-isolation/hush-Codex",
  ".claude/worktrees/platform-isolation/razor-Claude"];

test("legacy entry points permit attributed research with an old blocklist configured", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-public-research-"));
  try {
    const list = path.join(temp, "blocklist.txt"), message = path.join(temp, "message.txt");
    fs.writeFileSync(list, "example-reference\n");
    fs.writeFileSync(message, "Document example-reference methodology and attribution\n");
    for (const args of [["check-reference-names.js", "staged"], ["check-reference-names.js", "message", message], ["commit-msg", message]]) {
      const result = spawnSync(process.execPath, [path.join(__dirname, args[0]), ...args.slice(1)], {
        cwd: temp, encoding: "utf8", env: { ...process.env, HOUSE_REFERENCE_BLOCKLIST: list },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test("maintained pre-commit hooks no longer invoke the retired policy", () => {
  for (const file of ["scripts/git-hooks/pre-commit", "scripts/git-hooks/plugin-pre-commit-template.js",
    ...editions.map(dir => dir + "/scripts/git-hooks/pre-commit")]) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    assert.doesNotMatch(fs.readFileSync(full, "utf8"), /check-reference-names/, file);
  }
});

for (const edition of editions) test(`${edition} has canonical compatibility entry points`, t => {
  const base = path.join(root, edition, "scripts/git-hooks");
  if (!fs.existsSync(path.join(base, "check-reference-names.js"))) return t.skip("No legacy hook installation in this checkout");
  for (const file of ["check-reference-names.js", "commit-msg"]) {
    assert.equal(fs.readFileSync(path.join(base, file), "utf8"), fs.readFileSync(path.join(__dirname, file), "utf8"));
  }
});
