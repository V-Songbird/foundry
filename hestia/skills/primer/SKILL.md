---
name: primer
description: >-
  Installs the curated Claude Code rules primer into .claude/rules/recommendation-files.md.
  Part of Hestia's rules engine pillar. The bundled rules cover instruction-file hygiene:
  re-read CLAUDE.md, README.md, AGENTS.md, and .claude/rules/*.md after structural changes
  (renames, moves, deletions); verify file paths before citing them; and audit recommendation
  files for stale references when editing them. Copies one pre-defined file into .claude/rules/
  — never authors new rules from scratch (use /hestia:author-rules), audits existing rules
  (use /hestia:assess-rules), or reformats them (use /hestia:format-rules).
  When the destination already exists, the user is asked via AskUserQuestion buttons
  whether to overwrite, merge, or cancel.
when_to_use: >-
  Trigger when the user says "primer rules", "install starter rules", "set up Claude rules",
  "bootstrap rules", "drop in the recommended rules", "add the recommended Claude rules to
  this project", "give Claude awareness of my project files", or "fast way to add Claude
  rules".
allowed-tools: Read, Glob, Write, AskUserQuestion, Bash(mkdir -p .claude/rules*)
---

# Recommendation Rules Primer — Install Curated Self-Awareness Rules

Copy a pre-defined rules file into the current project's `.claude/rules/`
directory. The bundled rules teach Claude to re-read its own instruction files
after structural changes so it stops generating stale path references.

This skill ships ONE file. It does not author new rules (use
`/hestia:author-rules`), audit existing rules (use `/hestia:assess-rules`), or
reformat rule files for readability (use `/hestia:format-rules`).

The bundled rules file lives at
`${CLAUDE_SKILL_DIR}/assets/recommendation-files.md` inside the plugin
install. The skill reads it and writes it into the project at
`.claude/rules/recommendation-files.md`.

## `AskUserQuestion` shape constraints — apply to every invocation in this skill

Every decision point with a fixed, enumerable answer space MUST use
`AskUserQuestion` — plain-text questions break the button-driven flow and
users may not notice them.

- Every invocation MUST pass the canonical top-level shape
  `{ questions: [{ question, header, multiSelect, options }] }`. The
  `questions: [...]` array wrapper is required.
- `header` MUST be ≤12 characters (tool-enforced; longer values truncate
  silently).
- `options` MUST contain 2–4 entries. The harness auto-injects an "Other"
  escape when needed — do NOT add a 5th option manually.
- Every option MUST have `label` and `description`. Omitting `description`
  produces bare buttons with no guidance.
- `multiSelect: true` ONLY when selections are logically independent. For
  every decision in this skill, `multiSelect: false`.
- Every `Bash` invocation MUST include a short `description` field (5–10
  words) naming its purpose.

## Task tracking

MUST invoke `TaskCreate` for each task below before any other work, capturing
each returned `taskId`. In non-interactive / SDK sessions, fall back to
`TodoWrite`. Every task MUST carry paired `content` (imperative) and
`activeForm` (progressive) fields — they are NOT interchangeable. `content`
renders when `pending` or `completed`; `activeForm` renders while
`in_progress`.

Initial tasks (create all up front, with both forms):

1. `{ content: "Load the bundled rules file", activeForm: "Loading the bundled rules file" }` — Phase 1
2. `{ content: "Detect destination conflict", activeForm: "Detecting destination conflict" }` — Phase 2
3. `{ content: "Apply the user's chosen action", activeForm: "Applying the user's chosen action" }` — Phase 3
4. `{ content: "Confirm and report", activeForm: "Confirming and reporting" }` — Phase 4

MUST invoke `TaskUpdate` with the captured `taskId` immediately before
starting each task (status `in_progress`) and immediately upon finishing
(status `completed`). Never batch completions. Never leave multiple tasks
`in_progress` simultaneously. Never start a new task before marking the prior
one `completed`.

## Phase 1 — Load the bundled rules file

Invoke `Read` with
`file_path: "${CLAUDE_SKILL_DIR}/assets/recommendation-files.md"`. Hold the
full content in memory for use in Phase 3.

If `Read` fails, stop the skill and tell the user verbatim: "I couldn't load
the bundled rules file. Reinstall the hestia plugin and try again." Do not
attempt to fall back to inline content — the canonical text lives in the
bundled file.

Mark task 1 `completed` and proceed to Phase 2.

## Phase 2 — Detect destination conflict

The destination is always `.claude/rules/recommendation-files.md` relative to
the current project root. The destination is fixed; the user does not pick a
custom path.

Invoke `Glob` with `pattern: ".claude/rules/recommendation-files.md"` to check
whether the file already exists.

**If the file does NOT exist**: skip the conflict question and proceed to
Phase 3 with action `write-fresh`.

**If the file DOES exist**: MUST invoke `AskUserQuestion`:

- **question**: `".claude/rules/recommendation-files.md already exists. How should I handle it?"`
- **header**: `"Conflict"`
- **multiSelect**: `false`
- **options**:
  - `{ label: "Overwrite", description: "Replace the existing file with the bundled rules. Loses any edits you made — git history can recover them." }`
  - `{ label: "Merge", description: "Keep your file and append the bundled rules under a new heading. Duplicates may appear; run /hestia:assess-rules afterwards to deduplicate." }`
  - `{ label: "Cancel", description: "Leave the file as-is. Nothing is written." }`

Carry the user's choice into Phase 3 as the action label.

Mark task 2 `completed` and proceed to Phase 3.

## Phase 3 — Apply the chosen action

Branch on the action determined in Phase 2.

### Action: `write-fresh` (file did not exist)

MUST invoke `Bash` with:

- **command**: `mkdir -p .claude/rules`
- **description**: `"Ensure .claude/rules/ directory exists"`

Then invoke `Write` with `file_path: ".claude/rules/recommendation-files.md"`
and `content` set to the bundled rules content captured in Phase 1.

### Action: `Overwrite`

MUST invoke `Bash` with:

- **command**: `mkdir -p .claude/rules`
- **description**: `"Ensure .claude/rules/ directory exists"`

Then invoke `Write` with `file_path: ".claude/rules/recommendation-files.md"`
and `content` set to the bundled rules content captured in Phase 1. The
existing file is replaced atomically.

### Action: `Merge`

Invoke `Read` on `.claude/rules/recommendation-files.md` to capture the
current content. Build the merged content as:

1. The current file's content, unchanged.
2. A blank line.
3. The literal heading `## Recommendation File Hygiene (hestia:primer)`.
4. A blank line.
5. The body of the bundled file from Phase 1, with its YAML frontmatter and
   top-level `# ...` title stripped (keep only the prose paragraphs and
   bullet rules below the title).

Then invoke `Write` with
`file_path: ".claude/rules/recommendation-files.md"` and `content` set to the
merged content built above.

Do NOT attempt rule-by-rule deduplication. The user can run
`/hestia:assess-rules` afterwards to surface duplicates structurally — that is
the deduplication step, not this one.

### Action: `Cancel`

Do nothing. Skip directly to Phase 4 with the cancellation report.

Mark task 3 `completed` and proceed to Phase 4.

## Phase 4 — Confirm and report

Tell the user what happened in plain language. Pick the message matching the
action taken in Phase 3 and send it verbatim.

**If `write-fresh`**:

> Installed the recommended rules at `.claude/rules/recommendation-files.md`.
> Claude will now re-read your instruction files after renames, moves, and
> deletions, and verify cited paths before stating them as fact.

**If `Overwrite`**:

> Replaced `.claude/rules/recommendation-files.md` with the bundled rules.
> Any edits you had in that file are gone — git history can recover them if
> you need.

**If `Merge`**:

> Appended the bundled rules to `.claude/rules/recommendation-files.md` under
> a new heading. Run `/hestia:assess-rules` to check for duplicates between your
> existing rules and the bundled set.

**If `Cancel`**:

> No changes made. Your existing `.claude/rules/recommendation-files.md` is
> untouched.

Mark task 4 `completed`.

## Additional resources

- For the bundled rules file content, see [assets/recommendation-files.md](assets/recommendation-files.md).
- For authoring new rules from scratch (after the primer is installed), dispatch `/hestia:author-rules`.
- For auditing existing rules for structural quality, dispatch `/hestia:assess-rules`.
- For reformatting rule files for readability, dispatch `/hestia:format-rules`.
