# Deep-mode Workflow panel for critic review

Deep mode replaces the single `Agent` dispatch with ONE `Workflow` invocation: the same single critic, then two independent refuters per Blocking finding. The refuters exist because Blocking findings are commitments — every wrong one burns a `/forge:plan-revise` verification cycle, and a one-pass critic produces confident misfires on dense plans (that is why the critic's own self-doubt rule exists).

## Invocation

Build the critic prompt exactly as the SKILL.md Dispatch Template specifies (plan verbatim / feature requirements / expert reports). Then MUST invoke `Workflow` once:

```
Workflow(
  script: <the script below, verbatim>,
  args: {
    "criticPrompt": "<full critic dispatch prompt>",
    "planExcerpt": "<the plan's Steps section verbatim — refuters need it for context>"
  }
)
```

Pass `args` as a real JSON object, not a stringified one.

## Script

```js
export const meta = {
  name: 'forge-critic-panel',
  description: 'Forge Step 5: adversarial critique + two-refuter panel on Blocking findings',
  phases: [
    { title: 'Critique', detail: 'single adversarial-critic pass' },
    { title: 'Verify', detail: 'two refuters per Blocking finding' },
  ],
}

const FINDING = {
  type: 'object',
  required: ['id', 'summary', 'where', 'claim', 'reality', 'suggested_fix'],
  properties: {
    id: { type: 'string' }, summary: { type: 'string' }, where: { type: 'string' },
    claim: { type: 'string' }, reality: { type: 'string' },
    why_blocks: { type: 'string' }, suggested_fix: { type: 'string' },
  },
}
const CRITIQUE = {
  type: 'object',
  required: ['verdict', 'blocking', 'high_priority', 'open_questions', 'got_right', 'ungrounded', 'rationale'],
  properties: {
    verdict: { type: 'string', enum: ['SOUND', 'NEEDS REVISION', 'UNSOUND'] },
    blocking: { type: 'array', items: FINDING },
    high_priority: { type: 'array', items: FINDING },
    open_questions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'question', 'context'],
        properties: {
          id: { type: 'string' }, question: { type: 'string' }, context: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    got_right: { type: 'array', items: { type: 'string' } },
    ungrounded: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
}
const VERDICT = {
  type: 'object',
  required: ['refuted', 'reasoning', 'evidence'],
  properties: {
    refuted: { type: 'boolean' },
    reasoning: { type: 'string' },
    evidence: { type: 'string', description: 'file:line the verdict is grounded in; empty only when refuted=false' },
  },
}

phase('Critique')
const critique = await agent(args.criticPrompt, { agentType: 'adversarial-critic', label: 'critic', phase: 'Critique', schema: CRITIQUE })
if (!critique) return { critique: null, error: 'critic returned no report — re-dispatch via the standard Agent path' }

phase('Verify')
const refutePrompt = (b, lens) => `You are auditing ONE Blocking finding from a plan critique. Your job is to REFUTE it if you can — read the cited code yourself and check the finding's "Reality" claim against the actual files. Set refuted=false ONLY when the code genuinely supports the finding.

Lens: ${lens}.

## Finding ${b.id} — ${b.summary}
Where: ${b.where}
Claim (what the plan says): ${b.claim}
Reality (what the critic says the code shows): ${b.reality}
Suggested fix: ${b.suggested_fix}

## Plan steps under critique (context)
${args.planExcerpt}

Ground your verdict in file:line evidence you read THIS session — never in what the finding text sounds like.`
const blocking = await parallel((critique.blocking ?? []).map(b => () =>
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
return { critique, blocking }
```

Design notes:

- The two refuters carry DISTINCT lenses (identifier accuracy, consequence severity) — diversity catches failure modes redundancy cannot.
- `panel_refuted` requires BOTH refuters to refute with grounded evidence. One dissenting refuter keeps the finding live — the panel's job is to catch clear misfires, not to outvote the critic on judgment calls.
- The single-critic constraint from the SKILL.md still holds: exactly one critic sees the whole plan; refuters audit individual findings, they are not additional critics.

## After the workflow returns

- The result arrives as a task notification. WAIT for it before invoking `/forge:plan-revise`.
- `blocking` is the critique's Blocking list enriched with `refuter_votes` and `panel_refuted` per finding. Hand both `critique` and `blocking` to `/forge:plan-revise`.
- Panel-refuted findings are verified FIRST by plan-revise (they are the likeliest misfires), but the panel only prioritizes — plan-revise's own read-the-code verification still decides.
