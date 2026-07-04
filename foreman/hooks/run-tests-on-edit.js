#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT
  ? path.resolve(process.env.CLAUDE_PLUGIN_ROOT)
  : path.resolve(__dirname, "..");
const TESTS_DIR = path.join(PLUGIN_ROOT, "tests");
const WATCHED_TOOLS = new Set(["Edit", "Write"]);
const WATCHED_DIRS = [path.join(PLUGIN_ROOT, "scripts"), path.join(PLUGIN_ROOT, "hooks")];

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

// Only foreman's own CRUD/hook scripts trip this — editing anything else
// in a project (or elsewhere in this monorepo) stays silent.
function targetsWatchedScript(filePath) {
  if (!filePath) return false;
  const resolved = path.resolve(String(filePath)).toLowerCase();
  if (!resolved.endsWith(".js")) return false;
  return WATCHED_DIRS.some((dir) => resolved.startsWith(dir.toLowerCase() + path.sep));
}

// A bare directory path makes node's test runner try to require() it
// instead of recursing on this node version — the glob form is what
// actually discovers every *.test.js file.
function testGlob() {
  return path.join(TESTS_DIR, "*.test.js");
}

// Strip node's own test-runner IPC markers before spawning the nested
// `node --test` — inheriting NODE_TEST_CONTEXT (set when this hook's own
// test runs as an isolated child under `node --test`) makes the nested
// process misbehave and exit silently instead of reporting real results.
function cleanEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_CHANNEL_FD;
  return env;
}

function runTests() {
  try {
    execSync(`node --test "${testGlob()}"`, { stdio: "pipe", timeout: 25000, env: cleanEnv() });
    return { passed: true };
  } catch (err) {
    const output = `${err.stdout || ""}${err.stderr || ""}` || err.message || "";
    return { passed: false, output: String(output) };
  }
}

function main() {
  const data = readInput();
  if (!WATCHED_TOOLS.has(data.tool_name)) return;
  if (!targetsWatchedScript(data.tool_input?.file_path)) return;
  if (!fs.existsSync(TESTS_DIR)) return;

  const result = runTests();
  if (result.passed) return; // silent on green, same as every other Foreman hook

  const stats = (result.output.match(/^# (?:tests|pass|fail) .+$/gm) || []).join("; ");
  const edited = path.basename(String(data.tool_input.file_path));

  const payload = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `[Foreman] node --test tests/ failed after this edit to ${edited}. ` +
        `${stats} Run \`node --test "${testGlob()}"\` for the full trace before moving on.`,
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

module.exports = { main, targetsWatchedScript, runTests, testGlob, TESTS_DIR, PLUGIN_ROOT };
