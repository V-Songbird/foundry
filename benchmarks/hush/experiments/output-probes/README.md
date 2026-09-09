# Historical Hush output probes

These programs describe earlier experiments, including APIs retired from the
current Hush implementation. Their recorded results retain that original scope.
Do not change the plugin or substitute current behavior to make an old probe run.

- Corpus and flatten probes read a selected transcript corpus. Set HUSH_DIR to
  a compatible retained source revision and select explicit input/output paths.
- The delta probe can spend paid model usage. It requires both HUSH_DIR and
  --allow-live; use a separately authorized run and a new output tag.
- Every entrypoint supports --help without reading user transcripts or starting
  a session. Missing legacy exports produce an explicit compatibility error.

The common transcript helpers remain importable without loading an old plugin.
The maintenance tests verify loading, help, source selection and the live-run
guard. They do not reproduce or certify the historical measurement.

New reports default to fresh output-probes run directories under the central
Hush results folder. The retained historical result snapshots are not overwritten
by a default invocation.
