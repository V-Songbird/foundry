# Changelog

## 0.1.1-alpha — 2026-07-05

Fix: `narration-meter.js`'s turn-boundary detection (`isRealUserPrompt`) treated harness-injected continuations — background Task-tool notifications (`origin.kind: "task-notification"`) and `ScheduleWakeup` firings (`isMeta: true`) — as fresh user turns. Each one reset the narration accumulator, so a chain of short status pings after consecutive background-task completions never tripped the word budget (each ping was a lone block in its own synthetic "turn," exempted as the deliverable). Now only `origin.kind === "human"` entries count as turn boundaries; the whole notification chain is measured as one turn. Added a matching line to `output-styles/hush.md` telling the model directly that a chain of notifications without new human input is one unit of work, not one per notification.

## 0.1.0-alpha — 2026-07-05

Initial release.

- Forced output style (`force-for-plugin: true`, `keep-coding-instructions: true`): silent mid-turn, outcome-first final message, full fidelity for code/errors/security.
- `PostToolUse` hook `compress-tool-output.js`: deterministic Bash/PowerShell output compression via `updatedToolOutput` — ANSI strip, `\r` resolution, consecutive-duplicate collapse, line caps (60 passing / 250 failing, tunable).
- `Stop` hook `narration-meter.js`: counts mid-turn narration words per turn, injects one corrective line only over budget (default 120 words).
- Env knobs: `HUSH_CAP_PASS`, `HUSH_CAP_FAIL`, `HUSH_NARRATION_BUDGET`, `HUSH_DISABLE`.
- 26 tests (node:test).
