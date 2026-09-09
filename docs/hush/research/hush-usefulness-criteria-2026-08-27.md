# hush 1.8.0 has no shape — the measured gap, and four criteria that would have caught it

Date: 2026-08-27. Owner report: the 1.8.0 voice "meets expectations but lacks
personality or structure", and two user questions from the field — does the
silence rule make Claude derail, and is the short message actually *clear*.

**Verdict: the complaint is real and measurable, and the goal criteria we
shipped 1.8.0 against could not see it.** The rewrite optimised silence, reading
ease, grade and word count. Nothing scored whether the message had a shape.

## 1. The gap, scored from records already on disk (no new spend)

Re-scored `benchmarks/hush/records/rm280-7e554675` (Opus 5, medium, 6 arms ×
8 jobs × 2 reps) and `sn280-adf3c9cf` (Sonnet, hush vs plain) for markdown
structure. Counts are per final message, mean over 16 runs per arm.

| arm (rm280, Opus) | bold | headings | table% | bullets | paragraphs | code spans | links |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (plain Claude) | 8.63 | 2.13 | 56% | 3.69 | 10.63 | 22.69 | 0.00 |
| adhd | 7.00 | 2.13 | 38% | 3.50 | 10.63 | 20.00 | 0.00 |
| ste | 4.38 | 2.75 | 50% | 7.06 | 12.50 | 20.94 | 0.00 |
| Concise (built-in) | 4.63 | 1.44 | 38% | 3.31 | 7.25 | 13.69 | 0.00 |
| caveman | 3.00 | 1.69 | 31% | 5.13 | 9.56 | 15.69 | 0.00 |
| **hush 1.8.0** | **0.00** | **0.00** | **0%** | **0.69** | **2.88** | **3.25** | **0.00** |

Sonnet agrees: hush 0.81 bold, 0 headings, 0 tables, 0.25 bullets against plain
Claude's 3.69 / 0.31 / 0% / 2.38.

**hush emitted zero bold marks, zero headings and zero tables in 32 measured
sessions across both models.** It is the only arm in the suite that does. The
one shape it does keep is paragraph segmenting, and only barely: 2.88 blocks
against plain Claude's 10.63.

Anchored file links are a **shared** miss — every arm scores 0.00, plain Claude
included. The eight bench jobs never ask for a file the reader must open, so the
suite cannot currently see the behaviour the owner's four sample replies show.
That is a task-coverage hole, not a hush regression. Fix it in the suite before
scoring it against an arm.

Scorer used: a regex pass over `finalText` with fenced blocks excluded, written
in the scratchpad first and since promoted to the harness as
`runner/structure.js` — see §4.

## 2. Why it happened

1.7.1 carried an explicit shape section. The from-scratch 1.8.0 rewrite dropped
it, and no goal criterion missed it. Three clauses died:

- **The shape table** — one fact → one sentence; two or three → say it out loud;
  four or more → paragraph or list; distinct sections → *a bold topic lead*.
- **"Same lines, better shape"** — ordered steps become a numbered list,
  commands and errors go in a code block, three or more rows of the same fields
  become a table, a flow gets an ASCII sketch that does not count against the
  line cap.
- **"The reader should never have to ask what you meant. If a line would send
  them back with 'what does that mean' or 'tell me more', it failed. Rewrite
  that line. Do not add one."** This is the exact clause that answers field
  complaint #2, and 1.8.0 has no successor to it.

Corroboration in the harness: `runner/caps.js:83` still carries a comment about
letting a **bold topic lead** close a sentence, and `unitsOf` still exempts table
rows because "the style routes repeated fields into a table on purpose". The
meter still expects a style that no longer exists.

One clause should stay dead: 1.7.1's ✗/✓ worked example. Examples measured
neutral-to-harmful on Opus twice (`scr1` in 1.7.0, `moss` in o5b).

1.7.1 also actively banned pointing the reader at a file ("Never point them at
code, a file or a link to find out what happened"). If anchored links are now
wanted, that is a deliberate reversal, not a restoration.

## 3. The two field questions, answered from the same records

**"Did you benchmark Claude actually doing work? Won't it derail without
mid-turn talk?"** Measured, and no.

| rm280 (Opus, 16 runs each) | ground truth | tool calls | turns | final words | mid-turn words |
| --- | --- | --- | --- | --- | --- |
| hush | 16/16 | 14.8 | 16.7 | 62 | 2.6 |
| baseline | 16/16 | 15.7 | 17.6 | 426 | 28.5 |

Sonnet: 16/16 both arms, hush 16.4 tool calls against 14.5. Every job is real
multi-turn work against a ground-truth check. hush does the same volume of work
and lands the same verdicts. The silence rule moves narration into thinking,
which the style says explicitly — it does not shorten the work.

**"Concise but not clear — sometimes I still have to ask what you mean."**
Partly measured, and the measured part is thin. Reading ease is 86.5 against
plain Claude's 70.7, grade 2.6 against 6.5 — those are *word-level* proxies.
Fact coverage against the task rubric is 98% (Opus) and 96% (Sonnet), but each
rubric is only three keywords wide, so it is a floor, not proof of completeness.
**Nothing in the harness measures whether a reader could act without asking a
follow-up.** That is criterion 4 below, and it is the one worth building.

## 4. The four criteria, as scorers

| criterion | status | how it scores |
| --- | --- | --- |
| **Readability** | exists — `runner/readability.js` | Flesch ease, FK grade, words/sentence, long-word %, answer-first %. Add: unglossed-identifier rate — a name the reader has not met, shipped without the three plain words the style promises. |
| **Silence** | exists — `narrationWords` | Sharpen the definition: today "silent" means zero mid-turn words. Add `assistantMsgs` to `parseTranscript` (one line — `m.assistantTexts.length` is already computed) and score **exactly one assistant message per turn**, which is what the style actually promises. |
| **Facts** | half exists — `check.score` | Promote rubric coverage from pass/fail to a percentage column in the reports. It is already stored per record and nobody reads it. Widen the rubrics past three keywords, or it stays a floor. |
| **Usefulness** | **new** | `structure.js` above, scored as **bands, not maxima**. |

**Built, 2026-08-27.** All four are now in the harness, and three of them cost
nothing to run:

- `benchmarks/hush/runner/structure.js` — the Usefulness scorer, same CLI shape
  as `readability.js` (`--records`, `--tag`, `--by-segment`), with 15 tests in
  `tests/benchmark_structure.test.js` pinned to literal sample messages.
- `metrics.js` now records `assistantMsgs`, and `report.js` carries **Rubric
  coverage**, **Silent** and **One message** columns in the arm summary. A batch
  written before the field existed prints a bare dash there rather than a zero.
- `benchmarks/hush/runner/answerable.js` — the fifth scorer, and the only paid
  one. A fresh Sonnet session with no plugins, no style and no tools sees the
  original request and the one reply, then answers the three fixed questions or
  says `NOT IN THE REPLY`. It reports `answered` out of three and `recovered`,
  the share of the task's own rubric facts that survive **into those answers**
  rather than merely sitting somewhere in the message. The oracle is
  `tasks.json`, never the style's rules — and the honest ceiling is in the file
  header: a judge that quotes the reply wholesale scores like a grep, so
  `recovered` is a floor on reachability, not a comprehension score. It prints
  its plan and spends nothing without `--go`. 13 tests in
  `tests/benchmark_answerable.test.js`.
- Suites after the change: 229 harness, 524 hush.

What the Usefulness scorer says about the shipped 1.8.0 records, free:

| arm | bold | in band | link | table% | blocks | in band |
| --- | --- | --- | --- | --- | --- | --- |
| baseline | 8.63 | 37.5% | 0.00 | 56.3% | 10.6 | 18.8% |
| i-have-adhd | 7.00 | 37.5% | 0.00 | 37.5% | 10.6 | 18.8% |
| simple-english | 4.38 | 31.3% | 0.00 | 50.0% | 12.5 | 12.5% |
| Concise | 4.63 | 25.0% | 0.00 | 37.5% | 7.3 | 43.8% |
| caveman | 3.00 | 12.5% | 0.00 | 31.3% | 9.6 | 25.0% |
| hush 1.8.0 | 0.00 | **0.0%** | 0.00 | 0.0% | 2.9 | **93.8%** |

Read as bands rather than totals, the picture flips halfway: **hush already wins
segmenting outright** — 93.8% of its notes carry two to four blocks, against
12–44% for every rival, which pile on ten or more. It is **signaling** it has
none of. That is one missing lever, not a missing shape.

Band targets for Usefulness, and the reason each is bounded rather than
maximised — signaling goes **negative** when mis-aimed (Gier et al., in
[[comprehension-evidence]]: pre-supplied highlighting of the wrong content
damaged both comprehension and the reader's own calibration):

- Bold: 1–3 marks, always on the same thing (the outcome), never a whole line.
- Segmenting: 2–4 blocks separated by a blank line. Confirmed lever,
  d ≈ 0.32–0.36.
- Table: only for three or more rows carrying the same fields. Zero otherwise.
- Code span: every proper name, file, flag, command and error, exact.
- Anchored link: when the reply names a file the reader should open, it ships as
  `[file.js:37](path/file.js:37)`. Needs a bench job that has a file to open.

The fifth scorer, and the only one that answers the field complaint directly:

- **Answerable** — a blind judge (Sonnet, per the no-Haiku rule) sees the task
  prompt and the final message **only**, then answers three fixed questions per
  job: what broke, which file or thing to open, what to do next. Score = correct
  answers / 3. Not circular: the judge never sees hush's rules, and the oracle
  is the task's ground truth, not the production predicate.

## 5. Candidate arms, if a batch is approved

All four are `output-styles/hush.md` edits only, hooks held constant, unique
plugin and style names per arm.

| arm | change |
| --- | --- |
| A `hush` | shipped 1.8.0, control. |
| B `shape` | A + a short shape section in the file's own register: bold the outcome once, blank line between blocks, code-span every name, table only for 3+ parallel rows, link a file the reader must open. **Caps unchanged at 6 lines / 60 words.** |
| C `shape+` | B with the word cap at 90 and the line cap at 8. Three of the owner's four sample replies are 75–95 words, so the shape they show is not reachable at 60. |
| D `askless` | C + the restored "never send the reader back asking what you meant" clause. |

Known trap, and the reason B exists as its own arm: foreman §4.1 measured that
prescribing an output shape **lengthens** the final message, and it was declined
on that basis ([[foreman-prompt-eng-measured]]). The 6/60 caps were themselves a
measured win on 2026-08-25 — halving them cost no correctness and no silence, so
C and D are deliberately spending a shipped gain and must earn it back on
Usefulness and Answerable.

### Cost, and how to spend far less than $37

The $37 figure is **96 runs**: 4 arms × 8 jobs × 2 reps on Opus (64 runs, $30 at
the rm280 hush mean of $0.470) plus 2 arms × 8 × 2 on Sonnet (32 runs, $7.54 at
the sn280 hush mean of $0.236). Two things make it much cheaper.

**The control arm is already paid for.** `rm280-7e554675` holds 16 hush 1.8.0
runs on these exact eight jobs, Opus 5 at medium effort, and `sn280-adf3c9cf`
holds 16 more on Sonnet. Structure, readability, silence and fact coverage are
all comparable across batches, so arm A never needs to run again for this
decision. **Cost is the one number that is not comparable across batches** —
a warm cache halves it — so any cost delta needs a fresh interleaved pair, and
this decision does not turn on cost.

**Opus cost per job is a 3.5× spread**, so the job list drives the bill more
than the arm count:

| job | $/run | | job | $/run |
| --- | --- | --- | --- | --- |
| dep-bump-warnings | 0.250 | | release-digest | 0.534 |
| failing-suite | 0.257 | | incident-forensics | 0.538 |
| log-triage | 0.269 | | feature-drift | 0.662 |
| rename-scope | 0.383 | | repo-sweep | 0.868 |

One rep of one arm costs $3.76 over all eight, $1.76 over the four that carry
the shape opportunities: dep-bump-warnings and rename-scope have parallel rows
that want a table, failing-suite names a file, repo-sweep is the suite's
historical silence killer and its most expensive job.

Staged plan, cheapest gate first. Stop at any stage that fails.

| stage | runs | cost | what it settles |
| --- | --- | --- | --- |
| 0 — probe | 4 (arm D only, 4 jobs, 1 rep) | **$1.76** | Does any shape appear at all? If bold and tables stay at zero, the idea is dead and nothing else runs. |
| 1 — screen | 12 (arms B, C, D × 4 jobs × 1 rep) | **$5.28** | Which shape rule fires, and whether the bigger caps in C are needed. |
| 2 — validate | 32 (winner + fresh control × 8 jobs × 2 reps) | **$15.04** | The winner on the full suite, with a fresh interleaved control so cost is comparable. |
| 3 — Sonnet confirm | 32 (2 arms × 8 × 2) | **$7.54** | Cross-model check, only if stage 2 says ship. |

Stage 0 plus stage 1 is **$7 for 16 runs** and answers the design question.
Full path to a ship decision is **$29.62 for 80 runs**, against $37 for 96.
Nothing publishes without an explicit go.

## 6. Stage 1 result — the shape rules fire, and reading gets *better*

Ran the screen instead of the probe: the probe arm is inside the screen, so
$5.28 for 12 runs answers strictly more than $1.76 for 4 and costs less than
running both. Batch `shp1-c38fe11f`, Opus 5 at medium effort, 4 jobs × 3 arms ×
1 rep, **$4.48 actual**. Control is the rm280 hush and baseline runs on the same
four jobs, already paid for. Records archived to `records-archive/`; the
readiness gate still reads 10 of 10.

| arm | n | facts | truth | silent | words | lines | ease | grade | bold | link | table% | $/run |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 8 | 100% | 8/8 | 0/8 | 301 | 11.9 | 73.4 | 6.3 | 4.63 | 0.00 | 50% | 0.438 |
| hush 1.8.0 | 8 | 100% | 8/8 | 2/8 | 42 | 3.8 | 88.7 | 2.2 | **0.00** | **0.00** | **0%** | 0.440 |
| B `shape` | 4 | 100% | 4/4 | 3/4 | 59 | 5.5 | 90.1 | 2.2 | 1.00 | 0.75 | 50% | 0.350 |
| C `shapeplus` | 4 | 100% | 4/4 | 1/4 | 71 | 6.8 | **98.1** | **1.1** | 1.00 | **1.25** | **75%** | 0.409 |
| D `askless` | 4 | 100% | 4/4 | 1/4 | 62 | 5.3 | 89.4 | 2.3 | 1.00 | 1.00 | 50% | 0.362 |

1. **The rules bind, and they bind precisely.** Every arm lands exactly 1.00
   bold mark per note — the rule says one mark and gets one mark, not four like
   plain Claude. Anchored file links appear for the first time anywhere in this
   campaign: no arm, hush or baseline, had ever produced a single one.
2. **Reading did not pay for it. It improved.** Ease 89.4–98.1 against the
   control's 88.7, grade 1.1–2.3 against 2.2. C is the best-reading arm ever
   measured here. The signaling and segmenting literature predicted exactly
   this; the fear that structure costs plainness is not supported.
3. **Silence held.** The leaks are the same 6–9 word turn-opener the control
   produces, and the control leaks on **6 of its 8 runs on these same four
   jobs**. No arm is worse than shipped 1.8.0. At n=4 the arm-to-arm silence
   spread is noise.
4. **Words rose modestly.** 59–71 against the control's 42, still four to five
   times shorter than plain Claude's 301. Facts stayed at 100% and ground truth
   at 12/12.
5. **B breaks its own contract.** It keeps the 60-word cap and then ships a
   98-word note the moment a table is right. C states 90 and delivers 71 — its
   contract matches its behaviour, which matters for a file whose own register
   transfers to the output.
6. **D bought nothing measurable and cost a rule.** The restored clarity clause
   moved no column, and D's dep-bump note closed with "Say the word and I clear
   them" — an offer of more help, which the style bans by name. D cannot be
   judged properly until the Answerable scorer exists.

Sample, arm D, dep-bump-warnings, 70 words — the shape the owner asked for:

> **Build passes now.** Two real bugs from the bump, not noise.
>
> | File | Bug | Fix |
> | --- | --- | --- |
> | `src/core/options.js:6` | `retries` renamed to `retryCount` | Read either key |
> | `src/net/retryPolicy.js:7` | Unset flag is now `undefined`, threw | Treat as `false` |
>
> The 8 remaining warnings are real deprecations. Things like `Buffer()` and
> `punycode`. They do not break the build.

(File cells ship as real anchored links in the record; flattened here.)

**Recommendation: take C into stage 2**, 8 jobs × 2 reps against a fresh
interleaved control, $15.04. Keep B as the fallback if stage 2 shows a silence
or cost price. Drop D until Answerable is built. Cost per run in the table above
is **not** cross-batch comparable — warm cache — which is exactly why stage 2
runs its own control.

## 7. What a README re-measure costs, and why hush alone is not enough

**A hush-only re-run cannot carry the page.** Every published figure is a
comparison, and **cost is not comparable across batches** — a warm cache halves
it, which is why the house rule is one batch with the arms interleaved. Re-run
hush alone and its new cost sits against a baseline billed under different cache
conditions. The readiness gate also traces each README cost figure back to a
record in `records/`, so a figure whose two halves come from two batches has no
single record that produces it.

What actually moves when the stock style changes:

| README part | needs a run? | arms it needs |
| --- | --- | --- |
| `assets/hero.svg` — 83-word peak, silent 10 of 16 | yes | hush + baseline |
| `assets/bench-cuts.svg` — chars, chatter, tokens, cost | yes | hush + baseline |
| Per-job cost table, 8 rows | yes | hush + baseline |
| "40% fewer words", "22% saving", "a ninth of the words" | yes | hush + baseline |
| Sonnet section, and "All 32 sessions got the job right" | yes | hush + baseline, Sonnet |
| Why-not-Concise section — 24.9k chars, 37% and 26% cheaper, 10 of 16 vs 1 | yes | + Concise |
| Reading table, three community rows | **no** | reading and silence are arm-intrinsic and carry no cache effect |
| Line 30 — "six lines, sentences of about eight words" | no | prose edit to eight lines and ninety words |
| The quoted sample reply | no | copy a real note out of the new batch |
| Footnote — "six setups, two runs each" | no | prose, must match whatever ran |

`rm280-7e554675` cost **$46.87** for six arms and `sn280-adf3c9cf` **$7.91** for
two. Repeating both is about **$55**.

**Cheaper and still honest, about $32:** run hush, baseline and Concise
interleaved on Opus 5 at medium effort, 8 jobs × 2 reps — 48 runs, roughly $24
by rm280's per-arm actuals — then hush and baseline on Sonnet, 32 runs, $7.91.
Keep `rm280` in `records/` where it already is, and let the three community rows
in the reading table stand as the earlier run of the same eight jobs, labelled as
such. That costs one sentence of provenance at line 158, which currently claims
"same eight jobs, same run".

The Opus half of that is the same batch stage 2 needs, so the validation and the
README basis are one purchase, not two.

### Why the old baseline cannot simply be reused — measured, free

The identical `baseline` arm — plain Claude, no plugin, the same eight jobs, the
same model — in two Opus batches two days apart:

| job | 08-25 `opus270` | 08-27 `rm280` | delta |
| --- | --- | --- | --- |
| rename-scope | $0.643 | $0.400 | **−38%** |
| incident-forensics | $1.307 | $0.859 | −34% |
| dep-bump-warnings | $0.361 | $0.266 | −26% |
| feature-drift | $1.053 | $0.839 | −20% |
| log-triage | $0.598 | $0.487 | −19% |
| failing-suite | $0.307 | $0.263 | −14% |
| repo-sweep | $0.747 | $0.824 | +10% |
| release-digest | $0.682 | $0.864 | **+27%** |
| **total** | **$5.70** | **$4.80** | **−16%** |

Behaviour moved too: 565 final words against 426, 80.6 words of mid-turn
narration against 28.5, and repo-sweep's tool calls 22.5 against 35.0.

Part of that gap is an effort difference — `rm280` ran at medium and the 1.7.1
README never claims an effort for `opus270` — **and that is the argument, not a
caveat**: `batch.json` records model, arms, reps and seed, but **not effort**, so
a reused arm can carry a difference nobody can see afterwards. Published deltas
on that page are −6% for dep-bump and −4% for rename-scope. Drift of this size
does not adjust those numbers, it replaces them.

The within-batch floor, for scale: inside `rm280`, the same baseline arm on the
same job across its two reps differs by 1–19% on seven jobs and **163%** on
repo-sweep. That is why the page tells readers to read the direction, not the
decimal — and why both halves of a delta have to come out of the same batch.

### So: buy nothing yet

The style is installed and the owner is trying it by hand. Nothing on the README
should change until that trial says ship. At that point it is **one** purchase of
about $32, not a stage-2 batch and then a README batch — the same three-arm Opus
run answers both. Until then, every comparison worth making about the new voice
is arm-intrinsic — structure, reading, silence, fact coverage — and those came
free out of `shp1` and the records already on disk.

## 8. What this does not settle

- n=2 per cell is the house noise floor. Structure counts are far apart enough
  to read at n=16 per arm; Answerable will not be.
- The four sample replies the owner rated as good are hand-picked from real
  sessions, not from the suite. They are a target shape, not a measurement.
- Expertise reversal is the one sign-flipping moderator in the comprehension
  literature: more assistance helps low prior knowledge (d = +0.505) and hurts
  high (d = −0.428). hush cannot know which reader it has, so hold structure
  constant and vary only depth.

## 9. The DevEx evaluation framework, weighed against these criteria

The owner supplied a survey of agent-output evaluation — five weighted pillars,
an anti-pattern catalogue, and a composite Agent Quality Score. **Verdict: it
confirms the criteria rather than extending them. One column adopted, one
proposal rejected outright, the rest already covered or out of scope.**

| its pillar | ours | standing |
| --- | --- | --- |
| Readability & Cognitive Load | Readability | covered, and it agrees the metric is weak — see below |
| Interaction Cadence & Context Compaction | Silence | covered twice over: the silence rule and the tool-output trim are the two things hush already ships |
| Grounding & Completeness | Facts | covered by rubric coverage |
| Structural Scaffolding & Actionability | Usefulness | covered, and it named one thing we were missing |
| Correctness, Safety & Scope Hygiene | ground truth | covered for hush; scope creep is razor's subject, not a style's |

**Adopted: anchored links.** The survey's actionability pillar separates naming
a file from handing the reader the file, with a line and column. `structure.js`
now reports `anchored%` — the share of an arm's links that carry a line —
reported as null rather than zero when an arm never linked, because "linked
badly" and "never linked" are different failures. Free, and it is the one habit
every reply the owner rated as good already had. On `shp1` all three shape arms
anchor **100%** of their links.

**Rejected: the weighted composite (`AQS`).** Five dimensions collapsed into one
number by weights nobody measured — 20/20/25/20/15 appear with no derivation.
A composite hides exactly the trade-off this work exists to see: hush buys
silence and brevity by spending completeness, and a single score would price
that swap for us at weights we invented. Keep the columns separate and let the
reader see the swap.

**Rejected: `LM-CC` and Intrinsic Complexity Points.** Both score *code*
complexity, not the message, and the formula arrives without a source we can
check. The survey's own pillar-1 text says classical readability metrics
predict nothing once length is controlled — which is a warning about our
Readability criterion, not an argument for its replacement. Our own 2026-07-19
deep-research pass reached the same place from the literature side: **every**
sentence-length, word-count and reading-grade threshold failed verification.
That is precisely why the fifth scorer is `answerable.js` and not a better
formula.

**Treat its numbers as hypotheses.** "43% of AI code modifications fail in
production", "$r = 0.92$–$0.97$ judge-human alignment", the 31.3% and 22.0%
comprehension gains — all arrive unsourced, and they have the shape of the
claims that did not survive adversarial checking last time. Nothing here should
be quoted as measured.

**Held, not adopted:**

- *Persona-conditioned judging.* The survey reports better human alignment when
  the judge is given a developer persona. Tempting for `answerable.js`, but
  conditioning the judge on hush's own reader — tired, skimming, ADHD — puts the
  style's premise inside its own oracle. If it is tried, it goes behind a flag
  and never becomes the default.
- *Lazy-placeholder and scope-drift detection.* Real failures, aimed at agents
  that write code. hush's rule "past three items, give the count" is deliberate
  summarising, and a naive truncation detector would score it as laziness.

**Net: the criteria set is enough.** Four free scorers, one paid, one new
column. The gap that remains is not another dimension — it is that `answerable`
has never been run.

## 10. Open items, in the order they matter

Status, 2026-08-27: **1 and 3 are done** — 1's result is §11, and 3 shipped as
the `crash-origin` task described below. **2 is the owner's to judge.** 4 and 5
are held for an explicit go.

1. **DONE — ran `answerable.js` on `rm280`.** 32 judge calls, one per record. It is the
   only criterion with no data behind it, and it is the one aimed at the field
   complaint. One tool-less single-turn call is far below `sn280`'s $0.236 per
   full session, so the whole pass should land near a dollar. It prints its plan
   and spends nothing without `--go`.
2. **The hand trial — the owner's call.** `shapeplus` is installed in the repo
   and in the live plugin cache, with the stock file backed up beside it. It
   binds in a **new** session, not this one. To put stock back:

   ```bash
   cp ~/.claude/plugins/cache/foundry/hush/1.8.0/output-styles/hush.md.pre-shape-backup ~/.claude/plugins/cache/foundry/hush/1.8.0/output-styles/hush.md
   ```

   and in the repo, `git -C hush checkout output-styles/hush.md styles/pirate.md
   tests/verify_style.test.js`.
3. **DONE — `crash-origin`, a job whose answer is a file and a line.** A session
   resume crashes; the stack trace names `src/auth/tokens.js`, where it
   surfaces, while the cause is `src/auth/refresh.js:14`, which returns nothing
   for an error code it does not recognise. The prompt asks where to look and
   forbids fixing it, so the reply has to point rather than patch. Rubric: the
   file, the line, and the swallow — an answer naming only the file the trace
   names scores 1 of 3 and fails.

   **It is deliberately NOT in `config.json`'s `defaultTasks`.** Adding a ninth
   job to the default set would change the suite and break every comparison with
   `rm280`; leaving it out means it runs only when asked for by name
   (`--tasks crash-origin`), and the README suite is untouched. Promoting it is a
   separate decision.

   Also updated, because the harness tests pin them: the bench README's task
   count (8 → 9) and its search-heavy count (2 → 3), plus an answer key in
   `retention-keys.json` written from the fixture before any arm had run it.
4. **At ship time only:** the single $32 batch from §7, plus README line 30,
   which still says "six lines, and sentences of about eight words" and would
   become wrong the moment `shapeplus` ships. The 1.8.0 CHANGELOG entry stays
   true as history and must not be edited.
5. **One verifier gap, self-inflicted.** `verify-style.js` catches a dropped cap
   by its number, and `shapeplus` gives the line cap and the sentence cap the
   same number, 8 — so dropping the sentence cap is no longer detectable. The
   test that covered it now targets the 90-word cap instead, with the reason in a
   comment. Counting anchor occurrences rather than presence would close it.

## 11. Answerable, run — the field complaint has a number now

`answerable.js` on the shipped records, Sonnet judge, **$1.53** for 32 calls, plus
**$0.54** for the 12 `shp1` records. **$2.07 in total**, against the ~$1 estimated —
the estimate assumed 32 calls for `rm280` when the batch holds 96 records across
six arms; the run was scoped to `hush` and `baseline` to match what was quoted.

| arm (rm280, Opus, 16 runs) | answered /3 | fully answerable | rubric recovered |
| --- | --- | --- | --- |
| baseline | **3.0** | **100%** | 83.3% |
| hush 1.8.0 | 2.4 | **62.5%** | 83.3% |

**The complaint reproduces.** A reader given only hush's reply can answer all
three questions in 10 of 16 sessions. Given plain Claude's, 16 of 16. And the
diagnosis is precise: **rubric recovery is identical at 83.3%** — the facts are
in there. What is missing is the other half, what to open and what to do next.

The failures are not scattered. Both reps of `failing-suite` and both of
`feature-drift` score 1 of 3, and both replies are otherwise good:

> Green. 625 passing, 0 failing.
>
> Three cases failed, all in `order totals`. `orderTotal` taxed the pre-discount
> amount. It now taxes the discounted amount, as its own doc comment says.

Nothing there is wrong. It just never names `src/pricing.js`, so a reader who
wants to see the change has to go looking. That is the anchored-link gap from
§1, measured from the reader's side rather than from the markup.

**One honest limit, and it cuts against the metric.** Question 3 asks what to do
next. On a job that is finished there is often nothing, and hush's style says
so — "skip a part with nothing in it", "no offer of more help". Plain Claude
writes a next step regardless, so on those turns the judge rewards filler. Read
`answered` as two different misses stacked: question 2 (nothing named to open)
is a real gap, question 3 is sometimes the style behaving correctly. A future
run should report the three questions separately before anyone tunes against
this number.

And the shape arms, same judge, same questions:

| arm (shp1, 4 runs each) | answered /3 | fully answerable | rubric recovered |
| --- | --- | --- | --- |
| `shapeplus` | **3.0** | **100%** | 100% |
| `shape` | 2.8 | 75% | 100% |
| `askless` | 2.8 | 75% | 100% |

`shapeplus` scores like plain Claude on answerability — 100% — while writing 71
words to its 426. n=4, so this is a signal and not a result. But it is the first
evidence that the shape rules buy back the exact thing the field complaint named,
and it points the same way as every other column.

## 12. The iteration loop — goal: no question left in the air

Owner goal, 2026-08-27 (verbatim intent): the reader must understand the note
with nothing assumed and nothing left to ask; all information in the message;
useful beats short, though shorter is still good. Method: headless Opus 5 at
medium effort, measure with every scorer, edit, repeat.

First: `answerable.js` now reports the three questions **separately** (`q1%`,
`q2%`, `q3%` columns, a `q=YnY` flag per record, and `--save` writing the
judge's literal answers), which §11 named as the precondition for tuning.
`caps.js` learned that a markdown link reads as its label — before that fix the
link target counted as a parenthetical aside and as sentence words, so the
meter punished the exact habit the style asks for. Suite green after both.

### it1 — `shapeplus` on the five jobs it had never run ($2.57 + $0.41 judges)

Batch `it1-3137d533`, Opus 5 medium, 1 rep: log-triage, release-digest,
feature-drift, incident-forensics, crash-origin. Ground truth 5/5. Silence:
narration 0 on four jobs, one 8-word leak (release-digest). Structure: bold
1.00/note (100% in band), blocks 3.0 (80%), links anchored 100% where present,
ease 90.3, answer-first 5/5.

| it1 answerable (Sonnet judge) | q1 | q2 | q3 | fully answerable | retention |
| --- | --- | --- | --- | --- | --- |
| crash-origin | Y | Y | Y | yes | 5/5 |
| log-triage | Y | Y | Y | yes | 6/6 |
| incident-forensics | Y | Y | Y | yes | 6/6 |
| release-digest | Y | Y | Y | yes | **1/4** |
| feature-drift | **n** | Y | Y | no | 2/3 |

Two real failure shapes, both on the "job is finished" end:

1. **The last note of a drifting session carries only the last delta.**
   feature-drift's note opens "Done. A repeat `key` inside 5 minutes is
   dropped" — nothing about the router the first four prompts built, no
   `src/router.js`, and the judge marks *what happened* NOT IN THE REPLY. It
   also closes with "Say the word if you want the window inclusive" — an offer
   of more help, which the style bans by name. The empty what-comes-next slot
   pulled a banned filler.
2. **A report written into a file empties the note.** release-digest's note
   names the count (21 user-facing) and two judgment calls but not one of the
   three headline changes; retention 1/4, the three misses being exactly the v1
   export removal, the webhook retries and the 401. The note defers to
   `CHANGELOG.md` — the reader must open it, which is the assumption the goal
   bans.

### it2 — candidate `anchor`, three clause edits, all nine jobs

On the `shapeplus` body: the note trio becomes "First line: what happened.
Then: did it work. Last: what comes next, **or that nothing does**. Skip a
**middle** part with nothing in it. **Say where things stand, not only what
just changed.**", and the link trigger flips from reader-need to work-fact:
"**Changed, found, or wrote a file?** Link it". Targets, in order: the banned
offer (a legal way to close the slot), the delta-only finish note, the missing
file on finished fixes.

Batch `it2-ae17956b`, all nine jobs, 1 rep, **$3.53** + $0.61 judges. Ground
truth 9/9. Two of the three targets fell, and the third moved:

| it2 `anchor`, n=9 | result | vs it1/rm280 |
| --- | --- | --- |
| q1 what happened | **100%** | drift's delta-only note is gone — the note now names `src/router.js:34`, the replay command and the standing rule |
| q2 what to open | **100%** | every note links: `linked%` 100 against it1's 40, links 1.11/note, 90% anchored |
| q3 what next | 77.8% | the offer is gone, but failing-suite and feature-drift still just stop after the last fact |
| structure | bold 1.00 (100% in band), blocks 3.4 (100%) | best bands of any arm measured |
| reading | ease 92.4, grade 2.2, 63 words | control 88.7 / 2.2 / 42 |
| release-digest | retention 4/4-equivalent, rubric 100% | the note itself now says the v1 route is gone, `401`, webhook retries, Node floor — it1 kept 1 of 4 |
| incident-forensics | retention 3/6 | it1's run inlined the whole handoff (228 words, 6/6); it2 defers to `HANDOFF.md` naming rollback, window, cause — the task's deliverable IS the file, so this is left alone |
| silence | 5/9 at zero narration, leaks 5-7 words | same turn-opener class and rate as every hush lineage arm |

The one open miss is precise: **q3 on a finished fix**. "Or that nothing does"
inside the part list did not fire — "End on the last fact" beat it, and the
model ends on a detail. it3 (`carry`) moves the close into the end rule itself:
"**End on the next move. None needed? Say so.** No sum-up line. No offer of
more help.", trio simplified back to "Last: what comes next."

### it3 — `carry`, the end rule closes the loop

Batch `it3-*`, the two q3 failers plus two regression guards (crash-origin,
release-digest), **$1.56** + $0.30 judges. Ground truth 4/4, and:

| it3 `carry`, n=4 | q1 | q2 | q3 | fully answerable | rubric |
| --- | --- | --- | --- | --- | --- |
| all four jobs | 100% | 100% | **100%** | **100%** | **100%** |

failing-suite now ends "See `pricing.js:41`. **Nothing else needed.**" — the
close fired exactly where the style means it. feature-drift ends on the file
pointer and its stated judgment call; crash-origin ends on the implied fix
("a revoked token should be a `401`"); release-digest ends on two named checks.
Retention on the same four jobs: 66.7%, identical to `anchor` — two of the five
"misses" are judge false-negatives on paraphrase (the fact is verbatim in the
note), one is real (drift never says the dedup holds at every priority).

Prices of the fuller notes: 79 mean words (release-digest 121, with a
three-row breaking-changes table), blocks 4.5 against the 2–4 band, and the
same "I'll start by …" turn-opener leak every hush-lineage arm shows —
transcripts confirm it is one sentence before the first tool call, the react
nudge's known residue, at every iteration's rate. No clause chases that.

### it4 — `carry` on the other five jobs, the engineered wins hold

Batch `it4-*`, **$2.24** + $0.42 judges, ground truth 5/5. q2 and q3 stay at
**100%** — log-triage ends "Next: find why `10.0.0.12:6379` refused",
rename-scope ends "Next: scope the sign-off to JS locals only, or send it
back", repo-sweep hands over the vendor decision. Structure: bold 1.00 (100%),
blocks 3.6 (100%), every note linked, rubric recovered 100%.

One q1 miss, and it is the campaign's last recurring shape: incident-forensics'
note says the handoff **covers** root cause, window and rollback — and never
states the cause itself. The artifact swallowed the answer; retention agrees
(4 of 6 dropped, all facts that live in `HANDOFF.md`). The same job under
`anchor` (it2) named the cause inline and scored YYY, so at n=1 this is a coin
the style leaves in the air. it5 (`inline`) adds one sentence to the note
rules: "**Did the answer land in a file? The note still carries it.**"

### it5 — `inline` closes the artifact hole. Shipped.

Batch `it5-85cdee80`, the two artifact jobs plus failing-suite as control,
**$1.41** + $0.14 judge, 3/3 ground truth, all three runs fully silent:

- incident-forensics: root cause, window and rollback now inline, ends
  "Next: flip the key back and reload" — q=YYY, retention **6/6** against
  it4's 2/6.
- release-digest: three breaking items named in the note, q=YYY, rubric 100%.
- failing-suite: q=YYn — this rep did not write the "nothing else needed"
  close it3's rep wrote. The end rule fires on 9 of the 10 finished-fix runs
  across it3–it5; the residue is per-run variance, not a missing clause, and
  no further wording chases it.

**Final body = `shapeplus` + three sentences and one trigger swap, shipped
2026-08-27** to `hush/output-styles/hush.md`, the live plugin cache copy the
owner is hand-trialling (backup still beside it), and `styles/pirate.md` in
voice. Verifier and both suites green (524 + 232), readiness gate 10 of 10,
records for it1–it5 archived to `records-archive/`. Nothing versioned, nothing
released, README untouched — items 4 and 5 in §10 stay held for the go.

The lineage, on the goal's own axis (fully answerable, Sonnet judge, Opus 5
medium sessions):

| body | evidence | fully answerable | rubric into answers |
| --- | --- | --- | --- |
| hush 1.8.0 (was shipped) | rm280, n=16 | 62.5% | 83.3% |
| `shapeplus` (was installed) | shp1+it1, n=9 | 89% | 75–100% |
| **final** (`carry`+`inline`) | it3+it4+it5, n=12 | **92%** | **100%** |

Loop spend: $11.31 in runs, about $2.25 in judges — roughly **$13.6** for five
iterations, 26 Opus sessions and 26 judge calls. Every meter ran on every
iteration: truth 26/26 across the campaign, zero rubric facts lost from any
judged answer of the final body, reading ease 90–92 throughout, bold exactly
1.00 per note on all 21 shaped runs.

### it6 — the confirm batch caught the artifact clause half-firing. Fixed.

The owner-approved confirm batch `rm290-bc456067` (Opus medium, hush +
baseline, 8 jobs × **4 reps**, 64 runs, **$28.19**, zero errors; a first 2-rep
launch was stopped on an owner steer, $4.59 discarded) is the new body at
n=32/arm: bold 1.00 (100% in band), 81% of notes linked (84% anchored), blocks
3.7 (90.6%), ease 89.5 vs 71.1, words 77 vs 405, cost **−14%**, output tokens
−34%, narration 4 words vs 44 — and **30/32 ground truth against baseline's
32/32.** Both failures are one shape: two incident-forensics reps wrote "It
**covers** root cause, the impact table, and the rollback call" and named
nothing — the it5 clause ("the note still carries it") fires only half the
time on this job. Silence also read lower at scale: 11/32 vs 1.8.0's 10/16 in
`rm280`, uniform 5–8-word turn-openers, no job concentration.

Probe `it6a`+`it6b` ($3.15): the clause reworded to name the dodge — "Did the
answer land in a file? **Say the findings, not that the file covers them.**" —
passes incident-forensics **4/4 (3/3 rubric each, all four silent)** with
release-digest and failing-suite clean. Shipped to the repo body, the live
cache copy and pirate (in voice); suites 524 + 232 green.

Consequence, per the one-batch provenance rule: `rm290` measured a body one
sentence older than shipped, so it can seed nothing on the README. The clean
basis is a rerun of the same 64-run batch on the final body (~$28) plus the
Sonnet half (~$8) — pending the owner's go, `rm290` archives when it lands.

### The confirm program — final body, both models, README-grade records

Owner-approved rerun. `rm291-34426eb0` (Opus 5 medium, 8 jobs × 2 arms × 4
reps, 64 runs, **$30.21**, zero errors) and `sn291-a1dafbca` (Sonnet, 2 reps,
32 runs, **$8.12** including a 24-run rate-limit resume). Both published
(`claims.md` + charts), gate **10 of 10**, suites 232 + 524. Judges: $7.4
including one rate-limited pass the harness refused ($0.56 lost).

| final body vs plain Claude | Opus, n=32/arm | Sonnet, n=16/arm |
| --- | --- | --- |
| ground truth | **64/64** | **32/32** |
| cost | **−20%** | −6% |
| output tokens | −35% | −7% |
| final words | 78 vs 421 | 87 vs 195 |
| silent sessions | 34% vs 0% | **69% vs 25%** |
| fully answerable | 84.4% vs 96.9% | **75.0% vs 75.0%** |
| q1 / q2 (what happened / what to open) | 100 / 100 | 94 / 94 |
| rubric into answers | 87.5% vs 93.8% | **91.7% vs 79.2%** |
| retention (details kept) | 78.9% vs 86.7% | not judged |
| bold in band / notes linked | 100% / 87.5% (81% anchored) | 87.5% / 62.5% (79% anchored) |
| reading ease | 89.0 vs 70.3 | 72.2 vs 63.2 |

Reading, against the released 1.8.0 (`rm280`): fully answerable 62.5% → 84.4%
on Opus with q2 — the "what do I open" half the field complained about — now
at 100/100 across 96 judged runs on both models. The residual q3 gap is the
finished-fix close (every gap row is `q=YYn` on failing-suite or
feature-drift, and one of them is a *baseline* rep). Sonnet's tie at 75/75
with hush recovering **more** rubric into the answers than plain Claude is the
cross-model agreement the house bar asks for. The honest costs: retention 8
points under baseline at a fifth the words, and silence 34% on Opus against
1.8.0's 62.5% — the fuller notes buy answers with turn-opener leaks of 5–8
words. Both go on the page as trades, not footnotes.

### The silence campaign — owner goal, 2026-08-28

Goal: raise silence toward 100% without moving anything else. Investigation
first, free: **every leak in `rm291` is one 5–9-word opener before the first
tool call** — "I'll look at the codebase." — the base-prompt acknowledgment
bleeding through; later turns of multi-prompt jobs never leak. Five levers,
each probed on the leakiest jobs at 4 reps:

| lever | where | silent on probe | verdict |
| --- | --- | --- | --- |
| `openban` — name the dodge in the style's Quiet section | style body | 7/8 (was 1/8) | **shipped** |
| `first` — restate the ban as body line one | style body | 1/8 | dead — placement is not the lever |
| `unquote` — drop the quoted base-prompt line it overrides | style body | 3/12 | dead — the quote neither primes nor protects |
| `nudgeban` — name the dodge inside the turn-top injection | `silence-nudge.js` `TURN_DIAL` | **9/12** (was 2/12) | **shipped**, golden pin updated |
| `HUSH_NUDGE=max` | env | — | not run: its extra reminders ride tool results, and every leak precedes the first one |

Third full-confirm program: `rm293-d516617d` (Opus medium, 4 reps, 64 runs,
$30.10) and `sn292-b17b38c4` (Sonnet, 32 runs, $7.88), both 100% ground truth,
gate 10 of 10. One infrastructure note for the record: `rm292`'s single
"failure" was an API connection drop, not the style, and one `sil2` launch
hung with zero records and was killed and relaunched clean.

| shipped everything vs plain Claude | Opus n=32 | Sonnet n=16 |
| --- | --- | --- |
| silent sessions | **59% vs 0%** (was 34%) | 56% vs 31% |
| ground truth | 64/64 | 32/32 |
| cost | −12% | −9% |
| fully answerable | 87.5% vs 100% | **93.8% vs 75.0%** |
| rubric into answers | **87.5% vs 81.3%** | **83.3% vs 79.2%** |
| retention | 78.9% vs 85.9% | not judged |
| words | 76 vs 428 | 89 vs 168 |
| bold / blocks in band | 100% / 90.6% | 93.8% / 68.8% |

**The ceiling, stated plainly:** two dodge-bans took Opus silence 34% → 59%,
back to statistical parity with 1.8.0's 62.5% (19/32 vs 10/16) while keeping
every answerability gain — on Sonnet the style now *beats* plain Claude on
fully-answerable, 93.8% to 75.0%. 100% is not reachable with these mechanisms:
the residue is a per-job stochastic opener that survives style prose plus the
injection, concentrated in `release-digest` (3/20 silent across the final
lineage) — and the one lever left, unconditional per-tool-result reminders,
cannot touch a leak that precedes the first tool result. Silence remains a
length curve with a stubborn-job tail; the page should quote 59% with the
per-job table beside it.
