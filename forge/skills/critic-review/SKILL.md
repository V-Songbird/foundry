---
name: critic-review
description: Dispatches the `adversarial-critic` subagent (Fable, read-only, bounded maxTurns) against the master plan in conversation context. The critic ground-truths the plan against the actual codebase and returns a structured critique (Blocking / High-priority / Open questions / Findings I couldn't ground in code / Verdict rationale). In deep mode, wraps the critic in a Workflow that adds a two-refuter panel per Blocking finding.
when_to_use: Use as Step 5 of the forge workflow, immediately after `/forge:master-plan` produces a plan. The critique drives `/forge:plan-revise` in the next step.
user-invocable: false
allowed-tools: Agent, Workflow
---

# Critic Review Dispatch

Thin dispatcher that hands the master plan to the `adversarial-critic` subagent for ground-truth review against the codebase. The subagent is fixed-role (Fable, read-only, bounded `maxTurns`) and returns a structured critique the orchestrator consumes in `/plan-revise`.

## Required Inputs

- The master plan in conversation context (produced by `/forge:master-plan`).
- The original feature requirements as the user expressed them.
- Optional: any expert reports the plan was synthesized from (paste paths or references; the critic will load what it needs).

## Dispatch Template

MUST invoke `Agent` exactly once. Single dispatch — the critic must hold the entire plan to spot cross-cutting issues; parallel slicing breaks coherence.

```
Agent(
  description: "Adversarial critique of master plan against codebase",
  subagent_type: "adversarial-critic",
  model: "fable",         # mirrors adversarial-critic.md frontmatter; explicit so the dispatch is self-documenting
  run_in_background: false,
  prompt: """
## Master plan to critique
<full master plan, verbatim from conversation>

## Original feature requirements
<feature requirements as the user expressed them>

## Expert reports the plan was synthesized from
<inline paste OR reference to where in the conversation the reports live; if paths exist, list them>

## What you return
A single structured critique per the format defined in your system prompt (Blocking / High-priority / Open questions / What the plan got right / **Findings I couldn't ground in code** / Verdict rationale). Cite `file:line` on every issue. The "Findings I couldn't ground in code" section is mandatory: it lists hunches you formed but could not verify against actual files within the budget, so `/plan-revise` knows where to look first.
"""
)
```

The subagent's role, tool set, and `maxTurns` are encoded in `../../agents/adversarial-critic.md`; do not duplicate them in the prompt above. The `Agent` tool does NOT accept `name` or `max_turns` at the call site — the harness silently drops both — so do not add them.

## Critical Constraints

- **Single dispatch.** Splitting the critique across parallel critics produces siloed reports that miss cross-section issues. The critic needs the whole plan in one context.
- **Foreground only.** NEVER set `run_in_background: true`. The next step (`/forge:plan-revise`) consumes the critique immediately; backgrounding adds latency without benefit.
- **Pass the plan verbatim.** The critic reads the plan and the codebase. Paraphrasing the plan loses citations; loses citations loses critic effectiveness.
- **Do not pre-filter the plan.** Even if you suspect a section is fine, send it. The critic's value is independent verification — not confirming your suspicions.
- **Subagent prompts cannot use `AskUserQuestion`.** The critic's system prompt already instructs it to file ambiguities as open questions. Do not add an "ask the user if unsure" instruction to the dispatch prompt.

## Deep mode — refuter panel on Blocking findings

Use this path INSTEAD of the `Agent` template above when the forge run is in deep mode (user explicitly asked for a deep / thorough run AND the `Workflow` tool is available — the same gate as `/forge:expert-analysis` deep mode; fall back to the standard `Agent` dispatch when either fails).

MUST invoke `Workflow` exactly once with the script in [references/workflow-panel.md](references/workflow-panel.md). The script:

1. Runs the critic exactly once (`agentType: "adversarial-critic"`, schema-validated critique) — the single-dispatch constraint above still holds; refuters audit individual findings, they are not additional critics.
2. Dispatches two independent refuters per Blocking finding, each with a distinct lens (identifier accuracy / consequence severity), each prompted to refute the finding against the actual code.
3. Marks a finding `panel_refuted: true` only when BOTH refuters ground a refutation in `file:line` evidence.

The workflow returns via task notification — WAIT for it, then hand the critique plus the per-finding panel verdicts to `/forge:plan-revise`. Panel-refuted findings arrive pre-flagged, but plan-revise still performs its own read-the-code verification: the panel prioritizes, it does not overrule.

## Next Step

After the critic returns, invoke `/forge:plan-revise` to verify each critique and fold the verified ones back into the plan. Keep the critic's agent ID from the dispatch result — when `/forge:plan-revise` refutes a Blocking finding, it resumes the critic via `SendMessage` for a one-exchange confirm-or-withdraw rather than silently overruling.

## Additional resources

- For the deep-mode Workflow script, the critique JSON schema, and the refuter-panel design, see [references/workflow-panel.md](references/workflow-panel.md)
