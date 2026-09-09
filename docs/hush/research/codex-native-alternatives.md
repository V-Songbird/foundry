# Native Codex compression alternatives

## Decision

Use a **source-capture runner** for shell output. Deliver a short execution contract so Codex calls it first, and use a `PreToolUse` denial as the missed-route fallback. Keep transparent `PostToolUse` replacement, MCP-result compression, and forced output style deferred.

This is the only tested design that simultaneously reduced model-visible output, preserved a mid-stream failure diagnostic, retained the complete raw sidecar, and did not convert a successful command into post-tool hook-error feedback.

## Evaluated approaches

| Approach | Ground truth | Decision |
| --- | --- | --- |
| `PostToolUse.updatedToolOutput` | Claude-only field; absent from Codex docs and binary strings. | Reject. |
| `PostToolUse.updatedMCPToolOutput` or `suppressOutput` | Parsed but officially unsupported; Codex reports hook failure and continues with the original. | Defer. |
| `PostToolUse.decision: "block"` | Replaces the result, but surfaces router/hook error feedback. | Reject for compression. |
| `PostToolUse.continue: false` | With `stopReason` and `additionalContext`, the tested CLI stored the full original and injected the digest twice. | Reject for this CLI build; docs/runtime mismatch. |
| Native `tool_output_token_limit` | Real head-and-tail history cap with an explicit omission marker. A middle diagnostic disappeared. | Defense in depth only. |
| History cap plus `PostToolUse` digest | The hook received the already-capped response and could not see the omitted diagnostic. | Reject. |
| Code-mode composition | JavaScript received the already-capped nested result when the host limit applied. Code mode is also under development in the sample config. | Optional orchestration, not the compression boundary. |
| Arbitrary-command MCP façade | Could return a small result, but execution would move outside the ordinary shell boundary and may escape its sandbox. | Reject. |
| Subagent isolation | Keeps raw output out of the parent context but still spends a model context in the subagent and changes workflow semantics. | Optional parent-context isolation, not token compression. |
| Early whole-thread compaction | Happens after output has entered context and can discard unrelated detail. | Reject as per-command compression. |
| Source-capture runner | Outer shell sees only the runner's bounded digest; child output is compressed before Codex records it. | Selected candidate. |

## Selected flow

```text
User request
  -> execution contract asks for Hush runner first
  -> Codex shell calls runner
  -> runner executes child under the ordinary shell tool
     (sandbox inheritance remains a release gate)
  -> raw stdout/stderr -> secret screen -> sidecar / pure transforms
  -> bounded digest + original exit code -> Codex history

Missed route
  -> PreToolUse denies direct noisy command before execution
  -> model receives exact retry
  -> runner executes child once
```

The pre-tool denial must say that the original did not execute. It must never block after side effects, and it must exclude its own runner command to prevent loops.

## Measured prototype

Environment: Windows, `codex-cli 0.145.0-alpha.18`, model `gpt-5.6-sol`, headless `codex exec`, 2026-07-20. Dangerous approval/sandbox bypass was used only for controlled fixture execution; it is not an installation recommendation.

| Fixture | Raw | Model-facing runner result | Correctness |
| --- | ---: | ---: | --- |
| Success | 20,288 characters / 400 lines | 211 characters | Exit `0`; head, middle, and tail sentinels retained. |
| Failure | 20,265 characters / 400 lines | 239 characters | Child exit `7`, middle failure diagnostic, and full sidecar retained. Codex tool status was normalized to `1`. |

Paired one-tool-call success runs under the same profile used 32,024 total input tokens unwrapped and 27,314 through the runner, 4,710 fewer. The fallback denial/retry adds another model round trip and may cost more than it saves for a medium output. Release measurements need a representative corpus, repeated runs, cache accounting, and correctness scoring.

## Native history cap evidence

The official [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) defines `tool_output_token_limit` as the token budget for storing individual tool/function outputs in history. At `200`, the persisted tool item retained head and tail plus `…4867 tokens truncated…`; the full output remained visible in the CLI JSON event stream.

The cap is intentionally content-agnostic. It omitted a failure diagnostic located in the middle, and the model hallucinated that the diagnostic was present until the persisted item was inspected. Hush must not use this setting as evidence that errors survive.

Plugins cannot declare this host setting in `.codex-plugin/plugin.json`; the documented manifest packages skills, hooks, MCP/app configuration, and assets. Do not edit a user's global config during installation.

## Approval and sandbox boundary

The official [hooks documentation](https://learn.chatgpt.com/docs/hooks) requires `permissionDecision: "allow"` for a rewritten `updatedInput`. That decision approves the replacement call. The tested CLI used `permission_mode: "bypassPermissions"` for both `approval_policy=never` with `workspace-write` and full dangerous bypass, so the mode string is not enough to authorize silent rewriting safely.

Default behavior:

- The execution contract asks for a direct runner call, which follows ordinary policy.
- A missed route returns `permissionDecision: "deny"`; the retry is a new ordinary tool call.
- No hook returns `allow` or changes input.

An automatic same-call rewrite can be offered only behind explicit opt-in with separate approval and sandbox tests. Trusting the plugin hook is necessary, but it should not be treated as blanket consent to execute arbitrary rewritten commands.

## Production gaps

The prototype proves the boundary, not a shippable general runner. Implementation remains gated on:

- faithful PowerShell and POSIX shell selection, quoting, working directory, environment, and stream ordering;
- interactive, background, long-running, polling, cancellation, and timeout behavior;
- bounded streaming capture rather than `spawnSync` plus a large memory buffer;
- single-use/tamper-resistant command handoff and deletion;
- a runner-readable private sidecar location under each sandbox;
- exact parity with Claude hush for secret screening, enumeration, relevance, caps, templates, sidecar digests, and failure signals;
- normal interactive approval tests without dangerous bypass;
- package installation and hook trust on every advertised surface.

Until those gates pass, describe the source-capture route as a validated architecture candidate, not a released full port.
