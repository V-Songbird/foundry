---
status: accepted on the owner's request of 2026-09-15; implementation pending publication
date: 2026-09-15
---

# ADR 0011: Foreman ships one package on main

Amended for Hush by [ADR 0012](0012-hush-single-package.md): Hush no longer keeps
the edition layout described under Plugins with editions; it ships one package
on main for Claude Code.

## Decision

Foreman ships one package on `main` for Claude Code and Codex.
`.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` sit side by side.
Claude Code hooks are registered in `hooks/hooks.json`. Codex hooks are
registered in `hooks/codex-hooks.json`, which the Codex manifest names in its
`hooks` field. The package has one runtime, one `skills/` tree, one README, one
CHANGELOG, one version and one CI workflow. Contributor configuration for both
hosts, `.claude/rules/` and `AGENTS.md`, lives in the repository.

For Foreman only, this supersedes ADR 0007 (platform branch layout), ADR 0008
(coordinated README editions) and ADR 0010 (main selectors).

## Branches

`main` is Foreman's default branch and its release destination. `Claude` and
`Codex` become frozen history: they receive no further updates and are not
deleted, so every commit a catalog pinned before stays reachable.

## Catalogs and version

Both Foundry catalogs pin the same full `main` commit with `ref: "main"`.
Foreman's Claude catalog entry has no `version`. Both plugin manifests at the
pinned commit carry the same version, and Foreman's own required `test` check
verifies that they match. Claude Code reads the version from `plugin.json`
before a catalog entry, and Codex requires a manifest version, so the number
lives in one plugin commit instead of in two repositories.

## Layout rule and Foundry checks

A plugin is a package when its entry in `.claude-plugin/marketplace.json`
installs from `ref: "main"`; otherwise it keeps Claude and Codex editions.
Foundry's catalog, maintenance-copy, selector and README-pair checks derive the
layout from that entry, so a plugin changes layout in the same pull request
that moves its pins.

For a package, `scripts/git-hooks/check-platform-marketplaces.js` requires:

- an entry in both catalogs, each with `ref: "main"` and the same full SHA on
  `main`;
- both manifests at that SHA, carrying the same version;
- no `version` in the Claude catalog entry;
- a version that differs from the version at the previously committed pin.

`check-maintenance-copies.js` compares only the README navigation checker and
its vendored files on a package's `main`, because the plugin's pre-commit runs
them. Selector checks (`check-main-frontpage.js`, `build-main-readmes.js`) and
README pair checks (`check-readme-parity.js`) run only for plugins with
editions. Foreman's own required `test` check runs its suite on Linux and
Windows.

## Plugins with editions

ADR 0007 branch isolation, ADR 0008 paired READMEs and ADR 0010 selector mains
stay in force, with their checks and rulesets, for every plugin whose Claude
catalog entry pins an edition branch. Hush keeps that layout. Razor's move to
one package is pending in Foundry, and its catalog entries still pin its
edition branches.

## Evidence

ADR 0009 applies inside Foreman's single README. Every result names its host,
model, source and date. A missing result stays `Not measured`, and Claude Code
results are never presented as Codex results.

## Reasons

Two edition branches drift in ways nobody can track objectively. One tree works
on both hosts. Codex 0.154.0 reads `.codex-plugin/plugin.json` before
`.claude-plugin/plugin.json`
([protocol.rs](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/exec-server-protocol/src/protocol.rs#L47))
and uses a manifest `hooks` path instead of `hooks/hooks.json`
([loader.rs](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core-plugins/src/loader.rs#L1187)).
Claude Code loads `hooks/hooks.json` from the plugin root
([plugins reference](https://code.claude.com/docs/en/plugins-reference)).
Two thin registration files keep one runtime.

## Consequences and limits

- Moving Codex's hook registration changes its hook definition, so existing
  Codex users may be asked to trust the hooks again. This has not been observed.
- CI does not establish live hook activation on either host.
- The Codex plugin-creator sample validator
  (`codex-rs/skills/src/assets/samples/plugin-creator/scripts/validate_plugin.py`
  at `rust-v0.154.0`) does not accept a manifest `hooks` field, although the
  0.154.0 runtime uses it.
- Between releases every `main` commit carries the last released version, so a
  listing that does not pin a commit sees no update until the next version.

## History and implementation

ADRs 0007, 0008 and 0010 and `docs/foreman/research/codex-porting.md` keep
their text with supersession markers. Recording this decision changes no GitHub
setting, catalog pin or submodule pointer. Foundry moves Foreman's catalog pins
and gitlink to `main` only after the package is released there.
