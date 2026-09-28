# Foundry

Foundry is the marketplace that lists the Foreman, Hush and Razor plugins for Claude Code and
Codex. The plugins are Git submodules pinned by commit; this repository holds the two catalogs,
the release procedure, the README contract the plugins share and the brand kit their images come
from. Foreman and Razor also run on Antigravity, which has no catalog: its users install a plugin
directory from a Foundry clone, which checks the plugin out at its pinned commit, and Antigravity
reads that plugin's own root `plugin.json` and `hooks.json`. Nothing is installed here, and the
only build is the artwork under `brand/`. The plugins run their hooks and tests with Node.js 22 or
later and Git.

## Start here

- For installation and the plugin table, read [README.md](README.md).
- Before changing a catalog or cutting a release, read [the release procedure](.claude/skills/cut-release/SKILL.md).
- Before changing a plugin, read that plugin's own `AGENTS.md`; each submodule is a separate repository with its own rules, tests and changelog.
- Before editing or reviewing a plugin README, read [the README contract](docs/knowledge/plugin-readme-template.md).
- Before changing any banner, icon, host card, Ember scene or evidence graphic, read [the brand guide](docs/knowledge/brand.md).

## Rules that outrank everything

- A catalog entry never carries a version. The version lives in the plugin's manifests, and a release moves only `source.sha` and the gitlink.
- A plugin listed in both catalogs pins the same `main` commit in both. Hush ships for Claude Code only and stays out of the Codex catalog. Antigravity needs no catalog entry; a plugin that ships for it carries a root `plugin.json` with the same version as its other manifests.
- Plugin source changes happen in the plugin's repository on a topic branch, never as loose edits on the pinned checkout.

## Commands

Run from the repository root unless a row names another directory.

| Command | Purpose | Cost |
| --- | --- | --- |
| `claude plugin validate .` | Validate the Claude Code catalog | Local |
| `agy plugin validate foreman` or `agy plugin validate razor` | Validate a plugin's Antigravity package | Local; needs the Antigravity CLI |
| `node --test tests/*.test.js` from `foreman/`, `hush/` or `razor/` | One plugin's suite | Local temporary fixtures; razor's suite fails under the system temp directory. Foreman's suite takes about 300 s: run it in the background or with a timeout above 300 s, or narrow it with `--test-name-pattern` |
| The pin check in [cut-release step 4](.claude/skills/cut-release/SKILL.md) | Pins, gitlinks and manifest versions agree | Local Git reads in each plugin |
| `node scripts/check-shared-copies.js`, `node --test scripts/check-shared-copies.test.js` | Hush's and Razor's hand-copied `hooks/lib/safe-write.js` code and turn-boundary `FIXTURES` agree, and so do the seven whole files of the README nav check and the pre-commit hook with its test in Foreman, Hush and Razor, and so does the Node.js and fnm lookup in Foreman's and Razor's `hooks/windows-launcher.ps1`; the test proves a changed copy fails | Local reads; a plugin with no checkout is skipped and named, and a run that compared nothing fails. From a worktree without plugin checkouts, pass the Foundry root: `node scripts/check-shared-copies.js <root>`. The test takes about a minute and prints nothing until it ends; `--test-reporter=spec` shows progress |
| `git submodule update --init` | Check every plugin out at its pinned commit | Network on a fresh clone |
| `node --test scripts/claude-hooks/*.test.js` | The repository's own hook, which reruns a plugin's suite after an edit under its `scripts/` or `hooks/`; for Foreman, only the test files that cover the edited module | Local temporary fixtures |
| `node brand/mascot/build.cjs`, `node brand/graphics/build.cjs` | Rebuild the Ember scenes or the evidence graphics | Local |
| `node brand/identity/build.cjs` | Rebuild icons, README banners, wordmarks and social cards | Local; needs Sharp and Segoe UI |
| `node brand/identity/build-review.cjs` | Refresh the review gallery `brand/identity/index.html` | Local |
| `node brand/check-timing.js <svg>` | Check the SMIL timing lists of an animated SVG | Local |

CI runs `.github/workflows/validate-marketplace.yml` on pushes and pull requests to `main`. Its
`validate` job is the check the default branch's ruleset requires. It checks both catalogs: no
entry carries a version, each has a full `source.sha` and a `ref`, each name is a submodule path
whose gitlink names that same commit, and a plugin in both catalogs has one pin. Then it runs
`claude plugin validate .`. A gitlink moved off its pin therefore fails CI. The cut-release
step 4 pin check and shared-copy check stay local steps, because they read the plugin checkouts
and CI checks out no submodules.

## Where things live

| Path | Content |
| --- | --- |
| `.claude-plugin/marketplace.json` | Claude Code catalog: foreman, hush, razor |
| `.agents/plugins/marketplace.json` | Codex catalog: foreman, razor |
| `foreman/`, `hush/`, `razor/` | Plugin repositories, mounted as submodules |
| `flint/` | Plain-text writing and coding instructions; a submodule outside both catalogs |
| `.claude/skills/cut-release/`, `.agents/skills/cut-release/` | The release procedure, user-invoked only: Claude Code's skill holds the steps, and the Codex skill delegates to it with Codex notes |
| `.claude/skills/brand/`, `.agents/skills/brand/` | The artwork procedure for Claude Code and Codex; the two files stay identical |
| `.claude/agents/`, `.codex/agents/` | `plugin-docs-reviewer`, the read-only README review, for Claude Code and Codex |
| `.claude/settings.json`, `.codex/hooks.json` | Shared Claude Code settings and the Codex hook registration for this checkout |
| `.github/workflows/validate-marketplace.yml` | The CI workflow that produces the required `validate` check |
| `scripts/claude-hooks/` | The post-edit hook that reruns the touched plugin's tests, with its own test |
| `scripts/check-shared-copies.js` | The check that the plugins' hand-copied files agree, with its own test |
| `brand/` | The brand kit: sources, generators and the exported images each plugin copies into its `assets/` |
| `docs/knowledge/` | Public documentation: the plugin README contract and the brand guide |

## Conventions

`CLAUDE.md` imports this file; keep shared project facts here. Codex reads this file directly.

Each plugin keeps its README, `AGENTS.md`, tests and `docs/knowledge/changelog.md` in its own
repository. Edit them there, merge into that plugin's `main`, then re-pin here through the
release procedure. This repository carries no single plugin's documentation, only the README
contract the three share.

## Pitfalls

- **A fresh clone leaves every plugin on a detached HEAD at its pin.** A commit made there lands on no branch; switch to a branch in the plugin first.
- **A plugin checkout serves one session at a time.** When another task holds a branch or uncommitted edits in `foreman/`, `hush/` or `razor/`, work in a separate worktree under the root's ignored `.private/`: `git -C <plugin> worktree add ../.private/<plugin>-<id> -b <branch> main`, where `<id>` names your task. The post-edit hook reruns the worktree's suite after an edit in its `scripts/` or `hooks/`. To compare its committed shared copies before merge, run `node scripts/check-shared-copies.js --<plugin> .private/<plugin>-<id>`, which reads that plugin at the worktree's HEAD and the others at their pins. When an entry changes a shared file in several plugins, pass one override per worktree in the same run; one worktree alone is compared with the others' old pins. After the branch merges, remove it with `git -C <plugin> worktree remove ../.private/<plugin>-<id>`. A session the desktop app started in its own worktree under `.claude/worktrees/` keeps the plugin worktree inside it. First run `git -C <app worktree> rev-parse --show-toplevel`. When it prints the Foundry root, called `<root>` below, the app folder is not a worktree and Git there acts on the root: if the folder is empty, run `git -C <root> worktree add --detach <app worktree> main`; if it is not empty, stop and report it rather than clear it, because that command then fails with `already exists`. Otherwise run `git -C <app worktree> switch --detach main`. After either command, `.private/` is ignored there; add the plugin worktree at `<app worktree>/.private/<plugin>-<id>`. Pass that absolute path to `--<plugin>`, as in `node scripts/check-shared-copies.js --<plugin> <app worktree>/.private/<plugin>-<id> <root>`, because a relative override resolves against the root argument, not the current directory.
- **A pushed gitlink ships to Antigravity.** Claude Code and Codex install the catalog's `source.sha`, but a Foundry clone checks each plugin out at its gitlink, and Antigravity installs that checkout. A release moves both together; never push a `main` where they differ.
- **`git submodule update` moves each plugin back to its pin.** It stops on uncommitted edits to tracked files; untracked files stay.
- **An Antigravity install is a copy of a checkout, not a pin.** `agy plugin install` copies the directory it is given; a plugin checked out anywhere but its pinned commit installs that other state. An install takes a new release only when its user pulls the clone, runs `git submodule update --init` and installs again.
- **A plugin's `assets/` holds copies.** An image edited there is overwritten by the next copy from `brand/`; change the kit, rebuild, then copy.
