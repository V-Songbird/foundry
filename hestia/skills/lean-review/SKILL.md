---
name: lean-review
description: Review the current diff for over-engineering only — what to delete, reuse, or simplify. One line per finding; never edits files.
when_to_use: Use when the user wants a simplicity-focused review of a change — "review this for over-engineering", "what can we delete", "is this over-engineered", "simplify review", or /hestia:lean-review. Complements correctness review; this one only hunts complexity.
allowed-tools: Bash, Read, Grep, Glob
---

# Lean review

Review a diff for one thing: unnecessary complexity. Find what to cut. This is read-only — report findings, never change files.

## Steps

1. **Get the diff.** MUST invoke `Bash` to run `git diff HEAD` (covers staged and unstaged changes). If the user named a range or specific files, diff those instead. If there is no diff, or this is not a git repository, ask the user what to review.

2. **Read the changed code in context.** For each non-trivial hunk, understand what it does before judging it — the smallest change in the wrong place is a second bug, not a win.

3. **Flag over-engineering.** For each finding, write one line:

   `path:line — TAG what. → what replaces it.`

   Tags:
   - `cut` — dead, speculative, or unreachable code; an abstraction with a single caller.
   - `reuse` — a helper, type, or pattern already in this codebase does it.
   - `stdlib` — the standard library does it.
   - `native` — a built-in platform feature (element, DB constraint, config) does it.
   - `inline` — collapse to fewer lines or fewer files.
   - `dep` — a new dependency that a few lines would replace.

4. **Tally.** End with one line: `≈ -N lines / -M deps if applied.`

## Boundaries

Never flag input validation at trust boundaries, error handling that prevents data loss, security, accessibility, or anything the user explicitly asked for. Those are not over-engineering.
