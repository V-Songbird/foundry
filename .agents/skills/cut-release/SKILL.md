---
name: cut-release
description: Release one Foundry plugin, only when the user invokes it by name. Bumps the version and changelog in the plugin repository, pushes, then pins the pushed commit in the Foundry catalogs.
disable-model-invocation: true
license: MIT
compatibility: Codex and Antigravity in the Foundry checkout. Requires git, Node 22 or later, the gh CLI and a POSIX bash, which on Windows is Git's own. The claude, codex and agy CLIs run the checks that name them.
metadata:
  version: "1.0"
---

# cut-release

This is the Codex and Antigravity entrypoint for this repository's release
procedure. Use it only when explicitly invoked, as `$cut-release` in Codex or
`/cut-release` in Antigravity; take the plugin and requested version from the
user's message. Codex reads the invocation policy from `agents/openai.yaml`, and
Antigravity from `disable-model-invocation` above.

Before taking release actions, read and follow the complete
[canonical release procedure](../../../.claude/skills/cut-release/SKILL.md). The
procedure is shared with Claude Code; do not duplicate its steps here.

## Codex and Antigravity execution notes

- Resolve the canonical link relative to this skill directory. If it is missing,
  stop and report the missing procedure rather than inventing a release workflow.
- The canonical file's Claude-only frontmatter describes its discovery on that
  host; its release steps apply here. Interpret `Read` and `Edit` as the available
  file-reading and patch tools, not required tool names.
- Run commands from the Foundry root, except step 4's pin check, which runs from
  the checkout that holds the release commit and takes the root's path. On
  Windows, use `rg` instead of the `grep` example. `claude plugin validate` and
  step 5's Claude Code check need the Claude Code CLI, step 5's Codex check the
  codex CLI, and `agy plugin validate` and step 5's Antigravity check the
  Antigravity CLI; when one is absent, report that check as not run instead of
  skipping it silently.
- Preserve existing authorization. Before each commit or push, verify the user's
  release request authorizes that action and its scope, and review the staged diff
  and the branch to be pushed so unrelated work cannot be included silently.
  Preparing or porting this skill does not authorize a release.
