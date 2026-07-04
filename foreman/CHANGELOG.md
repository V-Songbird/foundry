# Changelog

All notable changes to Foreman are documented here. Foreman was named
Relay through 0.4.8-alpha — see the 0.5.0-alpha entry below for the
rename; earlier entries below refer to the plugin by its name at the
time, not retroactively edited. Foreman is a monorepo-folder plugin — its
version is owned by `.claude-plugin/marketplace.json` at the repo root,
not by `foreman/.claude-plugin/plugin.json` (which carries no version
field by convention).

## [0.6.0-alpha] — 2026-07-04

### Added — `foreman:survey`, on-demand ground-truthing of near-term roadmap candidates

`foreman:roadmap`'s pick-next-task branch ranks purely mechanically
(unblocks count, then oldest) and never checks the codebase — deliberately,
per 0.4.4-alpha. That left a real gap: nothing ever re-checked whether a
`done` task's `commits` actually exist, whether a candidate's `touches`
still match reality, or whether a dependency exists in the code that
`depends_on` never modeled. `foreman:survey` closes that gap as a separate,
explicitly-triggered skill — never wired into the fast pick-next-task path,
so the mechanical branch stays exactly as cheap as 0.4.4-alpha made it.

- **`roadmap.js` gained `update-deps`** — adds ids to an existing entry's
  `depends_on` (no duplicates, rejects unknown ids and self-dependencies).
  `add` only sets `depends_on` at creation time; this is the only way to
  correct it afterward. This is what makes a survey finding durable across
  sessions: a hidden dependency gets written into the graph
  `next-candidates` already reads, so a completely new session picks up the
  corrected order automatically — no memory or cache involved, just the
  same file everyone already reads.
- **`next-candidates` now returns each candidate's `notes`** — previously
  omitted from the output entirely, so a breadcrumb left by `update-status`
  was invisible to the picking flow unless something separately called
  `list`. This is the soft-signal path for findings that aren't a hard
  block (a preference or insight without a structural reason) — visible as
  context to whoever picks next, not a guaranteed mechanical reorder.
- **`skills/survey/SKILL.md`** — surveys the top unblocked candidates (same
  default 5 as `foreman:roadmap`, not the whole backlog), dispatches one
  `Explore` agent per candidate in parallel to check touches/dependencies/
  duplication against the actual code, then asks before persisting any
  finding via `update-deps` or `update-status`. Never touches
  `ROADMAP.jsonl` directly, same as every other Foreman flow.

65 tests total (58 existing + 7 new: 6 for `update-deps`, 1 for `notes`
surfacing in `next-candidates`).

## [0.5.0-alpha] — 2026-07-03

### Changed — renamed from Relay to Foreman

No installed users yet (single-project testing only), so the rename cost
nothing beyond the mechanical work: `relay/` → `foreman/` (`git mv`,
history preserved), every `/relay:*` skill invocation → `/foreman:*`,
`.relay/config.json` → `.foreman/config.json` (in code, not just docs —
`hooks/post-commit.js`'s `readConfig`, `tests/helpers.js`'s `writeConfig`),
`[Relay]`/`Relay:` message prefixes in both hooks → `[Foreman]`/`Foreman:`,
`marketplace.json`/`plugin.json` `name`/`source`/`homepage`, every doc
cross-reference.

Reasoning: "Relay" fit the prompt-handoff pillar (craft-prompt, pass a
fully-briefed prompt to another session) but never fit the roadmap pillar
(tracking, sequencing, dependency graphs — nothing about "relay" suggests
that to a cold reader). "Foreman" fits both without a stretch: a foreman
keeps the work plan (roadmap), decides what's next, and hands each worker
a fully-briefed assignment (the crafted prompt) — the same shape as this
plugin's actual two pillars, not just the handoff tail end of one of them.

## [0.4.8-alpha] — 2026-07-03

### Removed — the `.claude/rules/` drafting added in 0.4.7-alpha

Reverted same-day, after direct feedback: the only genuinely new content a
drafted rule file could add (project description, goals, conventions) is
exactly the interpreted/synthesized content the user didn't want. Strip
that out and what's left — "check `/relay:roadmap`, don't hand-edit
`ROADMAP.jsonl`" — is fully redundant with mechanisms that already work
without depending on a rules file being loaded or remembered:
`guard-roadmap-edit.js` denies the direct edit and explains why in the
same message; `post-commit.js` nudges at the exact moment it matters
instead of sitting as passive context; `skills/roadmap/SKILL.md`'s own
`description`/`when_to_use` frontmatter is what Claude Code already uses
to discover the skill. No version of this feature was left that was both
static (what was asked for) and non-redundant (worth keeping). `relay:init`
is back to bootstrapping only `ROADMAP.jsonl` and `.relay/config.json`.

## [0.4.7-alpha] — 2026-07-03

### Added — optional starter `.claude/rules/` file in `relay:init`

`relay:init` can now draft `.claude/rules/project-conventions.md`
alongside `ROADMAP.jsonl` — one more optional question (draft it? any
always-follow conventions?), then written and committed with the rest.
Verified the actual `.claude/rules/` mechanism against the official docs
first (`claude-directory.md`): files without `paths:` frontmatter load at
session start like `CLAUDE.md`; with `paths:` globs they load only when a
matching file enters context. This feature uses no `paths:` — a general,
always-loaded primer, not path-scoped.

Deliberately limited: the rule file is built **only** from what the
interview gathers, never from exploring the codebase — consistent with
every other Relay flow staying cheap (no ground-truthing before handoff).
For an existing project with real conventions to capture accurately, a
human-reviewed rule file beats one drafted from a five-question interview;
`relay:init` says so explicitly rather than pretending otherwise. Skips
the whole call silently if `.claude/rules/project-conventions.md` already
exists — no clobbering.

## [0.4.6-alpha] — 2026-07-03

### Added — hooks/guard-roadmap-edit.js, mechanical enforcement of the CLI-only rule

"Never `Read`/`Edit` `ROADMAP.jsonl` directly, use `roadmap.js`" has been
prose since 0.4.3-alpha — nothing actually stopped a direct `Edit`/`Write`.
Every guarantee the CLI provides (sequential ids, parse-before/after-write,
append-only notes, length warnings) only holds if the CLI is actually the
only path in. Closed that gap the same way `pre-tool-use.js` once gated
`spawn_task` (see [[feedback_relay_spawn_task_gate]] for the precedent,
though that specific hook is long gone) — a `PreToolUse` deny, not another
reminder.

- **`hooks/guard-roadmap-edit.js`** — `PreToolUse` on `Edit`/`Write`,
  denies the call if the target file's basename is `ROADMAP.jsonl`
  (case-insensitive), pointing back at `roadmap.js --help`. `Read` is
  unaffected. `Bash` is deliberately left open — if the file is ever
  corrupt enough that the CLI itself can't parse it, that's the sanctioned
  repair path, same as `relay:init`'s own `> ROADMAP.jsonl` reset on
  Overwrite.

58 tests total (49 existing + 9 new).

## [0.4.5-alpha] — 2026-07-03

### Fixed — --help, verbose chat output, and leaked XML tags

Two more real-usage findings: `roadmap.js --help` errored (`unknown
subcommand: --help`) — Claude's first instinct when it didn't remember the
exact invocation, forcing a `roadmap-schema.md` read just to recover. And
the handed-off session's final chat message dumped a massive wall of
investigation detail wrapped in a raw `<findings>` tag — a machine-parsing
convention shown literally to a human reading chat.

- **`roadmap.js` gained `--help`/`-h`/no-args** — prints subcommand usage
  and stdin/flag shapes instead of erroring, matching the Unix convention
  Claude reached for first.
- **Default `<tone>` replaced**: "Technical and direct, ground every
  conclusion..." (now redundant with `truth_grounding`, which already owns
  grounding) → checks `$CLAUDE_CONFIG_DIR/.caveman-active` and goes terse
  if caveman is active, otherwise minimal/professional — silent by
  default, only what the user needs to know, no unnecessary jargon.
- **Default `<output_format>` stopped forcing an XML wrap.** Both
  `prompt-template.md` and `craft-prompt`'s embedded copy now default to a
  plain human-readable summary; XML-tag wrapping is opt-in only (`Custom
  output format`), for when something downstream genuinely parses the
  result — and even then, a plain-language summary goes above the tagged
  block so a human reading chat directly isn't just shown raw markup.

49 tests total (46 existing + 3 new for `--help`).

## [0.4.4-alpha] — 2026-07-03

### Fixed — Pick-next-task was doing ground-truth investigation it shouldn't

A real-repo trace showed `/relay:roadmap`'s "Pick the next task" branch
burning ~100k tokens on one invocation: `list`-then-manually-filter-and-rank
over a large roadmap, then ~11 `Read`/`Grep` calls exploring the codebase to
"verify/tighten" the picked entry's `touches` hints before assembling the
prompt — including re-reading the same file twice across two separate
batches. That's backwards: `<truth_grounding>` exists precisely so the
*handed-off* session verifies claims at the start of its own work; the
picker verifying anything first duplicates that cost for no reason. Also
visible in the trace: one roadmap entry's `notes` held a full paragraph
plus an entire legacy tracker's JSON record serialized as a string inside
it — bloating every future `list` call that touches that entry.

- **`roadmap.js next-candidates`** (new subcommand) — mechanical filter
  (unblocked: `planned`, every `depends_on` done) + rank (most
  `depends_on`-referenced first — a derived importance proxy, still no
  stored priority field — then oldest `created_at`) + a `collision` flag
  per candidate. `skills/roadmap`'s Pick-next-task branch now calls this
  instead of `list` + reasoning over the whole file.
- **Pick-next-task branch rewritten to forbid exploration outright**:
  "This branch does not investigate the codebase. At all." The prompt is
  assembled straight from the picked entry's fields; `touches` passes
  through as unverified area-level hints. The assembled prompt's
  `task_rules` Step 1 now defaults to "explore `relevant_files` first" —
  explicitly handing verification to the recipient instead of the picker
  attempting it. `prompt-template.md`'s checklist gained a note
  distinguishing `craft-prompt` (user-supplied exact files) from
  `relay:roadmap` (entry-derived, `truth_grounding` covers the gap).
- **Field-length warnings**: `add`/`update-status` return a non-fatal
  `warnings` field when `why` (>240 chars), `what` (>400 chars), or a
  single `notes` append (>240 chars) run long — the write still succeeds,
  but Claude sees the nudge to trim. `roadmap-schema.md` explicitly warns
  against serializing an entire legacy record into `notes`; map fields
  onto `why`/`what`/`touches` instead.
- **Clipboard fixed to file-mediated only**: the observed trace showed one
  failed inline-clipboard attempt before a working file-based fallback —
  large prompts as inline shell strings break quoting. Both
  `craft-prompt` and `roadmap` now always `Write` to a temp file first,
  then pipe the file's content into the clipboard command; no more
  try-inline-then-fallback.

46 tests total (36 existing + 10 new: 7 for `next-candidates`, 3 for the
length warnings).

## [0.4.3-alpha] — 2026-07-03

### Added — `scripts/roadmap.js`, a mechanical CRUD CLI for ROADMAP.jsonl

Every `ROADMAP.jsonl` read/write used to be Claude's own Read+reason+Edit+
Read-to-verify — repeated on every commit with discovery on. That's pure
token overhead for fully deterministic work (id computation, JSON
formatting, parse-before/after-write, append-only notes). Moved it into a
small Node CLI, same pattern as `hestia/scripts/run_audit.js` (subcommand +
flags for reads, JSON via stdin for writes, JSON via stdout for results —
no server, no daemon, Claude just shells out once per call):

- `add` — computes `id`, defaults `status:"planned"` (or `"rejected"` for
  the discovery flow's Reject path — both use the same call now), stamps
  timestamps, validates.
- `update-status` — transitions status, appends `commit`/`notes` (never
  overwrites), re-validates.
- `list` — optional `--status` filter, read-only.
- `check-duplicate` — cheap word-overlap (Jaccard) match against `rejected`
  entries, so the discovery flow stops re-asking about declined ideas
  instead of re-reading and eyeballing the whole file every time.

Rewired all three callers: `hooks/post-commit.js` (`require()`s
`readEntries` in-process for the cheap in-progress check instead of a text
substring match; its instruction blocks now tell Claude to shell out to the
CLI instead of hand-editing), `skills/init` (Write phase loops `add`
instead of `JSON.stringify`-by-hand), `skills/roadmap` (all three branches
— dropped `Edit` from `allowed-tools` entirely, there's no longer a
sanctioned way to hand-edit the file from either skill).
`roadmap-schema.md`'s "Write invariants" section became "Using roadmap.js"
— the same guarantees, now enforced in code instead of re-derived from
prose every time. 36 tests total (17 existing + 19 new for the CLI).

## [0.4.2-alpha] — 2026-07-03

### Added — token-conscious discovery entries + truth-grounding mandate

Two additions aimed at reducing token spend for whoever picks up Relay's
output later:

- **`roadmap-schema.md`** gained a "Writing claude-suggested entries" rule:
  when the commit hook's discovery flow adds an entry, write `what`/`why`/
  `touches`/`notes` as dense as possible using only what's already in the
  session's context (exact paths, line ranges, symbol names) — and
  explicitly do NOT run extra `Read`/`Grep`/`Bash` calls just to enrich the
  entry, since that spends tokens now instead of saving them for later.
  `hooks/post-commit.js`'s discovery block carries the same instruction at
  the point Claude actually acts on it. The worked example's
  `claude-suggested` entry was rewritten denser to demonstrate the target.
- **`prompt-template.md`** (and its embedded copy in `craft-prompt/SKILL.md`)
  gained a fixed, always-included `<truth_grounding>` block: the handed-off
  session must verify every claim in the prompt against the actual
  codebase at the start of its work rather than assuming it's still
  accurate — the prompt may have been crafted earlier and run later via
  `TaskCreate` or a background `Agent`. Added to both checklists.

## [0.4.1-alpha] — 2026-07-03

### Changed — retired `spawn_task`, three explicit execution options

`mcp__ccd_session__spawn_task` has a known bug: tasks spawned through it
don't get MCP tools. Every handoff point in Relay (`craft-prompt`'s final
call, `roadmap`'s "Pick the next task" branch, the commit hook's discovery
block) now offers three options instead:

- **Execute with TaskCreate** — `TaskCreate` tracks it, worked in the
  current session (`TaskUpdate` to `in_progress`/`completed`).
- **Execute with a background Agent** — `Agent` with `run_in_background:
  true`, notified on completion.
- **Copy prompt to clipboard** — platform-appropriate clipboard command
  (`Set-Clipboard`/`clip` on Windows, `pbcopy` on macOS, `xclip`/`wl-copy`
  on Linux), falling back to a fenced code block if unavailable.

`prompt-template.md`'s checklist and "when not to hand off" section were
generalized off spawn_task-specific field names (`title`/`tldr`) to the
mechanism-agnostic `subject`/`description` naming `TaskCreate` and `Agent`
actually use. `allowed-tools` in both skills dropped `spawn_task`, added
`Bash`/`PowerShell` (clipboard) and `TaskCreate`/`Agent` where missing.

## [0.4.0-alpha] — 2026-07-03

### Changed — pivot from delegation-doctrine coach to prompt-engineering + roadmap plugin

Relay dropped its `SessionStart` doctrine injection and the four hooks
supporting it, and gained a second pillar: a per-project, git-committed
`ROADMAP.jsonl` plus the skills to bootstrap and drive it.

- **Removed** `hooks/session-start.js` (every-session delegation-doctrine
  injection), `hooks/pre-tool-use.js` (global `spawn_task` template-read
  gate), `hooks/post-tool-use.js` (post-Agent/Workflow spawn nudge),
  `hooks/stop.js` (end-of-session deferred-work sweep), and
  `hooks/user-prompt-submit.js` (multi-part/deferred-language regex hints).
- **Added** `hooks/post-commit.js` — the one remaining hook, `PostToolUse`
  on `Bash`/`PowerShell`, fires only on an actual `git commit`. Silent by
  default (no `ROADMAP.jsonl` → nothing happens). When present, offers a
  status-sync nudge (close out an `in_progress` task on the commit that
  finished it) and, opt-in only, a discovery nudge (ask the user what to
  do with confirmed follow-up opportunities spotted in that commit's work
  — never acts without asking).
- **Added** `roadmap-schema.md` — the `ROADMAP.jsonl` field reference:
  `id`, `title`, `why`, `what`, `status`
  (`planned|in_progress|done|dropped|rejected`), `source`
  (`user|claude-suggested`), `depends_on`, `touches`, `commits`,
  `created_at`, `updated_at`, `notes`. No parser/writer script — Claude
  reads/writes the file directly, guided by this doc's write invariants.
- **Added** `/relay:init` — bootstraps `ROADMAP.jsonl` and
  `.relay/config.json` for a project: asks what it is and its near-term
  goals, asks the key policy question (accept Claude-suggested roadmap
  entries after commits — yes/no), drafts an initial task set, gets
  approval, writes and commits both files.
- **Added** `/relay:roadmap` — the ongoing entry point: pick the next task
  (reasons about `depends_on` ordering and `touches` collisions, then
  crafts a self-contained handoff prompt using `prompt-template.md`'s
  shape — hands off only, never executes inline, never routes to Forge),
  add a task, or review status.
- **Kept unchanged**: `/relay:craft-prompt` and `prompt-template.md` —
  already self-contained, already the prompt-engineering pillar this
  redesign builds on.

### Housekeeping

- Added this `CHANGELOG.md` and `README.md` — both were missing despite
  the repo's `CONTRIBUTING.md` requiring them for every plugin.
- Added `tests/` (`node --test`) covering `post-commit.js`.
- `plugin.json` description/keywords rewritten to reflect the new scope;
  marketplace.json entry bumped `0.3.2-alpha` → `0.4.0-alpha`.

## [0.3.2-alpha] — 2026-07-01

Enriched session-start injection (delegation-doctrine era — see above,
superseded by 0.4.0-alpha).

## [0.2.1-alpha] and earlier

Delegation-doctrine era: zero-config coaching toward `spawn_task`,
`mark_chapter`, and `Agent`/`Workflow` usage, plus the original
`/relay:craft-prompt` skill. Superseded by 0.4.0-alpha.
