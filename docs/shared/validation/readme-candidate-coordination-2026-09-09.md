# README candidate coordination — 2026-09-09

The README workflow now supports reciprocal PR declarations containing the
opposite PR number and full head SHA. This removes the old requirement that
each common-content candidate match the still-unchanged opposite branch.
The workflow and helper are synchronized across all six platform editions.

The [authoring protocol](../../../.github/README_COORDINATION.md) distinguishes
candidate-pair validation from final integrated-branch parity. Both native
authoring skills and project rules reference that protocol.

## Evidence

A real temporary Git repository reproduces the original deadlock: each updated
edition fails against the old opposite branch. With reciprocal candidate
declarations, both unmerged revisions pass. After advancing both fixture branch
refs, the normal push comparison passes without candidate declarations.

Additional tests reject malformed declarations, wrong repositories or editions,
stale head SHAs, missing reciprocal acknowledgement, peers closed without merging,
and a peer ref moving between API inspection and fetch. A merged peer remains
usable while its companion PR completes. The helper reports exact compared SHAs.

The full maintenance suite reports 145 tests: 144 pass, no failures, one skip for
the intentionally absent Hush/Codex legacy hooks. YAML parsing verifies the
description-edit trigger, manual dispatch and read-only permissions. Workflow,
helper, test and protocol copies match across all six editions; the two native
coordinate-readmes skills match. All 435 protected product files are unchanged.

## Integration boundary

No PR was created, merged or modified during this phase. No GitHub protection
setting changed and the workflow has not been demonstrated on a live PR pair.
After both real merges, rerun integrated comparisons before publishing selectors
or catalog pins. Candidate success alone is not final branch parity.

GitHub documents [PR event types and checking out the head SHA](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).
The workflow uses `pull_request`, including description edits, and explicitly
checks out that candidate SHA. It does not use `pull_request_target` to run
candidate code with privileged repository context.

Evidence log: `.scratch/consolidation/readme-candidate-tests.log`. Main-selector
checks and remote ruleset reconciliation remain separate pending CI work.
