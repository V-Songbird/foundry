---
name: freshness
description: Scan this project's instruction files (CLAUDE.md, rules, agents, skills, commands) for references that no longer resolve, and recommend read-only fixes. Never edits files.
when_to_use: Use when the user wants to find or refresh stale setup files — "are my setup files stale", "check for stale references", "refresh my CLAUDE.md", "freshness check", or /hestia:freshness. Also where Hestia's freshness nudge points.
allowed-tools: Bash, Read, Grep, Glob
---

# Freshness — find stale setup

Find where the project's instruction files have drifted from the code, and recommend fixes. Read-only — surface what's stale; the user decides what to change.

## Steps

1. **Scan.** MUST invoke `Bash`: `python "${CLAUDE_PLUGIN_ROOT}/scripts/drift.py"`. Read the JSON it prints. If `python` is missing, try `python3`. The output carries `stale_files`, a counted `total_broken`, and a `limits` array.

2. **Report (cite-or-drop, counted facts).** Every line you surface MUST cite a concrete `<file>` → `<ref>` pair from `stale_files`. Never report a vague "things look stale" with no locator. State counts plainly ("3 broken references across 2 files") — never an impact estimate like "this would improve freshness by N%". If `stale_files` is empty, tell the user their setup looks fresh. Otherwise, group by file: "<file> points to `<ref>`, which no longer exists."

3. **Recommend (read-only, triple-shape).** For each broken reference give the symptom (the dead ref), one line on why it bites (Claude follows a path that no longer exists), and the concrete fix — update it to the new path, or remove it if the thing is gone for good. Do not apply changes; show the user where to look so they stay in control.

4. **Close with Limits.** ALWAYS end with a short "Limits — what this run could not check" line built from the `limits` array. State the empty case explicitly ("No stale references found.") — never silence. Carry the residual risk: only resolvable path-like references are checked; prose that describes outdated behavior, and references pointing outside the project tree, are not detected.

5. **Offer to go deeper.** When rules or other instruction files are involved, mention that `/hestia:assess-rules` grades rule quality and `/hestia:proofread` checks an instruction file's shape — for when the user wants more than a freshness pass.
