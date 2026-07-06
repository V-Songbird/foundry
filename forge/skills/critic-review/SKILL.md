---
name: critic-review
description: Dispatches the `adversarial-critic` subagent (Fable, read-only, bounded maxTurns) against the master plan in conversation context. The critic ground-truths the plan against the actual codebase and returns a structured critique (Blocking / High-priority / Open questions / Findings I couldn't ground in code / Verdict rationale). This is the sequential fallback path for Step 5 — in a normal full/deep run the critic runs inside the Forge Workflow pipeline instead.
when_to_use: Use as Step 5 of the forge workflow, immediately after `/forge:master-plan` produces a plan. The critique drives `/forge:plan-revise` in the next step.
user-invocable: false
allowed-tools: Agent
---

# Critic Review Dispatch

Thin dispatcher that hands the master plan to the `adversarial-critic` subagent for ground-truth review against the codebase. The subagent is fixed-role (Fable, read-only, bounded `maxTurns`) and returns a structured critique the orchestrator consumes in `/plan-revise`.

> **This skill is the sequential fallback path (Step 5) for when the `Workflow` tool is absent.** In a normal full/deep run, the critic — and the deep-run refuter panel — run inside the single Forge Workflow pipeline (`skills/forge/references/workflow-pipeline.md`), not here. The orchestrator invokes this skill only when `Workflow` is unavailable or the pipeline returned `{ error }`.

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

## User-facing output

The user sees one status line — **"Critic reviewing the plan against the code…"**. Per the forge skill's *Communication* contract, the dispatch plumbing is silent: the `fable` pin and any fallback when it is unavailable, the single-`Agent`-vs-`Workflow` routing, and the critic's agent ID are internal. The critique itself is consumed by `/forge:plan-revise`, not shown to the user; its outcome reaches the user once, as a single plain line in the Step 7 digest ("critic flagged 2 gaps — both verified and fixed").

## Critical Constraints

- **Single dispatch.** Splitting the critique across parallel critics produces siloed reports that miss cross-section issues. The critic needs the whole plan in one context.
- **Foreground only.** NEVER set `run_in_background: true`. The next step (`/forge:plan-revise`) consumes the critique immediately; backgrounding adds latency without benefit.
- **Pass the plan verbatim.** The critic reads the plan and the codebase. Paraphrasing the plan loses citations; loses citations loses critic effectiveness.
- **Do not pre-filter the plan.** Even if you suspect a section is fine, send it. The critic's value is independent verification — not confirming your suspicions.
- **Subagent prompts cannot use `AskUserQuestion`.** The critic's system prompt already instructs it to file ambiguities as open questions. Do not add an "ask the user if unsure" instruction to the dispatch prompt.

## Refuter panel (deep) — in the Workflow path

The deep-run refuter panel — two lens-distinct refuters per Blocking finding, marking `panel_refuted` only when both ground a refutation in `file:line` — now lives in the whole-pipeline script (`skills/forge/references/workflow-pipeline.md`), where it is the optional Verify phase toggled by `deep`, not a separate per-step Workflow. There is nothing to invoke from here for deep mode; this `Agent` dispatch is the no-Workflow fallback, and in that fallback the run behaves as full (no panel) regardless of level.

## Next Step

After the critic returns, invoke `/forge:plan-revise` to verify each critique and fold the verified ones back into the plan. Keep the critic's agent ID from the dispatch result — when `/forge:plan-revise` refutes a Blocking finding, it resumes the critic via `SendMessage` for a one-exchange confirm-or-withdraw rather than silently overruling. (That resume is available only on this in-session fallback path; the Workflow path's `forge-plan-reviser` agent has no back-channel to the critic and grounds its refutations in code alone.)
