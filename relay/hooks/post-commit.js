#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const { readEntries } = require("../scripts/roadmap");

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT
  ? path.resolve(process.env.CLAUDE_PLUGIN_ROOT)
  : path.resolve(__dirname, "..");
const SCRIPT_PATH = path.join(PLUGIN_ROOT, "scripts", "roadmap.js");

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
    "If it does, run `git rev-parse --short HEAD` for the commit SHA, then: " +
    `echo '{"id":"<id>","status":"done","commit":"<sha>"}' | node ${SCRIPT_PATH} update-status. ` +
    "The script computes updated_at and appends the SHA — don't hand-edit the file."
  );
}

function discoveryBlock() {
  return (
    "[Relay] Roadmap discovery is enabled for this project. Scan this " +
    "commit's work for CONFIRMED opportunities, bugs, or ideas — not vague " +
    "hunches. If you add one to the roadmap, write it dense using only " +
    "what's already in this session's context (exact paths, line ranges, " +
    "symbol names, the specific behavior observed) — do NOT run extra " +
    "Read/Grep/Bash calls just to enrich the entry, that spends tokens now " +
    "instead of saving them for whoever picks it up later. Before asking " +
    "about it, check it isn't a repeat of something already declined: " +
    `echo '{"title":"...","why":"..."}' | node ${SCRIPT_PATH} check-duplicate ` +
    "— skip it silently if duplicate:true. Otherwise ask the user " +
    "(AskUserQuestion) what to do with it: Add to roadmap / Execute with " +
    "TaskCreate (work it now in this session, tracked) / Execute with a " +
    "background Agent (run_in_background: true) / Reject — both Add and " +
    "Reject use the same `add` call, only the status field differs " +
    '("planned" for Add, "rejected" for Reject): ' +
    `echo '{"title":"...","why":"...","what":"...","source":"claude-suggested","status":"planned"}' | node ${SCRIPT_PATH} add. ` +
    "Never call " +
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
  if (!fs.existsSync(path.join(root, "ROADMAP.jsonl"))) return;

  let entries;
  try {
    entries = readEntries(root);
  } catch {
    return; // corrupt file — stay silent rather than nudge Claude into writing on top of it
  }

  const blocks = [];
  if (entries.some((e) => e.status === "in_progress")) {
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
  SCRIPT_PATH,
};
