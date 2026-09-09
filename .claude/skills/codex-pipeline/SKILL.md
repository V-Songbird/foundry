---
description: 'Runs a dev task through the cross-model codex pipeline — spec and held-out tests written here, implementation by `mcp__codex__codex`, fresh-context diff review, fixes via `mcp__codex__codex-reply`. Use when the user asks to run the codex pipeline or have Codex or GPT implement something — e.g. "run this through codex", "use the cross-model pipeline on this" — or when an implementation task carries real defect risk (a new module with a subtle contract, parsing or validation logic, edge-case-heavy algorithms, multi-file changes). Do NOT use for small mechanical edits, docs, config, or plain review of existing code — implement those directly or use /code-review instead.'
argument-hint: [task description]
---

# Codex pipeline

Cross-model build-and-review. This session architects, Codex implements, a
fresh context reviews. The fresh review is the point: a second model with
different blind spots catches what the implementer and the tests both miss.

## 1. Architect

- Read the code the task touches.
- Write a self-contained spec file: the contract, required error types, and an
  "Adversarial notes" section listing the edge cases you'd attack.
- Write a held-out verification suite yourself, named distinctly (e.g.
  `verify.test.js`). Codex must never see it.

## 2. Implement

Call `mcp__codex__codex` with:

- `prompt`: implement from the spec file, write and run its own selftest, and
  do NOT open the held-out suite (name it explicitly).
- `cwd` set to the working directory, `sandbox: workspace-write`,
  `approval-policy: never`.

Save the returned `threadId`. Codex returns only a one-paragraph summary —
trust the files on disk, never the summary.

## 3. Verify

Run the held-out suite plus the project's real gates (tests, types, lint)
yourself, in this session.

## 4. Fresh review

Spawn a `general-purpose` Agent with no pipeline context: give it only the
spec path and the implementation path, read-only intent. Require it to
reproduce every suspected defect before reporting, and to return APPROVE or
REQUEST-CHANGES with repro input and actual-vs-expected output per defect.

## 5. Fix

Send confirmed defects — with their repros — to `mcp__codex__codex-reply` on
the saved `threadId`. Then re-run step 3.

## 6. Close

- At most two review→fix rounds; hand anything still open to the user.
- Report: what was built, verification results, what the fresh review caught.
- Never commit without the user's explicit go.
