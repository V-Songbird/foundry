#!/usr/bin/env node
"use strict";

// Run by hand; no hook or workflow runs this check, and CI runs only its
// tests. validate-marketplace.yml ran it until c3d036eb (#4) replaced the
// step with check-platform-marketplaces.js. An entry with a source ref is
// validated by that checker's verifyEntry, because its gitlink selects a
// development checkout independently of the release pin.
//
// An entry without a ref must match both of its submodule's commits, which
// are not always the same one:
//
//   * the commit the submodule is CHECKED OUT at, and
//   * the commit the parent repo has RECORDED as its pointer.
//
// A fresh clone checks out the recorded pointer, so there they agree. On a
// working machine they part company the moment marketplace.json is committed
// without the plugin directory staged alongside it, and only the recorded
// pointer is what anyone else ends up cloning. Checking the checkout alone
// reported a clean bill of health across exactly that split.

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

// The commit the parent repo's last commit recorded for a submodule. Null when
// HEAD carries no gitlink there -- a plugin being added in this very commit,
// or a root with no history at all -- which is not a mismatch to report.
function recordedPointer(root, pluginName) {
  try {
    const out = execSync(`git ls-tree HEAD -- ${JSON.stringify(pluginName)}`, { cwd: root, encoding: "utf-8" });
    const m = out.match(/^160000 commit ([0-9a-f]{40})\t/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function verify(root, marketplace) {
  const problems = [];
  for (const entry of marketplace.plugins || []) {
    const source = entry.source;
    if (!source || typeof source !== "object" || source.source !== "url" || !source.sha) continue;

    if (source.ref) {
      const platforms = require("./check-platform-marketplaces.js");
      const branch = platforms.layoutOf(marketplace, entry.name) === "package" ? "main" : "Claude";
      problems.push(...platforms.verifyEntry(root, entry, "Claude", marketplace.owner, branch));
      continue;
    }

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

    const recorded = recordedPointer(root, entry.name);
    if (recorded !== null && recorded !== source.sha) {
      problems.push(
        `"${entry.name}": marketplace.json pins ${source.sha.slice(0, 12)}, but the last commit records the ` +
          `submodule pointer at ${recorded.slice(0, 12)}. That pointer is what a fresh clone gets, so stage the ` +
          `"${entry.name}" directory and commit it.`
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
    process.stdout.write("Marketplace release pins are valid for their declared source branches.\n");
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

module.exports = { main, verify, submoduleHead, recordedPointer, readMarketplace };
