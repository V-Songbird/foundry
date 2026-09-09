# Independent edition verification — 2026-09-09

Six fresh trees contain only the files Git would distribute from the current
working editions. Every copied file was compared byte for byte and recorded by
SHA-256. Each tree received its own temporary Git repository on a validation
branch, preventing tests from discovering Foundry's repository through parents.
No project repository was committed or switched.

| Edition | Exported files | Tests passed | Skipped | Failed |
| --- | --- | --- | --- | --- |
| Foreman/Codex | 138 | 1367 | 1 | 0 |
| Foreman/Claude | 113 | 1234 | 1 | 0 |
| Hush/Claude | 108 | 559 | 1 | 0 |
| Hush/Codex | 18 | 30 | 1 | 0 |
| Razor/Codex | 94 | 379 | 1 | 0 |
| Razor/Claude | 88 | 341 | 1 | 0 |

The one skipped check in each tree explicitly requires the Foundry parent and
is not applicable to a standalone plugin checkout. The complete local Foundry
copy matrix was checked separately. Counts include each edition's available
product tests and its maintenance tests. Hush/Codex has maintenance tests only;
this does not establish an installable product.

Foreman/Codex and Razor/Codex also pass the official plugin validator from their
exports. All six pass native platform-path separation, README navigation and
the common-content pair checks.

## Maintained copy enforcement

`scripts/git-hooks/check-maintenance-copies.js` compares seven shared check/test
files, two workflow templates and the coordination protocol across all six
editions. It also checks the two native coordinate-readmes skills. Existing
worktree files are used only after Git confirms their edition; otherwise the
checker reads the corresponding branch ref. Unreadable copies fail instead of
silently passing. Only CRLF/LF differences are normalized.

The check runs in Foundry's pre-commit and validation workflow. Tests cover the
complete edition matrix, a stale deep-worktree copy and missing peer files.
The live local matrix passes.

## Evidence and limits

File manifests: `.scratch/consolidation/independent-editions.json`.
Results: `independent-test-results.json` and `independent-<edition>.log` in that
same directory. Product preservation still passes: 434 baseline files match
directly, and one guide differs only by two verified URL substitutions.

These are independent file exports, not published Git revisions or installed
client activation. Remote references, native hook trust and real Actions results
remain integration checks. No model benchmark or installation was performed.

## Final navigation follow-up

The second export set, `independent-editions-v2`, includes the staged-index fix
and the pinned upstream slug expression with its license. Hash comparison against
the first export proves that the only changed existing file in each edition is
`scripts/git-hooks/check-readme-nav.js`; the only additions are the expression
and its license. Product code and product tests are identical to the standalone
suite runs above.

Each of the six exported navigation commands resolves its own dependency and
passes on its exported README. The two Codex packages again pass the official
validator. Current file counts are Foreman/Codex 140, Foreman/Claude 115,
Hush/Claude 110, Hush/Codex 20, Razor/Codex 96 and Razor/Claude 90. Their exact
file hashes are in `.scratch/consolidation/independent-editions-v2.json`.
