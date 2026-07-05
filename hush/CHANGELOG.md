# Changelog

## 0.1.0-alpha — 2026-07-05

Initial release.

- Forced output style (`force-for-plugin: true`, `keep-coding-instructions: true`): silent mid-turn, outcome-first final message, full fidelity for code/errors/security.
- `PostToolUse` hook `compress-tool-output.js`: deterministic Bash/PowerShell output compression via `updatedToolOutput` — ANSI strip, `\r` resolution, consecutive-duplicate collapse, line caps (60 passing / 250 failing, tunable).
- `Stop` hook `narration-meter.js`: counts mid-turn narration words per turn, injects one corrective line only over budget (default 120 words).
- Env knobs: `HUSH_CAP_PASS`, `HUSH_CAP_FAIL`, `HUSH_NARRATION_BUDGET`, `HUSH_DISABLE`.
- 26 tests (node:test).
