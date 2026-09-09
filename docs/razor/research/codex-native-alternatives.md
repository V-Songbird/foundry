# Native Codex alternatives

This decision record asks whether a native Codex primitive can preserve Razor's scope and promises more faithfully than a direct Claude-hook translation. The answer is a hybrid: plugin hooks remain the enforcement spine, while native per-agent identity, post-tool confirmation, managed policy, and telemetry improve the port around it.

## Decision table

| Native mechanism | Decision | Why |
| --- | --- | --- |
| Plugin `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStart`, `Stop`, and `SessionEnd` hooks | Core | These plugin-bundled primitives jointly inject the ladder, inspect a pending native write, deny it once, confirm success, isolate subagents, request a final continuation, and clean session state. They preserve Razor's first-deny/retry contract. |
| `agent_id`, `agent_type`, and subagent `turn_id` | Adopt | `SubagentStart` officially exposes the identity pair. Persist `turn_id -> agent_id` before filtering, namespace state by session and agent, and fall back to the unique turn rather than parent state. Skip the read-only `explorer` role by default; expose explicit skip/inject environment overrides instead of treating arbitrary role names as permission classes. |
| `PostToolUse` | Adopt as confirmation | It can mark that `apply_patch` actually succeeded, so the post-edit search meter does not advance after a denial or failed patch. It cannot prevent the side effect and therefore never replaces `PreToolUse`. |
| Managed hooks and `allow_managed_hooks_only` | Optional enterprise profile | Organization policy can make centrally reviewed hooks mandatory, but hook scripts must be delivered separately and the setting can exclude ordinary plugin/user hooks. This is deployment hardening, not the distributable sibling. |
| OpenTelemetry | Adopt in validation harness | Opt-in structured events provide API, token, tool-decision, tool-result, duration, and outcome evidence without transcript parsing. Telemetry is disabled by default and asynchronous, so it must not hold runtime gate state. |
| Exec-policy `prefix_rule` | Reject for the core; optional hard policy | Rules are static, experimental, and apply to commands that would execute outside the sandbox. They cannot express "deny once, then allow the identical retry," query installed dependencies, or inspect an `apply_patch` body. A hard organizational block would change Razor's product contract. |
| `PermissionRequest` hook | Reject as retry mechanism | It runs only when Codex already requests host permission. Razor's reconsideration must work independently of sandbox and approval policy. |
| `updatedInput` / command rewriting | Reject | Rewriting an install or patch silently changes user/model intent and approval semantics. A visible first denial followed by an exact retry is the compatible behavior. |
| `AGENTS.md` | Fallback guidance only | It can express the ladder on surfaces without plugin hooks, but is project-scoped prompt context, not installed plugin enforcement, retry state, or a guard on tool side effects. Do not label this fallback Razor-compatible. |
| Skill-only delivery | Use only for explicit reports and controls | Skills are discoverable prompt workflows, not automatic lifecycle gates. They fit `razor-unused` and may document controls, but cannot guarantee the ladder or intercept writes. |
| MCP proxy | Reject as enforcement boundary | A proxy could inspect calls routed through its own tools, but Codex can still use native `Bash` and `apply_patch`. Replacing native tools would broaden Razor's scope and degrade normal Codex behavior. |
| Agent SDK or custom harness | Reject for the plugin | A custom host could own every tool and guard, but it would replace the Codex plugin experience rather than port Razor into it. The SDK remains useful for an external benchmark driver. |
| `SessionEnd` | Adopt on `0.145.0` | It is now in the official contract for main-session archive, delete, close, and idle expiry, with a three-second maximum and current `reason: "other"`. Use it for best-effort scoped cleanup and retain bounded startup garbage collection. |

## Resulting architecture

1. `SessionStart` injects the real Razor ladder and creates bounded, session/agent-scoped state below `PLUGIN_DATA`.
2. `UserPromptSubmit` handles explicit on/off control without inventing a Claude slash command.
3. `PreToolUse` serializes gate state, records the fingerprint before denial, and permits only a separately-started exact retry; concurrent identical requests cannot consume each other's grant.
4. `PostToolUse` commits file-budget reservations and edit-phase state only after confirmed success; failed patches release their reservation.
5. `SubagentStart` records the turn-to-agent mapping before filtering, skips `explorer` injection by default, and honors explicit skip/inject overrides; agent ledgers use the mapping with turn-isolated fallback.
6. `Stop` compares against a read-only aggregate/path-membership session baseline and uses one guarded `decision: "block"` continuation for post-start growth.
7. `SessionEnd` removes scoped state within the host's three-second ceiling; bounded startup garbage collection covers missed best-effort cleanup.
8. The benchmark harness may consume OTel, while the plugin remains fully functional with telemetry off.

## Coverage boundary

Official hook coverage includes native shell/unified-exec calls, `apply_patch`, MCP calls, other local functions, and nested code-mode calls. Hosted tools such as `WebSearch` are not hooked, and specialized execution paths may opt out. Razor should therefore advertise the tested `Bash` and `apply_patch` checkpoints, not universal command or edit mediation.

The normal user install must retain Codex's hook review and trust flow. Any enterprise managed-hook profile is a separately administered deployment with the same behavior, never a method for bypassing that boundary.

## Official references

- [Hooks](https://learn.chatgpt.com/docs/hooks)
- [Build plugins](https://learn.chatgpt.com/docs/build-plugins)
- [Rules](https://learn.chatgpt.com/docs/agent-configuration/rules)
- [Advanced configuration and OpenTelemetry](https://learn.chatgpt.com/docs/config-file/config-advanced)
- [Build skills](https://learn.chatgpt.com/docs/build-skills)
