# hush — head-to-head vs three rivals, and a benchmark reframe (2026-08-06)

**Status:** HISTORICAL — banner added 2026-08-18. The cost-ceiling verdict is the
durable part and still holds: hush's fixed prompt tax is measured, so
cost-wins-everywhere is unreachable and silence is the moat. Two things have
drifted. **Record paths:** every batch this report cites was moved to
`benchmarks/hush/records-archive/`, so any reproduce command below needs
`records/<tag>` swapped for `records-archive/<tag>` — that applies to every
2026-07 and 2026-08 report, not just this one. **README proposals:** see the
correction on the proposal list in §"What the README should say". The current
account of hush's open work is `hush-consolidation-2026-08-18.md`.

Goal set by the user, verbatim:

1. Beat baseline on every benchmark, **or find a better benchmark strategy** to improve hush marketing.
2. Beat caveman on token saving.
3. Beat i-have-adhd on wording and simplicity, showing hush understands what ADHD means.

Rivals live in gitignored notes only, per the house rule. Arm sources pinned below.

---

## 1. The free findings, before a single new run

Everything in this section came out of the **already-committed** benchmark records
(`records/claims2-sonnet-4c486329`, 170 runs; `records/claims2-haiku-55fd2b8b`, 102 runs).
No API calls, no new spend.

### 1.1 hush loses on cost in 4 of 5 segments, and the reason is arithmetic

The published README table is a *cost by segment* table, which is hush's single
weakest surface. Sonnet medians:

| Segment | baseline | hush | change |
| --- | --- | --- | --- |
| noisy-output | $0.2211 | **$0.1810** | −18.2% |
| debugging | **$0.1550** | $0.1716 | +10.7% |
| search-heavy | **$0.1288** | $0.1486 | +15.3% |
| coding | **$0.0680** | $0.0820 | +20.7% |
| doc-editing | **$0.2452** | $0.2676 | +9.1% |

Breaking each run's usage into the four priced buckets says the loss is **cache
writes**, not output. Sonnet, per-run means:

| Segment | cacheWrite baseline → hush | Δ$ from that bucket | actual Δ$ |
| --- | --- | --- | --- |
| noisy-output | 25,083 → 17,894 | −$0.0270 | −$0.0416 |
| coding | 9,128 → 12,982 | +$0.0145 | +$0.0116 |
| doc-editing | 13,363 → 22,142 | +$0.0329 | +$0.0538 |

### 1.2 The tax is a fixed number, and it is the product

Reading the **first API call of every session** isolates the static prompt cost
before any tool has run:

```
baseline  mean first-call prompt  28,160 tok
hush      mean first-call prompt  31,726 tok
```

**+3,566 tokens, identical on all 17 tasks.** Composition:

| Piece | tokens |
| --- | --- |
| `output-styles/hush.md` | 2,483 |
| two `SKILL.md` frontmatter descriptions | 396 |
| `plugin.json` description | 52 |
| harness overhead for loading any plugin | ~635 |

At Sonnet's cache-write price that is **$0.0134 a session**, against a $0.0116
gap on the quiet segments. So:

- The output style is 70% of the tax **and it is the product**.
- A faithful lean rewrite that kept every rule, every number and every example
  saved **398 tokens — about $0.0015 a session, an eighth of the gap.**
- **Cost-wins-in-every-segment is arithmetically unreachable** without deleting
  the style. Recorded as settled, not as an open question.

### 1.3 The better benchmark strategy, already evidenced

hush beats baseline **in all five segments, on both models**, on reading load.
New meter: `benchmarks/hush/runner/readability.js` — Flesch Reading Ease,
Flesch-Kincaid grade, words per sentence, long-word share, answer-first rate,
and whether the reply hands the reader something runnable. Published formulas,
same code every arm, no arm's own contract in the scoring.

Sonnet, whole suite:

| | baseline | hush |
| --- | --- | --- |
| words in the final message | 96 | **67** |
| lines | 4 | **3** |
| words per sentence | 15.8 | **12.7** |
| long words (3+ syllables) | 11.0% | **6.8%** |
| Flesch Reading Ease | 65.6 | **80.3** |
| Flesch-Kincaid grade | 8.0 | **5.2** |

Grade 8 prose becomes grade 5 prose. Every segment moves the same way; Haiku
agrees on ease, grade, words, lines and long-word share.

**Meter validity check, free.** Scored against both rivals' own published
before/after pairs, the meter moves hard in the direction they claim, and it
does not flatter hush:

| sample | w/sent | ease | grade |
| --- | --- | --- | --- |
| rival A "before" | 10.6 | 78.6 | 4.9 |
| rival A "after" | 5.2 | **97.4** | 1.0 |
| rival B "before" | 21.0 | 24.4 | 15.1 |
| rival B "after" | 8.8 | **74.7** | 5.0 |
| hush's own README example | 6.6 | 88.0 | 2.6 |

Rival A's published sample reads *easier* than hush's. Their sample is a best
case and ours is real, so it proves nothing — but the contest is real.

### 1.4 One genuine hush defect, on the rival's home ground

`runnable%` — the share of replies carrying a command the reader can run:

| | baseline | hush |
| --- | --- | --- |
| Sonnet | 90.6% | **76.5%** |
| Haiku | 76.5% | **66.7%** |

hush is **worse than no plugin** at handing the reader a next move. That is
rival A's rule 2 and 3 (*knowing the answer is not doing the answer*) and it is
the metric they would win on today. The likely cause is a rule collision inside
hush's own style: *"End on the last fact. No summary paragraph, no restating,
no offer of more help"* reads as a ban on a closing next step.

`answerFirst` is saturated at 100% for both arms on Sonnet, so it discriminates
nothing there and is kept only for Haiku, where baseline reads 68.6% against
hush's 100%.

---

## 2. The arms

One batch, six arms, arms interleaved, seed shared across models. Cost is not
comparable across batches, so nothing here is ever spliced with another run.

| Arm | What it is | Binding | Source pin |
| --- | --- | --- | --- |
| `baseline` | plain Claude Code | — | — |
| `hush` | the shipped plugin | its own settings file | working tree |
| `caveman` | rival, hooks-based compression | its own `SessionStart` hook | `ec83e5b` 2026-08-04 |
| `adhd` | rival, ADHD-shaped output | its own always-on `SessionStart` hook, opted in with the flag file its docs specify | `2d19ad2` 2026-08-06 |
| `simple-english` | rival, controlled technical English | its own shipped output style, wrapped in a uniquely-named plugin | `8487d37` 2026-08-06 |
| `nextstep` | hush + one rule change | copy of hush with the variant style | see §2.2 |

All three rival clones were pulled to latest before the batch, so the version we
race is the version a reader would install.

### 2.1 Harness defect found and fixed: colliding plugin names silently unbind a style

A six-arm smoke produced a clean permutation of wrong styles — the ADHD arm
reported hush's style, the caveman arm reported the STE arm's style, and the two
arms that actually pinned a style got `default`. It reproduced **identically at
`--concurrency 1`**, so it is not a race.

Cause: an arm whose plugin name collides with a plugin already enabled in the
user's own config fails to resolve its output style, and the reported label
comes from elsewhere. The variant hush arm was named `hush`, and `hush@foundry`
is installed globally.

Fix: every style-carrying arm gets a **unique plugin name and a unique style
name** (`hushnext:Hushnext`, `stearm:Ste`). Re-smoked: all six arms bind, and
the reported style matches the arm in every case. Arms that bind through hooks
rather than a style correctly report `default`.

The published `claims2` records were checked for the same contamination and are
**clean** — 170 of 170 and 102 of 102 carry the right style for their arm. Two
arms cannot collide when only one of them names a style.

### 2.2 What the `nextstep` arm changes

Three edits to `output-styles/hush.md`, nothing else:

1. **Final message** gains: *"Close with one thing the reader can do, always.
   Name the command to run, the file to open, or the decision waiting on them.
   When the work is finished, that thing is the command that shows it working.
   Backticks or a code block, exact."*
2. **`End on the last fact`** becomes **`End on the next step`** — removing the
   collision named in §1.4.
3. The **Register redo** grows a tenth step, written as an action rather than a
   check: *"Write your last line as the reader's next move…"*

Pre-flight probes on Haiku, n=3, produced a closing next step in 1 of 3 replies.
The lever looks weak in this frame, a null is a live outcome, and the batch is
what settles it.

**Shipping it would cost no preset churn.** All four presets were verified
against the variant as canonical: `pirate` passes full mode, and `rock`, `glyph`
and `sensei` pass core mode — exactly the state they are in against the current
canonical. The changed line is not one any preset anchors on.

### 2.3 Harness lesson, paid for once

Two things bit, both worth writing down.

**Never interrupt a running batch.** Stopping the parent shell left the runner
alive with no way to spawn `claude`, and it wrote 275 error records in 25
seconds. Records are write-once, so a `--resume` re-runs the key and then
*refuses to retain its good result* — the batch id is permanently unpublishable.
The only recovery is to delete the batch and start a fresh tag and seed. Cost of
the lesson: about $1.30 of real runs thrown away, no API spend on the errors.

**Plumbing probes must not be retained.** Seven smoke and bind-check batches sat
in `records/` afterwards, and the readiness gate correctly dropped to 8 of 10 —
each one is a batch with missing segments and no published claims. Deleting them
restored 10 of 10. Probe records are not evidence and do not belong beside the
evidence. Note that records land read-only, so a delete on Windows needs
`attrib -R records\<batch>\*.* /S` first.

---

## 3. Ship rules, fixed before the numbers arrive

- `nextstep` ships only if `runnable%` rises materially on **both** models with
  cost, ground truth, final-message words and narration flat.
- A move on one model only is noise until a second metric moves with it.
- A null result is a real outcome and gets recorded as one.
- No README edit and no release until the user says go.

---

## 4. Results

### 4.1 Haiku — batch `h2h-haiku-3ef718cd`, 306 runs, 0 harness errors, ~$14

Seed `1786061500000`, 17 tasks × 6 arms × 3 reps, arms interleaved. Sonnet shares
the seed so the arm order is paired.

**Silence — hush's cleanest win, and it is not close.**

| Arm | silent runs | loudest run | median narration |
| --- | --- | --- | --- |
| **hush** | **50 of 51** | 118w | 0 |
| nextstep | 48 of 51 | 61w | 0 |
| caveman | 27 of 51 | 84w | 0 |
| adhd | 18 of 51 | 146w | 13 |
| baseline | 15 of 51 | 221w | 28 |
| simple-english | 14 of 51 | 229w | 38 |

Every rival is a wording tool. Only hush also stops the play-by-play, and the gap
between 50 of 51 and the next-best rival at 27 of 51 is the whole product.

**Token saving — MIXED, not the win the goal asked for.**

| | baseline | hush | caveman | adhd | simple-english |
| --- | --- | --- | --- | --- | --- |
| suite **mean** cost | $0.0547 | **$0.0530** | $0.0542 | $0.0584 | $0.0557 |
| suite **median** cost | **$0.0485** | $0.0505 | $0.0492 | $0.0545 | $0.0530 |
| suite mean traffic | 160,877 | **155,142** | 162,478 | 182,554 | 160,474 |
| suite median traffic | 156,802 | 180,951 | **147,784** | 149,796 | 148,704 |
| suite mean output tok | 1,932 | 1,877 | **1,612** | 1,865 | 1,980 |

hush takes both **means**. caveman takes both **medians** and wins output tokens
outright by 14%. Read honestly: hush's advantage is in the tail — it flattens the
expensive sessions — while caveman is cheaper in the typical one. Claiming "beats
caveman on token saving" off the mean alone would be picking the statistic that
flatters us, which is exactly what this repo's own rules forbid.

**Reading effort — hush leads, but not on every column.**

| Arm | words | lines | w/sent | long words | Flesch ease | FK grade | answer first | runnable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 86 | 6 | 9.7 | 12.4% | 64.5 | 6.7 | 56.9% | 70.6% |
| **hush** | 50 | **2** | 11.6 | **8.5%** | **75.3** | 5.6 | 100% | 66.7% |
| nextstep | 65 | 3 | 12.5 | 9.1% | 73.6 | 6.1 | 100% | 66.7% |
| caveman | **38** | 3 | **6.6** | 10.8% | 70.2 | **5.1** | 100% | 60.8% |
| adhd | 59 | 4 | 9.5 | 9.7% | 72.8 | 5.5 | 100% | **78.4%** |
| simple-english | 74 | 5 | 10.2 | 11.1% | 67.8 | 6.3 | 68.6% | 68.6% |

hush wins Flesch ease, lines and long-word share against every arm. It loses
words per sentence to caveman and adhd, ties grade with adhd, and **loses the
runnable-step column to adhd by 12 points** — the §1.4 defect, confirmed against
the rival that claims it.

**The `nextstep` arm is refuted on Haiku.** `runnable%` is **66.7%, identical to
stock hush** — the rule moved nothing. It also made replies longer, 50 → 65 words,
pushed words per sentence 11.6 → 12.5, pushed the over-cap rate 28.8% → 31.9%, and
cost slightly more. All cost, no benefit. Sonnet decides whether this is a null or
a regression, but it cannot ship on these numbers.

**Ground truth.** baseline 51/51, caveman 51/51, hush 49/51, nextstep 49/51,
adhd 49/51, simple-english 47/51. hush's two misses are a real, small honest loss
against caveman's clean sheet.

**Cap conformance, every arm scored by hush's own contract.** caveman breaches the
15-word cap on 3.9% of units against hush's 28.8% — a telegraphic register obeys a
length cap almost by construction. hush is the only arm that never breaks 12 lines,
0 of 51 against baseline's 7 and adhd's 7.

### 4.2 Sonnet — batch `h2h-sonnet-2c5df75b`, 306 runs, 0 harness errors, $55.62

Same seed, same arm order. **Total spend for the head-to-head: $69.62 across 612
runs**, plus about $1.10 of pre-flight probes and $1.30 lost to the restart —
**$72.02 against a $72 quote.**

**Silence — the one unambiguous win, and it holds on both models.**

| Arm | silent, Sonnet | loudest, Sonnet | silent, Haiku | loudest, Haiku |
| --- | --- | --- | --- | --- |
| **hush** | **48 of 51** | **21w** | **50 of 51** | 118w |
| nextstep | 47 of 51 | 29w | 48 of 51 | 61w |
| caveman | 22 of 51 | 107w | 27 of 51 | 84w |
| baseline | 21 of 51 | 258w | 15 of 51 | 221w |
| adhd | 19 of 51 | 178w | 18 of 51 | 146w |
| simple-english | 16 of 51 | 231w | 14 of 51 | 229w |

Every rival is a wording tool. hush is the only one that also stops the
play-by-play, and no rival gets within 2× of it on either model.

**Token saving — hush LOSES to caveman. Goal 2 is not met.**

Sonnet, whole suite:

| | baseline | hush | caveman | adhd | simple-english |
| --- | --- | --- | --- | --- | --- |
| mean cost | $0.1789 | $0.1813 | **$0.1749** | $0.1826 | $0.1904 |
| median cost | $0.1652 | $0.1657 | **$0.1629** | $0.1761 | $0.1694 |
| mean traffic | 198,839 | 196,587 | **179,203** | 194,390 | 191,703 |
| mean output tok | 1,648 | 1,418 | **1,161** | 1,258 | 1,781 |

caveman takes **every** cost and token column on Sonnet, and it is the only arm
cheaper than baseline. On Haiku hush took the two means and caveman took the two
medians and output tokens. Pooled honestly: **caveman is the better token saver on
the current suite, and hush is not.**

This is a real change from the 2026-07-18 head-to-head, where hush beat caveman by
18% on both models. Two things moved. The suite grew from 7 tasks to 17 and now
carries five segments, three of which have almost no machine output to trim. And
the rival is two months newer — pinned here at `ec83e5b`, not the June clone. Both
changes are in the rival's favour and both are legitimate.

**Reading effort — hush wins the readability columns on both models, and loses actionability.**

Sonnet:

| Arm | words | lines | w/sent | long words | Flesch ease | FK grade | runnable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 96 | 4 | 15.4 | 10.5% | 68.4 | 7.5 | **94.1%** |
| **hush** | 74 | 3 | 12.9 | **7.0%** | **79.9** | 5.3 | 76.5% |
| nextstep | 78 | 4 | 12.5 | 7.4% | **79.9** | 5.2 | 82.4% |
| caveman | **45** | 3 | **8.8** | 9.5% | 70.9 | 5.5 | 74.5% |
| adhd | 48 | 3 | 10.5 | 8.2% | 77.3 | **5.1** | 82.4% |
| simple-english | 80 | 4 | 12.7 | 7.1% | 76.7 | 5.7 | 90.2% |

Cross-model, only these hold in the same direction on **both** Sonnet and Haiku:

- **hush wins Flesch Reading Ease against every arm** — 79.9 and 75.3, ahead of
  the ADHD tool's 77.3 and 72.8 and well ahead of caveman.
- **hush wins the long-word share against every arm** — 7.0% and 8.5%.
- **hush and the ADHD tool tie on grade level** — 5.3/5.1 and 5.6/5.5.
- **The ADHD tool wins words per sentence** — 10.5/9.5 against 12.9/11.6.
- **The ADHD tool wins the runnable next step** — 82.4%/78.4% against 76.5%/66.7%.

So goal 3 is a **split, not a win**: hush's prose is the easiest to read by the
published measures, and the rival is more actionable and writes shorter sentences.
Both claims are defensible and neither tool sweeps.

**hush is the only arm that never overruns its own line cap** — 0 of 51 on Haiku
and 0 of 51 on Sonnet, against baseline's 7 and 9 and the ADHD tool's 7 and 9.
caveman breaches the 15-word cap least (15.8% and 3.9%) because a telegraphic
register obeys a length cap by construction.

### 4.3 The `nextstep` arm — REFUTED against the pre-registered rule

The rule, fixed in §3 before any number arrived: *ships only if `runnable%` rises
materially on **both** models with cost, ground truth and narration flat.*

| | Sonnet | Haiku |
| --- | --- | --- |
| `runnable%` hush → nextstep | 76.5% → **82.4%** | 66.7% → **66.7%** |
| ground truth | 50/51 → **48/51** | 49/51 → 49/51 |
| mean cost | $0.1813 → $0.1825 | $0.0530 → $0.0543 |
| final-message words | 74 → 78 | 50 → 65 |

It moved on Sonnet and **did nothing at all on Haiku**, while ground truth fell two
runs on the model where it worked. That is one model plus a second metric moving
the wrong way — the definition of noise under this repo's own rule. **Does not
ship.** Two of nextstep's three Sonnet misses are on `explain-rerender`, which took
down stock hush too, so the correctness dip is partly task noise — but the rule
does not have a clause for partly.

Worth recording for whoever revisits this: the +5.9 points on Sonnet is the first
sign that the `End on the last fact` line really is suppressing a closing next
step. The lever is real on the bigger model and absent on the smaller one. A future
attempt should target the collision directly rather than adding a redo step.

### 4.4 Ground truth, all 612 runs

Sonnet: baseline 50/51, hush 50/51, caveman 50/51, simple-english 49/51,
nextstep 48/51, adhd 48/51. Haiku: baseline 51/51, caveman 51/51, hush 49/51,
nextstep 49/51, adhd 49/51, simple-english 47/51.

Seven of the 21 misses across both models are on `incident-followup`, which took
down baseline and caveman as well — task noise, not an arm effect.

---

## 5. Verdict against the three goals

**Goal 1 — beat baseline everywhere, or find a better benchmark strategy. MET, by
the second route.** The first route is closed by arithmetic, not by effort: §1.2
measures a fixed 3,566-token tax and the output style is 70% of it. The second
route is open and already evidenced: hush beats baseline in all five segments on
both models on words read, lines, long-word share, Flesch ease and grade level, and
it is silent in 48 and 50 sessions of 51 while no rival clears 27.

**Goal 2 — beat caveman on token saving. NOT MET.** caveman takes every cost and
token column on Sonnet and the medians plus output tokens on Haiku. The July win was
real on a 7-task suite against a June build; on the 17-task suite against `ec83e5b`
it does not survive. Nothing here is fixable by tuning — caveman is a shorter prompt
that writes shorter answers, and hush carries a style file it exists to carry.

**Goal 3 — beat the ADHD tool on wording and simplicity. SPLIT.** hush wins Flesch
Reading Ease and long-word share on both models, ties grade level, and loses words
per sentence and the runnable next step on both. The honest claim is *"the easiest
prose"*, not *"the most ADHD-friendly output"* — and the second claim is one the
rival can currently defend better than we can.

### What the README should say, if the user wants it changed

Nothing has been edited. This is the proposal, and it needs an explicit go.

> **Correction 2026-08-18.** Points 1, 2, 3 and 5 all shipped — the reading-effort
> table in 1.2.1, the lead chart in 1.3.0, the charts regenerated per ADR 0001/0002.
> **Point 4 is contradicted by the shipped product:** `hush/README.md` now carries a
> reading-effort table that names three rival projects, shipped in 1.2.1. The
> prohibition was never lifted anywhere; it was simply overtaken. It is recorded
> only here and in session memory — not in a rule or an ADR — so a future README
> pass needs it settled as a decision rather than met as a line in an old proposal.
> That call sits in `hush-consolidation-2026-08-18.md`.

1. **Lead with silence and reading load, not cost.** Both are wins in every
   segment on both models, and cost is not.
2. **Keep the cost table, unchanged in its honesty.** The noisy rows still win by
   18%, the quiet rows still lose, and the reason is now a measured number rather
   than a hand-wave: hush adds 3,566 tokens to every session.
3. **Add the reading-effort table** from `runner/readability.js`, generated from
   the committed records like every other figure.
4. **Do not add a rival-comparison table.** We lose the token comparison and split
   the wording one. Naming a rival in a README is allowed here, but naming one we
   lose to, in the section where we lose, is not marketing.
5. **The charts must be regenerated** from `records/h2h-sonnet-2c5df75b` before
   any of this ships, per the poster ADRs — every published figure is plotted from
   committed records.

### What ships from this batch

**Nothing to the plugin.** The `nextstep` arm failed its pre-registered rule and
is not being merged. The only durable products are the meter, its tests, the two
published record sets and this report.

---

## Appendix — reproducing the free numbers

```
node runner/readability.js --records records/claims2-sonnet-4c486329 --by-segment
node runner/caps.js        --records records/claims2-sonnet-4c486329
```

`readability.js` ships with 23 tests in
`benchmarks/hush/tests/benchmark_readability.test.js`; every formula expectation
is worked out by hand rather than asked of the production regex. Harness suite
157 of 157.

Ceiling, stated the way `caps.js` states its own: this is a regex pass over
markdown. Syllables come from a vowel-group heuristic that is wrong on some
words in every English text, and wrong the same way for every arm — which is
what makes the comparison fair and the absolute number soft. Flesch was fitted
to prose, not to a bulleted engineering report, so a grade level here is a
relative signal between two texts scored by the same version, never a literacy
verdict.
