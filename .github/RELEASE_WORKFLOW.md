# Release a Foundry plugin edition

Use this workflow only for an explicit release request. Establish the plugin,
edition and intended version from that request and the current repository state.
If the edition is ambiguous, resolve it before writing metadata. Running in a
particular assistant does not by itself choose the edition being released.

## Sources of truth

| Edition | Plugin metadata | Catalog | Version owner |
| --- | --- | --- | --- |
| Claude | `<plugin>/.claude-plugin/plugin.json` on Claude | `.claude-plugin/marketplace.json` in Foundry | the Claude catalog entry |
| Codex | `<plugin>/.codex-plugin/plugin.json` on Codex | `.agents/plugins/marketplace.json` in Foundry | the native plugin manifest |

Both catalog entries identify the plugin repository, platform ref and full
validated commit SHA. Claude's version and source.sha move together. A Codex
release updates its native version and then pins that exact integrated commit;
do not introduce a Claude-style version field into the Codex catalog.

Hush/Codex is not installable until its package and validation exist. Do not
create a release or add it to the catalog merely because the branch exists.

## Prepare a reviewable release

1. Locate Foundry and the intended plugin checkout. Check its branch, HEAD,
   working tree and published refs. Confirm its physical working directory with
   `git rev-parse --show-toplevel`; worktree-list output alone can identify a
   submodule's gitdir instead. Preserve other working copies and unrelated edits.
2. Work on an appropriate non-main branch. On Windows, an existing Codex ref can
   prevent a codex/ prefix; use a non-conflicting maintenance branch. A plugin's
   main branch is its selector, never the implementation release destination.
3. Establish the exact release surface and inspect the changes since the last
   published pin for this edition. A dirty checkout is not authorization to
   include everything in it. Prepare the requested files and checks before
   requesting any genuinely missing publication approval.
4. Write a short user-facing CHANGELOG entry and update the edition's version
   owner. Use the user's version when supplied; otherwise choose or clarify the
   bump according to the actual compatibility change. Keep unrelated metadata.
5. Use coordinate-readmes and check the actual candidate pair. The CLI supports
   `--pair <Claude-README> <Codex-README>` and
   `--git-pair <plugin-repo> <Claude-candidate-ref> <Codex-candidate-ref>`.
   Shared changes need both candidates; model-specific measurements must retain
   their own evidence. Missing benchmarks stay explicitly unmeasured.
6. Run the relevant plugin, packaging, documentation and maintenance checks.
   Read the edition's compatibility/validation guide. Do not run a Claude hook
   canary against a Codex package, invent hook events, or treat unit tests as
   installed activation. Paid benchmarks and installations need their own scope.

## Integrate and publish the selected edition

Commit only the reviewed release surface. Use the repository's actual PR and
branch-protection process to integrate into Claude or Codex. Push the explicit
reviewed branch/ref to its intended destination; never substitute `origin main`
for the current edition. Preserve any separate acceptance or merge requirement
from the user. Do not bypass a failing check to force a release through.

Once the edition commit is integrated and remotely reachable, record its full
SHA in the correct Foundry catalog. Verify the remote branch contains that SHA.
For Claude, update the catalog version in that same root change. For Codex,
verify the pinned manifest contains the new effective version. A gitlink update
alone does not publish a package update.

Run `node scripts/git-hooks/check-platform-marketplaces.js` from Foundry and
the relevant documentation/integration checks. Integrate the reviewed root
catalog change through its normal PR process. Publish destination branches
before selector pages that link to them. Do not fold unrelated local work into
either repository's release commit.

## Report the outcome

Report the plugin and edition, version, integrated plugin SHA, root catalog SHA,
actual push/check results and any remaining activation or publication boundary.
If a remote operation fails, inspect the result and report its concrete state;
do not silently broaden the push or retry with force. Do not claim publication
from a local commit, valid manifest or passing unit suite alone.
