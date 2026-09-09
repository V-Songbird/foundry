# Foundry reconciliation status

Updated 2026-09-09. The reorganization and publication are integrated. Public
main pages now carry the complete shared product story and animation, with
edition-specific installation and evidence linked separately. Dated reports
describe individual phases; the remaining client verification is listed below.

Read the [release progress](release-progress-2026-09-09.md)
for current versions, published pins and Codex installation proof. Foreman's
Windows launcher correction now passes CI. The three main selectors are merged
and six platform rulesets are active. Temporary approval-count changes were
restored immediately after each authorized merge. Both Foundry integration PRs
and the two rounds of plugin main-page PRs are merged. The four publication
checks passed on Foundry's merged main. Temporary integration branches and main
worktrees were removed after tree comparisons and verified Git-history backups;
the Claude/Codex development branches remain available.

## Implemented and checked locally

| Area | Evidence |
| --- | --- |
| Integration inventory and recoverable working files | [Inventory and snapshot](integration-inventory-2026-09-09.md) |
| Six independent editions and maintained-copy enforcement | [Export verification](independent-editions-2026-09-09.md) |
| Shared release workflow and native reviewers | [Instruction reconciliation](consolidation-progress-2026-09-09.md) |
| Development hooks, native payloads and deep worktrees | [Hook verification](development-hooks-2026-09-09.md) |
| Public source attribution policy | [Policy reconciliation](public-research-policy-2026-09-09.md) |
| Plugin-specific ADR ownership | [Decision relocation](plugin-decision-relocation-2026-09-09.md) |
| Candidate-pair README CI | [Candidate coordination](readme-candidate-coordination-2026-09-09.md) |
| Documentation-only main with minimal CI | [Main checks and proposed rulesets](main-ci-and-rulesets-2026-09-09.md) |
| Shared roadmap, settings and lessons | [Project-record distribution](shared-project-records-2026-09-09.md) |
| Historical evidence and archive hashes | [Benchmark publication preparation](benchmark-publication-2026-09-09.md) |
| Local document links and historical targets | [Reference repair](reference-repair-2026-09-09.md) |
| Unicode and repeated README anchors | [Navigation coverage and limits](navigation-check-2026-09-09.md) |

The 292-entry roadmap preserves task states and acceptance boundaries. Task 301
remains `awaiting_acceptance`. Flint is excluded from the plugin-main cleanup.
Hush/Codex is still unavailable as an installable package.

## Remaining closure work

- Verify native hook discovery/trust and event delivery in an actual client.
  Configured commands, installed files and successful shell tests do not alone
  prove that the current desktop session has trusted and loaded project hooks.

The owner updates installed Claude plugins; this is not an outstanding assistant
installation task. Foreman's task 301 remains a separate product-acceptance
decision. Neither is silently treated as accepted by this repository cleanup.

The pinned slug expression and regression corpus remain maintained checks, not
a claim to parse every possible future Markdown/HTML construct. Verified file
inventories and recovery bundles remain under the ignored scratch directory.

## Product preservation

The original 435-file baseline is retained. Of those original files, 431 remain
byte-identical. Explicitly recorded exceptions are two guide URLs, two requested
Codex manifest version bumps, and Foreman's separately authorized Windows hook
launcher. Its readable source, generator and regression test are new authorized
files. Existing hook logic, event matchers and timeouts remain unchanged.

The original audit remains useful as historical diagnosis. Use the evidence
above to distinguish corrected findings from genuinely open work.
