#!/usr/bin/env node
"use strict";

const path = require("path");

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(PLUGIN_ROOT, "prompt-template.md");

const WATCHED = new Set(["Agent", "Workflow"]);

const HINT =
  "[Relay] Agent/workflow completed. Scan its output for any out-of-scope finds, " +
  "deferred items, or follow-up work. For each confirmed item: Read " +
  TEMPLATE_PATH +
  ", fill the template, and call spawn_task with a fully self-contained prompt.";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

async function main() {
  const raw = await readStdin();
  let data;
  try {
    data = JSON.parse(raw || "{}");
  } catch {
    return;
  }

  if (!data || !WATCHED.has(data.tool_name)) {
    return;
  }

  const payload = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: HINT,
    },
  });
  try {
    process.stdout.write(payload, "utf-8");
  } catch {
    // ignore
  }
}

if (require.main === module) {
  main()
    .catch(() => {})
    .then(() => process.exit(0));
}

module.exports = { main };
