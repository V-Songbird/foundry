<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg" />
    <img src="assets/logo.svg" alt="foundry" width="240" />
  </picture>
  <h1>foundry</h1>
  <p><strong>Claude Code plugins that help you plan better, talk less, build leaner, and stop guessing.</p>
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE) [![Claude Code](https://img.shields.io/badge/Claude_Code-E5582B)](https://docs.anthropic.com/en/docs/claude-code)

> **TL;DR** — Three small plugins for Claude Code: foreman keeps a project roadmap and writes better prompts, hush cuts chatter and cost, razor stops unnecessary code. Install one or all three — they compose.

---

## New here?

[Claude Code](https://code.claude.com/docs/en/overview) is Anthropic's AI coding assistant. **Plugins** extend it — they teach Claude new workflows, add guardrails, or change how it behaves, all with a one-line install and no configuration.

This is a small, curated collection. Each plugin does one job well, works on its own, and stays out of the others' way. Install one, install all three — they compose.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/foundry
/plugin install <plugin-name>@foundry
```

The first command registers this collection (once); the second installs whichever plugin you want. Uninstalling is just as easy: `/plugin uninstall <plugin-name>@foundry`.

---

## The plugins

### [foreman](https://github.com/V-Songbird/foreman) — A roadmap for your project, and better prompts for free

Foreman keeps a living task list (`ROADMAP.jsonl`) inside your project: why each task exists, what it is, its status, and the commits that shipped it. Ask "what's next?" and it picks the best next task like a software architect would — then writes a complete, professional prompt to hand that task to a fresh Claude session. It also builds standalone prompts on demand with `/foreman:craft-prompt`.

```
/plugin install foreman@foundry
```

### [hush](https://github.com/V-Songbird/hush) — Less chatter, lower cost

Claude can be talkative: progress narration, previews of what it's about to do, walls of command output. Hush trims all of it at the harness level — a forced output style (silence while working, one clear summary at the end), automatic compression of noisy command output and bulky log files before they eat your context window, and a meter that catches mid-turn rambling the moment it starts. Sessions get cheaper and easier to read.

```
/plugin install hush@foundry
```

### [razor](https://github.com/V-Songbird/razor) — Stops Claude from over-building

AI assistants love to add: a new dependency here, five helper files there, an abstraction "for later". Razor pushes back with a simple ladder — don't build it if it isn't needed, reuse what exists, prefer the standard library — and backs the words with mechanical gates: the first attempt to install a new package is challenged once, with the project's *actual* installed-dependency list right in the message; file sprawl gets questioned before it lands; and a git-grounded ledger asks, once per heavy session, whether all that new code is really needed. Never a hard block; always one forced second thought.

```
/plugin install razor@foundry
```

### Which one first?

| You want to… | Install |
| --- | --- |
| Track project tasks and hand them off cleanly | **foreman** |
| Cut token cost and noise | **hush** |
| Keep the codebase lean | **razor** |

hush and razor are natural partners: hush governs how Claude *talks*, razor governs what it *builds*.

---

## Repository layout

```
foundry/
├── foreman/
├── hush/
└── razor/
```

Every plugin lives in its own repo, mounted here as a git submodule (see [`.gitmodules`](.gitmodules)). Each ships its metadata in `.claude-plugin/plugin.json` and carries its own `README.md`, `CHANGELOG.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`; the root copies of the community files govern contributions to this marketplace repo itself. The marketplace index is [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) — it is also the single owner of every plugin's version number (plugin.json files carry no version field).

---

## Development

Run this once after cloning, to enable the commit gates:

```
git config core.hooksPath scripts/git-hooks
```

`.claude/settings.json` (committed) registers two repo-wide dev hooks, both dev-only — neither fires for anyone who has merely *installed* a plugin from this repo, only for edits made inside the source tree itself:

- `.claude/hooks/run-tests-on-edit.js` reruns whichever plugin's own test suite after an `Edit`/`Write` lands in that plugin's `scripts/` or `hooks/` dir — detected by walking up to the nearest `.claude-plugin/plugin.json` marker, so it works for any plugin in this repo, not just one. Silent when green; surfaces a failure via `additionalContext` when red.
- `.claude/hooks/nudge-manifest-curator.js` nudges a follow-up `manifest-curator` audit after an `Edit`/`Write` lands in `.claude-plugin/marketplace.json` or any plugin's `.claude-plugin/plugin.json` — manifest edits are easy to get subtly wrong (stale author info, version drift, schema violations), so a check only helps if something actually reminds you to run it.

Tests, for a plugin that has them:

```
node --test <plugin>/tests/*.test.js
```

---

## Community

- Bug reports and suggestions: [GitHub Issues](https://github.com/V-Songbird/foundry/issues)
- Security reports: [SECURITY.md](./SECURITY.md)
- Contribution guidelines: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## License

MIT — see [LICENSE](./LICENSE).
