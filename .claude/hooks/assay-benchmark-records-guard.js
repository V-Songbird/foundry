#!/usr/bin/env node
"use strict";

// Historical filename retained for existing project hook registrations.
// The old blanket ban on publishing benchmark results is retired. This guard
// now enforces only Foundry's Claude-manifest version ownership convention.
const fs = require("node:fs");

function decision(input) {
  if (!["Edit", "Write"].includes(input?.tool_name)) return null;
  const data = input.tool_input || {};
  const file = String(data.file_path || "").replace(/\\/g, "/");
  if (!/(^|\/)\.claude-plugin\/plugin\.json$/i.test(file)) return null;
  const text = String(data.content ?? data.new_string ?? "");
  if (!/"version"\s*:/.test(text)) return null;
  return { hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "This Claude manifest uses the version from Foundry's .claude-plugin/marketplace.json. Update that entry instead. Codex manifests own their native version and are not subject to this rule."
  }};
}
function main() {
  let input; try { input = JSON.parse(fs.readFileSync(0, "utf8")); } catch { return; }
  const result = decision(input); if (result) process.stdout.write(JSON.stringify(result));
}
module.exports = { decision, main };
if (require.main === module) main();
