# Forge Workflow pipeline — Steps 2–6 in one Workflow call

This is the default analysis path for `/forge` and `/forge deep`. One `Workflow` invocation runs the structural search, the reality-check spike, the parallel experts, plan synthesis, the adversarial critique, and the revision — Steps 2, 2.5, 3, 4, 5, and 6 of the pipeline. The main session keeps Steps 1 and 2.3 (which need the `Skill` tool, unavailable inside a Workflow) before the call, and Steps 7–10 (approval, implementation, build) after it.

When the `Workflow` tool is absent (Claude Code < 2.1.154), fall back to the sequential path: `/forge:expert-analysis` → `/forge:master-plan` → `/forge:critic-review` → `/forge:plan-revise`, each in the main session. The Workflow path and the fallback produce the same artifact — a revised master plan — so Step 7 onward is identical either way.

## Why one Workflow instead of four skill calls

- **Schema-validated handoffs.** Expert reports, the critique, and the revised plan are validated against JSON schemas at the tool layer, with automatic retry on malformed output. No heading-parsing between steps.
- **Native progress.** `phase()` drives the status register — one phase box per pipeline stage — so the main session emits nothing between the kickoff line and the Step 7 gate.
- **The approval gate stays in the main session.** A Workflow cannot call `AskUserQuestion`. Splitting analysis (Workflow) from approval (main session) is what makes the human gate work — see the spike early-exit below for the other place control returns to the main session.

## Invocation

The main session builds `args` from Steps 1 and 2.3, then MUST invoke `Workflow` once with the script below verbatim:

```
Workflow(
  script: <the script below, verbatim>,
  args: {
    "feature": "<verbatim feature requirements from the user>",
    "domainAuthority": [
      { "skill": "<skill name invoked in Step 2.3>", "output": "<that skill's full output>" }
    ],
    "deep": <true for `/forge deep`, false for `/forge`>
  }
)
```

- `domainAuthority` is `[]` when Step 2.3 found no authoritative project skill.
- `deep` toggles the refuter panel in the Critique phase. Everything else is identical between full and deep.
- Pass `args` as a real JSON object, not a stringified one — the script reads `args.feature`, `args.domainAuthority`, `args.deep`.

## After the Workflow returns

The result arrives as a task notification. WAIT for it before doing anything in the main session, then branch on the return value:

- **`spikeRefuted: true`** — the scout's reality-check spike refuted the riskiest assumption. The Workflow halted before dispatching experts. Surface `assumption` + `spikeEvidence` to the user as a Decision-register finding (the forge skill's *Communication* contract) and ask for a corrected scope. Do NOT silently re-scope. This is the spike's STOP rung, relocated from the main session into the Workflow.
- **`spikeRefuted: false`** — `plan` is the revised master plan markdown (resolution table included). Carry `gate` into the Step 7 digest as plain-language lines, present the digest + plan, and invoke `AskUserQuestion`. This is *Show the plan once* — the plan reaches the user here, in final form, for the first and only time.
- **`error`** — a stage returned nothing after retries. Fall back to the sequential skill path for the remaining steps, or re-run the Workflow; never block the pipeline silently.

## Script

```js
export const meta = {
  name: 'forge-pipeline',
  description: 'Forge Steps 2–6: scout + spike, parallel experts, synthesize, critique (+ optional panel), revise',
  phases: [
    { title: 'Research', detail: 'structural search, expert selection, reality-check spike' },
    { title: 'Experts', detail: 'one forge-expert per chosen domain' },
    { title: 'Plan', detail: 'synthesize expert reports into a master plan' },
    { title: 'Critique', detail: 'single adversarial-critic pass' },
    { title: 'Verify', detail: 'deep only — two refuters per Blocking finding' },
    { title: 'Revise', detail: 'verify each finding, fold into the plan' },
  ],
}

// ---- schemas ----
const CITED = {
  type: 'object', required: ['cite', 'note'],
  properties: { cite: { type: 'string', description: 'file:line, or a doc URL for externally-verified claims' }, note: { type: 'string' } },
}
const SCOUT = {
  type: 'object',
  required: ['structural_summary', 'anchors', 'domains', 'spike'],
  properties: {
    structural_summary: { type: 'string', description: 'what the feature touches, in ≤10 bullet-equivalents' },
    anchors: {
      type: 'array',
      items: { type: 'object', required: ['path', 'why'], properties: { path: { type: 'string' }, why: { type: 'string' } } },
    },
    domains: {
      type: 'array',
      description: 'expert domains to dispatch, ≤5, chosen by the selection heuristic',
      items: { type: 'string', enum: ['architecture', 'performance', 'data-state', 'ui-ux', 'security', 'testing', 'build-tooling'] },
    },
    spike: {
      type: 'object', required: ['assumption', 'verdict', 'evidence'],
      properties: {
        assumption: { type: 'string', description: 'the single riskiest assumption checked, or "(none — no risky assumption)"' },
        verdict: { type: 'string', enum: ['confirmed', 'refuted', 'none'] },
        evidence: { type: 'string', description: 'file:line grounding the verdict; empty when verdict=none' },
      },
    },
  },
}
const EXPERT_REPORT = {
  type: 'object',
  required: ['domain', 'integration_points', 'patterns', 'risks', 'open_questions', 'not_investigated'],
  properties: {
    domain: { type: 'string' },
    integration_points: { type: 'array', items: CITED },
    patterns: {
      type: 'array',
      items: { type: 'object', required: ['name', 'cite', 'implication'], properties: { name: { type: 'string' }, cite: { type: 'string' }, implication: { type: 'string' } } },
    },
    risks: {
      type: 'array',
      items: { type: 'object', required: ['risk', 'cite'], properties: { risk: { type: 'string' }, cite: { type: 'string' }, mitigation: { type: 'string' } } },
    },
    open_questions: { type: 'array', items: { type: 'string' } },
    not_investigated: { type: 'array', items: { type: 'string' } },
  },
}
const PLAN = {
  type: 'object', required: ['plan', 'gate'],
  properties: {
    plan: { type: 'string', description: 'the full master plan markdown' },
    gate: {
      type: 'object', required: ['domains', 'conflicts', 'assumptions'],
      properties: { domains: { type: 'integer' }, conflicts: { type: 'integer' }, assumptions: { type: 'integer' } },
    },
  },
}
const FINDING = {
  type: 'object', required: ['id', 'summary', 'where', 'claim', 'reality', 'suggested_fix'],
  properties: {
    id: { type: 'string' }, summary: { type: 'string' }, where: { type: 'string' },
    claim: { type: 'string' }, reality: { type: 'string' }, why_blocks: { type: 'string' }, suggested_fix: { type: 'string' },
  },
}
const CRITIQUE = {
  type: 'object', required: ['verdict', 'blocking', 'high_priority', 'open_questions', 'got_right', 'ungrounded', 'rationale'],
  properties: {
    verdict: { type: 'string', enum: ['SOUND', 'NEEDS REVISION', 'UNSOUND'] },
    blocking: { type: 'array', items: FINDING },
    high_priority: { type: 'array', items: FINDING },
    open_questions: {
      type: 'array',
      items: { type: 'object', required: ['id', 'question', 'context'], properties: { id: { type: 'string' }, question: { type: 'string' }, context: { type: 'string' }, options: { type: 'array', items: { type: 'string' } } } },
    },
    got_right: { type: 'array', items: { type: 'string' } },
    ungrounded: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
}
const VERDICT = {
  type: 'object', required: ['refuted', 'reasoning', 'evidence'],
  properties: {
    refuted: { type: 'boolean' }, reasoning: { type: 'string' },
    evidence: { type: 'string', description: 'file:line the verdict is grounded in; empty only when refuted=false' },
  },
}
const REVISION = {
  type: 'object', required: ['plan', 'gate'],
  properties: {
    plan: { type: 'string', description: 'the revised master plan markdown, resolution table included' },
    gate: {
      type: 'object', required: ['fixed', 'refuted', 'escalated'],
      properties: { fixed: { type: 'integer' }, refuted: { type: 'integer' }, escalated: { type: 'integer' } },
    },
  },
}

const authority = (args.domainAuthority ?? []).length
  ? `\n## Domain authority (treat schema/field/type facts as authoritative)\n${args.domainAuthority.map(a => `### ${a.skill}\n${a.output}`).join('\n\n')}`
  : ''

// ---- Research: structural search, expert selection, reality-check spike ----
phase('Research')
const scout = await agent(`You are scouting a codebase before a robust-development pipeline plans a feature. Do three things, then return the structured result.

## Feature
${args.feature}
${authority}

## 1. Structural search (Step 2)
Search the codebase (Read/Grep/Glob) for the essential structural knowledge the feature touches. Identify 3–5 anchor files an expert should start from — each with a one-phrase reason. Summarize what the feature touches in ≤10 bullet-equivalents.

## 2. Expert selection (Step 3 input)
Choose which domain experts to dispatch, driven by what the search surfaced. Cap at 5. Ask three questions:
- Architectural shape? Cross-cutting (touches many layers) → architecture mandatory; localized → optional.
- Primary risk axis? UI responsiveness / large data → performance. Auth / data exposure / external input → security. Persistence / migration → data-state. Visual or interaction-heavy → ui-ux.
- Validation surface? Behavior-changing → testing is worthwhile; pure refactor → skip testing.
Merge near-duplicates (>50% overlap → one combined expert). If the feature text names specific domains, honor exactly that list. A single-expert dispatch is occasionally right. Return the chosen domains.

## 3. Reality-check spike (Step 2.5)
Identify the single riskiest assumption — the claim that, if false, invalidates the whole design — and run a ≤30-line read to confirm or refute it. Return verdict=confirmed (assumption holds, pipeline proceeds), verdict=refuted (assumption is false — the pipeline will HALT and ask the user to re-scope), or verdict=none (the feature has no risky assumption: pure refactor, well-trodden CRUD). Ground confirmed/refuted in file:line evidence.

Read-only. Do not write files. Do not propose a plan.`,
  { schema: SCOUT, label: 'scout', phase: 'Research' })

if (!scout) return { error: 'scout returned no result — fall back to the sequential skill path' }
if (scout.spike.verdict === 'refuted') {
  return { spikeRefuted: true, assumption: scout.spike.assumption, spikeEvidence: scout.spike.evidence }
}

const anchorBlock = scout.anchors.map(a => `- \`${a.path}\` — ${a.why}`).join('\n')

// ---- Experts: one forge-expert per chosen domain (barrier — the plan needs all reports) ----
phase('Experts')
const reports = (await parallel(scout.domains.map(d => () =>
  agent(`## Domain
${d}

## Feature
${args.feature}

## Anchor files
${anchorBlock}

## Structural context
${scout.structural_summary}
${args.domainAuthority?.length ? `\n## Domain authority\n${args.domainAuthority.map(a => a.output).join('\n\n')}` : ''}`,
    { agentType: 'forge-expert', label: `expert:${d}`, phase: 'Experts', schema: EXPERT_REPORT })
))).filter(Boolean)

if (!reports.length) return { error: 'no expert returned a report — fall back to the sequential skill path' }

// ---- Plan: synthesize reports into a master plan ----
phase('Plan')
const planResult = await agent(`Synthesize these expert reports into a single master implementation plan.

## Feature requirements (verbatim)
${args.feature}

## Expert reports
${JSON.stringify(reports, null, 2)}
${authority}`,
  { agentType: 'forge-plan-synthesizer', label: 'synthesize', phase: 'Plan', schema: PLAN })

if (!planResult) return { error: 'synthesizer returned no plan — fall back to the sequential skill path' }

// ---- Critique: single adversarial-critic pass over the whole plan ----
phase('Critique')
const critique = await agent(`## Master plan to critique
${planResult.plan}

## Original feature requirements
${args.feature}

## Expert reports the plan was synthesized from
${JSON.stringify(reports, null, 2)}`,
  { agentType: 'adversarial-critic', label: 'critic', phase: 'Critique', schema: CRITIQUE })

if (!critique) return { error: 'critic returned no report — fall back to the sequential skill path' }

// ---- Verify: deep only — two refuters per Blocking finding ----
let blocking = critique.blocking ?? []
if (args.deep && blocking.length) {
  phase('Verify')
  const refutePrompt = (b, lens) => `You are auditing ONE Blocking finding from a plan critique. REFUTE it if you can — read the cited code yourself and check the finding's "Reality" claim against the actual files. Set refuted=false ONLY when the code genuinely supports the finding.

Lens: ${lens}.

## Finding ${b.id} — ${b.summary}
Where: ${b.where}
Claim (what the plan says): ${b.claim}
Reality (what the critic says the code shows): ${b.reality}
Suggested fix: ${b.suggested_fix}

Ground your verdict in file:line evidence you read THIS session — never in what the finding text sounds like.`
  blocking = await parallel(blocking.map(b => () =>
    parallel([
      () => agent(refutePrompt(b, 'identifier accuracy — do the named files, lines, symbols, and signatures actually exist as the finding claims'),
        { label: `refute:${b.id}:identifiers`, phase: 'Verify', schema: VERDICT }),
      () => agent(refutePrompt(b, 'consequence severity — would implementing the plan as written actually fail the way the finding claims'),
        { label: `refute:${b.id}:consequence`, phase: 'Verify', schema: VERDICT }),
    ]).then(vs => {
      const votes = vs.filter(Boolean)
      return { ...b, refuter_votes: votes, panel_refuted: votes.length === 2 && votes.every(v => v.refuted) }
    })
  ))
}

// ---- Revise: verify each finding, fold the verified ones into the plan ----
phase('Revise')
const revision = await agent(`Verify each critic finding against the code, then fold the verified ones into the plan.

## Current master plan
${planResult.plan}

## Critique
${JSON.stringify({ ...critique, blocking }, null, 2)}

${args.deep ? 'Refuter-panel verdicts are attached per Blocking finding (panel_refuted + refuter_votes). Verify panel-refuted findings FIRST; the panel prioritizes, it does not overrule.' : ''}`,
  { agentType: 'forge-plan-reviser', label: 'revise', phase: 'Revise', schema: REVISION })

if (!revision) return { error: 'reviser returned no plan — fall back to the sequential skill path' }

return {
  spikeRefuted: false,
  plan: revision.plan,
  gate: {
    domains: planResult.gate.domains,
    conflicts: planResult.gate.conflicts,
    blocking_fixed: revision.gate.fixed,
    refuted: revision.gate.refuted,
    escalated: revision.gate.escalated,
  },
}
```

## Design notes

- **The barrier in the Experts phase is correct, not a smell.** Synthesis needs every report before it starts; there is no per-report downstream stage to pipeline into.
- **The spike early-exit is the one place control returns to the main session mid-pipeline.** A Workflow cannot call `AskUserQuestion`, so a refuted spike returns a flag and the main session handles the user redirect — the same reason the approval gate (Step 7) lives outside the Workflow.
- **`deep` adds only the Verify phase.** The refuter panel marks each Blocking finding `panel_refuted` when both lens-distinct refuters ground a refutation; the reviser verifies those first. Full runs skip the phase entirely.
- **Every stage fails soft.** A `null` from any `agent()` (user skip, terminal API error after retries) returns `{ error }`, and the main session falls back to the sequential skill path rather than blocking.
