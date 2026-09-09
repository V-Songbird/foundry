"use strict";
const fs = require("node:fs"), path = require("node:path"), cp = require("node:child_process");
const { productSections, checkCommon } = require("./git-hooks/check-main-frontpage");

function render(plugin, claude, codex) {
  if (!["foreman", "hush", "razor"].includes(plugin)) throw Error("Unknown plugin");
  const source = claude.replace(/\r\n/g, "\n");
  const sections = productSections(source);
  const errors = checkCommon(source, source, codex);
  if (errors.length) throw Error(errors.join("\n"));
  const header = source.match(/^<div align="center">[\s\S]*?^<\/div>/m)?.[0];
  const animation = source.match(/^<p align="center"><img src="assets\/mascot\.svg"[^\n]+/m)?.[0];
  const summary = source.split("\n").find(line => line.startsWith("> **TL;DR**"));
  const hero = source.match(/<!-- foundry:hero -->[\s\S]*?<!-- \/foundry:hero -->/)?.[0];
  if (!hero) throw Error("Product hero and demo are missing");
  if (!header || !animation) throw Error("Shared branding is incomplete");
  const url = `https://github.com/V-Songbird/${plugin}/tree/`;
  const status = plugin === "hush"
    ? `**Available for [Claude Code](${url}Claude).** The [Codex edition](${url}Codex) is not currently installable.`
    : `**Choose your edition: [Claude Code](${url}Claude) · [Codex](${url}Codex)**`;
  const row = plugin === "hush"
    ? `| Codex | Not currently installable | [Read the edition status](${url}Codex) |`
    : `| Codex | Available | [Install and get started](${url}Codex) |`;
  const block = heading => `## ${heading}\n\n${sections[heading]}`;
  return `${header}

${status}

[**Get started**](#get-started) · [What is this?](#what-is-this) · [How it works](#how-it-works) · [What you can do](#what-you-can-do) · [Evidence](#evidence-and-benchmarks)

${summary || ""}

${sections["What is this?"].includes("assets/mascot.svg") ? "" : animation}

${block("What is this?")}

${block("Why you'd want it")}

${block("How it works")}

${block("What you can do")}

${block("What you can do")}

## Get started

Choose the assistant you use. Its edition page has the installation steps,
commands and compatibility notes for your setup.

| Your assistant | Status | Next step |
| --- | --- | --- |
| Claude Code | Available | [Install and get started](${url}Claude) |
${row}

${block("Good to know")}

## Evidence and benchmarks

${hero}

Measurements belong to the model and setup that produced them. Each edition
keeps its own results, limitations and any measurements still missing:

- [Claude Code results and limitations](${url}Claude#the-numbers)
- [Codex evidence and measurement status](${url}Codex#the-numbers)

## Going deeper

[Research and validation](https://github.com/V-Songbird/foundry/tree/main/docs/${plugin}) · [Benchmark instruments and retained evidence](https://github.com/V-Songbird/foundry/tree/main/benchmarks/${plugin}) · [Foundry](https://github.com/V-Songbird/foundry)

## License

MIT — see [LICENSE](LICENSE).
`;
}

function main(args = process.argv.slice(2)) {
  const [plugin, repo, target, mode] = args;
  if (!plugin || !repo || !target || (mode && mode !== "--check")) throw Error("Usage: node scripts/build-main-readmes.js PLUGIN SOURCE_REPO MAIN_WORKTREE [--check]");
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  const git = ref => cp.execFileSync("git", ["-C", repo, "show", `${ref}:README.md`], { env, encoding: "utf8" });
  const text = render(plugin, git("Claude"), git("Codex"));
  const file = path.join(target, "README.md");
  if (mode === "--check") {
    if (fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") !== text) throw Error("Main overview differs from the shared edition content");
  } else fs.writeFileSync(file, text);
}
module.exports = { render, main };
if (require.main === module) main();
