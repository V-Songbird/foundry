# Scoring Mechanics

How the quality score is computed for each rule. Used during Phase 3 self-scoring and when walking the user through a rule's quality breakdown.

The authoritative algorithm description is in `../../assess-rules/references/quality-model.md`. This file is the builder's companion: quick lookup tables for factor values and score construction without the full derivation.

---

## Factor weights (composite)

| Factor | Weight | Layer | What it measures |
|--------|--------|-------|------------------|
| F7 Concreteness | 0.29 | Clarity | File paths, code examples, numeric thresholds, named entities |
| F1 Verb strength | 0.22 | Clarity | Imperative strength of the controlling verb |
| F3 Trigger-action distance | 0.19 | Activation | How close the trigger is to the rule's action in attention space |
| F4 Load-trigger alignment | 0.17 | Activation | Whether the rule is scoped to the files where it fires |
| F2 Framing polarity | 0.15 | Clarity | Positive imperative vs. prohibition framing |

F8 Enforceability ceiling is NOT a composite factor. It's a parallel signal — reported as `is_hook_candidate` (F8 < 0.40) and surfaces low-F8 rules in the audit's "Hook opportunities" section. Low F8 does not penalize the comprehension score.

---

## F1 verb strength — lookup table

| Verb type | Score | Examples |
|-----------|-------|---------|
| Bare imperative | 0.85 | "Use", "Run", "Add", "Return", "Call" |
| Modal + verb | 0.75 | "MUST use", "ALWAYS return", "NEVER call" |
| Weak modal | 0.55 | "Should use", "may return" |
| Hedged | 0.30 | "Try to use", "consider returning" |
| Negative passive | 0.20 | "is not recommended" |

Classify by the first controlling verb of the directive. For compound sentences, use the strongest verb, but check the fragmentation risk (see `../assess-rules/references/rewrite-guide.md`).

---

## F2 framing polarity — lookup table

| Frame type | Score | Pattern |
|------------|-------|---------|
| Positive imperative | 0.85 | "Use X", "Return Y", "Call Z" |
| Positive imperative with soft prohibition | 0.70 | "Use X (not Y)" |
| Pure prohibition with positive alternative | 0.60 | "Never Y — use X instead" |
| Pure prohibition | 0.40 | "Never X", "Do not Y" |
| Double negative | 0.20 | "Don't avoid X" |

Prohibition-shaped rules are not wrong — they just score lower on F2. Adding a positive alternative ("Never Y — use X instead") lifts F2 from 0.40 to 0.60. Override rules legitimately cluster in the 0.40–0.50 range.

---

## F3 trigger-action distance — judgment levels

F3 is a judgment factor: the pipeline prompts for it and the value is written to `.hestia-tmp/draft_judgments.json`. In the builder context, estimate it:

| Level | Score | Trigger-action relationship |
|-------|-------|-----------------------------|
| 0 | 1.00 | No separate trigger — the action fires immediately (e.g., "Add an X field to every new Y class") |
| 1 | 0.85 | Same task, same file |
| 2 | 0.70 | Same task, different file (plausible attention span) |
| 3 | 0.55 | Near-future event in the same session |
| 4 | 0.40 | Named future event ("before committing", "when deploying") |
| 5 | 0.25 | Abstract condition ("whenever security is a concern") |

Rules with triggers at Level 4+ are candidates for `PreToolUse`/`PostToolUse` hooks. Check F8 to confirm.

---

## F4 load-trigger alignment

| Situation | Score |
|-----------|-------|
| Rule has `globs:` or `paths:` matching the files it applies to | 1.00 |
| Rule is in CLAUDE.md and applies to ALL files | 0.85 |
| Rule is in CLAUDE.md but only applies to specific files | 0.40 |
| Rule has a glob but the glob doesn't match the rule's trigger files | 0.40 |

For rules in scoped files: run `Glob("<pattern>")` against the repository to confirm the glob pattern is live. Dead globs score 0.40 (same as misaligned).

---

## F7 concreteness — scoring guide

Count the concrete markers in the directive:

| Concrete marker type | Examples |
|----------------------|---------|
| File path or glob | `src/api/*.ts`, `CLAUDE.md`, `.env` |
| Code span | `` `parseInt(x, 10)` ``, `` `import from '@/...'` `` |
| Named entity | `Zod`, `react-intl`, `pg.query`, `Jest` |
| Numeric threshold | `< 200ms`, `≤ 40 lines`, `fewer than 15 words` |

| Concrete count | Score |
|----------------|-------|
| 0 | 0.20 |
| 1 | 0.55 |
| 2 | 0.70 |
| 3–4 | 0.85 |
| 5+ | 0.90 |

Boosters (add 0.10 each, cap at 0.90):
- Inline before/after example
- Numeric threshold present

---

## Score construction

```
composite = Σ (w_i × F_i) over F1, F2, F3, F4, F7
```

**Category floors:**

| Category | Floor |
|----------|-------|
| mandate | 0.50 |
| override | 0.25 |
| preference | 0.25 |

**Grade bands:**

| Grade | Range |
|-------|-------|
| A | ≥ 0.80 |
| B | ≥ 0.65 |
| C | ≥ 0.50 |
| D | ≥ 0.35 |
| F | < 0.35 |

---

## Self-scoring example

Rule: "Mock external services at the boundary — never mock internal modules. Example: mock `fetch` in `api.test.ts`, not `getUserById` in `service.test.ts`"

- F1: bare imperative "Mock" → 0.85
- F2: positive imperative with soft prohibition → 0.70
- F3: same task, different file (test + module) → Level 2 → 0.70
- F4: in a scoped file (`globs: "**/*.test.ts"`) matching trigger files → 1.00
- F7: 3 concrete markers (`fetch`, `api.test.ts`, `getUserById`, `service.test.ts`) → 0.85

Composite: (0.22×0.85) + (0.15×0.70) + (0.19×0.70) + (0.17×1.00) + (0.29×0.85)
= 0.187 + 0.105 + 0.133 + 0.170 + 0.247
= 0.842 — grade A

F8 parallel signal: "mock" is not mechanically enforceable (no linter for this pattern) → F8 ≈ 0.75, not a hook candidate.
