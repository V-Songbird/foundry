# hush takes the reading crowns from the ADHD-reader rival

**Status:** HISTORICAL — banner added 2026-08-18. Everything here shipped as hush
1.6.0 and is released and pushed; hush is at 1.6.2, which replaced the mermaid
clause in the style file. The retention meter in the addendum is shipped to the
public harness but its 95.7% is deliberately not in the README, and the promised
clean pre-registered re-read has not run. That call sits in
`hush-consolidation-2026-08-18.md`.

2026-08-11 · 174 Sonnet runs · $65.87 · goal session (user /goal directive authorized the batches)

## Goal and verdict

Goal: make hush beat the ADHD-reader rival on the reading benchmark (Flesch ease,
grade level, sentence length, long words) without touching the Mid-turn silence
section of `output-styles/hush.md`.

**Verdict: DONE on the crowns, in one interleaved batch.** Final batch
`rxfinal-b8fa48a3` (6 public-suite jobs × 3 arms × 3 reps, Sonnet, 54/54 ground
truth passed):

| arm | words | lines | w/sent | long% | ease | grade | silent | slip words | correct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hush-experimental | 72.0 | 3.0 | 11.0 | **7.1** | **81.7** | **4.6** | **13/18** | 190 | 18/18 |
| ADHD-reader rival | 54.5 | 3.5 | **9.4** | 9.2 | 74.3 | 5.2 | 5/18 | 654 | 18/18 |
| hush stock (1.5.0) | 69.5 | 3.0 | 12.3 | 7.6 | 78.5 | 5.4 | 11/18 | 132 | 18/18 |

Pairwise per task+rep (n=17, one hush run shipped an empty final message —
`repo-sweep__hush__r1`, its file check still passed): ease 14–3 hush, grade 11–6,
long-words 12–5, words-per-sentence 5–12 rival.

- hush wins BOTH reading crowns (ease +7.4, grade −0.6) plus long words, and it
  beats stock hush on every reading column at the same time.
- **Honest losses:** words-per-sentence stays the rival's column (9.4 vs 11.0),
  and it ships fewer total words (54.5 vs 72).
- Silence held (the point of the constraint): 13/18 silent vs stock's 11/18 in
  the same batch, leaks on the same two tasks stock leaks on (dep-bump-warnings,
  repo-sweep). The Mid-turn silence section is byte-identical to stock.

## What changed (all outside Mid-turn silence)

Style-file experiment only; hush the plugin is untouched. The winning
`hush.md` full copy sits beside this report as
`hush-reading-win-style-2026-08-11.md`. The complete edit list vs stock:

1. Persona: "short sentences" → "sentences under ten words".
2. Hard limits: word cap 15 → 10; new bullet "**One fact per sentence.** A second
   fact gets its own short sentence."; the semicolon/paren ban now also bans
   dashes ("Where a dash would sit, end the sentence and start a new one").
3. Coupon example: each numbered item split into two short sentences.
4. New ✗/✓ example pair showing a colon-comma-chained prose sentence split into
   three short ones ("Already done. `src/router.js` drops repeats seen within 5
   minutes. `verify.js` confirms it.").
5. Register: recount step says 10; new step "A word of three or more syllables,
   with a shorter everyday twin? Swap it."; the `;`/`(` search step now includes
   `—`; "Put them back into sentences" → "into short sentences".

## What the iteration ladder measured (reps-1 probes are noise-dominated)

Nine batches, same 6-job suite, rival arm rebuilt per the v17 recipe (skill body
as an output style, `keep-coding-instructions: true`). Per-run ease σ ≈ 15, so
n=6 probes only catch blowups; the reps-3 final is the evidence.

| batch | hush config delta | hush ease | rival ease | hush w/sent | rival w/sent |
| --- | --- | --- | --- | --- | --- |
| rx1 | cap 10 + syllable step | 79.2 | 78.6 | 10.8 | 9.0 |
| rx2 | + per-line recount wording | 76.1 | 74.6 | 11.3 | 10.6 |
| rx3 | cap 8 instead | 73.3 | 72.5 | 14.0 | 9.9 |
| rx4 | cap 10 back + dash ban | 83.3 | 84.4 | 12.2 | 9.5 |
| rx5 | + one-fact rule + split example | 80.3 | 64.9 | 10.0 | 10.5 |
| rx6 | + persona "under ten words" | 75.1 | 73.2 | 11.8 | 12.4 |
| rx7 | + prose ✗/✓ split example | 81.7 | 72.3 | 9.9 | 11.4 |
| rxconfirm (reps 2) | rx5 config | 74.2 | 68.8 | 12.8 | 11.6 |
| rxfinal (reps 3) | rx7 config = winner | 81.7 | 74.3 | 11.0 | 9.4 |

Lessons that held:
- **Cap 8 backfired** (rx3: wps went UP to 14.0) — consistent with the
  cap-conformance file-density lesson: push too hard and Sonnet writes more.
- **Per-line recount wording did nothing** over "longest sentence" wording.
- **The big movers were the dash ban and the two split examples** — the model
  imitates examples far more reliably than end-of-file checklist rules.
- The rival's published v17 numbers (ease 83.9, grade 3.7) were a lucky batch;
  across six fresh batches its ease ran 64.9–84.4, mean ≈ 72.
- One empty-final-message hush run appeared (1 of 18) — watch on any ship batch.

## Addendum: the retention meter (same day, user go, publish decision pending)

Borrowed from an outside repo's finding that brevity directives drop
safety-relevant details unevenly. New OFFLINE scorer `runner/retention.js` +
pre-written answer keys `retention-keys.json` (24 items over the 6 jobs, from
fixtures only, one disclosed pilot amendment on repo-sweep) + 8 local tests
(`tests/benchmark_retention.test.js`, harness 168/168). Judge reads each final
message blind and marks each needed detail present; verdicts cached per
(batch, run, model, key-hash) under `results/`; deliberately NOT in `runCheck`.

Scored the README batch `v18-c827bd6f` with two judges:

| arm | Haiku judge | Sonnet judge |
| --- | --- | --- |
| hush | **95.7%** | **95.7%** |
| simple-english | 95.8% | 95.8% |
| ADHD-reader rival | 93.8% | 93.8% |
| caveman | 91.7% | 93.8% |
| no plugin | 93.5% | 91.3% |

Both judges agree on hush exactly; they disagree on 2-3 single verdicts
elsewhere. Headline: **hush keeps 95.7% of the needed details while being the
shortest read — the brevity-drops-facts cost the outside study measured does
not show up for hush**; it retains MORE than plain Claude. Misses cluster on
feature-drift item 2 (dedupe "holds at every priority" nuance) across all
arms. Judge spend: $2.29 total. NOT in the README — the user decides
separately. Keys caveat: authored after this session saw outputs (disclosed
in the file); next batch is the clean pre-registered read.

## Status and next steps

**SHIPPED 2026-08-11, same day, on the user's explicit go** — hush commit
`50bda3b` ("Sharpen the final message for reading ease"), suite 499/499. Released
and pushed the same day as hush 1.6.0 (release commit `c1a9601`), parent pin
bumped; hush is at 1.6.2 today. What shipped: the 5 style
edits, the pirate preset mirrored, the verifier row-match fix, and the README
re-measured from the fresh 5-arm publish batch `v18-c827bd6f` (60/60 correct):
hush ease 81.2 / grade 4.3 / long 7.0% takes every reading crown (ADHD rival
71.6 / 5.7 / 9.3%), silent 8/12 with 7 slips vs baseline 2/12 with 36, cost
mean −15%, noisy and search segments a wash this batch. README also gained a
verbatim example final message (dep-bump job) — chosen over the prettier
log-triage one because the doc reviewer flagged that its sentences broke the
10-word cap next to the claim. Haiku cross-check `v18h-4031a4d4`: +11% cost,
10/12 silent, 2 slips, 10/12 correct (both incident-forensics reps missed) —
the Haiku caveat sentence stays. Extra spend: $25.36 / 84 runs (session total
≈ $91). Records: `benchmarks/hush/records/rx*`, `v18-*`, `v18h-*` (local-only).
