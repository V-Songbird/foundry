# forge

> Stop discovering architectural problems in code review. Surface them before implementation starts.

Forge is a pre-code investigation pipeline for Claude Code. Describe a feature, and forge dispatches parallel domain experts against your actual codebase, synthesizes their findings into a grounded implementation plan, and runs an adversarial critic that tries to break that plan against the real code — before you approve a single edit.

The expensive failures — missed integration points, wrong assumptions about how the codebase fits together, conflicts between two areas no single reviewer connected — surface in minutes, not after a week of implementation.

---

## How it works

```
/forge  ──►  Structural search · domain-skill scan · reality-check spike
                        │
                        ▼
             Parallel expert analysis
             architecture · security · performance · data/state · UI/UX · testing
                        │
                        ▼
             Master plan synthesis
             expert reports → one grounded implementation plan
                        │
                        ▼
             Adversarial critic
             reads the plan · reads the code · finds every gap · cites file:line
                        │
                        ▼
             Plan revision
             every blocking finding verified and folded back in
                        │
                        ▼
             User approval   ◄── redirect or cancel before any code is written
                        │
                        ▼
             Implementation
             parallel worktrees for multi-step plans · one commit per work unit
                        │
                        ▼
             Build & report
```

> [!IMPORTANT]
> The approval gate is non-negotiable. Forge never proceeds to writing code without explicit sign-off. This is the point where you redirect, scope down, or cancel — not after implementation has started.

Every claim in the pipeline cites `file:line`. No summaries, no hand-waving, no "we'll figure it out later."

---

## Levels

| Level | Trigger | What runs |
|-------|---------|-----------|
| **lite** | `/forge lite` | In-session only. Orchestrator reads anchor files directly, drafts a plan, gets your approval. No expert or critic dispatch. For prototypes and bounded changes. |
| **full** | `/forge` | The complete pipeline: parallel experts → master plan → adversarial critique → approval → implementation. **Default.** |
| **deep** | `/forge deep` | Full pipeline plus Workflow orchestration: schema-validated expert reports and a two-refuter panel per Blocking finding. For high-trust-boundary or cross-team changes.[^1] |

[^1]: Requires Claude Code ≥ 2.1.154. Falls back to the full pipeline when the `Workflow` tool is unavailable — never blocks.

> [!TIP]
> Not sure which level to use? Start with `/forge`. The investigation ladder (below) handles the routing automatically based on what the task actually needs.

---

## The investigation ladder

The orchestrator works through these rungs in order and stops at the first one that covers the task. Don't climb higher than the task warrants.

- [ ] **Trivial?** Single-file, no cross-cutting dependencies → direct edit, not forge.
- [ ] **Project skill covers the domain?** Invokes it first — may resolve the question without a full run.
- [ ] **One risky assumption?** A ≤ 30-line reality-check spike confirms or refutes it before expert dispatch.
- [ ] **Crosses two or more architectural areas, or touches a trust boundary?** → `/forge`
- [ ] **Explicitly thorough or high-stakes?** → `/forge deep`

> [!NOTE]
> Rungs 2 and 3 are fast passes that often short-circuit the need for expert dispatch entirely. The ladder is what keeps a ten-agent pipeline away from two-line changes.

---

## Quick start

```
# Standard investigation — the most common starting point
/forge

# Fast in-session plan, no expert or critic dispatch
/forge lite

# Exhaustive review with schema-validated reports and refuter panels
/forge deep
```

Describe the feature after invoking the skill. Forge handles the rest.

---

<details>
<summary><strong>Skills reference</strong></summary>

<br>

The action skills are orchestrator-invoked — they run as steps in the pipeline and are intentionally absent from the slash-command menu. `/forge` is the only entry point you need.

| Skill | Role |
|-------|------|
| `/forge:forge` | Pipeline orchestrator. Manages the full sequence from ladder through report. |
| `/forge:expert-analysis` | Dispatches parallel domain experts in one tool-use block. |
| `/forge:master-plan` | Synthesizes expert reports into a single, auditable implementation plan. |
| `/forge:critic-review` | Dispatches the adversarial critic: reads the plan, reads the code, finds the gaps. |
| `/forge:plan-revise` | Verifies each critic finding against the code; folds confirmed ones back into the plan. |
| `/forge:dispatch-implementation` | Parallel worktree dispatch for plans with two or more independent steps. |
| `/forge:build-and-report` | Merges worktrees, bumps the version, runs the build, and emits the final report. |

</details>

<details>
<summary><strong>Design notes</strong></summary>

<br>

**Stack-agnostic.** Forge has no hardcoded build commands, version-bump rules, or test runners. All stack-specific behavior is declared in the consuming project's own `CLAUDE.md`. Forge reads it; you own it.

**Model stratification.** Domain experts and the adversarial critic are pinned to Fable for investigation depth — that pin holds even when the session runs a cheaper model. Synthesis steps inherit the session model. Implementers run on Sonnet: they execute a plan the experts and critic already verified, so research depth is not the constraint at that stage.

**Hooks.** A `UserPromptSubmit` hook tracks the active forge level and emits a one-line routing hint when a prompt shows architectural signals and forge is not already active. A `SubagentStart` hook reinforces citation discipline across every subagent spawned during a forge run.

**Citation chain.** Every expert claim traces to `file:line`. The master plan cites those claims. The adversarial critic verifies against the same files. The implementer works from the same citations. Breaking the chain at any step — a summary without evidence, a plan step without a reference — is caught and rejected before it propagates.

</details>

---

## Installation

Clone this repository and register the `forge/` directory as a Claude Code plugin.

---

## License

MIT — see [LICENSE](./LICENSE).
