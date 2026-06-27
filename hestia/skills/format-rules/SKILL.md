---
name: format-rules
description: >-
  Format and structurally clean Claude Code rule files. Part of Hestia's rules
  engine pillar. Applies four transforms: split multi-concept bullets, add
  blank-line separation, restructure long single-directive rules into sub-lists,
  and unwrap space-indented continuation lines. Never rewrites rule content,
  adds examples, or scores rules (those belong to /hestia:assess-rules and
  /hestia:author-rules). Produces a before/after diff for user confirmation
  before writing.
when_to_use: >-
  Trigger when the user says "lint my rules", "format my rules", "clean up my
  rules", "make my rules more readable", "fix my rule formatting", or "tidy my
  rules". Also triggers on scoped variants: "lint the rules for this folder",
  "format rules in src/", "clean up rules under api/".
argument-hint: "[scope-path]"
allowed-tools: Read, Write, Glob, AskUserQuestion, TaskCreate, TaskUpdate
---

# Rules Format — Structural Formatting

Reformat Claude Code rule files using four structural transforms: split
multi-concept bullets into one-concept-per-bullet, add blank-line separation
between bullets, restructure long single-directive rules into sub-lists, and
unwrap space-indented continuation lines into single-line bullets.

This skill NEVER changes rule content — structure only. For quality improvements
and example injection, use the `/hestia:assess-rules` skill. For new rules, use
the `/hestia:author-rules` skill.

If arguments are provided, treat them as a scope path restriction: $ARGUMENTS

## `AskUserQuestion` shape constraints — apply to every invocation in this skill

Every decision point with a fixed, enumerable answer space MUST use
`AskUserQuestion` — plain-text questions break the button-driven flow.

- Every invocation MUST pass `{ questions: [{ question, header, multiSelect, options }] }`.
  The `questions: [...]` array wrapper is required.
- `header` MUST be ≤12 characters.
- `options` MUST contain 2–4 entries. Never add a 5th manually.
- Every option MUST have `label` and `description`.

## Task tracking

MUST invoke `TaskCreate` for each task below before any other work, capturing
each returned `taskId`. In non-interactive / SDK sessions, fall back to
`TodoWrite`. Every task MUST carry paired `content` (imperative) and
`activeForm` (progressive) fields — they are NOT interchangeable.

Initial tasks (create all up front, with both forms):

1. `{ content: "Resolve scope", activeForm: "Resolving scope" }` — Phase 1
2. `{ content: "Discover rule files", activeForm: "Discovering rule files" }` — Phase 2
3. `{ content: "Apply formatting transforms", activeForm: "Applying formatting transforms" }` — Phase 3
4. `{ content: "Confirm and write changes", activeForm: "Writing changes" }` — Phase 4

MUST invoke `TaskUpdate` with the captured `taskId` immediately before starting
each task (status `in_progress`) and immediately upon finishing (status
`completed`). Never batch completions. Never leave multiple tasks `in_progress`
simultaneously.

## Phase 1 — Resolve scope

**If `$ARGUMENTS` is non-empty**, treat it as a path prefix. Restrict all file
discovery in Phase 2 to that subtree.

**If `$ARGUMENTS` is empty**, scope is the entire project (default).

Mark task 1 `completed` and proceed to Phase 2.

## Phase 2 — Discover rule files

Use `Glob` to find all rule files within the resolved scope:

- `CLAUDE.md` at project root (and any `CLAUDE.md` within a scoped subtree)
- `.claude/rules/*.md` at any depth within the scope

Use `Read` to load each file. For each file, identify every rule bullet: lines
beginning with `- ` or `* `. Files with no rule bullets are skipped entirely.

If no rule files are found, tell the user: "No rule files found in scope." and
stop.

Mark task 2 `completed` and proceed to Phase 3.

## Phase 3 — Apply formatting transforms

For each file that contains rule bullets, apply all four transforms in order.
Work on the parsed bullets in memory — do not write files yet. Preserve any YAML
frontmatter and non-bullet content (headings, prose) exactly as-is.

### Transform 1 — Split multi-concept bullets

A bullet is multi-concept when it contains two or more independent directives
that could each stand alone as a complete instruction. Split it into separate
bullets.

**Split when** (apply conservatively — when uncertain, do NOT split):

- The bullet contains two complete sentences, each expressing a distinct
  instruction, separated by a period mid-bullet. Example:
  `"Use Vitest for all tests. Place test files adjacent to the source file."` →
  two bullets.
- The bullet has multiple distinct "when X, do Y" clauses joined by a period or
  semicolon with no shared subject.

**Do NOT split when**:

- The second clause is an exception or qualifier for the first. `"Prefer X,
  except when Y"` stays one bullet — the qualifier is part of the rule.
- The bullet contains an inline code example or elaboration of a single concept.
- Splitting would produce a bullet shorter than 8 words — too short to stand
  alone as an actionable directive.

### Transform 2 — Blank-line separation

Ensure exactly one blank line between consecutive bullets. Remove extra blank
lines (more than one) between bullets.

### Transform 3 — Sub-list restructuring

A long rule bullet that contains a single primary directive followed by
qualifications, exceptions, or examples should be restructured into a main
bullet with indented sub-bullets (`  - `). This makes the continuation
structurally unambiguous — indentation hierarchy tells Claude the sub-bullets
belong to the parent, rather than relying on Claude to track whether a sentence
ending in a period continues or terminates.

**Restructure when**:

- The bullet contains a primary directive followed by one or more of: a named
  exception, a concrete example, or a sub-case that is clearly subordinate to
  the directive rather than independent from it.
- The bullet is long enough that it would otherwise need line-wrapping to be
  readable.

**Do NOT restructure when**:

- The clauses are independent directives — Transform 1 handles those by
  splitting into separate bullets.
- The qualification is short enough to read naturally inline ("except in tests"
  or "unless the file is under 20 lines").

**Output format**: the primary directive becomes the top-level bullet; each
exception, example, or sub-case becomes an indented `  - ` sub-bullet beneath
it. Continuation lines are not an acceptable substitute — Transform 4 unwraps
them.

### Transform 4 — Unwrap continuation lines

A continuation line is any line inside a bullet item that begins with
whitespace and is NOT itself a sub-bullet (`  - ` or `  * `). For each bullet
(top-level or sub) whose body spans more than one source line via continuation
indent, collapse those lines into a single line per bullet.

**Detect when**:

- The bullet's content occupies more than one source line, AND
- The continuation lines start with whitespace but no `- ` or `* ` marker.

**Output**: join the wrapped lines with single spaces, producing one line of
text per bullet. Do not change the wording, do not split the joined text into
multiple bullets, do not introduce sub-bullets — those decisions belong to
Transforms 1 and 3 and have already run by the time Transform 4 executes on a
given pass. Treat any sub-bullet (`  - ` line) as its own bullet, with its own
potential continuation lines to unwrap.

**Apply this transform unconditionally** when the detect condition matches.
The prohibition is not contingent on the wrapped content containing a period,
a colon, or any other specific punctuation — continuation indent is
structurally ambiguous regardless of the wrapped text, because a reader (or
Claude) must distinguish it from sub-bullet indent. Sub-lists are the only
safe multi-line structure.

**Worked example**:

Input (two source lines, second begins with 2-space continuation indent):

```
- Before saving an `Edit` to an instruction file, Glob every backticked
  path in the new content.
```

Output (one source line):

```
- Before saving an `Edit` to an instruction file, Glob every backticked path in the new content.
```

Input with a continuation-indented sub-bullet:

```
- After invoking `Bash` with `mv`, Grep every instruction file for the
  original path before marking the task done.
  - When a match is found, update the citation to the new path or remove
    it.
```

Output:

```
- After invoking `Bash` with `mv`, Grep every instruction file for the original path before marking the task done.
  - When a match is found, update the citation to the new path or remove it.
```

### Build the diff

For each file where the formatted output differs from the original, record the
before (original bullets) and after (transformed bullets). If no transform
changed any content in a file, mark that file unchanged and exclude it from
Phase 4.

Mark task 3 `completed` and proceed to Phase 4.

## Phase 4 — Confirm and write changes

**If no files have changes**, tell the user: "All rule files are already
formatted correctly. Nothing to change." and stop.

Otherwise, present the diff for each changed file in this format:

```
## `path/to/file.md`

**Before:**
- Rule as it currently appears in the file.

- Before saving an `Edit` to an instruction file, Glob every backticked
  path in the new content.

**After:**
- Rule reformatted to one concept per bullet.

- Long rule with a qualifier restructured into a sub-list.
  - Exception: only when the binding site and all uses are visible on screen.

- Before saving an `Edit` to an instruction file, Glob every backticked path in the new content.
```

After presenting all diffs, MUST invoke `AskUserQuestion`:

- **question**: `"Found formatting changes in [N] file(s). Apply them?"` (substitute N)
- **header**: `"Apply lint"`
- **multiSelect**: `false`
- **options**:
  - `{ label: "Apply all", description: "Write the formatted version to all [N] file(s)" }` (substitute N)
  - `{ label: "Review each", description: "Confirm file-by-file before writing" }`
  - `{ label: "Cancel", description: "Discard all changes, leave files as-is" }`

**If "Apply all"**: use the `Write` tool to write every changed file. Then
report:

```
Formatted [N] file(s):
- path/to/file.md — [X] bullets reformatted
- path/to/other.md — [Y] bullets reformatted
```

**If "Review each"**: for each changed file in turn, MUST invoke
`AskUserQuestion`:

- **question**: `"Apply changes to [filename]?"` (substitute filename)
- **header**: `"Apply file"`
- **multiSelect**: `false`
- **options**:
  - `{ label: "Apply", description: "Write the formatted version of this file" }`
  - `{ label: "Skip", description: "Leave this file unchanged and move to the next" }`

Use the `Write` tool for each file the user picks "Apply". After all files,
report which were written and which were skipped.

**If "Cancel"**: tell the user "No changes applied." and stop.

Mark task 4 `completed`.
