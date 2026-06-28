---
name: forge
description: Reference for the forge robust-development workflow. Three levels — lite (in-session, no dispatch) for prototypes; full (parallel experts → master plan → adversarial critique → parallel implementation) for cross-cutting features; deep (Workflow dispatch with schema validation and refuter panel) for high-stakes changes. The Investigation Ladder determines which level the task warrants. Heavy-by-design; parallel agents are also the token-cost lever.
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
| **full** | `/forge` | Parallel experts → master plan → adversarial critique → approval → implementation. Default. |
| **deep** | `/forge deep` | Full pipeline + Workflow dispatch with schema-validated expert reports and a two-refuter panel per Blocking finding. For high-trust-boundary changes, cross-team features, or any run where the user explicitly asks for thoroughness. |

Level is set at the start of the run and sticks until implementation completes or the user cancels.

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

Steps 1, 2, 2.3, 2.5, and 7 run in the main session — orchestrator actions, not skills. Steps 9 and 10 are produced by a single skill in one pass. Step 8 invokes `/forge:dispatch-implementation` when the plan has ≥ 2 disjoint steps; otherwise the orchestrator implements in-session.

**Lite level:** steps 3, 5, and parallel dispatch (8) are skipped. The orchestrator reads anchor files directly in step 2, drafts the plan in-session at step 4, skips the adversarial critique, presents for approval at step 7, and implements in-session.

Model rationale: the research subagents (experts, critic) pin `fable` — investigation depth is their purpose, and the pin holds even when the session runs a cheaper model. The synthesis steps (4, 6) inherit the session model so they never age into a downgrade when newer models ship. Implementers stay `sonnet` as a deliberate cost choice — they execute a plan the experts and critic already verified.

## Deep mode — Workflow dispatch

Deep mode replaces the standard `Agent` dispatch at steps 3 and 5 with `Workflow` orchestration. Requires Claude Code ≥ 2.1.154 — if the `Workflow` tool is absent, fall back to the full level; never block the pipeline on the tool's availability.

- **Step 3** — `/forge:expert-analysis` dispatches experts through a Workflow script with schema-validated reports. Malformed reports are retried at the tool layer instead of hand-parsed by heading.
- **Step 5** — `/forge:critic-review` runs the critic plus a two-refuter panel per Blocking finding. Panel verdicts arrive pre-flagged for `/forge:plan-revise`, which verifies the likeliest misfires first.

Everything else is unchanged: same gates, same step 7 approval, same implementation routing.

## Step 2.3 — Domain-skill scan

After the structural search, check whether the consuming project has skills in `.claude/skills/` that claim domain authority over any area the feature touches. A skill is a domain-authority candidate when its description uses words like "authoritative", "schema", "reference", or names the domain by type (e.g. "rAthena YAML database schemas", "rathena scripting API").

For each matching skill, invoke it with the `Skill` tool immediately — before step 2.5 and before expert dispatch. Its output becomes **supplemental domain authority** for this forge run: pass it inline in the relevant expert dispatch prompt so the expert starts from pre-baked knowledge rather than file searches.

Skip step 2.3 only when the project has no `.claude/skills/` directory or no skill description matches the feature's domain.

## Step 2.5 — Reality-check spike

Before dispatching experts, run a ≤ 30-line spike against the single riskiest assumption — whichever claim, if false, would invalidate the whole design. If the spike refutes the assumption, STOP — surface the refutation to the user with `file:line` evidence and ask for a corrected scope before continuing. Do NOT silently re-scope.

Skip step 2.5 only when the feature has no risky assumption (pure refactor, well-trodden CRUD, well-covered by existing patterns).

## Step 7 — Approval gate

The master plan is built to direct Claude — W-IDs, `file:line` citations, done-when criteria, contract clauses. Presented raw, it trains users to approve without reading. Present in two layers: a short **plan digest** first, then the full plan beneath it.

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
- **Foreground subagents.** Every `Agent` dispatch is `run_in_background: false`. The next step needs the prior step's output. (Deep-mode `Workflow` runs return via task notification — wait before starting the next step.)
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
