# Porting specification

## Non-negotiable boundary

Create a sibling package. Do not make `razor/` dual-hosted and do not alter its `.claude-plugin`, hooks, skills, scripts, tests, benchmarks, or measurements. Claude and Codex hook manifests, path variables, state assumptions, command forms, and lifecycle fields differ.

The package is separate:

```text
plugins/razor-codex/
  .codex-plugin/plugin.json
  hooks/hooks.json
  hooks/
    session-start.js
    user-prompt-submit.js
    pre-tool-use.js
    post-tool-use.js
    stop-ledger.js
    subagent-start.js
    session-end.js
    lib/
  skills/
    razor-unused/SKILL.md
  scripts/
  tests/
```

Use a stable kebab-case name, version, description, and
`skills: "./skills/"`. Keep the standard `hooks/hooks.json` location so Codex
auto-discovers it; add a manifest `hooks` field only when intentionally
overriding that default. Every declared manifest path starts with `./` and stays
below the sibling root. `.codex-plugin/` contains only `plugin.json`.

## Delivery architecture

The hook and audit entry points require `node` on `PATH`. Record the exact
Node.js version in release validation rather than assuming every Codex surface
bundles a JavaScript runtime; the supported CLI build is tested with Node.js
`22.22.2`.

### Ladder

Port the actual Razor ladder, not a shortened "be minimal" slogan.
`SessionStart` returns it as `additionalContext`. `SubagentStart` records
identity first, then uses the same text unless role policy skips injection. The
read-only `explorer` role is skipped by default; comma-separated
`RAZOR_AGENT_SKIP` additions are overridden by `RAZOR_AGENT_INJECT`, matching
either a full namespaced type or its bare suffix. Skipping context never skips
the turn-to-agent map.

The hook message is developer context, not an absolute priority override. It
must continue to yield to higher-priority instructions and Razor's own
explicit-user-request exception. Keep each model-visible hook message
comfortably below Codex's approximate 2,500-token cap; oversized output is
truncated to a preview and written to a temporary hook-output file.

The sibling must not use a forced-style claim, patch Codex configuration, edit an installed cache, or mutate an `AGENTS.md` to simulate enforcement. Those actions either affect the user outside the plugin scope or are not a delivery guarantee.

### State and turn accounting

Use `PLUGIN_DATA` exclusively. Keep session-wide control and Git-baseline state
separate from agent-local retry/budget ledgers. Normalize identifiers, serialize
same-key read-modify-write transactions across hook processes, retain atomic
writes, bound lock waits and stale recovery, bound files by age, and make state
loss fail permissively (at most one extra nudge).

Codex's tested events provide `turn_id`; this is the per-turn key for file and search state. `SubagentStart` documents both `agent_id` and `turn_id`: persist that mapping before any injection filter, then resolve tool-event `turn_id` to an agent namespace such as `${session_id}--${agent_id}`. Live stable tool events also carried `agent_id`, but the resolver must not require that undocumented convenience field. If the map is lost, fall back to `${session_id}--turn-${turn_id}` rather than sharing the parent's ledger. The default `explorer` skip follows the host's read-only role contract; additional `agent_type` policy remains opt-in through explicit environment settings. Remove these Claude-specific branches rather than leaving dead fallbacks:

- `CLAUDE_PLUGIN_DATA` preference and arbitrary temp fallback.
- `CLAUDE_PLUGIN_OPTION_*` option resolution.
- `prompt_id` and transcript-tail parsing (`currentTurnKey`, `isRealUserPrompt`).
- Claude lifecycle assumptions around `SessionEnd`. Codex `0.145.0` documents
  main-session archive, delete, close, and idle-expiry delivery, fixes the
  current reason to `other`, and caps the timeout at three seconds. Register
  the event at that ceiling, delete only the matching session/agent/map state,
  and keep bounded startup garbage collection because cleanup is best effort.

Codex currently also supplies Claude compatibility path variables, but the port must use `PLUGIN_ROOT` and `PLUGIN_DATA` so its ownership and documentation remain clear.

### Pre-tool gate adapter

Register two matcher groups: canonical `Bash` and `apply_patch` (aliases `Edit`/`Write` are allowed in the matcher but inputs still report `apply_patch`). The dispatcher reads only the event's documented `tool_input`.

For a first matching checkpoint, return:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "razor: ... retry the exact same action once if it is truly needed."
  }
}
```

Fingerprint the action and persist the denial grant in the same serialized
state transaction before returning. A request is eligible to consume the grant
only when it started after the grant was created, has the same turn and
fingerprint, and is therefore an actual later retry. Two identical concurrent
requests that both started before the grant must not consume one another's
checkpoint. A different action is assessed independently. Never use
`PermissionRequest` as the retry gate: it governs host approval, not Razor's
controlled reconsideration.

Adapt each current guard narrowly:

1. **Dependency guard:** parse known package-manager installs in `Bash`; retain all existing restore/install exclusions and dependency discovery.
2. **Manifest guard:** safely simulate a unified `apply_patch` only when the before/after content is unambiguous; otherwise fail open.
3. **Import guard:** inspect patch additions, preserve language/declaration logic, and never guess from incomplete context.
4. **File meter:** reserve true `Add File` operations by `turn_id` before a
   patch runs, include reservations in concurrent projected budget, and commit
   them only after a successful matching `PostToolUse`. Failed patches cancel
   their reservation. Existing edits and temporary paths do not consume
   budget.
5. **Search meter:** set the edit-phase marker only after a successful `PostToolUse` for `apply_patch`, then assess candidate search commands in `PreToolUse`. Ship only after the classifier has the required fixtures. It must never block a non-search command because a shell string merely contains `rg` or `grep`.

Do not claim guards cover arbitrary shell redirections, external editors, unknown local tools, or side effects that happen outside `Bash`/`apply_patch`.

`PostToolUse` is confirmation, not prevention. Use it to record successful edit phases and diagnostic outcomes; every guard that must stop a side effect stays in `PreToolUse`. Nested code-mode calls are hooked, but specialized execution paths can opt out, so this remains a precisely scoped guardrail rather than a universal security boundary.

### Session controls and ledger

`UserPromptSubmit` parses `razor on` and `razor off`, then writes the session flag to `PLUGIN_DATA`. This is the ordinary-language replacement for Claude slash commands; do not ship `/razor` syntax.

At `SessionStart`, capture a read-only baseline from the current Git base:
aggregate tracked insertions/deletions plus bounded hashes of initially
added/untracked path names. Do not synthesize Git trees, write objects, change
the index, or touch the worktree. At `Stop`, subtract the baseline aggregate
and compare path membership so unchanged pre-session dirty work does not count
and a newly replaced untracked path does. If the fixed path cap is exceeded,
unknown membership fails open. Rewriting an already-dirty tracked hunk cannot
be measured exactly without retaining contents, so aggregate subtraction is an
explicit fail-open approximation.

Apply Razor's insertion/deletion/new-file thresholds to that post-start
estimate. If it crosses a threshold and has not fired, return one
`decision: "block"` reason instructing Codex to do a final Razor re-check and
produce one concise updated conclusion. Codex will create a continuation
prompt; guard against loops with both ledger state and `stop_hook_active`.

The continuation is not a user approval or a hard stop. It is the closest supported delivery of Razor's end-of-session second thought.

### Skills and configuration

Translate `razor-unused` into a Codex skill with the minimum `name` and `description` frontmatter. Resolve scripts relative to the loaded `SKILL.md` directory because `PLUGIN_ROOT` is guaranteed for hook processes, not ordinary skill-launched shells. Preserve report-only behavior and all false-positive caveats. Because the manifest's stable plugin name is the component namespace, document the installed namespaced invocation shown by Codex discovery; never reuse `/razor:unused`.

Keep `RAZOR_*` overrides only where Codex actually passes them to hook processes. Do not copy Claude `userConfig` into the Codex manifest or promise an equivalent settings UI without evidence.

## Packaging and trust

Put the sibling in `plugins/razor-codex/` and add it to `.agents/plugins/marketplace.json` with a local source path, `AVAILABLE` installation policy, authentication policy, and category. Users install it from the desktop Plugins UI or Codex CLI `/plugins`, start a new session, then review and trust its hooks. Hook changes require review again; a plugin must never attempt to bypass this trust boundary.

For centrally managed fleets only, administrators may deliver a separate managed-hook package and set `allow_managed_hooks_only = true`. This can make reviewed hooks mandatory and exclude user/plugin hooks, but it does not distribute the scripts and is not the normal Razor plugin. Keep it an optional enterprise profile with separate installation instructions and the same Razor semantics.

## Observation and benchmarking

Use Codex's opt-in OpenTelemetry stream in the benchmark harness for structured conversation, API, tool-decision, tool-result, and `response.completed` token evidence. Keep prompt logging disabled unless a purpose-built fixture explicitly needs it. OTel is diagnostics, not state: hook correctness, retries, budgets, and session controls must work when no exporter is configured.

The alternatives rejected for core delivery are recorded in [NATIVE_ALTERNATIVES.md](codex-native-alternatives.md). In particular, static exec-policy rules cannot implement a one-time retry or inspect `apply_patch`, and `PermissionRequest` cannot replace Razor's independent checkpoint.

## Implemented sequence

1. Scaffold the manifest, marketplace entry, `razor-unused` skill, and unit tests; install from a disposable marketplace.
2. Port `SessionStart`, `UserPromptSubmit`, `PLUGIN_DATA` state, and first-deny/retry for Bash only.
3. Add `apply_patch` manifest/import/file guards with patch-parser fixtures.
4. Add the one-shot Stop ledger and validate its continuation behavior.
5. Add `agent_id`-namespaced state, persist identity before filtering, skip the
   read-only `explorer` role by default, and expose explicit skip/inject
   overrides.
6. Add `PostToolUse` edit confirmation, then the search meter after conservative command-classification tests.
7. Add current stable `SessionEnd` cleanup with the three-second ceiling while
   retaining startup garbage collection.
8. Build a Codex-native benchmark with optional OTel evidence before public performance claims.
