# Host / session MCP tools — canonical reference

> **Observation:** Claude Code Desktop app, Sonnet 4.6 session, 2026-06-30.
> **Source method:** Live parameter-schema introspection from the session toolset.
> **Coverage note:** These tools are injected by the Desktop app and are NOT documented at code.claude.com/docs. Schemas differ between Desktop / CLI / Web and can change between harness versions. Each section states what was actually observed.
> **Research corroboration:** GitHub issue anthropics/claude-code confirms `mcp__ccd_session__spawn_task` and `mcp__ccd_session__mark_chapter` are passed to the bundled Claude CLI via `--allowedTools`. The `visualize` family's rendering backend is hosted at `claudemcpcontent.com`.

---

## Family: `ccd_session` — session lifecycle and background work

### `mcp__ccd_session__spawn_task`

**Purpose:** Flag an out-of-scope issue as a background task chip in the user's UI. One click spins the suggestion into its own session + git worktree; the user can also dismiss it. The current turn continues uninterrupted — this is a non-blocking suggestion, not an action.

**Parameters:**
- `title` (string, required) — under 60 chars, imperative action phrase starting with a verb. Shown as the chip label and the spawned session's title.
- `prompt` (string, required) — initial message for the spawned session. Must be fully self-contained: the spawned session has no memory of the current conversation, so include file paths and enough context to act cold.
- `tldr` (string, required) — 1–2 sentence plain-English summary shown in a tooltip. No file paths or code.
- `cwd` (string, optional) — absolute path to a different project root than the current session. Only set when the work clearly belongs in another repo.

**Returns:** `task_id` string (used later by `dismiss_task` to withdraw the chip).

**When to use:** Confirmed security bugs, dead code found incidentally, stale docs, missing test coverage — "by the way" finds that are real but out of scope for the current task. NOT for vague observations, trivial inline fixes, or anything needing the current conversation's context to understand.

---

### `mcp__ccd_session__dismiss_task`

**Purpose:** Withdraw a background-task chip previously created by `spawn_task` — use when the suggestion is stale, superseded, or the issue was already handled in this session.

**Parameters:**
- `task_id` (string, required) — the id returned by the originating `spawn_task` call.
- `reason` (string, optional) — one-line reason, e.g. "fixed in this session" or "superseded by task_ab12cd34".

**Behavior:** Only chips the user has NOT already acted on can be withdrawn. If the user already started or dismissed the chip, the call is a no-op and reports that — do not retry. Task ids are not persisted across app restarts.

---

### `mcp__ccd_session__mark_chapter`

**Purpose:** Mark the start of a new phase of work in the session transcript. The user sees a visual divider and a floating table-of-contents entry they can click to jump between chapters.

**Parameters:**
- `title` (string, required) — short noun-phrase under 40 chars (e.g. "Auth bug fix", not a sentence).
- `summary` (string, optional) — one-line description shown on hover in the table of contents.

**When to use:** When the work shifts to a meaningfully different phase — finishing exploration and starting implementation, after a fix lands and moving to verification, when the user pivots to an unrelated request. Use sparingly: a typical session has 3–8 chapters. Do not mark one for the very first message (session start is implicit).

---

### `mcp__ccd_session__read_widget_context`

**Purpose:** Read the current live state/context of an embedded interactive widget that was rendered in a previous turn (via `mcp__visualize__show_widget`).

**Parameters:**
- `tool_name` (string, required) — the name of the widget tool to get context for.

**When to use:** When you need to know the current user-interaction state of a widget rather than assuming it. Called after a widget has been shown and the user may have interacted with it.

---

## Family: `visualize` — inline SVG / HTML widgets

**Backend:** `claudemcpcontent.com` (rendering service, not a public API).

### `mcp__visualize__read_me`

**Purpose:** Returns required setup context (CSS variables, color palette, typography, layout rules, module-specific examples) that MUST be loaded before the first `show_widget` call.

**Parameters:**
- `modules` (array of enum, required) — which guidance module(s) to load. Valid values: `diagram`, `mockup`, `interactive`, `data_viz`, `art`, `chart`, `elicitation`.
- `platform` (enum, optional) — `mobile` | `desktop` | `unknown`. Adjusts SVG viewBox and layout sizing for the client viewport.

**Behavior:** Internal setup step. The guidance says to call it silently without narrating the call to the user, then proceed directly to building the widget.

---

### `mcp__visualize__show_widget`

**Purpose:** Render visual content — SVG graphics, diagrams, charts, or interactive HTML — inline alongside the text response.

**Parameters:**
- `title` (string, required) — short `snake_case` identifier, no spaces or special characters. Used as the download filename and as a disambiguation handle if multiple widgets appear in one session.
- `widget_code` (string, required) — SVG (must start with `<svg`) or HTML content. Auto-detected by prefix. For HTML: do NOT include `DOCTYPE`, `<html>`, `<head>`, or `<body>` tags. Must use CSS variables for theming. Scripts execute after streaming completes.
- `loading_messages` (array of string, required) — 1–4 messages (~5 words each) shown while the widget renders.

**Available in widget JS:** A global `sendPrompt(text)` function sends a message to chat as if the user typed it — use for interactive widgets with action buttons.

**Constraint:** `mcp__visualize__read_me` must be called before the first `show_widget` call in a session.

---

## Family: `ccd_session_mgmt` — cross-session management

*Schemas deferred in the observed session — names only, parameters not directly inspected.*

- `mcp__ccd_session_mgmt__archive_session` — archive a session
- `mcp__ccd_session_mgmt__list_sessions` — list sessions (confirmed passed via `--allowedTools` in bundled CLI)
- `mcp__ccd_session_mgmt__search_session_transcripts` — search across session transcripts
- `mcp__ccd_session_mgmt__send_message` — send a message into another session

---

## Family: `ccd_directory` — directory access

*Schema deferred in the observed session — name only.*

- `mcp__ccd_directory__request_directory` — request access to a directory

---

## Family: `scheduled-tasks` — task scheduling

*Schemas deferred in the observed session — names only.*

- `mcp__scheduled-tasks__create_scheduled_task`
- `mcp__scheduled-tasks__list_scheduled_tasks`
- `mcp__scheduled-tasks__update_scheduled_task`

Note: Scheduled tasks appear to overlap with the officially documented Routines feature (`code.claude.com/docs/en/routines`). Check the live docs via Path A for current parameter details.

---

## Other host families (names observed, not documented here)

- `computer-use__*` — desktop automation (screenshot, click, type, etc.)
- `Claude_in_Chrome__*` — browser automation via Chrome extension
- `Claude_Preview__*` — in-browser preview tools
- `mcp-registry__*` — MCP connector registry (list_connectors, search_mcp_registry, suggest_connectors)

These families have large surface areas. For current parameter schemas, load them via `ToolSearch` with a relevant keyword in a live session.
