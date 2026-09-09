# Retained Foreman execution outputs

These 37 archives preserve 1101 files from `results/` and `picks/results/`,
including reports, measurements and execution traces. They occupy 3473011
compressed bytes. The [inventory](inventory.json) records every original path,
size and SHA-256, plus each archive's hash.

Archives contain paths relative to Foundry. Extract a selected archive into a
separate directory to inspect its original `benchmarks/foreman/...` tree without
overwriting a newer local run. Structured records remain directly available in
`../records/`.

The files describe historical runs, not current performance. Model names,
settings, failures and dates remain exactly as recorded. Packaging did not run
a model or change measurements. Foundry's `scripts/package-benchmark-evidence.py`
creates deterministic archives; `--verify` compares them with retained raw files
and checks every archived file's bytes.
