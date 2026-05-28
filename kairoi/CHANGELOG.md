# Changelog

All notable changes to kairoi are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); alpha releases may introduce breaking changes in minor versions.

## [Unreleased]

## [1.0.6-alpha] — 2026-05-27

### Fixed

- `buffer-append.sh` no longer classifies infrastructure failures of the test harness as real test failures. Previously, when an attached IDE held the gradle test-sandbox jar memory-mapped, `./gradlew test` died in `:prepareTestSandbox` with `FileSystemException: ... user-mapped section open` but still emitted "N tests completed, N failed" in its summary — which the parser captured as a real regression, auto-promoting every commit in the affected session range (8+ commits across one release range; metadata-only commits included, where tests cannot fail by construction) to BLOCKED with `{"total":N,"passed":0,"failed":N,"raw_exit":1}`. The fix scans the auto-run output for the gradle/IntelliJ signature BEFORE counting tests; on match, `test_results` is written with zero counts plus `infrastructure_blocked: true` and a `parse_note` describing the cause, the SUCCESS→BLOCKED auto-promotion is skipped (the harness never ran, so a non-zero exit reflects the environment, not the code), and the user-facing notice degrades from the "TESTS FAILING" alarm to a softer "test results not captured" line.

### Added

- `build-adapter.json.test_infrastructure_blocked_patterns` (optional array of egrep regexes). Lets projects extend infrastructure-blocked detection to environmental failures the built-in patterns don't cover — CI runner OOMs, docker daemon outages, missing fixtures, etc. — so the harness surfaces them without conflating them with code regressions. Built-in gradle/IntelliJ patterns remain active unconditionally.
- `tests/test_infrastructure_blocked.sh`: 4 cases — gradle FileSystemException, `:prepareTestSandbox FAILED` task-name fallback, custom regex via `test_infrastructure_blocked_patterns`, and a regression guard that real test failures still auto-promote to BLOCKED.

## [1.0.5-alpha] — 2026-05-21

### Fixed

- `kairoi-complete` agent `maxTurns` raised from 30 to 60. The 1.0.3 rewrite added a STOP CONDITION callout and a "skip Step 5 if turn budget is tight" escape hatch on the assumption that 30 turns sufficed for the deterministic Step 1→6 pipeline. Real workloads disproved this: a 13-task buffer spanning 8–10 modules truncated the agent at Step 4 (collect results) on three consecutive dispatches in one session, never reaching `sync-finalize.sh`. Step 4's per-module result-file reads scale linearly with module count and consume the budget the escape hatch was meant to protect. 60 doubles the ceiling without removing the safety bound; the Step 5 skip remains in place as a secondary guard.

## [1.0.4-alpha] — 2026-05-08

### Fixed

- Frontmatter compliance pass on all 6 skills (`audit`, `doctor`, `kairoi`, `lint`, `show`, `init`): split trigger phrases out of `description` into a `when_to_use` field so the trigger surface is discoverable in the skill listing, added scoped `allowed-tools` declarations covering each skill's directive tool invocations to suppress per-invocation permission prompts, and added `disable-model-invocation: true` to `audit` (which mutates model files via the dispatched subagent). `lint` now also declares `arguments: [module-name]` to back its `argument-hint`. No behavioral change to skill content or workflow.

## [1.0.3-alpha] — 2026-05-07

### Fixed

- `kairoi-complete` agent now reliably runs `sync-finalize.sh` as its terminal step. Previously the agent would complete per-module reflection (Step 3) and exit before reaching Step 6, leaving the buffer permanently undrained — every subsequent commit re-fired the threshold signal and re-dispatched the agent against an ever-growing backlog. Three independent reproductions in one session, with `buffer.jsonl` line counts climbing while `receipts.jsonl` stayed unchanged. The fix restructures `agents/kairoi-complete.md`: a STOP CONDITION callout opens the body and explicitly forbids the agent from exiting until the `kairoi sync-finalize: <N> receipt(s) emitted` stdout line is in tool output; Step 5 (Self-Verify) is now best-effort and explicitly skippable when turn budget is tight; Step 6 (Finalize) carries a MANDATORY label and stdout-verification text; Step 7 derives its output from finalize's stdout (so omitting Step 6 makes Step 7 unproducible).

### Added

- Defense-in-depth orphan detection. `sync-prepare.sh` now writes a `.kairoi/.sync-pending` sentinel containing `started_at`, `task_count`, and `module_count`. `sync-finalize.sh` removes the sentinel as part of its cleanup pass — its absence is the load-bearing signal that finalize ran cleanly. `session-boot.sh` detects orphaned sentinels (older than 10 minutes, since real syncs finish in 60–180 seconds) and surfaces a `sync-finalize.sh --reflected <surviving-modules>` recovery instruction. The threshold-based `kairoi-complete` dispatch is suppressed when an orphan is present, since redispatching would re-run sync-prepare and overwrite the in-progress manifest.
- `docs/recovery.md` scenario 7: "The buffer isn't draining after a sync (orphaned sync-pending)" — manual recovery steps for users who need to drain a wedged sync without starting a fresh session.
- `tests/test_session_boot_banner.sh`: 3 new orphan-detection cases (stale sentinel surfaces recovery + suppresses dispatch; missing reflect-results uses `--reflected ""` form; fresh sentinel under 10 minutes does NOT false-positive).
- `tests/test_overrides_enforcement.sh`: assertions that `sync-prepare.sh` writes the sentinel with required fields and `sync-finalize.sh` removes it.

### Changed

- `doctor.sh` and the Team-mode `.gitignore` template (`skills/init/SKILL.md`) now list `.kairoi/.sync-pending` alongside the other transient files.

## [1.0.2-alpha] — 2026-05-02

### Fixed

- Verbose header (`KAIROI_VERBOSE=1`) now reads the plugin version from `marketplace.json` instead of `plugin.json`. `plugin.json` intentionally carries no `version` field (marketplace.json is the version authority); the old lookup always fell back to `"unknown"`, producing `=== kairoi vunknown ===`.

## [1.0.1-alpha] — 2026-05-02

### Fixed

- `state-write-guard.sh` now bypasses the hand-edit denial for subagent calls. The guard previously relied on PreToolUse hooks not firing inside subagents (Claude Code issue #34692); that assumption no longer holds — hooks now fire for subagent tool calls with `agent_id` present in the payload. Without this fix, `kairoi-reflect-module` and `kairoi-audit` would be denied when writing model files to `.kairoi/` during automated sync. The fix mirrors the same `agent_id` check used by jetbrains-router: if `agent_id` is present, the write is from kairoi's own machinery and is allowed through unconditionally.

### Added

- `tests/test_state_write_guard.sh` Case I: 4 test cases covering the subagent bypass — Write/Edit to `.kairoi/model/*.json` and `.kairoi/.reflect-result-*.json` from a subagent (agent_id present) pass through, and main-session writes to the same paths remain denied.

## [1.0.0-alpha] — 2026-04-29

### Added

- Edit-time guard system: pre-flight checks run before Claude edits trigger-matched files, surfacing known constraints before changes land
- Automatic commit capture and session sync via `sync-prepare` / `sync-finalize` scripts; manifest tracks tasks, files modified, guards fired, and test results per module
- Module reflection (`kairoi-reflect-module` subagent): updates purpose, entry points, known patterns, negative invariants, change archetypes, and dependencies after each session
- Cross-module guard awareness: guards for interface-level constraints automatically extend to dependent modules via `_index.json` semantic edges
- Churn confidence scoring on guards (confirmed / disputed counts; suspect threshold detection)
- Negative invariants on module models: absence claims that grant permission to skip audit work
- Change archetypes: recurring change patterns accumulated per module and injected at orientation
- `/kairoi:lint` skill: observation-only report on source patterns that increase Claude's re-reading cost — star imports, files over 300 lines, source files with no matching test; grounded in Claude's introspective knowledge of its own cognitive cost, not style-guide consensus
- `/kairoi:init` skill: seeds a project's `.kairoi/` state directory, writes initial rules and schemas
- `/kairoi:audit` skill: manual inspection of the current session's guards, disputes, and task coverage
- `/kairoi:show` skill: displays the current module model in readable form
- `/kairoi:doctor` skill: diagnoses stale state, schema drift, and hook configuration issues
- `kairoi-complete` orchestrator agent: hook-triggered post-session reflection and sync dispatch
- `kairoi-audit` subagent: targeted module-state audit without full sync
- Session boot banner via `session-boot.sh` hook; surfaces orientation summary at session start
- Automatic buffer tracking (`auto-buffer.sh`): appends file-write receipts to the session buffer for audit coverage
- `state-write-guard.sh`: mechanical gate preventing state file writes outside designated paths
- `validate-schema.sh`: schema conformance check for module model JSON
- `hooks/hooks.json`: PreToolUse, PostToolUse, and SessionStart hooks wiring the full lifecycle
- `docs/recovery.md`: scenario-driven troubleshooting guide for common failure modes
- Test suite: 22 tests covering guard evaluation, buffer receipts, session boot, schema validation, and sync lifecycle
