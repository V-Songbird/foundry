# Wave 3 design — entry 145 and trial-log recording

Status: HISTORICAL — written 2026-07-29, superseded by what shipped.
§1 is void: entry 145 is dropped and the sprint surface was deleted at the 1.0
close (`skills/sprint/`, `scripts/sprint.js`, `tests/sprint.test.js`,
`skills/sprint/workflows/run-batch.js` are all gone), so none of its three
costed options apply. §2's recommendation was executed: B1 shipped —
`scripts/trial-log.js` exists and is called from `scripts/roadmap.js`,
`scripts/craft-handoff.js`, `scripts/safe-commit.js`, `hooks/session-start.js`
and `hooks/task-completed.js`. B2 (the model-side events) remains unbuilt;
TRIALS.md:24-32 is the canonical list of which ones and why the three rates
read null.

Baseline: foreman main 7f29763, 1011 tests. Entries 177 and 178 are built and
awaiting acceptance. This document covers the two wave items that call for a
judgment before any code.

---

## 1. Entry 145 — sprint keep-or-cut

### What 145 actually asks

Its `what`: *"Keep sprint experimental, run bounded real-project trials after
trust and lifecycle work, and promote it only if it reduces attention without
harming isolation or recovery."*

So 145 is a **gate entry, not a build entry**. Nothing written this wave can
close it: it closes when a bounded trial has run and the promote/cut call has
been made. Its `depends_on` (038, 142, 143, 144, 131, 132) says the same
thing.

That leaves one thing about sprint that *is* actionable now, and it is the
reason the entry surfaced in this wave at all.

### The measurable fact

`skills/sprint/SKILL.md` step 2 says:

> Assemble the same handoff used by the `foreman:roadmap` pick branch. Reuse
> its prompt rules and `${CLAUDE_PLUGIN_ROOT}/prompt-template.md`, except omit
> the normal roadmap lifecycle paragraph.

Sprint is the **only** flow that still instructs a session to read
`prompt-template.md`. Per R-006:

| Flow | est. tokens of instructions |
| --- | --- |
| Fast pick via entrance | 9,693 |
| craft-prompt | 7,165 |
| survey | 4,239 |
| init | 2,553 |
| **sprint** | **14,182** (SKILL.md 2,498 + prompt-template.md 11,684) |
| add / correct / status / doctor | 1,252 – 1,653 |

Sprint is the most expensive flow Foreman has, and 82% of that is one file
every other flow stopped reading in wave 2. R-006 carries a limitation line
that exists solely to explain this.

### Option 1 — rewire sprint onto `craft-handoff.js` (recommended)

Feasibility is already established; no new script capability is needed:

- **The lifecycle paragraph is already omittable.** `craft-handoff.js`'s
  `loadRecord` supports an **entry-less** call — `title` / `why` / `what` /
  `planned_touches` / `notes` / `depends_on` inline on stdin. `entryParagraph`
  is `""` whenever `record.id` is null, and the gate is not given `--entry`, so
  it does not demand one either. That is exactly sprint's "omit the normal
  roadmap lifecycle paragraph". Sprint already fetches the full entry with
  `list --ids <id>` in step 2, so it has every field to pass.
- **`workflowStage: true` is the right flavor.** It exists already (entry 204)
  and it is built for precisely this: a prompt that runs as a stage inside a
  Workflow. Sprint dispatches into `skills/sprint/workflows/run-batch.js`.
- **The seven sprint-only worker rules** ride as `judgment.constraints`, which
  is what `taskRulesText` renders.
- **The `resumed` signal rule sprint states in prose** ("Step 2's
  `planned` → `in_progress` transition is *not* the `resumed` signal") is
  already what `computeSignals` computes: a fresh unit has empty `commits` and
  `observed_touches` and no `resume` flag, so `resumed` is false. The prose is
  re-deriving by hand what the script already does.

Effect:

- sprint's instruction load drops from **14,182 → roughly 2.4k** (its own
  SKILL.md, smaller once the prose that re-derives template rules is deleted).
- `prompt-template.md` becomes read by **no skill at all** — only by
  `craft-handoff.js` and `check-prompt.js` at run time. R-006's extra
  limitation line goes away with it.
- Sprint's prompts start passing through `check-prompt.js`'s gate, which
  nothing checks today.

Costs and risks:

- `tests/sprint.test.js`'s skill-contract assertions (lines ~198-216) need
  updating for the rewritten step 2.
- `skills/sprint/SKILL.md` is an R-006 fixture → one more supersede with
  recomputed numbers, in the same commit.
- It changes an unvalidated surface before it is validated. Mitigation: it
  changes *how the prompt is assembled*, not what sprint does, and it makes
  sprint's prompts identical in shape to the ones every other flow already
  ships.

### Option 2 — cut sprint

Delete `skills/sprint/`, `scripts/sprint.js` (433 lines), the workflow,
`tests/sprint.test.js`, the entrance routing row, and the three README lines.

Removes the whole 14.2k and the maintenance surface. But sprint is **shipped
and released** — `/foreman:sprint` is announced in CHANGELOG 0.4x and
documented in README's command table. Removing it is a user-visible removal
needing its own changelog line, and 038 was already closed once as "will not be
built" and then reopened by the user; cutting now re-litigates that decision a
second time.

### Option 3 — leave it

Zero work. Sprint keeps costing 14.2k per invocation, R-006 keeps its extra
limitation, and `prompt-template.md` keeps a skill-side reader.

### Recommendation

**Option 1.** It is the only one compatible with 145's own decision (keep it
experimental, validate later) that also removes the cost. A cut is a larger,
harder-to-reverse product call; leaving it keeps a known cost for no reason.

Either way, **145 itself stays open** — it is the validation gate, and
validation needs the trial log below.

---

## 2. Trial-log recording

### The stated purpose

"Opt-in local trial log so health tools stop returning null rates."

`benchmarks/health/TRIALS.md` already specifies the whole thing: the format,
the closed vocabulary, the privacy rules, and the exact surface each of the
eleven event types would be written from. Nothing needs designing about *what*
to record. The open question is **where the write goes**.

### The tension

TRIALS.md places most events in skill files. Wiring them literally means adding
"write a trial event here" lines to roughly eight skill files — which directly
fights the attention cut wave 2 just measured, and re-churns the R-004/R-006
fixture chain again.

### The cheaper placement

Several events can be written by the **scripts and hooks the skills already
call**, at zero instruction cost:

| Event | Written by | Already knows |
| --- | --- | --- |
| `menu_shown`, `hint_used` | `roadmap.js next-candidates --menu` | row count, `hint_matched` |
| `first_pick` | `craft-handoff.js` | it runs once per delivered handoff |
| `session_start` | `hooks/session-start.js` | — |
| `recovery_attempted` (resume, failure half) | `hooks/session-start.js` | open entries carrying commits |
| `recovery_attempted` (resume, success half) | `hooks/task-completed.js` | prior commits/observed_touches |
| `commit_interrupted` (`verification_declined`) | `hooks/task-completed.js` | the hold itself |
| `commit_interrupted` (five refusal classes) | `scripts/safe-commit.js` | it produces the `ok:false` |

Genuinely model-side — no script sees them:

- `pick_accepted` / `pick_overridden` — only the model knows which row the user
  chose.
- `question_asked` — only the model knows it asked.
- `init_started`, `init_completed` — both sit inside the init skill's own flow.
- `recovery_attempted` (`reinit-snapshot`, `failed-verification-retry`).

### Shape

Common to every option:

- `scripts/trial-log.js` — the writer. Opt-in behind a new
  `.foreman/config.json` key (`trialLog: true`, default false, added to
  `CONFIG_SPEC` in `roadmap-doctor.js` so `doctor` validates it). Silent no-op
  when off. Validates every event against TRIALS.md's closed vocabulary at the
  boundary — the caller is a model. Appends to `.foreman/trial-log.jsonl`.
  Mints the opaque per-session token.

Then:

- **B1 — script/hook events only.** No skill file is touched, so no fixture
  churn and no instruction cost. Delivers `hint_success` fully and
  `menus_shown` as a real count, plus the whole recovery and
  commit-interruption side.
- **B2 — the model-side events.** These are what actually unlock
  `recommendation_acceptance`, `override_rate`, and `questions_per_task`. They
  cost instruction lines in roughly eight skill files, plus a fixture
  supersede.

### Honest caveat

**B1 alone does not make `roadmap-health.js` stop returning null** for
acceptance and override — those two are the model-side events. If the goal is
literally "stop returning null rates", it is B1 + B2, and the instruction cost
is real and immediate while the payoff needs a 30-day trial to arrive.

### Recommendation

**B1 now, B2 as its own entry.** B1 is free at the point of use and is the
half that cannot be reconstructed later from anything else. B2's cost/benefit
is exactly the sort of thing 145's own trial is supposed to answer, so
deciding it before any trial exists is the wrong order.
