# Changelog

All notable changes to hush are documented here. Hush is a monorepo-folder
plugin — its version is owned by `.claude-plugin/marketplace.json` at the
repo root, not by `hush/.claude-plugin/plugin.json` (which carries no
version field by convention).

## 0.2.2-alpha — 2026-07-05

`HUSH_NARRATION=off` disables the narration meter alone (mirrors razor's `RAZOR_LEDGER=off`). Previously the only options were `HUSH_DISABLE=1` (kills compression too) or an absurd `HUSH_NARRATION_BUDGET` (workaround — `0` is a valid budget, so the budget knob can't mean "off"). 38 tests (was 37).

## 0.2.1-alpha — 2026-07-05

Fix: the Stop-mode correction re-fired on every consecutive Stop within the same logical turn. Observed live in a ScheduleWakeup continuation chain: four consecutive Stops with growing counts (420 → 455 → 471 words), each fire injecting `additionalContext` that forced another assistant reply whose words re-counted into the same turn — a feedback loop. Cause: only the mid-turn (PostToolUse) path wrote the once-per-turn dedup state; Stop fires never marked the turn. Now any fire, mid-turn or Stop, writes the state. 37 tests (was 36).

## 0.2.0-alpha — 2026-07-05

Mid-turn narration meter. Motivated by a real transcript (foreman-dispatched FBI migration task): ~22 narration blocks, ≈250 words, all inside one turn — and the Stop-only meter couldn't intervene until the turn ended, so the first offending turn always got through uncorrected.

- `narration-meter.js` is now dual-mode, registered on both `PostToolUse` and `Stop` (mode from `hook_event_name`). Mid-turn mode counts every text block so far (no deliverable exists yet) and injects the corrective line the moment the budget is crossed — inside the offending turn.
- Once-per-turn dedup via a state file in the OS temp dir keyed by `session_id`; the turn is identified by the last real user prompt's `uuid`. Stop mode skips turns the mid-turn fire already corrected; a new human prompt re-arms the meter.
- Transcript reads are now a 1MB tail window instead of a full streaming read — the hook runs on every tool call, so cost had to stay flat as sessions grow. A single turn larger than 1MB undercounts (delays the fire), documented ceiling.
- 36 tests (was 28).

## 0.1.1-alpha — 2026-07-05

Fix: `narration-meter.js`'s turn-boundary detection (`isRealUserPrompt`) treated harness-injected continuations — background Task-tool notifications (`origin.kind: "task-notification"`) and `ScheduleWakeup` firings (`isMeta: true`) — as fresh user turns. Each one reset the narration accumulator, so a chain of short status pings after consecutive background-task completions never tripped the word budget (each ping was a lone block in its own synthetic "turn," exempted as the deliverable). Now only `origin.kind === "human"` entries count as turn boundaries; the whole notification chain is measured as one turn. Added a matching line to `output-styles/hush.md` telling the model directly that a chain of notifications without new human input is one unit of work, not one per notification.

## 0.1.0-alpha — 2026-07-05

Initial release.

- Forced output style (`force-for-plugin: true`, `keep-coding-instructions: true`): silent mid-turn, outcome-first final message, full fidelity for code/errors/security.
- `PostToolUse` hook `compress-tool-output.js`: deterministic Bash/PowerShell output compression via `updatedToolOutput` — ANSI strip, `\r` resolution, consecutive-duplicate collapse, line caps (60 passing / 250 failing, tunable).
- `Stop` hook `narration-meter.js`: counts mid-turn narration words per turn, injects one corrective line only over budget (default 120 words).
- Env knobs: `HUSH_CAP_PASS`, `HUSH_CAP_FAIL`, `HUSH_NARRATION_BUDGET`, `HUSH_DISABLE`.
- 26 tests (node:test).
