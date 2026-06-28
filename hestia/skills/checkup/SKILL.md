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
- `staleness` — a DERIVED freshness label of the *last* checkup `{label, commits, days, reason, last_sha, last_ts}`. The label is `fresh` / `aging` / `stale` / `unknown`. It is computed at read-time from a cheap stored signal (last checkup's commit SHA + timestamp) — Hestia never stores a health grade that could go stale. `unknown` means no prior checkup is on record for this project.
- `skipped_cleared` — surfaces skipped this run because their input files were unchanged since last verified clean (negative invariants). Each entry: `{surface, verified_ts, verified_sha, inputs}`. These are counted facts ("clean, inputs unchanged since <when>"), surfaced in the Limits section.
- `findings` — heuristic findings list. Each finding obeys the **finding contract**: it carries a concrete `location` (cite-or-drop — no locator, no finding) plus the triple-shape `symptom` / `why` / `fix_action`. Never invent a finding without a `location`.
- `limits` — what the heuristic floor could NOT check (feeds the closing Limits section in step 5). When a surface was skipped because its inputs were unchanged, a `freshness-skip` note is included here — surface it as the honest "clean, inputs unchanged" fact, not as a warning.

If `near_empty` is `true` → skip to **Onboarding** (step 7).

Otherwise continue.

### Step 2 — Rules engine (if rules exist)

Run this step only if the `summary.rules` count from step 1 is greater than 0.

2a. MUST invoke `Bash` with `description: "Extract and mechanically score rules"`:
`python "${CLAUDE_PLUGIN_ROOT}/scripts/run_audit.py" --prepare --project-root <project_root>`

Replace `<project_root>` with the `project_root` value from step 1. This runs extract → score_mechanical → score_semi and saves `.hestia-tmp/scored_semi.json`.

2b. If `--prepare` succeeds, MUST invoke `Bash` with `description: "Finalize audit and emit JSON"`:
`python "${CLAUDE_PLUGIN_ROOT}/scripts/run_audit.py" --finalize --json`

Read the JSON output (the full audit object). From it, extract all rules where `score` < 0.50 (grade D or F). These are low-quality rules. Each one already has a `file:line_start` locator, so it satisfies cite-or-drop. For each, add a triple-shape finding to the findings list:

```
severity: "medium"
artifact: "rule"
symptom: "Rule scores D/F: <first 60 chars of rule text>"
why: "<dominant_weakness friendly text if available, else 'Claude can't reliably parse/apply this rule as written'>"
fix_action: "<the dominant_weakness fix if available, else 'Rewrite with a clear verb, trigger, and concrete example'>"
location: "<file>:<line_start>"
fix: "assess-rules"
```

The audit object also carries a `limits` array — fold its notes into the closing Limits section in step 5.

If `--finalize` fails (e.g. because `.hestia-tmp/all_judgments.json` does not exist yet — the semi-mechanical scoring requires a judgment step that hasn't run), note this silently and continue with only the heuristic findings. Do not surface a confusing error to the user.

### Step 3 — Freshness scan (always)

MUST invoke `Bash` with `description: "Scan instruction files for stale references"`:
`python "${CLAUDE_PLUGIN_ROOT}/scripts/drift.py"`

Read the JSON output (it carries `stale_files`, a counted `total_broken`, and a `limits` array). For each entry in `stale_files`, create a triple-shape finding (the `path` is the locator — cite-or-drop satisfied):

```
severity: "medium"
artifact: "reference"
symptom: "<N> stale reference(s) in <path>"
why: "Stale references quietly mislead Claude — it follows a path that no longer exists."
fix_action: "Update or remove the broken refs: <first 4 broken refs joined by ', '>."
location: "<path>"
fix: "freshness"
```

Carry this scan's `limits` notes forward into step 5's Limits section.

**Deduplication:** before adding a drift finding, check whether the heuristic findings list (from step 1) already contains an entry with the same `location`. If so, replace the heuristic finding with the drift finding (drift.py covers a wider range of artifact kinds and its broken-refs list is authoritative). Do not add both.

### Step 4 — Merge and rank

Combine:
- Surviving heuristic findings from step 1 (after deduplication with step 3)
- Rules-quality findings from step 2 (if the engine ran)
- Freshness findings from step 3

Sort by severity descending (high → medium → low → info).

### Step 5 — Unified report (two layers + limits)

The report obeys the **finding contract**: every finding cites a `location` (cite-or-drop), shows the triple-shape (`symptom` / `why` / `fix_action`), and the report states counted facts only — never a counterfactual impact like "this would improve your setup health 40%" (there is no baseline for the un-fixed alternative, so any such number is fabricated).

**Staleness header first (always).** Open with one honest line derived from `staleness`: state the `label` and its `reason` in plain language — e.g. "Setup last verified 3 commits ago → fresh." or "Setup last verified 80 days / 90 commits ago → STALE; re-run /hestia:checkup before trusting this report." or, when `label` is `unknown`, "No prior checkup on record — this is your baseline." This is the staleness-as-honesty line: it reports a derived label, never a stored grade, so it can never silently rot. Do NOT invent a numeric health score.

**Digest next (always).** One headline line stating the counted facts: how many high-priority items and how many smaller ones across all sources. Then the top three findings — for each, show **symptom + severity + location** as one skimmable line. This is the digest layer; keep `why`/`fix_action` for the drill-down below.

**Drill-down below.** List the rest grouped by priority (high, then medium, then low). For each, expand to the full triple-shape: `symptom` (with its `location`), then `why` (the one-line rationale), then `fix_action` (the concrete corrective step). Never render a bare "this is wrong" with no fix — every finding must carry its `fix_action`.

**Advisory bucket (only if any finding has `advisory: true`).** Present any advisory findings in a clearly separate "Advisory (unverified)" block, never mixed with the cited findings above — they have no locator and are hunches, not grounded findings.

**Limits — what this run could not check (always).** Close with a short Limits section built from the `limits` arrays you captured in steps 1–3. State out-of-scope surfaces and the residual risk the dev still owns. Empty results are stated explicitly ("No stale references found.") — never silence. The heuristic floor does NOT grade rule clarity (that's `/hestia:assess-rules`), does not run hooks or MCP servers, and checks references conservatively. If any `freshness-skip` notes are present (a surface skipped because its inputs were unchanged since last verified clean), state them here as the honest fact — "broken-refs: clean, inputs unchanged since <when>; re-scanned automatically when those files change" — not as a gap.

If there are zero findings, say so plainly and congratulate the user — then STILL render the Limits section (a clean run is not a cleared run), and still offer the lean audit in step 6.

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
