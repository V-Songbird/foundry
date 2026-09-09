---
status: accepted for local reconciliation
date: 2026-09-09
---

# Main selectors carry their documentation validation

## Decision

Foreman, Hush and Razor keep main as a product overview and edition selector.
Its complete file set is:

- `README.md`
- `LICENSE`
- `assets/logo.svg`
- `assets/logo-dark.svg`
- `assets/mascot.svg`
- `.github/check-main-frontpage.cjs`
- `.github/workflows/test.yml`

The last two files only validate this documentation contract. The workflow
produces the `test` check on main pushes and PRs targeting main. It has read-only
repository permission and runs no plugin suite, installation or benchmark.
Product code, skills, host instructions, package manifests and other workflows
remain forbidden. Flint stays outside this cleanup.

## Reason

The initial four-file implementation omitted the workflow while the existing
plugin rulesets required a check named `test`. A check in Foundry does not satisfy
that requirement on another repository's commit. Keeping the small validator
with the selector makes the protected workflow satisfiable without restoring
the plugin implementation to main or bypassing its check.

## Maintenance and integration

Owner amendment, 2026-09-09: main must retain the common product information and
animation from Claude/Codex, rather than being a sparse redirect page. The shared
story, benefits, mechanism, examples, general limitations, branding and summary
are checked against both edition refs. Main adds a clear edition choice and
links to native installation and evidence; it does not duplicate platform-specific
commands or measurements. This adds the shared mascot to the permitted file set.

Foundry owns the checker and `.github/PLUGIN_MAIN_WORKFLOW.yml`. The three
prepared selector trees carry identical copies. Foundry also validates each
published main tree and verifies that its edition branches exist.

This replaces the earlier four-file local contract. No protected branch or
GitHub setting was changed by recording it. Integrate through the normal PR
process after the edition destinations are available, and confirm the actual
`test` check on the target repository before retiring previous validation.
