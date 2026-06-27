---
name: freshness
description: Scan this project's instruction files (CLAUDE.md, rules, agents, skills, commands) for references that no longer resolve, and recommend read-only fixes. Never edits files.
when_to_use: Use when the user wants to find or refresh stale setup files — "are my setup files stale", "check for stale references", "refresh my CLAUDE.md", "freshness check", or /hestia:freshness. Also where Hestia's freshness nudge points.
allowed-tools: Bash, Read, Grep, Glob
---

# Freshness — find stale setup

Find where the project's instruction files have drifted from the code, and recommend fixes. Read-only — surface what's stale; the user decides what to change.

## Steps

1. **Scan.** MUST invoke `Bash`: `python "${CLAUDE_PLUGIN_ROOT}/scripts/drift.py"`. Read the JSON it prints. If `python` is missing, try `python3`.

2. **Report.** If `stale_files` is empty, tell the user their setup looks fresh and stop. Otherwise, group by file and list each broken reference in plain language: "<file> points to `<ref>`, which no longer exists."

3. **Recommend (read-only).** For each broken reference, suggest the obvious fix in one line — update it to the new path, or remove the reference if the thing is gone for good. Do not apply the changes; show the user where to look so they stay in control.

4. **Offer to go deeper.** When rules or other instruction files are involved, mention that `/hestia:assess-rules` grades rule quality and `/hestia:proofread` checks an instruction file's shape — for when the user wants more than a freshness pass.
