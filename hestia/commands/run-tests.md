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

> Negative-fixture rule (verify-the-detector): every Hestia detector must have a negative fixture proving it FIRES on a known-bad input — paired with a clean input it must NOT flag. A detector tested only on clean fixtures is indistinguishable from a broken one. The Python suite enforces this in `tests/test_detectors_fire.py`; new detectors are expected to add a paired clean/known-bad firing test there.

## Coverage

The fixture set covers all 13 items plus a clean pass: items 1–13 each have a dedicated `fail/` fixture (item 1 has two), and `pass/clean_skill.md` exercises the no-defect path. Add further fixtures as new edge cases surface (e.g. multi-signal decomposition, combined frontmatter failures).

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
