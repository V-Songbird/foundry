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
const { execFileSync } = require("child_process");

const { editPaths } = require("./edit-paths");
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
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || path.join(__dirname, "..", ".."));
}

// Resolve the nearest owning edition, including deep worktrees. Archived
// benchmark arms and dependency trees must never trigger a product test run.
function findPluginRoot(root, filePath) {
  if (typeof filePath !== "string" || !filePath) return null;
  root = path.resolve(root);
  const resolved = path.resolve(root, filePath);
  if (!resolved.toLowerCase().endsWith(".js")) return null;
  const rel = path.relative(root, resolved);
  if (!rel || rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  const excluded = new Set([".git", ".scratch", "node_modules", "benchmarks", "fixtures", "arms"]);
  if (parts.some(part => excluded.has(part.toLowerCase()))) return null;
  for (let candidate = path.dirname(resolved); ; candidate = path.dirname(candidate)) {
    const marker = [".claude-plugin", ".codex-plugin"].some(dir =>
      fs.existsSync(path.join(candidate, dir, "plugin.json")));
    if (marker) {
      const subDir = path.relative(candidate, resolved).split(path.sep)[0];
      return WATCHED_SUBDIRS.has(subDir.toLowerCase()) ? candidate : null;
    }
    if (candidate === root) break;
  }
  return null;
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
  // A hook may inherit Git's parent-repository routing. Tests own their cwd.
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  return env;
}

function runTests(pluginRoot, timeout = 90000) {
  try {
    execFileSync(process.execPath, ["--test", testGlob(pluginRoot)], {
      cwd: pluginRoot, stdio: "pipe", timeout, env: cleanEnv(),
      windowsHide: true, maxBuffer: 16 * 1024 * 1024,
    });
    return { passed: true };
  } catch (err) {
    const output = `${err.stdout || ""}${err.stderr || ""}` || err.message || "";
    return { passed: false, timedOut: err.code === "ETIMEDOUT", output: String(output) };
  }
}

function main() {
  const data = readInput();
  const root = repoRoot();
  const cwd = typeof data.cwd === "string" ? path.resolve(data.cwd) : root;
  const owners = new Map();
  for (const file of editPaths(data)) {
    const owner = findPluginRoot(root, path.resolve(cwd, file));
    if (owner && fs.existsSync(path.join(owner, "tests"))) owners.set(owner, file);
  }
  const deadline = Date.now() + 90000;
  const messages = [];
  for (const [pluginRoot, file] of owners) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      messages.push(`[foundry] Tests for ${path.relative(root, pluginRoot)} were not run: the hook time budget was exhausted. Run node --test "${testGlob(pluginRoot)}".`);
      continue;
    }
    const result = runTests(pluginRoot, remaining);
    if (result.passed) continue;
    const stats = (result.output.match(/^# (?:tests|pass|fail) .+$/gm) || []).join("; ");
    const pluginName = path.basename(pluginRoot);
    const edited = path.basename(file);
    messages.push(`[foundry] node --test ${pluginName}/tests/ ${result.timedOut ? "did not finish within the hook time limit" : "failed"} after this edit to ${edited}. ` +
      `${stats} Run \`node --test "${testGlob(pluginRoot)}"\` for the full trace before moving on.`);
  }
  if (!messages.length) return;
  const payload = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: messages.join("\n"),
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
