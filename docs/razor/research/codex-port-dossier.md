# Razor for Codex: port dossier

> Historical Codex port dossier. Dates, versions, verdicts and paths below describe
> the recorded implementation, not a new validation of the current branch.
> Use the [plugin index](../README.md) to find current source documentation
> and the separate validation reports.

This is the implementation boundary for a separate `razor-codex` plugin. It does not modify the calibrated Claude Code plugin in [`razor/`](../../../razor).

## Verdict

Razor cannot run unchanged in Codex: it is a Claude plugin with a `.claude-plugin` manifest, Claude hook registration, Claude option variables, and a Claude transcript fallback. Codex has compatible lifecycle primitives, but requires a Codex manifest, trusted hooks, `PLUGIN_ROOT`/`PLUGIN_DATA`, and a different per-turn identifier. The resulting sibling package then lived at `plugins/razor-codex`. That workspace path has been retired; use the plugin index above for the current edition.

The important news is that Razor's core promise is portable: Codex can inject the ladder, inspect the two guarded write paths verified here (`Bash` and `apply_patch`), deny the first matching action, and allow the exact retry. Codex also supplies `agent_id` on subagent lifecycle hooks, so the same guarantee can remain isolated per agent. Do not weaken that into advisory-only prompting.

The Codex sibling must preserve these boundaries:

- One automated reconsideration per guarded action, never a hard ban.
- The user can explicitly request the larger solution; safety, accessibility, validation, and requested work are never cut.
- All persistent gate state belongs in `PLUGIN_DATA`; no transcript parsing is required for per-turn state.
- Only features that pass the validation gates may be advertised. The Claude benchmarks do not transfer to Codex.

## Read in this order

1. [Capability matrix](../validation/codex-capability-matrix.md) — disposition for every Razor surface.
2. [Native alternatives](codex-native-alternatives.md) — why hooks win, where native policy and telemetry help, and which substitutes fail Razor's contract.
3. [Porting specification](codex-porting.md) — package layout, adapters, and non-negotiable compatibility rules.
4. [Validation plan](../validation/codex-validation.md) — tests required before a sibling ships.
5. [Context glossary](codex-context.md) — terms used by this dossier.
6. [Headless probe evidence](../validation/codex-headless-probes.md) — reproducible CLI results.

## Ground truth recorded on 2026-07-20

- Current Razor is a Claude Code plugin: [manifest](https://github.com/V-Songbird/razor/blob/d65b65ea1a97230747b9d701d6238ba2ced654b7/.claude-plugin/plugin.json), [hook map](../../../razor/hooks/hooks.json), [shared runtime](../../../razor/hooks/razor-lib.js), and [`razor-unused`](https://github.com/V-Songbird/razor/blob/8d6c69b5f41aa0ff2963f88c0ec85995dcdc8f43/skills/razor-unused/SKILL.md).
- The WindowsApps `codex.exe` resolved by the desktop app could not launch in this shell (`Access is denied`). Disposable public packages supplied stable `codex-cli 0.144.6` and canary `0.145.0-alpha.28`; stable is the shipping reference and alpha was used only to test emerging lifecycle behavior.
- A current `PreToolUse` event supplied `session_id`, `turn_id`, `cwd`, `tool_name`, `tool_input`, and `tool_use_id`; `transcript_path` was `null` in headless mode. Use `turn_id`, not Razor's Claude-only `prompt_id`/transcript fallback.
- One-shot `permissionDecision: "deny"` hooks blocked both `Bash` and `apply_patch`; Codex retried each identical action once and executed it. `apply_patch` exposes its unified patch as `tool_input.command`, and its successful `PostToolUse` result can confirm that an edit actually landed.
- Stable and alpha subagent events supplied a parent `session_id`, subagent-specific `turn_id`, `agent_id`, and `agent_type`. `SubagentStart` can therefore persist the documented `turn_id -> agent_id` mapping before tool use; tool ledgers resolve that mapping and fall back to the unique `turn_id`. Role-specific exclusions remain unproven policy.
- `SessionEnd` did not fire on stable `0.144.6`, but did fire on alpha `0.145.0-alpha.28` with `reason: "other"` and a three-second timeout clamp. Because it is absent from the official hook contract, startup garbage collection remains the release design and `SessionEnd` is canary-only.
- A disposable local marketplace installed, enabled, executed, and removed a `razor-codex-probe`. Its hook received an installed-cache `PLUGIN_ROOT` and writable `PLUGIN_DATA`.
- The production sibling was subsequently installed and exercised on stable CLI `0.144.6`; see [Headless probe evidence](../validation/codex-headless-probes.md#production-sibling-validation).
- `UserPromptSubmit` context changed a normal headless response. A `Stop` hook with `decision: "block"` created exactly one continuation turn; `Stop.additionalContext` alone did not.
- Native exec-policy rules, managed hooks, skills, `AGENTS.md`, MCP, the Agent SDK, and OpenTelemetry were evaluated as alternatives. Hooks remain the only plugin-native core gate; managed hooks are an optional enterprise deployment profile, and OTel is the preferred benchmark observation layer.

## Ground truth refreshed on 2026-07-26

Codex `0.145.0` is now the current compatibility target. Its official hook
contract includes `SessionEnd`; the event runs on main-session archive, delete,
close, or 30-minute idle expiry, has a maximum timeout of three seconds, and
currently reports `reason: "other"`. The sibling therefore registers a
three-second cleanup hook while retaining bounded startup garbage collection as
a best-effort fallback. The earlier `0.144.6` and alpha observations below and
in [HEADLESS_PROBES.md](../validation/codex-headless-probes.md) remain historical evidence, not the
current support conclusion.

The implementation refreshed against that contract has these additional
boundaries:

- `SubagentStart` always records the `turn_id -> agent_id` mapping. It skips
  ladder injection for the read-only `explorer` role by default, accepts
  comma-separated `RAZOR_AGENT_SKIP` additions, and lets
  `RAZOR_AGENT_INJECT` override both defaults and additions. Full namespaced
  and bare role names are matched.
- A retry grant is created inside the same serialized state transaction as the
  denial. A concurrently-started identical request cannot consume a grant
  created after that request began; only a later exact retry can.
- New-file budget entries are reservations until a successful
  `PostToolUse`. Failed patches release their reservation and do not increase
  the committed count.
- The Stop ledger captures a read-only session baseline: Git base SHA,
  aggregate tracked insertions/deletions, and bounded hashes of initially
  added/untracked paths. It subtracts unchanged pre-session dirty work and
  recognizes newly replaced untracked paths without writing an index, tree, or
  worktree. Changes to an already-dirty tracked hunk remain an intentional
  fail-open approximation.

The 101-test package suite covers these behaviors. Codex CLI `0.145.0`
installed and ran final build `0.1.0+codex.20260726231537`: a dependency
request was denied once, an equivalent non-identical retry ran, the namespaced
skill was discoverable, and `SessionEnd` removed the session-scoped JSON. The
live role-spawn request recorded no selected role, so explorer filtering is
claimed from the official event fixture rather than mislabelling a default
subagent run. See [HEADLESS_PROBES.md](../validation/codex-headless-probes.md#codex-01450-production-refresh).

## Official basis

- [Build plugins](https://learn.chatgpt.com/docs/build-plugins): manifest, local marketplace, plugin hook paths, and plugin state directories.
- [Hooks](https://learn.chatgpt.com/docs/hooks): lifecycle schema, trust, `Bash`/`apply_patch` interception, blocking and continuation behavior.
- [Build skills](https://learn.chatgpt.com/docs/build-skills): Codex skill frontmatter and discovery.
- [Rules](https://learn.chatgpt.com/docs/agent-configuration/rules): static command policy and its sandbox boundary.
- [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced): OpenTelemetry events and managed configuration entry points.
- [Plugins](https://learn.chatgpt.com/docs/plugins): supported install surfaces. Plugins are unavailable in Chat mode, the IDE extension, and mobile.


Link maintenance, 2026-09-09: removed local targets now point to retained Git revisions where those files exist. These links provide historical context; their selected revisions do not establish the exact revision measured or reviewed in this document.
