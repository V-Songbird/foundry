# Platform isolation: local implementation — 2026-09-08

## Available commands

From Foundry, check a plugin's versionable working tree:

```powershell
fnm env --use-on-cd | Out-String | Invoke-Expression
node scripts/git-hooks/check-platform-layout.js --repo razor --platform Codex
```

Inside a plugin checkout, check exactly what is staged:

```text
node scripts/git-hooks/check-platform-layout.js --platform Codex --staged
```

Check a complete committed tree:

```text
node scripts/git-hooks/check-platform-layout.js --platform Claude --ref HEAD
```

Exit codes: `0` clean, `1` forbidden configuration found, `2` invalid input or
an incomplete check. `--help` documents the modes. Local feature branches use
`--platform` explicitly; CI obtains the platform from the PR destination or
push branch.

## Six local checkouts

All six contain the same checker, checker tests and platform-isolation workflow.
The working-tree layout check passes in each one. Paths below are relative to
the Foundry workspace, not to the GitHub repository.

| Plugin | Branch | Checkout |
| --- | --- | --- |
| Foreman | `Codex` | `foreman/` |
| Foreman | `Claude` | `.claude/worktrees/platform-isolation/foreman-Claude/` |
| Hush | `Claude` | `hush/` |
| Hush | `Codex` | `.claude/worktrees/platform-isolation/hush-Codex/` |
| Razor | `Codex` | `razor/` |
| Razor | `Claude` | `.claude/worktrees/platform-isolation/razor-Claude/` |

The extra checkouts preserve the documentation changes already open in the
primary submodule worktrees. They contain uncommitted work and must not be
deleted before those changes are retained.

## Cleanup and compatibility

- Removed Razor Codex's `.claude-plugin/plugin.json` and the corresponding
  parsing requirement in its existing test workflow. Its former metadata is
  archived in `docs/razor/research/claude-package-metadata-before-isolation.json`.
- Updated Razor's structure and installation guide to match its native package.
- Kept offline benchmark instruments working without the old manifest. The
  historical live runner still refuses native Codex hook arms before it can
  start any model session.
- Hush Codex now states that no Codex package is available to install, without
  presenting another edition's installation commands as instructions for it.

## Evidence and publication boundary

The checker has 13 tests covering nested paths, case, native allowed paths,
near-miss names, staged deletions, untracked and ignored files, committed-tree
inspection, PR destination selection, invalid refs, Git environment isolation
and shared-copy consistency. All 13 passed in Foundry on Windows.

Razor's full suite passed 407 tests with no failures or skips after the cleanup.
Edited public README navigation and Git whitespace checks passed. No paid
benchmark session was run.

All changes remain local and uncommitted. No workflow has been executed on
GitHub as part of this work, no remote branch was changed and no required-status
rule was enabled. The old committed Razor Codex tree still contains the legacy
manifest until its deletion is committed; the clean local result does not claim
that the old commit passes.

The policy and required check name are recorded in
[ADR 0007](../adr/0007-platform-branch-layout.md).
