# razor

**Stops Claude from over-building — no unnecessary dependencies, no file sprawl, no code "for later".**

---

## What is this?

AI assistants love to add things. Ask for a small feature and you might get a new library installed, five helper files, and an abstraction layer for a future that never comes. Every one of those additions is something you (or the next person) has to understand, maintain, and eventually delete.

Razor pushes back. It teaches Claude a simple habit — **don't build what isn't needed, reuse what already exists, prefer what's already installed** — and, unlike advice that gets forgotten, it backs the words with real checks: when Claude tries to install a new package, razor makes it stop and reconsider once, showing it the list of dependencies the project *already has* ("could one of these do this?"). Same for creating an unusual number of new files in one go. And at the end of a heavy session, a build ledger asks the question a reviewer would: lots added, nothing deleted — is all of this needed? If Claude still thinks the addition is right, it goes through — razor is a speed bump for second thoughts, never a wall.

## Why you'd want it

- **Leaner projects.** Fewer dependencies means fewer security updates, fewer breakages, less to learn.
- **It acts, not just advises.** The reuse-first rule is enforced by hooks in the tool layer, not just words in a prompt.
- **Never blocks you.** Every gate fires exactly once; the retry always passes. You stay in control.
- **One switch.** `/razor off` turns everything off for the session, `/razor on` turns it back on. No dials to fiddle with.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install razor
```

It's active from the next session. No configuration needed.

---

## How it works (for the curious)

YAGNI enforcement at the harness level, not the prompt level. Lazy-dev style plugins teach the ladder — *stop at the first rung that holds* — through prompt injection alone: a large ruleset re-injected at session start and into every subagent spawn, with nothing mechanical backing it up. razor keeps the ladder and swaps the delivery for the strongest mechanism available at each layer, the same philosophy as [hush](../hush).

### The ladder

Injected once per session (compact, ~300 tokens):

1. Not genuinely needed? Skip it. (YAGNI)
2. Already in this codebase? Reuse it.
3. Stdlib does it? Use the stdlib.
4. Native platform feature does it? Use the platform.
5. An already-installed dependency does it? Use it.
6. Fits in one line? One line.
7. Only then: the minimum code that works.

The payload explicitly forbids narrating or deliberating the rungs — a reasoning model that spends thinking tokens arguing the ladder can cost *more*, not less.

### 1. Gated subagent injection

`SessionStart` context never reaches subagents, so [`subagent-start.js`](hooks/subagent-start.js) re-injects the ladder via the `SubagentStart` hook — but only into agents that write code. Read-only types (`Explore`, `Plan`, `claude-code-guide`, …) are skipped: they never build anything, so for them the ladder is pure injection tax, multiplied by N in every fan-out. Unknown custom agent types **do** get the ruleset — most custom agents write code, and the fail-safe direction is guarded, not lean.

### 2. Dependency soft gate

A `PreToolUse` hook on Bash/PowerShell parses the command for a project-dependency add (`npm install <pkg>`, `pip install <pkg>`, `cargo add`, `go get`, `poetry add`, `dotnet add package`, and friends — 13 managers). The **first** attempt for a given package set is denied — and the deny carries evidence, not just philosophy: the hook walks up from the working directory to the nearest manifest for that ecosystem (`package.json`, `pyproject.toml`/`requirements.txt`, `Cargo.toml`, `go.mod`, `composer.json`, `Gemfile`, `*.csproj`) and puts the actual installed-dependency list in the reason:

> razor: 'dayjs' adds a new npm dependency. Already installed (31): axios, date-fns, lodash, … If none of these, the stdlib, or the platform covers it, run the same command again and razor will not object.

Rung 5 stops being homework the model may skip and becomes a presented fact — at zero extra cost, since the manifest read happens inside a deny that was firing anyway. No manifest found → generic reuse-first wording.

The retry passes (matched by manager + package names, so rewording the flags doesn't re-trigger). One forced reconsideration per dependency, never a hard block — and razor never *grants* anything: on the pass path it stays silent, so your normal permission flow still applies. Lockfile restores (`npm install` bare, `npm ci`, `pip install -r …`, `poetry install`) and system package managers (apt, brew, winget) are ignored.

### 3. New-file meter

A `PreToolUse` hook on Write counts files about to be **created** (existing files are never gated — edits aren't sprawl). The Write that crosses the per-turn budget (default 4 new files) is denied once with a rung-2 reason, then the gate self-clears for the rest of the turn. Turn boundaries are real human prompts only — task notifications and scheduled wakeups don't reset the count. Temp/scratchpad files are exempt.

### 4. Build ledger

The gates prevent; the ledger measures. `SessionStart` snapshots the git baseline (base commit + untracked-file count). A `Stop` hook compares the working tree against it at turn end and stays silent unless the session looks like sprawl — net growth above `RAZOR_LEDGER_LOC` (default 500) with deletions under 10% of insertions, or more than `RAZOR_LEDGER_FILES` (default 8) new files. Then it injects one question, once per session:

> razor ledger: +840 / -3 LOC, 9 new files since session start. Deletion-positive diffs are the goal — is all of this needed?

A large diff that also deletes a lot is refactoring, not sprawl — it never fires. Not a git repo → inert. This closes the loop prompt-only plugins can't: prevention at the decision point *and* outcome measurement, both grounded in git.

### 5. Boolean toggle

`/razor off` (or "stop razor") parks everything for the session; `/razor on` re-arms and re-injects the ladder. No lite/full/ultra dial — intensity levels are a tone knob on something that is either a constraint or isn't.

## razor vs prompt-injection lazy-dev plugins

| | prompt-injection style | razor |
|---|---|---|
| Ladder delivery | large ruleset, re-injected | ~300-token ruleset, main thread |
| Subagents | full ruleset into **every** spawn | gated by agent type; read-only spawns pay nothing |
| Enforcement | prompt only | prompt + mechanical soft gates (deps, new files) |
| Grounding | rules only | deny reasons carry repo evidence (installed-deps list) |
| Feedback loop | none | git-based build ledger, threshold-gated |
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
| `RAZOR_LEDGER` | unset | `off` disables the build ledger (snapshot and meter) |
| `RAZOR_LEDGER_LOC` | `500` | Net LOC growth (with <10% deletions) that trips the ledger |
| `RAZOR_LEDGER_FILES` | `8` | New files since session start that trip the ledger |

Recommended for forge users: `RAZOR_AGENT_SKIP=adversarial-critic,forge-expert,forge-plan-synthesizer,forge-plan-reviser` — read-only analysis agents.

## Relationship to hush

Complementary, not overlapping: hush governs how the agent *talks* (output style, tool-output compression, narration meter); razor governs what it *builds*. Pair them.

## Known limits

- Files created through Bash heredocs bypass the Write tool, and the new-file meter with them.
- The soft gates cost one model round-trip when they fire — that's the mechanism, not a bug. They fire at most once per dependency / once per turn.
- Injection is context, not a system prompt: a custom agent whose own system prompt mandates heavy scaffolding can override the ladder.
- The subagent hook resolves session state best-effort; if it can't, it fails safe to *on*.
- The ledger baseline is the session-start commit; a rebase that drops that commit silently disables the ledger for the session. Manifest resolution walks up from the session's working directory — in monorepos that's the nearest manifest to the root you launched from, not necessarily the subpackage being changed.

## Tests

```
node --test razor/tests/*.test.js
```

## License

MIT — see [LICENSE](./LICENSE).
