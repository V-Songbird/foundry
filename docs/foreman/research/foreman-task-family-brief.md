# Foreman × the Claude Code Task family — implementation brief

**Status: LOCAL WORKING DOCUMENT. Do not commit to any public repo. Do not quote from it in READMEs or CHANGELOGs (public-docs rule).**

- Authored: 2026-07-13, by a Claude Fable 5 session running on the Claude Code desktop harness, with direct introspection of the live baseline system prompt and tool schemas.
- Local binary at authoring time: `claude.exe` 2.1.207 (`claude --version`). The Workflow tool exists in the CLI since 2.1.154.

## 0. How to use this document (instructions to the implementing model)

1. Read the whole document before touching anything. The **Do-not-do list (§7)** encodes deliberate design cuts — violating one is a regression even if the change "works."
2. Every factual claim carries a confidence tag:
   - **[CONFIRMED-LIVE]** — read verbatim from the live Fable 5 harness system prompt / tool schemas on 2026-07-13. Treat as ground truth for the desktop harness; the headless CLI may lag.
   - **[CONFIRMED-BINARY]** — string-verified against the installed native binary (audit vs 2.1.205, binary now 2.1.207).
   - **[PROBED]** — empirically verified via a headless probe (method in §6).
   - **[NEEDS-PROBE]** — plausible inference. **Run the matching probe in §6 before building anything on it.**
3. Work items (§4) are independent unless a "Depends on" line says otherwise. Each has rationale, full design, files to touch, tests, and acceptance criteria. Items marked **PARKED** are documented for context — do not build them without explicit user approval.
4. Probes cost pennies but still get proposed to the user first when they involve spending API tokens (house rule: propose batch/probe + estimated cost, wait for go; a single trivially-cheap mechanism probe is fine but flag it).
5. After any code change: run the test suite (§8), then the `manifest-curator` agent if a manifest changed, and the `doc-consistency-reviewer` agent if README/CHANGELOG changed. Commit in the foreman submodule first, then bump `version` + `source.sha` **together** in the root `marketplace.json`, commit the parent, push both (auto-push house rule).

---

## 1. Foreman as it exists on disk (verified 2026-07-13)

Prompt-crafting + project-roadmap plugin. Version **0.23.0-alpha** per the parent repo's release commits (foreman `bb7e8e0` / parent `db8726d`, 2026-07-16); the version lives ONLY in the root `.claude-plugin/marketplace.json` — `foreman/.claude-plugin/plugin.json` deliberately carries **no** version field. 185 tests passing.

> **File map drift warning (added 2026-07-16).** §1's file map below was verified 2026-07-13 at 0.21.1-alpha and has NOT been re-verified since; two releases have landed on top of it (0.22.0-alpha, 0.23.0-alpha). The version and test count on this line are current; treat everything else in §1 as a hypothesis to check, not a fact. Concretely, 0.23.0-alpha added `targetModel` to `render-sections.js`'s return contract and a `## Resolve project config (craft-time, once)` step plus a conditional `## Call 6 — executing model` to `skills/craft-prompt/SKILL.md` — §1.5/§1.6 do not describe either.

### 1.1 File map

```
foreman/
  .claude-plugin/plugin.json          # no version field (monorepo convention)
  hooks/hooks.json                    # 4 hook registrations, see §1.2
  hooks/session-start.js              # SessionStart informational line
  hooks/task-created.js               # TaskCreated → planned→in_progress (writes!)
  hooks/guard-roadmap-edit.js         # PreToolUse Edit|Write deny on ROADMAP.jsonl
  hooks/post-commit.js                # PostToolUse Bash|PowerShell, git-commit reactions
  scripts/roadmap.js                  # THE ONLY sanctioned ROADMAP.jsonl accessor
  scripts/render-sections.js          # config → prompt-section resolution
  prompt-template.md                  # canonical assembled-prompt template (~10.4 KB)
  roadmap-schema.md                   # entry schema + status docs
  skills/init/SKILL.md                # one-time project bootstrap
  skills/roadmap/SKILL.md             # 3-branch menu (add / review / pick-next)
  skills/craft-prompt/SKILL.md        # standalone prompt assembly
  skills/survey/SKILL.md              # the ONE flow that ground-truths candidates
  tests/*.test.js                     # 148 tests (roadmap, hooks, render-sections)
  benchmarks/                         # PUBLIC sanitized repro harness (see §1.8)
  README.md / CHANGELOG.md            # public-facing ONLY (public-docs rule)
```

**Memory-vs-disk discrepancies found while writing this brief (do not "fix" from memory):**
- A `toggle-discovery` skill existed at 0.7.0 per project memory but is **absent on disk** — only `init`, `roadmap`, `craft-prompt`, `survey` exist. Do not reference or resurrect it; if `discoverySuggestions` toggling comes up, check the current README for the sanctioned path.
- A `run-tests-on-edit.js` hook existed at 0.8.0 per memory but is **absent on disk**; the current four hooks are the ones in §1.2.

### 1.2 Hook registrations (`foreman/hooks/hooks.json`, current content)

| Event | Matcher | Script | Notes |
|---|---|---|---|
| `SessionStart` | `^(startup\|clear)$` | `session-start.js` | Informational only. Note: **`resume` sources never match** — see H2 in §4. |
| `TaskCreated` | (none) | `task-created.js` | The one hook that writes. See §1.3. |
| `PreToolUse` | `^(Edit\|Write)$` | `guard-roadmap-edit.js` | Denies when target **basename** is `ROADMAP.jsonl` (case-insensitive). Path-independent → also protects worktree copies. `Read` unaffected; `Bash` deliberately open as the corrupt-file repair path. |
| `PostToolUse` | `^(Bash\|PowerShell)$` | `post-commit.js` | Fires logic only on a real `git commit`. |

All four entries use the same shape: `type: "command"`, POSIX `command` + `commandWindows` (PowerShell `$env:CLAUDE_PLUGIN_ROOT` form), `timeout: 5`.

### 1.3 `hooks/task-created.js` — the existing write hook (the model for M1)

Read this file before writing its mirror. Key facts:

- Marker regex, exported: `ENTRY_MARKER_RE = /ROADMAP\.jsonl entry \`(\d+)\`/` — matches the exact phrase the roadmap skill embeds in the handoff paragraph right after `<scope_discipline>`. Backticks required, id numeric.
- Reads stdin JSON fail-safe (`readFileSync(0)`, both try/catch → `{}`).
- Project root: `path.resolve(process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd())`.
- Event guard: `if (data.hook_event_name && data.hook_event_name !== "TaskCreated") return;`
- Requires marker AND `ROADMAP.jsonl` on disk AND entry exists AND `entry.status === "planned"` — anything else is a **silent no-op** (never regresses done/dropped/deferred, never re-touches in_progress).
- Writes through `cmdUpdateStatus(root, {id, status: "in_progress"})` — `require`d in-process from `../scripts/roadmap` so every invariant of the CLI applies.
- Top-level try/catch → `process.exit(0)`. The embedded prose instruction in the assembled prompt remains the fallback for foreman-less destinations; a second same-status update is a harmless no-op.
- Exports `{ main, entryIdFromDescription, ENTRY_MARKER_RE }` for tests and reuse.

### 1.4 `scripts/roadmap.js` — the CLI (never bypass it)

- Subcommands: `add`, `update-status`, `list` (flags: `--status`, `--ids`, `--summary` → id/title/status/depends_on only), `next-candidates` (flag: `--limit N`; returns unblocked planned candidates ranked most-`depends_on`-referenced first then oldest `created_at`, flags `collision` when `touches` overlaps an in_progress entry's, **and returns `in_progress[]`** with notes/updated_at for resume-first picks), `check-duplicate` (matches across **all** statuses, each match carries `status`), `annotate` (stdin `{id, notes}` — appends notes + bumps `updated_at` **without touching status**), `update-deps` (rejects unknown ids, self-deps, and direct/transitive **cycles** via a `reaches()` helper).
- I/O contract: writes take JSON on stdin; every command emits JSON on stdout — `{"ok":true,...}` or `{"ok":false,"error":"..."}` with exit 1.
- Entry fields: `id, title, why, what, status, source (user|claude-suggested), depends_on, touches, commits, created_at, updated_at, notes`. `blocked` is derived from `depends_on`, never stored. Soft length caps on `why`/`what`/`notes` (warnings, not blocks). `notes` is append-only in code.
- Statuses: `planned | in_progress | done | dropped | rejected | deferred`. `deferred` is an **update-status transition only** (creation allows only planned/rejected); `next-candidates` filters `status==="planned"` so deferred is excluded for free (there is an intentional-exclusion comment on that filter line — keep it).
- **Atomic writes**: `writeEntries` writes `ROADMAP.jsonl.<pid>.tmp` in the same dir then `renameSync`s over the target (unlinks temp on rename failure); parse-after-write re-validation. A test asserts no `.tmp` leftovers.
- **`today()` returns the LOCAL date** (manual yyyy-mm-dd assembly, not `toISOString()`), so near-midnight commits stay in post-commit's same-day window. Tests must use local-date helpers too — a UTC/local mismatch made the suite time-of-day-dependent once (fixed in 0.21.0); do not reintroduce `toISOString()` date math anywhere.
- Exports used in-process by hooks: `readEntries`, `cmdUpdateStatus`.

### 1.5 `scripts/render-sections.js` + config

Reads `.foreman/config.json`, returns `{usePersona, sections, omit, warnings}` in **one** call (this collapsed a 3-tool-call craft-time sequence; both skills run it on every prompt assembly — highest-frequency path in the plugin).

Config keys (all of them, current):
- `discoverySuggestions` (bool) — gates post-commit's discovery block.
- `requireVerification` (bool) — post-commit records sha/touches immediately but withholds `status:"done"` until user confirms via `AskUserQuestion`. This IS a real, tested key (a "dead key" diagnosis was made and retracted on 2026-07-09 — do not repeat it).
- `usePersona` (bool, default true) — `true`: `<task_context>` opens "You are a [role]"; `false`: domain framing. This replaced all flag-file sniffing in 0.14.0 (detection → declaration); never reintroduce `$CLAUDE_CONFIG_DIR` flag checks.
- `customSections` (`[{tag, content}]`) — project-injected recurring blocks rendered `<tag>content</tag>` after `<task_rules>`. Tag must match `^[a-z][a-z0-9_]*$`, must not collide with reserved tags (`task_context, truth_grounding, scope_discipline, tone, background, relevant_files, context, task_rules, example, output_format`), no duplicates, no empty content — each violation is skipped with a warning, never fails the whole prompt. Content is XML-escaped (`&`, `<`, `>`).
- `omitSections` — drops template tags project-wide; **only** `tone`, `example`, `background`, `output_format` are valid. A guardrail tag named here is rejected with a warning, never honored. Documented trade-off: omitting `background` also drops nested `<relevant_files>`.

### 1.6 `prompt-template.md` — structure of every assembled prompt

Fixed, non-overridable blocks: `<truth_grounding>` (verify claims against the actual codebase at session start; a found brief/reality mismatch is **part of the outcome — state it in ONE line of the final message** and in the roadmap entry's notes; "a minimal register trims narration, never a found discrepancy"; the noun "report" is deliberately avoided everywhere — it fed hush's requested-report carve-out) and `<scope_discipline>` (flag scope creep to the user first; once done, log it as its own already-`done` entry via `roadmap.js add` + `update-status`).

Roadmap-flow handoffs additionally carry a fixed paragraph right after `<scope_discipline>` naming **"ROADMAP.jsonl entry `N`"** (the exact phrase `ENTRY_MARKER_RE` parses) that instructs the destination to (a) run `update-status` to `in_progress` as its first action, and (b) on completion: status earned + findings appended to `notes` + the commit sha — **"if the work changed code, commit it before closing and pass the sha; a task that changed nothing (pure investigation) closes without one"** (the 0.16.2 rule; M1 below mechanizes its enforcement).

Other template facts a builder must not break:
- Step 0 **destination-aware tone carve-out**: an `omitSections: ["tone"]` is honored for clipboard/TaskCreate destinations but the tone block **stays in when the destination is a background `Agent`** — output styles govern only main-loop sessions. (Rationale references razor's SubagentStart reach — see probe P3.)
- `task_rules` uses **unlabeled bullets** (numbered `Step 1/2/3` induced narration; de-numbering alone was proven insufficient, so the closing paragraph's narration-bounding sentences are also load-bearing — both facts empirically established, don't undo either).
- Closing paragraph: reasoning happens in thinking, not prose between tool calls; final-message register defers to the session's output style; evidence goes to a durable home (roadmap entry, commit), chat gets outcome + pointer.
- **Never print the assembled prompt into chat.** It is data for `TaskCreate` / `Agent` / a clipboard temp file. Sole exception: the fenced `xml` block fallback when no clipboard tool exists.
- Handoff destinations are exactly three: **Copy to clipboard (listed first, "(Recommended)")**, `TaskCreate` (in-session; task-created.js auto-marks), background `Agent`. Clipboard is file-mediated only (Write temp file → pipe file into clipboard command; inline-string piping failed in a real trace). `spawn_task` is retired — see §7.
- Foreman never marks an entry `in_progress` itself at pick time (0.15.1) — the destination self-marks (prose) or task-created.js does it (mechanical).

### 1.7 The other two hooks

- `post-commit.js`: fires only on a real `git commit`; silent unless `ROADMAP.jsonl` exists. Two independently gated blocks: **status-sync** (when an in_progress entry exists) and **discovery** (only when `discoverySuggestions` is true; runs `check-duplicate` first — a `rejected` match → skip silently, any other status → skip or mention the existing id). Failure detection: parses a hush-wrapped exit code from tool_response text (`[[hush:exit=` / `N` / `]]` triplet, or `[hush: exit N]`) **before** trusting top-level `data.exit_code` (hooks run in parallel, so the raw hush marker is what foreman sees; and the real field is `data.exit_code` — `tool_response?.exit_code` was a 6-day-old bug fixed in 0.10.0). `freshlyDone` nudge dedupes once-per-entry-per-day via a tmpdir state file keyed `sha1(root)`, fail-open in both directions. Background-agent degradation is explicit: no user to ask → leave in_progress / skip discovery.
- `session-start.js`: emits one informational line when in_progress entries exist, flagging ≥3-day-stale ones with their `updated_at`. Never fires for subagents.

### 1.8 Public benchmark harness (`foreman/benchmarks/`)

Fixtures `moved-file` / `api-constraint` / `adjacent-mess`, four prompt arms each (`vibe`, `freeform`, `webtemplate`, `foreman`), runner + picks + selfcheck + trio arm (`settings-trio.json`, graceful degrade when hush/razor siblings absent, `HUSH_PLUGIN_DIR`/`RAZOR_PLUGIN_DIR` overrides). **The selfcheck pins the frozen foreman-arm prompts to `prompt-template.md`** — any template edit requires regenerating those frozen prompts and re-running `benchmarks/selfcheck.js` to green. Budget for this in every template-touching work item below. Benchmark numbers are never published without an explicit user go.

---

## 2. Harness ground truth — the Task family as it exists today

This is the knowledge dump. Everything foreman-relevant about the current Task-tool family, with provenance.

### 2.1 Hook events **[CONFIRMED-BINARY** vs 2.1.205, binary now 2.1.207**]**

~30 events, not the ~9 documented:

`SessionStart, Setup, UserPromptSubmit, UserPromptExpansion, PreToolUse, PermissionRequest, PermissionDenied, PostToolUse, PostToolUseFailure, PostToolBatch, Notification, MessageDisplay, SubagentStart, SubagentStop, TaskCreated, TaskCompleted, Stop, StopFailure, TeammateIdle, InstructionsLoaded, ConfigChange, CwdChanged, FileChanged, WorktreeCreate, WorktreeRemove, PreCompact, PostCompact, Elicitation, ElicitationResult, SessionEnd`

**Can BLOCK/REDIRECT:** UserPromptSubmit, UserPromptExpansion, PreToolUse (`permissionDecision` + `updatedInput`), PermissionRequest, PostToolUse (`decision:block` feeds stderr to Claude; `updatedToolOutput` replaces the result), PostToolBatch, SubagentStop, **TaskCreated / TaskCompleted**, Stop (`decision:"block"` + `reason` continues the turn), ConfigChange, PreCompact, WorktreeCreate, Elicitation.

**Hook input:** common = `session_id, transcript_path, cwd, permission_mode, hook_event_name`. Optional = `prompt_id`, `effort` (`{level: low|medium|high|xhigh|max}` — readable, the usable cost signal), `agent_id`, `agent_type`. **No `model` field** in per-tool input; no `$CLAUDE_MODEL` env (only SessionStart sees model, "not guaranteed"). Stop input carries `last_assistant_message`, `turn_summary`, `stop_hook_active` (true when already continuing from a Stop hook — the loop-prevention pattern M1 must imitate).

**Hook output:** universal = `continue` (false halts), `stopReason`, `suppressOutput`, `systemMessage`, `terminalSequence`. Top-level `decision:"block"` + `reason` on Stop/SubagentStop/PostToolUse/PostToolBatch/PostToolUseFailure/UserPromptSubmit/ConfigChange/PreCompact — **and per the binary, on TaskCreated/TaskCompleted**. **[PROBED 2026-07-14, P2, headless CLI 2.1.210]** TaskCompleted accepts the same top-level `{"decision":"block","reason":"..."}` shape as Stop/SubagentStop — no separate hookSpecificOutput envelope needed. Observable effect: the block does not silently no-op — it surfaces as the *TaskUpdate tool call's own result*, not a system-reminder: `toolUseResult: {success:false, taskId:"1", updatedFields:[], error:"TaskCompleted hook feedback:\nprobe-block: close the roadmap entry first"}`. The task's status genuinely does not change (`updatedFields:[]`) — this is a real block, not cosmetic. `hookSpecificOutput.additionalContext` (≤~10k chars, delivered wrapped in a `<system-reminder>`) is confirmed on SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/Stop/SubagentStop; **TaskCompleted does NOT deliver it** — a run emitting only `hookSpecificOutput.additionalContext` (no top-level decision) produced a normal successful TaskUpdate (`success:true, updatedFields:["status"], statusChange:{from:"pending",to:"completed"}`) with zero trace of the injected context anywhere in the transcript (no system-reminder attachment, no tool-result mention, model never referenced it). M1's `nudge` mode cannot rely on `additionalContext` on this event — see M1 below.

**Transcript `.jsonl` format is officially unstable** ("may break on any release") — any hand-parsing needs fail-safe fallbacks.

### 2.2 TaskCreated / TaskCompleted input **[PROBED** 2026-07-10, headless**]**

Common fields + `task_id`, `task_subject`, `task_description` (field names verbatim). TaskCompleted has the identical shape — reconfirmed 2026-07-14 by P2's baseline run (verbatim: `{"session_id":"...","transcript_path":"...","cwd":"...","prompt_id":"...","hook_event_name":"TaskCompleted","task_id":"1","task_subject":"probe","task_description":"probe-run-A"}`), unchanged across the 2.1.207→2.1.210 binary drift. Undocumented in hooks.md — could drift on any binary update (hence hardening item H3). Probe method in §6.

### 2.3 Task tools (harness task list) **[CONFIRMED-LIVE]**

`TaskCreate, TaskGet, TaskList, TaskOutput, TaskStop, TaskUpdate` exist as **deferred tools** — their schemas are not loaded by default; a session loads them via `ToolSearch` (`select:TaskCreate,...`). The harness itself nudges their use via system reminders ("consider using TaskCreate to add new tasks and TaskUpdate to update task status — set to in_progress when starting, completed when done"), which confirms the status vocabulary the hooks see. The paired `content` + `activeForm` shape on TaskCreate matches the current schema family. Exact current TaskCreate parameter schema: **[NEEDS-PROBE — one ToolSearch call in any session]**.

### 2.4 The Agent tool **[CONFIRMED-LIVE]**

- **`run_in_background` now DEFAULTS to `true`.** Subagents run in the background, and the main loop is re-invoked with a notification when one completes. Pass `run_in_background: false` explicitly for a synchronous run. Implication: foreman's "background Agent" destination is now the tool's default posture; any wording that implies background is exotic is stale.
- `SendMessage` (deferred tool) continues a previously spawned agent **by ID or name, with its context intact**; a new `Agent` call always starts fresh. This is the mechanism behind M2.
- `isolation: "worktree"` gives the agent its own git worktree (auto-cleaned if unchanged). `isolation: "remote"` is new — remote cloud environment, always background, availability-gated.
- `model` override enum: `sonnet | opus | haiku | fable`.
- The agent's final message is returned as the tool result and is **not shown to the user** — the dispatcher must relay what matters.
- Agent types resolve from `.claude/agents/*.md` frontmatter (fields include `name`, `model`, `effort`, `tools`) or SDK-registered agents.

### 2.5 The Workflow tool **[CONFIRMED-LIVE]** (foreman-relevant subset)

- Deterministic multi-agent orchestration scripts: `agent(prompt, opts)`, `pipeline(items, ...stages)` (no barrier between stages), `parallel(thunks)` (barrier), `phase(title)`, `log(msg)`, `args`, `budget`, nested `workflow()` (one level).
- `agent()` opts: `{label, phase, schema, model, effort, isolation: 'worktree', agentType}`. **With `schema` (a JSON Schema), the subagent is forced through a StructuredOutput tool and `agent()` returns the validated object — the tool layer retries on mismatch.** This is what M3 targets: machine-checkable handoffs.
- `budget = {total: number|null, spent(), remaining()}` wired to user "+500k"-style directives; **once `spent()` reaches `total`, further `agent()` calls THROW** (hard ceiling, shared pool across main loop + all workflows).
- Scripts are plain JS (not TS), run in an async context, have **no fs/Node API access**, and `Date.now()` / `Math.random()` / argless `new Date()` **throw** (resume determinism).
- Invocation modes: inline `script`, **`scriptPath`** (reads a script file from disk; every run persists its script under the session dir and returns the path), **`name`** (predefined workflows, "built-in or from `.claude/workflows/`"), plus `resumeFromRunId` (longest-unchanged-prefix caching, same-session only).
- **Opt-in doctrine**: Workflow may only be called when the user explicitly opted in. The sanctioned opt-ins include *"the user invoked a skill or slash command whose instructions tell you to call Workflow"* — so a user-invoked foreman skill that instructs a Workflow call is legitimate by the letter of the base prompt. "Would merely benefit" does not count. **Ultracode** sessions (keyword or session toggle, confirmed by system-reminder) are a standing opt-in where workflows become the default for substantive tasks.
- Subagents inside workflows are told their final text IS the return value (raw data, not prose). They can reach session-connected MCP tools via ToolSearch; interactively-authenticated MCP servers may be absent in headless/cron runs.
- Diagnostics: `<transcriptDir>/journal.jsonl` records each agent's actual return value.

### 2.6 AskUserQuestion **[CONFIRMED-LIVE]**

1–4 questions; each `{question, header (≤12 chars), multiSelect, options}` with 2–4 options of `{label (1–5 words), description, preview?}`. **`preview` renders when the option is focused** — mockups, snippets, comparisons. An "Other" free-text option is always auto-provided; never add one manually. Recommended convention: put the recommended option first and suffix its label "(Recommended)". The response can carry `annotations` (user notes / chosen preview) keyed by question text. The base prompt now instructs models to *reserve* this tool for genuinely user-owned decisions — foreman's gates (destination question, requireVerification confirm, defer-capture) all qualify.

### 2.7 The autonomy doctrine **[CONFIRMED-LIVE]** (constrains M6-style ideas)

The current baseline prompt tells autonomous sessions: asking "Want me to…?" blocks the work; proceed for reversible actions that follow from the original request; stop only for destructive actions or genuine scope changes; *"For actions that are hard to reverse or outward-facing, confirm first **unless durably authorized** or explicitly told to proceed."* Consequences: (a) foreman prompts handed to background/headless destinations must not embed questions the destination can't ask; the existing background-agent degradation rules (leave in_progress, skip discovery) are the right pattern and should be treated as the template for every future gate; (b) any unattended-execution feature needs *durable, explicit* pre-authorization semantics, never inference.

### 2.8 Scheduling / pacing surfaces **[CONFIRMED-LIVE]** (context for M6, parked)

`ScheduleWakeup` (dynamic loop pacing; delay clamped [60, 3600]s; prompt-cache TTL is 5 minutes — delays ≤270s stay cache-warm, 300s is the worst choice, idle default 1200–1800s; autonomous sentinel `<<autonomous-loop-dynamic>>`), `CronCreate/List/Delete` (sentinel `<<autonomous-loop>>`), `Monitor` (until-loop waiting; foreground `sleep` is blocked), `RemoteTrigger`, `PushNotification`. Statusline JSON carries `cost.total_cost_usd`, `context_window.used_percentage`, `effort.level`, `rate_limits`, and per-task `subagentStatusLine` (2.1.205+) — all zero-token.

### 2.9 Host-app-only MCP tools **[CONFIRMED-LIVE]**

`spawn_task` / `dismiss_task` (background-task suggestion chips; `cwd` targeting; ids not persisted across app restarts), `mark_chapter` (transcript table of contents). These exist only in desktop-app sessions, not headless CLI. Relevant only to §7's spawn_task note.

---

## 3. Weakness registry (current defects and fragilities, ranked)

| # | Where | What | Severity |
|---|---|---|---|
| W1 | close-the-loop gap | The **open** transition is mechanized (task-created.js); the **close** is prose-only. A real session closed entry 384 `done` with uncommitted code before the 0.16.2 prose rule; prose can still be ignored. | High → fixed by M1 |
| W2 | `task-created.js` ENTRY_MARKER_RE | Requires the exact backticked phrase inside `task_description`. TaskCreate descriptions are model-authored; a paraphrase (no backticks, "entry 42") silently drops mechanization to the prose fallback. | Medium → H1 |
| W3 | TaskCreated/TaskCompleted schema | Empirically derived, officially undocumented; a binary update can drift it and the hook degrades silently (by design, but invisibly). | Medium → H3 |
| W4 | `session-start.js` matcher | `^(startup\|clear)$` means **resumed** sessions never see the stale-in_progress flag — arguably the session most likely to be returning to dangled work. | Low-Medium → H2 |
| W5 | Cross-plugin | **RESOLVED 2026-07-14 by P3** — SubagentStart, PreToolUse, and PostToolUse all fire inside Workflow-spawned agents, in both the plain and `isolation:'worktree'` variants; see §6 P3 row for the verbatim evidence. | Resolved → P3 |

---

## 4. Work items

### M1 — `hooks/task-completed.js`: the roadmap close-gate (FLAGSHIP) — BUILT 2026-07-14

**Built as designed below**, ROADMAP.jsonl entry 026, LOCAL-ONLY (uncommitted, per standing hold). `hooks/task-completed.js` mirrors `task-created.js` exactly per this section's design: imports `ENTRY_MARKER_RE`/`entryIdFromDescription`, gates `planned`/`in_progress` entries, resolves `taskCloseGate` from `.foreman/config.json` (`off|nudge|block`, default `nudge`), and latches once-per-`task_id` via a `sha1(root)`-keyed tmpdir state file mirroring post-commit.js's `freshlyDone` dedupe (fail-open both directions). No contingency needed resolving — P2 had already answered nudge-mode before this build started: `systemMessage` carries the nudge (confirmed `additionalContext` isn't delivered on this event), and `block` mode's reason text states the automated-checkpoint provenance plus an explicit "close it, then complete the task again" instruction sequence, worded to survive the P2 haiku driver's observed tendency to paraphrase a block into a false "success" claim. 23 new tests in `foreman/tests/task_completed.test.js` (152 → 175, all green). README Settings table and `roadmap-schema.md`'s hook inventory both updated; CHANGELOG carries one effect-only line. No discrepancy found versus this brief's recorded design — it built exactly as specified.

**Rationale.** TaskCompleted is hookable and blockable [CONFIRMED-BINARY], carries `task_description` [PROBED], and the marker regex already exists. This mechanizes the 0.16.2 close rule exactly the way task-created.js mechanized the open rule: enforcement moves into the system, prose stays as fallback. It is the missing half of foreman's roadmap-integrity symmetry. Trio-checked 2026-07-14 against both siblings' `hooks.json` on disk: neither hush nor razor registers TaskCreated/TaskCompleted — the event is uncontended (§5).

**Depends on:** probe P2 — **ANSWERED 2026-07-14** (blockability output shape: top-level `{"decision":"block","reason":"..."}`, identical to Stop/SubagentStop; additionalContext: NOT delivered on this event; post-block retry: none, one hook firing per task_id, no harness-side loop). M1 is now unblocked to build.

**Design.**
- New file `foreman/hooks/task-completed.js`, registered in `hooks.json` under `TaskCompleted` with the standard command/commandWindows/timeout-5 shape (copy the TaskCreated entry).
- Reuse the marker: `const { ENTRY_MARKER_RE, entryIdFromDescription } = require("./task-created");` (already exported). If H1 lands first, the widened regex propagates automatically.
- Flow (mirror task-created.js structure, including the top-level try/catch → exit 0):
  1. Read stdin JSON fail-safe. Event guard on `hook_event_name !== "TaskCompleted"`.
  2. Extract entry id from `task_description`. No marker → silent exit.
  3. Resolve root (`CLAUDE_PROJECT_DIR || data.cwd || process.cwd()`), require `ROADMAP.jsonl` on disk, `readEntries` fail-open.
  4. Entry missing → silent. Entry `done | dropped | rejected | deferred` → silent (already closed/parked). Entry `in_progress` **or `planned`** (planned means the open marker never fired but the work still wasn't closed) → gate.
- **Gate modes**, resolved from a new `.foreman/config.json` key `taskCloseGate: "off" | "nudge" | "block"`, default `"nudge"`:
  - `off` → silent exit always.
  - `nudge` → **P2 confirmed `additionalContext` is NOT delivered on TaskCompleted** (unlike Stop/SubagentStop/PostToolUse) — use `systemMessage` instead (universal field, part of every hook's output contract per §2.1): *"Roadmap entry N is still in_progress. Close it before finishing: `node <plugin>/scripts/roadmap.js update-status` with status `done` plus the commit sha — or `annotate` findings for an investigation-only close."*
  - `block` → stdout JSON `{"decision":"block","reason":"..."}` — **P2-confirmed shape**, identical to Stop/SubagentStop. This is a real block: the TaskUpdate tool call itself returns `success:false, updatedFields:[]` with `error` set to `"TaskCompleted hook feedback:\n<reason>"` — the task genuinely stays incomplete, and the reason text reaches the model as that tool call's own error (not a system-reminder). The reason MUST carry provenance per the razor lesson: state that this is **foreman's automated roadmap checkpoint, not the user declining**, and that completing again after closing the entry is the correct next action — the live base prompt teaches "a denied call means the user declined it — adjust, don't retry verbatim," which would otherwise make the model abandon the completion. Note the P2 haiku driver's own final-message prose *mischaracterized* a blocked completion as successful even though the raw tool result showed `success:false` — the reason text must be unambiguous enough that the model acts on it (retries the close) rather than just paraphrasing it away in the reply.
- **Loop guard**: TaskCompleted has no documented `stop_hook_active` equivalent, and **P2 found no harness-side retry** — a block produced exactly one TaskCompleted firing per task_id (verified via hook-log counts across all three probe runs; the harness does not automatically re-invoke TaskUpdate after a block, it's a single failed tool call the model may or may not retry on its own). Still implement a per-`task_id` once-only latch in a tmpdir state file keyed `sha1(root)` (same pattern as post-commit's freshlyDone dedupe, fail-open both directions): the first gate on a given task_id may block/nudge; a second TaskCompleted for the same task_id passes silently. This is now defense-in-depth against a model that retries the same `TaskUpdate` call repeatedly (P2 didn't test a model instructed to retry), not a mitigation for a harness-level loop that P2 showed doesn't exist.
- **Ship dormant-ish**: default `nudge` is already safe; do NOT default to `block`. Optionally start observe-only (logging first, no nudge/block) if the user prefers — ask at PR time, don't decide unilaterally.
- Do **not** add an init question for `taskCloseGate` (init's question set is deliberately curated; 0.4.7's rule-file drafting was reverted for adding synthesized content). Document the key in the README **Settings** table only (that section exists since 0.16.1).

**Files:** `hooks/task-completed.js` (new), `hooks/hooks.json`, `tests/task_completed.test.js` (new), `README.md` Settings row, `CHANGELOG.md` (one terse "Added" line, effect-only), `roadmap-schema.md` write-exception paragraph (it currently documents task-created.js as "the one hook that writes" — M1 doesn't write, it gates; still update the hook inventory prose if the schema doc lists hooks).
**Tests (~12):** marker parse via shared regex; status matrix (planned→gate, in_progress→gate, done/dropped/rejected/deferred→silent, missing entry→silent, no marker→silent, no ROADMAP.jsonl→silent); corrupt file fail-open; config resolution (off/nudge/block/absent→nudge); latch behavior (second completion same task_id passes); block JSON shape; never-throws (feed garbage stdin).
**Acceptance:** armed `block` mode blocks exactly once per task with a provenance-bearing reason; every other path is a silent exit 0; suite green; manifest-curator clean.

### M2 — Record the dispatched agent id; resume via SendMessage — BUILT 2026-07-14

**Built as designed below**, ROADMAP.jsonl entry 027, LOCAL-ONLY (uncommitted, per standing hold). `skills/roadmap/SKILL.md` gained: (1) the background-Agent delivery bullet now captures the `agentId` trailer off the `Agent` tool result and runs one `roadmap.js annotate` call with the exact marker phrase (`background agent` + backticked id + date) immediately after dispatch; (2) a new pre-Q2 section ("Resume via the original agent, before Q2") — when a picked resume entry's notes carry that marker, it pulls the id and calls `SendMessage` with a short re-brief before asking Q2 or crafting anything; success ends the flow there, any failure (`success:false` or tool unavailable) falls silently through to the unchanged Q2 → step-3 Resume-variant path; (3) `allowed-tools` frontmatter gained `SendMessage`. The optional `session-start.js` enrichment from the original design was **skipped** — the hook stays untouched, the skill-side marker alone satisfies the acceptance criteria. `roadmap.js` was not touched; its existing `annotate` subcommand is the mechanism the new step calls. CHANGELOG got one effect-only `[Unreleased]` line. Full 175-test suite green (no test covers SKILL.md prose — run to confirm nothing else broke). No discrepancy found versus this section's recorded design; it built exactly as specified.

**Original design (unmodified, kept for reference):**

**Rationale.** 0.20.0's resume-first flow re-crafts a prompt from entry notes — a lossy reconstruction. The harness now supports continuing the original background agent with context intact (`SendMessage` by agent id/name [CONFIRMED-LIVE]). Foreman just has to remember the id.

**Depends on:** probe P5 — **ANSWERED 2026-07-14** (id format: literal `a` + 16 hex chars, 17 total; SendMessage-to-completed-agent succeeds and resumes in background — see §6 P5 row for the verbatim evidence). M2 is now unblocked to build.

**Design (prose-only, no JS changes).**
- `roadmap/SKILL.md`, background-Agent destination step: immediately after dispatch, run one `roadmap.js annotate` call with `{id, notes: "dispatched to background agent \`<agent-id>\` (<date>)"}`. Define the marker grammar in the skill: the phrase `background agent \`<id>\`` with the id backticked, so the resume flow can parse it tolerantly. **P5-confirmed**: the id's own charset (`a` + lowercase hex) needs no escaping inside that marker — no backticks/quotes/whitespace ever appear in the id itself.
- Resume flow (the finish-first check in pick-next): when a stale/resumable in_progress entry's notes contain the marker, Q1's resume option becomes two-tier — "(Recommended) Continue the original agent" → `SendMessage` with a short re-brief ("status?", plus any new user context), falling back to the existing re-craft path **silently** when SendMessage errors (agent gone, tool unavailable). Never surface the failure mechanics; the fallback is the previous behavior. **P5 correction to this paragraph's original premise**: SendMessage to an agent that finished normally is NOT an error case — it returns `success:true` and resumes the agent from its saved transcript as a new background task, i.e. the "continue the original agent" option genuinely works post-completion, not just pre-completion. The silent-fallback path is only exercised by a real `success:false` (verbatim shape: `{"success":false,"message":"Agent \"<id>\" could not be resumed: No transcript found for agent ID: <id>"}`) — which P5 observed for a never-existed id and treats identically to "gone after restart" or "wrong id"; the caller cannot and needn't distinguish those causes, so the single fallback branch on falsy/error result still covers all of them.
- `session-start.js` (optional, small JS): when flagging a stale in_progress entry whose notes contain the marker, append "(was dispatched to a background agent)" to the informational line. This is a nice-to-have; skip if it grows the hook.
**Files:** `skills/roadmap/SKILL.md`; optionally `hooks/session-start.js` + its test.
**Acceptance:** a background-Agent handoff leaves an annotate trail; a resume on such an entry offers SendMessage first; SendMessage failure degrades invisibly to re-craft.
**Risk note — after-restart case FIELD-ANSWERED 2026-07-14** (real usage in rathena-webstorm-support, entry 411): SendMessage from a NEW session to an agent spawned by an earlier (closed) session fails cleanly with "No transcript found for agent ID: <id>" — even though the transcript file verifiably persists on disk under the dispatching session's `<project>/<session-id>/subagents/agent-<id>.jsonl`. Agent-id lookup is scoped to the current session's own registry; continuation does not cross session boundaries. M2's fallback engaged exactly as designed (one failed tool call, then re-craft/reason path). Consequence for builders: the SendMessage tier only ever pays off for same-session resumes (P5 proved those work even post-completion); cross-session resumes always take the fallback — acceptable by design, cost is one tool call. Do not "fix" this with session tracking in the marker (YAGNI: the failure is the detection).

### M3 — `craft-prompt` output flavor: "Workflow stage" (prompt + JSON Schema pair) — BUILT 2026-07-14

**Built as designed below**, ROADMAP.jsonl entry 028, LOCAL-ONLY (uncommitted, per standing hold). `skills/craft-prompt/SKILL.md`'s Call 1 Q2 gained the `Workflow stage` option (mutually exclusive with `Custom output format`, noted inline), Call 4-N gained its one detail question ("what should come back"), and the Assemble mapping gained one field-source line pointing at the template for the actual mechanics. `prompt-template.md` gained the flavor as a conditional section: the `<tone>` bracket-instruction now also drops tone unconditionally for this flavor (background-Agent carve-out does not apply), and a new `[WORKFLOW-STAGE FLAVOR ...]` block right after `</output_format>` carries the fixed enforcement sentence, the schema-authoring rules, and the delivery note verbatim from this section's design, plus one new checklist row. `render-sections.js` and `roadmap/SKILL.md` were not touched (schema is not a config section). Selfcheck outcome: **no frozen-prompt regeneration was needed** — `benchmarks/selfcheck.js` only pins the `<truth_grounding>` block (whitespace-normalized) plus a handful of required-string/testCommand checks, none of which the new conditional section touches; `<truth_grounding>` itself was left byte-identical, so `node benchmarks/selfcheck.js` passed green on the first run with the template edit already in place (3/3 fixtures PASS). Full 175-test suite green. CHANGELOG got one effect-only `[Unreleased]` line; README was checked and does not enumerate craft-prompt's output-format flavors (its one output_format mention is the `omitSections` config table), so no README change per the task's own rule. No discrepancy found versus this section's recorded design — it built exactly as specified.

**Original design (unmodified, kept for reference):**

**Rationale.** The Workflow `schema` option makes the return contract mechanically enforced with retry [CONFIRMED-LIVE]. Foreman currently crafts prose `<output_format>` blocks; a schema flavor turns a foreman handoff into a drop-in `agent(prompt, {schema})` stage — foreman becomes the briefing layer for anyone authoring workflows (including ultracode sessions).

**Design.**
- `craft-prompt/SKILL.md`: the output-format question gains one option, "Workflow stage — prompt plus a JSON Schema the tool layer enforces". When chosen:
  - The assembled prompt keeps all fixed blocks unchanged, but `<output_format>` is replaced by a single fixed sentence: *"Your return value is enforced by the attached schema; your final text is the return value, not a human-facing message."* (Aligns with what the Workflow runtime itself tells subagents.) Side benefit: zero XML-echo risk on this path, so the hush-register concern is moot here.
  - **The `<tone>` block is omitted mechanically for this flavor** (flavor-forced, independent of `omitSections`): a schema-forced stage's deliverable is the validated object — there is no prose surface for voice to govern, so tone text is pure token tax. The 0.18.0 destination-aware carve-out (tone stays in for background `Agent` destinations) explicitly does NOT extend to this destination. Grounded 2026-07-14: hush's `subagent-brief.js` confirms output styles never reach subagents and its own injection governs final-message shape only — and a schema stage's final text isn't even the deliverable. Guardrail blocks (`truth_grounding`, `scope_discipline`) stay in as always.
  - A second artifact is assembled alongside: a fenced `json` JSON Schema derived from the user's answer to "what should come back". Schema authoring rules to embed in the skill (a weaker model needs these spelled out): object root with `required`; a `description` on every property (descriptions double as instructions to the StructuredOutput layer); enums for verdict-like fields; for evidence-bearing claims use the cited-pair shape `{cite: "file:line or doc URL", note: string}`; keep schemas small — every validation retry costs a full subagent turn.
  - Delivery: both artifacts go to the chosen destination together (clipboard temp file contains prompt then schema; TaskCreate description carries both). The never-print-into-chat rule applies to both.
- `prompt-template.md`: add the flavor as a conditional section + one checklist row. `render-sections.js` untouched (the schema is not a config section).
- **Benchmark selfcheck**: template bytes change ⇒ regenerate the frozen foreman-arm prompts in `benchmarks/` and re-run `selfcheck.js` (§1.8). Budget this into the task.
**Files:** `skills/craft-prompt/SKILL.md`, `prompt-template.md`, `benchmarks/` frozen prompts + selfcheck, README (one Settings-adjacent sentence at most), CHANGELOG.
**Acceptance:** choosing the flavor yields prompt + schema with the fixed enforcement sentence; all other flavors byte-identical to before; selfcheck green; 148+ tests green.

### M4 — `foreman:sprint` — batch-execute unblocked tasks — **DESIGN COMPLETE 2026-07-16, PARKED pending explicit user approval to build (new pillar)**

**DEAD 2026-08-01.** Entries 038, 145 and 148 were all dropped at the 1.0 close: batch and parallel execution are on SCOPE.md's never-list and skills/sprint/ was deleted. This section is historical; it is not a design awaiting approval. Reviving it needs a new owner decision, not this brief.

**Status.** Design-on-paper only, per this entry's own constraint — nothing built, no skill/hook/script exists, no file under `foreman/` touched producing this design. ROADMAP.jsonl entry 038 tracks the work; this section is written so a future build session can implement from it without re-deriving the reasoning below. It is a design to approve, not a build to review.

**Premise correction.** Entry 038's own text names merging N worktrees back as the unsolved hard part. It isn't: an established worktree merge-back pattern already answers it — `git merge --no-ff <unit-branch>` per worktree, one commit per unit, re-verify every done-when criterion against the **merged** tree (not each unit's own isolated tree — passing alone proves nothing about composing), STOP on a blocked unit. What's actually unsolved is (a) whether that pattern's whole-batch STOP transfers when the units share no contract, (b) whether `touches` is trustworthy enough to schedule parallel dispatch on, and (c) whether implement→verify→close is safe with no review stage. All three are answered below, and (b)+(c) narrow the pillar from what this entry originally sketched.

**1. Merge-back — what transfers from the prior pattern, what doesn't.**

Transfers unchanged:
- `git merge --no-ff <unit-branch>` per worktree-isolated implementer, one commit per unit (the "commit once" rule carries over verbatim to sprint's own dispatched implementers). **[PROBED 2026-07-16]** N-way simultaneous worktree isolation holds: a 3-agent `parallel()` Workflow (haiku/low-effort, `isolation:'worktree'` on every thunk, deliberately read-only git-identity commands so each worktree stayed unchanged) returned 3 distinct worktrees + 3 distinct branches off 1 shared repo, no collision, creation genuinely concurrent and interleaved (agents 1-2 each saw only worktrees 1-2 mid-run while agent 3 saw all three). Naming scheme a build session needs: worktree path `<repo>/.claude/worktrees/<runId>-<n>`, branch `worktree-<runId>-<n>` — e.g. `D:/Projects/.../claude-plugins/.claude/worktrees/wf_e8594cb5-65e-1` / `worktree-wf_e8594cb5-65e-1`. All three shared `gitCommonDir` = `<repo>/.git` and started at the same HEAD sha; `git worktree list` marks live ones `locked`; unchanged worktrees really do auto-remove after the run (`git worktree list` back to just `main`, `.claude/worktrees/` gone entirely — it sits inside the repo, gitignored via `**/.claude/*`). **Consequence: the parallel-subset path in §6 is alive, not dead** — probes 2 and 3 below stay open, but they gate cheap-resume and diagnosability, not this path's existence.
- Re-verify against the **merged** tree, not each unit's isolated tree — this matters *more* for sprint than for a single-feature batch. A single feature's units share one integration contract written by a single plan author, so cross-unit interaction was at least anticipated. Sprint's units are N roadmap entries with zero contract between them; nobody has read them against each other. A green test suite inside one worktree proves nothing about whether it stays green once merged with a sibling's changes. Concretely: run the project's real verification command (here: `node --test foreman/tests/*.test.js`) against the merged tree as each entry lands, not per-worktree self-reports.
- Merge order: absent an explicit graph, a fallback would be plan-authored clause ordering. Sprint already has one (`depends_on`) — but every batch candidate is by construction already unblocked (`next-candidates` only returns entries whose `depends_on` are all `done`), so no two same-batch candidates can depend on each other; intra-batch order is arbitrary for correctness. Use the ranking `next-candidates` already computes (`unblocks` then `created_at`) anyway, for reproducibility.

Rejected: "any blocked unit STOPS the whole batch, refuse to merge incomplete work." That policy fits disjoint slices of *one* feature — a blocked unit really does leave the others half-built, so refusing to merge protects something real. Sprint's units are N *unrelated* roadmap entries; entry #12 blocking has no bearing on whether entry #7 — finished, verified against the merged tree — is safe to land. A full-batch STOP over one bad entry discards N−1 pieces of already-verified work for a safety property that isn't at stake. **Sprint gates per-entry, not per-batch**: a blocked/failed/conflicted entry is set aside (left `in_progress`, `annotate`d with the blocker, surfaced in the final report) without holding up any sibling's merge or close.

What a conflict is *evidence of*, with no contract to read either side against: a single-feature batch can treat a conflict as a **planning gap** — two units' Files-touched sets should have been disjoint by the plan's own design and weren't — with its plan author standing to arbitrate by contract clause. Sprint's entries were authored independently, often on different days, by whoever filed the roadmap item; nobody ever compared `touches` lists. A conflict here is evidence the *pre-dispatch disjointness screen was wrong* (§2), not evidence about which side is more "correct" — there's no shared intent to adjudicate against. **Who resolves it, with what authority**: not the orchestrating session (no domain standing over either entry's intent) and never a spawned agent (single-writer invariant, no standing either) — surface both diffs to the user and let them pick, merge by hand, or send one entry back to `planned` with the conflict in its notes for a future serial run. Same "stop and ask, don't guess" instinct, scoped to the colliding pair only.

**1a. Two findings the same probe surfaced, addressed here since both bear on merge-back.**

*A worktree starts from committed HEAD and cannot see uncommitted work — not the user's, not a sibling unit's.* Every probed agent reported `headSha` = the parent repo's committed HEAD, while this very session's working tree carries 8 uncommitted modified files under `foreman/`. Not hypothetical for this project: the standing practice here is to hold everything local-only/uncommitted until explicit user approval (every entry read this session — 052, 053, 038 itself — closes that way), so a dirty tree is the norm, not the exception, for this repo. **Decision: the parallel-subset path requires a clean working tree as a hard precondition, checked automatically before the dispatch-plan is presented** (`git status --short` empty at the project root) — not a warning, not a user override, since a worktree-isolated unit dispatched against a stale tree risks redoing, missing, or silently conflicting with work the user can already see uncommitted in their own tree. A dirty tree doesn't block sprint itself — this run's dispatch plan simply contains no worktree-parallel subset, every candidate routes through serial-in-current-tree dispatch instead (no separate worktree, so it sees the same uncommitted state the user does), stated as one line in the plan ("working tree has uncommitted changes; running serial this time"). **Plainly: in a project that holds work uncommitted as a matter of practice — this one — sprint's worktree-parallel path will rarely if ever fire; serial-in-current-tree is what actually runs here**, reinforcing §6's scope-narrowing conclusion rather than adding a new caveat to it.

*Which sha does `update-status` record — the unit's own pre-merge commit, or the post-merge one?* The unit's own commit, from its worktree, exactly as returned in its schema payload's `commit_sha` field — never a synthetic merge-commit sha. `git merge --no-ff` makes the unit's own commit an ancestor of the merge commit, so it stays reachable and `git cat-file -e <sha>` (the same check `foreman:survey` already runs) keeps passing after merge — recording it costs nothing in traceability and is knowable the moment verification passes, without waiting on the merge itself. Waiting for a post-merge sha would mean deferring §4's "record the work now" step until the whole batch's merge sequence resolves, undoing the point of recording promptly. Sequencing this implies for this section's own pipeline: **`update-status` is only called for an entry once that entry's specific merge lands cleanly AND its re-verification against the merged tree passes** — never before, and never for an entry set aside as blocked/conflicted (those get `annotate`-only, no `commit` field, exactly as `annotate`'s own `{id, notes}` shape already forces per §4). One exception: if a conflict needed a human's hand-resolution, the resolution itself is a new commit that's now what actually shipped — record that sha instead of (or in addition to) the original unit commit, since the unit's own commit alone no longer fully represents the landed diff once a human has touched it further.

**2. The `touches` problem — accept the risk, don't add a survey gate.**

`touches` is user-authored, never verified (do-not-do #4), and was wrong on 5 of the 8 files entry 052 actually changed the one time this was measured (`foreman/scripts/render-sections.js`, `foreman/prompt-template.md`, `foreman/tests/render_sections.test.js`, `foreman/CHANGELOG.md`, `foreman/README.md` — none were in its declared `touches`; verified directly against ROADMAP.jsonl entry 052 and `git status` inside the `foreman/` submodule this session). `foreman:survey` exists to ground exactly this, but 0.4.4 already proved running it at pick time burns ~100k tokens — and sprint dispatching N candidates at once makes that N times worse, not once.

Decision: **don't add a mandatory survey pass.** Treat `touches`-based disjointness as a cheap first-pass heuristic only — reuse `next-candidates`' existing `collision` set-intersection logic, extended client-side by the dispatching skill to check pairwise overlap *among the batch's own candidates* too (that pairwise check doesn't exist in `roadmap.js` today; no new subcommand needed, it's the same set operation over touches arrays the skill already has in hand) — and let §1's merge-time re-verification against the real test suite be the actual safety net. The blast radius is bounded by git itself: a genuine content collision always surfaces as a merge conflict, never silent data loss, *except* when two edits land in non-overlapping line ranges of the same file and git's 3-way merge auto-resolves them "cleanly" into something semantically broken that neither entry's own tests were written to catch. That residual case is exactly why merge-time re-verification against the merged tree (§1, retained from the prior pattern, not optional) carries the real weight here — not `touches` accuracy.

**3. `CHANGELOG.md` — never let a worktree touch it.**

Guaranteed collision on every batch with ≥2 user-visible-shipping entries — confirmed by entries 052 and 053 both editing it, and structurally guaranteed by the public-docs rule steering every skill toward it. Solved the same way `ROADMAP.jsonl` itself is already protected: **no dispatched implementer edits `CHANGELOG.md` inside its worktree at all.** Each work unit's schema-validated return (§5) carries its own terse effect-only line instead of the file edit; the orchestrating session — the same single writer already making the `roadmap.js` calls — appends all confirmed entries' lines to `CHANGELOG.md` itself, once, after merges land. Same single-writer-owns-the-shared-ledger pattern already forced onto `ROADMAP.jsonl` (`guard-roadmap-edit.js`), applied to the one other file with the same shape. Ceiling: any other shared append-only ledger a consuming project adds later gets the same treatment; anything else that collides resolves like any other real content conflict (§1) — sprint does not invent a smarter text-merge algorithm.

**4. `requireVerification` interplay — corrected against actual `annotate` semantics.**

Entry 038's own text presupposes "pending-confirmation annotate." Checked against `roadmap.js` source this session and it doesn't fit: `cmdAnnotate` takes only `{id, notes}` — no `commit` field, so it cannot record the sha the "record the work now, don't close it yet" step needs. `update-status`, not `annotate`, is the actual mechanism, and it already does exactly this — `post-commit.js`'s existing `requireVerification` branch (`foreman/hooks/post-commit.js:142-171`) is the live precedent, including its own explicit fallback for a background agent with no user to ask: *"leave it in_progress too — the user confirms later."* Exact call shape per finished work unit, mirroring that precedent:
- `requireVerification` off: one call — `echo '{"id":"<id>","status":"done","commit":"<sha>","notes":"<verification summary>"}' | node roadmap.js update-status`.
- `requireVerification` on: two steps — record now (`echo '{"id":"<id>","status":"in_progress","commit":"<sha>","notes":"<verification summary>"}' | node roadmap.js update-status`, a same-status update `cmdUpdateStatus` has no guard against, and which doubles as a free after-the-fact `touches` correction via the commit's real diff — the only place in this whole design `touches` gets fixed rather than merely tolerated), then batch every such entry into **one** end-of-run `AskUserQuestion` (never one per entry — that reintroduces the N-round-trip cost sprint exists to remove), then `echo '{"id":"<id>","status":"done"}' | node roadmap.js update-status` per confirmed id only.

§6 below overrides the "off" branch for sprint specifically: sprint applies the two-step/confirm path universally, regardless of the project's `requireVerification` setting.

**5. What sprint returns, and how it folds back.**

Per work unit, the dispatched implementer's return is schema-forced via M3's Workflow-stage flavor (already built 2026-07-14):

```json
{
  "entry_id": "string",
  "outcome": "done | blocked | failed_verification | conflict",
  "commit_sha": "string | null",
  "notes": "string",
  "changelog_line": "string | null"
}
```

The fold-back is **not** a Workflow pipeline stage — it cannot be. Workflow scripts have no fs/Node API access [CONFIRMED-LIVE, §2.5], so a `pipeline()`/`parallel()` script body cannot shell out to `roadmap.js`; and even if it could, the single-writer invariant already forbids a spawned agent from writing the roadmap at all. So: the Workflow's `parallel(thunks)` (each thunk an `agent()` call, `isolation:'worktree'`, `schema` set to the object above) does the actual parallel dispatch + hard-enforced return — that's Workflow's genuine value here. Once the Workflow call returns its array of validated objects to the **calling skill's own session** (outside the Workflow), that session — which has Bash/fs — does everything requiring the single writer: merges (§1), the `roadmap.js` calls per outcome (§4 for `done`; `annotate`-only + leave `in_progress` for `blocked`/`failed_verification`/`conflict`, surfaced in the report, never auto-reset to `planned`), and the one `CHANGELOG.md` append (§3).

**6. Scope — narrower than this entry imagined, and why.**

Two pieces of evidence from the only real pilot (entries 052/053, run 2026-07-16) push the scope down:

- **Parallel worktrees may rarely fire in this repo.** All three entries dispatched that day (038, 052, 053) declared or actually touched `foreman/skills/` — every one collided and serialized regardless of what any `touches` field claimed (verified against ROADMAP.jsonl this session). A pillar whose headline feature is wall-clock parallelism is speculative here; what sprint reliably buys, even when every candidate serializes, is removing the human's N round-trips of pick→approve→dispatch→confirm→close — that's the real value driver, not worktree fan-out.
- **Green tests didn't mean correct work, twice, on the only two real dispatches this design has evidence for.** A config key silently violated the project's camelCase convention, a README line narrated history against the public-docs rule, an `AskUserQuestion` option list made its own promised override unreachable, and a stated one-call invariant had split into two conditional call sites — all four passed 185/185 tests (all confirmed in entries 052/053's own notes this session). `implement → verify → close` with no human in the loop, run twice, would have shipped all four. Verification-gate coverage doesn't reach this gap either — a check-ran gate only proves *did a check run*, not *does this follow project convention*; none of the four defects are things an evidence-gate would catch.

Conclusion: **sprint v1 is narrower than this entry's sketch.** Concretely:
- Serial-by-default: dispatch one work unit at a time (still via `Agent`/`TaskCreate`, matching `roadmap/SKILL.md`'s existing Q2 destinations) unless the pre-dispatch pairwise `touches` check (§2) shows a subset with zero overlap against each other *and* against any live `in_progress` entry — only that subset gets `isolation:'worktree'` + the merge machinery in §1.
- Every entry closes through the **same single end-of-batch human confirmation** (§4's `AskUserQuestion`) regardless of the project's `requireVerification` setting — sprint forces that gate universally rather than only when the config flag is on, precisely because the pilot's four defects were caught by a human reading the diff, not by green tests. `requireVerification` being on changes nothing about *whether* this gate exists in sprint's flow; it only changes whether it was already going to happen anyway outside of sprint.
- `TaskCreate` pairing with the settled "standardize on TaskCreate" constraint: **not in tension, but not automatic either.** `TaskCreate` (harness task list, `task-created.js`/`task-completed.js`'s marker-parsed hooks) and `Agent`/`Workflow` dispatch (execution, `SubagentStart`/`SubagentStop`, `SendMessage`-based resume) are independent tracking layers that a prior batch-orchestration design already ran simultaneously per work unit (`TaskCreate` before the parallel `Agent` calls, `SendMessage` to resume a blocked implementer). Sprint copies that pairing exactly: `TaskCreate` per work unit (paired `content`/`activeForm`) for user-visible tracking and so `task-completed.js`'s close-gate applies once the matching `TaskUpdate(completed)` lands; `Agent`/Workflow `agent()` for the real dispatch. One thing does *not* come for free: M2's "annotate the dispatched agent id right after dispatch" marker is written by `roadmap/SKILL.md`'s single-task background-Agent code path — sprint's batch dispatch doesn't go through that path, so it must inline the identical per-unit annotate-the-agent-id step itself if it wants cheap `SendMessage`-based resume on a blocker (§1) instead of a full fresh re-dispatch.

**Files (once approved):** none touched this session — design only. A future build would add `skills/sprint/SKILL.md`, wiring into `craft-prompt`'s Workflow-stage schema flavor (M3, already built) for the per-unit return shape, plus README/CHANGELOG entries per the usual house rules. Nothing lands without a fresh, explicit, per-run user approval of the dispatch-plan gate described above.

**[NEEDS-PROBE] items — probe 1 (N-way worktree isolation) ran 2026-07-16, see §1, and passed; probes below remain unrun** (house rule: propose cost, wait for a go):
- Whether `SendMessage` can resume an agent dispatched from *inside* a Workflow's `agent()` call (not a bare top-level `Agent` tool call) — P5 only tested a bare `Agent` dispatch. If a Workflow-internal agent's id isn't externally addressable the same way, §1/§6's cheap-resume path for a blocked work unit doesn't apply inside a Workflow and falls back to fresh re-dispatch (still correct, just not the cheap path). Probe: 1-agent Workflow, capture whatever id the tool result/journal exposes, `SendMessage` to it after completion. Est. cost: one headless haiku run, pennies.
- Whether `agent()`'s `schema` retry-on-mismatch is visible to the orchestrator (a budget/log line) or fully silent — affects whether a schema-mismatched implementer return is diagnosable from outside. Probe: force one intentional schema mismatch in a Workflow `agent()` call, inspect `journal.jsonl`. Est. cost: one headless haiku run, pennies.

### M5 — AskUserQuestion `preview` in pick-next-task — BUILT 2026-07-14

**Built as designed below**, ROADMAP.jsonl entry 029, LOCAL-ONLY (uncommitted, per standing hold). `roadmap/SKILL.md`'s finish-first check and Q1 candidate options both gained a `preview` field: `title`, `why`, `what`, `depends_on`, `updated_at` as plain text capped at ~10 lines; resume options additionally get a `notes` excerpt (prior findings). The existing why-only description rule was left verbatim — the preview supplements it, never replaces it — and one sentence covers unsupported harnesses degrading harmlessly. No discrepancy found versus this section's recorded design; it built exactly as specified. CHANGELOG got one effect-only `[Unreleased]` line (precedent: 0.6.1-alpha and 0.18.0-alpha both logged pick-next-task UI changes at this granularity). Full 175-test suite green (no test covers SKILL.md prose; run to confirm nothing else broke).

**Rationale.** The live schema supports per-option `preview` rendered on focus [CONFIRMED-LIVE]. Q1's three candidates can carry a preview of the **entry** (title, why, what, depends_on, updated_at) so the user compares before choosing — with nothing printed into chat. This previews the entry, not the assembled prompt, so the never-print rule is untouched.
**Design:** prose-only in `roadmap/SKILL.md` — pick-next Q1 options gain `preview` built from entry fields (cap at ~10 lines; plain text). Resume options (0.20.0) get the same treatment with notes excerpted.
**Files:** `skills/roadmap/SKILL.md`, CHANGELOG. **Acceptance:** doc-consistency-reviewer clean; no behavior change besides richer options.
**Caveat:** `preview` support may vary across harness versions; since AskUserQuestion input is model-authored prose-driven, an unsupported field degrades harmlessly. No probe needed.

### M6 — Unattended roadmap routines (cron / ScheduleWakeup) — **PARKED**

Technically real today (§2.8): "every morning: pick next, execute, close" via CronCreate + the autonomous-loop sentinel. Collides with approval semantics (`requireVerification` with nobody to ask; destination questions with nobody to answer) and must be built on *durable explicit authorization* per §2.7. Prerequisites: M1 (mechanical close-gate), M4 (execution machinery). Park until both exist and the user asks.

### M7 — spawn_task — the deliberate cut stands

Retired for a real MCP-tools bug; memory marks it a deliberate cut ("don't reintroduce"). The live surface shows the tool matured (dismiss_task lifecycle, cwd targeting, title/tldr) — so the *factual basis* is re-probeable in one desktop session **if and only if the user asks to revisit**. Until then: do nothing, and do not mention spawn_task in any skill prose.

### H1 — Widen `ENTRY_MARKER_RE` (hardening) — BUILT 2026-07-14

Make backticks optional: `/ROADMAP\.jsonl entry \`?(\d+)\`?/`. Do NOT add looser secondary patterns (`/\bentry (\d+)\b/` risks false positives against arbitrary task descriptions). Update `tests/task_created.test.js` variants (with/without backticks, multiple numbers, garbage). Because M1 imports the regex from task-created.js, it inherits the widening. One-line change + tests.

### H2 — `session-start.js` resume coverage — RESOLVED-AS-EXCLUSION 2026-07-14

Verified live docs (`code.claude.com/docs/en/hooks.md`, SessionStart section): documented `source` values are exactly `startup`, `resume`, `clear`, `compact` — matches the expected list, `resume` is real and documented.

Widening `hooks.json`'s matcher alone would not have worked: `session-start.js`'s own header comment states the exclusion is deliberate ("never fires ... on resume/compact ... resumed context already knows"), and `main()` enforces it independently of the matcher (`if (data.source && data.source !== "startup" && data.source !== "clear") return;`, line 71) — `tests/session_start.test.js` already locks this in ("stays silent on resume and compact sources"). A matcher-only change is a no-op: the hook would still fire and immediately return silently on `resume`. Making the reminder actually appear on resume requires touching `session-start.js`'s guard too, which this task's constraints put out of scope. Matcher left at `^(startup|clear)$` (no net change). Revisit as its own task if the user wants the guard's allowlist widened alongside the matcher.

### H3 — TaskCreated/TaskCompleted schema canary (hardening) — BUILT 2026-07-14

**Built as designed below**, ROADMAP.jsonl entry 032, LOCAL-ONLY (uncommitted, per standing hold). Canary lands at `benchmarks/foreman/experiments/handoff/task-schema-canary.js` (private, gitignored harness): scratch dir under `os.tmpdir()`, a logging hook registered under both `TaskCreated`/`TaskCompleted` via a generated `--settings` file, one `claude -p --model haiku --allowedTools TaskCreate,TaskUpdate` driver session (task create-then-complete), asserts `task_id`/`task_subject`/`task_description` are present as strings on both captured events, prints PASS/FAIL + `claude --version`, exits nonzero on any FAIL or on zero captured events, cleans the scratch dir only on success. Checklist line landed in the local-only `cut-release` skill (`.claude/skills/cut-release/SKILL.md`, Step 0) rather than the canary's own header, since the skill exists on this machine.

Two Windows-specific bugs found and fixed while building this (not schema drift): (1) `--allowedTools` is variadic (`<tools...>`) and swallows any following bare argument up to the next flag — the driver prompt must come *before* `--allowedTools` on the command line, or the prompt itself gets eaten and `claude` errors "no prompt argument"; (2) `spawnSync(..., {shell:true})` on Windows mangles a prompt containing parentheses/commas (cmd.exe's argv re-parsing silently truncates it to empty) — fixed by dropping `shell:true` since `claude` is a real `.exe` on PATH and doesn't need shell resolution.

Proof run 2026-07-14, CLI 2.1.210 (same binary as P2/P3, no drift): PASS on both events, fields `[task_id, task_subject, task_description]` observed as strings on each, matching §2.2 exactly. Full findings in ROADMAP.jsonl entry 032's notes.

---

## 5. Trio compatibility & cross-plugin flags (ground-truthed 2026-07-14 against the sibling sources on disk)

The findings were re-checked under trio conditions (hush + razor active) against the actual sibling sources, not memory. Sibling inventories as of 2026-07-14:

- **hush** (`hush/hooks/hooks.json`): PreToolUse `^(Bash|PowerShell)$` → `preserve-exit-code.js` (the `[[hush:exit=N]]` wrapping post-commit.js already parses); SubagentStart (no matcher) → `subagent-brief.js`; PostToolUse `^(Bash|PowerShell|Read)$` → `compress-tool-output.js` plus PostToolUse (no matcher) → `narration-meter.js`. It also ships a main-loop **output style** (`hush/output-styles/hush.md`) — that is the "voice."
- **razor** (`razor/hooks/hooks.json`): SessionStart, SubagentStart (no matcher) → ladder injection, PreToolUse `^(Bash|PowerShell|Grep|Glob|Read|Edit|Write)$` → gate dispatcher, Stop → build-ledger, UserPromptSubmit → mode-toggle, SessionEnd.

Consequences for this brief's findings:

- **M1 is uncontended**: neither sibling registers TaskCreated/TaskCompleted. The block-reason provenance rule (§8) remains the only razor-derived constraint on M1.
- **The 0.18.0 tone carve-out premise is now confirmed verbatim on disk**: hush's `subagent-brief.js` header states "The output style never reaches a subagent — styles ride the main loop's system prompt," and its injected line governs final-message *shape* (data-first, no preamble), not voice. Razor's ladder does reach subagents (unknown agent types inject by default; skip list = `explore, plan, claude-code-guide, statusline-setup, output-style-setup` + `RAZOR_AGENT_SKIP`). So a background-`Agent` destination gets restraint + report-shape but **no voice** — keeping foreman's tone block for that destination stays correct. **The Workflow-agent case is now also confirmed (P3, 2026-07-14): SubagentStart fires for Workflow-spawned agents with `agent_type: "workflow-subagent"`, in both the plain and worktree-isolated variants** — so the same "restraint + shape, no voice" reasoning extends to Workflow agents; the tone carve-out's rationale holds there too (not tested here: whether it should — that's a design call, not this probe's scope).
- **M2 is helped, not hurt**: hush's subagent brief makes the background agent's final message data-shaped — exactly what flows into the entry's `notes`.
- **M3 amended** (see the item): schema-forced stages have no voice surface at all; the flavor omits `<tone>` mechanically.
- **hush sidecar coverage — CONFIRMED gap, with nuance** (owner: hush sessions): `compress-tool-output.js`'s matcher is exactly `^(Bash|PowerShell|Read)$`, so Agent finals, Workflow results, `TaskOutput`, and Grep/Glob outputs are structurally uncovered. Nuance: for deliverable payloads (a plan the user must read), non-compression is *desired* — the right hush-side framing is "extend coverage with a requested-deliverable carve-out," not "compress everything."
- **razor state keying — an earlier claim corrected, now fully answered by P3**: razor's state/ledger is keyed by `session_id` under `CLAUDE_PLUGIN_DATA` (tmpdir fallback) — `razor-lib.js` `stateDir()`/`statePath()` — NOT by project root or cwd. Worktree cwd is therefore not a risk to razor's gates. **P3 (2026-07-14) confirmed hooks DO fire inside both Workflow-spawned and worktree-isolated agents, and every subagent firing carried the exact same `session_id` as the parent driver session** (not a per-agent id) — so `statePath(session_id)` resolves to the SAME file for the parent and any Workflow subagent, plain or worktree. Razor's own `isActive(state)` toggle (read from plain `session_id` state) is therefore shared inside workflows: a `/razor off` toggle on the parent session applies inside its Workflow subagents too. Razor's gate *budgets*, however, already namespace by `gateStateId(data)` = `` `${session_id}--${agent_id}` `` when `agent_id` is present (confirmed present and non-empty on every Workflow-subagent firing) — so per-gate counters remain per-agent even though the toggle file is shared.

## 6. Probe playbook (methods; propose cost before running)

The established pattern (this is how TaskCreated was cracked in 0.21.0): a logging hook injected via `--settings`, driven by a cheap headless session. All probes run from the scratchpad directory; artifacts stay out of the repo.

- **Probe settings skeleton** (`probe-settings.json`): a `hooks` object registering `"command": "node <abs path>/log-probe.js"` for the target event; `log-probe.js` appends its full stdin plus env of interest as one JSON line to a known temp file, then optionally emits the output under test (e.g. `{"decision":"block","reason":"probe block"}`).
- **Driver**: `claude -p --model haiku --settings <probe-settings.json> "<one-sentence task>"` — pennies per run.

| Probe | Question | Method | Unblocks |
|---|---|---|---|
| **P2** | TaskCompleted: exact accepted block-output shape; is `additionalContext` delivered; does the harness retry completion after a block; does a blocked completion surface to the model as text | TaskCompleted logging+blocking hook; driver prompt: "Use TaskCreate to add a task 'probe', mark it in_progress, then completed via TaskUpdate. Report exactly what happens." Run once with block output, once with additionalContext output. | M1 |
| | **RUN 2026-07-14, headless `claude -p --model haiku`, CLI 2.1.210** (brief authored against 2.1.207 — binary drifted one patch, no schema impact observed). Three variants from `X:\Temp\...\scratchpad\p2-probe\` (kit + raw `probe-log.jsonl` local-only, not committed): **(A) baseline** — hook logs and emits nothing; confirms TaskCreated+TaskCompleted both fire once each, input schema unchanged (§2.2). **(B) block** — hook emits `{"decision":"block","reason":"probe-block: close the roadmap entry first"}`; the alternate exit-code-2/stderr shape was **not needed** (A's shape was cleanly accepted, no retry budget spent on it). Effect, read from the raw transcript `toolUseResult` (not the model's prose, which was inaccurate — see below): the `TaskUpdate` tool call itself returned `{"success":false,"taskId":"1","updatedFields":[],"error":"TaskCompleted hook feedback:\nprobe-block: close the roadmap entry first"}` — task genuinely stayed incomplete. The haiku driver's own final message nonetheless claimed "the task was successfully created and then marked as completed," despite quoting the block reason verbatim — a model-fidelity gap M1's reason text must be written to survive. **(C) context** — hook emits `{"hookSpecificOutput":{"hookEventName":"TaskCompleted","additionalContext":"probe-context: advisory line delivered"}}`; `TaskUpdate` succeeded normally (`success:true, updatedFields:["status"], statusChange:{from:"pending",to:"completed"}`) and the injected string appears **nowhere** in the transcript — no system-reminder attachment, no tool-result text, no model mention. **additionalContext is not delivered on TaskCompleted.** **Retry/loop**: hook-firing counts keyed by `event:task_id:session_id` across all three runs were all exactly 1 — no retry, no loop, in any variant. Full stdin payloads and driver transcripts are the verbatim evidence backing every claim above; not committed (investigation-only, per task constraints). |
| **P3** | Do plugin hooks (SubagentStart/PreToolUse/PostToolUse) fire inside Workflow agents and worktree-isolated agents; what `cwd`/`agent_type`/`session_id` do they see (razor keys state by session_id — shared with the parent or per-agent?) | All-event logging hook; driver runs a minimal 1-agent Workflow (agent does one Read; once with `isolation:'worktree'`). Requires a harness with Workflow (CLI ≥2.1.154 has it). | W5, 0.18.0 rationale, razor/hush flags |
| | **RUN 2026-07-14, headless `claude -p --model haiku --allowedTools=Workflow,Read`, CLI 2.1.210.** Kit built in a disposable scratch git repo (`X:\Temp\...\scratchpad\p3-probe`, one commit, not this repo — required for the worktree variant): a log-everything hook (`log-probe.js`) registered via `--settings` under `UserPromptSubmit`/`SubagentStart`/`PreToolUse`/`PostToolUse` (no matcher), appending each stdin payload's `hook_event_name, session_id, agent_id, agent_type, cwd, prompt_id, tool_name, tool_input` as one JSON line; two one-agent Workflow scripts (`wf-plain.js`, `wf-worktree.js` — identical except `isolation:'worktree'`) each doing `agent('Read the file probe.txt in your working directory and return its first line')`. Both driver runs completed successfully (`{"result":"PROBE-MARKER-LINE-7f3a91"}`), 14 total hook firings logged across both runs (4 UserPromptSubmit, 4 PreToolUse, 4 PostToolUse, 2 SubagentStart). **Verdict (a) — SubagentStart reach: YES.** Fired once per Workflow agent in both variants, `agent_type: "workflow-subagent"` (a harness-assigned type, not `explore`/`plan`/etc., and not skip-listed by razor's `DEFAULT_SKIP`). **Verdict (b) — PreToolUse/PostToolUse reach: YES**, for the inner agent's `Read` call in both variants, each carrying the Workflow-assigned `agent_id`/`agent_type`. Observed `cwd`: plain variant — same as the parent driver's cwd (`…\scratchpad\p3-probe`), `tool_input.file_path` pointing straight at `…\p3-probe\probe.txt`; worktree variant — a dedicated worktree path **`…\p3-probe\.claude\worktrees\wf_9a33128f-14e-1`**, with `tool_input.file_path` correctly rewritten to the worktree-local `probe.txt`. **Verdict (c) — session_id continuity: SHARED, not fragmented.** Every subagent firing (SubagentStart/PreToolUse/PostToolUse) in both variants carried the identical `session_id` as its parent driver session (plain run: `b4d693af-5a16-4f9a-99b7-7e3698431e3d` on all 6 of that run's firings incl. the subagent's; worktree run: `6cea8af7-c2d9-4d8a-9844-1053f6dcf5bc` likewise) — `agent_id` differs per subagent (`a0a647484174fee96` / `ac9b597cc1526fc44`) but `session_id` never does. Consequence for razor: `statePath(session_id)` (razor-lib.js) resolves to the same file for a Workflow subagent as its parent — the `/razor off` toggle is shared inside workflows — while `gateStateId()`'s `session_id--agent_id` compound key still separates gate budgets per subagent. Full raw log (`hook-log.jsonl`, 14 lines) and both driver transcripts (`driver-plain-output.txt`, `driver-worktree-output.txt`) captured in the scratch dir; not committed (investigation-only, per task constraints). |
| **P5** | What the Agent tool result exposes as the agent id; SendMessage error shape for a dead agent | Desktop or headless session: spawn a trivial background agent, inspect the result text; SendMessage after it completes and again after restart. | M2 |
| | **RUN 2026-07-14, headless `claude -p --model haiku`, CLI 2.1.210.** Two driver variants from `X:\Temp\...\scratchpad\p5-probe\` (local-only, not committed). **Variant 1** (`--allowedTools=Agent`, synchronous `run_in_background:false` spawn of a one-word-reply subagent) — verbatim trailer captured: `` pingagentId: a5388ebb19b3293d6 (use SendMessage with to: 'a5388ebb19b3293d6', summary: '<5-10 word recap>' to continue this agent) `` followed by a separate `<usage>subagent_tokens/tool_uses/duration_ms</usage>` block. **Id format confirmed**: literal `a` + 16 lowercase hex chars, 17 chars total — matches the prompt's stated known fact exactly (`a90b9214b4f63141f` is the same shape) and fits M2's proposed marker grammar (`` background agent `<id>` ``) with no escaping concerns — plain alphanumeric, no backticks/quotes/whitespace in the id itself. **Variant 2** (`--allowedTools=Agent,SendMessage`, same spawn, then SendMessage to the real id, then to a fake id `a0000000000000000`) — both raw JSON results captured verbatim: real-id call → `{"success":true,"message":"Agent \"a96e86e426eaeedd5\" had no active task; resumed from transcript in the background with your message. You'll be notified when it finishes. Output: ...\\tasks\\a96e86e426eaeedd5.output","resumedAgentId":"a96e86e426eaeedd5","pin":{"id":"a96e86e426eaeedd5","name":"a96e86e426eaeedd5","ref":"419270"}}`; fake-id call → `{"success":false,"message":"Agent \"a0000000000000000\" could not be resumed: No transcript found for agent ID: a0000000000000000"}`. **Correction to the prompt's premise**: SendMessage to a *completed* agent does NOT error — it succeeds and silently resumes the agent from its saved transcript as a new background task. Failure (`success:false`, clear "No transcript found" message) is specific to an unrecognized/never-existed id, not to completion per se. Restart-of-app variant explicitly **untested** (out of scope, requires desktop app restart mid-probe) — immaterial to M2 either way, since M2's fallback triggers on any `success:false`/error regardless of cause (gone after restart, wrong id, or genuinely never existed all look identical to the caller: a falsy result to fall back on). |
| **Schema check** | Current TaskCreate tool parameter schema | Zero-cost: one `ToolSearch` `select:TaskCreate` in any session and read the returned schema. | H3 baseline |

## 7. Do-not-do list (deliberate design cuts — violating these is a regression)

1. No session-start doctrine injection (the pre-0.4.0 Relay identity is dead).
2. No `spawn_task` handoff destination (M7).
3. No hand-editing `ROADMAP.jsonl` — everything through `roadmap.js`; the guard hook enforces it; `Bash` stays open as the repair path.
4. Pick-next-task **never investigates the codebase** — no Reads, no Greps; `touches` passes through unverified; grounding belongs to the recipient (`truth_grounding`) and to `foreman:survey`.
5. No `.claude/rules/` drafting from init (added 0.4.7, reverted 0.4.8 — don't re-add without new reasoning).
6. Never print the assembled prompt into chat (sole exception: clipboard-fallback fenced xml block).
7. Don't hardcode references to other marketplaces' plugins in `/foreman:roadmap`.
8. Foreman never marks `in_progress` at pick time; the destination (or task-created.js) does.
9. No flag-file sniffing for tone (`usePersona` declaration replaced detection in 0.14.0).
10. Guardrail blocks (`truth_grounding`, `scope_discipline`) are never omit-able or shadow-able via config.
11. Don't restore numbered `Step N:` task_rules and don't delete the closing paragraph's narration-bounding sentences (both empirically validated).
12. The noun "report" stays out of destination-facing template text (hush carve-out self-trigger).
13. `output_format` is NOT omitted by default alongside hush/razor (settled 0.16.0 — it's the anti-XML-echo guard).

## 8. House rules & environment (the builder must obey all of these)

- **Versioning**: version + `source.sha` live only in root `.claude-plugin/marketplace.json`, bumped together. Pre-commit sync-gate (`scripts/git-hooks/check-marketplace-sync.js`) needs git on PATH — it fails under the Bash tool; run commits via **PowerShell** with `fnm env --use-on-cd | Out-String | Invoke-Expression` first. Minor bump for new subcommands/hooks/skills, patch for fixes/prose (0.16.x precedent).
- **Tests**: `node --test foreman/tests/*.test.js` — the explicit glob is mandatory on this Windows/Git-Bash setup (plain dir form fails). Any code that spawns a nested `node --test` must strip `NODE_TEST_CONTEXT` and `NODE_CHANNEL_FD` from the child env. Use local-date helpers, never `toISOString()` date math. The foreman repo's own pre-commit re-runs the full suite.
- **Public docs**: enforced by `.claude/rules/public-docs.md` — README/CHANGELOG are user-facing only; terse "Fixed an issue where…" changelog lines; current behavior only; no methodology, no history narration, no rationale, no resolved-issue caveats. Effect-only CHANGELOG bullets (doc-consistency-reviewer flags rationale).
- **Never name competitor plugins** in published material.
- **Benchmark numbers**: never commit/push/README them without an explicit user go (an AskUserQuestion approval satisfies this).
- **Deny/block provenance** (razor lesson, applies to M1): every hook block reason must state it is an automated plugin checkpoint, not the user declining, because the live base prompt teaches "a denied call means the user declined it — adjust, don't retry verbatim."
- **Philosophy filter**: (1) reject ungrounded prescription — mechanisms must be evidence-driven (foreman's whole history is trace-driven fixes); (2) user-visible protocol is instructional regardless of enforcement — "mechanical" applies to HOW the system enforces, not WHETHER the user sees it.
- **Agents to run**: `manifest-curator` after manifest edits; `doc-consistency-reviewer` after README/CHANGELOG edits. The cut-release skill is LOCAL-ONLY (gitignored) — it exists on this machine even though the repo doesn't show it.
- **Auto-push** at task end (submodule first, then parent). This brief itself stays untracked.
