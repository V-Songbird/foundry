# Headless Codex probe evidence

Run date: 2026-07-20. The WindowsApps launcher resolved by `Get-Command codex` could not start from this shell. Disposable public packages ran as stable `codex-cli 0.144.6` and canary `0.145.0-alpha.28`. Stable SHA-256 was `4B76DED066D0239115CA97473D010C92072BC5C5550A45DD7CBEBE1E9EB956A7`; alpha was `EEDD8C6886B888018E8714488C63E8BC15DDE945540D271B3D819AF7F97B3306`.

All fixtures used disposable directories below `X:\Temp\razor-codex-*`, `codex exec --ephemeral`, and `--dangerously-bypass-hook-trust`. The bypass was used only because every temporary hook was created and inspected in the fixture. A temporary marketplace and its `razor-codex-probe` plugin were removed after the run.

| Probe | Real result | Port decision |
| --- | --- | --- |
| `PreToolUse` Bash first denial | A hook returned `permissionDecision: "deny"` for `echo RAZOR_PROBE`; stable Codex reported the rejection, retried the exact command after the prompt-directed reconsideration, and executed it. | Keep Razor's one-retry ledger and denial shape. |
| Pre-tool input | The live JSON included `session_id`, `turn_id`, `cwd`, `tool_name`, `tool_input`, and `tool_use_id`; `transcript_path` was `null`. | Replace Claude `prompt_id`/transcript turn logic with `turn_id`. |
| Native file write and exact retry | Stable Codex produced `tool_name: "apply_patch"` and a unified patch in `tool_input.command`. A first denial caused an identical second `PreToolUse` with a new `tool_use_id`; the retry succeeded and alone emitted `PostToolUse`. | Parse this path for manifest, import, and new-file guards; use post-tool success for edit-phase confirmation. |
| Subagent identity | Stable and alpha subagent Bash events carried the parent `session_id`, a subagent-specific `turn_id`, `agent_id`, and `agent_type: "default"`. `SubagentStart`/`SubagentStop` carried the same identity. Official docs guarantee identity on the lifecycle events but do not list `agent_id` for tool events. | Persist `turn_id -> agent_id` at `SubagentStart`; tool hooks resolve it and use turn-isolated fallback. Inject all roles until capability fixtures justify filtering. |
| Collaboration tool name | The parent hook observed the live spawn function as `collaborationspawn_agent`; the parent event had no `agent_id`. | Do not depend on guessed function aliases for core enforcement. The reliable boundary is the spawned agent's own lifecycle/tool events. |
| `UserPromptSubmit` context | A hook sent `RAZOR_CONTEXT_PROBE`; a normal user question yielded the injected requested response. | Use for ladder and on/off delivery, while retaining the documented advisory priority boundary. |
| `Stop.additionalContext` | The hook executed but its `additionalContext` caused no continuation. | Do not use it for the build ledger. |
| `Stop.decision: "block"` | The first final message was followed by one automatically-created continuation prompt; the second response followed the hook reason and `stop_hook_active` became true. | Use a guarded one-shot continuation ledger only. |
| Local plugin | A temporary `.agents/plugins/marketplace.json` installed and enabled `razor-codex-probe`; its fresh-session hook emitted context. | Sibling packaging is viable on current CLI. |
| Plugin paths and state | The installed hook saw `PLUGIN_ROOT` in Codex's cache and a writable `PLUGIN_DATA` directory, where it wrote evidence. | Resolve code from `PLUGIN_ROOT`; keep state only in `PLUGIN_DATA`. |
| `SessionEnd` stable vs alpha | The configured hook did not execute on stable `0.144.6`. It executed at alpha ephemeral shutdown with `session_id`, `cwd`, `transcript_path: null`, `hook_event_name: "SessionEnd"`, and `reason: "other"`; alpha warned that its timeout was clamped to three seconds. | Do not ship a release dependency on this undocumented event. Retain startup garbage collection and test alpha only as a canary. |
| Binary feature/string check | Stable and alpha contained hook, plugin, `PLUGIN_ROOT`, `PLUGIN_DATA`, `turn_id`, `agent_id`, permission-decision, managed-hook, exec-policy, and OTel symbols. Neither contained `userConfig`, `CLAUDE_PLUGIN_OPTION`, or `updatedToolOutput`; the documented mutation key is `updatedMCPToolOutput`. | Treat official schemas and live JSON as authoritative; string presence only identifies candidates and never establishes support. |
| Cleanup | `codex plugin remove razor-codex-probe@razor-codex-probe-marketplace` and `codex plugin marketplace remove razor-codex-probe-marketplace` succeeded. | No disposable plugin or marketplace remains configured. |

## Production sibling validation

Run date: 2026-07-21. The actual `plugins/razor-codex` package was installed from
the repository's `foundry-codex` marketplace on stable CLI `0.144.6`. The final
lifecycle build exercised below was `0.1.0+codex.20260721065319`; the
transaction-corrected final build was
`0.1.0+codex.20260723234615`. Automation used
`--dangerously-bypass-hook-trust` only after the package source and generated
cache were inspected; this is not an installation instruction.

| Session | Production-package result |
| --- | --- |
| `019f836e-d54b-7f60-a9e2-7d60b3a73606` | A real `apply_patch` ran through the bundled Pre/Post hooks. Its captured PostToolUse response exposed the stable `Exit code: 0 ... Success. Updated...` envelope used by the regression fixture. |
| `019f8370-4023-78a3-85f7-27fae8c2ce57` | After a successful patch, the first `rg` ran, the second distinct `rg` was denied by Razor, and its exact retry ran. |
| `019f8373-baa8-7d41-b66f-77d49c029236` | `$razor-codex:razor-unused` was discovered from the installed cache, resolved its helper from the skill directory, ran the report-only audit, and made no edits. |
| `019f8374-57c1-7da1-8028-dbaf5595bbf8` | A real explorer subagent completed. `SubagentStart` persisted the observed turn-to-agent map, and the subagent used its own state namespace. |
| `019f8375-48d1-7b80-ad2a-d756643fafec` | Nine disposable new files triggered one Stop continuation from the installed hook. The second Stop completed without another continuation. |
| `019f915f-f7a8-7623-a235-4158b256b526` | On the final build, two post-edit searches launched concurrently through one `Promise.all`. Exactly one ran and one was denied; persisted state recorded `count: 2`, `fired: true`, and the denied action's turn-scoped retry grant. |

The corresponding retained transcripts are the matching
`rollout-2026-07-21T00-{48,49,53,54,55}-...jsonl` files and
`2026/07/23/rollout-2026-07-23T17-46-53-019f915f-f7a8-7623-a235-4158b256b526.jsonl`
below the local Codex session directory. After validation, the installed
plugin, marketplace registration, plugin cache/data, and disposable project
files were removed.

## Current compatibility refresh

Review date: 2026-07-26. Codex `0.145.0` supersedes the stable/alpha split
recorded above. The official hook contract now includes `SessionEnd`, with
main-session archive, delete, close, and 30-minute idle triggers, a maximum
three-second timeout, and a currently fixed `reason: "other"`. The production
sibling now registers that event at three seconds and deletes its session,
agent, and turn-map state on a best-effort basis. Startup garbage collection
remains a fallback, not a substitute for the supported event.

The refreshed implementation adds the following regression targets:

| Target | Required evidence |
| --- | --- |
| Concurrent identical guarded actions | Two requests that began before any grant exists cannot treat one another as the exact retry. One is denied and a later, separately-started exact retry consumes the persisted grant. |
| File-budget transaction | Added-file reservations contribute to concurrent projected budget, but only a successful `PostToolUse` commits them. A failed patch releases its reservation and leaves the committed count unchanged. |
| Read-only session baseline | A repository already more than 500 inserted lines dirty at `SessionStart` does not trigger Stop when unchanged. A path replacing an initially untracked path counts as new. Baseline capture does not change `.git` objects, the index, or the worktree. |
| Explorer role filtering | `SubagentStart` records identity before policy filtering, skips `explorer` ladder injection by default, accepts added `RAZOR_AGENT_SKIP` roles, and gives `RAZOR_AGENT_INJECT` precedence for full or bare names. |
| Session cleanup | `SessionEnd` removes main and agent-scoped state plus turn maps, leaves unrelated files untouched, and completes inside the three-second host ceiling. |

## Codex 0.145.0 production refresh

Run date: 2026-07-26. `codex-cli 0.145.0` installed
`razor-codex@foundry-codex` build
`0.1.0+codex.20260726231537` into a disposable `CODEX_HOME`. The installed
plugin list showed that exact version and the namespaced
`razor-codex:razor-unused` skill was discoverable.

| Session | Production-package result |
| --- | --- |
| `019fa0b4-eaf3-7101-afb2-9142194724ad` | The code-identical preceding cachebuster loaded its installed SessionStart hook and returned the requested `RAZOR_FINAL_OK`; its session-scoped JSON was absent after process exit. The final cachebuster changed only public README wording. |
| `019fa0b0-7354-7f10-ac9f-d4c522812c44` | On the code-identical preceding cachebuster, the first `npm install axios --dry-run --ignore-scripts` request was denied by the installed PreToolUse hook. A later equivalent but non-identical `npm install --save axios --dry-run --ignore-scripts` request executed with exit code 0, proving shared semantic reconsideration. Only public documentation and the cachebuster changed afterward. |
| `019fa0a2-fc72-7313-84de-64546fdaeea1` | The installed package exposed the namespaced `razor-codex:razor-unused` skill to a fresh CLI task. This probe preceded the final cachebuster, but the skill and manifest contents were unchanged and the final cache was separately inspected. |

After the final session exited, no main-session, agent, or turn-map JSON
remained below the installed plugin's `PLUGIN_DATA`; only the shared bounded
garbage-collection cursor remained. This is live evidence that current
`SessionEnd` invoked scoped cleanup. The 101-test package suite separately
exercised concurrent arrival boundaries, failed-patch rollback, dirty-baseline
accounting, cleanup starvation, and the official `agent_type: "explorer"`
event shape.

A requested live explorer spawn did not preserve a role selection in its
recorded session metadata (`agent_role` was `null`), so it is not counted as
evidence for the default explorer skip. The event-level fixture remains the
acceptance evidence for that policy; no old `0.144.6` explorer session is
relabelled as a current result.

## Reproduction outline

1. Create a throwaway project with `.codex/hooks.json` and small Node hooks that save redacted stdin.
2. Run `codex exec --ephemeral --dangerously-bypass-hook-trust` only in that project.
3. Test first-deny/retry separately for `Bash` and `apply_patch`; preserve both pre-tool records and the successful post-tool record.
4. Spawn a real default subagent and capture `SubagentStart`, its own `PreToolUse`/`PostToolUse`, and `SubagentStop` identity fields.
5. On current stable `0.145.0`, close an ephemeral main session and verify the documented `SessionEnd` event and three-second ceiling. Keep the older stable/alpha comparison only as historical regression evidence.
6. Create a separate local marketplace containing a minimal plugin whose hook writes a redacted record below `PLUGIN_DATA`.
7. Install it, start a fresh CLI session, inspect the state record, then remove the plugin and marketplace.

The shipping decisions do not rely on an undocumented Codex hook field.
`SessionEnd` is part of the current `0.145.0` contract; bounded startup garbage
collection remains because lifecycle cleanup is best effort. The alpha result
above is retained only to explain the former stable/alpha discrepancy.
