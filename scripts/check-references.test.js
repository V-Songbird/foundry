"use strict";

// Tests for check-references.js. Each fixture is a throwaway Git repository in the system temp
// directory: good/ holds one valid reference of every kind, bad/ plants one break per kind.
// The last test runs the check on this repository, because a check that only sees its own
// fixtures proves nothing about the tree it guards.

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const SCRIPT = path.join(__dirname, "check-references.js");
const ROOT = path.resolve(__dirname, "..");

const COMMON = {
  ".gitignore": "private/\nmemory/\n",
  "README.md": "# Demo\n\n## Install steps\n\nSee [guide](docs/guide.md#usage) and [self](#install-steps).\n",
  "docs/guide.md": "---\ntype: knowledge\nsummary: x\nrelated_files: [README.md, scripts/run.js]\n---\n\n# Guide\n\n## Usage\n\nRun `node scripts/run.js` and read `docs/guide.md`.\n",
  "scripts/run.js": "\n",
  "plug/.claude-plugin/plugin.json": "{ \"name\": \"plug\", \"version\": \"1.0.0\", \"hooks\": \"./hooks/hooks.json\" }\n",
  "plug/hooks/hooks.json": "{ \"modules\": [\"./register.tsx\"], \"hooks\": { \"Stop\": [{ \"hooks\": [{ \"type\": \"command\", \"command\": \"node ${CLAUDE_PLUGIN_ROOT}/hooks/stop.js\" }] }] } }\n",
  "plug/hooks/register.tsx": "\n",
  "plug/hooks/stop.js": "\n",
  ".claude-plugin/marketplace.json": "{ \"name\": \"m\", \"plugins\": [{ \"name\": \"plug\", \"source\": \"./plug\" }] }\n",
  "skills/demo/SKILL.md": "---\nname: demo\n---\n\nRead `references/ok.md` first.\n",
  "skills/demo/references/ok.md": "# ok\n",
  "skills/demo/agents/openai.yaml": "interface:\n  icon_small: \"./assets/icon.svg\"\n",
  "skills/demo/assets/icon.svg": "<svg/>\n",
  "memory/MEMORY.md": "- [One](one.md) — first\n",
  "memory/one.md": "---\nname: one\n---\n\nSee [[one]].\n",
  "private/notes.md": "# notes\n",
};

const BAD = {
  ...COMMON,
  "README.md": "# Demo\n\n## Install steps\n\nSee [guide](docs/missing.md), [anchor](docs/guide.md#nowhere), [case](Docs/guide.md) and [private](private/notes.md).\n",
  "docs/guide.md": "---\ntype: knowledge\nsummary: x\nrelated_files: [README.md, scripts/gone.js]\n---\n\n# Guide\n\nRun `node scripts/nothere.js`, read `docs/absent.md` and use `/plug:nope`.\n",
  "plug/.claude-plugin/plugin.json": "{ \"name\": \"plug\", \"version\": \"1.0.0\", \"hooks\": \"./hooks/nohooks.json\" }\n",
  "plug/hooks/hooks.json": "{ \"modules\": [\"./missing.tsx\"], \"hooks\": { \"Stop\": [{ \"hooks\": [{ \"type\": \"command\", \"command\": \"node ${CLAUDE_PLUGIN_ROOT}/hooks/gone.js\" }] }] } }\n",
  ".claude-plugin/marketplace.json": "{ \"name\": \"m\", \"plugins\": [{ \"name\": \"plug\", \"source\": \"./nowhere\" }] }\n",
  "skills/demo/SKILL.md": "---\nname: demo\n---\n\nRead `references/gone.md` first.\n",
  "skills/demo/agents/openai.yaml": "interface:\n  icon_small: \"./assets/none.svg\"\n",
  "memory/MEMORY.md": "- [One](one.md) — first\n- [Two](two.md) — gone\n",
  "memory/one.md": "---\nname: one\n---\n\nSee [[ghost]].\n",
  "memory/three.md": "---\nname: three\n---\n\nUnindexed.\n",
};

// Every temp folder a test makes is removed when the file ends.
const made = [];
const tempDir = prefix => { const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); made.push(d); return d; };
after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }); });

function fixture(files) {
  const d = tempDir("check-references-");
  for (const [f, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true });
    fs.writeFileSync(path.join(d, f), body);
  }
  execFileSync("git", ["init", "-q", d]);
  execFileSync("git", ["-C", d, "add", "-A"]);
  return d;
}

function run(root, extra = []) {
  const out = path.join(tempDir("check-references-out-"), "out.json");
  const r = spawnSync(process.execPath, [SCRIPT, "--root", root, "--json", out, ...extra], { encoding: "utf8", maxBuffer: 1 << 26 });
  return { status: r.status, stdout: r.stdout, report: JSON.parse(fs.readFileSync(out, "utf8")) };
}

test("one valid reference of every kind passes with no findings", () => {
  const d = fixture(COMMON);
  const r = run(d, ["--memory", path.join(d, "memory")]);
  assert.equal(r.status, 0, r.stdout);
  assert.deepEqual(r.report.findings, []);
});

test("every planted break is found, hard and soft", () => {
  const d = fixture(BAD);
  const r = run(d, ["--memory", path.join(d, "memory")]);
  assert.equal(r.status, 1);
  const kinds = r.report.counts.byKind;
  assert.equal(r.report.counts.hard, 12, r.stdout);
  assert.equal(r.report.counts.soft, 5, r.stdout);
  for (const k of ["link", "anchor", "clone-view", "related_files", "manifest", "skill-ref", "memory-index"]) assert.ok(kinds[`hard:${k}`], `no hard ${k}: ${JSON.stringify(kinds)}`);
  for (const k of ["command", "code-span-path", "slash-command", "memory-wikilink", "memory-unindexed"]) assert.ok(kinds[`soft:${k}`], `no soft ${k}: ${JSON.stringify(kinds)}`);
});

test("--exclude skips a file and --allow accepts an example target", () => {
  const d = fixture({ ...COMMON, "examples/sample.md": "See [x](src/auth.js).\n", "fixtures/broken.md": "[y](gone.md)\n" });
  const r = run(d, ["--exclude", "(^|/)fixtures/", "--allow", "^src/auth\\.js"]);
  assert.equal(r.status, 0, r.stdout);
});

test("a missing memory folder is skipped and named", () => {
  const d = fixture(COMMON);
  const r = run(d, ["--memory", path.join(d, "no-memory")]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /memory checks skipped/);
});

// Foundry's docs name files inside the plugins, so a worktree or CI run without the submodule
// checkouts would report each as missing.
const absent = ["foreman", "hush", "razor", "flint"].filter(p => !fs.existsSync(path.join(ROOT, p, ".git")));

test("this repository has no hard break", { skip: absent.length ? `no checkout of ${absent.join(", ")}` : false }, () => {
  const r = run(ROOT, [
    "--memory", path.join(ROOT, ".claude", "memory"),
    // The same arguments as the command in AGENTS.md.
    "--exclude", "fixtures/",
    "--exclude", "^benchmarks/hush/anchors/",
    "--allow", "^src/auth\\.js",
    "--allow", "^src/legacy/cache\\.js",
  ]);
  assert.equal(r.status, 0, r.stdout.split("\n").filter(l => l.startsWith("HARD")).join("\n"));
});
