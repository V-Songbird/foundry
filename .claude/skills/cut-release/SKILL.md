---
name: cut-release
description: Prepare and publish an explicitly requested Foundry plugin or edition release using its actual release branch, version owner and catalogs. Includes coordinated README and verification gates; never an automatic release trigger.
disable-model-invocation: true
allowed-tools: Bash, Read, Edit
---

# Release a Foundry plugin or edition

Use this workflow only for an explicit release request. Establish the plugin,
edition and intended version from that request and the current repository state.
A package plugin, whose catalog entries pin one main commit, has no edition
to choose. Otherwise, if the edition is ambiguous, resolve it before
writing metadata. Running in a particular assistant does not by itself choose
the edition being released.

## Sources of truth

| Release | Plugin metadata | Catalog | Version owner |
| --- | --- | --- | --- |
| Claude edition | `<plugin>/.claude-plugin/plugin.json` on Claude | `.claude-plugin/marketplace.json` in Foundry | the Claude catalog entry |
| Codex edition | `<plugin>/.codex-plugin/plugin.json` on Codex | `.agents/plugins/marketplace.json` in Foundry | the native plugin manifest |
| Package | both `<plugin>` manifests on main | both Foundry catalogs, same main SHA | both plugin manifests, same version |

Both catalog entries identify the plugin repository, platform ref and full
validated commit SHA. Claude's version and source.sha move together. A Codex
release updates its native version and then pins that exact integrated commit;
do not introduce a Claude-style version field into the Codex catalog.

A package such as Foreman (ADR 0011) or Razor (ADR 0013) releases one main commit. Bump the same
version in both manifests, then pin that commit with `ref: "main"` in both
catalogs. Its Claude catalog entry carries no version, so only `source.sha`
moves in Foundry. Hush (ADR 0012) is a package for Claude Code only: bump the
version in `.claude-plugin/plugin.json` and pin that commit in the Claude
catalog alone.

Hush has no Codex package. Do not add it to the Codex catalog until a Codex
port exists and passes validation.

## Prepare a reviewable release

1. Locate Foundry and the intended plugin checkout. Check its branch, HEAD,
   working tree and published refs. Confirm its physical working directory with
   `git rev-parse --show-toplevel`; worktree-list output alone can identify a
   submodule's gitdir instead. Preserve other working copies and unrelated edits.
2. Work on an appropriate non-main branch. On Windows, an existing Codex ref can
   prevent a codex/ prefix; use a non-conflicting maintenance branch. For a
   plugin with editions, main is its selector, never the implementation release
   destination; a package integrates into main.
3. Establish the exact release surface and inspect the changes since the last
   published pin for this edition or package. A dirty checkout is not
   authorization to include everything in it. Prepare the requested files and
   checks before requesting any genuinely missing publication approval.
4. Write a short user-facing CHANGELOG entry and update the release's version
   owner. Use the user's version when supplied; otherwise choose or clarify the
   bump according to the actual compatibility change. Keep unrelated metadata.
5. For a plugin with editions, use coordinate-readmes and check the actual
   candidate pair. The CLI supports `--pair <Claude-README> <Codex-README>` and
   `--git-pair <plugin-repo> <Claude-candidate-ref> <Codex-candidate-ref>`.
   Shared changes need both candidates; model-specific measurements must retain
   their own evidence. A package's single README needs its navigation check and
   a review of each host's evidence. Missing benchmarks stay explicitly unmeasured.
6. Run the relevant plugin, packaging, documentation and maintenance checks.
   Read the compatibility/validation guide for each host in the release. Do not
   run a Claude hook canary against a Codex package, invent hook events, or treat
   unit tests as installed activation. Paid benchmarks and installations need
   their own scope.

## Integrate and publish the release

Commit only the reviewed release surface. Use the repository's actual PR and
branch-protection process to integrate into Claude or Codex, or into main for a
package. Push the explicit reviewed branch/ref to its intended destination; never
substitute `origin main` for an edition branch. Preserve any separate acceptance
or merge requirement from the user. Do not bypass a failing check to force a
release through.

Once the release commit is integrated and remotely reachable, record its full
SHA in the correct Foundry catalog. Verify the remote branch contains that SHA.
For a Claude edition, update the catalog version in that same root change. For a
Codex edition, verify the pinned manifest contains the new effective version. For
a package, move `source.sha` in both catalogs (the Claude catalog alone for Hush)
to the same main commit and verify that its manifests there carry the new version. A gitlink update alone does not
publish a package update.

Run `node scripts/git-hooks/check-platform-marketplaces.js` from Foundry and
the relevant documentation/integration checks. Integrate the reviewed root
catalog change through its normal PR process. For a plugin with editions,
publish destination branches before selector pages that link to them. Do not
fold unrelated local work into either repository's release commit.

## Report the outcome

Report the plugin and its edition or package, version, integrated plugin SHA,
root catalog SHA, actual push/check results and any remaining activation or
publication boundary. If a remote operation fails, inspect the result and report
its concrete state; do not silently broaden the push or retry with force. Do not
claim publication from a local commit, valid manifest or passing unit suite alone.
