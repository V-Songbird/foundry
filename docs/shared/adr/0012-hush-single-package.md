---
status: accepted on the owner's request of 2026-09-15; implementation pending publication
date: 2026-09-15
---

# ADR 0012: Hush ships one package on main

Amended by [ADR 0013](0013-razor-single-package.md): the `Claude` and `Codex`
branches described under Branches were deleted on 2026-09-15, so Hush's edition
commits are no longer reachable from a branch.

## Decision

Hush ships one package on `main`: its Claude Code plugin. The package carries
`.claude-plugin/plugin.json` and `hooks/hooks.json`, one runtime, one README,
one CHANGELOG, one version and one CI workflow. Hush has no Codex package, so
`main` carries no `.codex-plugin/` manifest or Codex hook registration, and the
README keeps Codex marked as not available. Contributor configuration for both
hosts, `.claude/rules/` and `AGENTS.md`, lives in the repository.

For Hush, this supersedes ADR 0007 (platform branch layout), ADR 0008
(coordinated README editions) and ADR 0010 (main selectors), and it replaces
ADR 0011's statement that Hush keeps its editions.

## Branches

`main` is Hush's default branch and its release destination. `Claude` and
`Codex` become frozen history: they receive no further updates and are not
deleted. The package reached `main` as a squash merge (hush #23, `15dc0ef`), so
edition commits are reachable only from those branches, and every commit a
catalog pinned before depends on keeping them. `Claude` holds the last edition
release, 1.11.8. `Codex` never carried an installable package.

## Catalogs and version

The Claude catalog pins a full `main` commit with `ref: "main"` and carries no
Hush version. `.claude-plugin/plugin.json` at that commit carries the version.
The Codex catalog has no Hush entry.

## Foundry checks

ADR 0011's layout rule applies unchanged: a plugin is a package when its Claude
catalog entry installs from `ref: "main"`. `check-platform-marketplaces.js`
accepts a package without a Codex catalog entry only when its pinned commit has
no Codex manifest. Such a package still needs a version in its Claude manifest,
no version in its Claude catalog entry and a version that differs from the one
at its previous pin. A package that carries a Codex manifest still needs the
same commit in both catalogs and the same version in both manifests.

## Reasons

The owner decided on 2026-09-15 to stop splitting Hush between Claude and Codex
branches and to develop and release it from `main`, as Foreman does. Hush's
`Codex` branch held documentation and edition tooling but no runtime, and its
port was closed on 2026-08-18
([dossier](../../hush/research/codex-port-dossier.md)), so the package contains
only the Claude Code plugin. Reopening a Codex port is a separate decision; it
would add a Codex manifest and a Codex catalog entry under ADR 0011's rules for
both hosts.

## Consequences and limits

- CI does not establish live hook activation in Claude Code.
- Between releases every `main` commit carries the last released version, so a
  listing that does not pin a commit sees no update until the next version.

## History and implementation

ADRs 0007, 0008, 0010 and 0011 keep their text with supersession markers.
Recording this decision changes no GitHub setting. Foundry moves Hush's Claude
catalog pin and gitlink to `main` only after the package is merged there.
