# razor scope-drift nudge — 224 sessions, $35.65

**Date:** 2026-08-28
**Status:** MEASURED, then BUILT. razor was untouched while the numbers were
taken; the winning arm shipped afterwards at razor `d65b65e` (the note) and
`dcdc586` (the multi-turn benchmark), unreleased and unpushed, suite 310/310.
**Harness:** `docs/razor/research/scripts/razor-drift-probe.js` (local, run data never ships —
ADR 0004). Records under the session scratchpad, not the repo.

## The proposal

A one-line clause telling the session to warn the user when a later request has
left the task the first prompt named, so the user knows when to start a fresh
session. Explicitly a nudge, never a blocker.

## Why it needed a new harness

razor's benchmark is single-turn — every task in `benchmarks/runner/tasks.js`
is one `prompt`. A drift warning can only exist on a second or later turn, so
the existing corpus could never see one. This is the same blind spot that made
the PreToolUse gates unpriceable, and the fix is the same: a resumed
conversation, modelled on `scripts/razor-gate-probe.js`.

## Design

One seed, one turn 1 (`add bytes() to formatters.js`), and four scenarios that
differ only in what comes after it. Every later turn carries a label saying what
it *should* produce.

| scenario | turns | turn 2+ | label |
| --- | --- | --- | --- |
| `real-drift` | 2 | an unrelated `parseCsv` in a new file | warn |
| `honest-pivot` | 2 | turn 1's own spec was wrong, fix it | silent |
| `natural-expansion` | 2 | add tests for `bytes()` in a new file | silent |
| `late-drift` | 4 | in-scope work, then the drift, then more of the new task | silent, warn, after |

`after` turns are reported, never scored: warning again once the session has
already been flagged is nagging, not a miss.

Four arms, all carrying razor itself:

| arm | clause delivery |
| --- | --- |
| `razor` | none — control |
| `razordrift` | SessionStart, razor's own channel for the ladder |
| `driftprompt` | UserPromptSubmit, restated every turn |
| `driftonce` | UserPromptSubmit, plus "Say it at most once in a session" |

Every hook fire is logged to `_driftfires.log` in the workspace, so a missed
warning can be told apart from a clause that never arrived. It always arrived:
`fires` equalled the turn count in every UserPromptSubmit cell.

## Results — 224 sessions, six batches, Sonnet and Opus

| arm | n | recall | false alarms | nags | code works |
| --- | --- | --- | --- | --- | --- |
| `razor` | 48 | 0/24 | 0/84 | 0/12 | 48/48 |
| `razordrift` | 72 | 32/44 (73%) | 0/120 | 0/20 | 72/72 |
| `driftprompt` | 40 | 26/28 (93%) | 0/66 | 4/14 | 40/40 |
| `driftonce` | 64 | 27/32 (84%) | 0/112 | 1/16 | 64/64 |

### 1. The false-alarm rate is a real zero

**0 false alarms in 382 silent turns**, across every arm and both models.

This is the result the whole probe was built to find, so it was re-checked
against a much wider net than the scoring oracle: every sentence of every
silent turn's final text containing *session*, *scope*, *task*, *unrelated*,
*focus*, *off-topic* or *sidetrack*. **Zero sentences flagged.** The zero is not
an artefact of the detector.

`natural-expansion` was built specifically to be the hard trap — writing a new
test file is new scope by a literal reading, and obviously wanted by any human
reading. Nothing warned there, 26 sessions.

### 2. It never blocks and never refuses

**224/224 sessions produced working code.** Four rows scored
`complied=false`; all four were the checker being picky about a literal string,
and every one had done the work correctly. Zero refusals, zero stop-and-ask.

### 3. It is free

Batch `dr6` ran `driftonce` against the bare control, 32 sessions each,
interleaved in one batch so the costs are comparable:

| arm | mean cost per session |
| --- | --- |
| `razor` | $0.1562 |
| `driftonce` | $0.1563 |

One hundredth of a cent apart. There is no cost argument either way.

### 4. Recall is the real weakness, and it is noisy

No arm detects drift reliably, and the batch-to-batch swing is large:
`real-drift` on Opus with `razordrift` scored 3/3 in one batch and 1/3 in the
next with nothing changed. `driftonce` scored 15/16 in batch D and 12/16 in
batch E. **Never quote one batch as settled** — the same trap the corpus
re-measurement hit on 2026-08-21.

Sonnet specifically goes deaf late in a conversation. On `late-drift`, where the
drift lands on turn 3 of 4, `razordrift` recall on Sonnet is 6/10 against 9/10
on Opus. The UserPromptSubmit log proves the clause was present on the very
turn that missed it, so this is judgment, not delivery.

The gaps between the three clause arms are inside the noise at these n. What is
NOT inside the noise is the gap to the control: 0/24.

### 5. Restating the clause costs nagging, and one sentence fixes it

`driftprompt` warned again on the turn after the drift in 4 of 14 chances.
Adding *"Say it at most once in a session — if you have already said it, stay
quiet"* cut that to 1 of 16, with no measurable recall cost.

## Verdict

The idea is safe, free, and works most of the time.

- The risk that would have killed it — nagging the user on legitimate work — is
  a measured zero across 382 silent turns.
- The never-blocks promise survives intact: 224/224.
- The cost is nil.
- The catch: it misses roughly one drift in six, and which sixth is not stable.

It shipped, and `driftonce` is the arm — UserPromptSubmit delivery with the
once-per-session sentence. It is not razor's existing channel; the ladder's
SessionStart injection is measurably worse at this (73% against 84%), though
the gap is not significant on its own.

## Open, and deliberately not answered here

1. **Whether it belongs in razor at all.** razor's mission is the YAGNI ladder,
   and rung 1 already suppresses work nobody asked for. This clause is session
   hygiene, a different concern. That is an owner call, not a measurement.
2. **The frozen ladder.** `RULESET`'s exact bytes back razor's published
   numbers. This clause must be its own injection, not an edit to the ladder.
3. **The objective alternative.** "When to start a new session" has a
   measurable predicate that needs no model judgment — context fill, already
   read by `foreman/hooks/context-fill.js`. A drift clause and a fill reading
   answer different halves of the same question.
