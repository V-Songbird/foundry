"use strict";

// Tests for check-shared-copies.js. The fixtures are synthetic Foundry trees in
// the system temp directory, each a Git repository whose index pins a plugin
// repository per plugin, or for --heads a plain folder of plugin
// repositories. The command reads gitlinks from the checkout it runs in, so
// its tests run it inside a fixture root or a worktree of one. The last block
// runs the check on this repository
// too, because a check that only ever sees its own fixtures proves nothing
// about the tree it guards.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const { afterHeader, fixturesArray, launcherLookup, checkShared, SHARED, checkFlintStyle, cutFlintParts, FLINT_STYLE } = require("./check-shared-copies");

const SCRIPT = path.join(__dirname, "check-shared-copies.js");
const SAFE_WRITE = "hooks/lib/safe-write.js";
const CONFORMANCE = "tests/turn_boundary_conformance.test.js";
const LAUNCHER = "hooks/windows-launcher.ps1";
const WHOLE_FILES = [
  "scripts/git-hooks/check-readme-nav.js",
  "scripts/git-hooks/pre-commit",
  "scripts/git-hooks/vendor/github-slugger-regex.js",
  "scripts/git-hooks/vendor/github-slugger-LICENSE",
  "tests/readme_nav.test.js",
  "tests/pre_commit.test.js",
  "tests/fixtures/github-slugger-fixtures.json",
];

const CODE = [
  "const fs = require(\"fs\");",
  "",
  "function safeWriteFileSync(target, content) {",
  "  // a comment inside the code is part of the code",
  "  fs.writeFileSync(target, content);",
  "}",
].join("\n");

const FIXTURES = [
  "const FIXTURES = [",
  "  { name: \"human prompt\", expected: true },",
  "  { name: \"sidechain\", expected: false },",
  "];",
].join("\n");

const safeWrite = (header, code = CODE) => `"use strict";\n\n${header}\n\n${code}\n`;
const conformance = (header, lib, fixtures = FIXTURES) =>
  `"use strict";\n\n${header}\n\nconst { isRealUserPrompt } = require("${lib}");\n\n${fixtures}\n`;
const changedCode = CODE.replace("writeFileSync(target", "writeFileSync(target + \".tmp\"");

const LOOKUP = (name) => [
  "$ProgressPreference = 'SilentlyContinue'",
  "where.exe /q '$PATH:node'",
  "if ($LASTEXITCODE -ne 0) {",
  "  where.exe /q '$PATH:fnm'",
  `  if ($LASTEXITCODE -ne 0) { throw '${name} requires Node.js on PATH or a configured fnm default.' }`,
  "  fnm env --shell powershell | Out-String | Invoke-Expression",
  "}",
].join("\n");
const launcher = (before, name, dispatch, lookup = LOOKUP(name)) => `${before}\n${lookup}\n${dispatch}\nexit $LASTEXITCODE\n`;

/**
 * Hush and Razor with their own headers and their own require line outside
 * FIXTURES, the same README nav files in all three plugins, and Foreman and
 * Razor launchers that differ outside their lookup and in the plugin name.
 */
const agreeing = () => ({
  ...Object.fromEntries(
    ["foreman", "hush", "razor"].flatMap((p) => WHOLE_FILES.map((f) => [`${p}/${f}`, `// ${f}, one copy per plugin\n`]))
  ),
  [`hush/${SAFE_WRITE}`]: safeWrite("// Hush's header."),
  [`razor/${SAFE_WRITE}`]: safeWrite("// Razor's header,\n// two lines long."),
  [`hush/${CONFORMANCE}`]: conformance("// hush keeps its own copy", "../hooks/lib/transcript"),
  [`razor/${CONFORMANCE}`]: conformance("// razor keeps its own copy", "../hooks/razor-lib"),
  [`foreman/${LAUNCHER}`]: launcher("# Foreman's source.\n$ErrorActionPreference = 'Stop'", "Foreman", "& node -e $hookScript"),
  [`razor/${LAUNCHER}`]: launcher("# razor's source.", "razor", "& node $hook __RAZOR_EVENT__"),
});

const scratch = [];
test.after(() => {
  for (const dir of scratch) fs.rmSync(dir, { recursive: true, force: true });
});

/** Runs git in dir with a fixed identity and no line-ending conversion. */
function git(dir, ...args) {
  const config = ["user.name=Test", "user.email=test@example.com", "core.autocrlf=false", "commit.gpgsign=false"];
  return execFileSync("git", ["-C", dir, ...config.flatMap((c) => ["-c", c]), ...args], { encoding: "utf8" }).trim();
}

/** Writes files under dir, keyed by path from dir, commits them and returns the commit. */
function commit(dir, files) {
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "fixture");
  return git(dir, "rev-parse", "HEAD");
}

/**
 * A throwaway Foundry root whose index pins each plugin at a commit holding the
 * given files. With pin false, the root is a plain folder of plugin repositories.
 */
function tree(files, { pin = true } = {}) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "sharedcopies-"));
  scratch.push(root);
  if (pin) git(root, "init", "-q");
  for (const plugin of new Set(Object.keys(files).map((f) => f.split("/")[0]))) {
    const dir = path.join(root, plugin);
    fs.mkdirSync(dir);
    git(dir, "init", "-q");
    const own = Object.entries(files).filter(([f]) => f.startsWith(`${plugin}/`));
    const sha = commit(dir, Object.fromEntries(own.map(([f, text]) => [f.slice(plugin.length + 1), text])));
    if (pin) git(root, "update-index", "--add", "--cacheinfo", `160000,${sha},${plugin}`);
  }
  return root;
}

/** Hush's style with every part flint cuts, and flint's copy of it. */
const HUSH_STYLE = [
  "---",
  "name: Hush",
  "keep-coding-instructions: true",
  "force-for-plugin: true",
  "---",
  "",
  "Intro.",
  "",
  "This check rides on the \"Next:\" line. A setting that moves that line moves the check with it. A setting that removes the line leaves the check unsaid.",
  "",
  "The reader may reshape this message with `/hush:config`: its parts.",
  "",
  "Middle.",
  "",
  "A `[hush ...]` note says what a view left out.",
  "",
  "End.",
  "",
].join("\n");
const FLINT_COPY = [
  "---",
  "name: Hush",
  "keep-coding-instructions: true",
  "---",
  "",
  "Intro.",
  "",
  "This check rides on the \"Next:\" line.",
  "",
  "Middle.",
  "",
  "End.",
  "",
].join("\n");
const STYLE = "output-styles/hush.md";

/**
 * A Foundry tree whose hush carries hush's style and whose flint, pinned in the
 * root's index, carries a copy and a README naming hush's commit.
 */
function flintTree({ hush = HUSH_STYLE, flint = FLINT_COPY, readme } = {}) {
  const root = tree({ ...agreeing(), [`hush/${STYLE}`]: hush });
  const hushSha = git(path.join(root, "hush"), "rev-parse", "HEAD");
  const flintDir = path.join(root, "flint");
  fs.mkdirSync(flintDir);
  git(flintDir, "init", "-q");
  const readmeText = readme ?? `It is a copy of the voice in hush 2.4.0, at commit \`${hushSha.slice(0, 7)}\`.\n`;
  const flintSha = commit(flintDir, { "README.md": readmeText, [STYLE]: flint });
  git(root, "update-index", "--add", "--cacheinfo", `160000,${flintSha},flint`);
  return { root, hushSha, flintSha };
}

describe("afterHeader", () => {
  test("drops the header comment and keeps the code around it", () => {
    assert.equal(afterHeader(`"use strict";\n\n// one\n// two\n\nconst x = 1;\n`), `"use strict";\n\n\nconst x = 1;\n`);
  });

  test("keeps comments inside the code", () => {
    assert.match(afterHeader(safeWrite("// header")), /a comment inside the code/);
  });
});

describe("fixturesArray", () => {
  test("returns the array from its declaration to its closing line", () => {
    assert.equal(fixturesArray(conformance("// header", "./lib")), FIXTURES);
  });

  test("returns null when the file has no FIXTURES array", () => {
    assert.equal(fixturesArray(safeWrite("// header")), null);
  });
});

describe("launcherLookup", () => {
  test("returns the lookup alone, with the plugin name replaced", () => {
    const lookup = launcherLookup(launcher("# header", "Foreman", "& node -e $hookScript"));
    assert.equal(lookup, LOOKUP("<plugin>"));
    assert.equal(launcherLookup(launcher("# other header", "razor", "& node $hook")), lookup);
  });

  test("returns null when the file has no lookup", () => {
    assert.equal(launcherLookup("& node $hook\n"), null);
  });
});

describe("checkShared", () => {
  test("copies that differ only outside the shared parts agree", () => {
    const root = tree(agreeing());
    const { problems, agreed, skipped, commits } = checkShared(root);
    assert.deepEqual(problems, []);
    assert.equal(agreed.length, SHARED.length);
    assert.deepEqual(skipped, []);
    assert.equal(commits.get("razor"), git(path.join(root, "razor"), "rev-parse", "HEAD"));
  });

  test("a changed safe-write body fails the check", () => {
    const files = agreeing();
    files[`razor/${SAFE_WRITE}`] = safeWrite("// Razor's header.", changedCode);
    const { problems } = checkShared(tree(files));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /code after the header comment of hooks\/lib\/safe-write\.js differs between hush and razor/);
  });

  test("a changed fixture fails the check", () => {
    const files = agreeing();
    files[`hush/${CONFORMANCE}`] = conformance("// hush", "./lib", FIXTURES.replace("expected: false", "expected: true"));
    const { problems } = checkShared(tree(files));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /FIXTURES array of tests\/turn_boundary_conformance\.test\.js differs/);
  });

  test("a drifted launcher lookup fails the check", () => {
    const files = agreeing();
    const drifted = LOOKUP("razor").replace("where.exe /q '$PATH:fnm'", "Get-Command fnm");
    files[`razor/${LAUNCHER}`] = launcher("# razor's source.", "razor", "& node $hook", drifted);
    const { problems } = checkShared(tree(files));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /Node\.js and fnm lookup of hooks\/windows-launcher\.ps1 differs between foreman and razor/);
  });

  test("a README nav file changed anywhere in one plugin, header included, fails the check", () => {
    for (const file of WHOLE_FILES) {
      const files = agreeing();
      files[`foreman/${file}`] = `// ${file}, foreman's copy\n`;
      const { problems } = checkShared(tree(files));
      assert.equal(problems.length, 1);
      assert.equal(problems[0].startsWith(`The whole file of ${file} differs between foreman, hush and razor.`), true, problems[0]);
    }
  });

  test("uncommitted edits and commits past the pin do not change the result", () => {
    const root = tree(agreeing());
    const razor = path.join(root, "razor");
    fs.writeFileSync(path.join(razor, SAFE_WRITE), safeWrite("// Razor's header.", changedCode));
    assert.deepEqual(checkShared(root).problems, []);
    commit(razor, {});
    assert.deepEqual(checkShared(root).problems, []);

    const files = agreeing();
    files[`razor/${SAFE_WRITE}`] = safeWrite("// Razor's header.", changedCode);
    const differing = tree(files);
    commit(path.join(differing, "razor"), { [SAFE_WRITE]: safeWrite("// Razor's header.") });
    assert.equal(checkShared(differing).problems.length, 1);
  });

  test("README nav files follow the same pin, skip and missing-commit rules", () => {
    const NAV_CHECK = WHOLE_FILES[0];
    const root = tree(agreeing());
    const foreman = path.join(root, "foreman");
    fs.writeFileSync(path.join(foreman, NAV_CHECK), "// edited, not committed\n");
    assert.deepEqual(checkShared(root).problems, []);
    commit(foreman, {});
    assert.deepEqual(checkShared(root).problems, []);

    const missing = "1".repeat(40);
    git(root, "update-index", "--cacheinfo", `160000,${missing},foreman`);
    assert.deepEqual(checkShared(root).problems, [
      `foreman's pinned commit ${missing} is not in its checkout: fetch it there, then rerun.`,
    ]);

    const files = agreeing();
    delete files[`foreman/${NAV_CHECK}`];
    assert.deepEqual(checkShared(tree(files)).problems, [
      `foreman/${NAV_CHECK} is missing at the pinned commit, so its copy cannot be compared.`,
    ]);

    const skipped = tree(Object.fromEntries(Object.entries(agreeing()).filter(([f]) => !f.startsWith("foreman/"))));
    const result = checkShared(skipped);
    assert.deepEqual({ problems: result.problems, skipped: result.skipped }, { problems: [], skipped: ["foreman"] });
    // The launcher has no second copy to agree with once foreman is skipped.
    assert.equal(result.agreed.length, SHARED.length - 1);
  });

  test("a pinned commit the checkout lacks fails the check", () => {
    const root = tree(agreeing());
    const missing = "1".repeat(40);
    git(root, "update-index", "--cacheinfo", `160000,${missing},razor`);
    assert.deepEqual(checkShared(root).problems, [
      `razor's pinned commit ${missing} is not in its checkout: fetch it there, then rerun.`,
    ]);
  });

  test("a checkout with no gitlink fails the check", () => {
    const root = tree(agreeing());
    git(root, "update-index", "--force-remove", "razor");
    assert.deepEqual(checkShared(root).problems, [
      `razor has no gitlink in the index of ${root}, so it has no pinned copy to compare.`,
    ]);
  });

  test("a plugin with no checkout, or an empty one, is skipped and named", () => {
    const files = Object.fromEntries(Object.entries(agreeing()).filter(([f]) => !f.startsWith("razor/")));
    const root = tree(files);
    const { problems, agreed, skipped } = checkShared(root);
    assert.deepEqual({ problems, skipped }, { problems: [], skipped: ["razor"] });
    assert.deepEqual(agreed, WHOLE_FILES.map((f) => `${f}: the whole file agrees in foreman and hush.`));
    fs.mkdirSync(path.join(root, "razor"));
    assert.deepEqual(checkShared(root).skipped, ["razor"]);
  });

  test("a file missing at the pinned commit fails the check", () => {
    const files = agreeing();
    delete files[`razor/${SAFE_WRITE}`];
    const { problems } = checkShared(tree(files));
    assert.deepEqual(problems, [`razor/${SAFE_WRITE} is missing at the pinned commit, so its copy cannot be compared.`]);
  });

  test("a copy without its FIXTURES array fails the check", () => {
    const files = agreeing();
    files[`razor/${CONFORMANCE}`] = "\"use strict\";\n";
    const { problems } = checkShared(tree(files));
    assert.deepEqual(problems, [`razor/${CONFORMANCE} has no FIXTURES array to compare.`]);
  });

  test("CRLF line endings are not a difference", () => {
    const files = agreeing();
    files[`razor/${SAFE_WRITE}`] = files[`razor/${SAFE_WRITE}`].replace(/\n/g, "\r\n");
    assert.deepEqual(checkShared(tree(files)).problems, []);
  });
});

describe("cutFlintParts", () => {
  test("cuts every plugin-only part, leaving flint's copy", () => {
    assert.deepEqual(cutFlintParts(HUSH_STYLE), { text: FLINT_COPY, missing: [] });
  });

  test("names a part hush no longer has", () => {
    const hush = HUSH_STYLE.replace("The reader may reshape this message with `/hush:config`: its parts.\n\n", "");
    assert.deepEqual(cutFlintParts(hush).missing, ["/hush:config paragraph"]);
  });
});

describe("checkFlintStyle", () => {
  const DIFFERS = /^flint\/output-styles\/hush\.md differs from hush\/output-styles\/hush\.md at [0-9a-f]{7}, .* first at line \d+ of flint's copy/;

  test("a faithful copy agrees", () => {
    const { root, hushSha, flintSha } = flintTree();
    const { problems, agreed, skipped, commits } = checkFlintStyle(root);
    assert.deepEqual({ problems, skipped }, { problems: [], skipped: [] });
    assert.deepEqual(agreed, [`${STYLE}: flint's copy agrees with hush at ${hushSha}, after its ${FLINT_STYLE.cuts.length} plugin-only cuts.`]);
    assert.equal(commits.get("flint"), flintSha);
  });

  test("an edit inside the copy fails", () => {
    const { root } = flintTree({ flint: FLINT_COPY.replace("Middle.", "Middle, changed.") });
    const { problems } = checkFlintStyle(root);
    assert.equal(problems.length, 1);
    assert.match(problems[0], DIFFERS);
    assert.match(problems[0], /first at line 10 /);
  });

  test("a fifth, unlisted cut fails", () => {
    const { root } = flintTree({ flint: FLINT_COPY.replace("Middle.\n\n", "") });
    const { problems } = checkFlintStyle(root);
    assert.equal(problems.length, 1);
    assert.match(problems[0], DIFFERS);
  });

  test("a listed part gone from hush fails", () => {
    const { root, hushSha } = flintTree({ hush: HUSH_STYLE.replace("force-for-plugin: true\n", "") });
    assert.deepEqual(checkFlintStyle(root).problems, [
      `hush/${STYLE} at ${hushSha} has no force-for-plugin frontmatter key to cut: update the list in flint's AGENTS.md and FLINT_STYLE together.`,
    ]);
  });

  test("hush is read at the commit flint names, not at hush's pin", () => {
    const { root, hushSha } = flintTree();
    const hushDir = path.join(root, "hush");
    const moved = commit(hushDir, { [STYLE]: HUSH_STYLE.replace("Middle.", "Middle, moved.") });
    git(root, "update-index", "--cacheinfo", `160000,${moved},hush`);
    const { problems, agreed } = checkFlintStyle(root);
    assert.deepEqual(problems, []);
    assert.match(agreed[0], new RegExp(`agrees with hush at ${hushSha}`));
  });

  test("a copy taken from a hush commit other than the one flint names fails", () => {
    const { root } = flintTree();
    const later = HUSH_STYLE.replace("Middle.", "Middle, later.");
    commit(path.join(root, "hush"), { [STYLE]: later });
    const flintDir = path.join(root, "flint");
    const flintSha = commit(flintDir, { [STYLE]: cutFlintParts(later).text });
    git(root, "update-index", "--cacheinfo", `160000,${flintSha},flint`);
    const { problems } = checkFlintStyle(root);
    assert.equal(problems.length, 1);
    assert.match(problems[0], DIFFERS);
  });

  test("a README that names no commit, or one hush lacks, fails", () => {
    assert.deepEqual(checkFlintStyle(flintTree({ readme: "A copy of hush.\n" }).root).problems, [
      "flint/README.md names no hush commit, so flint's style copy has no source to compare.",
    ]);
    const { root } = flintTree({ readme: "A copy of the voice in hush 2.4.0, at commit `1111111`.\n" });
    assert.deepEqual(checkFlintStyle(root).problems, [
      `The hush commit 1111111 that flint/README.md names is not in hush's checkout at ${path.join(root, "hush")}: fetch it there, then rerun.`,
    ]);
  });

  test("no flint checkout is skipped and named", () => {
    assert.deepEqual(checkFlintStyle(tree(agreeing())), { problems: [], agreed: [], skipped: ["flint"], commits: new Map() });
  });

  test("a missing hush checkout skips hush, not flint, and the CLI names the folder it looked in", () => {
    const { root } = flintTree();
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "no-hush-"));
    const result = checkFlintStyle(root, { dirs: { hush: empty } });
    assert.deepEqual({ problems: result.problems, skipped: result.skipped }, { problems: [], skipped: ["hush"] });
    const run = spawnSync(process.execPath, [SCRIPT, "--hush", empty, root], { encoding: "utf8", cwd: root });
    assert.equal(run.stdout.match(/^Skipped .*$/gm).join("\n"), `Skipped hush: no checkout at ${empty}.`);
  });

  test("the cut count in the messages follows the cut list", () => {
    const { root } = flintTree({ flint: FLINT_COPY.replace("Middle.", "Middle, changed.") });
    assert.match(checkFlintStyle(root).problems[0], new RegExp(`after its ${FLINT_STYLE.cuts.length} plugin-only cuts`));
  });

  test("CRLF line endings in flint's copy are not a difference", () => {
    const { root } = flintTree({ flint: FLINT_COPY.replace(/\n/g, "\r\n") });
    assert.deepEqual(checkFlintStyle(root).problems, []);
  });
});

describe("checkShared with heads", () => {
  const heads = (root) => checkShared(root, SHARED, { heads: true });

  test("two heads that agree pass, with no Foundry tree around them", () => {
    const root = tree(agreeing(), { pin: false });
    const { problems, agreed, commits } = heads(root);
    assert.deepEqual(problems, []);
    assert.equal(agreed.length, SHARED.length);
    assert.equal(commits.get("hush"), git(path.join(root, "hush"), "rev-parse", "HEAD"));
  });

  test("a head whose shared part differs fails, while the default still reads the pins", () => {
    const root = tree(agreeing());
    const pinned = git(path.join(root, "razor"), "rev-parse", "HEAD");
    commit(path.join(root, "razor"), { [SAFE_WRITE]: safeWrite("// Razor's header.", changedCode) });
    const { problems, commits } = heads(root);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /code after the header comment of hooks\/lib\/safe-write\.js differs between hush and razor/);
    assert.notEqual(commits.get("razor"), pinned);
    assert.deepEqual(checkShared(root).problems, []);
    assert.equal(checkShared(root).commits.get("razor"), pinned);
  });

  test("uncommitted edits do not count", () => {
    const root = tree(agreeing(), { pin: false });
    fs.writeFileSync(path.join(root, "razor", SAFE_WRITE), safeWrite("// Razor's header.", changedCode));
    assert.deepEqual(heads(root).problems, []);
  });

  test("a checkout that is not a Git repository fails", () => {
    const root = tree(agreeing(), { pin: false });
    fs.rmSync(path.join(root, "razor", ".git"), { recursive: true, force: true });
    assert.deepEqual(heads(root).problems, [
      `razor at ${path.join(root, "razor")} is not a Git checkout, so it has no HEAD to compare.`,
    ]);
  });
});

describe("checkShared with a directory override", () => {
  /** A Foundry tree plus a worktree of its razor checkout on a topic branch, committed with the given changes. */
  function withWorktree(changes) {
    const root = tree(agreeing());
    const worktree = path.join(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "sharedcopies-wt-")), "razor-799");
    scratch.push(path.dirname(worktree));
    git(path.join(root, "razor"), "worktree", "add", "-q", "-b", "topic", worktree);
    commit(worktree, changes);
    return { root, worktree };
  }

  test("a drifted copy committed in the worktree fails, while the default still reads the pins", () => {
    const { root, worktree } = withWorktree({ [SAFE_WRITE]: safeWrite("// Razor's header.", changedCode) });
    const { problems, commits } = checkShared(root, SHARED, { dirs: { razor: worktree } });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /code after the header comment of hooks\/lib\/safe-write\.js differs between hush and razor/);
    assert.equal(commits.get("razor"), git(worktree, "rev-parse", "HEAD"));
    assert.equal(commits.get("hush"), git(path.join(root, "hush"), "rev-parse", "HEAD"));
    const pinned = checkShared(root);
    assert.deepEqual(pinned.problems, []);
    assert.equal(pinned.commits.get("razor"), git(path.join(root, "razor"), "rev-parse", "HEAD"));
  });

  test("a worktree whose copies agree passes", () => {
    const { root, worktree } = withWorktree({ "notes.txt": "unrelated\n" });
    assert.deepEqual(checkShared(root, SHARED, { dirs: { razor: worktree } }).problems, []);
  });

  test("an override that is not a Git checkout fails instead of being skipped", () => {
    const root = tree(agreeing());
    const missing = path.join(root, "no-such-worktree");
    const { problems, skipped } = checkShared(root, SHARED, { dirs: { razor: missing } });
    assert.deepEqual({ problems, skipped }, {
      problems: [`razor at ${missing} is not a Git checkout, so it has no HEAD to compare.`],
      skipped: [],
    });
  });
});

describe("the command", () => {
  /** A worktree of root's committed index, as a desktop app worktree is, with empty plugin folders. */
  function foundryWorktree(root) {
    git(root, "commit", "-q", "-m", "pins");
    const worktree = path.join(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "sharedcopies-foundry-")), "app");
    scratch.push(path.dirname(worktree));
    git(root, "worktree", "add", "-q", "--detach", worktree);
    return worktree;
  }

  test("--<plugin> <dir> reads that plugin's HEAD there and fails on a drifted copy", () => {
    const root = tree(agreeing());
    const worktree = path.join(root, "razor-799");
    git(path.join(root, "razor"), "worktree", "add", "-q", "-b", "topic", worktree);
    assert.equal(spawnSync(process.execPath, [SCRIPT, "--razor", worktree, root], { encoding: "utf8", cwd: root }).status, 0);
    commit(worktree, { [SAFE_WRITE]: safeWrite("// Razor's header.", changedCode) });
    const run = spawnSync(process.execPath, [SCRIPT, "--razor", worktree, root], { encoding: "utf8", cwd: root });
    assert.equal(run.status, 1);
    assert.match(run.stdout, new RegExp(`^Read razor at its HEAD in .+razor-799 ${git(worktree, "rev-parse", "HEAD")}\\.$`, "m"));
    assert.match(run.stderr, /hooks\/lib\/safe-write\.js differs between hush and razor/);
    assert.equal(spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8", cwd: root }).status, 0);
  });

  test("from a worktree, a staged gitlink is read from its index and its plugin from the root", () => {
    const root = tree(agreeing());
    const worktree = foundryWorktree(root);
    assert.deepEqual(fs.readdirSync(path.join(worktree, "razor")), []);
    const staged = commit(path.join(root, "razor"), { [SAFE_WRITE]: safeWrite("// Razor's header.", changedCode) });
    git(worktree, "update-index", "--cacheinfo", `160000,${staged},razor`);
    const run = spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8", cwd: worktree });
    assert.equal(run.status, 1, run.stdout);
    assert.match(run.stdout, new RegExp(`^Read razor at its pinned commit ${staged}\\.$`, "m"));
    assert.match(run.stderr, /hooks\/lib\/safe-write\.js differs between hush and razor/);
    // The root's own index still pins the old commit, whose copies agree.
    assert.equal(spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8", cwd: root }).status, 0);
  });

  test("a relative override resolves against the root, not the current directory", () => {
    const root = tree(agreeing());
    const worktree = path.join(root, "razor-799");
    git(path.join(root, "razor"), "worktree", "add", "-q", "-b", "topic", worktree);
    const run = spawnSync(process.execPath, [SCRIPT, "--razor", "razor-799", root], { encoding: "utf8", cwd: foundryWorktree(root) });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, new RegExp(`^Read razor at its HEAD in .+razor-799 ${git(worktree, "rev-parse", "HEAD")}\\.$`, "m"));
  });

  test("an override with no directory exits 2 with the usage", () => {
    const run = spawnSync(process.execPath, [SCRIPT, "--razor"], { encoding: "utf8" });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /\[--<plugin> <dir>\]/);
  });

  test("--heads names each HEAD it read", () => {
    const root = tree(agreeing(), { pin: false });
    const run = spawnSync(process.execPath, [SCRIPT, "--heads", root], { encoding: "utf8" });
    assert.equal(run.status, 0);
    assert.match(run.stdout, new RegExp(`^Read hush at its HEAD ${git(path.join(root, "hush"), "rev-parse", "HEAD")}\\.$`, "m"));
  });

  test("an unknown option exits 2 with the usage", () => {
    const run = spawnSync(process.execPath, [SCRIPT, "--head"], { encoding: "utf8" });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /^Usage: .*\[--heads\] .*\[root\]/);
  });

  test("exits 1 and names the file when a body changed", () => {
    const files = agreeing();
    files[`hush/${SAFE_WRITE}`] = safeWrite("// Hush's header.", `${CODE}\n\nmodule.exports = {};`);
    const root = tree(files);
    const run = spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8", cwd: root });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /hooks\/lib\/safe-write\.js differs between hush and razor/);
  });

  test("exits 0, names each pinned commit and says which plugin it skipped", () => {
    const files = Object.fromEntries(Object.entries(agreeing()).filter(([f]) => !f.startsWith("hush/")));
    const root = tree(files);
    const run = spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8", cwd: root });
    assert.equal(run.status, 0);
    assert.match(run.stdout, /^Skipped hush: no checkout at /m);
    assert.match(run.stdout, new RegExp(`^Read razor at its pinned commit ${git(path.join(root, "razor"), "rev-parse", "HEAD")}\\.$`, "m"));
  });

  test("compares flint's style copy, exiting 1 on drift and 0 when it agrees", () => {
    const changed = flintTree({ flint: FLINT_COPY.replace("Middle.", "Middle, changed.") });
    const run = spawnSync(process.execPath, [SCRIPT, changed.root], { encoding: "utf8", cwd: changed.root });
    assert.equal(run.status, 1);
    assert.match(run.stdout, new RegExp(`^Read flint at its pinned commit ${changed.flintSha}\\.$`, "m"));
    assert.match(run.stderr, /flint\/output-styles\/hush\.md differs/);
    const faithful = flintTree();
    const ok = spawnSync(process.execPath, [SCRIPT, faithful.root], { encoding: "utf8", cwd: faithful.root });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /flint's copy agrees with hush/);
  });

  test("exits 1 when it skipped every plugin, because it compared nothing", () => {
    const run = spawnSync(process.execPath, [SCRIPT, tree({}, { pin: false })], { encoding: "utf8" });
    assert.equal(run.status, 1);
    assert.match(run.stdout, /^Skipped foreman: no checkout at /m);
    assert.match(run.stderr, /Nothing was compared/);
  });

  test("exits 1 when it read only one plugin, because it compared nothing", () => {
    const files = Object.fromEntries(Object.entries(agreeing()).filter(([f]) => f.startsWith("razor/")));
    const root = tree(files);
    const run = spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8", cwd: root });
    assert.equal(run.status, 1);
    assert.match(run.stdout, /^Read razor at its pinned commit /m);
    assert.match(run.stderr, /Nothing was compared/);
  });
});

describe("this repository", () => {
  test("every shared copy checked out here agrees", (t) => {
    const { problems, agreed, skipped } = checkShared();
    assert.deepEqual(problems, []);
    // A checkout with no plugins, such as a worktree without submodules, compares nothing.
    if (agreed.length === 0) t.skip(`nothing compared here; skipped ${skipped.join(", ") || "none"}`);
  });

  test("flint's style copy checked out here agrees with hush", (t) => {
    const { problems, agreed, skipped } = checkFlintStyle();
    assert.deepEqual(problems, []);
    if (agreed.length === 0) t.skip(`flint's style copy not compared here; skipped ${skipped.join(", ")}`);
  });

  test("safe-write, the turn-boundary fixtures, the launcher, the README nav files and the pre-commit files are all watched", () => {
    assert.deepEqual(SHARED.map((s) => s.file), [SAFE_WRITE, CONFORMANCE, LAUNCHER, ...WHOLE_FILES]);
  });
});
