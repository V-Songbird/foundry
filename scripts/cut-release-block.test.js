"use strict";

// Runs the pin-check block of cut-release step 4 with bash exactly as the
// skill writes it, because a block that only ever gets read can break
// unnoticed. The syntax test runs wherever a bash finds node and git. The run needs every catalogued
// plugin checked out, so a worktree or an export without them skips it and
// names what is missing; CI checks out no submodules, so this stays local.
// CUT_RELEASE_SKILL points the extraction at another copy of the skill.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SKILL = process.env.CUT_RELEASE_SKILL || path.join(ROOT, ".claude/skills/cut-release/SKILL.md");
const CATALOGS = [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"];

function stepFourBlock() {
  const step = fs.readFileSync(SKILL, "utf8").replace(/\r\n/g, "\n").split(/^## Step 4\b/m)[1]?.split(/^## /m)[0] ?? "";
  const block = step.match(/^```bash\n([\s\S]*?)^```$/m);
  assert.ok(block, `no bash block in step 4 of ${SKILL}`);
  assert.match(block[1], /^node scripts\/check-shared-copies\.js/m, "step 4's first bash block has no shared-copy check");
  return block[1];
}

// `bash` on PATH can be the WSL launcher on Windows, which has no node, so
// Git's own bash comes first and a shell counts only if it finds node and git.
function findBash() {
  const execPath = (spawnSync("git", ["--exec-path"], { encoding: "utf8" }).stdout || "").trim();
  const candidates = [...(execPath ? [path.join(execPath, "..", "..", "..", "bin", "bash.exe")] : []), "bash"];
  return candidates.find((bin) => spawnSync(bin, ["-c", "command -v node && command -v git"], { encoding: "utf8" }).status === 0);
}
const BASH = findBash();

test("step 4's pin-check block parses in bash", { skip: !BASH && "no bash that finds node and git" }, () => {
  const run = spawnSync(BASH, ["-n", "-c", stepFourBlock()], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});

test("step 4's pin-check block exits 0 from the Foundry root", { skip: !BASH && "no bash that finds node and git" }, (t) => {
  const plugins = [...new Set(CATALOGS.flatMap((c) => JSON.parse(fs.readFileSync(path.join(ROOT, c), "utf8")).plugins.map((p) => p.name)))];
  const missing = plugins.filter((p) => !fs.existsSync(path.join(ROOT, p, ".git")));
  if (missing.length) return t.skip(`no plugin checkout for ${missing.join(", ")} under ${ROOT}`);
  // -e makes every command in the block count, not just the last one.
  const run = spawnSync(BASH, ["-e", "-c", stepFourBlock()], { cwd: ROOT, encoding: "utf8", timeout: 120000 });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
});
