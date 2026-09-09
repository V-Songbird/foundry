# Foundry reconciliation status

Updated 2026-09-09. The local reorganization is substantially implemented;
integration and live-client/CI verification are not complete. Dated reports
describe individual phases and must not be read as the current pending list.

Publication is now authorized and underway. Read the [release progress](release-progress-2026-09-09.md)
for current versions, published pins and Codex installation proof. Foreman's
Windows launcher correction now passes CI. Main-selector PRs still require
review, and the proposed rulesets need explicit approval after automatic review
rejected their creation.

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

- Preserve the verified edition manifests and dataset inventories through final
  integration; recheck any files changed after those validation snapshots.
- Preserve the pinned slug expression and its regression corpus. The recorded
  anchor discrepancies are closed; arbitrary future Markdown/HTML constructs
  remain outside the lightweight heading reader's claimed coverage.
- Verify native hook discovery/trust and event delivery in an actual client.
  Configured commands passing tests does not establish activation.
- Account for and integrate the changes in Foundry and all nine plugin worktrees.
  No worktree or backup should be removed before its needed content is preserved.
- Publish the reviewed edition revisions before selector links and catalog pins;
  verify actual Actions results and apply the reviewed ruleset transition through
  the authorized repository process. No remote settings have been changed.
- Confirm public URL reachability after publication. Local Git-object existence
  proves the target content is retained, not that GitHub currently serves it.

## Product preservation

The original 435-file baseline is retained. Of those files, 434 are byte-identical;
Foreman's Codex guide differs only in two recorded URL substitutions whose
reversal reproduces its baseline hash. No plugin runtime, shipped skill, hook,
manifest, functional test or asset was changed by this consolidation phase.

The original audit remains useful as historical diagnosis. Use the evidence
above to distinguish corrected findings from genuinely open work.
