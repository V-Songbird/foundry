# Public research policy reconciliation — 2026-09-09

The private source-name restriction is retired in Foundry and every existing
legacy hook installation in the five installable platform checkouts. Hush/Codex
has no legacy installation to replace. Flint was not changed.

Pre-commit hooks no longer call the name checker. The old checker and commit-msg
paths remain inert compatibility entry points, allowing existing installations
to continue without missing-file errors. They do not read an old environment
blocklist or inspect staged text. Other commit checks remain in place.

The maintained test suite replaces tests of the obsolete blocking behavior with
tests of public attribution, compatibility entry points and all platform-copy
locations. It reports 141 tests: 140 passed, no failures and one explicit skip
for Hush/Codex's absent legacy hooks. The lower count reflects removal of tests
whose required behavior was the policy the owner retired, not skipped failures.

Contributor guides in Razor's two editions and Foreman/Claude no longer tell
contributors to hide source names. Shared ADR 0009 supersedes ADR 0004 and the
publication clauses referring to it; the historical reference-name list is
identified as a research index. Old decision text remains clearly historical.

Existing benchmark-result exclusions still require the publication inventory.
Their comments now identify that unfinished migration instead of declaring a
permanent private-results policy. Third-party material review and shared roadmap
distribution also remain pending. This phase does not claim publication complete.

All 435 protected product files remain identical to the baseline. No product
runtime, installation, benchmark measurement, project commit or remote setting
was changed. Evidence: `.scratch/consolidation/public-research-tests.log`.
