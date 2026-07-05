# razor

YAGNI enforcement at the harness level, not the prompt level.

Lazy-dev style plugins teach the ladder — *stop at the first rung that holds* — through prompt injection alone: a large ruleset re-injected at session start and into every subagent spawn, with nothing mechanical backing it up. razor keeps the ladder and swaps the delivery for the strongest mechanism available at each layer, the same philosophy as [hush](../hush).

## The ladder

Injected once per session (compact, ~300 tokens):

1. Not genuinely needed? Skip it. (YAGNI)
2. Already in this codebase? Reuse it.
3. Stdlib does it? Use the stdlib.
4. Native platform feature does it? Use the platform.
5. An already-installed dependency does it? Use it.
6. Fits in one line? One line.
7. Only then: the minimum code that works.

The payload explicitly forbids narrating or deliberating the rungs — a reasoning model that spends thinking tokens arguing the ladder can cost *more*, not less.

## What it does

### 1. Gated subagent injection

`SessionStart` context never reaches subagents, so [`subagent-start.js`](hooks/subagent-start.js) re-injects the ladder via the `SubagentStart` hook — but only into agents that write code. Read-only types (`Explore`, `Plan`, `claude-code-guide`, …) are skipped: they never build anything, so for them the ladder is pure injection tax, multiplied by N in every fan-out. Unknown custom agent types **do** get the ruleset — most custom agents write code, and the fail-safe direction is guarded, not lean.

### 2. Dependency soft gate

A `PreToolUse` hook on Bash/PowerShell parses the command for a project-dependency add (`npm install <pkg>`, `pip install <pkg>`, `cargo add`, `go get`, `poetry add`, `dotnet add package`, and friends — 13 managers). The **first** attempt for a given package set is denied with the reuse-first reason:

> razor: 'lodash' adds a new npm dependency. Rungs 3-5 — check the stdlib, the platform, and already-installed deps first. If nothing covers it, run the same command again and razor will not object.

The retry passes (matched by manager + package names, so rewording the flags doesn't re-trigger). One forced reconsideration per dependency, never a hard block — and razor never *grants* anything: on the pass path it stays silent, so your normal permission flow still applies. Lockfile restores (`npm install` bare, `npm ci`, `pip install -r …`, `poetry install`) and system package managers (apt, brew, winget) are ignored.

### 3. New-file meter

A `PreToolUse` hook on Write counts files about to be **created** (existing files are never gated — edits aren't sprawl). The Write that crosses the per-turn budget (default 4 new files) is denied once with a rung-2 reason, then the gate self-clears for the rest of the turn. Turn boundaries are real human prompts only — task notifications and scheduled wakeups don't reset the count. Temp/scratchpad files are exempt.

### 4. Boolean toggle

`/razor off` (or "stop razor") parks everything for the session; `/razor on` re-arms and re-injects the ladder. No lite/full/ultra dial — intensity levels are a tone knob on something that is either a constraint or isn't.

## razor vs prompt-injection lazy-dev plugins

| | prompt-injection style | razor |
|---|---|---|
| Ladder delivery | large ruleset, re-injected | ~300-token ruleset, main thread |
| Subagents | full ruleset into **every** spawn | gated by agent type; read-only spawns pay nothing |
| Enforcement | prompt only | prompt + mechanical soft gates (deps, new files) |
| Intensity | lite / full / ultra dials | on / off |
| Reasoning-model cost | ladder deliberation can inflate thinking tokens | payload forbids rung deliberation |

If another YAGNI/lazy-dev ruleset plugin is installed, disable it — two competing rulesets double-inject and can contradict each other.

## Configuration

Environment variables, e.g. via `env` in `settings.json`:

| Variable | Default | Effect |
| --- | --- | --- |
| `RAZOR_DISABLE` | unset | `1` disables everything |
| `RAZOR_DEP_GUARD` | unset | `off` disables the dependency gate |
| `RAZOR_FILE_BUDGET` | `4` | New files allowed per turn before the meter fires; `0` disables |
| `RAZOR_AGENT_SKIP` | unset | Comma list of agent types to skip *in addition to* the defaults (bare or `plugin:scoped` names) |
| `RAZOR_AGENT_INJECT` | unset | Comma list forcing injection, overriding any skip |

Recommended for forge users: `RAZOR_AGENT_SKIP=adversarial-critic,forge-expert,forge-plan-synthesizer,forge-plan-reviser` — read-only analysis agents.

## Relationship to hush

Complementary, not overlapping: hush governs how the agent *talks* (output style, tool-output compression, narration meter); razor governs what it *builds*. Pair them.

## Known limits

- Files created through Bash heredocs bypass the Write tool, and the new-file meter with them.
- The soft gates cost one model round-trip when they fire — that's the mechanism, not a bug. They fire at most once per dependency / once per turn.
- Injection is context, not a system prompt: a custom agent whose own system prompt mandates heavy scaffolding can override the ladder.
- The subagent hook resolves session state best-effort; if it can't, it fails safe to *on*.

## Tests

```
node --test razor/tests/*.test.js
```
