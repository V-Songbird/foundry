#!/usr/bin/env node
"use strict";

// Repository dev hook, shipped with no plugin: reruns a plugin's own test
// suite after an Edit/Write lands in that plugin's scripts/ or hooks/ dir, so
// a regression surfaces at once instead of waiting for someone to run the
// suite by hand. Registered in .claude/settings.json and .codex/hooks.json.
// Patch events can touch several plugins; each affected suite runs once.
// One suite runs at a time per plugin checkout: an edit that lands while it
// runs is picked up by a rerun, so the report reflects the last edit.
// A plugin whose whole suite outlasts the budget runs only the test files
// that cover the edited modules; see coveringTests.
//
// The plugins are submodules pinned by commit. The hook reads whatever is
// checked out, so it also covers topic-branch work done inside a submodule.
// It lives under scripts/ rather than .claude/ because Node's test discovery
// skips dot-directories, and a suite nobody runs is no suite.

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const WATCHED_TOOLS = new Set(["Edit", "Write", "apply_patch"]);
const WATCHED_SUBDIRS = new Set(["scripts", "hooks"]);

// Must stay under this hook's own `timeout` in .claude/settings.json -- Claude
// Code kills the whole hook at that mark. foreman's suite was the long pole at
// ~35s, hush's and razor's under 10s, measured on v22.22.2, so the cap was
// headroom rather than a target; foreman's has since taken 110-300s. A suite
// slower than this reports "did not complete", not a verdict -- raise this,
// HOOK_TIMEOUT_MS and both hook configs together if that has to change.
const TEST_TIMEOUT_MS = 110000;
// The hook's own `timeout`: no live hook holds a plugin's lock longer.
const HOOK_TIMEOUT_MS = 120000;
// Plugins, by plugin.json name, whose whole suite does not fit TEST_TIMEOUT_MS
// (foreman's: 296 s, 1869 tests), so an edit runs only its covering tests.
const SELECTIVE_PLUGINS = new Set(["foreman"]);

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

const isPlugin = (dir) => fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json"));

// The root is the nearest .git at or above the start that is not a plugin's
// own: a submodule or a plugin worktree under .private/ has a .git file of its
// own, and the Foundry root is the one above it. A patch event names no
// project, so it starts from cwd; Edit and Write start from the session's
// project, which can itself be a plugin checkout or worktree.
function repoRoot(data = {}) {
  const start = path.resolve((data.tool_name === "apply_patch" ? data.cwd : process.env.CLAUDE_PROJECT_DIR) || process.cwd());
  let dir = start;
  while (!fs.existsSync(path.join(dir, ".git")) || isPlugin(dir)) {
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
  return dir; // .git can be a directory or a worktree pointer file.
}

function editedPaths(data) {
  if (data.tool_name !== "apply_patch") return [data.tool_input?.file_path].filter(Boolean);
  const patch = data.tool_input?.command;
  if (typeof patch !== "string") return [];
  return [...patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)\r?$/gm)]
    .map((match) => match[1].trimEnd())
    .filter(Boolean)
    .map((file) => path.resolve(data.cwd || process.cwd(), file));
}

// The plugin folder is the edited file's outermost ancestor below the repo root
// that is confirmed to be a plugin (.claude-plugin/plugin.json present), such
// as foreman/ or a worktree at .private/foreman-799/, and the edit counts only
// if it landed under THAT folder's own watched dir -- not just any directory
// that happens to contain a dir by one of those names.
//
// Both module flavours count, .js and .mjs, whatever a plugin picks.
function findPluginRoot(root, filePath) {
  if (!filePath) return null;
  const resolved = path.resolve(String(filePath));
  if (!/\.m?js$/i.test(resolved)) return null;
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  // depth counts the plugin folder's segments; <watched>/<file> follow it.
  // Outermost first, so a fixture plugin inside a plugin's tests/ is not one.
  for (let depth = 1; depth <= parts.length - 2; depth++) {
    const pluginRoot = path.join(root, ...parts.slice(0, depth));
    if (isPlugin(pluginRoot)) return WATCHED_SUBDIRS.has(parts[depth].toLowerCase()) ? pluginRoot : null;
  }
  return null;
}

// Discovery runs from inside the plugin, never from a glob argument: a bare
// `node --test` recurses from cwd and finds every tests/*.test.js file without
// depending on the runner's glob support. A selective run names its files.

const pluginName = (pluginRoot) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf-8")).name;
  } catch {
    return "";
  }
};

// The test files in tests/ named after an edited module cover it
// (post-commit.js -> post_commit.test.js or post-commit.test.js). A module
// with none is covered by the files naming it in a quoted path, such as
// require("../hooks/lib") or "discovery.js". Named files come first because
// every file naming foreman's roadmap.js took 113 s, its own test 36 s.
// Returns plugin-relative paths, sorted so an edit always gets the same lock.
function coveringTests(pluginRoot, files) {
  let tests;
  try {
    tests = fs.readdirSync(path.join(pluginRoot, "tests")).filter((file) => /\.test\.m?js$/.test(file));
  } catch {
    return [];
  }
  const covering = new Set();
  const sources = new Map();
  const source = (test) => {
    if (!sources.has(test)) sources.set(test, readFile(path.join(pluginRoot, "tests", test)));
    return sources.get(test);
  };
  for (const file of files) {
    const stem = path.basename(file).replace(/\.m?js$/i, "");
    const names = [stem.toLowerCase(), stem.toLowerCase().replace(/-/g, "_")];
    const named = tests.filter((test) => names.includes(test.replace(/\.test\.m?js$/, "").toLowerCase()));
    const quoted = new RegExp(`[/\\\\'"\`]${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\.m?js)?['"\`]`);
    const found = named.length ? named : tests.filter((test) => quoted.test(source(test)));
    for (const test of found) covering.add(`tests/${test}`);
  }
  return [...covering].sort();
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

// No shell between the hook and the runner, so the timeout kills the runner
// itself rather than a cmd.exe that leaves it running beside the next suite.
function runTests(pluginRoot, timeout = TEST_TIMEOUT_MS, tests = []) {
  if (timeout <= 0) return { passed: false, output: "Hook test budget exhausted before this suite started." };
  try {
    execFileSync(process.execPath, ["--test", ...tests], { cwd: pluginRoot, stdio: "pipe", timeout, env: cleanEnv() });
    return { passed: true };
  } catch (err) {
    const output = `${err.stdout || ""}${err.stderr || ""}` || err.message || "";
    return { passed: false, output: String(output), timedOut: err.code === "ETIMEDOUT" };
  }
}

// Per-checkout files in the system temp dir, outside every working tree. A
// selective run locks its own file set, so a rerun covers the same files.
function lockPaths(pluginRoot, tests = []) {
  const id = [process.platform === "win32" ? pluginRoot.toLowerCase() : pluginRoot, ...tests].join("\n");
  const base = path.join(os.tmpdir(), `foundry-run-tests-${crypto.createHash("sha1").update(id).digest("hex").slice(0, 16)}`);
  return { lock: `${base}.lock`, stamp: `${base}.stamp` };
}

const readFile = (file) => {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return "";
  }
};

// A lock is stale once its holder is gone or older than any live hook, which
// also covers a holder killed at the hook timeout and a reused pid.
function isStale(lock) {
  try {
    if (Date.now() - fs.statSync(lock).mtimeMs > HOOK_TIMEOUT_MS) return true;
    const pid = Number(readFile(lock));
    if (!pid) return false; // just created, pid not written yet
    process.kill(pid, 0);
    return false;
  } catch (err) {
    return err.code !== "EPERM"; // EPERM: alive, owned by someone else
  }
}

function acquire(lock) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(lock, String(process.pid), { flag: "wx" });
      return true;
    } catch (err) {
      if (err.code !== "EEXIST") return true; // no usable temp dir: run unguarded
      if (!isStale(lock)) return false;
      fs.rmSync(lock, { force: true });
    }
  }
  return false;
}

function release(lock) {
  if (readFile(lock) === String(process.pid)) fs.rmSync(lock, { force: true });
}

// Every call stamps the checkout before it tries the lock. A call that finds
// the lock held returns null: the holder sees the new stamp and reruns, as
// long as the budget fits another run as long as the last. When the budget
// ran out first, the result is marked untested so the report says so.
function runCoalesced(pluginRoot, deadline, tests = []) {
  if (deadline <= Date.now()) return runTests(pluginRoot, 0); // an earlier plugin spent the budget
  const { lock, stamp } = lockPaths(pluginRoot, tests);
  try {
    fs.writeFileSync(stamp, `${process.pid}-${Date.now()}-${Math.random()}`);
  } catch {}
  let result = null;
  let tested = null;
  let took = 0;
  let held = false;
  const due = () => readFile(stamp) !== tested && deadline - Date.now() > took;
  while (due() && (held = acquire(lock))) {
    try {
      while (due()) {
        tested = readFile(stamp);
        const start = Date.now();
        result = runTests(pluginRoot, deadline - start, tests);
        took = Date.now() - start;
      }
    } finally {
      release(lock);
    }
  }
  // A failed acquire means a newer holder covers the latest stamp.
  if (result && held && readFile(stamp) !== tested) result.untested = true;
  return result;
}

function main() {
  const data = readInput();
  if (!WATCHED_TOOLS.has(data.tool_name)) return;

  const root = repoRoot(data);
  const plugins = new Map();
  for (const file of editedPaths(data)) {
    const pluginRoot = findPluginRoot(root, file);
    if (pluginRoot && fs.existsSync(path.join(pluginRoot, "tests"))) {
      if (!plugins.has(pluginRoot)) plugins.set(pluginRoot, new Set());
      plugins.get(pluginRoot).add(path.basename(file));
    }
  }
  const deadline = Date.now() + TEST_TIMEOUT_MS;
  const feedback = [];
  for (const [pluginRoot, files] of plugins) {
    const name = path.relative(root, pluginRoot).split(path.sep).join("/");
    const edited = [...files].join(", ");
    const selective = SELECTIVE_PLUGINS.has(pluginName(pluginRoot));
    const tests = selective ? coveringTests(pluginRoot, [...files]) : [];
    if (selective && !tests.length) {
      feedback.push(`[foundry] No test file in ${name}/tests/ covers ${edited}, and the whole suite outlasts the hook's ${TEST_TIMEOUT_MS / 1000} s limit, so none ran. The whole suite takes minutes (about 100-300 s): run \`node --test\` from ${name}/ in the background or with a tool timeout above 300 s before moving on.`);
      continue;
    }
    const result = runCoalesced(pluginRoot, deadline, tests);
    if (!result || (result.passed && !result.untested)) continue; // silent on green or while another run covers it
    feedback.push(failureContext(name, edited, result, tests));
  }
  if (!feedback.length) return;
  const payload = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: feedback.join("\n"),
    },
  };
  process.stdout.write(Buffer.from(JSON.stringify(payload), "utf-8"));
}

// pluginName is the plugin folder's path from the root, such as foreman or
// .private/foreman-799, so the rerun instruction names a real directory.
// tests lists a selective run's files; empty means the whole suite ran.
function failureContext(pluginName, edited, result, tests = []) {
  const output = result.output || "";
  const stats = (output.match(/^# (?:tests|pass|fail) .+$/gm) || []).join("; ");

  // A test file that exits before reporting its tests is listed under its own
  // path with an exitCode -- usually a module that fails to load half-way
  // through a multi-edit change. When every failure is one of those, say so.
  const fails = Number((output.match(/^# fail (\d+)/m) || [])[1]);
  const unloaded = fails > 0 && (output.match(/^ +exitCode: \d+/gm) || []).length === fails;

  // No TAP summary means the run never reached a verdict -- killed by the
  // timeout, or node bailed before the first test. Say so rather than blame a
  // test that never ran; a timed-out run's last lines are just a test in flight.
  const verdict = result.passed ? "passed" : !stats ? "did not complete" : unloaded ? "could not load a test file" : "failed";
  const detail = result.passed ? ""
    : result.timedOut && !stats ? `It was stopped at the hook's ${TEST_TIMEOUT_MS / 1000} s limit, not by a test.`
    : unloaded ? `${(output.match(/^# (\w*Error\b.*)$/m) || [, ""])[1].trim()} (${stats}). Expected mid-way through a multi-edit change; not if the change is done.`
    : stats || output.trim().split(/\r?\n/).slice(-3).join(" ").slice(0, 300);
  const untested = result.untested ? "Files changed again during the run and the hook's budget ran out before a rerun." : "";

  const scope = tests.length ? ` (${tests.length} test file${tests.length === 1 ? "" : "s"} covering it)` : "";
  return [`[foundry] node --test ${pluginName}/${scope} ${verdict} after this edit to ${edited}.`, detail, untested,
    `Run \`${["node --test", ...tests].join(" ")}\` from ${pluginName}/ for the full trace before moving on.`].filter(Boolean).join(" ");
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.exit(0);
  }
}

module.exports = { main, findPluginRoot, coveringTests, runTests, repoRoot, editedPaths, lockPaths, failureContext };
