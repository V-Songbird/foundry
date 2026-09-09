# Benchmark organization — local verification, 2026-09-08

## Layout

The collection has one benchmark tree, [benchmarks/](../../../benchmarks/README.md),
with Foreman, Hush and Razor suites. The previous layout combined public harnesses,
plugin-owned harnesses, experiments and administrative backups under similar names.

| Previous location | Current location |
| --- | --- |
| `benchmarks/foreman/` | Retained as the central Foreman suite |
| `benchmarks/hush/` | Retained as the central Hush suite |
| `foreman/benchmarks/records/` format and validator | `benchmarks/foreman/validation/` |
| Foreman's record-validator test | `benchmarks/foreman/tests/` |
| `razor/benchmarks/` | `benchmarks/razor/` |
| Razor's six benchmark test files | `benchmarks/razor/tests/` |
| `.benchmarks/` Hush comparison tooling and outputs | `benchmarks/hush/experiments/voice-comparison/` |
| `.benchmarks/` Hush output probes and results | `benchmarks/hush/experiments/output-probes/` |
| `.benchmarks/razor-vs-ponytail/` | `benchmarks/razor/experiments/dependency-comparison/` |
| `.benchmarks/foreman-craft/` and `foreman-handoff/` | `benchmarks/foreman/experiments/` |
| Shared Python configuration loader | `benchmarks/config_loader.py` |
| Administrative backups, logs and validation dependencies | `.scratch/` |

The former `.benchmarks/` root directory and all plugin-level benchmark trees
are absent. Redundant Claude worktree copies were retained under the migration
archive rather than overwritten or discarded. The Codex Razor harness is the
central superset, retaining the common Claude instruments and separate native
Codex runners. No benchmark source was copied into Hush's unavailable Codex package.

Functional product tests remain in each plugin. Measurement-tool tests now run
from Foundry, so installing a plugin does not pull in its benchmark research.
Retained result files keep their recorded model, source revision and limitations.
Historical experiments are not newly validated live comparisons.

## References and controls

Runner paths now distinguish the central harness directory from the selected
plugin checkout. Razor accepts RAZOR_DIR and defaults to Foundry's razor checkout;
its native and Claude entrypoints keep their respective scope. The Foreman
record validator accepts FOREMAN_DIR for the source files whose hashes it checks.

Public plugin guides link to the central Foundry harness. Root indexes explain
the supported lanes and the historical experiments. Native rules direct future
benchmark work to Foundry; the existing platform-layout CLI rejects root-level
benchmarks or .benchmarks trees in a plugin while permitting nested test examples.

The root roadmap retains 292 entries. Only benchmark/scratch path references
changed in 41 entries; IDs, titles, statuses, dependencies, dates, commits and
source fields were preserved. Doctor still reports zero errors and the same
five pre-existing warnings.

The old `.benchmarks/` exclusion now names `.scratch/`. Other publication
exclusions were not broadened or removed during this move. No files were staged,
committed or pushed.

## Verification

- 80 relocated benchmark-instrument tests passed without model sessions.
- 1,337 Foreman functional tests passed; its 22 record tests now live in Foundry.
- 349 Razor functional tests passed; its 58 measurement tests now live in Foundry.
- 14 layout-checker tests passed and all six platform checkouts pass the rule.
- All three README pairs still match outside their native exceptions; navigation passed.
- Thirteen maintained or adjusted JavaScript entrypoints pass syntax checks.
- The new CI workflow YAML and adjusted Python comparison entrypoint parse.
- Git whitespace checks pass for the root and affected plugin worktrees.

The CI workflow for the moved instruments is prepared in Foundry. It uses
Razor's Codex source branch for native offline cases and does not run paid model
comparisons. It has not run on GitHub as part of this local work.

## Preservation

The move inventory covers 36 groups and 289,253 files, including retained
experiment workspaces and the peer-branch archives. The initial move checked
file sizes and SHA-256 for files below 1 MiB before reference updates. Original
copies were retained for edited references. Frozen fixtures and candidate-arm
sources were restored from their original snapshots wherever a generic reference
update had touched them; probe measurement snapshots were also retained verbatim.

The inventory, preserved peer copies, reference backups and test logs are under
`.scratch/benchmark-reorganization/`. Earlier document, README and roadmap
backups remain under `.scratch/` with their existing names. They are historical
evidence, not current scripts to rerun blindly. No experimental model session,
package installation inside a benchmark, or remeasurement was performed.
