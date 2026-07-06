# Changelog

All notable changes to razor are documented here. Razor is a monorepo-folder
plugin — its version is owned by `.claude-plugin/marketplace.json` at the
repo root, not by `razor/.claude-plugin/plugin.json` (which carries no
version field by convention).

## Unreleased

Ladder wording fix from a razor-vs-ponytail agentic benchmark: two prompt-only inefficiencies
found via transcript inspection, no hook logic changed.

- The "never skip comprehension" clause fired even with nothing to read, costing 2-3 wasted
  explore-tool round-trips on greenfield ("write me X" into an empty dir) tasks. Now scoped to
  skip when the target is a genuinely new file.
- "Stop at the first rung that holds" didn't stop the agent verifying rungs below the one that
  already applied — observed as an exhaustive one-by-one sweep of every dependency-manifest
  format (`requirements.txt`, `setup.py`, `pyproject.toml`, `poetry.lock`) before writing a
  stdlib-only implementation. Now explicit: act on the first rung without checking further down.
- Benchmarked effect (ratio to baseline, same task, before/after): tokens 1.82x -> 1.21x and
  turns 1.85x -> 1.00x on a dependency-decision task; tokens 2.41x -> 0.37x and turns
  2.35x -> 0.40x on a greenfield task.
- Added a permanent regression case: a stdlib-covered TOML-parsing task where a competing
  prompt-injection-only skill added an unnecessary dependency anyway; the dep guard must still
  catch it if attempted via `pip install`.
- 94 tests (up from 93).

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
