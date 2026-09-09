# Reference repair verification — 2026-09-09

The current scan covers 891 maintained files and 593 local references. It reports
zero package escapes, ignored destinations, unresolved heading fragments and
missing Node workflow targets. Its one missing-path candidate is the contributor
template's `./CODE_OF_CONDUCT.md`, which resolves in the plugin root when the
template is used. It is not a broken distributed guide.

## Repairs

- Foreman's Codex guide uses Foundry URLs for its two external evidence links,
  rather than assuming a sibling documentation folder in an installed package.
- Two CHANGELOG benchmark links point to a retained immutable Git revision.
- The nanotask evidence JSON and TAP log were recovered byte for byte from two
  matching migration backups and now sit beside the report.
- Retired standalone Codex package locations are identified as historical paths
  in the port dossiers instead of presented as working links.
- Removed Hush/Razor source targets link to retained Git objects. The added
  maintenance notes distinguish those revisions from the original measurement
  or review revision; no historical outcome was reassigned to newer code.
- Retained benchmark excerpts resolve their image/harness links at the source
  commits recorded in their headers. Benchmark wording and values were retained.

## Product boundary

The original 435-file hash baseline was not replaced. Of those files, 434 remain
byte-identical. `foreman/CODEX.md` differs only in two link destinations.
Reversing those exact substitutions reproduces its original baseline hash;
all other bytes are checked. The exception and original guide are preserved in
`.scratch/consolidation/documentation-link-exception.json` and
`CODEX-before-link-repair.md`. No product logic, instructions, tests, skills,
hooks, manifests or assets changed as part of this repair.

## Limits

This scan excludes large generated experiments and historical execution data.
It is not a complete Markdown parser or an exhaustive internet-link crawler.
New Foundry URLs and edition branches still require publication; local Git-object
existence is not proof of remote reachability. Those dependencies remain part of
integration. Evidence: `.scratch/repo-audit/scan-current.json` and
`.scratch/consolidation/references-after-cleanup.log`.
