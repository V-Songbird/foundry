# Deep-mode Workflow dispatch for expert analysis

Deep mode replaces the parallel `Agent` calls with ONE `Workflow` invocation. The script below is the canonical template — adapt the domain list per run, keep the schema verbatim.

## Why Workflow here

- **Schema-validated reports.** Each expert is forced through a structured-output call matching `EXPERT_REPORT`; the harness validates at the tool layer and retries malformed output. No heading-parsing, no partial-report ambiguity.
- **Same agent, same constraints.** `agentType: "forge-expert"` resolves the plugin's agent definition — its model (`fable`), `maxTurns`, citation discipline, and external-verification rules all apply unchanged.

## Invocation

Build one dispatch prompt per chosen domain exactly as the SKILL.md Dispatch Template specifies (Domain / Stack experience / Feature / Anchor files / optional Domain authority — the same four-to-five sections, verbatim feature text, self-contained). Then MUST invoke `Workflow` once:

```
Workflow(
  script: <the script below, verbatim>,
  args: { "dispatches": [
    { "domain": "architecture", "prompt": "<full dispatch prompt for this domain>" },
    { "domain": "security",     "prompt": "<…>" }
  ] }
)
```

Pass `args` as a real JSON object, not a stringified one — the script calls `args.dispatches.map(...)`.

## Script

```js
export const meta = {
  name: 'forge-expert-analysis',
  description: 'Forge Step 3: parallel domain experts with schema-validated reports',
  phases: [{ title: 'Experts', detail: 'one forge-expert per domain' }],
}

const CITED = {
  type: 'object',
  required: ['cite', 'note'],
  properties: {
    cite: { type: 'string', description: 'file:line, or a doc URL for externally-verified claims' },
    note: { type: 'string' },
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
      items: {
        type: 'object',
        required: ['name', 'cite', 'implication'],
        properties: { name: { type: 'string' }, cite: { type: 'string' }, implication: { type: 'string' } },
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['risk', 'cite'],
        properties: { risk: { type: 'string' }, cite: { type: 'string' }, mitigation: { type: 'string' } },
      },
    },
    open_questions: { type: 'array', items: { type: 'string' } },
    not_investigated: { type: 'array', items: { type: 'string' } },
  },
}

phase('Experts')
const reports = await parallel(args.dispatches.map(d => () =>
  agent(d.prompt, { agentType: 'forge-expert', label: `expert:${d.domain}`, phase: 'Experts', schema: EXPERT_REPORT })
))
const missing = args.dispatches.filter((d, i) => !reports[i]).map(d => d.domain)
if (missing.length) log(`No report from: ${missing.join(', ')}`)
return { reports: reports.filter(Boolean), missing }
```

The barrier (`parallel`) is correct here, not a smell: `/forge:master-plan` needs every report before synthesis starts — there is no per-report downstream stage to pipeline into.

## After the workflow returns

- The result arrives as a task notification. WAIT for it before invoking `/forge:master-plan`.
- `reports` is an array of structured objects whose fields map one-to-one onto the markdown report headings (`integration_points` ↔ Integration points, `patterns` ↔ Patterns to follow, `risks` ↔ Domain-specific risks, `open_questions` ↔ Open questions, `not_investigated` ↔ What I did NOT investigate). Feed them to `/forge:master-plan` as-is — the synthesis procedure is identical.
- If `missing` is non-empty, re-dispatch just those domains before synthesis — the standard `Agent` path from the SKILL.md is fine for a single re-run.
