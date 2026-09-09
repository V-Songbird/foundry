# 0004 — Benchmark run data stays local; repos publish the harness only

Date: 2026-08-11 · Status: superseded by [ADR 0009](0009-public-research-and-evidence.md) · Owner: Victor Villegas

The decision below is retained as history. ADR 0009 governs current publication;
do not use this retired restriction to hide research or block source names.

## Decision

No public repo in this marketplace — the parent or any plugin submodule —
commits benchmark run data. That covers results, transcripts, per-run JSON,
retained/hashed records, generated claim sets, published claims.md files, and
measurement logs. What publishes is the **harness**: tasks, fixtures, runners,
record formats, validators, settings, and their tests, so anyone can
regenerate every number themselves.

## Context

Through 2026-08-10 the policy was the opposite: records were committed as the
tamper-evident evidence behind README claims (hush kept ~2000 record files;
foreman published R-### records; razor froze per-cell v1 records). The owner
decided on 2026-08-11 that run data does not belong in the public repos —
only the setup behind the published tables.

## Consequences

- hush: `benchmarks/hush/records/`, `records-archive/`, `results/` gitignored
  in the parent repo; the readiness gate reads records from disk at release
  time (parent commit 65c198d, then 00fb537).
- foreman: `benchmarks/records/*.json` removed and ignored; the record format,
  validator, and rules README stay (foreman de7a937). The parent-side
  `benchmarks/foreman/picks/results/` output is removed and ignored too.
- razor: `benchmarks/records/*.json` removed, `records/` ignored, the
  benchmarks README reworded to local-records language (razor b4e5fc0).
- Enforcement: committed rule `.claude/rules/benchmark-data.md` + per-harness
  `.gitignore` entries. Note the reference-name commit gate exempts only
  `benchmarks/<plugin>/records/` — moved/archived record trees hard-block.
- Git history still contains the previously committed data on all three
  repos; erasing it needs an owner-approved force-push, deliberately not done
  here.

Supersedes the committed-records clauses implied by ADR 0001/0002/0003's
"plotted from committed records" wording — graphics still plot from real
records, which now live locally.
