---
name: lint-codebase
description: Lints all source files and reports violations. Invoke when the user wants to check code style.
---

# Lint Codebase

Before running, review the linting rules at `references/lint-rules.md` and load the example report format from `examples/lint-report-example.md`.

## Step 1 — Discover files

MUST invoke `Glob` to enumerate all source files:

```
Glob({ pattern: "src/**/*.ts" })
```

## Step 2 — Run linter

MUST invoke `Bash` to execute the linter:

```
Bash({
  command: "npx eslint src/ --format=json --output-file=lint-results.json",
  description: "Run ESLint on all TypeScript source files and write JSON output"
})
```

## Step 3 — Report

Parse `lint-results.json` and present a plain-English summary to the user. For severity levels, see [severity reference](references/severity-levels.md).
