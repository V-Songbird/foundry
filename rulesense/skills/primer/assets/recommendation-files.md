---
default-category: mandate
---

# Recommendation File Hygiene

Rules that keep Claude's understanding of the project synchronized with its own
instruction files. CLAUDE.md, README.md, AGENTS.md, and `.claude/rules/*.md`
are first-class state for Claude — they go stale faster than the code they
describe, and Claude trusts them as authoritative when they load on the next
session.

- After renaming, moving, or deleting any file or folder, re-read every
  CLAUDE.md, README.md, AGENTS.md, and `.claude/rules/*.md` file inside the
  affected scope before reporting the task done, because instruction files
  frequently embed paths that silently rot when the layout shifts.

- When citing any file or directory path in a response, status update, or
  commit message, verify it resolves with Glob or Read before stating it as
  fact, because instruction files and prior conversation memory often retain
  paths that have been refactored away.

- When editing CLAUDE.md, README.md, AGENTS.md, or any file under
  `.claude/rules/`, verify every file path the document cites still exists
  using Glob before saving the edit, because instruction files accumulate
  stale paths over time and silently mislead future sessions.

- When opening an unfamiliar project for the first time in a session, list
  all CLAUDE.md, README.md, AGENTS.md, and `.claude/rules/*.md` files using
  Glob before making any structural assumptions, because recommendation files
  in a single repository sometimes disagree with each other and with the
  actual code layout.
