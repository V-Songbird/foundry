# Razor as one package for Claude Code and Codex — feasibility (2026-09-15)

## Question

The owner asked whether Razor's Claude and Codex editions can become one plugin
with one line of development. Two edition branches drift in ways that cannot be
tracked objectively. This note records what was checked on 2026-09-15. Nothing
was committed, installed, published or measured with a model.

## Verdict

Feasible. The `Codex` branch already contains the complete Claude runtime and
selects its host adapter explicitly. Both hosts can load one tree without either
reading the other's configuration. The larger change is Foundry governance
(ADRs, rules, checks, rulesets and marketplace pins), not product code.

## Evidence

### 1. The two branches

Compared razor `Claude` at `2454026` with `Codex` at `6f424c3` (merge base
`e0cf7ce`) by blob hash.

- 78 files are identical, 17 differ, 3 exist only on `Claude` and 9 only on
  `Codex`. `git diff --stat Claude Codex`: 29 files, +1343/−237.
- Codex-only runtime is additive: `hooks/codex-hook.js` (25 lines),
  `hooks/lib/codex-harness.js` (80), `hooks/lib/codex-tools.js` (236), plus
  `tests/codex_runtime.test.js` and `tests/codex_tools.test.js`.
- Shared hooks differ by small host-guarded edits. `hooks/codex-hook.js` sets
  `RAZOR_HOST=codex` ([codex-hook.js:5](https://github.com/V-Songbird/razor/blob/6f424c352aaed87afac090a8fd3e1aaa8e77bbf2/hooks/codex-hook.js#L5)),
  `razor-lib.js` picks the harness from it ([razor-lib.js:12](https://github.com/V-Songbird/razor/blob/6f424c352aaed87afac090a8fd3e1aaa8e77bbf2/hooks/razor-lib.js#L12)),
  `subagent-start.js` adds the `explorer` skip only under that flag,
  `pre-tool-use.js` adds a branch taken only for `tool_name === 'apply_patch'`,
  `safe-write.js` also trusts `PLUGIN_DATA`, and several modules export `main`.
- Real divergences: `hooks/hooks.json` (different content at the same path), the
  two manifests, `skills/unused/SKILL.md`, the CI workflow, and the docs
  (README, CHANGELOG, CONTRIBUTING, HOW-IT-WORKS, SETTINGS, SETUP).

### 2. Claude Code

[Plugins reference](https://code.claude.com/docs/en/plugins-reference), fetched
2026-09-15: `hooks/hooks.json` at the plugin root loads automatically, and
manifest `hooks` follow their own merge rules rather than replacing that file.
Claude's hook registration must therefore be the file at `hooks/hooks.json`.
[Skills](https://code.claude.com/docs/en/skills) substitute `${CLAUDE_SKILL_DIR}`
and `${CLAUDE_PLUGIN_ROOT}` in skill text.

### 3. Codex CLI 0.154.0 source

Read at tag `rust-v0.154.0` (`36eab01`), the version installed on this machine.

- Manifest discovery: a root `plugin.json` is used only when it declares an
  Agent Plugins schema ([plugin_namespace.rs:42](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/utils/plugins/src/plugin_namespace.rs#L42)).
  Otherwise the first existing path in
  [protocol.rs:47](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/exec-server-protocol/src/protocol.rs#L47)
  wins: `.codex-plugin/plugin.json`, then `.claude-plugin/plugin.json`, then
  `.cursor-plugin/plugin.json`. With both Razor manifests present, Codex reads
  the Codex one.
- Hooks: manifest `hooks` entries when present, otherwise `hooks/hooks.json`
  ([loader.rs:1187](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core-plugins/src/loader.rs#L1187)),
  covered by `load_plugin_hooks_manifest_paths_replace_default_hooks_file`
  ([loader_tests.rs:686](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core-plugins/src/loader_tests.rs#L686)).
  The [hooks page](https://learn.chatgpt.com/docs/hooks) agrees. The
  plugin-creator sample
  [plugin-json-spec.md](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/plugin-creator/references/plugin-json-spec.md)
  says hooks are supplemented instead; the runtime and its test at the
  installed version say replaced.
- Codex also sets `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA` for
  compatibility (hooks page).
- SKILL.md frontmatter is a serde struct without `deny_unknown_fields`
  ([parser.rs:7](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/skills/src/parser.rs#L7)),
  so Claude-only keys should be ignored. Not exercised with Razor's skill.

### 4. Throwaway prototype

Built from `Codex` `6f424c3` in the ignored `.scratch/razor-unify-probe/unified`:
added Claude's `.claude-plugin/plugin.json`, placed Claude's hooks at
`hooks/hooks.json`, renamed Codex's to `hooks/codex-hooks.json` and declared
`"hooks": "./hooks/codex-hooks.json"` in `.codex-plugin/plugin.json`.

- `claude plugin validate` (Claude Code 2.1.271) passed with one warning,
  `No version specified`, which is expected while Foundry's marketplace entry
  owns the version. `--strict` fails on that warning alone.
- Test suite, Node 22.22.2 on Windows: the unmodified Codex tree passed 349/349.
  The prototype passed 348/349; the failure was
  [codex_runtime.test.js:159](https://github.com/V-Songbird/razor/blob/6f424c352aaed87afac090a8fd3e1aaa8e77bbf2/tests/codex_runtime.test.js#L159)
  reading Codex's launcher from `hooks/hooks.json`. Pointing it at
  `hooks/codex-hooks.json` gave 349/349.
- Location trap: the same trees run from a temp or `/scratchpad/` path fail 15
  file-meter tests, because `isExemptPath`
  ([file-meter.js:49](https://github.com/V-Songbird/razor/blob/6f424c352aaed87afac090a8fd3e1aaa8e77bbf2/hooks/file-meter.js#L49))
  exempts those paths. The counts above come from `.scratch/`.

Not established: live hook activation on either host, Codex's hook trust flow
after the change, and the unified skill on either host.

### 5. GitHub state

Razor's default branch is `Claude`. Ruleset `default` (`~DEFAULT_BRANCH`)
requires `test`; `platform-claude` and `platform-codex` require
`Platform layout`, `README contract` and `Runtime tests`. `main` currently
matches no ruleset.

## Proposed layout

```text
.claude-plugin/plugin.json   Claude manifest and userConfig
.codex-plugin/plugin.json    Codex manifest, interface, version, hooks -> ./hooks/codex-hooks.json
hooks/hooks.json             Claude registration (Codex skips it because of the manifest field)
hooks/codex-hooks.json       Codex registration -> hooks/codex-hook.js (RAZOR_HOST=codex)
hooks/*.js, hooks/lib/       one runtime
skills/unused/SKILL.md       one skill
tests/                       one suite: Claude contract goldens and Codex adapter tests
```

A single shared hook file is not recommended. Claude always loads
`hooks/hooks.json`, the two registrations use different command forms
(`command` with `args` versus a shell command with `commandWindows`), and a
shared file would require host detection from the payload, which the current
adapter design rules out. Two thin registration files keep one runtime.

## Decisions still open

- **Version source.** One version for both hosts. Codex requires semver in
  `.codex-plugin/plugin.json`; Claude reads `plugin.json` before the marketplace
  entry. Either keep Foundry's Claude entry as the Claude version and check it
  equals the Codex manifest at the pinned SHA, or put the same version in both
  plugin manifests and drop it from the Claude entry, reversing the current
  convention.
- **Product branch.** `main` is the natural home once it stops being a
  selector. That needs a default-branch change and moving the required checks.
- **Skill text.** Claude's `unused` skill uses `${CLAUDE_PLUGIN_ROOT}` and
  `when_to_use`, `argument-hint` and `allowed-tools`; Codex's resolves the
  script relative to `SKILL.md` because Codex does not substitute skill
  variables. One body must work on both and needs a functional check on each.

## What changes in Foundry for Razor

- A superseding ADR for Razor over ADR 0007 (branch isolation), 0008 (paired
  READMEs) and 0010 (main selector). The July porting specification's
  "do not make razor dual-hosted" boundary stays as history.
- Rules: `plugin-layout.md`, `main-front-pages.md`, `readme-parity.md` and
  `public-docs.md` need a Razor single-package case while Foreman and Hush
  keep their editions.
- Checks that assume two edition branches: `check-platform-layout`,
  `check-platform-marketplaces`, `check-readme-parity`,
  `check-readme-candidate`, `check-main-frontpage`, `build-main-readmes`,
  `check-maintenance-copies`, `check-shared-copies`, `verify-marketplace-pins`
  and `check-marketplace-sync`, with their tests.
- Marketplaces: `.claude-plugin/marketplace.json` (ref `Claude`) and
  `.agents/plugins/marketplace.json` (ref `Codex`) pin the same commit on the
  unified branch.

## Migration sequence

1. Owner decision and the superseding ADR.
2. Work branch from `Codex`: add Claude's manifest, hooks and rules; reconcile
   the skill, CI (keep the three-OS matrix, parse both manifests and both hook
   files) and docs (one README with host-specific install, commands and
   evidence; one CHANGELOG). Run the suite from a non-temp path.
3. Adapt Foundry's checks and rules for a single-branch Razor.
4. Functional checks on both hosts. Local installs and any model session need
   the owner's go.
5. Move the product branch, default branch and required checks; keep `Claude`
   and `Codex` read-only so previously pinned commits stay reachable.
6. Release one version and pin both marketplaces to the same commit.

## Risks

- Codex skips plugin hooks until the current definition is trusted. Moving the
  registration file changes that definition, so existing Codex users should
  expect a new review prompt. Not observed.
- Codex behaviour above is pinned to 0.154.0 source, and OpenAI's own sample
  reference disagrees with it. Re-check on Codex upgrades.
- Evidence stays attached to its host: Claude benchmark results remain Claude
  results, and Codex shows its own results or `Not measured`.
