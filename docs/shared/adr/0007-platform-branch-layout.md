# ADR 0007: plugin branches contain their own platform configuration

Status: accepted for local implementation by the owner, 2026-09-08.

## Decision

The `Claude` and `Codex` branches of Foreman, Hush and Razor carry only their
own platform's configuration. The Foundry parent repository supports both
platforms and is outside this restriction.

| Branch | Forbidden path components and entry files |
| --- | --- |
| `Codex` | `.claude`, `.claude-plugin`, `CLAUDE.md`, `CLAUDE.local.md` |
| `Claude` | `.agents`, `.codex`, `.codex-plugin`, `AGENTS.md`, `AGENTS.override.md`, `CODEX.md` |

Matching ignores case and applies at every path depth. This prevents a nested
instruction file or package manifest from escaping the rule. The check is
about configuration paths; it does not ban platform names in shared code,
migration explanations, test strings or historical evidence.

Historical research and archived metadata belong in Foundry's central
documentation tree. Product usage guides describe the branch's own edition.
A branch that has no installable package says so; Hush's Codex branch remains
an unavailable development edition.

## Verification

Each platform branch carries `scripts/git-hooks/check-platform-layout.js`,
its tests and `.github/workflows/platform-layout.yml`. Foundry keeps the
canonical checker and `.github/PLUGIN_PLATFORM_LAYOUT_WORKFLOW.yml`.

The workflow runs on pushes to `Claude` or `Codex` and pull requests targeting
either branch. It checks the full committed tree, using the PR base branch
when present. No path filter restricts the check to recently changed files.
Unknown platforms and unreadable Git trees return an error rather than passing.

Local checks can inspect the working tree, staged index or a named committed
tree. Working-tree mode includes untracked versionable files and excludes
ignored personal state. A committed file remains checked even if an ignore
pattern matches it.

## GitHub enforcement

The check's job name is **Platform layout**. After publishing the workflow,
making that status check required on both platform branches is the separate
repository setting that prevents merges when it fails. A push-triggered
workflow by itself reports a failure after the push; it does not reject that
push retroactively. No repository protection setting was changed during this
local implementation.

See [GitHub workflow branch filters](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
and [required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging).
