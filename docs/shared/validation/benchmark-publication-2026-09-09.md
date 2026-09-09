# Benchmark evidence publication preparation — 2026-09-09

Existing evidence is now prepared for public version control under Foundry,
outside installable plugin packages. Raw execution folders remain available
locally; their public copies use deterministic archives rather than thousands
of additional loose trace files.

| Evidence | Distribution |
| --- | --- |
| Foreman records | Directly versionable, original bytes |
| Foreman results and picks/results | 37 archives, 1101 files, 3473011 compressed bytes |
| Hush records and records-archive | Directly versionable, original bytes |
| Hush results | 214 archives, 15601 files, 121831883 compressed bytes |
| Razor results | Three directly versionable report/result files |
| Execution workspaces, dependencies and account/session state | Remain local |

Each archive has a SHA-256 in its inventory. Every member has its own original
path, size and hash. Packaging checks all member bytes against the source and
refuses to replace an existing archive with different evidence. No archive is
90 MB or larger. Raw source files were not rewritten or deleted.

A targeted scan covered 23495 retained evidence files and found no matches for
the credential formats checked. That is a bounded automated check, not a claim
to detect every possible secret. The inventory found no account/config files or
dependency directories in these selected evidence folders. Recorded local paths
and synthetic test inputs remain historical evidence, not active configuration.

Two full third-party text copies were replaced with attributed source indexes:
the voice reference README and the Fable field-guide article. Their original
copies remain in `.scratch/consolidation/third-party-source-copies/`. These
indexes preserve the recorded source and do not claim the external URLs or
historical publication dates were freshly verified.

The public archive inventories live under `benchmarks/foreman/datasets/` and
`benchmarks/hush/datasets/`. Local scan evidence is in
`.scratch/consolidation/benchmark-publication-inventory.json` and
`benchmark-credential-candidates.json`. This is local publication preparation;
no GitHub upload, commit, installation or model run occurred.
