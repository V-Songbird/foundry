# Shared project records — 2026-09-09

Foundry's planning records are now eligible for version control:

- `ROADMAP.jsonl`: the collection's one active roadmap.
- `.foreman/config.json`: shared project preferences, retained without changes.
- `.foreman/notes.jsonl`: task-linked lessons, retained without changes.
- `.foreman/archive.jsonl`: archived task history, if created by Foreman's CLI.

The archive does not currently exist; no empty store was manufactured. Trial
logs, session markers, locks and other execution state remain ignored. Nested
plugin project stores and scratch copies remain excluded. These exceptions are
specific to Foundry, not a change to how installed plugins store user projects.

Git's versionable-file listing includes the three existing records. A null-
delimited check-ignore probe verifies all four allowed paths and six excluded
temporary/nested paths. The files were not rewritten by this change. Doctor
still reports zero errors and five historical warnings. All 435 protected
product files remain unchanged.

This closes the ignore-rule omission; it does not claim the files have already
been committed or published. Their inclusion belongs to the reviewed Foundry
integration, alongside the documentation that references them.
