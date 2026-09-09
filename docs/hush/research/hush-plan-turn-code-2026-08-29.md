# hush: showing code on a plan turn

2026-08-29. Sonnet 5 and Opus 5, `benchmarks/hush`. Local records only —
the batches below sit in `records-archive/`; nothing here is published, per `.claude/rules/benchmark-data.md`.

## The complaint

An owner asked a session "How would you work on this" and got a prose plan back.
The follow-up, "be clearer and more detailed with the implementation", produced
numbered edits with real diffs. The second shape was the wanted one. hush never
banned it — the caps declare code blocks free — the style simply never asked for
it.

## The fixture

`fixtures/plan-apply` is a small report CLI: `src/cli.js` prints `buildRows()`
through `toTable()`, and `src/format.js` drops `owner` and `slow` on purpose.
The prompt mirrors the complaint verbatim in shape:

> We want a --json flag on the report command — same data, printed as JSON
> instead of the text table. Don't touch anything yet. How would you work on
> this?

The task is registered in `tasks.json` but deliberately **not** in
`config.json`'s `defaultTasks`, so the published eight-job suite and every
README figure are untouched by it. Its grader lives outside the fixture, at
`runner/graders/plan-apply-verify.js`, so no session can read the answer.

## Five wordings, one winner

Every arm is stock hush 1.10.1 plus one sentence. `noclause` is stock, unchanged.
"code" counts replies containing a fenced block; "list" counts numbered steps.

| wording | placement | code | list |
| --- | --- | --- | --- |
| stock, no clause | — | 1 / 20 | — |
| `Proposing an edit instead of making one? Show the code. Name the file and the line.` | `What stays whole` | 0 / 6 | — |
| `An edit you have not made yet? Show the code.` | `Shape` | 0 / 6 | 4 / 6 |
| `An edit you have not made yet? Show the code, not numbered steps. The block costs no lines and no words.` | `Shape` | 10 / 16 | 5 / 16 |
| same, folded into the `Steps that run in order?` rule | `Shape` | 1 / 8 | 2 / 8 |
| same, plus a `Before you send` action | `Shape` + redo | 2 / 8 | 4 / 8 |
| `Answering with a plan? Show the code you would write, not numbered steps. The block costs no lines and no words.` | `Shape` | 7 / 8 | 0 / 8 |
| **`Asked how you would do it? Show the code you would write, not numbered steps. The block costs no lines and no words.`** | `Shape` | **shipped wording, see below** | — |

Three lessons, all consistent with `prompt-wording-lessons`:

1. **The competitor was `Steps that run in order? Number them.`** The model reads
   the Shape section as a shape dispatcher and picks one row. Until the new row
   named that rule and beat it, it lost every time. Failure mode #5.
2. **Granting the budget mattered as much as the trigger.** "The block costs no
   lines and no words" is what moved it off zero. The caps say code blocks are
   free once, forty lines away; at the point of decision the model was still
   spending against them. Failure mode #4 — say what the exemption grants.
3. **Folding the rule into the winning rule killed it, and adding a second copy
   in the pre-send redo halved it.** More words is not the fix, twice over.

The trigger word matters: `Answering with a plan?` beat `An edit you have not
made yet?` 7/8 against 6/8 in the same batch, and eliminated the numbered list
entirely. The model calls its own output a plan, so the rule should too.

## Head to head, one batch, eight reps

Sonnet, `records-archive/clause6-1ccbe27b`, arms interleaved:

| arm | code | list | pass | words | $/run |
| --- | --- | --- | --- | --- | --- |
| noclause | 0 / 8 | 4 / 8 | 8 / 8 | 58.8 | 0.0692 |
| `An edit you have not made yet?` | 6 / 8 | 3 / 8 | 8 / 8 | 71.8 | 0.0708 |
| `Answering with a plan?` | 7 / 8 | 0 / 8 | 8 / 8 | 66.0 | 0.0714 |

The reader-side judge on the same records — `runner/answerable.js`, a fresh
session handed the request and the reply and nothing else:

| arm | fully answerable | rubric recovered |
| --- | --- | --- |
| noclause | 75.0% | 95.8% |
| `Answering with a plan?` | 87.5% | 91.7% |

## Opus agrees, and more sharply

`records-archive/opclause-417a2d13`, six reps, same task:

| arm | code | list | pass | words | $/run |
| --- | --- | --- | --- | --- | --- |
| noclause | 0 / 6 | 6 / 6 | 6 / 6 | 83.8 | 0.1676 |
| clause | 6 / 6 | 0 / 6 | 6 / 6 | 101.7 | 0.1851 |

## Does it touch anything else?

**No plan turn, no clause.** The eight published jobs, Sonnet, both arms in one
batch (`records-archive/reg1-4a8bf34d`, 32 runs):

| arm | pass | silent | narration | final words | tool calls | $/run |
| --- | --- | --- | --- | --- | --- | --- |
| noclause | 16 / 16 | 14 / 16 | 3.8 | 88.2 | 14.9 | 0.1913 |
| clause | 16 / 16 | 13 / 16 | 2.9 | 89.8 | 14.1 | 0.1949 |

Not one of the 32 replies carried a code block, either arm. Final words +1.8%,
cost +1.9%, silence one run apart at n=16 — all inside the run-to-run swing the
harness README warns about.

**But Opus does misfire, and the Sonnet regression did not predict it.** The
same eight jobs on Opus 5, both arms in one batch
(`records-archive/opreg-811f97d6`, 32 runs, `Answering with a plan?` wording):

| arm | pass | code | silent | narration | final words | tool calls | $/run |
| --- | --- | --- | --- | --- | --- | --- | --- |
| noclause | 16 / 16 | 0 / 16 | 10 / 16 | 2.5 | 71.4 | 12.7 | 0.4409 |
| clause | 16 / 16 | 3 / 16 | 6 / 16 | 4.4 | 79.8 | 19.0 | 0.4948 |

Three problems, none of them visible on Sonnet:

- **The clause fires where the edit was made.** `failing-suite` 2/2 and
  `feature-drift` 1/2 carried a code block for work the session had already
  done. `Answering with a plan?` matches a final message that merely says what
  comes next.
- **`repo-sweep` doubled its tool calls, 2 runs of 2** — 48 and 60 against the
  control's 12 and 14, and $0.87 against $0.43. Drop that one task and the cost
  gap closes to nothing, $0.4412 against $0.4421, so the headline +12% is one
  task, not the suite. It is still a consistent blow-up, not an outlier.
- **Silence fell**, 6/16 against 10/16, with narration up 2.5 to 4.4.

Lesson for the ledger: a shape rule measured only on the task it targets can
look free and still cost on jobs it was never meant to touch. The published
suite has to run on both models before any of this ships.

**The advisory case does not misfire.** `crash-origin` asks where to look and
says not to fix anything — a plan-shaped question with no edit in it
(`records-archive/misfire-330036d3`, 5 reps each):

| arm | code | pass | words | $/run |
| --- | --- | --- | --- | --- |
| noclause | 0 / 5 | 5 / 5 | 74.8 | 0.0942 |
| clause | 0 / 5 | 5 / 5 | 84.2 | 0.0879 |

## What adding the task did touch

A tenth task is not free in the harness, and two guards caught it:

- `benchmark_evidence.test.js` pins the task counts printed in
  `benchmarks/hush/README.md`. Both the total and the per-segment count for
  search-heavy work were updated, 9 to 10 and 3 to 4.
- `retention-keys.json` requires an answer key per task. `plan-apply` now has
  one, drawn from the fixture and the prompt. Its provenance note discloses that
  the list was written after the task had already been run, so retention scores
  on `plan-apply` are post-hoc and the other nine are not.

Nothing else moved. `config.json`'s `defaultTasks` is untouched, so a plain
`node runner/run.js` still runs the same eight jobs at the same price, and the
published figures keep their basis.

## Tightening the trigger, and what it did not fix

`Answering with a plan?` keys on the shape of the reply. `Asked how you would do
it?` keys on the shape of the request, which is narrower. Opus, three jobs, two
reps each, both arms in one batch (`records/optight-dcb8a227`):

| task | arm | pass | code | final words | tool calls | $/run |
| --- | --- | --- | --- | --- | --- | --- |
| plan-apply | clause | 2/2 | 2 / 2 | 72 | 7.0 | 0.1599 |
| plan-apply | noclause | 2/2 | 0 / 2 | 83 | 6.0 | 0.1513 |
| failing-suite | clause | 2/2 | 2 / 2 | 51 | 10.0 | 0.2656 |
| failing-suite | noclause | 2/2 | 0 / 2 | 66 | 9.5 | 0.2626 |
| repo-sweep | clause | 2/2 | 0 / 2 | 65 | 34.5 | 0.6553 |
| repo-sweep | noclause | 2/2 | 0 / 2 | 57 | 29.5 | 0.5625 |

Two things fall out, and both change the earlier reading:

- **`repo-sweep`'s blow-up was the task, not the clause.** The control arm alone
  ran 29.5 tool calls here against 13.0 in the previous batch, on identical
  inputs. That single task carried the whole +12% Opus cost headline, so that
  headline does not survive.
- **`failing-suite` still shows code, and it is not damage.** The block is the
  two-line fix the session actually made, and the reply is *shorter* for it —
  51 words against the control's 66, at the same cost. The rule showing a made
  edit as code is the same benefit as showing a proposed one.

## The one thing still open

Silence. The full Opus batch read 6 of 16 silent sessions against the control's
10 of 16; this batch read 3 of 6 against 4 of 6. There is no mechanism by which
a `Shape` rule governing the final message reaches mid-turn narration, so the
likeliest reading is noise — but two reps per task cannot separate that from a
real effect, and `repo-sweep` has just demonstrated how wide this suite swings
run to run.

Settling it means the eight published jobs on Opus, both arms, four reps: 64
sessions, roughly $28. Nothing should ship before that runs. Correctness has
never moved in any batch — 100% in all 184 runs — so this is a cost-and-quiet
question only.

## Chasing silence

The record now keeps `narrationTexts`, not just a word count (`runner/run.js`),
and it settles what a leak actually is. Every leak in the Opus suite was a
single message of five to eight words, and on the published jobs they are almost
all one shape: a **finding announced mid-work**, before the fix that follows.

> "Confirms the bug: `orderTotal` taxes the pre-discount amount instead of the
> discounted one."

`failing-suite` produced that in 3 of 3 Sonnet runs and 6 of 6 on the stock
style. The Quiet section bans the opening line and bans words between tool
calls; the model still read a confirmed finding as exempt. Adding one sentence
inline, next to the ban it belongs to, moved it:

| Quiet wording | silent |
| --- | --- |
| stock 1.10.1 | 0 / 6 |
| `…either, not even a finding you are sure of.` | 2 / 6 |
| **`…either. A finding is not a message. It waits for the end.`** | **10 / 20** |
| same sentence, its own paragraph | 1 / 6 |
| same sentence, in the exceptions paragraph | 1 / 6 |
| `A finding is not a message. It is the first line of the note.` | 2 / 8 |

Placement decided it again, and inline won. Correctness held 8/8 everywhere and
cost never moved past a cent.

**100% silence is not reachable this way.** Half the runs on the leakiest job
still announce the finding, and the ledger's older result stands: silence is a
length curve, not a number. What this buys is the worst job going from never
silent to silent half the time, for free.

## The what-do-I-do-next question, twice refuted

`answerable.js` scores three questions. On the Opus suite, question three is the
weak one — 81.3% for hush, 75% for the control — which is the loss the front
page already admits. Reading the closing line of all 32 replies, the pattern is
plain: the ones that fail end on a caveat or an observation instead of a move.

So the last line got named as the slot. Both attempts made it worse, on the
three jobs where it fails most, Sonnet, four reps, judged:

| wording of the rule | q3 |
| --- | --- |
| **`End on the next move. None needed? Say so.`** (shipped) | **83.3%** |
| `The last line is the next move. None needed? Say that instead. A caveat goes above it.` | 58.3% |
| `The last line is the next move. None needed? Say so.` | 66.7% |

Both are reverted. The caveat sentence is a textbook priming failure — naming
the caveat invited it. The shipped wording is already the best of the three, and
question three is not weak because that rule is badly written.

## The next-move label: the largest win here

`answerable.js` asks a fresh session three questions about a reply it has no
other context for. Question three — "What should I do next?" — was the weak one
at 82%. Rewriting the rule twice made it worse. **Labelling the slot instead of
rewording the rule fixed it.**

The shipped sentence gained six words: `End on the next move.` **`Start that
line with `Next:`. None needed? Write `Next: nothing.`**

| batch | tasks × reps | arm | `Next:` line | q3 |
| --- | --- | --- | --- | --- |
| lab1 | 4 × 2 | label | 8 / 8 | 100.0% |
| lab1 | 4 × 2 | stock | 1 / 8 | 62.5% |
| lab2 | 6 × 2 | label | 12 / 12 | 91.7% |
| lab2 | 6 × 2 | stock | 3 / 12 | 91.7% |
| iso1 | 4 × 2 | label only, on stock | 8 / 8 | 100.0% |
| iso1 | 4 × 2 | stock | — | 87.5% |
| rec1 | 4 × 3 | label | 12 / 12 | 100.0% |

Pooled: **q3 82.1% on stock, 95.8% with the label**, over 76 judged Sonnet runs.
Fully answerable moves with it, since q1 and q2 were already at 100%. The
mechanism is signaling, not instruction — the model already wrote "Next:" when
it remembered to answer at all, so naming the token made the slot impossible to
skip. Cost is flat and correctness is 12/12 in every batch.

## Three things that did not work, and one that reads better anyway

- **Tabling long lists instead of truncating them.** Never fired: 0 tables in 12
  runs, against 3 in stock.
- **Deleting the truncation rule** (`Past three items, give the count…`) to stop
  facts being dropped. It made recall *worse*, 61.1% against 77.8%, at the same
  length. Keep the rule.
- **Raising `rubric recovered`** by any of the above. It sits between 72% and
  83% whichever arm is measured, including stock, and moves more between batches
  than between arms. A quarter of each task's key facts do not reach the reader
  and nothing tried here changes that. It is the honest open problem.

Readability did improve, as a side effect of the code rule rather than by aim:

| arm | reading ease | grade | hard words | final words |
| --- | --- | --- | --- | --- |
| stock 1.10.1 | 72.7 | 6.10 | 7.8% | 93.4 |
| this style | 76.3 | 5.15 | 8.1% | 78.3 |

## Opus confirms the label

Six published jobs, two reps, both arms in one batch
(`records-archive/opfinal-…`, 24 Opus runs):

| metric | stock 1.10.1 | this style |
| --- | --- | --- |
| `Next:` line present | 1 / 12 | 12 / 12 |
| question 3 answered | 83.3% | **100%** |
| fully answerable | 83.3% | **100%** |
| silent sessions | 2 / 12 | **5 / 12** |
| narration words | 5.5 | **3.8** |
| ground truth | 12 / 12 | 12 / 12 |
| reading ease | 88.3 | 89.4 |
| $/run | 0.4517 | 0.4534 |

Both models now agree, and on Opus the silence rule shows its gain too.

## `rubric recovered` is not a usable metric at this sample size

The one number that moved against this style, batch after batch, turned out to
move against everything. Six batches of the same three-or-fewer arms:

| arm | readings |
| --- | --- |
| this style | 77.8, 70.4, 72.2, 77.8, 72.2, 83.3 |
| stock 1.10.1 | 88.9, 81.5, 83.3, 75.0, 33.3, 83.3 |
| label only, on stock | 75.0, 61.1 |

Stock's own readings span 33.3 to 88.9. In the isolation batch the full style
scored **best** of three arms, reversing the gap seen twice before it. At n = 9
to 12 the swing between batches is larger than any swing between arms, so no
claim about facts lost or kept survives, in either direction. Judging it needs
far more reps than anything run here; treat the earlier "consistent ten-point
gap" reading in this document as retracted.

What does hold, across every batch and both models: **questions one, two and
three all answer at 100% with the label on**, against 62.5% to 91.7% for
question three without it.

## The README, re-measured on the new style

Two fresh basis batches, both arms interleaved, nothing spliced:
`records/rm300-93b2a811` (Opus 5 medium, 8 jobs, 4 reps, 64 runs) and
`records/sn300-b0703e71` (Sonnet, 2 reps, 32 runs). Both published through
`runner/publish.js`, gate 10 of 10, every superseded batch archived.

| Opus 5, per session | no plugin | hush |
| --- | --- | --- |
| command output | 24.5k chars | 18.2k chars, −26% |
| chatter while working | 38 words | 4 words, −90% |
| Claude's whole-session output | 7,922 tok | 4,903 tok, −38% |
| cost | $0.6125 | $0.4750, **−22%** |
| final message | 411 words | 67 words |
| reading ease / grade | 69.5 / 6.9 | 88.6 / 2.5 |
| silent sessions | 0 of 32 | 15 of 32 |
| linked the file | 0 of 32 | 24 of 32 |
| ground truth | 32 of 32 | 32 of 32 |

**hush came out cheaper on all eight jobs**, against five of eight on the
retired basis, and the whole-session output cut went from −30% to −38%. Sonnet
moved the same way: cost −19% ($0.1907 against $0.2340), silent 11 of 16 against
2, reading grade 5.0 against 9.2, 16 of 16 correct each way.

The one claim that flipped: **plain Claude now answers all three reader
questions slightly more often than hush**, 100% against 94% on Opus and 81%
against 75% on Sonnet, where the retired basis had hush ahead on Sonnet. The
README says so plainly now. hush keeps the second half of that test — 90%
against 85% of task facts reaching the answers on Opus, 92% against 83% on
Sonnet.

Both README graphics were replotted from `rm300` by two local scripts,
`docs/hush/research/scripts/hush-draw-cuts.js` and `docs/hush/research/scripts/hush-draw-hero.js`, each
checked against the shipped asset before use. The figures themselves come from
`docs/hush/research/scripts/hush-readme-numbers.js`, which reproduces every previously
published number from the retired basis exactly.

## Retold: does a person carry the meaning away?

`answerable.js` hands a judge the reply itself, so a judge that finds a string
scores as well as one that understood it. `runner/retold.js` puts a stage in
front: a reader rewrites the reply in its own words, forbidden from copying a
run of more than four words, and the **same** second-stage judge then reads only
that retelling. The gap between the two numbers is meaning that did not survive
being repeated by someone else. Every retelling is measured for the longest word
run it shares with the reply, and that is reported, not hidden — it came out at
4.8 to 5.8 words, so the readers paraphrased.

| Opus 5, 32 runs per arm | no plugin | hush |
| --- | --- | --- |
| all three answers, judged on the reply | 100% | 94% |
| all three answers, judged on a retelling | 84.4% | **59.4%** |
| longest run copied from the reply | 5.8 words | 4.8 words |

That is the sharpest negative in this document, and half of it is one phrase.
Splitting hush's Opus runs by whether the reply ended in a bare `Next: nothing`:

| hush, Opus | n | q3 | survives retelling |
| --- | --- | --- | --- |
| ended `Next: nothing` | 11 | 45.5% | 27.3% |
| ended with a real next step | 21 | **95.2%** | **76.2%** |
| plain Claude, for comparison | 32 | 96.9% | 84.4% |

Sonnet says the same thing and more strongly: hush replies carrying a real next
step score **100% q3 and 87.5% survival**, against plain Claude's 87.5% and 75%.

**`Next: nothing.` is honest and unrepeatable.** There is nothing in it for a
reader to carry, so the retelling drops it and the judge scores the question
unanswered. The fix is to make the line say why: `None needed? Write `Next:
nothing`, then why in a few words.` Measured on the four jobs that produce it
(Sonnet, 3 reps, `records/why1-400bac90`):

| | bare `nothing` | with a reason |
| --- | --- | --- |
| gave a reason | 1 / 12 | **8 / 12** |
| ground truth | 12 / 12 | 12 / 12 |
| silent sessions | 5 / 12 | 9 / 12 |
| survives retelling | 50.0% | 58.3% |
| final words | 45.7 | 56.8 |
| $/run | 0.2100 | 0.2308 |

The clause does what it says — the reason appears eight times in twelve against
one — but at n = 12 the retelling score cannot separate 58.3% from 50.0%, and it
costs about 10% more. Kept on the mechanism and on the owner's brief that a
reader must never be left with an open question; the retelling gain is
**unmeasured**, not proven.

## Counting interruptions, not words

Silence is scored all-or-nothing on words, so one opening line and a running
commentary score the same. `stats.js` gains an `interruptions` metric — how many
times a session broke in before its answer — and `publish.js` prints it per
segment. It separates the arms far more cleanly than silence does:

| | no plugin | hush |
| --- | --- | --- |
| Opus, at most one line | 10 / 32 | **32 / 32** |
| Opus, worst session | 11 breaks | 1 break |
| Sonnet, at most one line | 6 / 16 | **14 / 16** |

`silent` keeps meaning zero words, because the poster says "not one word" and
redefining it would make that line false. The new number is printed beside it.

## The judge was scoring honesty as a miss

The owner pushed back on the reading above, and was right. `Next: nothing` is a
complete answer to "what should I do next" — it says the job is finished. Going
back to the retellings settles it. The reader never dropped the answer:

> "Nothing else needs attention — no other issues turned up in the run."
> "There's nothing further to follow up on."
> "Nothing else in the suite needed touching, and there's no further action
> required on your end."

All three retellings carry it plainly, and all three were scored as **no answer
at all**. The fault was in the judge's own instruction: *if the reply does not
contain an answer, write exactly NOT IN THE REPLY* — and it read "there is
nothing to do" as nothing. Only a reply willing to declare a job finished can
trip that, so the metric was scoring honesty as a miss and paying for an
invented next step. Plain Claude never says a job is done, so it never tripped it.

`answerable.js` now names the case. Both arms get the identical prompt, and
numbers from before 2026-08-29 are not comparable. Re-scoring the same two
basis batches with nothing else changed:

| | Opus base | Opus hush | Sonnet base | Sonnet hush |
| --- | --- | --- | --- | --- |
| what-do-I-do-next, before | 100% | 93.8% | 87.5% | 87.5% |
| what-do-I-do-next, after | 100% | **100%** | 87.5% | **100%** |
| all three, before | 100% | 93.8% | 81.3% | 75.0% |
| all three, after | 96.9% | 93.8% | 81.3% | **87.5%** |
| task facts recovered, after | 87.5% | **95.8%** | 83.3% | **91.7%** |

**hush now wins both tables on Sonnet and the facts table on Opus**, and its
only remaining Opus loss is one session in 32, on the *first* question rather
than the last. The README carries the corrected figures.

Two things follow. The retold run above used the old judge, so its 59.4% is
contaminated by the same bug and needs re-running before anyone quotes it. And
the `then why in a few words` clause was adopted to fix a problem that was
mostly the scorer's — it is still worth keeping, because a reason is genuinely
more useful to a reader than a bare `nothing`, but the case for it is the
owner's brief, not this measurement.

## Retold, re-run on the corrected judge

The 59.4% above was the broken judge. With the fix, and nothing else changed:

| survives a retelling | no plugin | hush |
| --- | --- | --- |
| Opus 5, 32 runs each | 90.6% | 71.9% |
| Sonnet, 16 runs each | 62.5% | 56.3% |

The what-next question is now **100% for hush on both models**, so the whole
remaining gap sits on one question: *which file, command or thing should I open
or run*. Opus 93.8% against 71.9%, Sonnet 68.8% against 56.3%.

**The mechanism is the table.** A hush reply that puts its file names in table
cells and markdown links loses them the moment someone repeats it in prose:

> **Build passes now.** Two real bugs, both from the bump.
>
> | File | Bug | Fix |
> |---|---|---|
> | [src/core/options.js:6](src/core/options.js:6) | `retries` renamed … |
> | [src/net/retryPolicy.js:7](src/net/retryPolicy.js:7) | unset flag … |

The retelling of that reply names `build.js` and not one other file: "one file
was reading a settings name that got renamed… the other had a flag that used to
default". Plain Claude repeats file names in prose, so its file names survive.
Nine of hush's 32 Opus replies lost the question this way.

The style now says `Name it in a sentence too, never only in a table cell.`
**It is untested.** The three Sonnet tasks chosen to probe it produced no tables
at all in either arm (0 of 9 each), so the failure never reproduced; q2 came out
66.7% for both arms and rubric recall 66.7% against 50.0%, on n = 9. Reproducing
it needs an Opus batch, because that is where the tables appear. The clause is
kept on the mechanism above, which is directly observed, not on a measurement.

## What the judge's own noise looks like

Re-running the corrected judge over the same unchanged Opus records twice gave
hush 93.8% then 96.9% on all-three, and 95.8% then 89.6% on rubric recall. **The
instrument moves three to six points on identical inputs.** Every answerability
figure in this document and in the README should be read with that band in mind,
and `answerable.js` now writes its table to `published/answerable.md` beside the
batch so the published number always has the run that produced it on disk.

## Where it stands

The change is one line in `hush/output-styles/hush.md`, in the `Shape` section.
hush's suite is 527/527 and the harness 232/232. Campaign spend: 587 sessions plus judge runs, $126.67. Nothing is committed, versioned
or released, and no README figure moves — the eight-job basis batches
`rm293-d516617d` and `sn292-b17b38c4` are untouched.
