#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(PLUGIN_ROOT, "prompt-template.md");

const WATCHED_TOOL = "mcp__ccd_session__spawn_task";

function templateReadSinceLastSpawn(transcriptPath) {
  let lastReadIdx = null;
  let lastSpawnIdx = null;
  let idx = 0;

  let content;
  try {
    content = fs.readFileSync(transcriptPath, "utf-8");
  } catch {
    return true;
  }

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const msgContent = entry?.message?.content;
    if (!Array.isArray(msgContent)) continue;

    for (const block of msgContent) {
      if (typeof block !== "object" || block === null || block.type !== "tool_use") continue;
      const name = block.name;
      if (name === "Read") {
        const filePath = String(block.input?.file_path ?? "");
        if (filePath.replace(/\\/g, "/").toLowerCase().endsWith("prompt-template.md")) {
          lastReadIdx = idx;
        }
      } else if (name === WATCHED_TOOL) {
        lastSpawnIdx = idx;
      }
      idx += 1;
    }
  }

  if (lastReadIdx === null) return false;
  if (lastSpawnIdx === null) return true;
  return lastReadIdx > lastSpawnIdx;
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function main() {
  let data;
  try {
    data = JSON.parse(readStdin() || "{}");
  } catch {
    return;
  }

  if (data.tool_name !== WATCHED_TOOL) return;

  const transcriptPath = data.transcript_path || "";
  if (!transcriptPath || templateReadSinceLastSpawn(transcriptPath)) return;

  const payload = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Relay: spawn_task blocked. Read ${TEMPLATE_PATH} first, then retry spawn_task following its structure (relevant_files, verification criteria, etc.).`,
    },
  });
  try {
    process.stdout.write(payload);
  } catch {
    // ignore
  }
}

try {
  main();
} catch {
  process.exit(0);
}
