---
name: plan-revise
description: Verifies each critique finding from `/forge:critic-review`, then folds the verified ones back into the master plan in conversation context. Walks the critic's blocking issues, high-priority gaps, and open questions; reads the cited code to confirm or refute each one; rewrites the affected plan sections; produces the final plan ready for user approval.
when_to_use: Use as Step 6 of the forge workflow, after `/forge:critic-review` returns its critique.
user-invocable: false
effort: high
allowed-tools: Read, Grep, SendMessage
---

# Plan Revise

Take the critic's report, ground-truth each finding against the code (do not blindly trust either the critic OR the original plan), and produce a strengthened final plan ready for user approval.

## Required Inputs

- The critic's structured report from `/forge:critic-review`, in conversation context.
- The current master plan, in conversation context.
- The original feature requirements as the user expressed them.

## Revision procedure

For each critic finding, walk this loop:

1. **Read the cited code.** Invoke `Read` (and `Grep` if needed) on the `file:line` the critic referenced. Verify the critic's "Reality" claim against the actual code.
2. **Classify the finding** based on what you observed:
   - **Verified blocking** — code matches the critic's claim AND the consequence is real. MUST fix in the plan.
   - **Verified gap** — code shows the plan was missing a decision; the critic's suggested fix is sound. Fold it in.
   - **Refuted** — code does not match the critic's claim (critic misread). Note in the plan's "critique resolution" section with `file:line` evidence so the user sees you checked.
   - **Open question** — neither the plan nor the critic can resolve from code alone; bubble up to the user-approval step.
3. **Apply the change.** For verified items, rewrite the affected plan section in place — do NOT append a "v2" plan; the conversation should hold one canonical plan at a time. Keep all `file:line` citations.
4. **Append a "Critique resolution" section to the plan.** One row per critic finding: ID, classification (verified-blocking / verified-gap / refuted / open), and the action taken (rewrote section X / added step W<N> / refuted with `file:line` Z / escalated to user).

### Contesting a refuted Blocking finding (one exchange, optional)

When you classify a **Blocking** finding as Refuted and the critic's agent ID is available from the `/forge:critic-review` dispatch result, you SHOULD invoke `SendMessage` to that ID with your `file:line` evidence and ask the critic to confirm or withdraw the finding. The critic resumes with its investigation context intact, so the exchange is cheap and genuinely adversarial — strictly better than silently overruling a Blocking commitment.

- Cap at ONE exchange per finding. If the critic maintains the finding after seeing your evidence, escalate it as an open question at the Step 7 approval gate rather than looping.
- Record the outcome in the Critique resolution table: `refuted — critic withdrew` or `contested — escalated to user`, with the evidence column filled either way.
- Skip the exchange when `SendMessage` is unavailable in this session (older Claude Code builds) or when the finding is High-priority / Open question — those resolve on evidence alone.
- In deep mode, panel-refuted findings (see `/forge:critic-review`) arrive pre-flagged — verify those FIRST; they are the likeliest misfires.

## What you produce

The plan from `/forge:master-plan`, revised in place, plus a new section appended:

```markdown
## Critique resolution

| Critic ID | Classification | Action | Evidence |
|-----------|----------------|--------|----------|
| B1 | verified-blocking | Rewrote step W2; added contract clause C5 | `path/file.ext:42` |
| H1 | verified-gap | Added "Migration script" to step W3 | `path/migrations/:`, no existing 0042 |
| H2 | refuted | Critic misread; existing pattern at `path/handler.cs:89` matches plan | `path/handler.cs:89` |
| Q1 | open — escalated to user | <restate question for user approval> | n/a |

```

## Critical Constraints

- **NEVER blindly accept the critique.** The critic can misread code. Verify every finding by reading the cited file yourself before changing the plan.
- **NEVER blindly defend the plan.** Verified blocking issues MUST be fixed before dispatch. "I think it's fine" without `file:line` evidence is not a refutation.
- **NEVER drop an open question.** If neither side can resolve it from code, escalate to the user in the next step (Step 7 user approval).
- **One canonical plan in the conversation.** Rewrite in place; don't accumulate v1 / v2 / v3. The orchestrator (or downstream implementer) works from the latest plan; ambiguity costs more than the temporary discomfort of overwriting.
- **Cite `file:line` on every classification.** A "refuted" finding without code evidence is just disagreement; the user (Step 7) needs evidence to trust the resolution.

## Next Step

After revision is complete, present the plan digest followed by the revised plan to the user for approval. See the `forge` skill's "Step 7 — Approval gate" section for the digest shape (a short, dev-pitched summary of intention, change shape, risks, and verification — no plan machinery) and the canonical `AskUserQuestion` schema (Approve / Revise / Cancel). After approval, the orchestrator routes implementation: `/forge:dispatch-implementation` if the plan has ≥ 2 steps marked `Parallel-friendly: yes`, or in-session implementation otherwise.

Watch for plan growth during revision. The original plan was capped at ≤ 80 lines for typical features; folding in critique findings can push it past that. If the revised plan exceeds the cap, the same triage rules apply — fold one-line-mitigation Risks into step descriptions, drop Open questions that have implicit recommendations, prune step prose to the essentials.
