# Rival idea pass — five sources against razor, hush and foreman

**Date:** 2026-08-18
**Status:** IDEA PASS ONLY. Nothing here is approved, specced or built. The only
files written are this document and the one it absorbs.
**Supersedes:** `fml-idea-pass-2026-08-17.md`, which covered one source and is
carried forward in full as §6 below. That file stays on disk as the long-form
detail for its own source.

**Method.** Five external sources read end to end. Every distinct mechanism in
each was extracted, then mapped onto one of the three plugins with a forced
verdict, then the survivors were handed to an adversarial reviewer per plugin
whose default answer was REFUTED, then a completeness critic was pointed at the
whole pass to find what it missed. Twelve agents, no errors.

---

## 1. Headline

| | |
| --- | --- |
| Mechanisms extracted from the four new sources | 234 |
| Already covered by a shipped plugin | 141 |
| Out of scope for the plugin they would land on | 47 |
| Bad on their merits | 39 |
| Reached adversarial review as candidates | 7 |
| **Survived adversarial review** | **1** |
| Revived by the critic after a wrong verdict | 2 |
| Cross-cutting gaps the critic found that no source raised | 3 |

The honest summary is blunter than the count. **The four new sources produced
zero adoptable external mechanisms.** The one candidate that survived review is
an inconsistency between two of our own benchmark harnesses, noticed while
reading one of the sources. Its own justification concedes this: "the mechanism
is grounded inside this house, not in the cited repo."

That is not a wasted pass. The three cross-cutting gaps in §8 are the real
product of it, and two of them are serious.

## 2. The five sources

| Source | What it is | Evidence it offers |
| --- | --- | --- |
| `fml.md` | A single-persona skill plus a `/fml` command. No hooks, no state, no tests. A per-request costume. | None. Pure assertion. |
| `github.com/Leonxlnx/unlazy` | A skill that fights premature stopping: acceptance criteria written to a `GATES.md` ledger, a `gate-check.mjs` runner, and a Stop hook that blocks the turn while a gate is unmet. | n=6, self-reported, no raw data. Its v2 mechanisms are unmeasured. |
| `claude.com/blog/maximizing-the-value-of-your-claude-code-sessions` | Official Anthropic article on per-session token cost. `/clear`, `/compact`, `/rewind`, `/context`, `@`-mentions, quiet flags, subagents for noisy work, model and effort set early to protect the prompt cache. | None. Pricing ratios and platform constants only. The headline session-length claim is explicitly unquantified. |
| `github.com/LLM-Coding/Semantic-Anchors` | An evaluation-methodology project. Fixed permutations of option order, multiple-choice scoring built specifically to avoid LLM-as-judge circularity, reproducibility metadata per run. | Methodology, not results. |
| `github.com/Vistyy/nopus/blob/main/evaluation/README.md` | A Stop-hook prose-complexity rewriter plus its calibration and regression harness, over a private corpus of 5,337 real assistant responses. | **The only source with real numbers.** Rewrite rates of 5.3% / 9.9% / 18.6% across three sensitivity profiles; sample compressions of 279→45, 287→106 and 435→156 words. |

Mechanism yield: unlazy 62, Semantic-Anchors 71, nopus 64, the blog 37.

## 3. The scope lines this pass held

Every verdict was forced through the boundary of the plugin it would land on.
These are the lines, and they are the reason most of the 234 died.

**razor — what code gets written.** A ~300-token ladder injected at SessionStart
and SubagentStart, plus PreToolUse gates that can deny a tool call. The ladder is
frozen at 1.1.3 and the published benchmark numbers are tied to its exact text.
Not report wording. Not planning.

**hush — what gets said.** An output style plus compression hooks. Mid-turn
silence, final-message shape, reading ease, tool-output compression, personas.
Not what code to write. Not what to work on next. Two written guarantees did more
refuting than anything else in this pass:

> Source code never matches, so a capped Read can never cut lines the model might
> need to edit byte-exactly.
> — `hush/hooks/compress-tool-output.js:635-641`

> A view that shows less than it was given must name where the rest is
> recoverable from.
> — `hush/hooks/lib/transform-manifest.js:3-5`

**foreman — the plan across sessions.** `ROADMAP.jsonl`, handoff prompts, task
tracking. Its written never-list killed a whole class of proposals on contact: no
teams, assignments, estimates, priorities or dashboards; no wiki or knowledge
base; no PR review or reviewer personas; no workflow definitions or agent-role
pipelines; no scheduler and no unattended runs; no server, account or hosted
state. Plus the mechanical-first rule: if a result can be computed from
`ROADMAP.jsonl`, Git, the working tree or config, code should compute it.

`foreman/docs/adr/SCOPE.md` also bans one artifact by name, which matters below:
"persistent acceptance-criteria and execution-record schemas," with the
safeguard "do not add acceptance-criteria, execution-record, or review-state
fields without a measured failure that requires them."

## 4. The one survivor

### S1 — Arm order is fixed in razor's benchmark queue, and it biases razor's own published claim

**Home:** razor, harness only. Nothing razor ships to users changes.
**Source:** Semantic-Anchors, corroborated by nopus. Neither cites the other.

razor builds its run queue in fixed nesting, at
`benchmarks/razor/runner/run.js:478-479`:

```js
for (const tid of taskIds) for (const model of models) for (const arm of arms) {
  for (let r = 0; r < runs; r++) cells.push([tid, arm, model, r]);
}
```

Every rep of `baseline` is queued before the first rep of `razor` inside each
task block. hush's harness already fixed exactly this, seed-replayably, at
`benchmarks/hush/runner/run.js:388-394`, with the reason written next to it: an
arm that systematically runs first pays a cold cache, and one batch's cost is not
comparable across batches because a warm prompt cache roughly halves it.

The empty search that establishes the gap: `grep -rniE
"interleav|shuffl|randomiz|permut|rng" benchmarks/razor` finds only a fixture
seed, never a queue seed. The same grep over `benchmarks/hush` returns eight hits.

**Why it matters rather than being tidiness.** `razor/README.md:165` publishes an
arm-to-arm cost claim — razor has the lowest average bill on the big model, about
6% under no-plugin. `report.js` headlines a median of per-task ratios and uses
`cost_mean`; both carry a per-arm bias straight through. The bias runs in the
direction the published claim points.

**Two counter-arguments that failed.** The 4-worker pool does not substitute for
the control — hush's harness runs a worker pool too and still shuffles.
Aggregation does not wash out a systematic per-arm bias.

**The load-bearing half is the rep nesting, not the shuffle.** Today all reps of
one arm are adjacent, so at the documented `--full --runs 3 --workers 4` the pool
launches baseline reps 0/1/2 plus razor rep 0 in the first wave: three cold-cache
cells for baseline against one for razor.

**Cost.** About ten lines plus a recorded seed and a `--seed` flag, porting
`makeRng`/`shuffled` verbatim from the sibling harness. Then one confirmation
run, roughly $1–3 on haiku.

**Risk.** A corrected re-run can move or invert the published row, which cannot
be edited without an explicit go under the no-auto-publish rule. Opposite risk:
the pool may already interleave enough that the fix buys a null.

**Test.** Order cannot be rescored offline. Run the cheap subset twice in one
sitting, `--arms baseline,razor` then `--arms razor,baseline`, and compare the
per-arm gap. Larger than run-to-run noise means the bias is real.

**Note when shipping:** two unrelated external projects independently prescribe
this control. Say so.

## 5. Revived by the critic

The mapping pass got these two wrong. Both are verified against the files.

### R1 — foreman records `model` and `effort` and never reads them back

**Home:** foreman. Marked COVERED; that is wrong.

`foreman/roadmap-schema.md` states the intent outright: the `model` field records
"which model **actually executed** this entry," and "the difference between
recommendation and reality is the signal being captured." `effort` is recorded
under the same rules.

The only writer is `foreman/scripts/roadmap.js:1051-1052`. The only reader is
validation — `roadmap-doctor.js:194-198`, emitting `unknown_model` and
`unknown_effort`. Greps for aggregation across `foreman/scripts` and
`foreman/skills` return nothing.

So the signal is captured and discarded. The mechanical-first rule points
straight at the unbuilt half, reporting what already happened needs zero schema
growth, and nothing on the never-list forbids it — a survey line is not a
dashboard. Two independent sources converge on model-tiering by work difficulty
(§7.5), which is the reason to look again.

**Stay on scope.** This is *reporting the recorded reality*, not recommending a
model. foreman's refusal to have an opinion about which model to use
(`skills/craft-prompt/SKILL.md:243-245`) is deliberate and stays.

### R2 — razor injects the identical ladder at every effort level

**Home:** razor. Marked OUT_OF_SCOPE; the refusal conflated *setting* effort with
*reading* it.

Setting the harness effort is correctly out of scope. Reading it is not: the
house's own probe result is that hook input carries no `model` but effort **is**
readable. `razor/hooks/razor-lib.js` already believes the ladder's economics vary
by reasoning behaviour — the comment above `RULESET` says a ruleset that invites
deliberation can cost more than it saves on terse reasoning models — and then
injects the same ~300 tokens at every effort level, at SessionStart and at
SubagentStart.

A conditional injection keyed on a readable signal is the only injection shape
this house has ever measured as beating the cost-vs-coverage curve. Correct
verdict: candidate with a rescoreable arm.

**Blocker.** Any variation in what gets injected is a variation in the frozen
ladder's delivery, and the published numbers assume one payload.

## 6. Carried forward from the fml pass

These came from the 2026-08-17 pass and **have not been through the adversarial
review the four new sources got.** They sit at a lower evidence bar than
everything above. Full detail in `fml-idea-pass-2026-08-17.md`.

| # | Idea | Home | Standing after this pass |
| --- | --- | --- | --- |
| C1 | Access-widening earns one consequence sentence | razor | Unchanged. Still the only fml idea that fills a hole in a shipped ruleset. Detection precision decides it, not wording. |
| C2 | A question is not a work order | razor | Unchanged. Wants the frozen ladder. |
| C3 | Name the one check, not the list of maybes | hush | **Upgraded.** unlazy independently arrived at the same rule for its block payload — name the unmet gate and one next action, not a list. Two-source convergence. |
| C4 | Taste is not a blocker | razor | Unchanged. Wants the frozen ladder. |
| C5 | Personality as a budget, not a costume | hush | Unchanged. Preset-level, unmeasured, cheap. |
| C6 | Will/won't contract as a README section | all three | Unchanged and still free. foreman's README has a "never grow into" note already; hush and razor state no refusals at all. |
| C7 | One-turn persona instead of a session-wide style | hush | Unchanged. |
| C8 | A dense calibration block of worked pairs | hush | **Weakened.** nopus's numbers show a well-tuned corrective fires on about one response in ten; hush's own measurements say style-file density does not behave the way it looks. Measure-first, and probably not first. |

## 7. Cross-source convergence

None of the five sources cites another, and three have no measurement at all.
Where two or more land on the same mechanism independently, that is the closest
thing to evidence this material offers, and the default of "an external assertion
is a hypothesis" should relax one notch. The mapping pass argued every verdict
source-by-source and never once flagged convergence.

1. **Order and label randomisation.** Semantic-Anchors prescribes fixed
   permutations of option order; nopus randomises which arm prints as "Rewrite A"
   and keeps the mapping private, with a written no-peek rule on holdout. This is
   S1, and it has external corroboration the pass did not notice.
2. **Intervene exactly once at the turn boundary, with a release valve.** unlazy
   blocks on Stop with a `MAX_BLOCKS=6` valve and an `ABANDON` exit. nopus:
   exactly one automatic rewrite, no loop. In-house, independently: razor's
   dep-guard is "one forced reconsideration per dependency, never a hard block,"
   and foreman latches its task-completed gate per session and per task. Four
   independent arrivals. What it exposes: **hush registers no turn-boundary hook
   of any kind.** The one Stop candidate for hush was refuted on delivery cost,
   which is a fair objection to that design and not to the convergent claim
   underneath it.
3. **Never let a model adjudicate its own work.** unlazy replaces model
   re-reading with runnable checks and scores a ticked box with `pending`
   evidence as unmet. Semantic-Anchors builds a multiple-choice eval specifically
   to kill judge circularity. nopus requires no model call and no randomness in
   its policy. Three sources. The one model-judged metric in this house is
   `benchmarks/hush/runner/retention.js`, whose own header calls the judge a
   known ceiling. Three-way convergence says that ceiling is structural — a
   design limit, not something more reps fix.
4. **The always-on layer is the expensive one; move enforcement out of it.** The
   blog says nothing gets sent just once, and to move workflow instructions out of
   `CLAUDE.md` into skills. Semantic-Anchors partitions always-on from task-local
   and keeps the resident set small. unlazy notes its hook costs zero tokens
   because it is a file scan. Three sources independently arrive at razor's
   shipped architecture — real corroboration, logged by the pass as three
   separate COVEREDs. **The unasked question is hush's:**
   `hush/output-styles/hush.md` is ~140 lines resident on every turn and has never
   been measured against a hook-delivered alternative, even though the one time
   hush tested delivery against wording, delivery won decisively.
5. **Model tiering by work difficulty.** The blog says to match model size to
   problem difficulty and to give a repeated noisy job its own subagent
   definition. unlazy sends mechanical work to a cheaper model and keeps design
   and verification strong. Two sources against foreman's write-only fields. This
   is R1.

## 8. What all five sources — and all three plugins — miss

This is the most valuable output of the pass. None of it came from the sources.

### (a) The suite is never treated as a suite, and two members contradict each other

`razor/hooks/razor-lib.js:30`:

> One check is enough, anywhere in this task — a search, a manifest read, a
> file-existence check, a convention scan. If it already came back empty, or a
> tool error already told you what to do, act on that; don't re-verify or broaden
> it.

`foreman/prompt-template.md:151-157`, the `<truth_grounding>` block:

> Before acting on anything in this prompt, verify it against the current state
> of the codebase — read the cited files, run the cited commands … treat every
> claim below as a hypothesis to confirm at the start of this session.

Opposed instructions on the same axis, delivered into the same context window.
razor injects at SubagentStart as well, which is exactly where foreman's
background `Agent` dispatch lands — so the collision is likeliest in foreman's
headline path. There is no test, no benchmark arm and no README sentence about
it anywhere, and both harnesses run with only one plugin loaded *by design*,
which guarantees every published number is blind to it.

All five sources assume their mechanism is the only resident text. None has a
word about two resident rulesets disagreeing.

The fix is not a feature: one interleaved arm with razor and foreman loaded
together on foreman's own fixtures, and if the conflict is real, one clause in
one of the two files.

### (b) Nothing anywhere checks whether the final message is true

`benchmarks/hush/runner/` scores words, cost, cap conformance, reading ease and
blind retention of pre-frozen key details. **A confident false conclusion that
names all the right identifiers wins on every one of them.**

razor is safe here because it scores the artifact by running it. foreman requires
citation and then concedes the rest, in `../../../foreman/docs/adr/SCOPE.md`: "the model still judges the
evidence because truthfulness cannot be reliably inferred from note syntax."

unlazy is the only source that hit this empirically, and its finding was thrown
away by the mapping pass: its single hard live failure was a baseline **whose
report claimed the case was handled**. Caught by live testing, not by the report.

This is cheap to close in the direction hush already runs. Records retain
`finalText`, `--rescore` is free and offline, and the six fixtures have ground
truth. A claim-versus-ground-truth scorer is a rescore, not an API batch. Until
it exists, every hush claim reduces to "shorter, and still contains the right
nouns," which is not "still correct" — and the product's entire pressure is
toward shorter, the direction that makes an unchecked false claim cheaper to emit
and harder to spot.

### (c) Nobody prices the subagent multiplier

razor injects the ladder at SubagentStart. hush injects `subagent-brief.js` at
SubagentStart. foreman's main output *is* a dispatched `Agent`. Every fan-out
pays all three injections, and every published per-session number in both
harnesses comes from a single-agent run. No source raises it; no harness has an
arm for it.

## 9. Refuted, and why

Six of the seven candidates died under adversarial review. Recorded so nobody
re-proposes them.

| Candidate | Home | Killed by |
| --- | --- | --- |
| Skip a re-read of an already-loaded file | hush | Inverts hush's one written Read guarantee, and the only honest recovery is "read it again" — a second tool call plus a full-context round trip. The same backfire is already measured twice inside `compress-tool-output.js`. |
| Rewrite noisy commands with quiet flags | hush | A source-side flag deletes output before hush sees it — the one loss shape with no recovery location and no fallback, and the only mechanism in the house that could permanently destroy a warning line. A dot reporter also prints the full failure report, so it does not shrink the case that justified it. |
| Put the corpus regression in the ordinary test command | hush | Nothing in the hush plugin would change; its own CI already runs every shipped test. The residue is real but it is marketplace-repo CI housekeeping, not a hush gap. Recorded as §10. |
| One automatic rewrite on Stop | hush | Violates the style's opening contract — the harness cannot unrender the first message, so a fired gate leaves two. The proposed scorer forbids itself from being the enforcer in its own header. hush already shipped a counting read-back and measured a win at zero cost. And at the measured rate it is a per-turn tax, not a rare corrective. |
| A decisive `Expected:` line in handoffs | foreman | The named surface is a bracketed placeholder that `check-prompt.js` strips before delivery, so the clause would never reach an executing session. The failure it guards against belongs to a grep-based gate checker foreman does not have. |
| Record the dated model id per run | razor | Already on disk. `metrics.js:231-232` writes the entire final result event to every cell, and the CLI's result event carries `modelUsage` keyed by model id. razor is already on the stream path the item proposed switching to, and there is no `-latest` alias anywhere in the harness. |

Two measurements surfaced while refuting, both worth keeping:

- The shipped hush arm breaks its own 10-word cap on **48.3% of units** (57/118)
  in one retained batch, longest sentence 37 words. The scorer's own header calls
  itself a regex pass with a known ceiling, so treat this as an upper bound on
  violations, not a verdict.
- All three offline suites pass locally and cost nothing: 168/168 for the hush
  harness in 2.35s, 5/5 for foreman's in 0.11s, and the records validator green.

## 10. Corrections to the pass itself

The critic found three defects in the mapping pass. They are recorded because
the same failure modes will recur in the next one.

**COVERED was doing double duty.** At least six entries argue *considered and
refused*, not *already does it*. Anyone auditing the list for gaps reads COVERED
and stops — which is exactly how R1 got buried.

**One invented piece of evidence.** A COVERED verdict asserted that each
`hooks.json` carries a `commandWindows` variant beside every POSIX command.
Verified counts: **razor 0, hush 8, foreman 6**. razor uses a different
cross-platform idiom, `"command": "node"` with `"args": [...]`. The conclusion
survived; the evidence was fabricated. The real observation is better than the
claimed one: two sibling plugins use two incompatible idioms and no test pins
either.

**Housekeeping residue, filed against this repo and not against hush.**
`.github/workflows/validate-marketplace.yml` is the only workflow and runs three
checks. Five of the six files in `benchmarks/hush/tests` run under no automation
at all. Those tests are stdlib-only, read the benchmark README rather than the
plugin one, and build their fixtures in temp dirs, so a records-free clone would
go green.

## 11. Constraints all of this inherits

- **Four of the five sources offer no measurement.** An external project
  asserting a rule is a hypothesis. The one exception is nopus, whose numbers
  were the most useful thing any source contributed — and they argue *against*
  the candidate that cited it.
- **razor's ladder is frozen** and the published numbers are tied to its exact
  text. C1, C2, C4 and R2 all want to touch it. They land outside it, or the
  corpus is re-run.
- **hush's style file has a non-obvious density relationship.** Adding text to it
  has measurably produced longer output. A cap of 8 backfired.
- **Priming is the recurring failure mode**, recorded in
  `hush/hooks/silence-nudge.js`: naming the unwanted behaviour primes it. C1's
  trigger list and any corrective that quotes the fault back are the exposed
  cases.
- **Delivery beats wording** is the one lever this house has measured as
  decisive, and convergence pattern 4 says the resident style file is where it
  has never been tried.
- **Naming.** These sources may be named in a plugin README and nowhere else.
  This document is under `docs/`, which is gitignored. The names must not travel
  into a CHANGELOG, commit message, test fixture or code comment.
- **No benchmark number reaches a README** without an explicit go.

## 12. If only a few things are done

1. **S1, razor's arm order.** It is ten lines, it is the only survivor, it has
   two-source corroboration, and it sits underneath a published claim that points
   the same way the bias does. Cheapest thing here with a real consequence.
2. **§8(b), a truth scorer for hush.** The largest unguarded hole in the suite,
   and closing it is a free offline rescore over records already retained. Every
   quality claim hush makes rests on metrics that a confident wrong answer
   passes.
3. **§8(a), one interleaved razor-plus-foreman arm.** Two shipped products give
   opposed instructions on the same axis in the same context window, in foreman's
   headline path, and no measurement in the house can see it.

C6 from the fml pass is still free and still wanted, and belongs to whoever next
edits a README.
