# Plugin decision relocation — 2026-09-09

Plugin-specific contracts now accompany their edition. Foundry retains research,
measurement reports and small decision indexes linking to the owners.

| Previous Foundry path | Current owner and path |
| --- | --- |
| `docs/foreman/adr/SCOPE.md` | Both Foreman editions: `docs/adr/SCOPE.md` |
| `docs/foreman/adr/NANOTASKS-RECONCILED.md` | Foreman/Codex: `docs/adr/NANOTASKS-RECONCILED.md` |
| `docs/hush/adr/0001-source-capture-before-history.md` | Hush/Codex: `docs/adr/0001-source-capture-before-history.md` |

Foreman's common scope copies are byte-identical. The incremental-acceptance
contract is exclusive to Codex and was not added to Claude. Hush's ADR remains
closed; no package or runtime was added to its unavailable Codex edition.
Foreman's two ignore files now permit distributing `docs/adr/`.

The moved documents preserve their decisions and status. Only their outbound
research links were adjusted to Foundry URLs. Those URLs and the Hush/Codex link
depend on the pending publication sequence; this local relocation does not
claim they are already reachable remotely.

## Roadmap continuity

The installed Foreman CLI updated current document pointers and the active
planned-file surface. Entries 245, 302–308 and 301 received a relocation note.
Terminal entries retain their historical planned and observed paths. This map
explains those paths; their absence now is not a claim that the old work never
happened.

All 292 entries were retained. An explicit before/after comparison verified
unchanged statuses, dependencies, commits, observed paths, creation dates,
titles, descriptions, kinds and recorded model/effort. Existing notes remain
as a prefix; new notes are appended. Entry 301 is still `awaiting_acceptance`.
Doctor reports zero errors and the same five pre-existing warnings.

Backups and the move inventory are in `.scratch/consolidation/adr-before/` and
`adr-moves.json`; roadmap evidence is in `roadmap-before-adr.json`,
`roadmap-adr-relocation-result.json` and `roadmap-after-adr-doctor.json` in that
same scratch directory. All 435 protected product files remain unchanged.
