# forge

Pre-code feature review workflow for Claude Code.

Forge stress-tests a proposed feature design against the actual codebase before any code is written. Parallel domain experts surface cross-domain conflicts; the adversarial critic checks the plan against real code, not assumptions; the user-approval step is where the feature can be redirected or killed before work begins.

## Levels

| Level | Trigger | What runs |
|-------|---------|-----------|
| **lite** | `/forge lite` | In-session only — no expert or critic dispatch. For prototypes and bounded changes. |
| **full** | `/forge` | Parallel experts → master plan → adversarial critique → approval → implementation. Default. |
| **deep** | `/forge deep` | Full pipeline + Workflow dispatch with schema-validated reports and a two-refuter panel per Blocking finding. For high-trust-boundary or cross-team changes. |

## When to use

- The feature crosses two or more architectural areas or touches a trust boundary
- You want conflicts and risks surfaced before implementation starts
- You have a design in mind but want it stress-tested by domain experts first

For trivial localized changes (typo fixes, single-method bugs), use a direct edit — not forge. Use `/forge lite` for exploratory prototypes where the full pipeline costs more than it saves.

## Skills

| Skill | Description |
|-------|-------------|
| `/forge:forge` | Full pipeline orchestrator. Entry point for all feature reviews. |
| `/forge:expert-analysis` | Parallel domain expert analysis (architecture, security, performance, testing, UX). |
| `/forge:master-plan` | Synthesizes expert reports into a single-layer implementation plan. |
| `/forge:critic-review` | Adversarial critic: grounds the master plan against actual code. |
| `/forge:plan-revise` | Incorporates critic findings and user feedback into a revised plan. |
| `/forge:dispatch-implementation` | Optional: parallel worktree dispatch for multi-step plans. |
| `/forge:build-and-report` | Optional: build and verify step after implementation. |

## Design

Forge is stack-agnostic — no hardcoded build commands. All stack-specific behavior defers to the consuming project's own CLAUDE.md.

The research stages run on pinned models: domain experts and the adversarial critic use Fable for investigation depth, synthesis steps inherit the session model, and implementers run on Sonnet as a cost choice.

## Deep mode

`/forge deep` upgrades the two research stages to Workflow orchestration: experts return schema-validated reports, and every Blocking critic finding is independently audited by a two-refuter panel before it reaches plan revision. Requires Claude Code ≥ 2.1.154 (the `Workflow` tool); falls back to the full pipeline otherwise.

## Installation

Clone this repository and register the `forge/` directory as a Claude Code plugin.

## License

MIT — see [LICENSE](./LICENSE).
