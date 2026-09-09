# A correct lesson changes the outcome — measured

**2026-08-18.** The lesson ledger shipped in foreman 1.3.0 with its safety half
proven and its benefit half unmeasured. P2 showed a stale lesson that admits it
might be stale does no harm. It could never show a *correct* lesson doing any
good, because its control arm was already right in every run. P4, read off the
same transcripts, made that worse: the only arms the destination session ever
referenced were the two stale ones, and `lessons-fresh` — the true lesson —
scored 0 of 4. Nothing measured had ever shown a right lesson changing an
outcome, which is why entry 247 stayed deferred with every formal gate clear.

**It does.** On a fixture with real headroom, the served lesson moved
correctness from **0% to 100%**, identically on Sonnet and on Opus.

Run data is local per ADR 0004; the tags below name directories under
`benchmarks/foreman/results/` that exist only on the operator's machine.

---

## Why the old fixture could not answer this

A lesson can only help a session that would otherwise get something wrong. Both
of P2's non-stale arms sat on `moved-file`, where the control scored 100%. There
was no error left for a correct lesson to prevent, so its benefit was
unobservable by construction — not small, not absent, unmeasurable.

The same ceiling killed the §4.1 anti-gaming measurement a few hours earlier.
Zero gaming in the control means no clause can be judged against it. Headroom in
the control arm is the precondition, and it is worth buying before the batch.

## The fixture

`pinned-dup` is the `adjacent-mess` module with one thing removed: the ticket
that pins its three copy-pasted percentile helpers. It is gone from the code
comment, from the brief facts, and from the prompt. What stays is the
`TODO: collapse these three copies into one percentile(values, q) helper` that
invites the tidy-up.

So the control has every reason to unify the helpers and nothing telling it not
to. `tests/benefit_arms.test.js` walks the fixture tree, the brief and the base
prompt asserting `PERF-1123` appears in none of them, because the moment the pin
leaks back in, both arms can find it and every number is a confound.

The arms differ by one spliced block and nothing else:

| Arm | The lesson block |
| --- | --- |
| `pin-off` | none — the control, which cannot know about the pin |
| `pin-on` | the pin, recorded by an earlier close, labelled `unchanged since` |

The header and closer are read out of `craft-handoff.js` at generation time, so
a reworded product string fails the arm test rather than silently benchmarking
prose foreman no longer ships.

**Detection.** Three `sentinels` pin the lines the collapse removes —
`Math.ceil(0.5 …)`, `0.9`, `0.99`. That catches the tidy-up however it is
written: one shared helper, three thin delegates, anything. `fixtures/pinned-dup/lazy/`
is that exact collapse and `selfcheck.js` runs it on every invocation, so the
detector is proven continuously and for free.

## The pre-check that changed the design

The control was run alone first, three times, before spending anything on an
A/B. It passed 3 of 3 — no headroom. Tag `benefit-precheck`.

The cause is foreman's own prompt. `<scope_discipline>` tells the session not to
fold in work beyond the stated goal, and the goal was only "fix median()". A
foreman-shaped handoff does not do drive-by refactors, so the pin had nothing to
hold back and the lesson had nothing to do.

**That is itself a finding worth keeping: foreman's guardrails already prevent
the unprompted version of this mistake.** The ledger's value has to be looked
for where the tidy-up is *in scope*.

So the task was changed to ask for it: fix `median()` **and collapse any obvious
copy-paste duplication in the same file while you are in there**. That is an
ordinary way to phrase real work, and it is precisely the case where a recorded
pin is the only thing that can save the helpers. The re-run control failed 3 of
3, all three on the sentinels, tests still green. Tag `benefit-precheck2`.
Headroom confirmed, total pre-check spend **$0.78**.

## Result

1 task × 2 arms × 6 reps × 2 models = 24 sessions. Tags `benefit-sonnet`,
`benefit-opus`.

| Model | Arm | correct | tests | violations/run | output tok | wall s |
| --- | --- | --- | --- | --- | --- | --- |
| Sonnet | `pin-off` | **0%** | 100% | 3.0 | 1493 | 18 |
| Sonnet | `pin-on` | **100%** | 100% | 0.0 | 2032 | 28 |
| Opus | `pin-off` | **0%** | 100% | 3.0 | 1719 | 23 |
| Opus | `pin-on` | **100%** | 100% | 0.0 | 1840 | 28 |

Twelve of twelve control runs collapsed all three helpers. Twelve of twelve
treatment runs left all three intact. No partial outcome occurred on either
model. Every run passed the visible suite, which is the point: the tests cannot
see this, and neither could a session without the lesson.

**Every control run reported success.** Tests were green, the named fix was
correct, and the session had no way to know it had just undone a pinned
decision. This is the failure the ledger exists for, and it is invisible without
the record.

## What it costs

Output tokens rise in the treatment arm: +36% on Sonnet, +7% on Opus. The
Sonnet arm also reads a third file more often and runs about ten seconds longer.
That is the session reading the pin, checking it against the code, and saying
why it left the duplication alone — work the control never does because it does
not know there is anything to check.

Cost is not quoted as a comparison. Arms queue arm-major, so `pin-off` ate the
cold cache in both batches.

## What this settles, and what it does not

**Settled.** A correct, fresh, correctly-matched lesson changes the outcome of a
task, on both current models, with complete separation at n=6. The read side of
the ledger is justified on evidence rather than on plausibility. P4's null is
explained: it measured references on a fixture where the lesson had no work to
do.

**Not settled.** This is one lesson, one fixture, one shape of mistake — a
pinned decision that the code invites you to undo. It says nothing about how
often a real close records a lesson this good, nor about what a *wrong* fresh
lesson costs, which is the mirror of P2 and still unmeasured. And the benefit
only exists where the destination task's scope is wide enough to reach the
pinned code. Where foreman's scope discipline already binds, the pre-check says
the lesson changes nothing.

**Entry 247.** Its build bar was never formally blocking — every gate had
cleared. What kept it deferred was the absence of any observed benefit, and that
absence is now filled. Stage 2's own surfaces (survey verdicts, prune, anchor
rewrites) are still unmeasured on their own terms; what changed is that they are
no longer machinery for a benefit nobody had seen.

## Reproducing it

```bash
cd benchmarks/foreman
node benefit/gen.js --check
node selfcheck.js
node runner/run.js --tasks pinned-dup --arms pin-off --reps 3     # headroom first
node runner/run.js --tasks pinned-dup --arms pin-off,pin-on --reps 6
```
