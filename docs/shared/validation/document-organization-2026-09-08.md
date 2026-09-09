# Local documentation organization — 2026-09-08

## Result

625 existing files now live under `docs/foreman/`, `docs/hush/`, `docs/razor/`
or `docs/shared/`. The old top-level research, launch, ADR and Codex dossier
directories are gone. Each owner has an index and category indexes.

- Research, proposals and implementation dossiers belong to the plugin archive.
- Cross-plugin work has one home in the shared archive, including Hush/Flint studies.
- Decisions retain their identifiers and platform scope.
- Validation reports retain their dates, revisions and acceptance boundaries.
- Foreman's numbered task documents live in `docs/foreman/tasks/`.
- Research and validation helpers have `scripts/` folders; launch assets stay
  with their plugin in `launch/assets/`.
- Raw experiment records remain beside their inputs, unchanged.
- Product usage guides remain with the checked-out plugin source. Razor's
  installation guide is now `razor/docs/SETUP.md`; its dated implementation
  handoff is archived under Razor's validation documents.

The [complete move inventory](document-moves.json) records every source,
destination and original SHA-256 hash. The [documentation index](../../README.md)
is the entry point for the reorganized archive.

## Verification

- All 625 files were verified byte-for-byte immediately after moving them,
  before updating references. Every original is also preserved in the backup.
- Raw benchmark records remain byte-identical after the reference updates.
- Local Markdown file links were checked against the before-move inventory:
  no newly broken links were introduced. URL reachability and heading anchors
  in historical reports were not revalidated.
- Public README navigation checks passed for the edited Foreman and Razor pages.
- Moved JavaScript helpers passed syntax checks. The three mascot scripts
  generate byte-identical SVG content and target their new asset directories;
  the check intercepted writes and produced no artwork files.
- The reference-name guard passed 36 tests, including lookup from the parent
  repository and a plugin, and equality of all three plugin copies.
- The parent roadmap changed only through exact document-path substitutions.
  Its ledger directory now explicitly points at `docs/foreman/tasks/`.
- Git whitespace checks passed in Foundry and the three plugin worktrees.

## Existing historical references

Nine links already targeted files or checkouts absent before this work. They
remain in the original reports as historical references; their contents were
not recreated and the reports were not reinterpreted as current validation:

| Report | Missing historical target |
| --- | --- |
| Foreman Codex port dossier | `plugins/foreman-codex/` |
| Foreman nanotask evidence | `foreman/test-results/nanotasks/evidence.json` |
| Foreman nanotask evidence | `foreman/test-results/nanotasks/node-tests.tap` |
| Hush product contract, 2026-07-27 | `hush/hooks/narration-meter.js` |
| Hush product contract, 2026-07-27 | `hush/scripts/stats.js` |
| Hush product contract, 2026-07-27 | `hush/skills/hush-compress/SKILL.md` |
| Hush product contract, 2026-07-27 | `hush/benchmarks/` |
| Razor Codex port dossier | `plugins/razor-codex/` |
| Razor Codex port dossier | `razor/skills/razor-unused/SKILL.md` |

Links shown as example output and images in the verbatim third-party voice
reference are reference material, not navigation to local product files.

## Local scope and recovery

The root changes are on `codex/organize-plugin-docs`. Plugin working branches
remain Foreman `Codex`, Hush `Claude` and Razor `Codex`; inactive branches were
inspected but not rewritten. No commit, merge, push or Git-ignore change was made.

The original untracked `foreman/ROADMAP.jsonl` is unchanged.

Backup and verification artifacts are under
`.scratch/docs-reorganization-2026-09-09T01-52-13-829Z/`. The backup contains
the original files, move inventory and verification results. Do not restore the
entire backup over later work; use the inventory to recover individual files.
