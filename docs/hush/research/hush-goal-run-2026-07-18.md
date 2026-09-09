# hush /goal run — best-in-class push, 2026-07-18

**Status:** HISTORICAL — banner added 2026-08-18. This ran against hush
0.8.0-alpha and its numbers were superseded by every benchmark batch since; the
suite it measured no longer exists. Two of the surfaces it credits were deleted in
hush 1.0.0 (roadmap entries 210–217): `/hush:stats` and the MCP-exec path. Read it
for the campaign method and the honest-loss discipline, not for a live claim or a
next step. The current account of hush's open work is
`hush-consolidation-2026-08-18.md`.

Scope (user-confirmed via grill): win = head-to-head vs runnable rivals on the benchmark
corpus with zero correctness/quality regressions; ideas from the existing 19-repo corpus
first (port entries 056-062 unlocked); batches pre-authorized to $50 with a running spend
log; ship behind opt-in-style env gates; **nothing committed/pushed/released until the
user's explicit go**. Baseline: hush 0.8.0-alpha (627d5b2), 312 tests.

## 1. Free corpus probes (no API spend)

### 1a. Tool-result mass by tool (60-day window, 7,643 transcripts, 211.1 MB)

| tool | n | MB | share | p90 | >=15k | hush-marked |
|---|---|---|---|---|---|---|
| Read | 26,204 | 140.4 | 66.5% | 13.7k | 2,407 | 960 |
| Bash | 23,871 | 33.1 | 15.7% | 3.2k | 248 | 4,790 |
| MCP:idea | 5,520 | 10.6 | 5.0% | 5.9k | 151 | 2 |
| PowerShell | 5,758 | 6.6 | 3.1% | 1.9k | 92 | 880 |
| Grep | 5,792 | 6.4 | 3.0% | 2.9k | 25 | 19 |
| WebFetch | 693 | 3.4 | 1.6% | 19k | 105 | 0 |
| Agent | 870 | 3.2 | 1.5% | 12k | 38 | 5 |

Read dominance is source files — untouchable by the byte-exact contract (re-confirmed:
MCP file-read methods = 6.62 MB, only 242 chars log/generated-shaped). The harvestable
remainder was Grep, the uncovered MCP exec methods, and (in theory) WebFetch.

### 1b. Verdicts on candidate levers

- **Grep coverage — BUILD.** Offline replay of 400 real >=4KB Grep payloads (3.09 MB)
  through hush's primitives: full compress() saves 22.9%; dedupe+collapse alone only 2.3%
  (the cap does the work, so a Grep-shaped design was needed, not plain capLines).
- **MCP read_file/get_file_text_by_path — DEAD.** All source paths; contract forbids.
- **MCP execute_run_configuration — BUILD (small).** 271KB/60d; payload is one JSON blob
  `{exitCode, output}`; existing compress() applies to the inner text with the real
  exitCode driving CAP_FAIL. compress() on the raw blob saved 0% (single JSON line).
- **WebFetch dedup — DEAD.** Same-session repeat fetches: 42 repeats / 0.07 MB. The 96
  repeat-URLs seen earlier were cross-session. No lever.
- **Read re-read dedup (unchanged files) — DEAD, 6th refutation.** Prior probe: 64
  unchanged full re-reads out of 3,619 reads (~1.8%). Consistent with the five prior
  dedup refutations; do not revisit without new evidence.
- **Read of host-persisted tool-results files — WATCHLIST, not built.** Model reads
  `.claude/projects/<s>/tool-results/*.txt` to recover full content it deliberately went
  for; capping that re-triggers the distrust loop. The Grep fix removes the main cause
  (oversized Grep results no longer trip host persistence).

## 2. What was built (uncommitted, hush working tree)

1. **Grep match-list compression** (`compressGrep`, WATCHED_TOOLS + hooks.json matcher).
   Content-mode results >=4KB (HUSH_GREP_MIN): each matched file keeps its first 3 match
   lines (HUSH_GREP_KEEP); SIGNAL_RE lines and prompt-named (relevance) lines always
   survive; the rest collapse to per-file `path: N matches, K shown` count lines plus a
   provenance marker that invites re-running narrower. Two rg line formats handled —
   `path:line:` (dir search) and bare `line:` (single-file search), majority-vote decided
   once per result; single-file label from tool_input.path/filenames. Relevance tokens
   get capLines' RELEVANCE_COMMON too-common guard — without it the quoted search pattern
   itself (present in every match line by definition) exempted the whole result
   (found live in smoke #1). Pass-through: files_with_matches/count modes, -A/-B/-C or
   multiline searches (context would be orphaned), enumeration prompts, <4KB, HUSH_GREP=off.
2. **MCP exec-output compression** (`compressMcpExec`, matcher + HUSH_MCP_EXEC=off).
   JetBrains execute_run_configuration / execute_terminal_command JSON blobs: inner
   `output` string compressed exactly like shell output (exitCode-aware caps, dedupe,
   signal survival), re-embedded in the same JSON + arrival shape (string vs bare array).

Tests 312 → 325, all green. Live Haiku smokes: Grep payload shape + updatedToolOutput
rewrite verified end-to-end (sentinel probe), then real single-file grep: 21,921 bytes →
3 match lines + marker, model quoted the marker verbatim and reported correctly. Also
kills the secondary cost: pre-fix that same result tripped Claude Code's native
persisted-output pointer and the model re-Read the full 21,969-byte file; post-fix the
result is small enough that the pointer never appears.

CHANGELOG Unreleased entries staged (user-facing voice, no methodology).

## 3. Rival runnability matrix (Windows, this machine)

| rival | mechanism layer | runnable as arm? |
|---|---|---|
| caveman | output-style brevity | YES (proven --rival-dir arm) |
| RDXmin | persona + PostToolUse elision | YES (commandWindows on every hook; smoke-verified RDX MODE ACTIVE + elision marker in a live Haiku run) |
| squeez | Rust binary + hook compressor | NO — hooks are bash scripts wired by install.sh, python3 required, no Windows command path; cannot install on Windows |
| token-optimizer (alexgreensh) | Python deny/diff | NO — every hook command is a POSIX `for b in bash ...` launcher with no commandWindows; on Windows it either fails or silently no-ops (an arm would measure nothing) |
| clauditor | rotation/blocking | NO — its PostToolUse throws on current CC's object tool_response; its "compression" computes then discards (adds tokens) |
| headroom / gcf / context-mode | proxy / wire-format / MCP sandbox | different layer, not hook-plugin class |

Head-to-head therefore = baseline / hush / caveman / RDXmin. The two mechanism-class
rivals that ship cross-host (squeez, token-optimizer) do not survive contact with a
Windows machine; hush ships commandWindows on all five hooks. That platform note is a
legitimate differentiator (keep names out of public docs per house rule).

## 4. Head-to-head batches

- Harness: private `.scratch/` (config-driven arms). Added `rdxmin` arm
  (RDX_UPDATE_CHECK=0, default mode full = its own default); removed stale `hushold`.
- incident-followup turn 3 reworded to answer-in-chat (known Haiku fixture trap,
  same fix shape as repo-onboarding's in 0.6.2).
- Screen: tag `h2h-haiku` — 4 arms x 7 tasks (explain-rerender, log-triage, noisy-build,
  checkout-bug, bugfix-expiry, incident-followup, repo-onboarding) x n=4, Haiku.
  **DONE: 112/112 ground truth, $6.69.**

### h2h-haiku results (mean cost USD, n=4)

| task | baseline | hush | caveman | rdxmin |
|---|---|---|---|---|
| bugfix-expiry | 0.0394 | 0.0432 | **0.0385** | 0.0408 |
| checkout-bug | **0.0669** | 0.0855 | 0.0713 | 0.0980 |
| explain-rerender | **0.0183** | 0.0297 | 0.0194 | 0.0212 |
| incident-followup | 0.1245 | **0.0529** | 0.1261 | 0.1338 |
| log-triage | 0.0746 | **0.0300** | 0.0756 | 0.0781 |
| noisy-build | **0.0420** | 0.0555 | 0.0437 | 0.0461 |
| repo-onboarding | 0.0557 | **0.0517** | 0.0521 | 0.0571 |
| **suite total** | 0.4213 | **0.3485** | 0.4267 | 0.4750 |

hush = only arm cheaper than baseline overall: **−17.3% vs baseline, −18.3% vs caveman,
−26.6% vs rdxmin**. Narration: hush 0 words on 6/7 tasks (baseline up to 154).
Per-rep spread on the losing cells (the standing bimodality rule):
- checkout-bug hush [0.062, 0.085, 0.134, 0.061] — one hint-spiral outlier rep (152w
  narration); 2/4 reps at baseline level. Task-inherent variance, not a stable loss.
- explain-rerender hush [0.051, 0.022×3] — one outlier; steady state = the known ~+20%
  1-turn Q&A style-overhead tax (absolute $0.004).
- noisy-build hush flat 0.055×4 vs baseline flat 0.042 — the known CC >29KB
  host-truncation zone (traffic 86K vs 54K, native-file re-read). Inherent, documented.
- bugfix-expiry +10% flat — short-task style overhead; caveman's home-turf win shape.

Verdict: no new defect; losses are the two disclosed inherent classes + bimodal variance.
No pre-Sonnet fix warranted (checkout-bug wording is a calibrated surface — 0.3.6 lesson).

### h2h-sonnet confirm (mean cost USD, n=4, $22.68)

| task | baseline | hush | caveman | rdxmin |
|---|---|---|---|---|
| bugfix-expiry | 0.1227 | 0.1415 | 0.1168† | 0.1559 |
| checkout-bug | 0.2233 | **0.1665** | 0.2349 | 0.2185 |
| explain-rerender | 0.1523 | 0.1071 | **0.0687** | 0.0743 |
| incident-followup | 0.4513 | **0.2432** | 0.3934 | 0.3943 |
| log-triage | 0.2865 | **0.1336** | 0.2889 | 0.2883 |
| noisy-build | **0.1506** | 0.1953 | 0.1716 | 0.1810 |
| repo-onboarding | 0.1807 | 0.1919 | **0.1628** | 0.1739 |
| **suite total** | 1.5675 | **1.1790** | 1.4370 | 1.4861 |

† caveman's bugfix-expiry mean includes its ONE ground-truth FAIL (r3, $0.065 —
cheap because it broke the tests). Over passing reps only: caveman $0.134 vs hush $0.141.

**Ground truth: hush 56/56 across both models. The suite's only miss anywhere was
caveman's.** Narration: hush quietest arm on every narrating task (checkout-bug 6 vs
baseline 41 words). Aggregate cost: **hush −24.8% vs baseline (reproduces the published
−25% almost exactly), −18.0% vs caveman, −20.7% vs rdxmin** — the only arm cheaper than
no-plugin on both models.

Per-rep spread on Sonnet losses: noisy-build consistent +30% (the documented >29KB
host-truncation zone); repo-onboarding small real loss to caveman (0.17-0.21 vs
0.155-0.171); explain-rerender steady-state 0.077 vs caveman 0.068 (Q&A brevity is its
home turf; hush now beats BASELINE there); bugfix-expiry ≈ tie over passing reps.
All losses are pennies-absolute, disclosed classes; no new defect. Chasing them means
touching calibrated style surfaces for ~$0.04/session of headroom — documented as the
known remaining room, not built.

## 5. Campaign verdict

Win metric (user-set): beat each runnable rival arm on token savings with zero
correctness/quality regressions, on our benchmark corpus.
- **Correctness: hush 56/56 (Haiku 28/28, Sonnet 28/28). Zero regressions.**
- **Aggregate savings: hush beats every runnable rival on BOTH models** (Haiku: −18.3%
  vs caveman, −26.6% vs rdxmin; Sonnet: −18.0% / −20.7%) and is the only arm cheaper
  than baseline at all.
- Per-row honest losses (razor-claim style): Sonnet bugfix-expiry/explain-rerender/
  repo-onboarding to caveman by pennies; noisy-build to baseline (inherent host
  truncation). Haiku rows equivalent.
- The two cross-host mechanism rivals (squeez, token-optimizer) cannot install on
  Windows at all (bash-only hooks); hush ships commandWindows on all five hooks.

Remaining known room (documented, deliberately not chased this run): the >29KB
host-truncation zone (needs a Claude Code change, not a hook); short-task/Q&A style
overhead rows (~$0.01-0.04 absolute); Grep + MCP-exec features' real-world wins land on
grep-heavy/JetBrains sessions this suite exercises lightly. (`/hush:stats` was named
here as the way to see them on live use; both it and the MCP-exec path were deleted
in hush 1.0.0, so there is no such view today.)

## 6. Spend log (pre-authorized $50)

| item | est. cost |
|---|---|
| Grep payload-shape probe + rewrite probe (Haiku, 2 runs) | ~$0.03 |
| Grep smoke #1 + #2 + #3 (Haiku) | ~$0.05 |
| rdxmin arm smoke (1 Haiku log-triage) | ~$0.11 |
| h2h-haiku 112-run screen | $6.69 actual |
| h2h-sonnet 112-run confirm | $22.68 actual |
| readme-refresh 128-run publish batch (user-authorized past $50) | $24.91 actual |

**Campaign total: ~$54.47** ($50 pre-authorization + explicit "do the full benchmark" go).

## 7. Published refresh (0.9.1-alpha)

README rebuilt from the single readme-refresh batch (4 arms × 8 tasks × n=4 Sonnet,
128/128 pass): hero $0.211/$0.205/$0.191/$0.171 (hush −19.2%, brief −2.8%, effmode
−9.4%), anatomy $0.186 read / $0.026 written, sidecar $0.42→$0.24, chatter medians
434→217, suite read-words 254→126, waveform silent 17/32 vs 27/32 (max 76). All five
SVGs regenerated (readme-refresh-gen.js, scratchpad throwaway; run JSONs carry
usage.output_tokens, NOT outTokens). Doc-consistency pass: alert budget trimmed 3→2.
Released hush c582018 / root 36b1eaf. The old −25% hero came from the easier
refresh-sonnet suite — suites differ; never splice the two tables.
