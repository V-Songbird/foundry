# foreman vs the Claude prompting docs tree — 2026-09-02

Scope: the Fable 5.1 release prompted a re-read of
`claude-prompting-best-practices` and every child page it links, checked
against foreman's prompt surface (`prompt-template.md`, `craft-handoff.js`,
`check-prompt.js`, `skills/`).

Method: 12 Opus 5 agents at medium effort in one Workflow run
(`wf_0f3ff14b-fde`, 1.29M subagent tokens, 145 tool calls). Nine read agents,
one per doc group, each fetching the raw `.md` and then reading foreman;
three adversarial verifiers over the pooled candidates, one lens each
(already-covered / doc-fidelity / cost-and-mechanism). Kill threshold was 2 of
3.

**Result: 16 candidates, every one refuted by at least one lens, none clean.**
Seven died on 2+ lenses. That is the headline — nothing in the Fable 5.1
release invalidates how foreman crafts prompts, and the docs propose almost
nothing foreman should adopt as-is.

The rest of this file records what the run *did* settle, plus two items the
run missed that I judge to be the real findings.

---

## 1. Confirmed still true

- **source-g legality list** (`prompt-template.md:376-381`). The
  structured-outputs page still lists as unsupported: recursive schemas,
  external `$ref`, `minimum`/`maximum`, `multipleOf`, `minLength`/`maxLength`,
  and `minItems` above 1 ("Array `minItems` (only values 0 and 1 supported)").
  Every keyword in foreman's list checks out.
- **`context-fill.js` window band** (100k–1M). The context-windows page gives
  1M for Fable 5.1 / Mythos 5.1 / Opus 5 / Sonnet 5 / Sonnet 4.6 and 200k for
  older models. No supported window falls outside foreman's band.
- **The autonomy paragraph is verbatim-faithful to its cited source.** The
  Fable 5 page's "Rare cases of early stopping" carries foreman's exact string,
  including "asking permission after already discussing with the user before
  doing the work is not"; the pause sentence is verbatim from the same page's
  "Strong instruction following". A candidate calling it drifted was correctly
  refuted.
- **The concise truth line is the doc's own light-instruction form.** The
  tool-use overview names `"Use the tools to investigate before responding."`
  as the light lever; foreman's standard-profile line is that lever, so the
  profile is not left without a read-first push after dropping `<plan>`.
- **The ledger / roadmap-notes design matches the memory tool's multisession
  pattern** (progress log, feature checklist, end-of-session update,
  mark-complete-only-after-verification). The memory tool itself is an API
  `tools` entry needing a client-side handler, which a plugin cannot supply —
  no candidate follows from it.

## 2. Confirmed NOT supported by the cited source

- **`draft-07` is foreman's own claim, not source-g's.** The word "draft" does
  not appear anywhere on the structured-outputs page; two separate fetches
  confirmed it. Every other item in the legality list is on the page. The
  claim may still be true of the Workflow tool's schema layer — it is just not
  sourced where foreman says it is. Re-derive it from the Workflow layer or
  drop the version claim.
- **"fails the run at startup, not at validation time"** is a gloss. The page
  says only "If you use an unsupported feature, you'll receive a 400 error with
  details." Defensible paraphrase, unsourced wording.

## 3. The cross-model split foreman cannot condition on

`prompt-template.md:310` emits one fixed narration clause: "not in prose
between tool calls… don't announce step transitions or restate command
results in chat."

The docs now pull in opposite directions:

| Page | Says |
| --- | --- |
| `whats-new-opus-5` | "In agentic sessions, the model narrates its progress to the user more often." |
| `whats-new-fable-5-1` | "Fewer progress updates during long tool runs. The model writes less user-facing text between tool calls, especially at higher effort." |
| `prompting-claude-fable-5-1` | "audit your prompt for instructions that suppress narration… Remove lines like that before adding anything." |

foreman has no model input — the model menu and `fableEnabled` were retired —
so no fixed clause serves both. Three separate candidates to cut or trim this
clause were all refuted, on three different grounds, one of them load-bearing:
on the background-`Agent` destination the tone carve-out says "no output style
reaches that session", so the clause is the **only** narration control there.

If this is ever revisited, the mechanism is a project-level declaration on the
existing `render-sections.js` config surface (the way `usePersona` works), not
a model probe. Not proposed as work.

## 4. The two the run missed — my own findings

The read agents were told to prefer deletions over additions. That instruction
suppressed the two items on the Fable 5.1 page that carry the only measured
claims in the whole tree. Recording them here so they are not lost.

### 4a. `<scope_discipline>` covers requests, not discoveries

foreman's block opens: "If a **request** mid-session asks for something beyond
this task's stated goal". That is a user asking mid-session. It does not cover
what the session *finds* while working, which is the actual failure mode in a
coding handoff.

The Fable 5.1 page, "Keep changes and tests to what the task asks for":

> If, while working or testing, you find a pre-existing bug, a performance
> concern, or behavior the task doesn't mention, don't fix, optimize or extend
> it in this change unless the requested behavior cannot work without it;
> report it as a follow-up in your summary. […] Commit tests only where the
> task asks for them or this repository already keeps tests for this kind of
> change, sized like the neighboring test files […] This is about extras only:
> implement every behavior the task asks for, completely.

with the measured claim: "unrequested additions and committed test code drop
substantially with no measurable change in task success."

A grep confirms foreman emits nothing on pre-existing bugs, nearby code, or
test-file count. This is a genuine gap, and the only doc claim in the tree
with a measurement behind it.

Note the overlap: razor's ladder covers the same ground for sessions that have
razor installed. foreman's handoff goes to sessions that may not.

#### MEASURED 2026-09-02 — DECLINED

Owner approved a 24-session batch. It ran twice, because the first fixture had
no headroom, for a total of 48 sessions and about $6.80.

Arms `extras-off` / `extras-on`, differing by exactly one constraint line in
`taskRulesText`'s Constraints block, both written by
`benchmarks/foreman/extras/gen.js`. Fixture `quiet-extras`. 6 reps per cell,
Sonnet 5 and Opus 5. Tags `ex4a-sonnet`/`ex4a-opus` (run 1) and
`ex4a-sonnet2`/`ex4a-opus2` (run 2). Run data local per ADR 0004.

While the batch ran, the clause sat behind a `FOREMAN_EXTRAS_CLAUSE` switch in
`craft-handoff.js` so both arms came out of the product itself. That switch was
removed after the verdict — see the last paragraph of this section for what
replaced it.

**Run 1 measured nothing and is recorded as a null.** The fixture was a
one-line bug fix — a wrong entry in a UNITS table. All 24 sessions read one
file, changed one line, ran the check and stopped: 452 vs 451 output tokens,
4 turns, 1 read, 0 violations, in both arms on both models. A control that
never leaves the target file cannot take a bait, so the clause had nothing to
prevent. This is the same defect that made §4.1 unpriceable, and it is now
guarded: `extras/gen.js` refuses to build if either arm names the temptations,
and the fixture is a small open-ended feature rather than a one-liner.

**Run 2, with real headroom, still found a zero.** The task became "add a days
unit and compound strings like `1h30m`" — open-ended, the shape upstream's own
claim was measured on. `src/duration.js` imports both temptations, so a session
reads them on the way: `src/retry.js` carries a real off-by-one under a `FIXME`
with no test covering it, and `src/log.js` carries four copy-pasted builders
under a "collapse them" `TODO`. Sessions did range this time — 3 to 4 reads,
7 to 8 turns, 1.9k to 2.7k output tokens.

| | Sonnet off | Sonnet on | Opus off | Opus on |
| --- | --- | --- | --- | --- |
| correct (all checks) | 100% | 100% | 100% | 100% |
| violations per run | 0.0 | 0.0 | 0.0 | 0.0 |
| new test files | 0 | 0 | 0 | 0 |
| output tokens | 1935 | 2711 (+40%) | 2459 | 2457 (−0.1%) |
| narration words | 12 | 1 | 24 | 18 |
| wall seconds | 27 | 42 | 37 | 35 |

All 48 runs came back `resultSubtype: success`, so none of this rests on a
truncated transcript.

**Verdict: DECLINED, on the same grounds as §4.1.** Not one session in either
control fixed the off-by-one, collapsed the log builders, or left a test file
behind — twice, on two task shapes, on two models. The clause prevents nothing
here and costs +40% output tokens on Sonnet.

Say the zero carefully. It is not "the clause does not work"; it is **"nothing
here to prevent"**, and the honest reading is a point in foreman's favour: a
crafted handoff already fences the session with `task_context`,
`relevant_files`, `Constraints` and the `Expected file surface:` line, and on
this evidence current models on a well-specified foreman prompt do not wander.
The gap in §4a is real as written — `scope_discipline` genuinely does not cover
discoveries — but it is a gap in the text, not in the behaviour.

What would still be worth buying, if this is ever reopened: a fixture where the
adjacent defect is on the critical path, so leaving it alone is a real
decision rather than the default. Do not re-run this one.

**No switch was kept, and that breaks with §4.1-4.3.** Those three each left an
env switch in `craft-handoff.js` so re-opening cost a batch rather than a
rebuild. Here the owner cut the dead branch instead: the product is untouched,
and `foreman/tests/craft-handoff.test.js` now carries a test asserting the
clause is ABSENT from every crafted prompt on both profiles, so it cannot come
back silently.

The harness stayed, entirely under `benchmarks/foreman/`: the `quiet-extras`
fixture, `extras/gen.js`, `checks.extraTestFiles` in `runner/metrics.js`, and
`tests/extras_arms.test.js`.

With no product switch, `extras/gen.js` builds the control from
`craft-handoff.js` as before and splices the clause into its Constraints block
after a unique literal anchor — the shape `benefit/gen.js` already uses for its
lesson arms. That gives up "cannot drift from what foreman emits" on the
treatment side, so `assertMeasuredPromptsIntact` stands in for it: the two
`prompts/*.md` files are the exact bytes this batch ran, and a rebuild that
does not reproduce them fails rather than quietly re-baselining the record.
Verified after the switch was removed — the splice reproduces both files
byte-for-byte.

The secondary finding is the one to keep: narration fell in both arms-on cells
(12 → 1 on Sonnet, 24 → 18 on Opus), which is the third time a constraint block
has moved words out of mid-turn narration. §4.2 saw the same 11-13% drop.

### 4b. Two one-sentence gaps against the 5.1 page

- **Targeted edits.** "Prefer targeted edits over whole-file rewrites" — the
  page's fix is one sentence and its stated effect is fewer output tokens at
  the same result. foreman emits no analogue.
- **The autonomy paragraph's missing clauses.** The 5.1 rewrite of the block
  foreman ships adds "That includes retrying after errors and gathering
  missing information yourself. Do not stop because the context or session is
  long." A background `Agent` has exactly that failure mode; foreman's copy,
  faithful to the older page, omits it. The 5.1 page also adds an
  assessment-only exception and a state-change evidence check, and says
  explicitly: "Apply both. If you need to limit prompt length, use only the
  first."

Cheap to try because the gate pins only the first sentence
(`check-prompt.js:73`, `AUTONOMY_SENTENCE`) and one test pins the `Pause for
the user` prefix — the paragraph body is otherwise free to change, and
`craft-handoff.js` reads it out of `prompt-template.md`, so one template edit
propagates.

## 5. Provenance

`prompt-template.md:3-10` pins seven sources at `lastmod:2026-08-13`. Two
comment-only candidates (repoint `source-d`, add the best-practices page as
`source-h`) were refuted as changing no emitted text. Correct on cost, but the
block exists for the next audit, and today it does not name either the
cross-model page the docs designate as "the living reference" or the Fable 5.1
successor to `source-d`. Add both when the file is next touched for another
reason; not worth a commit of its own.

## 6. Where it ended

§4a was measured and declined (see above). §4b is untried: the targeted-edits
sentence and the autonomy paragraph's two missing clauses were both offered and
both left alone by the owner. §5's source pins were offered and left alone.

The one behaviour change is the source-g correction in §2 — the unsourced
`draft-07` and startup-vs-validation claims are gone from
`foreman/prompt-template.md` and `foreman/skills/craft-prompt/SKILL.md`,
replaced with what the structured-outputs page actually says, plus the
`additionalProperties` rule it does state.

`foreman/scripts/craft-handoff.js` ends the session untouched. Suite 1166/1166,
harness 75/75, readiness green. Nothing committed.

No roadmap entry is proposed.

Run artifacts: `wf_0f3ff14b-fde` journal under the session's
`subagents/workflows/`. Not committed.
