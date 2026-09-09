# Plugin main selectors — local verification, 2026-09-08

Scope: Foreman, Hush and Razor. The owner explicitly excluded Flint; its main
branch and product files were left unchanged.

## Four-file contract

Each main tree contains only:

- README.md
- LICENSE
- assets/logo.svg
- assets/logo-dark.svg

The local main refs already had that file set. Their README files still repeated
installation commands. The prepared pages now contain only the product summary,
edition links, Foundry link and license link. Hush's Codex link explicitly says
that the edition is in development and is not available to install.

No runtime, plugin manifest, skills, agent instructions, hooks, benchmarks or
workflow files are added to the plugin main trees. Validation lives in Foundry.

## Prepared working copies

All paths are relative to the Foundry workspace. Each checkout uses the
`main-front-page` branch created from that plugin's local main ref:

| Plugin | Working copy |
| --- | --- |
| Foreman | `.claude/worktrees/main-front-pages/foreman/` |
| Hush | `.claude/worktrees/main-front-pages/hush/` |
| Razor | `.claude/worktrees/main-front-pages/razor/` |

The normal `codex/` branch prefix could not be used inside these Windows repos:
their existing Codex ref occupies that case-insensitive path. No ref was renamed
or removed to work around it. Platform checkouts and their uncommitted work are
preserved. Main refs themselves have not been advanced by this step.

## Verification

- Six tests passed for the main-selector checker, including rejection of runtime,
  benchmark, instruction and workflow files and exclusion of Flint.
- All three prepared working copies pass the exact four-file check.
- README navigation and Git whitespace checks pass.
- Native rules, the README template, shared skill and both documentation reviewers
  now distinguish main selectors from full Claude/Codex edition pages.

Run the local check from Foundry:

```text
node scripts/git-hooks/check-main-frontpage.js --repo .claude/worktrees/main-front-pages/foreman --plugin foreman --worktree
```

The committed-tree form uses `--ref main` instead of `--worktree`. It also
rejects executable files, symlinks and submodule entries in a selector tree.

## Publication status

A read-only `git ls-remote --heads origin` check found only main on GitHub for
all three plugins. The observed remote main commits were:

| Plugin | Remote main |
| --- | --- |
| Foreman | `4eb352c2fc3664f80f8d989a81ca37a9dd7d3a5b` |
| Hush | `d8d69e9e5cb9284276e24cddf2ff93b4a8cb9c11` |
| Razor | `e0cf7ceb4d09efb5ea651555aa8354d03b1c6c2e` |

Publish the Claude and Codex destination branches before publishing these main
selectors. The new Foundry workflow fetches all three required refs and checks
the published main file sets; a missing destination branch fails the fetch.
This workflow has not run remotely as part of the local preparation.

No commit, merge or push was performed. These changes are ready for review in
the three prepared working copies, alongside the earlier local work.
