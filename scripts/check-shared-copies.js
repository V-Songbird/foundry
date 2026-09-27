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
// the pinned commit. It only reads. In safe-write.js each plugin's header
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
// --heads reads each checkout's HEAD instead of its pin, so a review can
// compare two topic branches before any pin moves. The root is then any
// directory that holds the plugin checkouts side by side, and a checkout
// that is not a Git repository of its own is a failure.
//
// --<plugin> <dir>, such as --foreman .private/foreman-799, reads that plugin
// from dir at its HEAD instead of from root, so a worker branch in a separate
// worktree is compared with the other plugins before it merges. The other
// plugins keep their pins, or their HEADs under --heads. A relative dir is
// resolved against root, not the current directory. An override that is not
// a Git checkout is a failure, never a skip.
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

/** The commit root's index pins for plugin, or null when it has no gitlink there. */
function pinnedCommit(root, plugin) {
  const match = /^160000 ([0-9a-f]+) /.exec(git(root, ["ls-files", "-s", "--", plugin]) || "");
  return match ? match[1] : null;
}

/** The commit checked out in dir, or null when dir is not a Git repository of its own. */
function headCommit(dir) {
  const head = fs.existsSync(path.join(dir, ".git")) && git(dir, ["rev-parse", "--verify", "HEAD"]);
  return head ? head.trim() : null;
}

/**
 * Compares every shared part across the plugins checked out under root, at the
 * commits root's index pins, or at each checkout's HEAD when heads is true.
 * A plugin named in dirs is read from that directory at its HEAD instead.
 */
function checkShared(root = path.join(__dirname, ".."), shared = SHARED, { heads = false, dirs = {} } = {}) {
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
    const commit = (checkedOut(dir) || override) && (head ? headCommit(dir) : pinnedCommit(root, plugin));
    if (commit === false) skipped.push(plugin);
    else if (!commit && head) problems.push(`${plugin} at ${dir} is not a Git checkout, so it has no HEAD to compare.`);
    else if (!commit) problems.push(`${plugin} has no gitlink in the Foundry index, so it has no pinned copy to compare.`);
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

function main(args = []) {
  const plugins = new Set(SHARED.flatMap((s) => s.plugins));
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
  const { problems, agreed, skipped, commits } = checkShared(path.resolve(root), SHARED, { heads, dirs });
  for (const plugin of skipped) console.log(`Skipped ${plugin}: no checkout at ${path.join(root, plugin)}.`);
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

module.exports = { main, afterHeader, fixturesArray, launcherLookup, checkShared, SHARED };
