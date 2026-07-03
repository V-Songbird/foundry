---
name: init
description: Bootstraps a project's ROADMAP.jsonl and .relay/config.json, and optionally drafts a starter .claude/rules/ file. Asks what the project is and its near-term goals, asks whether the roadmap should accept Claude-suggested entries after commits, drafts an initial set of roadmap tasks (and a rule file, if opted in), gets approval, then writes and commits everything.
when_to_use: Trigger when the user wants to set up Relay's roadmap for a project, says "init relay", "set up the roadmap", "initialize relay", "start a roadmap", or invokes /relay:init. Usually a one-time-per-project action.
argument-hint: "<brief project description — optional seed>"
allowed-tools: AskUserQuestion, Read, Write, Bash
---

# relay:init — bootstrap a project roadmap

Creates `ROADMAP.jsonl` and `.relay/config.json` at the project root, and
optionally a starter rule at `.claude/rules/project-conventions.md`. All
are committed to git — shared project artifacts, not personal state.
`ROADMAP.jsonl` reads/writes go through
`${CLAUDE_PLUGIN_ROOT}/scripts/roadmap.js` (see "Write phase" below) — it
enforces the write invariants (id computation, parse-before/after-write)
mechanically, so you don't have to. Skim
`${CLAUDE_PLUGIN_ROOT}/roadmap-schema.md` if you need field semantics
beyond what's obvious from the names (`why`/`what`/`depends_on`/`touches`).

The rule file, if drafted, comes **only** from what this skill's questions
gather — never from exploring the codebase. That's a deliberate limit:
Relay's other flows stay cheap by never grounding claims before handoff
(`truth_grounding` covers that at execution time instead), and a rule file
built from unverified exploration would assert things about the codebase
nobody checked. For an existing project with real conventions to capture
accurately, a human-reviewed rule file (or `/memory`) beats one drafted
from a five-question interview.

If args were provided, treat them as the project description seed and skip
asking for it in Call 1.

---

## Pre-check

If `ROADMAP.jsonl` already exists at the project root, ask before doing
anything else:

**Q1** — "ROADMAP.jsonl already exists. What do you want to do?"
Options: `Overwrite it (start fresh)`, `Keep it, just add to it`, `Cancel`

- Overwrite → continue to Call 1, the draft phase replaces the file.
- Keep, add to it → skip straight to the draft phase, append new entries
  instead of replacing, don't touch `.relay/config.json` if it already
  exists (ask its Call 2 question only if the config file is missing).
- Cancel → stop here.

---

## Call 1 — project and goals (batch 2)

**Q1** — "What is this project?"
Options: `I'll describe it` (nudge the user to use Other and give a short
description — what it does, what stack, new or existing codebase)

**Q2** — "What are the near-term goals for the roadmap?"
Options: `I'll describe them` (nudge toward Other — 2-5 concrete things
they want to get done soon)

---

## Call 2 — the policy toggle (single question, this is the key decision)

**Q1** — "Should the roadmap accept Claude-suggested entries after commits?"
Options:
- `Yes — ask me about opportunities found after each commit` — after every
  `git commit`, Relay's hook will prompt Claude to scan for confirmed
  bugs/opportunities/ideas from that work and ask what to do with each one.
- `No — the roadmap only grows from what I add myself` — the commit hook
  stays completely silent; nothing gets suggested, ever, until re-run.

Record the answer — it becomes `.relay/config.json`'s `discoverySuggestions`
field verbatim.

---

## Call 2.5 — starter rule file (optional)

Check first: if `.claude/rules/project-conventions.md` already exists,
skip this whole call silently — mention in passing that it's already there
and won't be touched, then move on to the draft phase.

**Q1** — "Draft a starter rule for `.claude/rules/` from what you've told me so far?"
Options:
- `Yes — draft it` — a short, always-loaded project primer (no `paths:`
  frontmatter), built only from Call 1's answers plus whatever you add next.
- `No — skip` — don't touch `.claude/rules/` at all.

If yes, one more optional question:

**Q2** — "Any conventions or constraints Claude should always follow here?"
Options: `I'll describe them` (style, patterns, hard limits — free text),
`None — just use what I already said`

---

## Draft phase (no AskUserQuestion)

From the Call 1 answers, draft 3–8 initial `ROADMAP.jsonl` lines following
the schema exactly:
- `source: "user"` for every entry (nothing Claude-suggested exists yet —
  these came from the user's own stated goals).
- `status: "planned"`, `depends_on` filled in only where one task is
  obviously sequential to another (don't invent dependencies that aren't
  there).
- `touches` as a best-guess area hint per task, or `[]` if genuinely
  unknown (a brand-new project has no files to point at yet — that's fine).
- ids `"001"` through `"00N"` (or continuing past the existing max, if
  appending to an existing file per the pre-check).

If Call 2.5 was a yes, also draft the rule file content:
```markdown
# Project Conventions

[1-2 sentences from Call 1 Q1 — what this project is]

## Working on this project

This project tracks planned work in `ROADMAP.jsonl` via the Relay plugin.
Check `/relay:roadmap` for the next task before picking up new work ad hoc.

## Near-term goals

[Bullet list from Call 1 Q2, only if concrete goals were given]

[If Call 2.5 Q2 had content:]
## Conventions

[Bullet list of what the user said — verbatim intent, not paraphrased into
something stronger than what they actually stated]
```
Nothing in this file states anything not directly traceable to something
the user said in this conversation.

Present the draft as readable text, one task per line — `title` plus `why`
— not a raw JSON dump. If a rule file was drafted, show it right after, in
a fenced block. The user should be able to skim both in a few seconds.

---

## Call 3 — approval

**Q1** — "Draft ready above. Proceed?"
Options: `Looks good, write it`, `Let me adjust it first`

If adjust: gather free-text revisions (roadmap tasks and/or the rule file),
re-present the updated draft(s), ask again. Repeat until approved.

---

## Write phase

1. If the pre-check chose Overwrite: clear any existing file first —
   `Bash`: `> ROADMAP.jsonl` (or delete it). `roadmap.js add` always
   appends, so a fresh file means ids start at `001` again.
2. For each drafted task, call `add` with its fields as JSON over stdin:
   ```
   echo '{"title":"...","why":"...","what":"...","source":"user","depends_on":[],"touches":[]}' \
     | node ${CLAUDE_PLUGIN_ROOT}/scripts/roadmap.js add
   ```
   The script computes the id, sets `status:"planned"`, stamps
   `created_at`/`updated_at`, and validates the file after every write —
   no manual parsing, no hand-computed ids.
3. Write `.relay/config.json` — `{"discoverySuggestions": <bool>}` (skip
   this file write if the pre-check "keep, add to it" branch found an
   existing config already).
4. If a rule file was drafted and approved: `Write` it to
   `.claude/rules/project-conventions.md`. (Call 2.5 already skips this
   whole branch if the file exists — no separate overwrite prompt needed
   here.)
5. Stage and commit only the files this skill actually wrote — never a
   broader `git add`:
   `git add ROADMAP.jsonl .relay/config.json` (+ `.claude/rules/project-conventions.md` if written)
   `&& git commit -m "chore: init relay roadmap"`

Report back: task count, discovery-suggestions on/off, whether a rule file
was written, and point the user at `/relay:roadmap` to pick up the first
task.
