# Retained Hush execution outputs

These 214 archives preserve 15601 files from `results/`, including reports,
measurements and execution traces. They occupy 121831883 compressed bytes rather
than 670551522 raw bytes. The [inventory](inventory.json) records every original
path, size and SHA-256, plus each archive's hash.

Archives contain paths relative to Foundry. Extract a selected archive into a
separate directory to inspect its original `benchmarks/hush/results/...` tree
without overwriting a newer local run. Structured records and archived record
sets remain directly available in `../records/` and `../records-archive/`.

These are historical observations, not new measurements or a claim that the
Codex edition is available. Model names, dates, failures and settings remain
unchanged. Foundry's `scripts/package-benchmark-evidence.py` creates deterministic
archives; `--verify` compares them with retained raw files and checks every
archived file's bytes.
