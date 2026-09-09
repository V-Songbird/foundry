"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { FILES, SHARED_SECTIONS, checkFiles, checkCommon } = require("./check-main-frontpage");
const readme = plugin => `# ${plugin}\n[Claude](https://github.com/V-Songbird/${plugin}/tree/Claude)\n[Codex](https://github.com/V-Songbird/${plugin}/tree/Codex)\n<img src="assets/mascot.svg">\n<img src="assets/hero.svg">\n<img src="assets/demo.svg">\n` + SHARED_SECTIONS.map(h => `## ${h}\n\nShared ${h}\n`).join('\n');

test("a thin selector without product information is rejected", () => {
  assert.ok(checkFiles(FILES, '# razor\n', 'razor').some(e => e.includes('Missing product overview')));
  assert.ok(checkFiles(FILES, readme('razor').replace('<img src="assets/mascot.svg">', ''), 'razor').some(e => e.includes('animation')));
});

test("common narrative must match both editions while native commands stay separate", () => {
  const main = readme('razor');
  const native = command => main + `\n<!-- foundry:platform commands -->\n${command}\n<!-- /foundry:platform commands -->\n`;
  assert.deepEqual(checkCommon(main, native('/razor:unused'), native('$unused')), []);
  assert.ok(checkCommon(main.replace('Shared How it works', 'Different behavior'), native('Claude'), native('Codex')).length);
  assert.ok(checkCommon(main, native('Claude'), native('Codex').replace('Shared How it works', 'Different behavior')).length);
});
test("only the documentation selector, assets and minimal maintenance CI pass", () => {
  for (const plugin of ["foreman", "hush", "razor"]) assert.deepEqual(checkFiles(FILES, readme(plugin), plugin), []);
});

test("branding refreshes cannot silently remove product heroes or demos", () => {
  for (const name of ['hero', 'demo']) {
    assert.ok(checkFiles(FILES, readme('razor').replace(`<img src="assets/${name}.svg">`, ''), 'razor').some(e => e.includes('hero and demo')));
  }
});
test("runtime, benchmark, instruction and unrelated CI files cannot enter main", () => {
  for (const file of ["scripts/run.js", "hooks/hooks.json", ".codex-plugin/plugin.json", ".claude-plugin/plugin.json", "AGENTS.md", "CLAUDE.md", "benchmarks/README.md", ".github/workflows/release.yml"]) {
    assert.ok(checkFiles([...FILES, file], readme("foreman"), "foreman").some(e => e.includes(file)));
  }
});
test("every required file must remain present", () => {
  for (const file of FILES) assert.ok(checkFiles(FILES.filter(f => f !== file), readme("razor"), "razor").some(e => e.includes(file)));
});
test("links must belong to the correct plugin and exact edition branches", () => {
  assert.ok(checkFiles(FILES, readme("razor"), "hush").some(e => e.includes("Missing Claude")));
  assert.ok(checkFiles(FILES, readme("hush").replace("/tree/Codex", "/tree/main"), "hush").some(e => e.includes("Missing Codex")));
});
test("a full platform README and duplicated installation steps fail", () => {
  for (const content of ["/plugin install hush@foundry", "codex plugin add hush@foundry", "<!-- foundry:edition Codex -->", "## The numbers\nA benchmark table"]) assert.ok(checkFiles(FILES, readme("hush") + content, "hush").length);
});
test("the checker refuses to apply this policy to Flint", () => {
  assert.throws(() => checkFiles(FILES, readme("flint"), "flint"), /Flint is outside/);
});

test("the packaged main check validates a committed selector and rejects reintroduced runtime", () => {
  const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), cp = require("node:child_process");
  const temp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "foundry-main-ci-"));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  const git = args => cp.execFileSync("git", args, { cwd: temp, env, stdio: "pipe" });
  try {
    for (const file of FILES) {
      const target = path.join(temp, file); fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file === "README.md" ? readme("foreman") : "fixture\n");
    }
    fs.copyFileSync(path.join(__dirname, "check-main-frontpage.js"), path.join(temp, ".github/check-main-frontpage.cjs"));
    fs.copyFileSync(path.join(__dirname, "../../.github/PLUGIN_MAIN_WORKFLOW.yml"), path.join(temp, ".github/workflows/test.yml"));
    git(["init", "-q"]); git(["config", "user.email", "fixture@example.invalid"]); git(["config", "user.name", "Fixture"]); git(["config", "commit.gpgsign", "false"]);
    git(["add", "."]); git(["commit", "-qm", "selector fixture"]);
    const check = () => cp.spawnSync(process.execPath, [".github/check-main-frontpage.cjs", "--repo", ".", "--plugin", "foreman", "--ref", "HEAD"], { cwd: temp, env, encoding: "utf8" });
    const good = check(); assert.equal(good.status, 0, good.stderr);
    fs.mkdirSync(path.join(temp, "hooks")); fs.writeFileSync(path.join(temp, "hooks/runtime.js"), "module.exports = {};\n");
    git(["add", "."]); git(["commit", "-qm", "forbidden fixture"]);
    const bad = check(); assert.equal(bad.status, 1); assert.match(bad.stderr, /Unexpected main file: hooks\/runtime.js/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
