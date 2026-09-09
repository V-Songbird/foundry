# Foreman vs. four 2026 talks on prompting Claude Code

Date: 2026-08-29
Scope: foreman's prompt surfaces only — `prompt-template.md`,
`scripts/craft-handoff.js`, `scripts/check-prompt.js`,
`skills/craft-prompt/SKILL.md`, `skills/roadmap/pick.md`,
`roadmap-schema.md`. No foreman file was edited by this pass.

Sources (verbatim transcripts on disk):
- Margot Vanlar, Anthropic — "The Prompting Playbook"
- A consumer Claude feature walkthrough ("the manual series")
- Andrej Karpathy's ramble method, relayed by Duncan Rogoff
- Boris, creator of Claude Code — "practical tips and tricks"

---

## 1. Verdict

**Mostly no.** Every technique the four talks actually teach about prompt
construction is already implemented in foreman, most of it verbatim in
`prompt-template.md`. Two small findings survived refutation, and both are
free — one widens an existing error string, one deletes a single word from
skill frontmatter. Neither adds a line to an assembled handoff.

That is the expected result. The 2026-08-13 32-agent pass against
Anthropic's own prompt-engineering documentation already found foreman's
prompting sound and shipped sixteen fixes in 1.2.0; these talks are the
same doctrine delivered as conference material. A second sweep finding
little is confirmation, not a failed audit.

Thirteen candidate findings were generated and eleven were killed. Section
4 records each one and the lens that killed it, so the next sweep does not
re-derive them.

---

## 2. Per talk: what it teaches, and what foreman already does

### 2.1 Margot Vanlar — the Prompting Playbook

The densest of the four, and the only one aimed at prompt *authors* rather
than prompt *users*. Seven teachings:

**(a) Structure the prompt; separate policy from guidelines from data.**
Her rule of thumb: "if you're reading a prompt and you can't tell
guidelines from policy, from data, most likely the model isn't able to
either." Her fix is XML tags around each concern.

*Already implemented.* `prompt-template.md` fixes eleven XML blocks in a
canonical order — `<task_context>` (:137), `<truth_grounding>` (:151),
`<scope_discipline>` (:168), `<tone>` (:194), `<background>` with nested
`<relevant_files>`/`<prior_work>`/`<context>` (:205-243), `<invariants>`
(:257), `<task_rules>` (:261), `<example>` (:300), `<plan>` (:308),
`<output_format>` (:344). Policy, data and instructions are in separate
tags by construction, and `check-prompt.js` enforces the blocks
mechanically — e.g. `norm(plan) !== norm(canonical.plan)` at
`check-prompt.js:217` makes `<plan>` a verbatim-carried block.

**(b) A named role at the top.**
*Already implemented.* `prompt-template.md:139` — the role field's own
guidance names examples: `senior security engineer", "a TypeScript
developer"`.

**(c) An output contract, and prefer harness mechanics over prompt words
where the harness can do it (her stop-sequence example).**
*Already implemented, and the harness half is the stronger form here.*
`<output_format>` exists at `prompt-template.md:344-352`. More to the
point, foreman does not ask the model to police its own output where a
script can: `check-prompt.js` is a mechanical gate every handoff must
pass, `resolve-symbols.js` resolves paths and symbols before assembly, and
`safe-commit.js finish` refuses on any file outside the declared
`expected` list (`prompt-template.md:687-691`). That is her lesson applied
harder than she applies it.

**(d) Redundant patches for older models overfit — version-control your
defensive changes so you can date and retire them.**
*Already implemented.* `prompt-template.md:3-10` carries a dated
provenance header: `<!-- foreman:practices lastmod:2026-08-13 source-a:
… source-g: … -->`, listing the seven sources each guardrail came from.
Individual blocks additionally state their own reason in-line —
`truth_grounding` at :154-156 ("This prompt may have been written earlier
and executed later (queued via TaskCreate, run by a background Agent, or
pasted into a fresh session)"), `scope_discipline` at :169-174.

**(e) Instructions don't add capability — give the model a tool.**
*Already implemented, and it is foreman's central design move.* The
assembled handoff hands the destination concrete instruments rather than
exhortations: `Verification (REQUIRED):` with `Run:`/`Expected:` pairs
(`prompt-template.md:281-284`), `safe-commit.js` for staging, resolved
symbol maps in `<relevant_files>`, and a bounded fix ceiling. Foreman
never writes "always get the calculation right"; it writes the command.

**(f) State both sides of a trade-off — a one-sided cost makes the model
overfit to avoiding it.**
*Already implemented in the places that matter*, and this is where most
of this sweep's candidate findings went to die. `prompt-template.md:180-182`
and the closing "split your checks" step (`craft-handoff.js:758`, shipped
today) both lead with the affirmative mandate and then bound it. Four
candidates claiming a one-sided clause were checked against the file and
each turned out to have the other side present, usually in the sentence
the finding had trimmed off the quote (section 4, items 1, 3, 4, 12).

**(g) Split one big prompt into several small ones (her
generate-evaluate-repair loop).**
*Already implemented.* `Execute here, split by check` builds one tracked
task per `Run:`/`Expected:` pair and chains them
(`prompt-template.md:585, 593`; `craft-handoff.js:800-812`
`buildTaskRows`). Verification is a separate task from implementation,
which is her split.

**(h) The one thing foreman genuinely does not have: an eval suite over
prompt text.** She opens with "we need evaluations to provide that rigor."
Foreman has this at the *repo* level — the 2026-08-13, 2026-08-18 and
2026-08-29 paid runs are exactly that — but there is no per-project harness
a foreman user runs against their own assembled handoffs. That is a
product idea, not a prompt-surface defect, and it is out of this audit's
scope. Noted, not proposed.

### 2.2 The consumer walkthrough ("the manual series")

Aimed at chat users, not prompt authors. Four ingredients: outcome,
context, format, examples; plus "delete `think step-by-step` and raise the
effort level instead"; plus model/effort menus, projects, memory,
artifacts, web search.

*All four ingredients already implemented*: outcome is `<task_context>`
plus `task_rules`, context is `<background>`, format is `<output_format>`,
examples is the optional `<example>` block (`prompt-template.md:296-302`).

*The step-by-step warning is already satisfied.* `grep -rn "step-by-step|
step by step|think hard|ultrathink"` across `prompt-template.md`,
`craft-handoff.js` and `skills/` returns **zero hits**. The nearest line,
`prompt-template.md:306`, is a channel instruction, not a reasoning
incantation: "Reason through the approach and edge cases in your thinking
— not in prose between tool calls."

*Effort is handled the way this talk asks, in the direction foreman
chose.* Foreman no longer asks which model or effort runs a task; it asks
the destination to self-report what actually ran —
`craft-handoff.js:774`: "Also add `model` and `effort` to that close call
— what actually ran this task. Omit either one you genuinely don't know
rather than guessing — an absent field reads as unrecorded, a wrong one
silently poisons the corpus." Everything else in this talk (projects,
memory import, artifacts, voice mode, usage meter) is consumer-app
surface with no foreman analogue.

### 2.3 Karpathy's ramble method

Teaching: don't compress your request before typing. Switch to voice,
ramble for ten minutes, let the model reconstruct it — "the LLMs are
somehow very good at reconstructing long incoherent rambles." Rogoff's
addendum lists what a ramble should touch: desire, quality bar, tools and
discovery, creative freedom, verification loop, delivery, and a one-line
restatement of the goal at the end.

*Foreman's assembled handoff already covers Rogoff's checklist* —
`<task_context>` is desire, `<invariants>` and `task_rules` are the
quality bar, `<relevant_files>` and the resolved symbol map are tools and
discovery, `truth_grounding` is creative freedom bounded by observed
reality, `Run:`/`Expected:` is the verification loop, the destination
question is delivery, and `prompt-template.md:304` is literally the
one-line restatement: "[The immediate, specific request in one sentence.]"

*The one place the ramble lands on a real seam is foreman's own input
surface*, and it is finding 2 below: `craft-prompt`'s
`argument-hint` asks for a **brief** task description. That single word is
the only text in either flow that asks the user to compress before typing,
and nothing downstream needs the compression. Every other ramble-shaped
candidate — routing a long ramble through `pick --hint`, giving the ramble
a defined landing in Call 1 — was killed (section 4, items 9, 10, 11).

### 2.4 Boris — creator of Claude Code

Teaching: start with codebase Q&A; ask it to plan before it writes; give
it a way to check its work and it will iterate; teach it your team's bash
and MCP tools; put durable context in `CLAUDE.md` and keep it short; use
`-p` as a Unix utility; run sessions in parallel.

*Plan before writing* — `<plan>` at `prompt-template.md:308-314` fixes the
order of work in every handoff and `check-prompt.js:217` refuses a
modified copy.

*A way to check its work* — `Verification (REQUIRED):` with a `Run:` and
an `Expected:` line per check (`prompt-template.md:281-284`), plus the
bounded fix ceiling that turns a failing check into a retry loop rather
than a stop. This is Boris's single strongest recommendation and it is the
one block `check-prompt.js` will not let a non-`--research` handoff ship
without.

*Teach it your tools* — `task_rules` carries the exact commands;
`resolve-symbols.js` verifies that a named command actually resolves in
the project and `craft-handoff.js` surfaces "does not resolve here — fix
it before handing off" (`resolve-symbols.js:384`).

*Explore before editing* — `skills/craft-prompt/SKILL.md:95-99` spends an
Explore agent to return candidate file lines, the project's test command
and one file that already does something similar. That is Boris's codebase
Q&A, run automatically.

*Short context* — the whole point of foreman's assembled handoff, and the
2026-08-29 run says the length is already at the margin (below).

*Out of scope*: `CLAUDE.md` hierarchy, MCP config, key bindings, `-p`
piping and parallel worktrees are harness surface, not foreman's prompt
surface. Nothing to find.

---

## 3. Surviving proposals, ranked

Both are **free**: neither adds a character to a clean assembled handoff,
so neither touches the measured 7-8% length disadvantage.

### 3.1 The `MISSING:` path gate offers no third branch for a file the task is supposed to create

**Cost: zero words on a clean handoff** (the added words render only on a
line that is already anomalous).

Files:
- `foreman/scripts/craft-handoff.js:237` — the marker string, the one
  place it is authored
- `foreman/scripts/check-prompt.js:286-294` — the hard gate
- `foreman/prompt-template.md:92-95` — the craft-time instruction
- `foreman/scripts/resolve-symbols.js:108` and `:351` — the source flag

What is there now. `resolve-symbols.js:108` sets `{ path: relPath,
missing: true, symbols: [] }` on any stat failure, with no notion of
intent; `:351` warns `${file.path}: no longer exists — the entry's touches
are stale`. `craft-handoff.js:237` renders:

```
`${f.path} — MISSING: this path no longer exists, a stale prediction to fix or drop`
```

`check-prompt.js:288-292` turns that token into a hard `ok:false` whose
only `fix` is "Correct the entry's planned_touches to the paths that
exist, or drop the dead ones, then re-craft." `prompt-template.md:92-95`
says "Fix or drop it before delivering… `check-prompt.js` refuses a
prompt that still carries the marker, so this is a gate, not a reminder."

Four texts, two branches — *stale prediction* or *drop it* — and neither
is right for a file the task is supposed to create. The text asserts a
deletion ("no longer exists") that never happened, which is what makes the
wrong branch the obvious one for a crafting session under a gate.

This is Margot's teaching (f) exactly: a one-sided instruction the model
will overfit to. The overfit here is dropping the deliverable's own path
out of `relevant_files`, so the handed-off session never sees the file it
is meant to write.

Foreman's own schema demonstrates the case. `roadmap-schema.md:334`,
entry 004, says "into one shared `src/api/retry.ts` helper" and lists
`src/api/retry.ts` in `planned_touches` — a file that task creates. Run
today, that entry hard-fails the gate.

The edit. Widen the marker at `craft-handoff.js:237` to name the third
possibility — "does not exist — either a stale prediction to fix or drop,
or a file this task creates; say which on this line" — and relax
`check-prompt.js:286-294` so a *relabelled* line passes, rather than any
line carrying the token. Give `prompt-template.md:92-95` the same third
branch. No schema change, no new field, `resolve-symbols.js` untouched:
its job is existence, not intent.

**The number it should move: the craft-time false-fail rate on entries
whose deliverable is a new file — forced re-crafts per 100 picks.**
Measurable offline, zero paid sessions.

*Correction to the pre-refutation estimate.* An earlier draft of this
finding claimed "7 of 20 open entries (35%)" in this repo's own
`ROADMAP.jsonl`. **That count is wrong** and is retracted here: it counted
`status:"dropped"` entries as open. Re-run today, this repo's roadmap holds
254 entries of which exactly **one** is `planned` (id 268) and it carries
an empty `planned_touches`, so the live false-fail count here is **0 of 1**.
Corpus-wide, 63 of 254 entries (117 paths) carry a `planned_touches` path
absent from disk, but almost all are `done`/`dropped` and their paths are
absent for ordinary historical reasons, so that figure does not bound the
effect either. The *mechanism* is verified and reproducible —
`resolve(cwd, ['scripts/craft-handoff.js','src/api/retry.ts'], …)` returns
`missing:true` for the second path and `checkPrompt` then refuses the
prompt — and `roadmap-schema.md:334` proves foreman's own documentation
produces the case. **The effect size has to be measured on fixtures, not
claimed from this repo's live roadmap.** See section 5.

### 3.2 `argument-hint`'s word "brief" is the only text discouraging a ramble

**Cost: minus one word**, in skill frontmatter that never reaches an
assembled handoff.

File: `foreman/skills/craft-prompt/SKILL.md:5`

```yaml
argument-hint: "<brief task description — optional seed>"
```

Edit: delete one word.

```yaml
argument-hint: "<task description — optional seed>"
```

Nothing else. Specifically: do **not** add a free-text question to Call 1,
and do **not** rewrite line 18 (that variant was proposed and killed —
section 4, item 11).

Why it survives. Line 5 is the only place in either flow asking the user
to compress before typing, and nothing downstream requires brevity. The
seed's one mechanical consumer is the Explore pass at `SKILL.md:95` —
"Give it Call 1's request verbatim" — which asks that agent for "up to
three candidate file lines", "the project's test command" and "one file
that already does something similar" (`:97-99`). A richer request is
strictly better input to that agent, and Explore's output is what turns
Call 2 Q3 from a cold free-text path question into grounded options
(`:128`). No existing text counters "brief": "optional seed" says the arg
may be omitted, not that it may be long.

This is Karpathy's finding applied to foreman's own front door.

**The number it should move: the rate at which Call 2 Q3 is answered from
an Explore-proposed option rather than `I'll list them` / `Other`** —
equivalently, the rate of hand-typed paths, which is the failure
`SKILL.md:89-91` says `truth_grounding` spends destination tokens
rescuing. Measurable by running `/foreman:craft-prompt` over a fixed task
set with the hint reading "brief task description" vs "task description",
recording seed word count and whether Q3's answer is a returned candidate.
Assembled-prompt length and handoff cost should be *unchanged* — that is
itself the check that the deleted word carries no cost.

---

## 4. Killed, and by which lens

Eleven candidates. Three lenses did the work: **already-shipped** (the
technique is implemented, usually in a sentence the finding trimmed off
its own quote), **already-declined** (it re-proposes one of the three
measured-and-declined 1.2.0 switches), and **not-worth-the-words** /
**would-backfire** (it costs words against the 7-8% gap for no named
number, or it changes the rule while claiming to shorten it).

**1. `truth_grounding`'s approach clause "orders a halt where it means do
not do it silently"** — *would-backfire.* The proposed deletion changes
the rule. `prompt-template.md:162-165` reads "the approach this prompt
prescribes is a decision already taken. If what you find makes that
approach unworkable, stop and report it — never silently substitute an
approach of your own." Dropping "stop and report it" permits substituting
*loudly*, which is exactly what "a decision already taken" forbids. The
claimed conflict with :157-158 does not exist — :162 opens with the scope
marker "One limit on that:", so the two directives are ordered, not
competing. Margot's both-sides form is already written.

**2. The dirty-tree gate names only the cost of committing** —
*not-worth-the-words.* No edit proposed and no number named. The quotes
are accurate (`craft-handoff.js:733`, `:709`) but the balanced form is
wrong on the mechanism: `safe-commit.js finish` "stages only what changed
since that baseline, refuses on any file the `expected` list doesn't
cover" (`prompt-template.md:687-691`), and an `expected` list cannot
separate the user's pre-existing edits from the session's own when both
land in the same file — which is the case the guard defends. The clause
sits on a data-loss boundary with a fully recoverable alternative, and the
proposal concedes it adds 14 words to a string rendered on *every*
roadmap handoff.

**3. The two most absolutely enforced blocks have no recorded reason** —
*not-worth-the-words.* The absence claim is literally true (`grep -n
"Foreman:" prompt-template.md` finds no anchor between 123 and 386) but
the reason for both blocks is recorded in the strongest available place:
inside the shipped block prose. `truth_grounding` states its own why at
:154-156; `scope_discipline` at :169-174; the file carries the dated
provenance header at :3-10. Margot's fix (d) is satisfied twice over.
Maintainer-facing documentation whose only stated benefit was to give
finding 2 something to weigh against — and finding 2 is killed.

**4. The "split your checks" step states three costs of writing an
`unverified:` line and none of omitting one** — *already-shipped.* The
finding quotes the paragraph's last two sentences and drops its first,
which is the affirmative mandate: `craft-handoff.js:758` — "Anything that
can only be settled by a human's eyes or hands — how it renders, how it
feels to use, whether the motion looks right — has no command, so record
it on the entry, one call per check". The stated harm is also factually
wrong: `craft-handoff.js:743` offers review-it-first unconditionally in
the zero-note case, leaving the entry awaiting. What is lost with no note
is the guided read-back, not the look. The design comment at `:751-755`
records that both bars came from live *over*-writing misfires; there is no
observed under-writing to move. Shipped hours ago as settled context.

**5. `pick` gathers verification commands with no instrument, while
craft-prompt spends an Explore agent on the same fact** — *would-backfire.*
The proposed route cannot reach the decision. `resolve-symbols.js` is not
called by the pick session at all — it runs *inside* `craft-handoff`
(`pick.md:295-297`, `:19-20`) — so a `verify_candidates` field returned by
`craft-handoff.js` arrives after the one call that already required
`verification` as input, and after Q2. Making it usable needs a second
script call, which `pick.md:245` bounds to "once". And a package.json
script list cannot supply the number at stake:
`resolve-symbols.js:177-179` returns an undifferentiated `new
Set(Object.keys(...scripts||{}))` with no `Expected:` half at all. The
cross-flow asymmetry is a stated design boundary — "**This branch does
not investigate the codebase. At all.**" (`pick.md:9-16`).

**6. "Expected file surface" asks the destination to police writes by
memory, when `safe-commit.js` owns that comparison** — *already-shipped.*
The premise is wrong on the file. `craft-handoff.js:766` builds
`stageStep` (the `safe-commit.js finish --baseline … --no-commit` call)
and line 783 returns it **ungated**; only `splitStep` carries a
destination gate (`destination !== "agent"`, `:757`). Every destination
already routes through the same `isOwned` comparator
(`safe-commit.js:232-234`) and the same hard `reason: "unexpected_files"`
refusal (`:352`). What is left is the timing word "before it is written",
which the proposal itself concedes must be advisory.

**7. "Do NOT claim success without running this" as a PostToolUse block**
— *would-backfire.* Self-refuting against its own cited file.
`task-completed.js:26-34` records that "an advisory mode on this event
cannot reach anyone", so the proposal lands on a hard `block` — refusing a
task completion because a `Run:` string did not appear verbatim in a
command log — while its own cost line says the failure mode must be
silence, which this event cannot do. The match is unreliable by
construction on three delivery paths (split rows, background Agent,
clipboard). The residue is the class the already-declined anti-test-gaming
clause was measured against.

**8. `<invariants>` demands runnable phrasing and routes to no runner** —
*already-declined.* Its mechanism is "add a block to the standard
profile", the shape the measured `<output_format>` change already refuted.
`<invariants>` renders on the reinforced profile only
(`craft-handoff.js:942-943`) while `task_rules` rides both, so the
proposal pushes text that standard handoffs drop today into the one block
standard handoffs keep — on the arm whose only measured disadvantage is
length. The premise is also false: `prompt-template.md:249-252` already
binds every invariant line to checkability, and the assembly checklist at
:489-492 already polices it.

**9. A rambled pick request is passed whole to `--hint`, and `hint_score`'s
denominator is the ramble** — *not-worth-the-words.* Quotes check out
(`roadmap.js:1632`, `:1901-1909`, `:1762`) but the failure claim does not.
Hint-first ordering fires for every hint by design, not because the hint
is long; `hit/denominator` with a large denominator yields small but
*distinct* floats, so real matches still separate. The only genuine
residue is that `hint_matched` (`:1872`) goes always-true on a noisy hint,
which changes one cosmetic line (`pick.md:90-94`) — the same top 3 is
shown either way.

**10. The whole hint is echoed verbatim into every menu row's `reason`** —
*not-worth-the-words.* Quote verified (`roadmap.js:1779`, untruncated) but
the user-visible symptom is blocked twice before the screen: `pick.md:96-99`
"**Never paste or print this JSON output into your chat response.**" and
the row rule at `:174-177` requiring the session to restate the reason as
a short trailing clause inside a preview "capped at ~6 lines". The
remaining cost is tokens on a blob that is never printed.

**11. craft-prompt's seed line names a question Call 1 does not ask** —
*not-worth-the-words.* The observation is accurate — `SKILL.md:18` says
"skip asking for it in Call 1" and none of Call 1's four questions is a
task description — but the consequence claimed (an interview that re-asks
what the user just said) does not exist in Call 1. The dangling clause
instructs a skip of a question that isn't there: a no-op. The proposal's
actual mechanism duplicates the Explore pass already grounding Call 2 Q3
(`SKILL.md:87-112`), at +36 words. The deletion-only variant is the
house-lesson direction and is not what was proposed. *Note:* finding 3.2
is the deletion-only variant, in the frontmatter rather than line 18.

**12. Delete the two middle sentences of the fixed closing paragraph
(voice deference is already in `<tone>`)** — *would-backfire.* The
redundancy premise is false: the `<tone>` sentence is conditional and the
closing paragraph is the unconditional carrier.
`prompt-template.md:195-200` wraps it in "[If Tone was selected…]" and
`craft-handoff.js:962` renders `input.customTone || defaultTone`, so a
user tone *replaces* the defer-to-style sentence;
`craft-handoff.js:921` gates the whole block. In three shipped
configurations (customTone supplied, `"tone"` in `omit`, Workflow-stage
flavor) `prompt-template.md:306` is the only place a style is said to
govern voice. It is also the clause subordinating `<output_format>` to the
session's style — deleting it leaves `<output_format>` unbounded, which
plausibly lengthens the final message, the exact +47%/+19% effect already
measured.

**13. Cut `<plan>`'s last two sentences as restatement** —
*would-backfire.* Both sentences are actionable.
`prompt-template.md:313` addresses a session that provably does not hold
the entry paragraph: `craft-handoff.js:994` builds `basePrompt` *without*
it and `:800-812` appends it only `if (isLast && entryParagraph)`, so row
1 of a split receives the full reinforced prompt with no entry paragraph.
The first sentence is not covered by the entry paragraph either — on a
background-agent handoff `splitStep` renders as `""`
(`craft-handoff.js:756-759`), leaving :313 the sole carrier of
close-after-verification. And `check-prompt.js:217` makes `<plan>` a
verbatim block by design.

---

## 5. What must be measured before shipping anything that adds words

The 2026-08-29 run (96 paid sessions, both models) is the binding
constraint: foreman's assembled handoff **ties** a well-written
hand-authored paragraph on correctness, scope violations, verification and
truth-grounding, while costing **7-8% more**. Length is the arm's entire
measurable disadvantage. Any proposal that adds words is spending the one
thing foreman is already losing on, so:

**1. Name the number before writing the clause.** Every killed finding in
section 4 that cost words failed this test first. A finding that cannot
say which rate it moves is not a finding.

**2. Measure offline where the number is offline.** Finding 3.1's number —
craft-time false-fails on new-file entries — needs **zero paid sessions**.
Build a fixture roadmap of N entries whose `planned_touches` include a
file the task creates, run `resolve-symbols.js` → `craft-handoff.js` →
`check-prompt.js` over it, and count forced re-crafts before and after.
The live-roadmap estimate in the earlier draft was wrong (section 3.1);
fixtures are the only honest instrument here, because this repo's roadmap
currently holds one planned entry with no `planned_touches` at all.

**3. Free changes still need their no-cost claim checked.** For finding
3.2, the check is that assembled-prompt length and handoff cost are
*unchanged* — the deleted word lives in skill frontmatter and must not
reach the handoff. Confirm by diffing assembled prompts across the same
task set, not by argument.

**4. Anything that would add words to the assembled handoff needs a
one-batch interleaved arm on both models**, per the standing house rules:
propose arms × tasks × reps with an estimated cost and wait for a go
before spending; never compare cost across batches (a warm cache halves
it); and count leaks, not clean runs.

**5. Suspect priming before weakness.** A clause that backfires usually
needs *fewer* words. Both surviving findings are subtractive or
conditional for that reason: 3.2 deletes a word outright, and 3.1's added
words render only on a line that is already anomalous, never on a clean
handoff.
