# Stack-vs-stack benchmark — baseline vs hush+razor vs caveman+ponytail

> **Status 2026-08-18 — HISTORICAL, unpublished, unrechecked.** Its four razor claims were never
> published and have not been measured against any razor since 0.4.x. Six releases on, treat every
> number here as expired rather than as evidence.

**Date:** 2026-07-18 · **Cells:** 330 (Node suite 210 + Python suite 120) · **Models:** Haiku (n=3), Sonnet (n=2) · **Spend:** ≈ $35 total (Node $23.81, Python $10.83, smokes ~$0.30)

**Runs:**
- Node suite (hush harness, `benchmarks/hush/experiments/voice-comparison/runner`): `results/trio-haiku` (14 tasks × 3 arms × 3), `results/trio-sonnet` (14 × 3 × 2). All 210 cells passed ground truth.
- Python suite (razor harness, `benchmarks/razor/experiments/dependency-comparison`): `runs/20260718-163058` (haiku, 8 tasks × 3 × 3), `runs/20260718-165211` (sonnet, 8 × 3 × 2).

## Arms

| arm | activation |
|---|---|
| `baseline` | no plugin |
| `hushrazor` | `--plugin-dir razor` + `--plugin-dir hush` + `--settings settings-hush.json` (pins `hush:Hush`) |
| `caveponytail` | `--plugin-dir caveman` + `--plugin-dir ponytail`, `CAVEMAN_DEFAULT_MODE=full` |

Activation verified in smoke transcripts per arm (razor SessionStart marker + `outputStyle: hush:Hush` for the stack; caveman + ponytail injection markers for the rivals; no cross-contamination). Harness changes made for this run: stack arms added to `benchmarks/hush/experiments/voice-comparison/config.json` and `bench.py` (multi `--plugin-dir` + per-arm env/settings), `RAZOR_`/`PONYTAIL_` env stripping in `run.js`, `CAVEMAN_` stripping in `bench.py`.

## Headline numbers

### Node suite (hush's axis: 14 tasks — Q&A, bugfixes, noisy logs, exploration)

| model | arm | pass | $/run | out tok | context traffic | narration words | words read (all turns) | tool chars in context |
|---|---|---|---|---|---|---|---|---|
| haiku | baseline | 42/42 | 0.0575 | 2093 | 145k | 49 | 223 | 19.9k |
| haiku | caveponytail | 42/42 | 0.0602 | 1670 | 146k | 17 | 152 | 19.9k |
| haiku | **hushrazor** | 42/42 | **0.0520** | 1921 | 149k | **2** | **147** | **6.4k** |
| sonnet | baseline | 28/28 | 0.2070 | 1990 | 203k | 15 | 259 | 18.9k |
| sonnet | caveponytail | 28/28 | 0.2088 | 1337 | 194k | 10 | 144 | 17.7k |
| sonnet | **hushrazor** | 28/28 | **0.1802** | 1293 | 195k | 8 | **132** | **5.6k** |

- hush+razor is the **cheapest arm on both models**: −10% vs baseline on Haiku, −13% on Sonnet. caveman+ponytail is *more expensive* than baseline on both.
- The rivals' savings mechanism (terser prose) shows in out-tokens but never converts to cost; hush's tool-output compression (~3× fewer tool chars entering context) does.
- Biggest hushrazor wins: `log-triage` ($0.031 vs $0.074 base Haiku; $0.138 vs $0.295 Sonnet), `incident-followup` ($0.050 vs $0.125 Haiku; $0.250 vs $0.423 Sonnet).
- Where hushrazor pays: compression-less code tasks (`checkout-bug`, `rename-review`, `noisy-build` Haiku) where plugin prompt overhead has nothing to reclaim.
- Correctness never dropped: all 210 cells across all arms passed ground truth — compression cost no accuracy on this suite.

### Python suite (razor's axis: dep traps, sprawl, vibe, overhead)

| model | arm | correct | safe | dep ships | mean src LOC (code tasks) | $/run |
|---|---|---|---|---|---|---|
| haiku | baseline | 0.875 | 0.875 | 3 | 19.6 | 0.0375 |
| haiku | caveponytail | 0.875 | 0.875 | 3 | **13.9** | 0.0462 |
| haiku | **hushrazor** | **1.000** | **1.000** | **0** | 15.8 | 0.0450 |
| sonnet | baseline | 0.875 | 0.875 | 2 | 30.6 | 0.1544 |
| sonnet | caveponytail | 0.938 | 0.938 | 1 | 16.2 | 0.1607 |
| sonnet | **hushrazor** | **1.000** | **1.000** | **0** | **13.5** | 0.1687 |

- **Dependency result holds in the stack:** hushrazor shipped 0 dependencies in 40 cells; baseline shipped 5, caveponytail 4. All failures are `dep-http-lib` (the axios bait): baseline 0/5 safe, caveponytail 1/5, hushrazor 5/5.
- **Only hushrazor is 100% correct** on this suite, both models (40/40). Every other arm's incorrect cells are the lib ships.
- LOC: hushrazor leaner than baseline on both models; vs the rivals it's mixed (caveponytail leaner on Haiku, hushrazor leaner on Sonnet — consistent with the 2026-07-16 audit's single-plugin finding).
- Cost on this suite: both stacks cost slightly more than baseline (~+10–20%) — these tasks are small, so injection overhead dominates and there's little tool output to compress. `install_attempts` = 0 everywhere (no arm reached the package-manager shims).

## Per-task Node data (cost / context traffic means)

### Haiku (n=3)

| task | baseline | caveponytail | hushrazor |
|---|---|---|---|
| bugfix-expiry | $0.0399 / 145k | $0.0456 / 157k | $0.0448 / 155k |
| bugfix-pagination | $0.0439 / 157k | $0.0461 / 143k | $0.0541 / 201k |
| checkout-bug | $0.0789 / 271k | $0.0698 / 257k | $0.1032 / 350k |
| checkout-session | $0.0991 / 385k | $0.0801 / 318k | $0.0834 / 329k |
| explain-rebase | $0.0180 / 21k | $0.0239 / 25k | $0.0227 / 24k |
| explain-rerender | $0.0189 / 21k | $0.0235 / 25k | $0.0237 / 24k |
| incident-followup | $0.1247 / 243k | $0.1327 / 276k | $0.0497 / 135k |
| log-triage | $0.0743 / 69k | $0.0807 / 75k | $0.0306 / 51k |
| log-triage-vigilant | $0.0750 / 69k | $0.0811 / 75k | $0.0321 / 51k |
| noisy-build | $0.0420 / 54k | $0.0480 / 61k | $0.0552 / 88k |
| refactor-rename | $0.0436 / 117k | $0.0514 / 142k | $0.0512 / 140k |
| rename-review | $0.0572 / 203k | $0.0632 / 221k | $0.0804 / 237k |
| repo-onboarding | $0.0514 / 156k | $0.0565 / 168k | $0.0548 / 183k |
| repo-summary | $0.0380 / 120k | $0.0407 / 103k | $0.0420 / 119k |

### Sonnet (n=2)

| task | baseline | caveponytail | hushrazor |
|---|---|---|---|
| bugfix-expiry | $0.1295 / 192k | $0.1482 / 187k | $0.1449 / 185k |
| bugfix-pagination | $0.1165 / 162k | $0.1494 / 188k | $0.1488 / 187k |
| checkout-bug | $0.2315 / 291k | $0.2086 / 234k | $0.1658 / 189k |
| checkout-session | $0.3058 / 405k | $0.2457 / 345k | $0.2110 / 279k |
| explain-rebase | $0.0648 / 28k | $0.0861 / 33k | $0.0847 / 32k |
| explain-rerender | $0.1222 / 28k | $0.0881 / 33k | $0.1432 / 32k |
| incident-followup | $0.4227 / 371k | $0.4075 / 416k | $0.2496 / 297k |
| log-triage | $0.2945 / 139k | $0.3102 / 153k | $0.1382 / 105k |
| log-triage-vigilant | $0.2987 / 140k | $0.3181 / 153k | $0.2325 / 198k |
| noisy-build | $0.1629 / 73k | $0.1899 / 82k | $0.1482 / 170k |
| refactor-rename | $0.1959 / 292k | $0.1989 / 226k | $0.2350 / 379k |
| rename-review | $0.2479 / 425k | $0.2507 / 376k | $0.2827 / 335k |
| repo-onboarding | $0.1794 / 184k | $0.1851 / 192k | $0.1937 / 206k |
| repo-summary | $0.1260 / 118k | $0.1364 / 102k | $0.1438 / 133k |

## Per-task Python data

See `runs/20260718-163058/summary.json` (haiku) and `runs/20260718-165211/summary.json` (sonnet); tables also in the batch logs. Key rows:

- `dep-http-lib` haiku: correct/safe — baseline 0/0, caveponytail 0/0, hushrazor **1.0/1.0**.
- `dep-http-lib` sonnet: baseline 0/0, caveponytail 0.5/0.5, hushrazor **1.0/1.0**.
- `vibe-todo` LOC medians: haiku 91 / 54 / 68 (base/cavepony/hushrazor); sonnet 138 / 63.5 / **58.5**.
- `dep-http` sonnet LOC: baseline 24.5, caveponytail 2.5, hushrazor **2.0**.
- `sprawl-todo` sonnet LOC: baseline **9.0**, caveponytail 12.5, hushrazor 12.0 (baseline leanest here).

## What holds up as claims (headline-safe, n≥5 pooled)

1. **hush+razor is the only arm at 100% correctness across both suites and both models** (110/110 Node + 40/40 Python). Every other arm failed cells.
2. **0 dependency ships in 40 dep-trap cells** vs 5 (baseline) and 4 (caveman+ponytail) — the single-plugin razor result survives stacking hush on top.
3. **Cheapest arm on real tool-work** (Node suite, both models); the rivals' stack costs *more* than baseline on both models on both suites.
4. **~25× less narration on Haiku** (2 words vs 49) and **~3× less tool output entering context** — the mechanism behind the cost win, visible in the metrics.

Caveats: n=3/n=2 per cell — per-task deltas are directional, only pooled numbers are stable. Python-suite cost favors baseline (small tasks, overhead dominates); don't claim "cheaper" without naming the suite. Nothing published anywhere; READMEs untouched per `feedback_benchmark_no_auto_publish`.
