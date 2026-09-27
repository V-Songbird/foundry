---
name: cut-release
description: Release one Foundry plugin when explicitly invoked. Bump its version and changelog in the plugin repository, push, then pin the pushed commit in the Foundry catalogs within the owner's authorization.
license: MIT
compatibility: Codex in the Foundry checkout. Requires git and Node 22 or later.
metadata:
  version: "1.0"
---

# cut-release

This is the Codex entrypoint for this repository's release procedure. Use it only
when explicitly invoked as `$cut-release`; take the plugin and requested version
from the user's message. The invocation policy lives in `agents/openai.yaml`.

Before taking release actions, read and follow the complete
[canonical release procedure](../../../.claude/skills/cut-release/SKILL.md). The
procedure is shared with Claude Code; do not duplicate its steps here.

## Codex execution notes

- Resolve the canonical link relative to this skill directory. If it is missing,
  stop and report the missing procedure rather than inventing a release workflow.
- The canonical file's Claude-only frontmatter describes its discovery on that
  host; its release steps apply here. Interpret `Read` and `Edit` as the available
  file-reading and patch tools, not required tool names.
- Run commands from the Foundry root. On Windows, use `rg` instead of the `grep`
  example. `claude plugin validate` and step 5's Claude Code check need the
  Claude Code CLI, step 5's Codex check the codex CLI, and `agy plugin validate`
  and step 5's Antigravity check the Antigravity CLI; when one is absent, report
  that check as not run instead of skipping it silently.
- Preserve existing authorization. Before each commit or push, verify the user's
  release request authorizes that action and its scope, and review the staged diff
  and the branch to be pushed so unrelated work cannot be included silently.
  Preparing or porting this skill does not authorize a release.
