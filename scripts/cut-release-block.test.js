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
const os = require("os");
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

// A throwaway root pins one plugin; each case breaks one agreement, and the
// pin check alone must exit non-zero on it.
test("step 4's pin check exits non-zero on every mismatch it prints", { skip: !BASH && "no bash that finds node and git" }, async (t) => {
  const pinCheck = stepFourBlock().split(/^node scripts\/check-shared-copies/m)[0];
  const git = (cwd, ...args) => {
    const run = spawnSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
    assert.equal(run.status, 0, `git ${args.join(" ")}: ${run.stderr}`);
    return run.stdout.trim();
  };
  const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data)); };
  const cases = {
    "all agree": { status: 0, text: "gitlink ok on origin/main" },
    "manifests": { status: 1, text: "MANIFEST VERSIONS DIFFER" },
    "gitlink": { status: 1, text: "GITLINK DIFFERS" },
    "pushed": { status: 1, text: "NOT ON origin/main" },
  };
  for (const [name, want] of Object.entries(cases)) await t.test(name, (t) => {
    const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "pincheck-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const plugin = path.join(root, "p");
    fs.mkdirSync(plugin);
    git(plugin, "init", "-q");
    write(path.join(plugin, ".claude-plugin/plugin.json"), { version: "1.0.0" });
    write(path.join(plugin, "plugin.json"), { version: name === "manifests" ? "1.0.1" : "1.0.0" });
    git(plugin, "add", ".");
    git(plugin, "commit", "-q", "-m", "fixture");
    const sha = git(plugin, "rev-parse", "HEAD");
    if (name !== "pushed") git(plugin, "update-ref", "refs/remotes/origin/main", sha);
    git(root, "init", "-q");
    for (const c of CATALOGS) write(path.join(root, c), { plugins: [{ name: "p", source: { sha, ref: "main" } }] });
    git(root, "update-index", "--add", "--cacheinfo", `160000,${name === "gitlink" ? "1".repeat(40) : sha},p`);
    const run = spawnSync(BASH, ["-e", "-c", pinCheck], { cwd: root, encoding: "utf8" });
    assert.match(run.stdout, new RegExp(want.text), `${name}: ${run.stdout}${run.stderr}`);
    assert.equal(run.status, want.status, `${name}: ${run.stdout}${run.stderr}`);
  });
});
