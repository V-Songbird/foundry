# Foreman

**Prompt-engineering + project-roadmap plugin for Claude Code.**

Foreman has two pillars: crafting self-contained, Anthropic-grade prompts for
spawned sessions, and driving a per-project roadmap (`ROADMAP.jsonl`) that
records why each task exists, what it is, its status, and the commit(s)
that implemented it. A hook triggered on `git commit` keeps the roadmap in
sync and — only if you opt in — asks what to do with newly discovered
opportunities; a second hook mechanically blocks direct edits to
`ROADMAP.jsonl`. Neither acts without asking or touches a project that
hasn't run `/foreman:init`.

---

## Install

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install foreman
```

---

## Skills

| You want to… | Invoke |
| --- | --- |
| Build a self-contained prompt for a spawned session | `/foreman:craft-prompt` |
| Bootstrap a project's roadmap (one-time, per project) | `/foreman:init` |
| Pick the next task, add a task, or review roadmap status | `/foreman:roadmap` |
| Ground-truth the next candidates against the actual codebase | `/foreman:survey` |
| Turn commit-hook discovery suggestions on or off | `/foreman:toggle-discovery` |

### `/foreman:craft-prompt`

Interactive, `AskUserQuestion`-driven prompt builder. Walks through task
type, optional sections (tone, constraints, background, output format),
required fields (role, done-state, relevant files, steps), and verification
— then asks how you want to run it (`TaskCreate`, a background `Agent`, or
clipboard) *before* assembling anything — then builds the XML prompt
defined in `prompt-template.md` and delivers it straight to that
destination. The raw prompt is never shown in chat; it's data for the
chosen mechanism, not something to preview. Never uses
`mcp__ccd_session__spawn_task` — it has a known bug where tasks spawned
through it don't get MCP tools.

Every assembled prompt carries a fixed `truth_grounding` block instructing
the handed-off session to verify the prompt's claims against the actual
codebase at the start of its work, rather than assuming they're still
accurate — the prompt may have been written earlier and run later.

Default tone (override with the `Tone` optional section): checked once at
craft time, not deferred to the spawned session — if `.caveman-active`
exists, the `<tone>` block is omitted entirely (caveman's own SessionStart
hook already sets terse mode on whatever session runs the prompt);
otherwise minimal and professional — silent by default, only what you need
to know, no unnecessary jargon. `task_context`'s role sentence gets the same
craft-time treatment for `.ponytail-active` — domain framing instead of a
competing "You are a [role]" identity claim. Default output format: a plain
human-readable summary, no XML tags — tags are opt-in only (`Custom output
format`), for when something downstream actually parses the result.

### `/foreman:init`

Run once per project. Asks what the project is and its near-term goals,
asks the key policy question — should the roadmap accept Claude-suggested
entries after commits — drafts an initial `ROADMAP.jsonl`, gets your
approval, then writes and commits `ROADMAP.jsonl` and `.foreman/config.json`.

### `/foreman:roadmap`

The ongoing entry point once a roadmap exists:
- **Pick the next task** — `roadmap.js next-candidates` mechanically
  filters (unblocked: `planned`, every `depends_on` done) and ranks (most
  `depends_on`-referenced first, then oldest) with a `touches`-collision
  flag against `in_progress` work — no LLM reasoning over the whole file.
  Asks how to run it (`TaskCreate`, background `Agent`, or clipboard —
  same three options as `craft-prompt`) *before* building anything, then
  crafts a self-contained handoff prompt straight from the picked entry's
  own fields — **it does not `Read`/`Grep` the codebase to verify them**,
  that's the handed-off session's job via `truth_grounding` — and delivers
  it straight to the chosen destination, never shown in chat. Never
  silently executes without asking, and has nothing to do with Forge (a
  separate, unrelated plugin).
- **Add a task** — appends a new entry to the roadmap.
- **Review status** — read-only summary grouped by status.

### `/foreman:survey`

The one Foreman flow that deliberately investigates the codebase against
the roadmap — separate and explicitly-triggered on purpose, so
`foreman:roadmap`'s fast pick-next-task path never pays for it. Surveys the
top unblocked candidates (default 3, same as `roadmap`), dispatches one
`Explore` agent per candidate in parallel to check whether `touches` still
match reality, whether `depends_on` entries' claimed `commits` actually
exist, and whether a hidden dependency or duplicate work shows up in the
code — then asks before persisting anything. A confirmed hidden dependency
writes to `depends_on` via `roadmap.js update-deps` (structural — changes
what a future `next-candidates` call returns); a stale/duplicate/already-
done finding writes a `notes` breadcrumb or status change via
`update-status`.

### `/foreman:toggle-discovery`

Flips `.foreman/config.json`'s `discoverySuggestions` flag without
re-running the whole `/foreman:init` interview. Reads the current state,
asks which way to set it (or reads `on`/`off` straight from args), writes
and commits just that file if it actually changed.

---

## The roadmap file

`ROADMAP.jsonl` lives at your project's root and is committed to git — a
visible, shared record of the plan, not internal plugin state. One JSON
object per line, one line per task. Every read/write goes through
`scripts/roadmap.js` — a small CLI (`add`/`update-status`/`list`/
`next-candidates`/`check-duplicate`, JSON in/out) — never a hand-edited
`Read`/`Edit`. `add`/`update-status` return a `warnings` field (without
failing the write) if `why`/`what`/`notes` run long — dense means specific
paths and symbols, not an essay; every extra paragraph gets re-read on
every future `list`/`next-candidates` call. Full field reference, CLI
usage, and the invariants it enforces: [`roadmap-schema.md`](roadmap-schema.md).

```jsonl
{"id":"001","title":"Add JWT refresh middleware","why":"Sessions expire mid-request under load.","what":"Refresh the access token in middleware before its 15-min expiry.","status":"planned","source":"user","depends_on":[],"touches":["src/auth/middleware.ts"],"commits":[],"created_at":"2026-07-03","updated_at":"2026-07-03","notes":""}
```

`.foreman/config.json` (also committed) holds the one policy toggle
`/foreman:init` sets:

```json
{"discoverySuggestions": true}
```

---

## The hooks

`hooks/post-commit.js` fires on every `git commit` (via `Bash`/`PowerShell`
`PostToolUse`). It:

1. Stays completely silent if `ROADMAP.jsonl` doesn't exist — a project
   that never ran `/foreman:init` gets nothing from Foreman, ever.
2. If a roadmap task is `in_progress`, nudges Claude to check whether this
   commit finished it and, if so, update its status/commits.
3. If `discoverySuggestions` is on, nudges Claude to scan the commit's work
   for *confirmed* opportunities/bugs/ideas, check them against already-
   `rejected` entries via `roadmap.js check-duplicate` (skips silently on a
   match), and for each new one ask you what to do with it — add to the
   roadmap, execute now with `TaskCreate`, execute via a background
   `Agent`, or reject it. Never acts without asking. Entries added this way
   are written dense with whatever's already in the session's context
   (exact paths, line ranges, symbol names) — Claude never goes exploring
   further just to pad out a roadmap entry; see
   [`roadmap-schema.md`](roadmap-schema.md#writing-claude-suggested-entries--pack-context-now-its-free).

`hooks/guard-roadmap-edit.js` fires on every `Edit`/`Write` (`PreToolUse`)
and denies it if the target file is named `ROADMAP.jsonl` — mechanical
enforcement, not just convention, that all reads/writes go through
`scripts/roadmap.js`. `Read` is unaffected; `Bash` stays open as an escape
hatch if the file is ever corrupt enough that the CLI itself can't parse
it.

---

## Tests

```
node --test foreman/tests/*.test.js
```

Covers `hooks/post-commit.js`, `hooks/guard-roadmap-edit.js`, and
`scripts/roadmap.js` (id computation, status transitions, append-only
notes, duplicate detection, corrupt-file handling, `--help`/`-h`/no-args
usage output).
