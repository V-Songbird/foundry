---
description: Run the proofreader against all test fixtures and report whether each produces the expected verdict. Use after editing the proofreader prompt or the scribe skill to catch regressions.
user-invocable: false
---

# Test Runner

Verify the proofreader returns expected verdicts for all fixtures in `${CLAUDE_PLUGIN_ROOT}/tests/proofreader-fixtures/`.

## Convention

- `tests/proofreader-fixtures/pass/` — artifacts with no defects. Expected verdict: **PASS**
- `tests/proofreader-fixtures/fail/` — artifacts with a deliberate defect. Expected verdict: **FAIL** or **PARTIAL**

A test case PASSES when the proofreader's verdict matches the expectation. A test case FAILS when it does not.

## Coverage gaps

The fixture set currently covers items 1, 2, 3, 7, 8, 11, 13 plus a clean pass. Fixtures for the following items should be added as the proofreader matures:

- **Item 4** — `Agent` dispatch missing `description` or `subagent_type`; tool restrictions in body prose instead of frontmatter
- **Item 5** — plan-gate prescribes "plan first" without naming `EnterPlanMode` / `ExitPlanMode`
- **Item 6** — subagent body contains `AskUserQuestion` or "ask the user" prose
- **Item 9** — markdown link or backtick path that does not resolve to an actual file
- **Item 10** — user-facing output exposes internal jargon or uses wrong voice
- **Item 12** — artifact with ≥ 2 decomposition signals (SUGGEST-only, does not affect verdict math)

## Steps

### 1 — Enumerate fixtures

MUST invoke `Glob` twice to collect all fixture paths:

```
Glob({ pattern: "tests/proofreader-fixtures/pass/*.md", path: "${CLAUDE_PLUGIN_ROOT}" })
Glob({ pattern: "tests/proofreader-fixtures/fail/*.md", path: "${CLAUDE_PLUGIN_ROOT}" })
```

### 2 — Run the proofreader on each fixture

For every path returned, MUST invoke `Agent`. Do NOT pass `run_in_background: true` — capture each verdict before moving to the next.

```
Agent({
  subagent_type: "hestia:proofreader",
  name: "proofreader",
  description: "Test fixture: <fixture filename>",
  prompt: "<absolute path to fixture>"
})
```

### 3 — Record the result

From the returned report, read the `**Verdict:**` line near the top.

| Fixture directory | Verdict | Test result |
|---|---|---|
| `pass/` | `PASS` | PASS — proofreader correctly cleared a clean artifact |
| `pass/` | `FAIL` or `PARTIAL` | FAIL — proofreader incorrectly flagged a clean artifact |
| `fail/` | `FAIL` or `PARTIAL` | PASS — proofreader correctly caught the deliberate defect |
| `fail/` | `PASS` | FAIL — proofreader missed a known defect |

### 4 — Report

After all fixtures, report:

```
Test run: X passed, Y failed

Failures:
- <fixture filename>: expected <PASS|FAIL/PARTIAL>, got <actual verdict>
```

If all fixtures pass, report that. NEVER stop early — run every fixture and report the full summary regardless of intermediate failures.
