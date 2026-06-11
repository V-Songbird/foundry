# Changelog

All notable changes to kairoi are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); alpha releases may introduce breaking changes in minor versions.

## [Unreleased]

## [1.0.7-alpha] — 2026-06-10

### Fixed

- **Windows backslash paths no longer bypass the hooks.** `guard-check.sh` and `state-write-guard.sh` assumed forward-slash separators in the hook payload's `cwd` and `file_path`; on Windows, tool inputs routinely arrive as `D:\proj\src\auth\token.ts`, which broke the cwd prefix-strip and the source_paths glob match (backslashes also act as escape characters in unquoted glob patterns). Both failure modes were fail-open with zero error: guards and orientation silently never fired, and a `Write` to `.kairoi\model\<mod>.json` sailed past the hand-edit deny. Both scripts now normalize `\` → `/` on `cwd` and `file_path` before any matching. New `tests/test_windows_paths.sh` covers backslash absolute/relative guard fires, backslash deny + allowlist on state-write-guard, and MultiEdit parity.
- `skills/kairoi/SKILL.md` and `skills/audit/SKILL.md` no longer instruct passing `name:` and `max_turns:` to the `Agent` tool — neither is a valid Agent parameter (both silently dropped by the harness; same cleanup as forge `af34e0a`). The kairoi skill also claimed `max_turns: 15` "matches kairoi-complete's own maxTurns frontmatter" — stale since 1.0.5 raised that frontmatter to 60. Both skills now state that the agent's `maxTurns:` frontmatter is the only effective turn-budget knob.
- Team-mode init no longer commits `.kairoi/.init-summary`. Init Step 8.5 claimed the file was "covered by the `.kairoi/.*` transient pattern set in Step 8," but Step 8's Team block listed nine individual dotfiles with no such pattern and no `.init-summary` entry — so Step 9's `git add .kairoi/` committed the scratch file. The Team block now writes the single `.kairoi/.*` pattern (matching what `docs/recovery.md` scenario 8 already documented), `doctor.sh` check 9 accepts the pattern as full transient coverage, and the legacy individual-entry check remains for pre-1.0.7 projects.
- Init Step 2 read the plugin version from `plugin.json`, which intentionally carries no `version` field (marketplace.json is the version authority — the same root cause as the 1.0.2 verbose-header fix). `build-adapter.json.kairoi_version` was written as null/unknown on every init. Step 2 now reads from `marketplace.json` with an `"unknown"` fallback, mirroring `session-boot.sh`.
- `agents/kairoi-audit.md`'s receipt template omitted `guards_disputed`, which `validate-schema.sh` requires on every receipt — audit receipts violated the documented schema. Added `"guards_disputed": []`.
- The installed `rules/kairoi.md` trust gate contradicted the plugin's own confidence model: it gated on `tasks_since_validation < 5` while every kairoi reader derives confidence from `churn_since_validation` (≤10 high / ≤25 medium) and state-files.md calls `tasks_since_validation` "informational only." The rule now states the churn-based gate.
- `sync-finalize.sh` errored with "unbound variable" on bash < 4.4 (macOS ships 3.2) when invoked as `--reflected ""` — the orphan-recovery path of all places — because `"${REFLECTED_ARR[@]}"` expansion of an empty array trips `set -u` on old bash. Guarded with the `${arr[@]+...}` idiom.
- `validate-schema.sh`'s jq-internal-error branch (exit 2) was unreachable: under `set -e`, a jq failure aborted the script at the capture assignment itself, masquerading as a validation failure (exit 1) with the diagnostic lost. The capture now uses `|| JQ_RC=$?`.

### Added

- **Legibility evidence loop** — the writing-stance rules now earn their keep like guards do. `kairoi-reflect-module` Step 5b records cases where a Claude-legibility issue measurably slowed or blocked one of the batch's tasks (`legibility_evidence: [{rule, file, note}]` in the result file; rule labels: `canonical-naming`, `locality`, `grep-anchor`, `idiom`, `verbosity`, `duplication`). `sync-finalize.sh` appends each observation to `.kairoi/legibility.jsonl` (module- and timestamp-stamped, receipts-style rotation) and counts it in the session summary. `kairoi-audit` Step 5b reports per-rule evidence counts — a rule with zero evidence over a long history is a removal candidate, same epistemics as a guard whose `confirmed` stays 0 — but never edits `.claude/rules/` itself. `/kairoi:lint`'s growth gate cites the log as its primary condition-2 evidence source. New `tests/test_legibility_evidence.sh`; doctor validates the new JSONL; Team-mode `.gitignore` lists it alongside receipts.
- Stale-trigger guard detection (mechanical, read-only). Guard triggers match by exact path / directory prefix, so a rename silently orphans the guard — it can never fire again, and nothing noticed until an audit happened to re-read the module. `sync-finalize.sh` now scans every module's guards each sync and surfaces guards whose every trigger path is missing from disk (in stdout and `.session-summary.txt`, with a `/kairoi:audit` pointer); `doctor.sh` performs the same check on demand. Neither removes the guard — re-pointing vs deletion is audit's judgment call. New `tests/test_stale_guard_triggers.sh`.
- `auto-buffer.sh` now gates in `git revert` and `git cherry-pick` — both author commits without the literal word "commit" in the command, so a plain `git revert <hash>` never reached buffer-append, making its revert-detection auto-promotion (Signal 3) unreachable from the automatic path. `git merge` is deliberately excluded: a fast-forward merge moves HEAD to a commit authored elsewhere, and buffering foreign work as a session task would poison reflection. Two new test stages in `tests/test_auto_buffer.sh`.
- `auto-buffer.sh` dedups against `receipts.jsonl` in addition to `buffer.jsonl`. After a sync drains the buffer, HEAD's entry lives only in receipts; a gate match that isn't a fresh commit (re-run command, false-positive match, `git -C <subdir> commit`) would previously re-buffer an already-reflected commit and double-reflect it.
- `session-boot.sh` rotates `.kairoi/session.log` (>500 lines → keep last 200). It was the only append-only file with no rotation — guard fires accumulated indefinitely.
- `guard-check.sh` now treats `MultiEdit` as write-class and `hooks.json` registers it for guard injection — previously MultiEdit was covered by the state-write deny but not by guards, so edits through it skipped Phase 2/3 entirely.

### Changed

- **`kairoi-writing.md` rewritten around "explicit within idiom."** The old framing ("flip away from human-readability conventions") licensed non-idiomatic code, which is counterproductive: idiom is what Claude's priors are calibrated to, so gratuitous deviations cost attention and invite wrong assumptions. The rewrite keeps the strongest rules (one canonical term per concept, typed state at boundaries, why-only comments), reframes verbosity as ambiguity-proportional rather than uniform ("`getUserByEmailAddress` earns its length only when `getUserById` also exists"), and adds three rules: locality (minimize files-to-answer-one-question; names the fragmentation risk of the 300-line lint threshold), grep-anchor error strings (stable literal prefixes so the runtime string exists in source), and the DRY tension (abstract only when copies must stay behaviorally in sync). The sole-developer premise is now explicitly a tie-breaker, not a license — the human still reads diffs. A closing bullet wires the rules to the new legibility evidence loop.
- **Solo is now kairoi's primary mode.** Init's mode prompt recommends Solo first ("kairoi's primary design target, where Claude is the sole developer"); README and plugin descriptions reposition accordingly. The `kairoi-writing.md` writing-stance rule now installs ONLY in Solo mode — its premise ("Claude is the sole developer; optimize for Claude's own re-reading, not human conventions") is flatly wrong for Team repos where humans read the code. Team mode still gets the state-ownership and command-routing rules. Mode is inferred from `.gitignore`, same rule as everywhere else. New Team-mode case in `tests/test_init_writes_rules.sh`.
- BLOCKED-module reflection now dispatches on **opus**. `kairoi-complete` Step 3 passes `model: "opus"` at the Agent call site for modules in `blocked_modules` (the override takes precedence over the agent's `sonnet` frontmatter); routine modules stay on sonnet. BLOCKED reflection is the highest-value learning in the system — the failure narrative becomes a guard that protects every future session — so it gets the strongest model.
- `buffer-append.sh` appends the buffer entry BEFORE auto-running tests, then upgrades the entry in place (re-validated, tail-line identity-checked) once results exist. Previously the entry was only built after the test run, so a hook-timeout kill mid-suite silently lost the commit from the buffer entirely; now a timeout costs only the test data — the entry survives with `test_results: null`. Signal 1 (test-failure BLOCKED promotion) moves to the upgrade phase; Signals 2–3 (test-disablement, revert) still apply pre-append. New `tests/test_buffer_survives_test_timeout.sh` (kill mid-run → entry survives; fast run → entry upgraded in place).
- `hooks/hooks.json` auto-buffer timeout raised 60 → 300 seconds. `buffer-append.sh` runs the project's full test suite synchronously inside that hook; a suite over the budget got the hook killed mid-run (before the entry-first reorder above, that meant the commit was silently never buffered). The constraint is now documented in `skills/init/schemas/state-files.md` with guidance to point `test` at a fast subset when the suite can't reliably finish inside the budget.

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
