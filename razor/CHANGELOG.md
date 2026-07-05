# Changelog

## 0.1.0-alpha — 2026-07-05

Initial release. YAGNI enforcement at the harness level.

- Compact first-rung-that-holds ladder (~300 tokens) injected at `SessionStart`, with an explicit no-rung-deliberation clause for reasoning models.
- `SubagentStart` re-injection gated by agent type: read-only built-ins (`Explore`, `Plan`, `claude-code-guide`, `statusline-setup`, `output-style-setup`) are skipped; unknown types fail safe to injected. `RAZOR_AGENT_SKIP` / `RAZOR_AGENT_INJECT` to tune.
- Dependency soft gate (`PreToolUse` on Bash/PowerShell): first install of a new named package across 13 managers is denied with a reuse-first reason; the retry passes (keyed by manager + sorted package names). Lockfile restores and system package managers ignored. `RAZOR_DEP_GUARD=off` to disable.
- New-file meter (`PreToolUse` on Write): the Write crossing the per-turn new-file budget (default 4) is denied once with a rung-2 reason, then self-clears. Existing files, temp, and scratchpad paths exempt. Turn detection via transcript tail, human prompts only. `RAZOR_FILE_BUDGET` to tune, `0` disables.
- Session-scoped boolean toggle via `UserPromptSubmit`: `/razor on|off`, "stop razor". No intensity levels.
- 71 tests (`node --test razor/tests/*.test.js`).
