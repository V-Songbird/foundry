# Relay

**Prompt-engineering + project-roadmap plugin for Claude Code.**

Relay has two pillars: crafting self-contained, Anthropic-grade prompts for
spawned sessions, and driving a per-project roadmap (`ROADMAP.jsonl`) that
records why each task exists, what it is, its status, and the commit(s)
that implemented it. A single hook, triggered on `git commit`, keeps the
roadmap in sync and — only if you opt in — asks what to do with newly
discovered opportunities. It never acts without asking, and it stays
completely silent on any project that hasn't run `/relay:init`.

---

## Install

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install relay
```

---

## Skills

| You want to… | Invoke |
| --- | --- |
| Build a self-contained prompt for a spawned session | `/relay:craft-prompt` |
| Bootstrap a project's roadmap (one-time, per project) | `/relay:init` |
| Pick the next task, add a task, or review roadmap status | `/relay:roadmap` |

### `/relay:craft-prompt`

Interactive, `AskUserQuestion`-driven prompt builder. Walks through task
type, optional sections (tone, constraints, background, output format),
required fields (role, done-state, relevant files, steps), and verification
— then assembles the XML prompt defined in `prompt-template.md` and either
spawns it (`spawn_task` on Desktop, `Agent`+`TaskCreate` on CLI) or shows it
to copy.

### `/relay:init`

Run once per project. Asks what the project is and its near-term goals,
asks the key policy question — should the roadmap accept Claude-suggested
entries after commits — drafts an initial `ROADMAP.jsonl`, gets your
approval, then writes and commits `ROADMAP.jsonl` and `.relay/config.json`.

### `/relay:roadmap`

The ongoing entry point once a roadmap exists:
- **Pick the next task** — reasons about `depends_on` ordering and
  `touches` collisions like a software architect, then crafts a
  self-contained handoff prompt (reusing `craft-prompt`'s template) for the
  chosen task. Hands off only — it never executes the task itself inline,
  and it has nothing to do with Forge (a separate, unrelated plugin).
- **Add a task** — appends a new entry to the roadmap.
- **Review status** — read-only summary grouped by status.

---

## The roadmap file

`ROADMAP.jsonl` lives at your project's root and is committed to git — a
visible, shared record of the plan, not internal plugin state. One JSON
object per line, one line per task. Full field reference, status enum, and
write invariants: [`roadmap-schema.md`](roadmap-schema.md).

```jsonl
{"id":"001","title":"Add JWT refresh middleware","why":"Sessions expire mid-request under load.","what":"Refresh the access token in middleware before its 15-min expiry.","status":"planned","source":"user","depends_on":[],"touches":["src/auth/middleware.ts"],"commits":[],"created_at":"2026-07-03","updated_at":"2026-07-03","notes":""}
```

`.relay/config.json` (also committed) holds the one policy toggle
`/relay:init` sets:

```json
{"discoverySuggestions": true}
```

---

## The commit hook

`hooks/post-commit.js` fires on every `git commit` (via `Bash`/`PowerShell`
`PostToolUse`). It:

1. Stays completely silent if `ROADMAP.jsonl` doesn't exist — a project
   that never ran `/relay:init` gets nothing from Relay, ever.
2. If a roadmap task is `in_progress`, nudges Claude to check whether this
   commit finished it and, if so, update its status/commits.
3. If `discoverySuggestions` is on, nudges Claude to scan the commit's work
   for *confirmed* opportunities/bugs/ideas and, for each one, ask you what
   to do with it — add to the roadmap, spawn it now, do it inline now, or
   reject it (logged so it isn't re-suggested). Never acts without asking.

---

## Tests

```
node --test relay/tests/*.test.js
```
