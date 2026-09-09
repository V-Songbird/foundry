<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.png" />
    <img src="assets/banner-light.png" alt="foundry" width="900" />
  </picture>
  <h1>foundry</h1>
  <p><strong>Plugins for Claude Code and Codex that keep the plan, cut the chatter, and stop the over-building.</strong></p>
</div>

<p align="center">
    <a href="https://github.com/V-Songbird/foundry/stargazers"><img src="https://img.shields.io/github/stars/V-Songbird/foundry?style=social" alt="GitHub stars"/></a>
    <a href="https://github.com/V-Songbird/foundry/blob/main/LICENSE"><img src="https://img.shields.io/github/license/V-Songbird/foundry" alt="License"/></a>
    <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude_Code-E5582B" alt="Claude Code"/></a>
</p>

[Choose a plugin](#the-plugins) · [Install](#install) · [Development](#development) · [Community](#community)

## What is Foundry?

A coding session ends with a fix, a new idea and a little more code. The next session needs the plan, you need a clear result, and the codebase needs to stay manageable. Foundry is a collection of plugins for those everyday problems.

Each plugin works on its own. Foreman keeps the plan beside your code. Hush reduces narration and long command output. Razor asks whether new code is needed before it gets added.

## The plugins

| When you want to… | Start with | Availability |
| --- | --- | --- |
| Pick up the next task with its context intact | [Foreman](https://github.com/V-Songbird/foreman) | Claude Code and Codex |
| Find the result without reading every step | [Hush](https://github.com/V-Songbird/hush) | Claude Code; Codex in development |
| Keep a small change from becoming extra maintenance | [Razor](https://github.com/V-Songbird/razor) | Claude Code and Codex |

Ask Foreman “what’s next?” to get a recommended task and a checked handoff. Use Hush when running commentary buries the outcome. Use Razor when an existing function or language feature might solve the task without another dependency.

The edition pages explain native commands, coverage and limitations. Benchmark results belong to the named host and recorded setup; quieter sessions do not always cost less.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/foundry
/plugin install <plugin-name>@foundry
```

The first command registers this collection — you only do it once. The second installs whichever plugin you want. Changed your mind? `/plugin uninstall <plugin-name>@foundry` and it's gone.

### Codex

Foreman and Razor have Codex versions. Run:

```powershell
codex plugin marketplace add V-Songbird/foundry
codex plugin add foreman@foundry
codex plugin add razor@foundry
```

The Codex catalog is [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json).
Both platforms use the name `foundry` and select their own catalog. Each catalog
installs from the plugin repository's platform branch at a pinned revision.
Open a new Codex task after installation to load the installed skills and hooks.
Hush for Codex is not available yet.


## Repository layout

The plugin repositories are mounted as [Git submodules](.gitmodules). Each has a main overview and separate Claude and Codex editions. The [Claude catalog](.claude-plugin/marketplace.json) and [Codex catalog](.agents/plugins/marketplace.json) select pinned edition revisions.

[Flint](https://github.com/V-Songbird/flint) provides plain-text writing and coding instructions for sessions where you do not want to install a plugin. It is outside the marketplace.

Research, benchmark instruments and shared visual guidance live in [docs](docs/README.md) and [benchmarks](benchmarks/README.md). Product usage guides stay with their plugin.

## Development

Run this once after cloning, to switch on the commit gates:

```
git config core.hooksPath scripts/git-hooks
```

`.claude/settings.json` (committed) registers three repo-wide dev hooks. All are dev-only. None fire for anyone who merely *installed* a plugin from this repo — only for work done inside the source tree itself:

- `.claude/hooks/run-tests-on-edit.js` reruns a plugin's own test suite after an `Edit`/`Write` lands in that plugin's `scripts/` or `hooks/` dir. It finds the right suite by walking up to the nearest `.claude-plugin/plugin.json` marker, so it works for any plugin here. Silent when green; it surfaces a failure when red.
- `.claude/hooks/nudge-manifest-curator.js` nudges a follow-up `manifest-curator` audit after an edit lands in `.claude-plugin/marketplace.json` or any plugin's `.claude-plugin/plugin.json`. Manifest edits are easy to get subtly wrong, so the reminder earns its keep.
- `.claude/hooks/check-checkpoint-commits.js` watches `Bash`/`PowerShell` calls for a `git commit` whose message reads like a per-step checkpoint (`task 3/7: …`) and reminds you that checkpoints belong on a branch, squash-merged back into one real commit before you report the work done.

Tests, for a plugin that has them:

```
node --test <plugin>/tests/*.test.js
```


## Community

- Bug reports and suggestions: [GitHub Issues](https://github.com/V-Songbird/foundry/issues)
- Security reports: [SECURITY.md](./SECURITY.md)
- Contribution guidelines: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## License

MIT — see [LICENSE](./LICENSE).
