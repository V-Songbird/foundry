# Changelog

All notable changes to hush are documented here. Hush is a monorepo-folder
plugin — its version is owned by `.claude-plugin/marketplace.json` at the
repo root, not by `hush/.claude-plugin/plugin.json` (which carries no
version field by convention).

## 0.2.5-alpha — 2026-07-06

Word economy sharpened from a self-check alone to a default-to-fragments rule with concrete before/after examples, e.g. `"Bug: auth middleware, expiry check used < not <=."` instead of `"I found that the bug is in the auth middleware, where..."`. Deliberately bounded — dev-shorthand density, not caveman-speak: grammar stays correct where present, technical terms stay exact, nothing invented or abbreviated beyond recognition.

Validated via `.benchmarks/` before shipping, not by inspection alone. A 3-rep spot check was inconclusive (baseline and caveman, unchanged, swung ±3-8% on their own — noise, not signal). Re-ran at 8 reps on the two pure-Q&A tasks to get past that noise floor: hush's own output tokens on `explain-rerender` dropped 719→560 (-22%) and on `explain-rebase` 632→569 (-10%) versus the prior wording. Net result against caveman is split, not a clean sweep — hush now edges caveman on `explain-rerender` (560 vs 591, a real if modest margin) but caveman still clearly leads `explain-rebase` (449 vs 569, ~27% gap, well outside noise). Shipped anyway: a real, repeatable drop in hush's own output with no readability regression (final answers checked directly — still complete, professional sentences) is worth keeping even where it doesn't fully close the gap.

## 0.2.4-alpha — 2026-07-06

Fix: `capLines` did a blind head+tail slice, so a build warning that happened to fall outside that window got cut along with the surrounding noise. Found via `.benchmarks/`: on a task asking for every build warning, the agent couldn't see the ones the cap clipped, so it re-ran the build repeatedly hunting for them — the cap destroying signal cost far more tool calls than it ever saved (measured: +284% cost, +311% context traffic on that task versus doing nothing). Lines matching a warning/error/failure/deprecation pattern now survive the cap regardless of position — only surrounding noise gets cut, same principle already applied to whole failing runs, extended to individual lines within a passing one. Same task after the fix: −45% cost, −16% traffic versus baseline, turns back down from 9 to 2. 42 tests (was 40).

## 0.2.3-alpha — 2026-07-06

Fix: `resolveCarriageReturns` treated `\r\n` (an ordinary Windows line ending) as a progress-bar redraw signal, blanking every CRLF-terminated line down to nothing and keeping only whatever survived after the last bare `\r`. Since native Windows console output (PowerShell, `Get-ChildItem`, `dir`, …) is CRLF throughout, this silently collapsed almost all passing multi-line Windows tool output to its last line — found via a `.benchmarks/` eval where a 5-file `Get-ChildItem` listing reached the model as just the alphabetically-last file, and the agent correctly reported a "single-file repo" from what it could actually see. Now normalizes `\r\n` to `\n` before resolving genuine mid-line `\r` redraws. Added regression coverage for CRLF-terminated and mixed CRLF+redraw input. 40 tests (was 38).

Also added a "Word economy" + "Thoroughness is not negotiable" pairing to the output style: a self-check ("can I cut a word without losing a fact?") for prose density, paired explicitly with a rule that the cut applies to wording, never to how much the agent investigates before answering — closing the same gap from the wording side, in case a future compression-hook edge case recurs elsewhere.

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
