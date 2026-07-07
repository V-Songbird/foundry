# Changelog

All notable changes to hush are documented here. Hush is a monorepo-folder
plugin — its version is owned by `.claude-plugin/marketplace.json` at the
repo root, not by `hush/.claude-plugin/plugin.json` (which carries no
version field by convention).

## 0.3.4-alpha — 2026-07-07

Enumeration carve-out — and a correction: **0.3.3 did not resolve the Sonnet noisy-build regression.** The 0.3.3 "safe to showcase" verdict below was drawn from a lucky 6/6-clean sample. A clean 3-arm n=6 Sonnet re-run on live 0.3.3 (tag `h2-sonnet6`) showed the hush noisy-build cell is **bimodal**, not fixed: 3/6 clean (~70k traffic, ~11s, 2 turns) and 3/6 blown up (~217k traffic, 29–42s, 976–1593 output tokens, ~32 words of mid-turn narration as the re-verify fires). A ~50/50 coin flip. The self-certifying markers *halved* the distrust; they did not remove it — on a completeness task ("report EVERY warning") a capable model still can't audit a promise it can't see the whole of, so it re-runs the build to a file and greps it, and each extra turn re-sends full context.

The fix attacks the root: on a prompt that explicitly asks to enumerate EVERY / ALL / EACH of some countable thing (warnings, errors, files, items, …), the compression hook now passes the log **uncapped** (`HUSH_CAP_ENUMERATE`, default 2000 lines) — it still strips ANSI, resolves `\r`, and collapses consecutive duplicates, but elides nothing, so there is nothing left to distrust. The turn's real human prompt is read from the transcript tail (the same `origin.kind`/`isMeta` turn-boundary logic the narration meter uses, now extracted to a shared `hooks/lib/transcript.js`); harness-injected continuations don't count. Detection requires a completeness quantifier (or the verbs `list`/`enumerate`) *next to* a countable noun, so ordinary prose ("explore the whole repo") doesn't disable compression wholesale.

Validated by re-running, not by hoping — and judged on the **per-rep spread**, since the whole point is that the mean hid a bimodal distribution:

- **Sonnet noisy-build, n=6 (the target):** the blow-up is gone. hush is dead-flat at 83,833–83,863 context traffic (a 30-token spread across all 6 reps), 2 turns every rep, 0 mid-turn narration, 6/6 correct — the tightest and lowest-traffic arm, −14% vs baseline (which is itself bimodal, re-verifying ~half the time). No ~200k outliers remain.
- **Haiku noisy-build, n=6 (guard against regressing the home-turf win):** still a win — hush dead-flat 62,455–62,470, 2 turns, 6/6, −23% traffic / −2.5% cost vs baseline. Honest change: the old "−90% tool-output chars" headline is gone on this task, because the carve-out now passes the whole log (28,304 chars) instead of a 60-line slice — parity with baseline's raw 29,756, and still leaner than it because dupes/ANSI are stripped. The win is now consistency-driven (hush never triggers the re-verify blow-up that hits baseline 2/6) rather than char-compression. Compression still cuts ~90% on noisy output you *haven't* asked to fully enumerate.
- **Sonnet log-triage + repo-summary, n=4 (no collateral damage):** 100% correct, carve-out correctly inert (neither prompt enumerates), compression demonstrably still firing (hush tool chars 11–13k vs baseline 60k on the greppable reps). The remaining spread is task-inherent exploration variance present across every arm (caveman spikes too), not a hush effect.

76 tests (was 61): new `hooks/lib/transcript.js` + `requestsEnumeration`, with unit and transcript-driven end-to-end coverage; the narration meter now imports the shared turn-boundary logic instead of duplicating it. Methodological note for the record: even n=6 misleads when the underlying distribution is bimodal — read the per-rep spread, not just the mean. This is the third time in this plugin's history that a small sample read variance as signal (or signal as variance); the rule now is per-rep inspection on any noisy-build-shaped task.

## 0.3.3-alpha — 2026-07-07

Self-certifying omission markers. A bare `[hush: N lines omitted]` reads to the model as "signal might be hidden here." On a completeness task ("report EVERY warning") that distrust is rational — the model can't know `capLines` preserved every warning line — so it re-runs the command to recover what it thinks it's missing, and each extra turn re-sends full context, defeating the compression. But `capLines` keeps every `SIGNAL_RE` match by construction, so an omitted span *provably* contains no warning/error/failure line. The marker now states that guarantee: `[hush: 354 lines omitted, none with warnings/errors/failures]`. Honest (true by construction), mechanical, and local — no blanket output-style "trust me" claim. 61 tests (was 60).

Found via `.benchmarks/`, not guessing. Trigger: a reported Sonnet noisy-build regression (h2-sonnet, n=2: traffic +143%, turns 2→5.5). The raw hush-arm transcript was the smoking gun — the model wrote *"The terminal output was elided in places; let me capture the full raw log to confirm no warnings were hidden,"* then re-ran the build to a file and grepped it. A controlled 6-rep re-run (baseline vs unfixed-snapshot vs fixed) showed two things: (1) the dramatic +143% figure was largely n=2 bad luck — at n=6 even the *unfixed* hush was −20% traffic / −40% cost vs baseline, with the re-verify path firing only ~1/6 runs (baseline itself hit it ~2/6, so noisy-build is a high-variance task across all arms, not a hush artifact); (2) the distrust mechanism is nonetheless real, and the fix removes it — fixed hush ran 2.0 turns flat across all 6 reps (unfixed 2.2, one re-verify tail), dead-flat 70k traffic (tightest of any arm), output tokens −24% vs baseline / −36% vs unfixed, cheapest arm. Same failure family as the 0.2.4 Haiku noisy-build bug; the warning-survival fix held on Haiku but Sonnet's higher completeness bar needed the guarantee stated, not just met. Methodological note: n=2 read as a hard regression what n=6 showed was variance-plus-a-real-but-mild-effect — the Haiku "n<8 risks reading noise as signal" lesson applies to Sonnet too.

## 0.3.2-alpha — 2026-07-06

Word economy: added a named "contextual pruning" rule (drop the problem statement when the cause implies it), an explicit whitelist of standard dev shorthand (obj, ref, var, cmd, pkg, arg, msg, config, repo, env, param), and a micro-operators line (symbols for comparisons/results, short words for logic). Sourced from the user's own hand-compressed examples rather than invented — reconciled against Register's "no invented shorthand" line, which now points at the whitelist instead of contradicting it. Not yet re-validated via `.benchmarks/`; prior wording's measured gains (0.2.5-alpha) are not guaranteed to carry over.

## 0.3.1-alpha — 2026-07-06

Fix: the pass-cap (60 lines) assumed a clean exit meant "log noise, safe to trim" — true for build/test output, false for a command that just prints a whole file (`cat`/`type`/`Get-Content` with no pipe/chain/redirect). Source text has no `WARN`/`ERROR` markers for `capLines`' signal-preservation to anchor on, so the head+tail cap could cut arbitrary lines out of the middle of a file instead of out of actual noise — a real risk surfaced by a session where an unrelated tool-routing bug forced file reads through plain Bash instead of the `Read` tool. Plain file-dump commands are now detected and treated like a failing run (250-line cap) instead of a passing one. 60 tests (was 56).

## 0.3.0-alpha — 2026-07-06

New skill: `/hush:hush-compress <path>` shrinks a CLAUDE.md/memory file into hush's own dev-shorthand voice (the existing output style's word economy, not caveman-speak) so every future session that loads it pays fewer input tokens.

Motivated by a real incident: caveman's equivalent skill deleted a user's CLAUDE.md completely. Read caveman's actual implementation (`compress.py`) to find the real cause rather than guessing — it's fairly defensive on paper (backup + readback verification + validate/retry/restore-on-failure), but every write in that flow is a truncate-then-write, not atomic; an interruption between truncate and write completing at any of several write sites leaves the file empty regardless of how much validation logic sits on top. Hush's version sidesteps the entire failure class rather than hardening around it: it never writes to the original file in any code path. Output goes to a sibling file (`CLAUDE.md` → `CLAUDE.hush.md`) for manual review and swap-in. No subprocess, no API key, no second LLM call either — the skill just has the current session compress the file itself, the way every other skill in this monorepo works.

`hush/scripts/verify-compression.js` (new, plain Node, no deps) mechanically checks headings, code blocks, URLs, paths, and inline-code spans all survive the compression — reusing the checks caveman's own `validate.py` proved out, reimplemented rather than copied. 14 new tests (56 total).

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
