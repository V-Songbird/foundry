# razor benchmark audit — what the published table actually measures, and where razor loses

> **Status 2026-08-18 — HISTORICAL.** This reads as a brief for a run that had not happened yet.
> It happened, on 2026-07-16 and again on 2026-08-06, and the README benchmark section has been
> rebuilt from the shipped corpus twice since. The table audited here no longer exists. Keep this
> for the method, not for the numbers and not for the to-do list.

**Date:** 2026-07-16 · **Audited:** razor `README.md` "The full picture" table + methodology note, against the run that produced them · **Run:** `X:/Temp/razor-bench/20260712-180553` (Haiku n=8) + `X:/Temp/razor-bench/20260712-182915` (Sonnet n=4), 468 cells · **Rival in these numbers:** ponytail (arm name `rival` in `results.json`) · **Companion:** `docs/razor/research/razor-competitor-intel-2026-07-14.md`

**Status: NOTHING PUBLISHED, NOTHING CHANGED.** The table, its intro, and the methodology note are untouched by user decision (2026-07-16: *"Leave the table as it is for now"*). This report exists so a future `/goal` session can pick the thread up cold: **experiment with razor until it beats the rival on lines, then update the table and numbers.**

---

## Part 0 — Why this audit happened

Rebuilding razor's README charts required per-session data. Reconciling the charts against the published table surfaced that the table is narrower than its own prose claims. The finding is not that the table lies — every published number reproduces exactly. It is that **the table's basis is Haiku-only and its job list is incomplete**, and that razor's lines advantage **does not survive Sonnet**.

This is the same failure shape as the dropped "26% cheaper" claim (see `project_razor_state` memory): a headline that holds on the small model and evaporates at power.

---

## Part 1 — What the table actually is (established, not inferred)

Each cell = **median lines added**, where "lines added" = **git-diff insertions against the seeded stub** (`git_diff_stats` → `src_loc`; the `+N` a PR shows), **not** whole-file lines. The blank-line and comment handling follows the upstream harness.

**Basis is Haiku-only, n=8 per job:**

| basis | rows matching the published table |
| --- | --- |
| Haiku only, n=8 | **7 / 7** |
| Haiku + Sonnet pooled, n=12 | 2 / 7 |

**The `Average across the suite` row (15 / 13 / 12) is the mean over *all Haiku code sessions across all 11 code jobs* (88/arm)** — it is NOT the mean of the seven displayed rows.

| what | no plugin | rival | razor |
| --- | --- | --- | --- |
| **mean over all Haiku code sessions (= the published row)** | 15.1 | 13.0 | **11.9** |
| mean of the 7 displayed medians | 16.7 | 13.7 | 12.1 |
| mean over all Sonnet code sessions | 13.7 | **11.2** | 14.6 |
| mean over all sessions, pooled | 14.6 | **12.4** | 12.8 |

**Correction to an earlier claim made in-session:** the average row is NOT reversed. On its own (Haiku) basis razor is genuinely leanest at 11.9 and the row reconciles exactly. An in-session claim that the rival beat razor there was pooling both models — wrong basis.

---

## Part 2 — The three real findings

### 2.1 "Every job, every setup" is false — 4 of 11 code jobs are omitted

The suite has **11 code jobs** (plus `oh-question`/`oh-typo`, which produce no code and are correctly excluded). The table displays **7**.

| omitted job | Haiku medians (no plugin / rival / razor) | verdict |
| --- | --- | --- |
| `dep-dotenv-lib` | 16.5 / 12.5 / **15.0** | **razor LOSES to the rival by 2.5 lines** |
| `dep-retry` | 12.0 / 12.0 / 12.0 | three-way tie |
| `dep-retry-lib` | 12.0 / 12.0 / 12.0 | three-way tie |
| `dep-slug` | 5.5 / 4.0 / 4.0 | razor ties the rival, beats baseline |

**The credibility problem:** the table's intro sells its honesty on *"the one row where doing nothing wins, because a scoreboard that only shows wins isn't worth much"* — while a **second razor loss sits in a row that isn't displayed**. That is the exact criticism the intro pre-empts, and it is currently true of the table.

### 2.2 The average row cannot be derived from the visible rows

Row says 15 / 13 / 12. Averaging the seven visible rows gives **16.7 / 13.7 / 12.1**. Both are correct for their own basis; a reader who checks the arithmetic finds a discrepancy that is not an error and cannot be resolved from the page.

### 2.3 "hold on the bigger model too" is false for the lines metric

Methodology note currently reads: *"Numbers move a few percent between runs, and hold on the bigger model too."*

On Sonnet, **razor is the worst arm on lines added**: 14.6 vs no-plugin 13.7 vs rival 11.2. Not a few percent — a sign flip. The driver is `dep-querystring`, where razor's median goes 3.5 (Haiku) → 7.0 (Sonnet) while the rival's goes 4.0 → 2.0.

**What DOES hold on Sonnet** (do not lose this in any rewrite):

- **The dependency result.** `dep-http-lib` axios ship: no plugin **12/12**, rival **11/12**, razor **0/12** — pooled across both models. Per model: baseline 8/8 Haiku + 4/4 Sonnet; razor 0/8 + 0/4. This reproduces the published 100% / 92% / 0% exactly and is the claim the hero chart and the axios diff are built on.
- **Correctness.** razor 98.1% across 156 cells, most of any arm.
- **Cost.** razor $0.0585/session vs no-plugin $0.0628 — cost-neutral-to-cheaper; the rival ($0.0670) is *more* expensive than baseline.

---

## Part 3 — The `/goal` brief: beat the rival on lines

**Goal:** razor's mean lines added ≤ the rival's, **on Sonnet and pooled**, without losing the dependency result (0 ships), correctness (≥98%), or cost neutrality. Then update the table + numbers.

**Target to beat (pooled, all 11 code jobs):** rival 12.4 → razor must reach ≤ 12.4 from 12.8. **On Sonnet:** rival 11.2 → razor must reach ≤ 11.2 from 14.6. Sonnet is the hard one.

**Where razor's lines are actually lost** (offcut above the leanest *correct* answer any arm found, per session — an independent floor, not razor's own median):

| arm | excess lines/session above the observed floor |
| --- | --- |
| no plugin | 6.1 |
| **rival** | **3.8** |
| razor | 4.3 |

Per-job excess is in `Part 4` data below. Biggest razor-vs-rival gaps: `dep-querystring` (razor 6.0 vs rival 3.5), `dep-dotenv-lib` (6.1 vs 3.0), `dep-retry-lib` (6.7 vs 6.9 — razor slightly better), `dep-uuid` (2.7 vs 1.8 — razor worse).

**Hypotheses worth testing (none validated — do not implement blind):**

1. **Sonnet ignores the platform rung under razor more than under the rival.** On `dep-querystring` Sonnet, razor's median is 7.0 vs the rival's 2.0. razor's ladder names "does the platform do it?" as rung 4, but the rival's wording may push harder toward built-ins on a stronger model. Check the rung-landing classifier (Part 4) on Sonnet specifically.
2. **razor's "never cut" carve-out may be over-firing on Sonnet.** The ladder's `Never cut: validation at trust boundaries, error handling that prevents data loss...` could be licensing defensive extra lines a stronger model is more capable of rationalizing. Test a Sonnet arm with the carve-out narrowed.
3. **Priming risk (proven twice — see `reference_prompt_wording_lessons`).** Any fix that *describes* verbose code to forbid it will likely produce it. Prefer deleting a clause over adding one. **When a clause backfires the answer is almost never more words.**
4. **The 0.3.7→0.3.8 precedent applies.** A ladder clause validated as NULL on Opus 4.8 was reverted. Any new ladder wording must be A/B'd on the *current* models, and razor's own rung 1 (YAGNI) applies to razor's own ladder.

**Ask-before-batches applies** (`feedback_ask_before_batches`): propose arms × tasks × reps + est. cost and wait for go.

---

## Part 4 — Reproducing this (tooling built during the audit, scratchpad-only)

Scripts live in the session scratchpad (`X:\Temp\claude\D--Projects-...\scratchpad\`) and are **not committed**. Rebuild if needed:

- `lines_per_session.py` — per-session lines added, ordered. **Must** use the harness's own `pt.git_diff_stats(ws)` for git tasks / `pt.code_stats(ws)` otherwise. A naive per-file numstat gives razor 12.8→ wrong values and disagrees with the table; the harness counts the whole diff across all code files. Verified: reproduces all 7 published rows with **0 mismatches**.
- `join_correct.py` — **`results.json` rows carry `correct` but NO rep index.** Join each row to its workspace on `(cost, duration_ms, turns)` from the workspace's `_claude.json`. Verified clean 1:1 across all **396** sessions, zero ambiguous, zero unmatched. This unlocks per-session correctness, which had never been available before.
- `classify_rungs.py` — places each session on razor's ladder from the delivered source. Markers must be **task-specific** (the built-in that would do *that* job), or a dotenv session that merely calls `fs.readFileSync` gets miscredited as "the stdlib does it".

### The harness has DRIFTED from the run — this bit others already

`razor_tasks.py` no longer matches what ran on 2026-07-12. Do not assume the current task defs describe the run:

| task | as run (2026-07-12) | in `razor_tasks.py` now |
| --- | --- | --- |
| `dep-querystring` | JS, `query.js`, seeded stub | **does not exist** |
| `dep-retry-lib` | JS, `retry.js`, baits `p-retry` | Python, `retry.py`, baits `tenacity` |
| `dep-dotenv-lib` | JS, `env.js` | Python, `env.py` |
| `dep-dotenv` / `dep-retry` / `dep-slug` / `sprawl-todo` | JS | Python |
| `reuse-scan` | JS, `distance.js`, **no reuse trap present** — seeded helpers are retry/chunk/format/validate, no edit-distance to reuse | Python, `distance.py` |

Consequences: the shipped `good`/`bad` reference solutions survive for only **3 of 11** tasks (`dep-http`, `dep-http-lib`, `dep-uuid`), so they cannot be used as an independent minimum across the suite. `reuse-scan` never exercised the rung-2 "reuse it" path — every arm correctly landed on rung 7.

### Ladder landings, all 11 code jobs (132 sessions/arm)

| rung | no plugin | rival | razor |
| --- | --- | --- | --- |
| platform ("does the platform do it?") | 14 | 24 | **36** |
| write the minimum | 104 | 96 | 96 |
| **off the ladder (installed a package)** | **14** | 12 | **0** |
| skip / reuse / stdlib / installed / one-line | 0 | 0 | 0 |

Five of seven rungs are empty **because these jobs never offered those shortcuts**, not because razor ignores them. Any chart using this must say so.

**Notable:** razor's platform advantage (36 vs 14) is the strongest honest lines-adjacent signal in the suite and is what the rejected "ladder" hero chart was built on. It is **not** currently represented in the README.

---

## Part 5 — Cross-references

- `project_razor_state` memory — benchmark/marketing thread; the dropped "26% cheaper" precedent.
- `project_razor_internals_audit` memory — the 0.3.7→0.3.8 validate-then-revert precedent.
- `reference_prompt_wording_lessons` — **read before touching any ladder wording**; priming is the #1 failure mode.
- `feedback_benchmark_no_auto_publish` — numbers never reach the README without an explicit go.
- `docs/razor/research/razor-competitor-intel-2026-07-14.md` — the rival's ladder is a near-verbatim razor twin; the moat is the gates, not the wording.
