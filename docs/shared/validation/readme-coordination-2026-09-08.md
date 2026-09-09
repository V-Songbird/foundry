# README coordination — local verification, 2026-09-08

## Result

Foreman, Hush and Razor now have matching common README content in their Claude
and Codex working copies. Both editions use the same section order, common
product outcomes, decorative assets and benchmark table columns.

Only the six native exception blocks differ. Their purposes are recorded in
[ADR 0008](../adr/0008-coordinated-plugin-readmes.md).

The checkouts remain those listed in
[the platform-isolation report](platform-isolation-2026-09-08.md). Originals and
branding backups are in `.scratch/readme-coordination-before-2026-09-08/`.

## Evidence used

| Plugin | Claude edition | Codex edition |
| --- | --- | --- |
| Foreman | Historical Sonnet and Opus task-paragraph comparison from the 2026-08-29 proof report; no correctness advantage and higher cost | Comparable performance marked Not measured; functional validation remains distinct |
| Hush | Retained Opus 5 front-page dataset, with its original correctness, narration, word counts and losses | Not measured; no installable package yet |
| Razor | Retained Opus 5 front-page dataset, including actual cost and readability limits | GPT-5.6 Sol/high full task group: 19/26 baseline versus 26/26 Razor; mean coding LOC 19.2 versus 9.6 |

The Hush and Razor Claude front-page excerpts do not identify their experiment
dates. Their declarations use `date: unknown`, explain the gap, and separately
record the review date and original Git revision. They are not mixed with the
different runs in the full benchmark guides.

Sources:

- [Foreman proof report](../../foreman/research/foreman-proof-axes-2026-08-29.md)
- [Hush retained Claude source](../../hush/validation/claude-readme-benchmark-source-2026-09-08.md)
- [Razor retained Claude source](../../razor/validation/claude-readme-benchmark-source-2026-09-08.md)
- [Razor native Codex source](../../razor/validation/codex-benchmark-source-2026-09-08.md)

## Enforcement files

- Root `AGENTS.md` directly states Codex's coordination requirements.
- `.claude/rules/readme-parity.md` states the matching native Claude rule.
- Each Claude plugin checkout has its own native rule; each Codex checkout has
  the requirement in AGENTS.md. Platform-isolation requirements remain intact.
- Both `.claude/skills/coordinate-readmes/` and `.agents/skills/coordinate-readmes/`
  contain the same skill text.
- The two doc-consistency-reviewer definitions embed the same review criteria
  from `.github/readme-review-instructions.md`.
- Both cut-release skill entries include the pair-verification gate.
- The shared template and public README rule now agree on section order,
  voice and benchmark presentation, replacing contradictory older clauses.

The CLI is `scripts/git-hooks/check-readme-parity.js`. Use --pair with two local
README paths or --git-pair with a plugin repository and two committed refs.
Each plugin carries the checker, tests and its README coordination workflow;
Foundry carries the three-pair workflow.

## Verification boundary

All three local pairs pass. The 13 checker tests cover shared-text drift,
exception boundaries, model provenance, table columns, missing results, source
dates and actual committed-branch comparison. README navigation passes for all
six pages. The official skill validator accepts both new skill copies. YAML and
TOML parse, reviewer instructions agree, native rules and six workflow copies
match, common branding bytes match, and local README file links resolve.

No model benchmark was run and no existing measurement was relabeled. These
checks establish local documentation consistency, not agent adherence in a fresh
session or runtime parity. GitHub workflows are prepared locally; they have not
run remotely. No commit, push, required-status setting or Git-ignore change was
made during this step.
