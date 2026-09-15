---
status: accepted on the owner's request of 2026-09-15
date: 2026-09-15
---

# ADR 0013: Razor ships one package on main, and the edition branches are deleted

## Decision

Razor ships one package on `main` for Claude Code and Codex under ADR 0011's
rules for both hosts. `.claude-plugin/plugin.json` and
`.codex-plugin/plugin.json` carry the same version. Claude Code hooks are
registered in `hooks/hooks.json`; Codex hooks are registered in
`hooks/codex-hooks.json`, which the Codex manifest names in its `hooks` field.
One runtime, one `skills/` tree, one README and one CHANGELOG serve both hosts.

For Razor, this supersedes ADR 0007 (platform branch layout), ADR 0008
(coordinated README editions) and ADR 0010 (main selectors).

## Branches

On 2026-09-15 the owner decided to delete the `Claude` and `Codex` branches of
Foreman, Hush and Razor instead of keeping them as frozen history, without
archive tags. This amends the Branches sections of ADR 0011 and ADR 0012.

- Razor's edition commits stay reachable from `main`, because razor #20 merged
  both editions into it.
- Foreman's `Claude` commits stay reachable from `main`; its `Codex` commits do
  not.
- Hush's package reached `main` as a squash merge (hush #23), so its edition
  commits are no longer reachable from any branch or tag.

## Catalogs and version

Both Foundry catalogs pin the same full `main` commit with `ref: "main"`.
Razor's Claude catalog entry has no `version`; both manifests at the pinned
commit carry it. The first pin is razor `b7d33ae` at version 1.6.0. It replaces
the Claude edition's 1.5.11 at `2454026` and the Codex edition's pin at
`6f424c3`.

## Foundry checks and benchmarks

No catalog entry pins an edition branch any more, so the selector and
README-pair checks find no plugin to run on. They stay, with ADRs 0007, 0008
and 0010, for a future plugin with editions. Razor's benchmark instruments read
the package: the Codex runner loads `hooks/codex-hooks.json`, and CI tests the
submodule at its pinned `main` commit instead of fetching `Codex`.

## Consequences and limits

- Moving Codex's hook registration changes its hook definition, so existing
  Codex users may be asked to trust Razor's hooks again. This has not been
  observed.
- CI does not establish live hook activation on either host.
- A listing that still holds an older catalog with `ref: "Claude"` or
  `ref: "Codex"` cannot fetch those refs until it refreshes the marketplace.
- The `platform-claude` and `platform-codex` rulesets in the three repositories
  now target branches that do not exist. Removing them is a GitHub setting
  change left to the owner.
