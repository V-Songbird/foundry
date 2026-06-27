---
name: checkup
description: Hestia's session health check — a companion brief on your project's instruction files, rules quality, and staleness before a development session. Read-only; it recommends, you decide.
when_to_use: Use when the user wants to assess or improve their Claude Code setup — "audit my setup", "check my CLAUDE.md / rules / agents", "how can I improve my Claude Code setup", "is my setup any good", "health check", or /hestia:checkup. This is Hestia's front door.
allowed-tools: Bash, Read, Write, AskUserQuestion
---

# Checkup — companion health check

Run one health check of the project's Claude Code setup and hand back a short, ranked, plain-language report. This skill never edits the user's files on its own; the only write is an opt-in terrain setup during onboarding, and only after the user agrees.

## Steps

### Step 1 — Heuristic scan (always)

MUST invoke `Bash` with `description: "Scan project Claude Code setup"`:
`python "${CLAUDE_PLUGIN_ROOT}/scripts/checkup.py"`

If `python` is missing, try `python3`; if neither runs, tell the user Python 3.10+ is required and stop.

Read the JSON it prints. Capture:
- `near_empty` — boolean
- `project_root` — absolute path string (used in all later steps)
- `summary.rules` — rule count from discovery
- `summary.skills`, `summary.agents`, `summary.commands` — presence of instruction artifacts
- `findings` — heuristic findings list

If `near_empty` is `true` → skip to **Onboarding** (step 7).

Otherwise continue.

### Step 2 — Rules engine (if rules exist)

Run this step only if the `summary.rules` count from step 1 is greater than 0.

2a. MUST invoke `Bash` with `description: "Extract and mechanically score rules"`:
`python "${CLAUDE_PLUGIN_ROOT}/scripts/run_audit.py" --prepare --project-root <project_root>`

Replace `<project_root>` with the `project_root` value from step 1. This runs extract → score_mechanical → score_semi and saves `.hestia-tmp/scored_semi.json`.

2b. If `--prepare` succeeds, MUST invoke `Bash` with `description: "Finalize audit and emit JSON"`:
`python "${CLAUDE_PLUGIN_ROOT}/scripts/run_audit.py" --finalize --json`

Read the JSON output (the full audit object). From it, extract all rules where `score` < 0.50 (grade D or F). These are low-quality rules. For each one, add a finding to the findings list:

```
severity: "medium"
artifact: "rule"
title: "Rule scores D/F: <first 60 chars of rule text>"
detail: "<dominant_weakness friendly text if available, else 'Review and improve this rule'>"
location: "<file>:<line_start>"
fix: "assess-rules"
```

If `--finalize` fails (e.g. because `.hestia-tmp/all_judgments.json` does not exist yet — the semi-mechanical scoring requires a judgment step that hasn't run), note this silently and continue with only the heuristic findings. Do not surface a confusing error to the user.

### Step 3 — Freshness scan (always)

MUST invoke `Bash` with `description: "Scan instruction files for stale references"`:
`python "${CLAUDE_PLUGIN_ROOT}/scripts/drift.py"`

Read the JSON output. For each entry in `stale_files`, create a finding:

```
severity: "medium"
artifact: "reference"
title: "<N> stale reference(s) in <path>"
detail: "Broken: <first 4 broken refs joined by ', '>. Stale references quietly mislead Claude."
location: "<path>"
fix: "freshness"
```

**Deduplication:** before adding a drift finding, check whether the heuristic findings list (from step 1) already contains an entry with the same `location`. If so, replace the heuristic finding with the drift finding (drift.py covers a wider range of artifact kinds and its broken-refs list is authoritative). Do not add both.

### Step 4 — Merge and rank

Combine:
- Surviving heuristic findings from step 1 (after deduplication with step 3)
- Rules-quality findings from step 2 (if the engine ran)
- Freshness findings from step 3

Sort by severity descending (high → medium → low → info).

### Step 5 — Unified report (two layers)

**Digest first (always).** One headline line: how many high-priority items and how many smaller ones across all sources. Then the top three findings, each as one plain sentence — what it is and why it matters. No file paths or jargon in the digest unless a path *is* the point.

**Details below.** List the rest grouped by priority (high, then medium, then low). For each: the title, the file/location, and the one-line fix. Keep it skimmable.

If there are zero findings, say so plainly and congratulate the user — then still offer the lean audit in step 6.

### Step 6 — Offer the next step

MUST invoke `AskUserQuestion` (header `Next step`, multiSelect false). Build options only from the `fix` values that actually appear in the merged findings, plus the two always-present options:

- `fix: "assess-rules"` present → **Improve my rules** → continue with the `hestia:assess-rules` skill
- `fix: "scribe"` present → **Fix an instruction file** → continue with the `hestia:scribe` skill
- `fix: "freshness"` present → **Fix stale references** → continue with the `hestia:freshness` skill
- Skills, agents, or commands were found (summary counts > 0) → **Proofread my skills/agents** → tell the user they can run `/hestia:proofread` on specific files, or you can dispatch `hestia:proofreader` now — ask if they want that
- Always → **Trim over-engineering** → continue with the `hestia:lean-audit` skill
- Always → **Done for now**

Then act on the choice: continue with the matching Hestia skill, or, if the user picked "Done", stop. If a named skill is not installed yet, tell the user the command to install it.

### Step 7 — Onboarding (near-empty setups only)

Tell the user, in a friendly line or two, that this project has little or no Claude setup and that setting up the terrain first means every session starts from solid ground. MUST invoke `AskUserQuestion` (header `Set up the terrain`, multiSelect false): options **Create a starter CLAUDE.md** and **Not now**.

- If they accept: Read the template at `${CLAUDE_SKILL_DIR}/assets/starter-claude-md.md`. If `./CLAUDE.md` already exists, ask before overwriting. Otherwise MUST invoke `Write` to create `./CLAUDE.md` from the template. Tell the user what you created and suggest filling in the bracketed placeholders, then running `/hestia:checkup` again.
- If they decline: stop, and mention they can run `/hestia:checkup` anytime.

## Notes

- This is the front door. Skills it routes to do the deep work.
- Everything here is read-only except the onboarding starter file, which is always confirmed first.
- The rules engine (`--finalize`) requires a judgment step that is only available inside `hestia:assess-rules`. If `--finalize` errors at the checkup stage, skip it silently — the assess-rules skill runs the full pipeline including judgment.
- Proofreader is never auto-dispatched from checkup. It is offered as a next-step option when instruction artifacts exist.
