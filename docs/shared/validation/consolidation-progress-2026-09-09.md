# Consolidation progress — 2026-09-09

The active objective is to finish the repository reconciliation without changing
plugin internals or runtime behavior. This is progress evidence, not a claim that
all audit findings or publication steps are complete.

## Runtime boundary

A baseline records 435 protected files across the six platform checkouts and
Flint. Product hooks, skills, runtime scripts, functional tests, manifests,
runtime reference files and assets remain unchanged. Development git hooks,
CI and ordinary maintenance documentation are a separate surface.

The baseline and comparison tool are in `.scratch/consolidation/`. The check
passed after this phase. No plugin installation or model benchmark was run.

## Applied in this phase

- Both release skills now embed one shared, edition-aware release workflow.
  Claude catalog versions and Codex manifest versions have their actual owners;
  publication targets the selected edition rather than a hard-coded main push.
- Explicit-only release invocation is preserved through each host's native
  metadata. The Codex skill passes the official skill validator.
- Manifest-curator and roadmap-implementer use matching native instruction
  bodies, actual catalog paths and proper platform scope. The old mechanical
  Codex substitutions and experimental release instructions were removed.
- The project layout policy now agrees with that release ownership.
- The project-only version guard no longer rejects native Codex versions or
  forbids publishing research merely because it is under results/records.
- Root documentation is versionable; Razor's existing SETUP.md is no longer
  omitted by its ignore rules. Publication review of the complete research
  material and the remaining name-policy reconciliation are still pending.
- Historical Hush probes resolve their shared helpers, expose safe help paths
  and explain when a retired API requires an explicit compatible source checkout.
  The paid delta probe requires explicit live-run opt-in and a source directory.
  Default new outputs no longer overwrite the retained historical snapshots.
- CI commands now include the new maintenance-guard and probe-loading tests.

## Verification

- The updated maintenance CI command passed all 158 tests.
- Six version/publication-guard tests passed.
- Seven historical-probe loading, help, source-selection and opt-in tests passed.
- Shared release bodies, explicit-only policies and both maintenance-agent pairs
  agree; native metadata parsed and the Codex release skill validated.
- All 435 protected plugin files still match the baseline.

## Remaining work

### Subsequent development-hook phase

The shared test hook now resolves both edition manifests and deep worktrees,
runs in the owning checkout and reports timeout separately. Codex patch payloads
and multi-edition edits have tested handling. Native `.codex/hooks.json` binds
the same three development checks as Claude. The full maintenance suite now
passes 169 tests; all 435 protected files remain unchanged. See
[development-hook verification](development-hooks-2026-09-09.md). Client trust
review and live activation remain unverified; hook detection itself is no
longer an open local defect.

The broad goal remains active. The remaining audit work includes publication
curation and remaining ignore/name rules, development-hook detection and native
bindings, worktree-aware maintenance copies, public/standalone references and
ADR ownership, GitHub-compatible anchors, paired-PR validation, satisfiable main
selector checks and the final integration/publication sequence. Remote settings
and project commits were not changed in this phase.
