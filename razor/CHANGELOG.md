# Changelog

## 0.2.0-alpha — 2026-07-05

Evidence-carrying gates: the deny reasons stop quoting philosophy and start presenting repo facts.

- Dependency soft gate now walks up from the working directory to the nearest ecosystem manifest (`package.json`, `pyproject.toml` PEP 621 + poetry / `requirements.txt`, `Cargo.toml`, `go.mod`, `composer.json`, `Gemfile`, `*.csproj`/`*.fsproj`) and lists the actual installed dependencies in the deny reason (capped at 30, with count). Line-scan extraction, no parser dependencies. No manifest → 0.1.0 generic wording.
- Build ledger: `SessionStart` snapshots the git baseline (base commit + untracked count, once per session — resume/compact keep it); a `Stop` hook fires one question, once per session, when the tree shows sprawl — net growth > `RAZOR_LEDGER_LOC` (default 500) with deletions < 10% of insertions, or > `RAZOR_LEDGER_FILES` (default 8) new files. Insertion-heavy refactors with real deletions never trip it. Not a git repo → inert. `RAZOR_LEDGER=off` disables.
- 93 tests (up from 71).

## 0.1.0-alpha — 2026-07-05

Initial release. YAGNI enforcement at the harness level.

- Compact first-rung-that-holds ladder (~300 tokens) injected at `SessionStart`, with an explicit no-rung-deliberation clause for reasoning models.
- `SubagentStart` re-injection gated by agent type: read-only built-ins (`Explore`, `Plan`, `claude-code-guide`, `statusline-setup`, `output-style-setup`) are skipped; unknown types fail safe to injected. `RAZOR_AGENT_SKIP` / `RAZOR_AGENT_INJECT` to tune.
- Dependency soft gate (`PreToolUse` on Bash/PowerShell): first install of a new named package across 13 managers is denied with a reuse-first reason; the retry passes (keyed by manager + sorted package names). Lockfile restores and system package managers ignored. `RAZOR_DEP_GUARD=off` to disable.
- New-file meter (`PreToolUse` on Write): the Write crossing the per-turn new-file budget (default 4) is denied once with a rung-2 reason, then self-clears. Existing files, temp, and scratchpad paths exempt. Turn detection via transcript tail, human prompts only. `RAZOR_FILE_BUDGET` to tune, `0` disables.
- Session-scoped boolean toggle via `UserPromptSubmit`: `/razor on|off`, "stop razor". No intensity levels.
- 71 tests (`node --test razor/tests/*.test.js`).
