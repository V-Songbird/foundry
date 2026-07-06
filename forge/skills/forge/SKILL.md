---
name: forge
description: Reference for the forge robust-development workflow. Three levels — lite (in-session, no dispatch) for prototypes; full (analysis Steps 2–6 run as one schema-validated Workflow call — scout+spike → experts → plan → critique → revision — then approval and implementation) for cross-cutting features; deep (same Workflow plus a two-refuter panel per Blocking finding) for high-stakes changes. The Investigation Ladder determines which level the task warrants. Heavy-by-design; parallel agents are also the token-cost lever.
when_to_use: Load when the user requests a non-trivial feature — particularly when they say "use forge", "review this design before I build it", or describe a change that crosses architectural boundaries.
effort: high
allowed-tools: AskUserQuestion, TaskCreate, Skill
---

# Forge: robust-development workflow

Forge is a pre-code verification pipeline for features that cross architectural boundaries or touch trust boundaries. The value comes from the gates: parallel domain experts surface cross-domain conflicts; the adversarial critic ground-truths the plan against the actual code; user approval gives the human a chance to redirect before any edit happens; parallel implementers in isolated worktrees finish the work without stepping on each other.

The workflow is heavy by design. Dispatching parallel agents is also the token-cost lever — the main session never reads the full expert or implementer transcripts, only their structured reports.

## Levels

| Level | Trigger | What runs |
|-------|---------|-----------|
| **lite** | `/forge lite` | In-session only. Orchestrator reads anchor files directly, drafts the plan, skips expert and critic dispatch, gets approval, implements in-session. For prototypes and bounded changes where full dispatch costs more than it saves. |
| **full** | `/forge` | Analysis (Steps 2–6: scout+spike → parallel experts → master plan → adversarial critique → revision) runs in one `Workflow` call with schema-validated handoffs; approval and implementation follow in the main session. Default. |
| **deep** | `/forge deep` | Same Workflow pipeline, plus a two-refuter panel per Blocking finding in the Critique phase. For high-trust-boundary changes, cross-team features, or any run where the user explicitly asks for thoroughness. |

Level is set at the start of the run and sticks until implementation completes or the user cancels.

**full and deep both run Steps 2–6 as a single `Workflow` call** — see *Workflow pipeline* below. `deep` differs only by toggling the refuter panel. When the `Workflow` tool is absent (Claude Code < 2.1.154), both fall back to the sequential skill path (`/forge:expert-analysis` → `/forge:master-plan` → `/forge:critic-review` → `/forge:plan-revise`); the artifact is identical, so Step 7 onward is unchanged.

## Investigation Ladder

Before starting any forge run, climb the ladder. Stop at the first rung that fully covers the task — don't climb higher than the task warrants.

1. **Trivial?** Single-file, no cross-cutting dependencies, no trust boundary → direct edit, not forge.
2. **Project skill claims domain authority?** Check `.claude/skills/` for a skill whose description matches the feature's area. If one exists, invoke it with the `Skill` tool. The output may resolve the question without a forge run — if it does, stop. If it doesn't, continue climbing.
3. **One risky assumption blocks the whole design?** A ≤ 30-line read can confirm or refute it. Read the code, surface the result. If the assumption is refuted, stop and surface the finding to the user. If confirmed, continue climbing.
4. **Crosses ≥ 2 architectural areas or touches a trust boundary?** → `/forge` (or `/forge lite` for prototypes — see routing).
5. **Explicitly thorough, deep, or exhaustive?** → `/forge deep`.

Rungs 2 and 3 are fast passes that often short-circuit the need for expert dispatch. Only skip them when their scope clearly doesn't apply to the task.

## Routing

| Task shape | Right tool |
|---|---|
| Single-file bug fix, no dependencies | Direct edit |
| Schema or domain question | Invoke the relevant project skill |
| Exploratory prototype or sandbox | `/forge lite` |
| Refactoring existing, well-understood code | `/code-review`, then direct edit |
| Cross-cutting feature or trust boundary | `/forge` |
| Explicitly thorough or high-stakes change | `/forge deep` |

## The pipeline

| #   | Action                                                                       | Model                | Skill                           |
|-----|------------------------------------------------------------------------------|----------------------|---------------------------------|
| 1   | Understand and identify the feature requirements and intention               | inherit              | —                               |
| 2   | Quick search for essential structural codebase knowledge                     | inherit              | —                               |
| 2.3 | Domain-skill scan: invoke any project skills authoritative for this feature  | inherit              | — (ladder rung 2)               |
| 2.5 | Reality-check spike against the riskiest assumption (≤ 30 lines)            | inherit              | — (ladder rung 3)               |
| 3   | Dispatch domain experts in parallel                                          | fable (per expert)   | `/forge:expert-analysis`        |
| 4   | Consolidate expert reports into a master implementation plan                 | inherit (effort high)| `/forge:master-plan`            |
| 5   | Dispatch the adversarial critic against the master plan                      | fable (effort high)  | `/forge:critic-review`          |
| 6   | Verify each critique; fold verified findings back into the plan              | inherit (effort high)| `/forge:plan-revise`            |
| 7   | Present the plan digest + revised plan to the user; wait for approval        | inherit              | —                               |
| 8   | Implement (parallel-first when ≥ 2 disjoint steps; in-session otherwise)    | sonnet (per worker)  | `/forge:dispatch-implementation` |
| 9   | Bump version and run the project build                                       | sonnet               | `/forge:build-and-report`       |
| 10  | Deliver the final implementation report                                      | sonnet               | `/forge:build-and-report`       |

**full and deep:** Steps 1 and 2.3 run in the main session first (Step 2.3 needs the `Skill` tool, which a Workflow cannot call), then **Steps 2–6 run inside one `Workflow` call** (the `Skill` column maps to agents inside that script, not to in-session skill invocations); the result returns to the main session for Steps 7–10. Steps 9 and 10 are produced by a single skill in one pass. Step 8 invokes `/forge:dispatch-implementation` when the plan has ≥ 2 disjoint steps; otherwise the orchestrator implements in-session. When the `Workflow` tool is absent, Steps 2–6 run as the sequential skill path in the main session instead — same table, same artifact.

**Lite level:** steps 3, 5, and parallel dispatch (8) are skipped, and no Workflow runs. The orchestrator reads anchor files directly in step 2, drafts the plan in-session at step 4, skips the adversarial critique, presents for approval at step 7, and implements in-session.

Model rationale: the research subagents (experts, critic) pin `fable` — investigation depth is their purpose, and the pin holds even when the session runs a cheaper model. The synthesis steps (4, 6) inherit the session model so they never age into a downgrade when newer models ship. Implementers stay `sonnet` as a deliberate cost choice — they execute a plan the experts and critic already verified.

## Communication — what reaches the user

Forge is heavy; its output to the user must not be. The pipeline runs many phases, but the user is present for only a few decisions — everything else is work, not communication. Speak in two registers, and let nothing else reach the user. The whole point of the gates is the human's chance to redirect; a user who TL;DRs a wall of process and rubber-stamps has gained nothing from the run.

**Status register — the default between gates.** One short line per phase: present tense, plain developer language, naming *where the run is* — never how the machinery works. A single evolving checklist (one row per phase) is the preferred shape; separate one-liners are the floor.

| Phase | Say this | Not this |
|-------|----------|----------|
| Level decision | "Touches 3 areas and auto-edits live data — running the **full** pipeline (experts → plan → critique → your approval)." | the rung-by-rung climb; "Decision: `full`" |
| Spike | "Checking the riskiest assumption: \<plain sentence\>…" | "Step 2.5 spike"; "blast radius" |
| Experts | "Running 3 experts (architecture · data · code-insight)…" | dispatch namespacing; model fallbacks |
| Master plan | "Drafting the plan…" | the plan itself (see *Show the plan once*) |
| Critic | "Critic reviewing the plan against the code…" | the dispatch mechanics |

**Decision register — only when the user must read or decide.** The *only* place rich formatting (bullets, a callout, one bold decision) earns its place: a spike refutation that stops the run; the Step 7 approval gate (digest + plan + `AskUserQuestion`); any open question escalated for the user's call.

**Silent plumbing — never surface.** Model pins and availability (a Fable-pinned subagent falling back to another model), agent-type namespacing, re-dispatch, retries, tool mechanics, and the `coverage:` / `resolution:` gate counts are internal. Handle them silently. Surface a failure ONLY when it is unrecoverable AND changes what the user should do — then in plain language ("Couldn't reach the experts after two tries — fall back to in-session analysis?"). A subagent dying and being re-dispatched is not a user event.

**Material findings are conclusions, not investigations.** When a spike or expert genuinely reshapes the work — a real bug, a scope that shrank — the user hears the *result* in 1–2 sentences ("Found a real bug while checking the roadmap's claim: the quest lookup matches the display label instead of the map id. Confirmed against the rAthena source — folding the fix into this run."), never the paragraph-by-paragraph trail with `file:line`. The evidence lives in the plan and the subagent reports for whoever wants it.

**Show the plan once.** The user reads the master plan exactly once — final form, at the Step 7 gate. `/forge:master-plan` drafts the plan as the verbatim input to the critic dispatch; it does not render the plan as a user-facing block. `/forge:plan-revise` is the single point where the plan reaches the user, behind the digest. The critic's effect is one plain line in the digest ("critic flagged 2 gaps — both verified against the code and fixed, nothing pushed to you"), not a reprinted plan or an inline resolution table.

The test for any user-facing line: *would a developer who just wants to approve a good plan need this to make that decision?* If not, it belongs in the status register, the plan artifact, or nowhere.

## Workflow pipeline

For full and deep runs, Steps 2–6 are a single `Workflow` call. The orchestrator builds the args from Steps 1 and 2.3, invokes the script once, waits for the task notification, then resumes at Step 7. The full script, schemas, and arg shape live in [references/workflow-pipeline.md](references/workflow-pipeline.md). What the orchestrator must know:

- **One invocation, six phases.** Research (scout structural-search + expert-selection + reality-check spike) → Experts (parallel `forge-expert`) → Plan (`forge-plan-synthesizer`) → Critique (`adversarial-critic`) → Verify (deep only — two-refuter panel) → Revise (`forge-plan-reviser`). The synthesis steps run as the `forge-plan-synthesizer` and `forge-plan-reviser` agents — the Workflow-path equivalents of the `/forge:master-plan` and `/forge:plan-revise` skills, since a Workflow cannot invoke a `Skill`.
- **Schema-validated handoffs.** Every expert report, the critique, and the revised plan are validated at the tool layer with automatic retry — no heading-parsing between steps.
- **`deep` toggles only the Verify phase.** Pass `deep: true` for `/forge deep`; the refuter panel marks each Blocking finding `panel_refuted` when both lens-distinct refuters ground a refutation, and the reviser verifies those first.
- **Two returns to the main session.** A refuted spike returns `{ spikeRefuted: true, ... }` and the Workflow halts before experts — surface it as a Decision-register finding and ask the user to re-scope (a Workflow cannot call `AskUserQuestion`). Otherwise it returns `{ plan, gate }` for the Step 7 gate.
- **Requires Claude Code ≥ 2.1.154.** If the `Workflow` tool is absent, or any phase returns `{ error }`, fall back to the sequential skill path for the remaining steps. Never block the pipeline on the tool's availability.

Everything after the Workflow is unchanged: same Step 7 approval, same implementation routing, same build.

## Step 2.3 — Domain-skill scan

After the structural search, check whether the consuming project has skills in `.claude/skills/` that claim domain authority over any area the feature touches. A skill is a domain-authority candidate when its description uses words like "authoritative", "schema", "reference", or names the domain by type (e.g. "rAthena YAML database schemas", "rathena scripting API").

For each matching skill, invoke it with the `Skill` tool immediately — before step 2.5 and before expert dispatch. Its output becomes **supplemental domain authority** for this forge run: pass it inline in the relevant expert dispatch prompt so the expert starts from pre-baked knowledge rather than file searches.

Skip step 2.3 only when the project has no `.claude/skills/` directory or no skill description matches the feature's domain.

## Step 2.5 — Reality-check spike

Before dispatching experts, run a ≤ 30-line spike against the single riskiest assumption — whichever claim, if false, would invalidate the whole design. If the spike refutes the assumption, STOP — surface the refutation to the user with `file:line` evidence and ask for a corrected scope before continuing. Do NOT silently re-scope.

In full and deep runs this happens inside the Workflow's Research phase: the scout runs the spike and a refuted assumption returns `{ spikeRefuted: true }`, halting before experts — the STOP and the user re-scope then happen in the main session. In lite runs the orchestrator runs the spike directly. Either way the rule is the same.

Skip step 2.5 only when the feature has no risky assumption (pure refactor, well-trodden CRUD, well-covered by existing patterns).

## Step 7 — Approval gate

The master plan is built to direct Claude — W-IDs, `file:line` citations, done-when criteria, contract clauses. Presented raw, it trains users to approve without reading. This is the run's primary Decision register (see *Communication*) and the one place the user reads the full plan — *Show the plan once* routes everything here. Present in two layers: a short **plan digest** first, then the full plan beneath it. The critic's outcome and the gate counts appear here as one plain digest line each — never as `coverage:` / `resolution:` footers.

Write the digest for a developer who has NOT followed the pipeline — technical terms are fine, plan machinery is not (no W-IDs, no `file:line` lists, no contract-clause numbering). Shape:

```markdown
## What this plan does

<2–3 sentences: the intention — what gets built, and why it answers what the user asked for.>

**The change:** <1–2 sentences naming the areas touched in dev terms.>

**Worth knowing before you approve:**
- <the 1–2 real risks, stated as what the user would observe if they bite>
- <what the critic changed, if anything>
- <decisions still open>

**How we'll know it works:** <one sentence: the test command, build, or smoke test.>
```

Cap the digest at ~12 lines and skip any bullet with nothing real to say. The digest is presentation only — the full plan below remains the single canonical artifact. Never let the digest drift into a second plan, and never edit the plan via the digest.

Immediately after the digest + plan, MUST invoke `AskUserQuestion`:

```
AskUserQuestion(questions: [{
  question: "The revised plan is ready. Do you approve implementation?",
  header: "Approval",
  multiSelect: false,
  options: [
    { label: "Approve",   description: "Proceed to implementation. Parallel implementers if the plan has ≥ 2 disjoint steps; in-session otherwise." },
    { label: "Revise",    description: "Tell me what to change; I'll update the plan before implementing." },
    { label: "Cancel",    description: "Abort the forge run at this point." }
  ]
}])
```

## After approval (Step 8)

Default is **parallel-first**: invoke `/forge:dispatch-implementation` whenever the plan has ≥ 2 steps marked `Parallel-friendly: yes`. One `forge-implementer` subagent per qualifying step, each in `isolation: "worktree"`, all dispatched in a single tool-use block.

Fall back to in-session implementation when the plan has fewer than 2 disjoint parallel-friendly steps.

## Build and report (Steps 9 and 10)

After implementation lands, invoke `/forge:build-and-report`. The skill bumps the version per the consuming project's convention (read from the project's CLAUDE.md), runs the project's build / verification commands, and emits the final report with the two mandatory sections "How to test this feature" and "How is this feature useful?".

The forge plugin is stack-agnostic; the actual version-bump file and build command are the consuming project's responsibility to declare in its own CLAUDE.md.

## Workflow principles

- **Citations required.** Experts, critic, plan — every claim cites `file:line` (or a doc URL for externally-verified claims). Summaries without citations break verification chains.
- **Single canonical plan in conversation.** `/forge:plan-revise` rewrites in place; the conversation never holds v1 + v2 + v3 simultaneously.
- **Foreground subagents.** Every `Agent` dispatch (fallback path, plus implementation) is `run_in_background: false` — the next step needs the prior step's output. The full/deep `Workflow` call returns via task notification; wait for it before resuming at Step 7.
- **Resume when context is an asset; re-dispatch when it misleads.** Decision-only blockers continue the original subagent via `SendMessage`. Fresh dispatch is for changed assignments where stale context is a liability. Fall back to fresh dispatch when `SendMessage` is unavailable.
- **No persistent state files.** The plan, critique, and expert reports live in conversation context. The workflow does not write `.claude/plans/*.md` or similar.
- **User approval is non-negotiable.** Step 7 is the gate. The orchestrator never silently proceeds to writing code.
- **`TaskCreate` per work unit before dispatch.** When `/forge:dispatch-implementation` runs, MUST invoke `TaskCreate` for each work unit (paired `content` + `activeForm`) before the parallel `Agent` calls.

## Re-running a single phase

The action skills are independently invocable for re-runs:

- Bad expert coverage → re-run `/forge:expert-analysis` with a different role list.
- Plan needs revision after user pushback → re-run `/forge:plan-revise`. Re-dispatch the critic only if the change is structural.
- One dispatched implementer blocked on a decision, work unit unchanged → resume via `SendMessage` with the ruling.
- Build broke after a tangential change → re-run `/forge:build-and-report`.

Each action skill is `user-invocable: false` — only the orchestrator invokes them, at the right step in the pipeline. They are deliberately hidden from the slash-command menu so the workflow runs as a single coherent pipeline. Do not auto-fire skills out of sequence: the workflow's value comes from the gates between steps, and skipping ahead defeats them.
