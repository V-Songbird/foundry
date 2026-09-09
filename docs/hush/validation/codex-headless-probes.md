# Headless Codex probe evidence

Run date: 2026-07-20. CLI: `codex-cli 0.145.0-alpha.18`, installed at `C:\Users\Songbird\AppData\Local\OpenAI\Codex\bin\5dee10576ec7a5b8\codex.exe`.

The first plugin fixtures lived under `X:\Temp\hush-codex-probe-20260720`; deeper native-alternative fixtures lived under `X:\Temp\hush-codex-native-20260720`. Controlled runs used headless `codex exec`, fresh sessions, and bypassed hook trust only for inspected prototype hooks. Dangerous approval/sandbox bypass was used for deterministic command execution where stated. Nothing under `hush/` changed.

## Packaging and delivery

| Probe | Real result | Port decision |
| --- | --- | --- |
| Project `UserPromptSubmit` hook | `additionalContext` produced a requested `HUSH_FINAL:` prefix for an ordinary prompt. | Use as advisory report-contract delivery. |
| Context priority | A direct user request for exact response `READY` beat the hook prefix. | No forced-slot claim. |
| `PreToolUse` rewrite | `permissionDecision: "allow"` with `updatedInput` executed the replacement command. | Mechanically available, but approval-bearing and unsafe as the default. |
| Plugin installation | A temporary marketplace and plugin installed, loaded in a fresh session, received `PLUGIN_ROOT` and `PLUGIN_DATA`, and were removed successfully. | Sibling packaging and hook environment proven for CLI. |

## Completed-result replacement

| Probe | Real result | Decision |
| --- | --- | --- |
| `PostToolUse` `decision: "block"` | Replaced the command result; CLI logged router error feedback. | Unsafe for compression. |
| `PostToolUse` exit `2` | Original result remained visible. | Not replacement in this build. |
| `continue: false` with only stop text | Original result remained visible. | Not replacement. |
| `continue: false` with `stopReason` and `additionalContext` | Hook saw the full result, but persisted history stored the full original and two identical developer-context digests. | Not replacement; exact docs/runtime discrepancy. |

## Native history limit

With `tool_output_token_limit=200`, a 20,288-character success result remained complete in the CLI JSON event stream, but persisted model history contained a head-and-tail preview with `…4867 tokens truncated…`. The head and tail sentinels survived; the middle sentinel did not.

A failing fixture placed `FAILURE_DIAGNOSTIC_SENTINEL` in the omitted middle. Persisted history did not contain it. The model nevertheless answered that it had seen it, demonstrating why model self-report is insufficient acceptance evidence.

Two attempted recovery paths also received the capped form:

- `PostToolUse.tool_response` was about 925 characters, contained the marker, and lacked the middle diagnostic.
- Code-mode JavaScript saw about 891 characters from the nested shell result, contained the marker, and lacked the middle diagnostic.

The history cap is real context reduction but unsafe semantic compression.

## Source-capture runner

The runner prototype executed the noisy child inside a Node process, captured raw output before the outer shell result existed, wrote a full sidecar, emitted selected signals plus counts, and exited with the child's code.

| Fixture | Result |
| --- | --- |
| Successful child | 20,288 raw characters / 400 lines became 211 model-facing characters. Outer tool succeeded with `0`; head, middle, and tail sentinels survived. |
| Failing child | 20,265 raw characters / 400 lines became 239 model-facing characters. Digest reported child exit `7`, retained the middle failure diagnostic, and named a 20,265-character sidecar. The outer Windows shell tool reported normalized status `1`. |
| Sidecar retrieval | A later read confirmed the complete character count and failure diagnostic. |
| First-call execution contract | `UserPromptSubmit.additionalContext` made Codex call `node hush-run.js success` as its first and only tool call. |
| Denial/retry fallback | `PreToolUse` denied the raw command before execution, stated that it had not run, and supplied the exact runner retry. The child then ran once. |
| Same-call rewrite | In a controlled probe, `allow` plus `updatedInput` rewrote the raw command to the runner and compressed in one call. It is not the default because it approves the replacement. |

Paired one-call success runs under the same profile:

| Path | Tool-output characters | Total input tokens |
| --- | ---: | ---: |
| Unwrapped | 20,288 | 32,024 |
| Direct runner | 211 | 27,314 |

The 4,710-token difference is fixture evidence only. The fallback adds another model call and can cost more overall on medium outputs, so first-call routing is part of the core design.

## Permission-mode discrepancy

The routing hook logged `permission_mode: "bypassPermissions"` in both of these runs:

- `approval_policy=never` with `sandbox_mode=workspace-write`;
- `--dangerously-bypass-approvals-and-sandbox`.

Therefore a hook cannot infer full dangerous bypass, or safe authority to rewrite, from `permission_mode` alone. The production default must route by contract and deny missed routes; same-call rewriting needs explicit opt-in and separate policy tests.

## Cleanup

The disposable installed plugin and marketplace from the first probe were removed through the CLI. The temporary user profile used for the deeper hook tests was deleted after the runs. Prototype source remains under `X:\Temp\hush-codex-probe-20260720` and `X:\Temp\hush-codex-native-20260720`; generated sidecars are in the latter. No probe plugin remains installed and no permanent Codex config was changed.

## Reproduction outline

1. Use a throwaway directory and a temporary profile containing `[features] hooks = true` plus the exact test hooks.
2. Run fresh headless sessions and persist selected sessions when exact history inspection is required.
3. Compare CLI event output with the persisted `custom_tool_call_output` item for the history-limit test.
4. Place success, failure, head, middle, and tail sentinels in deterministic output.
5. Compare unwrapped, direct-runner, and denial/retry paths separately; do not combine their token totals.
6. Remove the temporary profile and any installed plugin/marketplace after testing.
