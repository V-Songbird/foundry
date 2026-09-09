# Foreman: prompting improvement opportunities

Private notes. 2026-08-13. Sources: Anthropic's platform prompt-engineering
docs (overview + every page they now redirect to), the Opus 5 prompting page
and what it links, and both Anthropic interactive prompt-engineering tutorial
repos, read from local clones.

Method: a 32-agent workflow — 5 source-mining agents (413 techniques
extracted), 4 surface-audit agents over foreman's model-facing files, 3
synthesis lenses, then one adversarial verifier per candidate whose default
was to refute, plus a completeness critic and a second verify pass on what it
found. 22 candidates raised, 19 verified, 4 refuted outright, 9 survived only
in narrowed form. Two further findings were added by hand after the run.

**Headline.** Foreman's prompting is in good shape against current guidance:
the assembled prompt's section order tracks the tutorial's canonical
complex-prompt order almost exactly, and every generic technique in the docs
(XML structure, a named role, explicit success criteria, a named analogue
instead of "follow conventions", escape hatches for unknowns) is already
implemented. Nothing here is a redesign. What the pass found is **dead text,
statements about foreman's own mechanism that are false, and three places
where a documented Opus-5 behavior is unaddressed**.

---

## 1. What changed upstream since foreman's sources were pinned

`prompt-template.md:3-9` stamps `lastmod:2026-07-23` and cites six sources.
Several have moved.

- **Every per-technique docs page is gone.** `be-clear-and-direct`,
  `prompt-templates-and-variables`, `multishot-prompting`, `chain-of-thought`,
  `use-xml-tags` and `system-prompts` all 301 into one page,
  `prompt-engineering/claude-prompting-best-practices`. `prefill-claudes-response`
  redirects to the overview.
- **Prefill is removed, not discouraged.** A prefilled last assistant turn
  returns a 400 error on Claude 4.6+. Foreman never prefills, so this costs
  nothing — but the claude.com blog still teaches it, so the two disagree.
- **Prompt chaining is demoted.** The docs now say Claude "handles most
  multistep reasoning internally" and that explicit chaining earns its keep
  only when you need to inspect intermediate outputs or enforce a pipeline.
  Foreman's task-split feature is the "enforce a pipeline" case, so it stands.
- **`budget_tokens` returns a 400 error on Claude 4.7+.** Thinking depth moved
  to `effort`. Foreman does not set either; its model/effort fields are
  self-reported at close, which remains correct.
- **Long content goes at the top, the query at the end** — "queries at the end
  can improve response quality by up to 30 percent". Foreman puts
  `<background>` high and the request sentence low, which matches; the request
  is not literally last (autonomy paragraph, closing paragraph, `<plan>`,
  `<output_format>` follow it), and no evidence says that ordering is wrong.

Four Opus-5 behaviors are worth pinning because they cut against instincts a
prompt-assembling tool encodes:

1. **`effort` does not shorten the visible answer.** It governs thinking
   volume. Opus 5's user-facing responses run longer than prior Opus models by
   default, and length has to be prompted for explicitly.
2. **Self-verification instructions should be removed, not reworded.** "include
   a final verification step", "double-check your answer", "use a subagent to
   verify" cause over-verification with no quality gain. Foreman's verification
   block is a real command, not self-checking, so it is safe — but it means
   *adding* a second verify-your-claims sentence anywhere is a regression, not
   a hardening.
3. **"Be conservative" / "only report high-severity" is followed literally**
   and produces under-reporting. Ask for everything and filter in a separate
   pass (Opus 5), or state concretely where the bar is (Sonnet 5).
4. **Rules that forbid reasoning increase `<thinking>` leakage** into visible
   output, and a general "do not include internal or system XML tags" beats
   naming the tags.

---

## 2. Ship now — dead text, false statements, zero prompt-length cost

### 2.1 Decision entries are told to implement

`scripts/craft-handoff.js:596`

```js
const requestSentence = input.request || `Implement: ${record.title || judgment.goal || "the task described above"}.`;
```

A `kind: "decision"` entry picked through `foreman:roadmap` gets a `task_rules`
opening that says "This is a decision, not a build… do not write implementation
code for it", and then, in the imperative sentence that carries the actual
request, `Implement: <title>.` The gate returns `ok:true`. `kind` exists
precisely because "a decision-shaped entry with no such rule gets implemented
straight into code a measurable fraction of the time"
(`roadmap-schema.md:114`), and the auto-synthesized request line reintroduces
that failure on every roadmap-picked decision handoff.

Fix: branch the fallback on `record.kind` — `Decide: <title>, and state why the
chosen option wins.` Keep the change in `craft-handoff.js` only;
`prompt-template.md:315` is a bracketed human-facing placeholder that no
assembled prompt reads. Add a test asserting a `kind:"decision"` assembly
contains no `Implement:`.

Effort: tiny. Cost: zero words.

### 2.2 Checklist item for a feature that was removed

`prompt-template.md:487-489` asks the crafting session to attest that "custom
sections were rendered by `render-sections.js` and inlined verbatim after
`task_rules`". `render()` returns no such field
(`scripts/render-sections.js:132-138`), and `tests/render_sections.test.js:88-91`
pins that it does not. The feature was dropped in 1.0.0 (`CHANGELOG.md:118`).

Fix: delete the item; fold its surviving `warnings` requirement into the
existing `render-sections.js` checklist item at `:452-454`. Drop
`"[CUSTOM SECTIONS",` from `PLACEHOLDER_FRAGMENTS` in `check-prompt.js`. No
test update is needed — the pin at `tests/check_prompt.test.js:318-327` runs
template → fragment list, so removing an unused fragment cannot fail it.

### 2.3 The same removal left a second orphan

`prompt-template.md:479-480`, inside the `task_rules` checklist item:

> a `sonnet`-, `opus`-, or `fable`-target handoff carries the implement step
> without the run micro-step;

`targetModel` was removed in the same 1.0.0 block (`CHANGELOG.md:117`).
`grep -rn "micro-step" tests/ scripts/` is empty. Worse than dead: on
`Execute here` and clipboard runs the crafting session is never asked which
model will run the prompt (`craft-prompt` Call 6 is background-Agent-only, and
`skills/craft-prompt/SKILL.md:247` says the model answer "is a dispatch value
and nothing more"), so the item asks for an attestation about a fact foreman
deliberately declines to hold.

Fix: cut exactly that clause, leave the surrounding wording byte-identical.

### 2.4 The autonomy paragraph no longer matches its cited source

`prompt-template.md:327-329` claims the background-Agent paragraph is included
"verbatim… the official autonomous-operation reminder (source-d)". Foreman
ships:

> Offering follow-ups after the task is done is fine; asking permission before
> doing the work is not.

source-d today reads:

> Offering follow-ups after the task is done is fine; asking permission after
> already discussing with the user before doing the work is not.

Whether this is a transcription slip or upstream drift cannot be established
(the commit landed 2026-07-19), and the remediation is identical either way.
Foreman's clipped version bans asking permission before work outright, which
collides with `<scope_discipline>` telling the same session to flag
out-of-surface work — a collision that bites on reinforced + background-Agent
handoffs.

Fix: replace that one sentence with the source wording; bump `lastmod:` at
`prompt-template.md:3`. `craft-handoff.js:98-101` extracts the paragraph by
scanning from `You are operating autonomously.` to the next `]`, and
`check-prompt.js:325` tests only that sentinel, so no code or test moves.

### 2.5 `judgment.purpose` is wired end to end and never gathered

`prompt-template.md:144` documents a second `task_context` sentence — "what
this output feeds and who it's for… It lets the session calibrate depth and
emphasis". `craft-handoff.js:326` implements it. `check-prompt.js:25` guards
its placeholder. **No skill ever sets it**: neither `pick.md`'s judgment-field
list (step 3) nor `craft-prompt`'s assemble list mentions `purpose`, and
`grep -rn purpose skills/` returns nothing but "on purpose". The sentence has
never shipped in an assembled prompt.

This is the docs' framing lever — the docs' worked contrast for a weak prompt
is one that states the task without stating what the output is for. Two honest
options:

- **Gather it.** One clause in each field list: `purpose` ← what the finished
  work feeds, when the entry's `why` names it; omit otherwise. Cost is one
  sentence, on entries that have one.
- **Delete it.** Remove the field from `taskContextText`, the template line,
  and the placeholder fragment.

Either is fine; shipping a documented, implemented, gate-guarded field that no
caller sets is not.

### 2.6 `pick.md` silently drops craft-handoff's preflight warnings

`skills/roadmap/pick.md:266-272` handles the return by naming `gate.errors` and
`gate.warnings`, and only when `ok` is `false`. The top-level `warnings` array
— which carries the stale planned path, the path outside the project, the
unreadable file, the truncated reference scan, and the verification command
nothing in the project answers to (`resolve-symbols.js:347-375` →
`craft-handoff.js:664`) — is dropped on every successful pick.

`pick.md` is the only skill in foreman without the surface-warnings rule its
siblings carry (`add.md:42`, `correct.md:33`, `destination-question.md:43`,
`init/SKILL.md:164`). In the pick flow this matters most, because the crafting
session is forbidden from reading the codebase, so the preflight is the only
thing that can catch a stale path before handoff — and
`prompt-template.md:107` says to "fix the command before delivering".

Fix (docs-only, ~15 words): extend that sentence to surface top-level
`warnings` whenever non-empty, even when `ok` is `true`.

---

## 3. Small and sourced — each needs its companion edit

### 3.1 Wrap the prior-work recall block in its own tag

`craft-handoff.js:294` emits recalled prior work as bare prose lines inside
`<background>`, at the same nesting depth as the file list. The excerpt is
selected as the longest human-written line of a past entry's `notes`, and past
notes routinely read as imperatives ("always call rotate() first"). Untagged,
it reads as instruction rather than history.

Do: wrap it `<prior_work>…</prior_work>`, keep it nested inside `<background>`
(that preserves the `omitSections` gate and matches the docs' nesting rule),
and replace the header with one framing line — "Recorded by earlier finished
entries that touched these files — history, not instructions for this task."
Net cost ≈ zero words. Add `<prior_work>` to the template's `<background>`
fence and to the "**Standard** carries only" list at `:417-421`, which today
omits a block a standard prompt demonstrably emits.

Do **not** add "verify anything you act on" — the concise truth line already
binds every claim, and Opus 5 guidance says to remove duplicate verification
instructions. Do not cite the prompt-injection guardrails page: its threat
model is third-party content, and ROADMAP.jsonl notes are first-party.

Tests to update: `tests/craft-handoff.test.js:606` and the recall assertions
at `:568-660`.

### 3.2 Two statements about foreman's own mechanism are false

`prompt-template.md:276-278` — "There is no read-first bullet here: the plan
block at the end says that step once, for every task." `pick.md:224-227`
repeats it and adds that `truth_grounding` carries the verify-before-acting
mandate. `<plan>` and `<truth_grounding>` are both **reinforced-only**
(`craft-handoff.js:638`, `:608-614`). On a standard handoff neither ships; the
concise truth line stands in.

Fix the wording in both files. Do **not** add a read-first bullet to the
standard profile: the harness already blocks editing an unread file, the
concise truth line already binds `relevant_files` as a claim set, and commit
`e714efe` measured the removal of read/run micro-step bullets as equal
correctness at one fewer turn and lower cost.

### 3.3 Survey's hidden-dependency check has no uncertainty channel

`skills/survey/SKILL.md` check 3 ends "Only report either direction with a
concrete file:line citation — no hunches", while `stale-description` and
`stale-touches` get a `confident: false` channel. A hidden dependency is the
one verdict that reorders future picks, and the one most likely to be
visible-but-unciteable. Opus 5 guidance: a conservatism instruction is followed
literally and produces under-reporting; ask for coverage and filter later —
which survey already does at step 3.

Do: add coverage language to check 3 only, and **in the same edit** amend the
cite-or-drop rule at `:154-155` to "…or be marked `confident: false` with what
it could not pin down", or the insertion contradicts the rule two lines above
it. Do not generalize the two-part finding rule to every non-`valid` verdict —
`hidden-dependency`, `already-done` and `duplicate` have no replacement value
to carry, so generalizing makes them unreportable.

Expect a small yield: both directions of check 3 are code relations that
usually do carry a citable line.

### 3.4 The roadmap menu authors five options against a four-option cap

`skills/roadmap/SKILL.md` Call 1 Q1 authors five. `AskUserQuestion`'s schema is
`options: 2-4`, `questions: 1-4`, and `craft-prompt/SKILL.md:241-242` states
the cap in foreman's own words. Today the model resolves the overflow
differently each session.

Do: cut `Check the roadmap` — it is the newest option, the entrance already
describes it as explicit-ask-only, and two phrase routes reach it. Companion
edit, or the files contradict each other: `skills/foreman/SKILL.md:49` says
"Any of the five roadmap intents" — change it and name the doctor as
phrase-reached.

Two adjacent items found while verifying, worth their own small pass rather
than folding in here:

- `craft-prompt/SKILL.md:27` (six task types), `:81` (six roles), `:102` (five
  commands) also exceed four. The remedy is to trim to the four most common and
  let `AskUserQuestion`'s automatic `Other` carry the rest — not deletion.
  `:31-35` (five sections, multiSelect) is a genuine split, since there is no
  free-text substitute for a checkbox list.
- The same bound has a **floor of two**, and `craft-prompt/SKILL.md:90`, `:93`,
  `:114`, `:121` each author exactly one option.

### 3.5 The decision-doc gate never opens the file

`hooks/task-completed.js:178` blocks a close on `fs.existsSync` alone. An empty
file passes, and so does `decision-doc-template.md` copied verbatim with its
italic instruction lines intact. This is the plugin's strictest close gate.

Do: read the file inside the existing fail-soft `try/catch` and block on two
heading-agnostic conditions — (a) the body is empty, (b) the body still carries
the template's own instruction lines (`*State the choice made in one short
paragraph`, `*State what forced a choice`, `*Highest-value section here.`,
`*State what this commits future work to`), pinned against
`decision-doc-template.md` in a test the way `PLACEHOLDER_FRAGMENTS` is pinned
against `prompt-template.md`. Keep the `"doc":"none"` escape hatch in the
message.

Do **not** require a `## Decision` heading: it would reject a legitimate
hand-written ADR, and `decision-doc-template.md:13` is itself `## Decision`, so
the check would pass the exact copy-paste case it was aimed at. The existing
`'# ADR 001\n'` fixtures at `tests/task_completed.test.js:296,336` stay green
under the narrowed predicate.

### 3.6 The Workflow-stage schema rules omit what makes a schema reject

`prompt-template.md:368-373` and its byte-identical twin at
`craft-prompt/SKILL.md:156-162` give authoring rules but not legality rules.

Add, in both files, ~30 words: draft-07 only; `minimum`/`maximum`,
`minLength`/`maxLength`, `multipleOf`, recursive or external `$ref`, and
`minItems` above 1 are unsupported — put any such bound in the property's
`description` instead. Add a `source-g` line for the SDK structured-outputs
page and bump `lastmod:`, since the list is version-sensitive.

Do **not** mandate `additionalProperties: false`: every documented example on
the layer foreman targets omits it. Do not attach the clause to "every
validation retry costs a full subagent turn" — an unsupported keyword fails the
run at startup, which is a different failure.

### 3.7 Background agents get the autonomy paragraph without its pause policy

source-d pairs the autonomous-operation reminder with a checkpoint instruction:

> Pause for the user only when the work genuinely requires them: a destructive
> or irreversible action, a real scope change, or input that only they can
> provide. If you hit one of these, ask and end the turn, rather than ending on
> a promise.

`grep -rn "Pause for the user"` across foreman is empty. Foreman ships half the
pairing — the half that says do not ask — to the one destination that has no
user watching. This is the real fix for a background agent with no pause
policy, and it is what `<scope_discipline>`'s "flag it to the user first" needs
in order to mean something on that destination.

Adding it costs ~40 words on background-Agent handoffs only. It is the one item
in this document that adds real length to a shipped prompt, and it is worth it.

---

## 4. Measure before shipping

The house's own recorded lesson applies to all three: wording that *describes*
a failure primes it, and the fix for a backfiring clause is almost never more
words (`docs/shared/research/prompt-wording-lessons-2026-07-15.md`, §2 and §3).

### 4.1 Anti-test-gaming clause, scoped to `testFirst` only

The docs carry an explicit block — "Tests are there to verify correctness, not
to define the solution", "Do not hard-code values or create solutions that only
work for specific test inputs" — and nothing in foreman covers it. The handoff
is structurally the case the source describes: one exact command, one expected
signal, success defined as that signal.

The sharpest version is not on the shared fix-ceiling line but inside the
`judgment.testFirst` branch (`craft-handoff.js:356-358`), the one place the
session authors the very check it is graded on. That costs zero words on an
ordinary handoff.

Two things to settle first. The fix-ceiling line is documented as reinforced
(`prompt-template.md:414-421`, `check-prompt.js:243-244`) but emitted on every
prompt with a verification block (`craft-handoff.js:363`) — resolve that
inconsistency as its own change, or extending the line silently ratifies the
code. And A/B the clause on a silent-failure fixture: it names three shortcuts
by name, which is exactly the shape that has primed behavior here before.

### 4.2 Give the standard profile an output shape

Standard ends on the closure-evidence sentence and says nothing about the final
message — the only part of a handoff the user reads — while landing on the
model Anthropic documents as running long by default with no parameter-level
fix.

Do not write new text. Drop only the `reinforced` term at
`craft-handoff.js:594` so the canonical `<output_format>` default rides
standard too, inheriting both existing opt-outs. It also keeps "No XML tags in
the visible response", which the same source page flags as a real Opus 5
artifact when thinking is disabled.

Effort is larger than it looks: `check-prompt.js` (constant + standard
requirement), `craft-handoff.js:594`, `prompt-template.md:417-424` and its
checklist item at `:493-495`, `scripts/health/attention-cost.js:225-228`, and
`tests/attention_cost.test.js:201`. Cost is +21% to +35% on a 68-word floor,
for the profile whose stated purpose is the length it saves. Measure it.

### 4.3 Post-commit discovery scan: swap both gates

`hooks/post-commit.js:307-310` sets the inclusion bar at "CONFIRMED
opportunities, bugs, or ideas — not vague hunches" — two qualitative words, on
a model that follows exactly that instruction literally and reports less. The
concrete criterion already exists two clauses later, but it governs how to
*write* an accepted candidate, not what gets in.

Swap both gates or it is a no-op: the opening at `:307-310` **and** the closing
"Say nothing if nothing is confirmed." at `:342`, which binds hardest at the
emit point. Reword the user-facing invite at `:359` to match. Justify it with
the Sonnet 5 single-pass route ("be concrete about where the bar is"), not the
Opus 5 report-everything route — foreman's only value filter is the user's
question on every commit, and this feature is opt-in precisely because it costs
tokens per commit. Measure candidate count and `check-duplicate` calls per
commit.

---

## 5. Known gaps, no action recommended

- **Worked examples never reach a roadmap handoff.** `<example>` requires both
  `judgment.example` and a reinforced profile; `skills/roadmap/` never sets the
  field at all, so the roadmap path — the primary path — cannot carry one. The
  docs put examples among the highest-leverage techniques (3–5 for best
  results; the blog says start with one). Closing this properly means a new
  roadmap field, which is a scope decision, not a prompting fix. Foreman
  already ships the cheaper cousin: the `Pattern: <file> — build the new code
  the same way` line, which is the docs' "named analogue" advice.
- **Only the first verification command is preflighted.**
  `craft-handoff.js:548` passes `judgment.verification[0].run`; checks 2..N of a
  multi-check handoff are never resolve-checked. Real, separate, code-level.
- **The fix-ceiling profile inconsistency** noted in 4.1 stands on its own even
  if nothing else in that item ships.

---

## 6. Refuted — do not revisit without new evidence

- **Give the background-Agent paragraph an answer for `scope_discipline`'s
  "flag it to the user".** The invented resolution has no basis in source-d.
  What the source actually offers is the pause-policy pairing in 3.7 — use
  that instead.
- **Calibrate the length of the notes the close step asks for.** The
  specifics-not-narration rule is already in every assembled prompt in both
  profiles, and the gate hard-errors when it is missing.
- **Scope `pick.md`'s "No `Read`. At all." to project source files.** The claim
  that a literal reader generalizes it onto the `.foreman/config.json`
  checkpoint read is contradicted by the very guidance cited: current models do
  not silently generalize an instruction from one item to another.
- **Make `--profile` required on the gate.** No skill or hook invokes
  `check-prompt.js`; the only live caller always passes `profile` and builds
  the guardrail blocks from the same value. Zero benefit, real cost.

---

## 7. Suggested order

1. §2.1–2.4 and §2.6 in one commit — dead text, false statements, one-line
   contradiction fixes. No prompt grows.
2. §2.5 — decide gather-or-delete for `purpose`, then do it.
3. §3.2, §3.4, §3.1 — mechanism corrections and the recall tag.
4. §3.5, §3.6, §3.3 — gate and skill edits, each with its companion change.
5. §3.7 — the one deliberate prompt-length addition.
6. §4.1–4.3 — behind measurement, in that order.
