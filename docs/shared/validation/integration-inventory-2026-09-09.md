# Integration inventory and recovery snapshot — 2026-09-09

The current working changes are accounted for by repository and branch. This is
an inventory of existing work, not authorization to stage every file blindly.
It records the exact HEAD and SHA-256 of each present changed/untracked file,
and identifies deletions and nested repository entries separately.

| Scope | Tracked changes | Untracked files |
| --- | --- | --- |
| Foundry | 36 | 8312 |
| Foreman/Codex | 18 | 12 |
| Foreman/Claude | 12 | 14 |
| Hush/Claude | 6 | 11 |
| Hush/Codex | 1 | 14 |
| Razor/Codex | 29 | 11 |
| Razor/Claude | 18 | 11 |
| Each of the three main drafts | 1 | 2 |
| Flint | 0 | 0 |

Counts describe the captured snapshot, before this report was added. Foundry's
roughly 151 MB of present changed files consist mainly of retained benchmark
evidence (about 146 MB); the largest new file is a 4.7 MB dataset archive. The
remaining groups are documentation, roadmap/lessons, shared maintenance scripts,
native development instructions and workflow metadata.

## Preservation

`.scratch/consolidation/integration-manifest.json` records the complete inventory.
`integration-working-files.tar` in that directory contains 8472 present files
plus the manifest. Every archived file was verified against its recorded hash.

Archive SHA-256:
`b3c7308561393dca54e113f21addbc14b8f656f08f47d64e81e343bfdaeb273c`

The snapshot is 161556480 bytes. It preserves working files rather than replacing
Git history: retain the repositories and their recorded HEADs to interpret
deletions and ancestry. Later edits need their own updated inventory. This
report itself was written after the snapshot.

## Integration boundaries

Review and commit each edition independently; a Foundry commit cannot capture
another worktree's modified files. Preserve all common README candidates and
their reciprocal PR metadata. Keep the three main drafts separate from product
editions. Keep Flint untouched.

The plugin manifests and runtime remain outside this change. If a release needs
new package version metadata or reinstallation, prepare it as an explicitly
scoped release step rather than silently including it in documentation cleanup.
Publish and verify edition destinations before selectors and catalog pins.
Apply the already prepared ruleset proposal only after checking current remote
state and actual Actions names/results.

No real repository was staged, committed, merged or pushed for this snapshot.
No worktree, branch or backup was deleted. Client trust and remote integration
verification remain outstanding.
