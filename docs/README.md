# Foundry documentation

Find the documents for the plugin you are working on:

- [Foreman](foreman/README.md)
- [Hush](hush/README.md)
- [Razor](razor/README.md)
- [Shared Foundry material](shared/README.md)

## Where documents belong

Each plugin archive contains research, launch material, validation evidence,
task documents and an index of its decisions. Plugin-specific contracts live
in the plugin's own `docs/adr/`: on `main` for a package such as Foreman, or in
the corresponding edition for a plugin with editions. Shared studies and decisions have one home under
`shared/`; this includes studies that involve Flint and Hush together.

Claude and Codex use the same archive. A platform-specific report stays under
its plugin and identifies the platform, date and revision it covers. Moving a
report does not make its measurements current or establish parity between hosts.

Usage guides and plugin-specific decisions stay with the plugin source so they describe the checked-out
version. A plugin with editions uses `main` as its public front page, with product
documentation on `Claude` and `Codex`; Foreman's `main` carries its product
documentation for both hosts. The central archive
is independent of which plugin branch is checked out.

## Reading existing records

Document dates, ADR identifiers and historical verdicts are preserved. Read the
latest applicable contract and evidence before acting on older plans. The
[research status register](shared/research/research-index.md) retains the earlier
cross-plugin index and its status annotations.

Research helpers live in `research/scripts/`, launch assets in
`launch/assets/`, and validation helpers in `validation/scripts/`. Benchmark
instruments and retained evidence live under Foundry's `benchmarks/<plugin>/`;
large execution outputs are distributed as verified dataset archives.

Research, retained evidence and shared project records are prepared for public
version control. Temporary workspaces and session state remain local. See the
[current reconciliation status](shared/validation/reconciliation-status.md)
for verified work and remaining integration boundaries.
