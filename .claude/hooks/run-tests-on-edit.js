#!/usr/bin/env node
"use strict";

// Repo-wide dev hook (not shipped with any plugin): reruns whichever
// plugin's own test suite after an Edit/Write lands in that plugin's
// scripts/ or hooks/ dir, so a regression surfaces immediately instead of
// sitting silent until someone runs the suite by hand. Registered in
// .claude/settings.json, not any plugin's hooks.json -- CLAUDE_PLUGIN_ROOT
// isn't set at this level, only CLAUDE_PROJECT_DIR (this repo's root).

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const WATCHED_TOOLS = new Set(["Edit", "Write"]);
const WATCHED_SUBDIRS = new Set(["scripts", "hooks"]);

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

function repoRoot() {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
}

// The edited file's first path segment (relative to repo root) is the
// plugin folder, but only if the edit landed under THAT folder's own
// scripts/ or hooks/ dir and the folder is confirmed to actually be a
// plugin (.claude-plugin/plugin.json present) -- not just any top-level
// repo directory that happens to contain a dir named scripts/hooks.
function findPluginRoot(root, filePath) {
  if (!filePath) return null;
  const resolved = path.resolve(String(filePath));
  if (!resolved.toLowerCase().endsWith(".js")) return null;
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  if (parts.length < 3) return null; // need <plugin>/<scripts|hooks>/<file...>
  const [pluginDir, subDir] = parts;
  if (!WATCHED_SUBDIRS.has(subDir.toLowerCase())) return null;
  const pluginRoot = path.join(root, pluginDir);
  if (!fs.existsSync(path.join(pluginRoot, ".claude-plugin", "plugin.json"))) return null;
  return pluginRoot;
}

// A bare directory path makes node's test runner try to require() it
// instead of recursing (confirmed on node v22.22.2) -- the glob form is
// what actually discovers every *.test.js file.
function testGlob(pluginRoot) {
  return path.join(pluginRoot, "tests", "*.test.js");
}

// Strip node's own test-runner IPC markers before spawning the nested
// `node --test` -- inheriting NODE_TEST_CONTEXT (set when this hook's own
// test runs as an isolated child under `node --test`) makes the nested
// process misbehave and exit silently instead of reporting real results.
function cleanEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_CHANNEL_FD;
  return env;
}

function runTests(pluginRoot) {
  try {
    execSync(`node --test "${testGlob(pluginRoot)}"`, { stdio: "pipe", timeout: 25000, env: cleanEnv() });
    return { passed: true };
  } catch (err) {
    const output = `${err.stdout || ""}${err.stderr || ""}` || err.message || "";
    return { passed: false, output: String(output) };
  }
}

function main() {
  const data = readInput();
  if (!WATCHED_TOOLS.has(data.tool_name)) return;

  const root = repoRoot();
  const pluginRoot = findPluginRoot(root, data.tool_input?.file_path);
  if (!pluginRoot) return;
  if (!fs.existsSync(path.join(pluginRoot, "tests"))) return;

  const result = runTests(pluginRoot);
  if (result.passed) return; // silent on green, same as every Foreman hook

  const stats = (result.output.match(/^# (?:tests|pass|fail) .+$/gm) || []).join("; ");
  const pluginName = path.basename(pluginRoot);
  const edited = path.basename(String(data.tool_input.file_path));

  const payload = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `[claude-plugins] node --test ${pluginName}/tests/ failed after this edit to ${edited}. ` +
        `${stats} Run \`node --test "${testGlob(pluginRoot)}"\` for the full trace before moving on.`,
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

module.exports = { main, findPluginRoot, runTests, testGlob, repoRoot };
