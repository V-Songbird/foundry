# Writing Principles

Core principles for writing instruction rules that Claude will actually follow. Use as a mental model when composing directives — the quality score (see `scoring-mechanics.md`) is the mechanical reflection of these principles.

---

## Principle 1: Write for Claude, not for humans

Rules in CLAUDE.md and `.claude/rules/` are read by Claude, not people. The audience is a stateless model that reads each session from scratch and has no memory of prior sessions. Write for that audience.

**Implications:**
- Every rule must be independently parseable. A rule that references a heading or a prior context ("as mentioned above") loses the context on extraction.
- Jargon the team understands but Claude does not is a comprehension failure, not a style preference. Use the canonical name of the tool, framework, or pattern, not a nickname.
- Intent bridges edge cases. "Use X" works if X is unambiguous. "Use X — because Y" lets Claude apply the principle when the trigger doesn't literally match.

---

## Principle 2: Directives, not descriptions

A description states what exists. A directive tells Claude what to do.

| Description (avoid) | Directive (write) |
|----------------------|-------------------|
| "Components use React Query for data fetching" | "Use React Query for all data fetching in components" |
| "Error responses include a `code` field" | "Include a `code` field in every error response. Example: `{ error: 'Not found', code: 404 }`" |

The structural difference: a description has a subject that is not Claude. A directive's implicit subject is Claude.

---

## Principle 3: Strong verb, close to the start

The imperative verb is the first signal Claude uses to classify the rule. Bury it and Claude's F1 score drops.

Patterns:
- **Best**: "Validate all request bodies at the handler boundary using Zod."
- **Acceptable**: "All request bodies MUST be validated at the handler boundary using Zod."
- **Avoid**: "It is important that request bodies are validated..."
- **Avoid**: "You should try to validate..."

Modal strength ordering: `MUST`/`ALWAYS`/`NEVER` > bare imperative > `should` > `prefer`/`consider`/`try to`.

Use the strongest modal that accurately reflects the mandate. Inflating modals for unimportant rules dilutes the signal for genuinely non-negotiable ones.

---

## Principle 4: Positive statement beats prohibition

Claude executes "do X" more reliably than "don't do Y" because a prohibition requires Claude to recognize a prohibited action mid-execution and interrupt. A positive directive binds the trigger and action together at source.

Prohibition upgrade patterns:

1. Pure prohibition → Add a positive alternative
   - Before: "Never concatenate SQL strings"
   - After: "Use parameterized queries — never concatenate SQL strings. Example: `db.query('WHERE id = $1', [id])` not `db.query('WHERE id = ' + id)`"

2. Prohibition → Reframe as positive mandate
   - Before: "Don't use default exports"
   - After: "Use named exports exclusively"

When a prohibition genuinely has no safe positive alternative (e.g., "Never log tokens"), add a note explaining why there's no alternative, so Claude understands this isn't an oversight.

---

## Principle 5: One concrete anchor per directive

Concrete anchors are file paths, code spans, numeric thresholds, and named entities. Even one anchor dramatically improves F7:

- F7 with 0 anchors: 0.20
- F7 with 1 anchor: 0.55

**Minimum viable concrete rule:**
> "Use named exports — example: `export function createUser()` not `export default function createUser()`"

One code span. One before/after contrast. F7 jumps from 0.20 to ~0.70.

---

## Principle 6: Scope rules where they fire

Rules scoped to always-load (CLAUDE.md, no `paths:`) consume Claude's attention budget on every session, including sessions where the rule is irrelevant. This dilutes the attention available for rules that do matter.

**CLAUDE.md should contain:**
- Conventions that apply to every file in every session (commit format, tool preferences, project-wide naming)
- Rules where the trigger is a session-level property (e.g., "always use the project's shared config, not ad-hoc values")

**`.claude/rules/` with `paths:` should contain:**
- Language-specific conventions (TypeScript, Python, SQL)
- Directory-specific conventions (API routes, test files, migrations)
- Framework-specific conventions (React components, database models)

The question to ask before placing any rule: "Does this rule apply when editing ANY file in the project?" If no, scope it.

---

## Principle 7: Don't duplicate what hooks and linters can enforce

If a rule can be enforced mechanically (git hooks, linters, type checkers, formatters), putting it in CLAUDE.md is redundant and potentially counterproductive — Claude is now a fallback for infrastructure that should be reliable.

**Signs that a rule belongs in tooling, not instructions:**
- The rule describes a command to run at a specific lifecycle event ("before committing", "after saving")
- The rule enforces a syntactic property (whitespace, bracket style, import order, type annotations)
- The rule is a naming convention that a linter plugin could check
- F8 < 0.40 in the assess-rules report ("Hook opportunities" section)

When this pattern is detected, surface it to the user: show the rule, show the F8 score, suggest the hook or linter config instead. Let the user decide.

---

## Principle 8: Categories calibrate expectations

Rules should be tagged with their intent category. The category tells both Claude and the quality auditor how to weight the rule.

| Category | Intended for | Score floor |
|----------|--------------|-------------|
| `mandate` (default) | Non-negotiable conventions | 0.50 |
| `override` | Exceptions to other rules for specific contexts | 0.25 |
| `preference` | Soft defaults Claude follows when there's no stronger signal | 0.25 |

Override and preference rules legitimately score lower on F1 and F2 — hedged verbs and prohibition framing are intentional in these categories. The category suppresses the floor-failure alert that would otherwise fire.

If a rule would score below 0.25 in any category, that's a signal the rule has structural problems beyond intentional hedging — rewrite it.

---

## Principle 9: One directive per extractable unit

The audit pipeline's extractor splits compound directives on `, and ` / ` and ` (when both sides have independent imperative verbs) and `;` (outside code spans). Compound directives get fragmented into orphan sentences that score poorly on their own.

Write one directive, one extractable unit. If two things really must be said, write them as separate rules.

**Safe connectives:**
- `or` (not a splitter)
- `, then` (if the second clause uses a participle, not an imperative)
- Em-dash followed by an example or explanation (not an independent clause)

**Unsafe connectives:**
- `, and [imperative verb]`
- `; [any continuation]`

When in doubt: read the rule aloud. If pausing after "and" would produce two complete instructions, split them.

---

## Principle 10: High-stakes rules get more signals

A rule stated one way fires with some probability. A rule stated as verb + rationale + example + anti-example fires with much higher probability because Claude must miss all four representations simultaneously to miss the rule.

Use the high-stakes rule scaffold (see `rule-templates.md § Advanced`) for rules whose violation produces a costly outcome. For everyday conventions, a single directive with one concrete anchor is sufficient.

The cost of over-engineering: redundancy consumes tokens (context budget) and can cause the rule to fire in unintended edge cases. Reserve multi-signal rules for high-stakes cases.
