---
name: cut-release
description: >-
  Developer tool for this marketplace repo. Walks through cutting a release
  for one plugin: adds the CHANGELOG entry in the plugin's own submodule,
  commits and pushes it there, then bumps that plugin's "version" and
  "source.sha" together in the root .Codex-plugin/marketplace.json (the two
  fields that must move together, per this repo's release discipline), and
  commits/pushes the root repo. User-invocable only — never triggered
  automatically, since it commits and pushes to two separate repos.
disable-model-invocation: true
allowed-tools: Bash, Read, Edit
---

EXPERIMENTAL Codex-port copy, forked from .claude/skills/cut-release/SKILL.md and never re-synced. The root manifest is .claude-plugin/marketplace.json; per-port manifests live at plugins/<name>-codex/.codex-plugin/. Do not follow the .Codex-plugin / .Codex paths below.

# cut-release

Cuts a release for one plugin in this marketplace. This repo's rule: `.Codex-plugin/marketplace.json` is the SINGLE owner of a plugin's version (no `plugin.json` here ever sets `version`), and its `version` + `source.sha` fields must change together, in the same commit, or installers get a mismatched label or a silently-skipped update. See `CONTRIBUTING.md` → "Cutting a release" for the full rationale.

## Step 0 — figure out which plugin, and confirm the code is ready

Ask which plugin to release if not stated: `foreman`, `hush`, or `razor`.

```bash
git -C "<plugin>" status --short
git -C "<plugin>" log origin/main..HEAD --oneline
```

If there are uncommitted changes in the plugin's submodule, stop and ask whether to commit them first (this skill does not write plugin source code — it only handles the release bookkeeping). If there are local commits not yet pushed, note that Step 2 will push them along with the CHANGELOG commit.

**foreman only:** its `TaskCreated`/`TaskCompleted` hooks parse an undocumented Codex hook-input schema. Compare `Codex --version` against the version noted in `.benchmarks/foreman-handoff/task-schema-canary.js`'s last run (and the schema-date comments atop `foreman/hooks/task-created.js` / `task-completed.js`) — if the binary bumped since then, run `node .benchmarks/foreman-handoff/task-schema-canary.js` before proceeding, and update those two header comments if it reveals drift.

## Step 1 — pick the new version

Read the plugin's current version from `.Codex-plugin/marketplace.json` (root) for this plugin's entry. Ask the user for the new version, or propose one via semver bump (patch for fixes, minor for new user-facing behavior, major for breaking changes) based on the commits found in Step 0. Keep the `-alpha` suffix if the current version has one, unless the user says this release drops it.

## Step 2 — update the plugin's own CHANGELOG.md and push

1. `Read` `<plugin>/CHANGELOG.md`.
2. Ask the user for a one-line, user-facing summary of what this release changes (or draft one from the Step 0 commit log and confirm it with the user — per `.Codex/rules/public-docs.md`: effect-first, no methodology, no run tags, no history narration).
3. `Edit` the file: insert a new heading `## <version> — <YYYY-MM-DD>` directly below the intro paragraph (above the most recent existing version heading), followed by the summary paragraph. Do not add an `[Unreleased]` staging heading — this repo's actual practice adds the versioned heading directly at release time.
4. Commit and push inside the submodule:
   ```bash
   git -C "<plugin>" add CHANGELOG.md
   git -C "<plugin>" commit -m "Release <version>"
   git -C "<plugin>" push origin main
   ```
   The plugin's own pre-commit hook (if `core.hooksPath` is configured) runs its test suite here — if it fails, stop and report; do not bypass with `--no-verify` without the user's explicit go-ahead.

## Step 3 — bump version + source.sha together in marketplace.json

1. Get the new commit: `git -C "<plugin>" rev-parse HEAD`.
2. `Read` `.Codex-plugin/marketplace.json`.
3. `Edit` that plugin's entry: set `"version"` to the Step 1 value AND `"source"."sha"` to the Step 3.1 commit, in the same edit pass. Both fields must change together — this is exactly what the root's own pre-commit hook (`scripts/git-hooks/check-marketplace-sync.js`) checks for.

## Step 4 — commit and push the root repo

```bash
git -C . add .Codex-plugin/marketplace.json "<plugin>"
git -C . commit -m "Release <plugin> <version>"
git -C . push origin main
```

The root pre-commit hook verifies the staged submodule pointer bump matches marketplace.json's new `source.sha` — if it blocks, re-check that both Step 3 edits landed (a partial edit, e.g. `sha` updated but `version` not, still triggers real problems even though this specific hook only checks `sha`).

## Step 5 — confirm

Report the new version, the plugin's new commit SHA (short form), and both push results. If either push failed (e.g. blocked by a permission gate), stop and surface that clearly rather than retrying silently.

## What this skill does not do

- Write or edit plugin source code, skills, agents, or hooks.
- Decide the version bump size without asking — always confirm with the user unless they already stated it.
- Force-push, skip hooks, or bypass a failing test without explicit user confirmation.
