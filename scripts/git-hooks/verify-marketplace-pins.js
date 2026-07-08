#!/usr/bin/env node
"use strict";

// CI backstop for check-marketplace-sync.js's pre-commit gate: that hook
// only sees a *diff* at commit time, so it can be skipped (--no-verify, a
// GitHub web edit, a contributor without core.hooksPath set). This script
// checks absolute truth instead -- given the repo checked out WITH
// submodules, does every plugin's source.sha in marketplace.json actually
// match the commit its submodule is checked out at? Run in CI on every
// push/PR (see .github/workflows/validate-marketplace.yml).

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const MARKETPLACE_PATH = path.join(".claude-plugin", "marketplace.json");

function readMarketplace(root) {
  return JSON.parse(fs.readFileSync(path.join(root, MARKETPLACE_PATH), "utf-8"));
}

// Reads the actual checked-out commit of a submodule directory. Falls back
// to `git rev-parse HEAD` run inside it (works whether or not submodules
// were initialized via `git submodule update`, as long as the dir exists).
function submoduleHead(root, pluginName) {
  const dir = path.join(root, pluginName);
  if (!fs.existsSync(path.join(dir, ".git"))) return null;
  try {
    return execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function verify(root, marketplace) {
  const problems = [];
  for (const entry of marketplace.plugins || []) {
    const source = entry.source;
    if (!source || typeof source !== "object" || source.source !== "url" || !source.sha) continue;

    const actualHead = submoduleHead(root, entry.name);
    if (actualHead === null) {
      problems.push(`"${entry.name}": submodule not checked out (was this workflow run with submodules: true?)`);
      continue;
    }
    if (actualHead !== source.sha) {
      problems.push(
        `"${entry.name}": marketplace.json pins ${source.sha.slice(0, 12)}, but the submodule is checked out ` +
          `at ${actualHead.slice(0, 12)}. Update "version" and "source.sha" together and re-stage marketplace.json.`
      );
    }
  }
  return problems;
}

function main() {
  const root = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
  const marketplace = readMarketplace(root);
  const problems = verify(root, marketplace);

  if (problems.length === 0) {
    process.stdout.write("marketplace.json source.sha matches every submodule's checked-out commit.\n");
    return 0;
  }

  process.stderr.write("\nmarketplace.json / submodule pointer mismatch:\n\n");
  for (const p of problems) process.stderr.write(`  - ${p}\n`);
  process.stderr.write("\n");
  return 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { main, verify, submoduleHead, readMarketplace };
