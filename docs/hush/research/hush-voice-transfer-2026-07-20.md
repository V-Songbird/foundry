# Voice transfer in crafted hush styles (2026-07-20)

**Status:** HISTORICAL, PRESETS TRIMMED — banner added 2026-08-18. The style shelf
was cut to four presets (glyph, pirate, rock, sensei) at hush commit `bbc68d5`,
which deleted `styles/sightline.md`, `chalkline.md` and `standup.md`. Findings that
name those files describe a shelf that no longer exists. The `**Check:**` device
survived into Sensei, so the open defect at the end of this report — Check lands 6/6
on Sonnet and 1/6 on Haiku — was never re-checked against its new host. That call
is recorded in `hush-consolidation-2026-08-18.md`.

PRIVATE — gitignored. Never cite methodology, tags, or per-rep numbers in public docs.

## The question

The shipped Pirate preset headed every report `**Ship's log —**` and then wrote
ordinary English underneath. `craft-style` documented that as a hard limit —
"words and shape carry; grammar does not" — on the strength of two earlier
measurements: the sailor-noun list reached the reply 0/8, and a Shakespearean
register reached it 1/16 from the style body. The only lever that had ever
moved grammar was a per-turn hook re-injection, rejected for costing ~10 words
of narration and +16% per run.

The user's constraint this session: full dialect including grammar, paid for
with style-body levers only, no runtime cost.

## What was actually blocking it

`craft-style` required three whole sections plus the shape table and the cap
bullets **byte for byte**. Counting the canonical file, that left roughly four
fifths of a crafted style in stock's plain English. The reply comes out in the
register the file is written in, so every crafted voice was competing with a
file that overwhelmingly demonstrated plain English.

The earlier "voice does not transfer" conclusion was measuring the verbatim
rule, not the model.

## Arms

All arms are the hush plugin dir copied with the candidate style swapped into
`output-styles/hush.md` and `force-for-plugin: true` — the activation path
`pick-style` uses. Silence hooks left on, as in real use.

| Arm | Lever |
|---|---|
| `vp0` | shipped `styles/pirate.md`, control |
| `vp1` | every section rewritten in dialect, anchors preserved |
| `vp2` | control + a voiced worked example for each shape row, ✗ also voiced |
| `vp3` | control + one Register line: read the message back and put it in a pirate's mouth before sending |
| `vp4` | control + a countable quota of dialect markers per message |
| `vp13` | `vp1` + the `vp3` redo line |
| `vb0` / `vb3` | the same control/redo pair on Shakespearean stage English |

Scoring splits two axes. VOCABULARY is a sailor's noun swapped for an ordinary
one. GRAMMAR is `be` for is/are, `ye`/`yer`, dropped `-in'`, `afore`/`'em`.
"dialect" below is a run carrying ≥2 grammar markers.

## Smoke (tags voice1 / voice1h, n=4, 2 tasks, 40 runs)

| Arm | Sonnet dialect | Haiku dialect |
|---|---|---|
| `vp0` | 0/4 | 0/4 |
| `vp1` | **4/4** | **4/4** |
| `vp2` | 0/4 | 0/4 |
| `vp3` | **4/4** | 3/4 |
| `vp4` | 2/4 | 3/4 |

`vp2` is dead. More worked examples in the voice change nothing — the example
was never the binding constraint. Ground truth 40/40, narration 0 everywhere,
cost at or below control.

## Confirm (tag voice2, sonnet n=4, 3 tasks)

| Arm | dialect | grammar/run | words | cost | narration | pass |
|---|---|---|---|---|---|---|
| `vp0` | 0/12 | 0.0 | 100 | $0.120 | 0 | 12/12 |
| `vp1` | **12/12** | 5.1 | 110 | $0.121 | 1 | 12/12 |
| `vp13` | **12/12** | 6.1 | 115 | $0.122 | 1 | 12/12 |
| `vp3` | 11/12 | 4.3 | 107 | $0.122 | 0 | 12/12 |
| `vb0` | 2/12 | 0.7 | 111 | $0.121 | 0 | 12/12 |
| `vb3` | 7/12 | 2.3 | 112 | $0.124 | 0 | 11/12 |

## Confirm (tag voice2h, haiku n=4, 3 tasks)

| Arm | dialect | grammar/run | words | cost | pass |
|---|---|---|---|---|---|
| `vp0` | 0/12 | 0.1 | 119 | $0.036 | 12/12 |
| `vp1` | **9/12** | 3.4 | 128 | $0.036 | 12/12 |
| `vp13` | **9/12** | 5.0 | 137 | $0.036 | 12/12 |
| `vp3` | 5/12 | 1.7 | 135 | $0.036 | 12/12 |
| `vb0` | 2/12 | 0.7 | 137 | $0.037 | 12/12 |
| `vb3` | 3/12 | 1.0 | 141 | $0.037 | 12/12 |

Haiku splits the two levers that tied on Sonnet. Writing the whole file in the
voice carries 9/12; the redo line alone drops to 5/12, against Sonnet's 11/12.
So the whole-file rewrite is the primary lever and the redo line is the
booster — which is the order `craft-style` states them in. Cost is dead flat at
$0.036 across every arm, and ground truth is clean on all 72.

## Shipped artifacts (tags voice3 / voice3h, n=4, 2 tasks, 48 runs)

The arms above are near-twins of what shipped. This batch measures the files
themselves: `vship` is `styles/pirate.md` as committed, `vrock1`/`vrock2` are
`styles/rock.md` before and after its one added line.

| Arm | model | dialect | grammar/run | words | words/sentence | longest sentence | cost | pass |
|---|---|---|---|---|---|---|---|---|
| `vship` | sonnet | **8/8** | 5.1 | 94 | 14.9 | 38 | $0.114 | 8/8 |
| `vship` | haiku | **8/8** | 5.5 | 116 | 15.6 | 58 | $0.034 | 8/8 |
| `vrock1` | sonnet | — | — | 64 | 14.4 | 36 | $0.111 | 8/8 |
| `vrock2` | sonnet | — | — | 62 | 12.7 | 29 | $0.109 | 8/8 |
| `vrock1` | haiku | — | — | 95 | 20.0 | 99 | $0.034 | 8/8 |
| `vrock2` | haiku | — | — | 99 | 14.1 | 109 | $0.033 | 8/8 |

The shipped Pirate carries dialect in every run on both models, with the
`**Ship's log —**` slot 8/8 and narration 0. Rock's redo line moves the metric
Rock is for — mean sentence length falls on both models, 14.4→12.7 and
20.0→14.1 — with word count and cost flat. At n=8 that is a direction, not a
settled number, and the haiku longest-sentence figure moved the other way.

## Findings

1. **Grammar transfers from the style body.** Pirate dialect went 0/12 to 12/12
   with no hook and no per-turn injection. The published limit is wrong and the
   README note that carried it is now false.
2. **Two levers, and the file-wide one is primary.** Writing the whole file in
   the voice carries on both models (12/12 sonnet, 9/12 haiku). The Register
   redo line nearly matches it on sonnet (11/12) and falls to 5/12 on haiku, so
   it is a booster, not a substitute. Together they are the densest (`vp13`,
   6.1 markers/run sonnet, 5.0 haiku).
3. **The redo line is the same class of instruction as a required closing
   line** — an action the model performs and can check it performed. That class
   has now carried in every test it has been given, and description-shaped
   wording has failed in every one.
4. **Cost is flat.** $0.120 control vs $0.122. Replies run 7–15% longer in
   words. Silence is untouched — the nudge hook is plugin-side.
5. **Distance from ordinary English still matters.** Early-modern syntax reached
   2/12 unaided and 7/12 with the redo line — a real lift, not a fix. Pirate
   dialect is a word-substitution grammar; Shakespearean is a different syntax.
6. **The one honest cost.** `explain-rerender__vb3__r2` scored 1/3 on the rubric:
   the archaic rewrite replaced the technical terms the answer needed
   ("is forged anew each render" for a new reference). Heavy voices can bury the
   words the reader came for. Pirate showed none of this — 36/36 correct.

## What shipped

- `verify-style.js` checks anchors instead of whole sections: numbers, inline
  code, bold spans, listed-item counts, shape-table rows, paragraph-for-
  paragraph, and a 60% word floor per guarded section. All anchors derived from
  the canonical file, so the script still carries no copied prose.
- `craft-style` step 3 rewritten: write the whole file in the voice, keep the
  anchors, then the redo line, one required element, the word swaps, the voiced
  example.
- `styles/pirate.md` rebuilt on the `vp13` recipe. One deviation from the
  measured arm: the opening one-message-per-turn line stays canonical, because
  the verifier anchors it.
- `styles/rock.md` gained the redo line only.
- `sightline.md` and `chalkline.md` left alone. Sightline's differentiator is a
  required closing line and already lands 8/8; chalkline's is a behavior, not a
  register. Neither is a voice the recipe would move.

## All five styles side by side (tags allstyles / allstyles2, n=2 x 3 tasks, both models)

Every shipped style, force-delivered, on `bugfix-expiry`, `explain-rerender`
and `plan-avatars`. 60 runs, 60/60 correct. Caps measured on prose lines only —
code fences, table rows and blockquotes exempt.

| Style | sonnet words | long sentences/run | slot | haiku words | long/run | slot |
|---|---|---|---|---|---|---|
| stock | 95 | 2.7 | — | 113 | 1.5 | — |
| chalkline | 76 | 1.7 | — | 121 | 1.8 | — |
| sightline | 97 | 3.0 | 6/6 | 104 | 2.3 | **1/6** |
| rock | 96 | 3.0 | — | 114 | 1.5 | — |
| pirate | **150** | **4.3** | 6/6 | 100 | 2.5 | **4/6** |

Three defects found, one fixed:

1. **Rock was not blunter than stock** — 96 words against 95, and the same
   long-sentence rate. Its redo line said "cut it to its hardest form" with no
   number in it. Adding the style's own fifteen-word cap to that line took it
   to 68 words / 1.2 long sentences on sonnet and 86 / 1.7 on haiku — the only
   arm that now beats stock on both. **Shipped.**
2. **Pirate runs 58% longer than stock on sonnet** and breaks its own
   fifteen-word cap 4.3 times a run. Folding the cap and a slot check into its
   redo line made it *worse* (172 words, 5.5 long sentences) and did not move
   haiku's slot. **Reverted.** The length is the price of the dialect.
3. **Sightline's `**Check:**` line lands 6/6 on sonnet and 1/6 on haiku.** A
   redo line took haiku to 3/6 but cost +39 words and +1.5 long sentences on
   sonnet, where nothing was broken. **Reverted.** Open defect — but against
   `styles/sightline.md`, deleted at `bbc68d5`. The `**Check:**` line now lives in
   Sensei and the Haiku gap has not been re-measured there.

**Noise floor.** `chalkline` was byte-identical across the two batches and
moved 76 → 103 words, +35%. At n=6 over three tasks, a word-count swing under
about a third is not a signal. Rock's is the only change here that moved the
same direction on both models and halved a second metric.

## The opener is not the voice (tag pirate4 / pirate4h, n=3 x 2 tasks, 48 runs)

Four Pirate variants, same file except the opener. 48/48 correct.

| Arm | opener | dialect | grammar/run | sonnet words | haiku words/sentence | haiku worst |
|---|---|---|---|---|---|---|
| A shipped | `**Ship's log —**` | 6/6 | 5.2 | 103 | 19.3 | 129 |
| B | `**Arr —**`, log words gone | 6/6 | 4.3 | 78 | **12.7** | **34** |
| C | none | 6/6 | 5.3 | **73** | 18.3 | 103 |
| D | `**Arr —**` plus oaths | 6/6 | 3.2 | 95 | 16.3 | 123 |

Every variant hit its own opener 12/12 across both models, including none at
all. Two things follow. The slot mechanism is indifferent to what you put in
it — it is a shape, not a voice. And **the voice does not need it**: arm C
carries the dialect 6/6 on both models with no heading whatsoever.

Arm D is the counter-lesson. Pushing more vocabulary — oaths, address forms,
invented sailor nouns for tests and failures — *lowered* the grammar markers
from 4.3 to 3.2. It also renamed tests "lookouts", which hides what the line
says. More voice words are not more voice.

**Shipped: C.** Openers are now opt-in across the board — `craft-style` builds
one only when the user asks, and Pirate carries none. Sightline's `**Check:**`
line stays: it is a closing question and the whole point of that preset, not a
label on a voice.

## Dead levers, do not retry

- More worked examples in the voice (`vp2`, 0/8 across both models).
- Naming the voice, however explicitly — established earlier, unchanged here.
  It is a precondition, not a lever.
