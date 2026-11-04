#!/usr/bin/env node
"use strict";

// A plugin installs from its own repository, so it cannot require() a file
// out of a sibling. The few pieces the plugins share therefore ship as a
// hand-made copy in each plugin, and a copy drifts quietly, in whichever
// plugin was not the one being fixed. A stale copy of safe-write.js can
// silently skip a security check; a stale README nav check lets one plugin's
// pre-commit hook accept a link the others reject.
//
// This check compares the copies as committed at the commit a Foundry tree
// pins for each plugin, the gitlink in its index, and fails when they differ.
// A plugin's branch and uncommitted edits do not count, because users install
// the pinned commit. Given a root, the command reads the gitlinks, staged ones
// included, from the index of the checkout it runs in, and each plugin's history from
// the checkouts under root, so a worktree with empty plugin folders checks the
// gitlinks it stages against the root's plugins. It only reads. In safe-write.js each plugin's header
// comment speaks for that plugin, so only the code after it has to match; the
// README nav check's and the pre-commit hook's files must match whole.
// Foreman's and Razor's Windows launchers dispatch their hooks differently,
// so only the Node.js and fnm lookup they share has to match, with the
// plugin name in its error text set aside. A plugin whose checkout is absent,
// such as an uninitialized submodule, is skipped and named in the output, but
// a run that compared nothing fails. A missing
// gitlink, a pinned commit the checkout lacks, or a file missing at that
// commit is a failure.
//
// Flint, a Foundry submodule outside the catalogs, ships output-styles/hush.md
// as a copy of Hush's at the Hush commit flint's README.md names, minus the
// plugin-only parts flint's AGENTS.md lists. The check reads flint at its
// gitlink, or its HEAD under --heads, cuts those parts from Hush's copy at the
// named commit, never Hush's pin, and fails on any other difference, or when a
// listed part is no longer there to cut. Flint with no checkout, or Hush with
// none, is skipped and named.
//
// --heads reads each checkout's HEAD instead of its pin, so a review can
// compare two topic branches before any pin moves. The root is then any
// directory that holds the plugin checkouts side by side, and a checkout
// that is not a Git repository of its own is a failure.
//
// --<plugin> <dir>, such as --foreman .private/foreman-799, reads that plugin
// from dir at its HEAD instead of from root, so a worker branch in a separate
// worktree is compared with the other plugins before it merges. The plugin may
// be flint, whose HEAD is then compared with Hush's style. The other plugins
// keep their pins, or their HEADs under --heads. A relative dir is resolved
// against root, not the current directory. An override that is not a Git
// checkout is a failure, never a skip. Hush's folder must hold a .git of its
// own, or flint's check fails rather than read an enclosing repository.
//
//   node scripts/check-shared-copies.js [--heads] [--<plugin> <dir>]... [root]

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

/** Each hand-copied file, the plugins that carry it, and the part that must match. */
const SHARED = [
  {
    file: "hooks/lib/safe-write.js",
    plugins: ["hush", "razor"],
    part: "code after the header comment",
    extract: afterHeader,
  },
  {
    file: "tests/turn_boundary_conformance.test.js",
    plugins: ["hush", "razor"],
    part: "FIXTURES array",
    extract: fixturesArray,
  },
  {
    file: "hooks/windows-launcher.ps1",
    plugins: ["foreman", "razor"],
    part: "Node.js and fnm lookup",
    extract: launcherLookup,
  },
  ...[
    "scripts/git-hooks/check-readme-nav.js",
    "scripts/git-hooks/pre-commit",
    "scripts/git-hooks/vendor/github-slugger-regex.js",
    "scripts/git-hooks/vendor/github-slugger-LICENSE",
    "tests/readme_nav.test.js",
    "tests/pre_commit.test.js",
    "tests/fixtures/github-slugger-fixtures.json",
  ].map((file) => ({ file, plugins: ["foreman", "hush", "razor"], part: "whole file", extract: (source) => source })),
];

/**
 * Flint's copy of Hush's style, where flint's README names the Hush commit it
 * copies, and the plugin-only parts it leaves out. The cuts mirror the list in
 * flint's AGENTS.md; a change to one goes into both.
 */
const FLINT_STYLE = {
  file: "output-styles/hush.md",
  named: /hush \S+, at commit `([0-9a-f]{7,40})`/,
  cuts: [
    { what: "force-for-plugin frontmatter key", pattern: /^force-for-plugin: true\n/m },
    {
      what: "closing sentences about a setting that moves the \"Next:\" line",
      pattern: / A setting that moves that line moves the check with it\. A setting that removes the line leaves the check unsaid\./,
    },
    { what: "/hush:config paragraph", pattern: /^The reader may reshape this message with `\/hush:config`.*\n\n/m },
    { what: "[hush ...] note paragraph", pattern: /^A `\[hush \.\.\.\]` note.*\n\n/m },
  ],
};

/** Hush's text with each cut removed once, and the cuts it does not contain. */
function cutFlintParts(hushText, cuts = FLINT_STYLE.cuts) {
  const missing = [];
  let text = hushText;
  for (const { what, pattern } of cuts) {
    if (pattern.test(text)) text = text.replace(pattern, "");
    else missing.push(what);
  }
  return { text, missing };
}

/** The source without its first run of `//` comment lines. */
function afterHeader(source) {
  const lines = source.split("\n");
  const start = lines.findIndex((l) => l.startsWith("//"));
  if (start < 0) return source;
  let end = start;
  while (end < lines.length && lines[end].startsWith("//")) end++;
  return [...lines.slice(0, start), ...lines.slice(end)].join("\n");
}

/** From the first line that starts with first to the next line that is exactly last, or null when absent. */
function span(source, first, last) {
  const lines = source.split("\n");
  const start = lines.findIndex((l) => l.startsWith(first));
  const end = lines.findIndex((l, i) => start >= 0 && i > start && l === last);
  return start < 0 || end < 0 ? null : lines.slice(start, end + 1).join("\n");
}

/** From `const FIXTURES = [` to the first line that is exactly `];`, or null when absent. */
function fixturesArray(source) {
  return span(source, "const FIXTURES = [", "];");
}

/**
 * From `$ProgressPreference` to the `}` that closes the fnm fallback, with the
 * plugin name in its error text replaced, or null when absent.
 */
function launcherLookup(source) {
  const text = span(source, "$ProgressPreference", "}");
  return text && text.replace(/throw '\S+ requires /, "throw '<plugin> requires ");
}

/** A checkout counts as present when its directory exists and is not empty. */
function checkedOut(dir) {
  try {
    return fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

/** Runs git in dir and returns its output, or null when git fails. */
function git(dir, args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/**
 * Each of files at commit in dir, read in one git call because a Windows
 * process spawn costs tens of milliseconds. A file missing there has no entry.
 */
function readFiles(dir, commit, files) {
  const texts = new Map();
  let out;
  try {
    const input = files.map((f) => `${commit}:${f}\n`).join("");
    out = execFileSync("git", ["-C", dir, "cat-file", "--batch"], { input, stdio: ["pipe", "pipe", "ignore"], maxBuffer: 1 << 26 });
  } catch {
    return texts;
  }
  let at = 0;
  for (const file of files) {
    const eol = out.indexOf(10, at);
    if (eol < 0) break;
    const found = /^\S+ (\w+) (\d+)$/.exec(out.toString("utf8", at, eol));
    at = eol + 1;
    if (!found) continue;
    if (found[1] === "blob") texts.set(file, out.toString("utf8", at, at + Number(found[2])));
    at += Number(found[2]) + 1;
  }
  return texts;
}

/** The commit the index of the checkout at index pins for plugin, or null when it has no gitlink there. */
function pinnedCommit(index, plugin) {
  const match = /^160000 ([0-9a-f]+) /.exec(git(index, ["ls-files", "-s", "--", `:(top)${plugin}`]) || "");
  return match ? match[1] : null;
}

/** The commit checked out in dir, or null when dir is not a Git repository of its own. */
function headCommit(dir) {
  const head = fs.existsSync(path.join(dir, ".git")) && git(dir, ["rev-parse", "--verify", "HEAD"]);
  return head ? head.trim() : null;
}

/**
 * Compares every shared part across the plugins checked out under root, at the
 * commits the index of the checkout at index pins, root's by default, or at
 * each checkout's HEAD when heads is true. A plugin named in dirs is read from
 * that directory at its HEAD instead.
 */
function checkShared(root = path.join(__dirname, ".."), shared = SHARED, { heads = false, dirs = {}, index = root } = {}) {
  const problems = [];
  const agreed = [];
  const skipped = [];
  const commits = new Map();
  const read = new Map();
  for (const plugin of new Set(shared.flatMap((s) => s.plugins))) {
    const override = Object.hasOwn(dirs, plugin);
    const dir = override ? dirs[plugin] : path.join(root, plugin);
    const head = heads || override;
    read.set(plugin, { dir, head });
    const commit = (checkedOut(dir) || override) && (head ? headCommit(dir) : pinnedCommit(index, plugin));
    if (commit === false) skipped.push(plugin);
    else if (!commit && head) problems.push(`${plugin} at ${dir} is not a Git checkout, so it has no HEAD to compare.`);
    else if (!commit) problems.push(`${plugin} has no gitlink in the index of ${index}, so it has no pinned copy to compare.`);
    else if (!heads && git(dir, ["cat-file", "-e", `${commit}^{commit}`]) === null)
      problems.push(`${plugin}'s pinned commit ${commit} is not in its checkout: fetch it there, then rerun.`);
    else commits.set(plugin, commit);
  }
  const texts = new Map();
  for (const [plugin, commit] of commits) {
    const files = shared.filter((s) => s.plugins.includes(plugin)).map((s) => s.file);
    texts.set(plugin, readFiles(read.get(plugin).dir, commit, files));
  }
  for (const { file, plugins, part, extract } of shared) {
    const parts = new Map();
    for (const plugin of plugins.filter((p) => commits.has(p))) {
      const { head } = read.get(plugin);
      const source = texts.get(plugin).get(file);
      if (source === undefined) {
        problems.push(`${plugin}/${file} is missing at ${head ? "its HEAD" : "the pinned commit"}, so its copy cannot be compared.`);
        continue;
      }
      const text = extract(source.replace(/\r\n/g, "\n"));
      if (text === null) problems.push(`${plugin}/${file} has no ${part} to compare.`);
      else parts.set(plugin, text);
    }
    const names = new Intl.ListFormat("en-GB").format(parts.keys());
    if (new Set(parts.values()).size > 1) {
      problems.push(
        `The ${part} of ${file} differs between ${names}. These copies stand in for a shared ` +
        "module, so a fix in one is owed to the others: diff them and land every copy together."
      );
    } else if (parts.size > 1) {
      agreed.push(`${file}: the ${part} agrees in ${names}.`);
    }
  }
  return { problems, agreed, skipped, commits };
}

/**
 * Compares flint's style copy, at the commit the index of the checkout at index
 * pins for flint, or at its HEAD when heads is true, with Hush's at the commit
 * flint's README names, after the plugin-only cuts. Hush's history is read from
 * dirs.hush when given, else from root.
 */
function checkFlintStyle(root = path.join(__dirname, ".."), { heads = false, dirs = {}, index = root } = {}) {
  const problems = [];
  const agreed = [];
  const skipped = [];
  const commits = new Map();
  const flintOverride = Object.hasOwn(dirs, "flint");
  const flintDir = flintOverride ? dirs.flint : path.join(root, "flint");
  const head = heads || flintOverride;
  const hushDir = Object.hasOwn(dirs, "hush") ? dirs.hush : path.join(root, "hush");
  const { file } = FLINT_STYLE;
  const absent = !flintOverride && !checkedOut(flintDir) ? ["flint", flintDir] : !checkedOut(hushDir) ? ["hush", hushDir] : null;
  if (absent) {
    // A hush override that is no checkout is already a failure in checkShared, never a skip.
    if (absent[0] === "flint" || !Object.hasOwn(dirs, "hush"))
      skipped.push(`Skipped flint's style copy: ${absent[0]} has no checkout at ${absent[1]}.`);
    return { problems, agreed, skipped, commits };
  }
  if (!fs.existsSync(path.join(hushDir, ".git"))) {
    problems.push(`hush at ${hushDir} is not a Git checkout, so it has no history to read flint's source from.`);
    return { problems, agreed, skipped, commits };
  }
  const commit = head ? headCommit(flintDir) : pinnedCommit(index, "flint");
  if (!commit && head) problems.push(`flint at ${flintDir} is not a Git checkout, so it has no HEAD to compare.`);
  else if (!commit) problems.push(`flint has no gitlink in the index of ${index}, so it has no pinned copy to compare.`);
  else if (!head && git(flintDir, ["cat-file", "-e", `${commit}^{commit}`]) === null)
    problems.push(`flint's pinned commit ${commit} is not in its checkout: fetch it there, then rerun.`);
  if (problems.length) return { problems, agreed, skipped, commits };
  commits.set("flint", commit);
  const flint = readFiles(flintDir, commit, ["README.md", file]);
  const named = FLINT_STYLE.named.exec(flint.get("README.md") || "");
  if (!named) {
    problems.push("flint/README.md names no hush commit, so flint's style copy has no source to compare.");
    return { problems, agreed, skipped, commits };
  }
  const sha = (git(hushDir, ["rev-parse", "--verify", "--quiet", `${named[1]}^{commit}`]) || "").trim();
  if (!sha) {
    problems.push(`The hush commit ${named[1]} that flint/README.md names is not in hush's checkout at ${hushDir}: fetch it there, then rerun.`);
    return { problems, agreed, skipped, commits };
  }
  const hushSource = readFiles(hushDir, sha, [file]).get(file);
  const flintSource = flint.get(file);
  if (flintSource === undefined) problems.push(`flint/${file} is missing at ${head ?"its HEAD" : "the pinned commit"}, so its copy cannot be compared.`);
  if (hushSource === undefined) problems.push(`hush/${file} is missing at ${sha}, so its copy cannot be compared.`);
  if (problems.length) return { problems, agreed, skipped, commits };
  const { text, missing } = cutFlintParts(hushSource.replace(/\r\n/g, "\n"));
  for (const what of missing)
    problems.push(`hush/${file} at ${sha} has no ${what} to cut: update the list in flint's AGENTS.md and FLINT_STYLE together.`);
  if (missing.length) return { problems, agreed, skipped, commits };
  const ours = text.split("\n");
  const theirs = flintSource.replace(/\r\n/g, "\n").split("\n");
  const line = theirs.findIndex((l, i) => l !== ours[i]);
  if (line >= 0 || ours.length !== theirs.length) {
    problems.push(
      `flint/${file} differs from hush/${file} at ${sha.slice(0, 7)}, after its ${FLINT_STYLE.cuts.length} plugin-only cuts, ` +
      `first at line ${(line >= 0 ? line : theirs.length) + 1} of flint's copy. Flint copies Hush's voice: ` +
      "carry the change into flint, or list a new cut in flint's AGENTS.md and FLINT_STYLE."
    );
  } else {
    agreed.push(`${file}: flint's copy agrees with hush at ${sha}, after its ${FLINT_STYLE.cuts.length} plugin-only cuts.`);
  }
  return { problems, agreed, skipped, commits };
}

function main(args = []) {
  const plugins = new Set([...SHARED.flatMap((s) => s.plugins), "flint"]);
  const dirs = {};
  const rest = [];
  let heads = false;
  for (let i = 0; i < args.length; i++) {
    const plugin = args[i].startsWith("--") && args[i].slice(2);
    if (args[i] === "--heads") heads = true;
    else if (plugins.has(plugin) && i + 1 < args.length) dirs[plugin] = args[++i];
    else rest.push(args[i]);
  }
  if (rest.length > 1 || rest.some((a) => a.startsWith("-"))) {
    process.stderr.write("Usage: node scripts/check-shared-copies.js [--heads] [--<plugin> <dir>]... [root]\n");
    return 2;
  }
  const root = rest[0] || path.join(__dirname, "..");
  for (const plugin in dirs) dirs[plugin] = path.resolve(root, dirs[plugin]);
  const options = { heads, dirs, index: rest[0] ? process.cwd() : root };
  const { problems, agreed, skipped, commits } = checkShared(path.resolve(root), SHARED, options);
  const flint = checkFlintStyle(path.resolve(root), options);
  problems.push(...flint.problems);
  agreed.push(...flint.agreed);
  for (const [name, commit] of flint.commits) commits.set(name, commit);
  for (const plugin of new Set(skipped))
    console.log(`Skipped ${plugin}: no checkout at ${dirs[plugin] || path.join(root, plugin)}.`);
  for (const line of flint.skipped) console.log(line);
  for (const [plugin, commit] of commits) {
    const where = dirs[plugin] ? `HEAD in ${dirs[plugin]}` : heads ? "HEAD" : "pinned commit";
    console.log(`Read ${plugin} at its ${where} ${commit}.`);
  }
  for (const line of agreed) console.log(line);
  if (agreed.length === 0 && problems.length === 0)
    problems.push(`Nothing was compared, because fewer than two plugins were read: pass the Foundry root that holds the checkouts, as in node scripts/check-shared-copies.js <root>.`);
  if (problems.length === 0) return 0;
  process.stderr.write(`\nShared-copy check:\n\n${problems.map((p) => `  - ${p}\n`).join("")}\n`);
  return 1;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { main, afterHeader, fixturesArray, launcherLookup, checkShared, SHARED, checkFlintStyle, cutFlintParts, FLINT_STYLE };
