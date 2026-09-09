# craft-prompt and the unknowns frame — design, 2026-08-07

Scope: `foreman:craft-prompt` only, audited against four Anthropic articles.
Deliverable is this document; no code changed in this pass.

Sources read in full:

| # | Article | How it was read |
|---|---------|-----------------|
| A1 | The new rules of context engineering for Claude 5 generation models | fetched |
| A2 | A harness for every task: dynamic workflows in Claude Code | fetched |
| A3 | Effective context engineering for AI agents | fetched |
| A4 | A field guide to Claude Fable 5: finding your unknowns | local copy, `docs/foreman/research/fable-field-guide-unknowns.md` |

## Verdict

Two changes survive YAGNI. Both are prose edits to
`skills/craft-prompt/SKILL.md`. Neither touches a script, the template, the
gate, or a test. Together they cost the user **one extra question inside an
existing dialog** — no extra round trip, because Call 1 asks two of the four
questions `AskUserQuestion` allows.

> Implemented 2026-08-07. One cost this design missed: `SKILL.md` is a
> content-hashed fixture of benchmark record `R-012-instruction-load`, so the
> edit invalidated it. Superseded by `R-014-instruction-load` — see
> "Benchmark record" under Mechanical detail.

Eleven candidates were dropped. The drop list and its reasons are the last
section, and three of the drops are already-recorded project decisions that
must not be re-proposed.

The short reason the count is this low: craft-prompt already implements most
of what these articles ask for. A prior audit reached the same conclusion for
foreman as a whole — `docs/shared/research/opus5-backlash-recon-2026-08-06.md`, the
section "foreman — omitted by the first two passes, and it needs nothing".
The gap that remains is narrow and specific, and A4 names it exactly.

## What the gap actually is

craft-prompt's interview asks the user for everything the prompt needs. Every
question expects an answer, and every answer is treated as known. There is one
exception, at Call 3 Q4, which tells the crafter what to do when the user
cannot name an invariant:

> if the user can't name the assertion, say that in the line rather than
> passing the name through

That instruction is the right handling of a known unknown, and it appears in
exactly one field out of ten. Everywhere else, a user who does not know
something either guesses, or the field is quietly omitted, and the assembled
prompt looks equally confident either way.

A4's four quadrants make the shape clear: craft-prompt is a very good
known-knowns collector, and it has no idea which of the answers it collected
were guesses.

---

# Change 1 — Call 1 asks where the user is starting from

**Motivated by** A4, "Help Claude help you": *"The most important part of this
process is to give Claude context about your starting point… disclose your
experience with the problem and codebase."* Also A4, "Blind Spot Pass".

**Changes** `skills/craft-prompt/SKILL.md`, the "Call 1 — task type and
optional sections" section.

Call 1 currently asks two questions. `AskUserQuestion` accepts four. Call 2 is
already at four, so Call 1 is the only place a question fits without adding a
round trip.

### The insert, after Call 1's Q2

```markdown
**Q3** — "How well do you know this part of the code?"
Options:
- `I know it well` — I can name what should change and what must not.
- `I know the goal, not the code` — I know what I want; this area's shape is
  new to me.
- `This area is new to me` — I could not yet say what a good answer looks
  like here.

This is a starting-point line, not a section: it changes what the assembled
prompt says, never which blocks it carries.

- `I know it well` — nothing is added.
- `I know the goal, not the code` — add one `judgment.context` line:
  "Starting point: the user knows the goal but not this area's code, so the
  file list and steps below are a best guess at its shape, not a survey of
  it."
- `This area is new to me` — say in one line that a blind spot pass here is
  cheaper than a wrong prompt, and offer to run one in this session before
  crafting. A cold session cannot teach an absent user, so the pass belongs
  here, not in the prompt. If the user takes it, its answers feed Call 2's
  files and steps and Call 4's background context, and Q3 is re-read as
  `I know the goal, not the code`. If the user declines, add the context line
  above plus one first `judgment.steps` bullet:
  "Before making changes, do a blind spot pass on this area: name the unknown
  unknowns — the questions this task should have answered, what good looks
  like here, prior work already done, and the potholes — and report them.
  Then proceed with the conservative reading."
```

### Cost

One question, inside Call 1's existing dialog. Zero extra round trips. On the
`I know it well` answer the whole change is inert.

### Gate and tests

- No new judgment field. The output lands in `judgment.context` and
  `judgment.steps`, both already assembled by `contextText()` and
  `taskRulesText()` in `scripts/craft-handoff.js`.
- `checkPrompt()` in `scripts/check-prompt.js` is unaffected: it validates
  block structure, not bullet content.
- One wording trap. `REASONING_ECHO_RE` at `check-prompt.js:55` warns on
  `explain … your reasoning`. Word the bullet with **name** and **report**, as
  above. "Explain your reasoning about what you don't know" would trip it.
- Additive prose only, so every SKILL.md pin in `tests/check_prompt.test.js`
  and `tests/entrance.test.js` stays green.

---

# Change 2 — a don't-know is carried, not guessed and not dropped

**Motivated by** A4, "Knowing your unknowns" (the known-unknowns quadrant) and
A3, "System Prompts / Right Altitude" — a prompt that states a gap is at the
right altitude; one that invents a confident answer over the gap is not.

**Changes** `skills/craft-prompt/SKILL.md`, a new short section immediately
before "Resolve the named files".

### The insert

```markdown
## When an answer is "I don't know"

`AskUserQuestion` always appends its own free-text option, so any question
here can come back as a don't-know. Carry it through as a stated unknown —
never as a guess, and never by dropping the field. Call 3 Q4 already says this
for invariants; the same holds for every question in this interview.

- **Call 2 Q2, the done state** — the one that blocks. A prompt with no
  checkable "done" wastes the whole session. Ask once more for the observable
  signal before assembling.
- **Call 2 Q3, the files** — becomes a `judgment.context` line naming what the
  user could not name, so `relevant_files` is honest about its own reach
  instead of reading as surveyed.
- **Anywhere else** — one `judgment.context` line: "Open question the user
  could not answer: <the question>. Resolve it from the code and say what you
  found."
```

### Cost

Zero questions, zero turns. It changes what the crafter does with an answer it
already receives.

### Gate and tests

Same as Change 1: no new field, no script change, additive prose. The Call 2
Q2 escalation is the only one that can stop the interview, and only on an
answer that would otherwise produce an unusable prompt.

---

# Coverage map

Every named practice in the four articles, against what craft-prompt does
today.

## A4 — the four quadrants

| Quadrant | Surfaced today by | Status |
|---|---|---|
| Known knowns | The whole interview: Call 2 Q1–Q4, Call 3, Call 4 | **Covered** |
| Known unknowns | Call 3 Q4's invariants instruction only — one field of ten | **Partly** → Change 2 |
| Unknown knowns | `Pattern:` line from `resolve-symbols.js` `references`; Call 2 Q3's ask for an analogous implementation; the optional `<example>` section | **Covered** |
| Unknown unknowns | Nothing asks, and nothing in the prompt looks for them | **Not covered** → Change 1 |

## A4 — the named practices

| Practice | craft-prompt today | Status |
|---|---|---|
| Blind spot pass | — | **Not covered** → Change 1 |
| Starting-point context | — | **Not covered** → Change 1 |
| Brainstorms and prototypes | — | Dropped, D1 |
| Interviews | The six-call interview is this practice | **Covered** |
| References | `relevant_files` `Pattern:` line, `<example>` | **Covered** |
| Implementation plans | `<plan>` block, `task_rules` steps | **Covered** |
| Implementation notes / deviation log | `truth_grounding` routes a mismatch to the final message; `scope_discipline` routes extra work to a roadmap entry | **Covered** — see D2 |
| Pitches and explainers | — | Dropped, D1 |
| Quizzes | — | Dropped, D1 |

## A1 — the six paradigm shifts

| Shift | craft-prompt today | Status |
|---|---|---|
| Rules → judgment | The template is deliberately rule-shaped | Dropped, D3 |
| Examples → design interfaces | The interview is typed `AskUserQuestion` options, not prose examples | **Covered** |
| Upfront → progressive disclosure | Entry 204 removed the 53k `prompt-template.md` read; the skill now reads `destination-question.md` at Call 5 and the template's checkpoint section only at delivery | **Covered** |
| Repeat yourself → simple descriptions | Entry 223 deduped the two prose blocks shared with `skills/roadmap/pick.md` | **Covered** |
| CLAUDE.md memory → auto-memory | Not foreman's layer | N/A |
| Simple specs → rich references | `Verification (REQUIRED)` is the runnable-check half | Dropped, D4 |

## A2 — dynamic workflows

| Item | craft-prompt today | Status |
|---|---|---|
| `agent(prompt, {schema})` stage | The Workflow-stage flavor, entry 028 | **Covered** |
| The six harness patterns | craft-prompt builds one prompt, not a harness | Dropped, D5 |
| Token budgets, `/loop`, `/goal` | Native | N/A |
| "Does it really need more compute?" | Argues against every D5 candidate | — |

## A3 — effective context engineering

| Principle | craft-prompt today | Status |
|---|---|---|
| Right altitude | The known-unknowns handling is the one place altitude slips | **Partly** → Change 2 |
| XML tags, distinct sections | The template is exactly this | **Covered** |
| Minimal high-signal tokens | `standard` / `reinforced` profiles, entry 138 | **Covered** |
| Just-in-time context | `relevant_files` cites symbols, never pasted code | **Covered** |
| Metadata as behavioral refinement | `lastChanged` and `references` from `resolve-symbols.js` | **Covered** |
| Structured note-taking | Same channel question as A4's implementation notes | **Covered** — see D2 |
| Sub-agent architectures | The background-Agent destination | **Covered** |

---

# Mechanical detail

## What does not change

`scripts/craft-handoff.js`, `scripts/check-prompt.js`,
`scripts/render-sections.js`, `prompt-template.md`, `settings.md`,
`skills/roadmap/pick.md`, `skills/roadmap/destination-question.md`, and every
file under `tests/`.

`CHANGELOG.md` is not touched here either: the `cut-release` skill writes the
entry into the plugin's changelog at release time, and this file has never
carried an `Unreleased` heading.

No new `.foreman/config.json` key. Neither change is a behavior a project would
want to switch off: Change 1 is inert on the `I know it well` answer, and
Change 2 only fires on an answer the user actually gave.

`skills/roadmap/pick.md` deliberately stays untouched. It builds its handoff
from a roadmap entry, not from a live interview, so it has no question to add
and no don't-know to catch. That is a real divergence between the two flows,
and it is the correct one.

## Test pins a SKILL.md edit must respect

All additive-safe, but two are exact-text and one is a negative:

| Test | Pins |
|---|---|
| `check_prompt.test.js:378` | SKILL.md still names `skills/roadmap/destination-question.md` |
| `check_prompt.test.js:403` | SKILL.md still carries `` `invariants` ``, `Expected file surface:`, `test-first ordering` |
| `check_prompt.test.js:448` | Exact line-wrap of Call 2 Q3: `naming the functions or classes that\nmatter in each`. Re-wrapping Q3 breaks this |
| `check_prompt.test.js:499` | The unexpanded-path instruction's wrapping |
| `check_prompt.test.js:778` | SKILL.md calls `craft-handoff.js` and keeps the never-say-the-profile rule |
| `entrance.test.js:74` | The advanced-surface framing, plus `doesNotMatch(/when_to_use:.*wants to create a task/)` |

Neither change edits Call 2 Q3 or the frontmatter, so all six hold.

## Benchmark record

`skills/craft-prompt/SKILL.md` is fixture 7 of
`benchmarks/records/R-012-instruction-load.json`, which content-hashes every
file it measured. Editing the skill invalidates that record, and
`validate-records.js` fails on the sha mismatch rather than letting a stale
number stand — the record says so in its own limitations list.

The house move, precedent `R-003` → `R-005` at entry 204, is to supersede, not
edit in place. `R-014-instruction-load` carries `supersedes:
"R-012-instruction-load"`, fresh hashes, and a re-measurement. Superseded
records stay in the directory as history; `validate-records.js:88` skips byte
verification for any record another one supersedes.

`R-013` was already taken by a `prompt-overhead` record, hence `R-014`.

What moved:

| Flow | R-012 | R-014 |
|---|---|---|
| `fast_pick_via_entrance` — the record's headline claim | 8,849 | 8,849 |
| `craft_prompt` | 5,218 | 5,908 |
| every other flow | — | byte-identical |

The claim text is carried over unchanged because the flow it describes did not
move. The measurement is `bytes / 4` per file: deterministic, no model call, no
cost.

## Suite

```
node --test foreman/tests/*.test.js
```

1000 pass, 0 fail, ~24s. No test reads the two inserted sections.

---

# Dropped, and why

**D1 — Brainstorms, prototypes, pitches, explainers, quizzes.** *(A4)* Each is
a separate artifact produced in a working session with the user present.
craft-prompt produces one prompt for a session where the user is absent. A
quiz written by a cold agent for a user who is not there is not the practice
A4 describes. Different product.

**D2 — An `implementation-notes.md` deviation log in the prompt.** *(A4
"Implementation notes"; A3 "Structured note-taking")* This looked like the
strongest candidate and it does not survive. The channel already exists in all
three destinations: `truth_grounding` says a mismatch is "part of the outcome:
state it in one line of your final message"; the closing paragraph routes
findings to "the roadmap entry, the commit message, or the artifact the task
names"; and the `Execute here, split by check` path already commits per task,
so the commit message is the durable home. A4's file is a substitute for a
channel foreman has. Adding it would be a second place for the same fact.

**D3 — Slimming the rule-shaped template toward judgment.** *(A1 shift 1)*
Already adjudicated. `docs/shared/research/opus5-backlash-recon-2026-08-06.md`,
"foreman — omitted by the first two passes, and it needs nothing": *"a
template this explicit could start costing more than it buys on later models.
That is a measurement question for a future release, not an edit today."*
Re-proposing it as a design item ignores a recorded decision.

**D4 — Rich-reference deliverables: HTML artifacts, rubrics.** *(A1 shift 6)*
The runnable half already ships as `Verification (REQUIRED): Run:/Expected:`.
The artifact half is an authoring tool, not a prompt field.

**D5 — The six harness patterns as craft-prompt options.** *(A2)* Building a
workflow generator is a different product from building a prompt, and A2 says
so itself: *"parallelism and specialization have to earn their coordination
cost."* Entry **076** already rejected the closest neighbour, a structured
status-block flavor, as superseded by the Workflow-stage flavor.

**D6 — Explore-grounded options for Call 2 Q3's file list.** Entry **074**,
status `deferred`, with a stated trigger: *"Deferred until a real trace shows a
hand-typed relevant_files entry pointing at the wrong file."* No such trace
exists. Re-proposing it now would jump a gate the project already set.

**D7 — Rubric-shaped gate errors with `fix` and `example` fields.** Entry
**075**, status `deferred`: *"Deferred until any craft trace needs 3+ gate
iterations to converge; evidence to date says 2 always suffice."* Trigger not
met.

**D8 — One question at a time.** *(A4 "Interviews")* A4's example prompt says
one at a time; craft-prompt batches up to four. The batching is measured and
deliberate, and the one-at-a-time rule is recorded in this project as folklore.
No change.

**D9 — A new `blindSpot` judgment field with fixed template wording.** The
cheap version of Change 1 needs no field: `judgment.context` and
`judgment.steps` already carry it. A field would mean a template block, a gate
rule, and tests, for text the existing fields deliver verbatim.

**D10 — A `.foreman/config.json` key to disable the starting-point question.**
Nothing to disable. The `I know it well` answer already costs nothing.

**D11 — Mirroring both changes into `skills/roadmap/pick.md`.** pick.md builds
from a roadmap entry, not an interview. It has no question to add.
