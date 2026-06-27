---
name: lean-audit
description: Scan the whole repository for over-engineering — a ranked list of what to delete, simplify, or replace with stdlib/native equivalents. Read-only; applies no fixes.
when_to_use: Use when the user wants a repo-wide simplicity scan — "audit this codebase for over-engineering", "what can I delete from this repo", "find bloat", or /hestia:lean-audit.
allowed-tools: Bash, Read, Grep, Glob
---

# Lean audit

Scan the codebase for unnecessary complexity and report a ranked list, biggest cut first. Read-only — never edit.

## Steps

1. **Survey the codebase.** Use `Glob` and `Grep` to map the structure and find candidates: reinvented standard-library behavior, interfaces or factories with a single implementation, unused or barely-used dependencies, dead code, speculative configuration, and deep wrapper layers.

2. **Read before judging.** Confirm each candidate actually is what it looks like before flagging it.

3. **Report, ranked by impact (biggest cut first).** Use the same tags as lean review:

   `path:line — TAG what. → what replaces it.`

   (`cut`, `reuse`, `stdlib`, `native`, `inline`, `dep`.)

4. **Tally.** End with one line: `≈ -N lines / -M deps possible.`

## On large repositories

If the repo is too big to read fully, scan the largest and most central areas first and state plainly what you sampled and what you skipped. Never imply coverage you did not do.

## Boundaries

Never flag validation at trust boundaries, error handling, security, accessibility, or explicitly requested behavior.
