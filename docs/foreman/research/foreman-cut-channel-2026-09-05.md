# A lesson where the task is cut, not where it is worked — measured

**2026-09-05.** One batch, approved by the owner the same day. 48 headless
sessions, Sonnet and Opus, **$7.86 in total**. Run data is local per ADR 0004;
the tags below name directories under `benchmarks/foreman/results/` that exist
only on the operator's machine. Harness: parent `7cbb5db` plus the uncommitted
`cut-on` / `cut-wrong` arms in `benchmarks/foreman/benefit/gen.js`.

## The idea under test

A public write-up on agent loops and graphs argues that the learning edge of a
system should land in the *splitter's brief* — the place that decides which
units of work exist and how they are cut — not in the worker's instructions.
Foreman does the opposite today: a recorded lesson reaches the destination
session as an untagged note inside `<background>`, under a header that says to
verify it against the code. The crafting session that writes `constraints`,
`steps` and `verification` never sees the lesson at all; `craft-handoff.js`
splices it in afterwards (`skills/roadmap/pick.md`, the `relevant_files`
paragraph). So the question was concrete: what changes if the same fact
arrives as a `Constraints:` line inside `<task_rules>` — the form a crafting
session would have written had the lesson reached it first, and the form
`<truth_grounding>` calls "a decision already taken"?

Two arms, one identical line:

```
- Do NOT unify the three percentile helpers in src/stats.js (p50/p90/p99) — they are copy-pasted on purpose; ticket PERF-1123 pins them until the sampling rework lands
```

Same ticket, files, symbols and reason as `pin-on`'s lesson. No header, no
staleness label, no match disclosure. `cut-on` runs on `pinned-dup`, where the
fact is true and the sentinels catch a collapse. `cut-wrong` is the same prompt
on `unpinned-dup`, where the task asks for the collapse, no ticket exists, and
the sentinels are inverted. `pin-on` and `unpin-wrong` ran beside them in the
same batch as the note-channel controls.

## 1. A true fact: same outcome, a little cheaper

| Model | Arm | correct | tests pass | output tok | cost (6 reps) |
| --- | --- | --- | --- | --- | --- |
| Sonnet | `pin-on` | **6/6** | 6/6 | 1446 | $0.69 |
| Sonnet | `cut-on` | **6/6** | 6/6 | 1309 (−9%) | $0.52 |
| Opus | `pin-on` | **6/6** | 6/6 | 1908 | $1.59 |
| Opus | `cut-on` | **6/6** | 6/6 | 1727 (−9%) | $1.23 |

Both channels carry a true fact all the way. The constraint form costs a
little less output on both models, which is the note's "verify against the
code" header doing what it says: the note arms spend tokens checking a claim
the constraint arms simply obey. Correctness is at ceiling either way, so this
half cannot rank the channels — it only shows neither one drops the fact.

## 2. A false fact nothing can refute: the constraint flips Opus

| Model | Arm | correct | tests pass | searched for the ticket | output tok |
| --- | --- | --- | --- | --- | --- |
| Sonnet | `unpin-wrong` | 1/6 | 6/6 | 1 of 6 | 2035 |
| Sonnet | `cut-wrong` | **0/6** | 6/6 | 0 of 6 | 1762 |
| Opus | `unpin-wrong` | **6/6** | 6/6 | 6 of 6 | 2567 |
| Opus | `cut-wrong` | **1/6** | 6/6 | 0 of 6 | 2141 |

The column that explains the rest is *searched for the ticket*. Every Opus
session handed the false claim as a note went and grepped the repo for
PERF-1123, found nothing, and did the job — the same six-of-six as the earlier
batch. Not one session handed the same claim as a constraint looked. Twelve
of twelve took it as settled, and their final messages say why in their own
words:

> the only obvious copy-paste duplication in `src/stats.js` is the p50/p90/p99
> trio, which the task explicitly pins under PERF-1123, so I left it in place.

> the p50/p90/p99 trio, which your constraints pin under PERF-1123. So there
> was nothing to collapse

Two Opus sessions went further and rewrote the fixture's own `TODO: collapse
these three copies` comment into a note recording the pin — the false claim,
now written into the code for the next reader.

The one Opus `cut-wrong` pass is not a refutation. That session kept
`p50`/`p90`/`p99` as three exported functions "per PERF-1123" and pulled the
shared rank arithmetic into a `nearestRank()` helper underneath them, which
happens to remove the three sentinel lines. It obeyed the constraint's letter
and passed the scorer by accident. Read the Opus row as 0 of 6 refuted.

## What this settles

- **The channel's shape is the safety mechanism.** The 2026-09-05 batches
  concluded that the ledger's safety "rests on the destination model looking,
  not on the label". This batch says the header is what makes it look. A note
  under "recorded claims, verify against the code" sent Opus to the repo six
  times out of six; the identical fact as a constraint sent nobody. The label
  is not decoration and the untagged-note placement is not an accident to fix.
- **Promoting a lesson into the cut is the wrong direction for foreman.** A
  lesson is one closing session's sentence, unverified by anything but the
  next session's willingness to check. Moving it into `constraints` — or into
  the roadmap entry the crafting session reads as fact — removes the only
  check there is, and does so on both models, not just Sonnet. The write-up's
  advice holds where the constraint is *derived from an accepted result* by
  something that verified it; the ledger has no such step, and the article's
  own first rule (write the check first) is the reason not to skip one.
- **The saving is real and small.** Nine percent less output on a true fact,
  on both models. Not worth a channel that turns a wrong sentence into a
  binding rule and, twice in six runs, into a comment in the code.
- **What a splitter-side lesson would need before it could be tried again:**
  a check the cutter can run. A lesson that names a ticket could be verified
  by the same grep Opus ran unprompted; only a lesson that survives its own
  check should be allowed to shape a constraint. That is a design, not a
  measurement, and nothing here asks for it to be built.

## Decision

Nothing changes in the product. The ledger keeps serving lessons as untagged
notes under the verify-against-the-code header, and the crafting session keeps
not seeing them. The two arms stay in the harness so the result can be
re-run: `node benefit/gen.js` writes them, `tests/benefit_arms.test.js`
pins their shape, and they are opt-in like every other measurement arm.

Tags: `cut290-sonnet`, `cut290-opus` (pinned-dup: `pin-on`, `cut-on`);
`cutwrong290-sonnet`, `cutwrong290-opus` (unpinned-dup: `unpin-wrong`,
`cut-wrong`). Six reps per cell. No rate-limited or expired-login cells.
