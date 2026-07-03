---
name: roadmap
description: Ongoing entry point for a project's ROADMAP.jsonl. Pick the next task to work on (reasons about dependencies and file-touch collisions like a software architect, then crafts a self-contained handoff prompt), add a new task, or review roadmap status.
when_to_use: Trigger when the user asks what to work on next, wants to add something to the roadmap, wants to see roadmap status, says "what's next", "pick a task", "add to the roadmap", "roadmap status", or invokes /relay:roadmap.
argument-hint: "<optional — a task description to add, or a hint about what to pick next>"
allowed-tools: AskUserQuestion, Read, Edit, Bash, PowerShell, TaskCreate, Agent
---

# relay:roadmap — pick, add to, or review the project roadmap

Reads and writes `ROADMAP.jsonl` at the project root. Read
`${CLAUDE_PLUGIN_ROOT}/roadmap-schema.md` before touching the file — it
defines every field, the status enum, and the write invariants
(parse-before-write, parse-after-write, append-only notes).

**Pre-check**: if `ROADMAP.jsonl` doesn't exist at the project root, tell
the user to run `/relay:init` first and stop here.

---

## Call 1 — menu

**Q1** — "What do you need?"
Options:
- `Pick the next task` — read the roadmap, reason about what to work on
  next, craft a handoff prompt for it.
- `Add a task` — append a new entry to the roadmap.
- `Review status` — read-only summary of where every task stands.

If args were provided and read like a task description rather than a
question, treat it as a seed for "Add a task" and skip this call.

---

## Branch: Pick the next task

1. Read the whole file — it's small, read it in full, not partial.
2. Filter to `status == "planned"` entries whose every `depends_on` id is
   `status == "done"` (anything else is blocked — derived, not stored, per
   the schema doc).
3. Among the unblocked candidates, flag (don't hard-exclude) any whose
   `touches` overlaps with another currently-`in_progress` task's
   `touches` — that's a collision risk, not a blocker; surface it as a
   caution in the candidate's one-line summary.
4. Present the ranked candidates (2-4 of them) with a one-line `why` each.

**Q1** — "Which task next?"
Options: the top candidates by title, plus an escape to describe something
else not on the list.

5. Once confirmed, craft the handoff prompt using
   `${CLAUDE_PLUGIN_ROOT}/prompt-template.md`'s XML structure, pre-filled
   from the roadmap entry:
   - `task_context` goal ← the entry's `title` + `why`
   - `background` / `context` ← the entry's `what`
   - `relevant_files` seed ← the entry's `touches` (tell the user these are
     area-level hints, not confirmed file:line ranges — they still need to
     verify/tighten them, same as the checklist in `prompt-template.md`
     already requires)
   - Everything else (tone, steps, verification command) — ask the same way
     `craft-prompt` does if it isn't inferable from the roadmap entry alone.
6. Before handoff, update the entry in `ROADMAP.jsonl`: `status:
   "in_progress"`, `updated_at` — so the commit hook's status-sync
   instruction has something to close out later.

**Q2 (final)** — "Prompt is ready. What should we do?"
Options:
- `Execute with TaskCreate` — track it and work it in this session
- `Execute with a background Agent` — offload it, get notified on completion
- `Copy prompt to clipboard` — just get the text, no execution

**Never call `mcp__ccd_session__spawn_task`** — it has a known bug where
tasks spawned through it don't get MCP tools.

- **TaskCreate**: call `TaskCreate` with `subject` = a verb-first
  imperative ≤60 chars from the entry's `title`, `description` = the
  assembled XML prompt. Work it in this session, `TaskUpdate` to
  `in_progress` then `completed` as you go.
- **Background Agent**: call `Agent` with `prompt` = the assembled XML
  prompt, `description` = a 3-5 word summary, `run_in_background: true`.
- **Clipboard**: copy the prompt via `Bash`/`PowerShell`
  (`Set-Clipboard`/`clip` on Windows, `pbcopy` on macOS, `xclip
  -selection clipboard`/`wl-copy` on Linux); fall back to a fenced `xml`
  block if no clipboard tool is available.

**Hard rule — state this explicitly if the user pushes back**: this skill
always asks before doing anything — it never silently executes a task, and
it never mentions or routes to Forge or any other plugin. "Do it now" means
picking `Execute with TaskCreate` above, not this skill deciding on its own.

---

## Branch: Add a task

1. Read the whole file, parse every line (per the schema doc's write
   invariants) — this is also how the next `id` gets computed.
2. Gather via free text: `title`, `why`, `what`, and optionally
   `depends_on` (existing ids) and `touches` (path/area hints). Don't force
   the user through every field if they've already given enough in a
   one-line description (args or a natural request) — ask only for what's
   missing.
3. Compute `id` as `max(existing ids) + 1`, zero-padded.
4. Append the new line: `source: "user"`, `status: "planned"`,
   `created_at`/`updated_at` today, `commits: []`, `notes: ""`.
5. Re-read the file and re-parse every line to confirm it's still
   well-formed JSONL.
6. Confirm back to the user with the new task's id and title.

---

## Branch: Review status

Read-only. Read the whole file, render a compact list grouped by `status`
(`in_progress` first, then `planned` — noting which are blocked and on
what — then `done`, `dropped`, `rejected` last). No writes, no further
questions.
