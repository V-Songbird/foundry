# Foundry roadmap consolidation — 2026-09-08

Foundry's root [ROADMAP.jsonl](../../../ROADMAP.jsonl) is the active development
roadmap for the collection. The former `foreman/ROADMAP.jsonl` has been retired
after its eight entries were imported and verified.

## Identity map

The root had 284 entries and the plugin had eight. Seven IDs named different
tasks in the two stores. Existing Foundry IDs were preserved. Source ID 301 was
free in Foundry, so it was kept; the seven collisions were allocated after the
highest ID used by either history.

| Original Foreman-local ID | Foundry ID | State at consolidation |
| --- | --- | --- |
| 294 | 302 | done |
| 295 | 303 | done |
| 296 | 304 | done |
| 297 | 305 | done |
| 298 | 306 | done |
| 299 | 307 | done |
| 300 | 308 | done |
| 301 | 301 | awaiting_acceptance |

The consolidated roadmap contains **292 entries**. Entry 301 remains a decision
awaiting the user's acceptance of the whole Codex feature. This bookkeeping
operation does not supply that acceptance.

## History and scope

Imported titles, descriptions, source, kind, creation/update dates, commits and
original notes were preserved. Dependency IDs were remapped only within the
imported group. Planned and observed paths now resolve from Foundry, using the
earlier document-move inventory where applicable. Document pointers resolve to
the existing reconciled contract. Each imported entry has an appended origin
note naming its previous checkout scope and ID.

Existing Foundry entries were preserved during import. Entries 295–299 then
received CLI annotations linking the related Codex work, without changing their
planned state or treating the original look/expected specification as completed.
The two plans are related but differ in their contract and platform integration.

Historical notes and evidence keep the IDs used when the events happened. The
current operating table in the nanotask contract uses the new Foundry IDs; its
historical section and the superseded proposal are explicitly labeled. Existing
Git commits and trailers were not rewritten. No matching current source-code
anchors for the colliding ID set were found in Foreman's scripts, hooks or skills.

## Verification

- Authoritative CLI reads found 284 root entries, eight source entries and no
  active archive entries in either project.
- A preflight copy was written and read back with Foreman's own parser, lock,
  schema validator and atomic writer. All existing entries matched their
  original values and all imported metadata matched the preservation rules.
- The live write used both project locks and compared input hashes against the
  preflight before changing either store. The nested file was removed only
  after the root readback, structural check and original-file backup passed.
- Final CLI reads confirm all eight imported tasks, remapped dependencies and
  entry 301's awaiting_acceptance state.
- `doctor` reports **0 errors and the same 5 pre-existing warnings**. These are
  the legacy source value on 082, missing historical evidence on 085 and 267,
  similar titles on 070/072, and the Codex checker's unknown fableEnabled setting.
  No evidence was invented and no unrelated setting was removed to silence them.

The ordinary CRUD CLI has no history-import verb that preserves original dates
and completed states. This one-off import used the installed roadmap.js exported
storage operations rather than reconstructing completed tasks through new
add/accept transitions. Subsequent annotations and checks used the normal CLI.
No installed plugin code or general project-resolution behavior was changed.

## Recovery and future work

Exact originals, input hashes, the mapping, preflight and final checks are in
`.scratch/roadmap-reconciliation/`. Original files are named
`backup/foundry-before.jsonl` and `backup/foreman-before.jsonl`, so they are not
mistaken for active project roadmaps. Recover selectively; do not overwrite later
work with the whole backup.

Native project instructions now direct Foundry development to the root roadmap.
This applies to maintaining the collection, not to the independent projects
where users install Foreman, nor to its isolated test fixtures.

No task was newly accepted, no task commit was created and nothing was pushed.
