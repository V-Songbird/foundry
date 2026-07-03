#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT
  ? path.resolve(process.env.CLAUDE_PLUGIN_ROOT)
  : path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(PLUGIN_ROOT, "roadmap-schema.md");

const WATCHED_TOOLS = new Set(["Bash", "PowerShell"]);
const SEP = /\s*(?:&&|\|\||[;|\n])\s*/;
const COMMIT_RE = /^\s*git\s+(?:-\S+\s+)*commit\b/i;

function projectDir() {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
}

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

function isGitCommit(command) {
  return command.split(SEP).some((part) => COMMIT_RE.test(part));
}

// ponytail: no confirmed field name for exit code in this repo's hook payloads
// (docs example shows tool_output, a hestia test fixture shows tool_response —
// neither is exercised by working code). Best-effort: skip on a *confirmed*
// failure, fail open (proceed) when the field is simply absent.
function commitFailed(data) {
  const code = data?.tool_response?.exit_code ?? data?.tool_output?.exit_code;
  return typeof code === "number" && code !== 0;
}

function readConfig(root) {
  const p = path.join(root, ".relay", "config.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
    return { discoverySuggestions: parsed?.discoverySuggestions === true };
  } catch {
    return { discoverySuggestions: false };
  }
}

function statusSyncBlock() {
  return (
    "[Relay] This commit may complete an in-progress ROADMAP.jsonl task. " +
    `Read ${SCHEMA_PATH} for the schema, then: if this commit finishes one of ` +
    'the "in_progress" entries, update that entry\'s status to "done", append ' +
    "the commit SHA (run `git rev-parse --short HEAD` yourself — don't guess " +
    "it from the command you ran) to its commits[], and set updated_at. " +
    "Re-read the file after writing to confirm every line still parses as JSON."
  );
}

function discoveryBlock() {
  return (
    "[Relay] Roadmap discovery is enabled for this project. Read " +
    `${SCHEMA_PATH} for the schema, then check ROADMAP.jsonl for existing ` +
    '"rejected" entries so you don\'t re-suggest something already declined. ' +
    "Scan this commit's work for CONFIRMED opportunities, bugs, or ideas — " +
    "not vague hunches. If you add one to the roadmap, write it dense using " +
    "only what's already in this session's context (exact paths, line " +
    "ranges, symbol names, the specific behavior observed) — do NOT run " +
    "extra Read/Grep/Bash calls just to enrich the entry, that spends " +
    "tokens now instead of saving them for whoever picks it up later. " +
    "For each one, ask the user (AskUserQuestion) what to do with it: Add " +
    "to roadmap (status: planned) / Execute with TaskCreate (work it now " +
    "in this session, tracked) / Execute with a background Agent " +
    "(run_in_background: true) / Reject (status: rejected, source: " +
    "claude-suggested, so it isn't re-surfaced). Never call " +
    "mcp__ccd_session__spawn_task — it has a known bug where tasks spawned " +
    "through it don't get MCP tools. Never act without asking. Say nothing " +
    "if nothing is confirmed."
  );
}

function main() {
  const data = readInput();
  if (!WATCHED_TOOLS.has(data.tool_name)) return;

  const command = (data.tool_input?.command || "").trim();
  if (!command || !isGitCommit(command)) return;
  if (commitFailed(data)) return;

  const root = projectDir();
  const roadmapPath = path.join(root, "ROADMAP.jsonl");
  if (!fs.existsSync(roadmapPath)) return;

  let roadmapText = "";
  try {
    roadmapText = fs.readFileSync(roadmapPath, "utf-8");
  } catch {
    return;
  }

  const blocks = [];
  if (roadmapText.includes('"status":"in_progress"') || roadmapText.includes('"status": "in_progress"')) {
    blocks.push(statusSyncBlock());
  }
  if (readConfig(root).discoverySuggestions) {
    blocks.push(discoveryBlock());
  }
  if (!blocks.length) return;

  const payload = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: blocks.join("\n\n"),
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

module.exports = {
  main,
  isGitCommit,
  commitFailed,
  readConfig,
  projectDir,
  statusSyncBlock,
  discoveryBlock,
  SCHEMA_PATH,
};
