#!/usr/bin/env node
"use strict";

// Repo-wide dev hook (not shipped with any plugin): after an Edit/Write
// lands in a marketplace.json or plugin.json, nudges the assistant to run
// the manifest-curator agent. Manifest edits are easy to get subtly wrong
// (stale author info, version drift, schema violations) and manifest-curator
// already catches these -- but only if someone remembers to invoke it.
// Registered in .claude/settings.json, alongside run-tests-on-edit.js.

const fs = require("fs");

const { editPaths } = require("./edit-paths");

function readInput() {
  let raw;
  try {
    raw = fs.readFileSync(0, "utf-8");
  } catch {
    return {};
  }
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function isManifestFile(filePath) {
  if (!filePath) return false;
  const normalized = String(filePath).replace(/\\/g, "/");
  return /(^|\/)(marketplace|plugin)\.json$/i.test(normalized);
}

function main() {
  const data = readInput();
  const paths = editPaths(data).filter(isManifestFile);
  if (!paths.length) return;
  const filePath = paths.join(", ");

  const payload = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `[foundry] ${filePath} was just edited. Run the manifest-curator agent (audit mode) before ` +
        `moving on -- it catches schema violations, version/author drift between marketplace.json and this ` +
        `plugin's own plugin.json, and strict-mode conflicts that are easy to miss by eye.`,
    },
  };
  try {
    process.stdout.write(Buffer.from(JSON.stringify(payload), "utf-8"));
  } catch {
    // ignore
  }
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.exit(0);
  }
}

module.exports = { main, isManifestFile };
