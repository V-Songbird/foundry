# A from-scratch hush style for Opus 5 — five rounds, one winner

Date: 2026-08-27. Goal (owner, via /goal): rewrite hush's output style from zero —
not edited from the shipped file — following the Opus 5 prompting docs, the
output-styles doc, and the built-in Concise design, then iterate against headless
Opus 5 sessions at `--effort medium` until the best iteration. Criteria: lowest
reading grade, highest reading ease, perfectly silent, short and precise, Opus 5
optimized.

**Winner: `Fern`** — final file at `docs/hush/research/hush-opus5-fern-style.md`, live
arm at the session scratchpad `arms/fern/`. On the 4-task Opus validation it beat
shipped hush 1.7.1 on every goal criterion except raw word count:

| arm (o5v, Opus medium, 4 tasks × 2 reps) | correct | fully silent | narration | final words | ease | grade | long% | $/run |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **fern** | **8/8** | **8/8** | **0.0** | 62.1 | **93.7** | **1.6** | **3.5** | 0.37 |
| hush (shipped 1.7.1) | 8/8 | 6/8 | 1.8 | **47.4** | 91.5 | 2.0 | 5.3 | 0.42 |

Tasks: log-triage, failing-suite, repo-sweep, incident-forensics. fern was silent
in all 8 sessions **including repo-sweep**, the suite's historical silence killer.
hush's two leaks were both the turn-opening line on failing-suite (7 words each).
Both arms 16/16 on ground truth. Cost is reported, not claimed — one batch, and
the variance doctrine stands.

**Honest caveats.** n=8 per arm; 8/8 vs 6/8 silent is not significant alone. The
fern lineage pooled across batches (same silence section since round 2): lark
5/6 + reed 5/6 + fern 8/8 — strong, not perfect. On the log-triage screens fern's
lineage ran 65-101 final words against hush's 53-66: the shipped file's fuller
content doctrine still writes the shortest note, and fern breached its own 60-word
cap in 1 of 8 validation runs (incident r2, 121 words). Fern is unmeasured on
Sonnet — the cross-model rule says measure there before any ship decision.

## What each round taught

Five batches, 51 Opus-medium runs, **$17.21** total. Screen task: log-triage.
All arms are full hush plugin copies (hooks identical) with only
`output-styles/hush.md` swapped, unique plugin+style names, pinned by settings
file — the delivery channel held constant, so every delta is the style text.

| batch | arms | finding |
| --- | --- | --- |
| `o5a-848249e8` | hush, nova, pico, wren | All 3 fresh drafts pass but leak the opener ("I'll dig into the log.") and overrun 60 words. wren's checklist-heavy file scored worst ease (79.4) — the file's own register transfers (voice-transfer law re-confirmed on Opus). |
| `o5b-*` | hush, lark, moss | **Quoting the base prompt's narration line verbatim and voiding it kills the opener leak**: lark 3/3 silent, 0 narration. moss = lark + worked example: silence 1/3, ease down — the example bought nothing (matches the 1.7.0 dead-end). |
| `o5c-*` | hush, lark, reed | Content-cut rules ("keep a fact only if it changes what the reader does next; cut the path; past three items give the count") pull words 101→66. reed 3/3 silent, 3/3 correct, cheapest. hush itself failed the rubric once by plain-wording `ECONNREFUSED` away. |
| `o5d-*` | hush, reed, vale | Noise round: reed 2/3 silent, words up; vale (crash-story rule + 4-step count) best ease/grade but 1/3 silent. Per-run variance swamps micro-edits at n=3 — stopped screening. |
| `o5v-*` | hush, fern | Validation above. fern = reed + "End on the last fact" + an end-of-file silence reminder (the docs' "short reminder near the end of the prompt"). |

## The design, and which doc rule earned each part

Everything in fern maps to a vendor rule or a measured house lesson:

1. **Override the narration mandate by quoting it.** The base prompt's "Before
   your first tool call, say in a sentence what you're about to do" is quoted and
   voided, with the duty moved to the final message. The round-1 arms paraphrased
   loosely and leaked; the round-2 quote-verbatim version went silent. This is
   prompt-lesson #5 (a prohibition must name what it overrides) confirmed on Opus 5.
2. **Explicit numeric caps** (6 lines / 60 words / 8-word sentences) — "To control
   response length, prompt for it explicitly." The caps alone did NOT bind
   (round 1-2 overran); binding came from the content-selection rules in round 3.
3. **Positive cadence description, no failure-mode prose** — the docs' "describe
   the cadence and shape you want" plus house priming rule #2.
4. **Whole file written in the target register** (tiny sentences, one-beat words)
   — voice-transfer law; wren's spec-register file measurably hurt ease.
5. **No verification instructions anywhere** — Opus 5 over-verifies if told to
   check its work; fern never says "double-check".
6. **Proper names never swapped** (`Redis` stays `Redis`) — the 1.7.0 rubric
   defect, and this round hush's own o5c failure re-confirmed the hazard.
7. **End-of-prompt reminder** — "In a long system prompt, pair the instruction
   with a short reminder near the end." Fern closes with a one-line silence
   restatement.
8. **No worked example** — measured twice now (1.7.0 `scr1`, o5b moss) as neutral
   to harmful on Opus.
9. **8-word sentence cap** — cap 8 backfired on Sonnet (2026-08-06) but works on
   Opus: fern's w/sent 5.7, grade 1.6. A Sonnet check is mandatory before shipping.

## What did not work

- **A pre-send counting checklist as the file's spine** (wren): worst arm of
  round 1 on Opus — ease 79.4, 0/2 silent. Counting steps help as a coda, not as
  the organizing shape.
- **A worked example of the note** (nova, moss): no ease gain, silence worse.
- **Micro-rules for one overshoot shape** (vale's three-beat crash story): ease up
  a hair, silence down; not separable from noise at n=3.
- **Caps without content doctrine** (lark): perfectly silent and 90+ ease, but
  86-101 words — the number alone does not shorten a Opus 5 reply that believes
  its facts are needed.

## The Sonnet cross-check (s5v, 2026-08-27, owner-requested)

Same 4 tasks × 2 reps on Sonnet, default effort, $3.94. **Fern is safe but not
better there — the reading crowns invert, as the 2026-08-06 cap-8 result
predicted.**

| arm (s5v, Sonnet) | correct | fully silent | narration | final words | ease | grade | long% | $/run |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fern | 8/8 | 5/8 | **5.8** | **63.8** | 74.3 | 4.9 | 8.1 | 0.22 |
| hush | 8/8 | 5/8 | 11.1 | 90.9 | **83.3** | **4.2** | **5.4** | 0.27 |

Silence ties at 5/8 with fern leaking fewer words. Fern is the shorter arm on
Sonnet (the reverse of Opus). But Sonnet under fern writes denser vocabulary
(long words 8.1% vs 5.4%) and worse ease, concentrated on incident-forensics
(55-66 ease). hush's fuller swap/gloss doctrine carries reading on Sonnet; fern's
lean file does not. **Net: fern is an Opus specialist — wins every goal criterion
on Opus 5 medium, loses reading ease on Sonnet with zero correctness or silence
cost.**

## Status — SHIPPED as hush 1.8.0, 2026-08-27

The owner accepted the Sonnet reading trade and ordered the swap plus a fresh
README basis on Opus 5 medium. Confirm batch `o5f` (3 reps): fern 12/12 correct,
silence tied with hush at 9/12, fern cheaper. Shipped at hush `a4a9836` /
parent `534880d`: fern body is now `output-styles/hush.md` (frontmatter name
Hush), presets rebuilt on its frame, `verify-style.js` guarded
sections/core-phrases/telemetry derivation updated, harness `caps.js` reparsed.
README re-measured: `rm280-7e554675` (Opus medium, 6 arms — hush takes every
crown, silent 10/16, −22% cost this run, cheaper on 7 of 8 jobs) and
`sn280-adf3c9cf` (Sonnet — silent 13/16 vs 4/16, no regression). Full numbers
in the measurement-ledger memory, 2026-08-27 entry. Total experiment spend
across the whole campaign ≈ $90.

- Screen/validation arms remain in the session scratchpad; batches `o5a`-`o5f`,
  `s5v` are in `records-archive/`.
