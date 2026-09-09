"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..", "..");
const native = JSON.parse(fs.readFileSync(path.join(root, ".codex", "hooks.json"), "utf8"));
const claude = JSON.parse(fs.readFileSync(path.join(root, ".claude", "settings.json"), "utf8"));

test("both clients bind the same three maintenance checks with sufficient test time", () => {
  const codexHandlers = native.hooks.PostToolUse.flatMap(group => group.hooks);
  const claudeHandlers = claude.hooks.PostToolUse.flatMap(group => group.hooks);
  for (const file of ["run-tests-on-edit.js", "nudge-manifest-curator.js", "check-checkpoint-commits.js"]) {
    assert.equal(codexHandlers.filter(handler => handler.command.includes(file)).length, 1);
    assert.equal(claudeHandlers.filter(handler => handler.command.includes(file)).length, 1);
  }
  for (const handlers of [codexHandlers, claudeHandlers]) {
    assert.ok(handlers.find(handler => handler.command.includes("run-tests-on-edit.js")).timeout > 90);
  }
});

test("native command locates Foundry from a subdirectory and a deep plugin checkout", () => {
  const handler = native.hooks.PostToolUse.flatMap(group => group.hooks)
    .find(item => item.command.includes("nudge-manifest-curator.js"));
  const windows = process.platform === "win32";
  const shell = windows ? "pwsh" : "/bin/sh";
  for (const relative of ["scripts", ".claude/worktrees/platform-isolation/foreman-Claude"]) {
    const cwd = path.join(root, relative);
    // CI may not have the local edition worktrees; the subdirectory case always runs.
    if (!fs.existsSync(cwd)) continue;
    const command = windows ? handler.commandWindows : handler.command;
    const args = windows ? ["-NoProfile", "-NonInteractive", "-Command", command] : ["-c", command];
    const result = spawnSync(shell, args, { cwd, encoding: "utf8", timeout: 10000, windowsHide: true,
      env: { ...process.env, PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH },
      input: JSON.stringify({ tool_name: "apply_patch", cwd, tool_input: { command:
        "*** Begin Patch\n*** Update File: .codex-plugin/plugin.json\n@@\n-old\n+new\n*** End Patch" } }),
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /manifest-curator/);
  }
});
