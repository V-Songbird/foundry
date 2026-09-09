# Capability matrix

**Portable** means a supported Codex primitive and a compatible Razor design exist. **Candidate** means the adapter needs the live gate in [VALIDATION.md](codex-validation.md). **Deferred** means shipping it now would overstate coverage.

| Claude Razor capability | Claude mechanism | Codex disposition | Safe Codex design or boundary |
| --- | --- | --- | --- |
| Reuse-first ladder | `SessionStart` context | Portable | Emit the unchanged behavioral ladder as concise `SessionStart.additionalContext`; repeat it on `UserPromptSubmit` only when turning Razor back on. |
| One retry after a dependency install | `PreToolUse` on `Bash`/`PowerShell` | Portable | Parse canonical `Bash` commands; store a turn-scoped fingerprint in the same serialized transaction as the denial, then allow only a separately-started exact retry. Concurrent identical requests cannot consume a checkpoint created after they began. Do not intercept PowerShell as a tool name: Windows headless Codex still reported canonical `Bash`. |
| Manifest dependency guard | `PreToolUse` on `Edit`/`Write` | Portable | Match `apply_patch` (or its `Edit`/`Write` aliases), parse `tool_input.command`, simulate the patch only when safe, and gate fresh manifest names once. |
| Import guard | `PreToolUse` on `Edit`/`Write` | Portable | Inspect `apply_patch` additions before they land. Preserve the existing standard-library/declaration checks and retry ledger. Shell-written imports remain an explicit known bypass, as they already do in Claude Razor. |
| New-file budget | `Write` plus Claude turn key | Portable | Reserve true `*** Add File:` paths in `apply_patch` by Codex `turn_id`, then commit the count only after successful `PostToolUse`. Failed patches release the reservation. Exempt temporary paths; do not count edits. Bash-created files remain a known bypass. |
| Post-edit search meter | `Grep`/`Glob` plus Claude turn key | Portable | Mark a successful edit from `PostToolUse` for `apply_patch`, then classify actual `Bash` searches (`rg`, `grep`, `findstr`, PowerShell equivalents) in `PreToolUse` within the same `turn_id`. The installed sibling passed the successful-patch, second-search denial, and exact-retry flow. Do not claim hosted `WebSearch`, unknown functions, or arbitrary shell syntax. |
| Session on/off control | `/razor on` / `/razor off` via `UserPromptSubmit` | Portable | Recognize plain `razor on` / `razor off` in `UserPromptSubmit`; write session state below `PLUGIN_DATA`, explain the state in context, and do not invent Claude slash commands. |
| Subagent ladder and state isolation | `SubagentStart` with Claude agent-type skip list | Portable | Always persist the documented `turn_id -> agent_id` pair at `SubagentStart`, then namespace ledgers by `session_id + agent_id`; fall back to `turn_id` if the map is lost. Skip ladder injection for the read-only `explorer` role by default. `RAZOR_AGENT_SKIP` adds role names and `RAZOR_AGENT_INJECT` overrides all skips; both accept full namespaced or bare names. |
| Build-growth ledger | `Stop.additionalContext` and Claude session baseline | Portable with changed delivery | At `SessionStart`, capture a read-only aggregate/path-membership baseline without changing Git objects, indexes, or the worktree. At `Stop`, subtract unchanged pre-session dirty work and send one `decision: "block"` continuation when thresholds fire. Rewrites of an already-dirty tracked hunk are intentionally approximate and fail open. |
| Session-end cleanup | `SessionEnd` | Portable on `0.145.0` | Register the documented event with its three-second maximum. Remove the main session file, agent-scoped ledgers, and turn maps on session close/archive/delete/idle expiry; retain bounded startup garbage collection because cleanup is best effort. |
| Configurable budgets / guards UI | Claude `userConfig` and `CLAUDE_PLUGIN_OPTION_*` | Deferred / partial | Preserve explicit `RAZOR_*` environment overrides where the host passes them. Do not claim a Codex settings UI or copy `userConfig` until documented and tested. |
| `razor-unused` report | Claude command skill | Portable | Ship a Codex `SKILL.md` that resolves the audit helper relative to the loaded skill directory; `PLUGIN_ROOT` is only guaranteed to plugin hook processes. Document the namespaced Codex skill invocation rather than `/razor:unused`. |
| Transcript-derived turn detection | `prompt_id`, then Claude transcript parsing | Deferred | Codex headless hooks supplied stable `turn_id` and `transcript_path: null`. Remove transcript parsing from all enforcement decisions. |
| Claude benchmark claims | Claude harness corpus and measurements | Deferred | Build a Codex-specific corpus. Use opt-in OTel tool/result and `response.completed` token events in the harness where appropriate; do not make the runtime gate depend on telemetry or transfer Claude measurements. |

## Surface status

| Surface | Status | Reason |
| --- | --- | --- |
| Codex CLI | Supported and live-tested on `0.145.0` | Build `0.1.0+codex.20260726231537` passed the complete 101-test package suite; its code-identical predecessor passed disposable marketplace install, installed semantic retry, namespaced skill discovery, and live SessionEnd cleanup. Explorer filtering passes the official event fixture; a requested live role spawn recorded `agent_role: null`, so that host-path result is not overstated. |
| Codex in the ChatGPT desktop app | Candidate | Official docs support plugins and hooks; install/trust and actual tool coverage need a desktop run. |
| ChatGPT Work mode, desktop/web | Candidate for skills | Plugins are supported, but no hook runtime parity may be assumed from CLI. |
| Codex IDE extension | Unsupported | Official plugin documentation excludes it. A repository `AGENTS.md` can express the ladder but is not Razor enforcement. |
| Codex cloud | Deferred | Do not advertise until plugin and hook runtime support is documented and tested. |
| Chat mode / mobile | Unsupported | Official plugin documentation excludes them. |
