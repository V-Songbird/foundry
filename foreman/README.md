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

Config flags (discovery suggestions on/off, whether prompts inherit your
caveman/ponytail state) live in `.foreman/config.json`, a plain JSON file —
no skill wraps it, edit it directly. See [The config file](#the-config-file)
below.

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
accurate — the prompt may have been written earlier and run later. It also
carries a fixed `scope_discipline` block: if a request mid-session goes
beyond the task's stated goal, flag it rather than silently folding it in,
and once it's done, log it as its own `ROADMAP.jsonl` entry (already
`done`, same commit) instead of stretching this task's story to cover it.

Default tone (override with the `Tone` optional section): resolved once at
craft time, not deferred to the spawned session, by a single
`scripts/render-sections.js` call (the same one that resolves
`customSections`/`omitSections` below) — no separate config read or
flag-file check. If the current project's `.foreman/config.json` sets
`inheritOperatorTone` to `false`, the call reports both flags inactive and
the plain defaults apply regardless of what's actually active on this
machine (see [The config file](#the-config-file)). Otherwise — if caveman is
active, the `<tone>` block is omitted entirely (caveman's own SessionStart
hook already sets terse mode on whatever session runs the prompt);
otherwise minimal and professional — silent by default, only what you need
to know, no unnecessary jargon. `task_context`'s role sentence gets the same
craft-time treatment for ponytail — domain framing instead of a competing
"You are a [role]" identity claim. Default output format: a plain
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

---

## The roadmap file

`ROADMAP.jsonl` lives at your project's root and is committed to git — a
visible, shared record of the plan, not internal plugin state. One JSON
object per line, one line per task. Every read/write goes through
`scripts/roadmap.js` — a small CLI (`add`/`update-status`/`update-deps`/
`list`/`next-candidates`/`check-duplicate`, JSON in/out) — never a hand-edited
`Read`/`Edit`. `add`/`update-status` return a `warnings` field (without
failing the write) if `why`/`what`/`notes` run long — dense means specific
paths and symbols, not an essay; every extra paragraph gets re-read on
every future `list`/`next-candidates` call. Full field reference, CLI
usage, and the invariants it enforces: [`roadmap-schema.md`](roadmap-schema.md).

```jsonl
{"id":"001","title":"Add JWT refresh middleware","why":"Sessions expire mid-request under load.","what":"Refresh the access token in middleware before its 15-min expiry.","status":"planned","source":"user","depends_on":[],"touches":["src/auth/middleware.ts"],"commits":[],"created_at":"2026-07-03","updated_at":"2026-07-03","notes":""}
```

---

## The config file

`.foreman/config.json` lives at the project root alongside `ROADMAP.jsonl`,
also committed to git — a shared project policy, not personal state. Plain
JSON, small enough that no CLI or skill wraps it: `/foreman:init` writes it
once during setup, and any flag can be flipped later with a direct
`Read`/`Write` (ask Claude to "turn discovery off", "stop inheriting my
caveman tone for this project", or "require verification before marking
tasks done" and it edits the file itself — no dedicated command needed for
a small flat object).

```json
{"discoverySuggestions": true, "inheritOperatorTone": true, "requireVerification": false}
```

| Field | Type | Default if missing/unparseable | Meaning |
| --- | --- | --- | --- |
| `discoverySuggestions` | boolean | `false` | Whether `hooks/post-commit.js` ever nudges Claude to scan a commit for roadmap opportunities. Set once during `/foreman:init`'s interview. |
| `inheritOperatorTone` | boolean | `true` | Whether prompts assembled by `craft-prompt`/`roadmap` inherit *your* personal caveman/ponytail state (checked at craft time — see `prompt-template.md`). Set to `false` to make this project's prompts always use the plain defaults (direct role sentence, minimal/professional tone) regardless of what's active on whoever's machine crafts them — useful when a project's prompts should read the same for everyone, independent of each operator's personal Claude Code tooling. |
| `requireVerification` | boolean | `false` | Whether `hooks/post-commit.js` lets Claude mark a task `done` unilaterally. `false` (default): a commit that finishes an in-progress task gets `status:"done"` straight away, same as ever. `true`: the commit's SHA and touched files still get recorded immediately (data isn't worth gating), but status stays `in_progress` until Claude asks you (`AskUserQuestion`) to confirm the work is actually verified — only then does it call `update-status` with `"done"`. Off by default since it adds a confirmation step to every task, including trivial ones. |
| `customSections` | array | `[]` | Project-defined XML sections injected into every prompt `craft-prompt`/`roadmap` assemble — see [Custom sections](#custom-sections) below. |
| `omitSections` | array | `[]` | Optional template tags to always drop from every assembled prompt — see [Omitting optional sections](#omitting-optional-sections) below. |

All fields are independent and optional — a file with just one or two keys
is fine, the rest fall back to their defaults. Neither field existing at
all (no `.foreman/config.json`) means every default applies, same as every
version of Foreman before these flags existed.

### Custom sections

`customSections` lets a project bake its own recurring instructions —
a compliance notice, a house style rule, a team-specific checklist —
into every prompt Foreman assembles, without editing the plugin's own
`prompt-template.md` (which lives under `${CLAUDE_PLUGIN_ROOT}` and gets
overwritten on every plugin update/reinstall). It's an array of
`{tag, content}` objects:

```json
{"customSections": [
  {"tag": "compliance_notice", "content": "Any change touching payment data needs a security sign-off before merge."}
]}
```

Each entry is rendered as `<tag>content</tag>` and inlined after
`task_rules` in the assembled prompt, via
`scripts/render-sections.js` — mechanical validation, not prose trust:
`tag` must match `^[a-z][a-z0-9_]*$`, must not collide with a tag the
fixed template already owns (`task_context`, `truth_grounding`,
`scope_discipline`, `tone`, `background`, `relevant_files`, `context`,
`task_rules`, `example`, `output_format`) or an earlier `customSections`
entry, and `content` must be a non-empty string (XML-escaped
automatically — `&`/`<`/`>` in your text won't break the surrounding
prompt). A malformed entry is skipped with a warning, never fails the
whole prompt. `truth_grounding` and `scope_discipline` stay fixed and
non-overridable on purpose — custom sections are additive only.

### Omitting optional sections

`omitSections` is the inverse of `customSections` — it drops one of the
template's *own* already-conditional tags from every prompt this project's
`craft-prompt`/`roadmap` assemble, instead of asking per-prompt (Call 1's
"Which optional sections do you want?") every single time. Only the tags
the template already treats as conditional can be named here:

```json
{"omitSections": ["output_format", "background"]}
```

Valid values: `tone`, `example`, `background`, `output_format` — anything
else (a typo, or a guardrail like `scope_discipline`/`truth_grounding`) is
rejected with a warning by `scripts/render-sections.js`, never silently
honored. A project-level `omitSections` wins over a per-prompt selection
if the two conflict — e.g. `background` in `omitSections` drops it even if
Call 1's optional-section menu offered it. Note that omitting `background`
also drops `<relevant_files>` (it's nested inside `<background>`) — the
prompt's file citations go with it, so `truth_grounding`'s "read the cited
files" instruction has nothing concrete left to point to; only disable it
if that trade-off is genuinely intended for this project.

---

## The hooks

`hooks/post-commit.js` fires on every `git commit` (via `Bash`/`PowerShell`
`PostToolUse`). It:

1. Stays completely silent if `ROADMAP.jsonl` doesn't exist — a project
   that never ran `/foreman:init` gets nothing from Foreman, ever.
2. If a roadmap task is `in_progress`, nudges Claude to check whether this
   commit finished it and, if so, update its status/commits — `roadmap.js`
   itself then auto-folds that commit's actual changed files (`git show`)
   into the entry's `touches`, correcting the pre-task guess to reflect
   what the work really touched, no manual file-listing needed. If a task
   was marked `done` earlier the same day, nudges separately that this
   commit might be a same-day follow-up fix for it — a task stops getting
   any nudge the moment it's `done`, so without this a quick bugfix commit
   right after finishing something loses its SHA (and its files) with no
   signal at all. Appending either doesn't change the task's status —
   `commits[]` and `touches` only ever grow. If `requireVerification` is
   on, the commit still records its SHA/touches immediately but the nudge
   withholds `status:"done"` until Claude asks you to confirm the work is
   actually verified — see [The config file](#the-config-file).
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
   Same nudge also asks Claude to scan for the inverse case — scope that
   grew mid-session and already got built (e.g. "could X also work like
   this?" answered by just implementing it inline) rather than tracked as
   its own task — and log it already `done` with the same commit instead of
   letting it go unrecorded.

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
