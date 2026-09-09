# Hush for Codex: port dossier

> Historical Codex port dossier. Dates, versions, verdicts and paths below describe
> the recorded implementation, not a new validation of the current branch.
> Use the [plugin index](../README.md) to find current source documentation
> and the separate validation reports.

> **Status note, 2026-08-18 — read before relying on anything here.** This
> dossier is a snapshot of hush as it stood on 2026-07-20 and has not been
> re-derived since. hush has changed underneath it: it now ships **two**
> Claude-facing skills (`craft-style`, `pick-style`), not four — `hush-compress`
> and `hush-stats` were deleted. The mid-turn narration meter, the MCP JSON
> table compression, and the delta re-read were deleted too, so every row and
> porting step that carries them describes a capability hush no longer has.
> `hush/benchmarks/` moved to the parent repo. The Codex-side probe evidence in
> [HEADLESS_PROBES.md](../validation/codex-headless-probes.md) is about the Codex CLI and still
> stands; every claim about what *hush* does must be re-checked against current
> hush first.

> **The port is closed, 2026-08-18.** A `hush-codex` sibling is not being built,
> and this dossier is kept as a reference rather than a plan. Three reasons, in
> order. Nothing asks for it — no user request, no roadmap entry, no dependency.
> The Verdict below says a Codex port cannot truthfully promise the forced
> single-final-message style, which is the whole product, so the port would ship
> a weaker thing under the same name. And every hush-side claim here is a
> 2026-07-20 snapshot, so building it would start by re-deriving the entire
> capability matrix against a hush two releases newer. `plugins/` holds
> `foreman-codex` and `razor-codex`; hush is deliberately not joining them.
> Reopening this is a fresh decision, not a resumed one.

This is the implementation boundary for a sibling `hush-codex` plugin. It deliberately does **not** modify the calibrated Claude Code plugin in [`hush/`](../../../hush).

## Verdict

Codex can distribute a sibling plugin with skills and lifecycle hooks. It does not expose Claude Code's output-style registration or its `force-for-plugin` delivery slot, so a Codex port cannot truthfully promise the same forced single-final-message style.

The native replacement is a hook-delivered **report contract**: concise, model-visible context on `UserPromptSubmit` and `PostToolUse`, backed by explicit skills for user-invoked work. This is behavioral guidance, not a rendering or priority override. Higher-priority Codex instructions, required approvals, and user questions still win.

The deeper CLI probes found a viable compression architecture that does not rewrite completed results. A **source-capture runner** executes a shell command under Codex's ordinary shell tool, captures its output before Codex receives it, applies the ported hush transforms, writes the full sidecar, and returns only a bounded digest. A small execution contract makes the runner the first call; a `PreToolUse` denial is the fallback when Codex attempts an unwrapped noisy command.

This restores the core shell-output promise as a candidate for implementation. It does not make `PostToolUse` replacement work, does not compress MCP results, and does not make the reporting style forced. The safe default never rewrites a tool with `permissionDecision: "allow"`: this CLI reports `permission_mode: "bypassPermissions"` for both `approval_policy=never` with a sandbox and the full dangerous bypass, so that value cannot prove that automatic approval is harmless.

## Read in this order

1. [Capability matrix](../validation/codex-capability-matrix.md) — every current hush feature and its Codex disposition.
2. [Porting specification](codex-porting.md) — sibling layout, adapters, safety rules, and staged build order.
3. [Validation plan](../validation/codex-validation.md) — schema, installation, and live-session acceptance gates.
4. [Context glossary](codex-context.md) — the terms used consistently by these documents.
5. [Headless probe evidence](../validation/codex-headless-probes.md) — reproducible results from the installed CLI.
6. [Native alternatives](codex-native-alternatives.md) — evaluated compression designs and the selected source-capture route.
7. [Architecture decision](https://github.com/V-Songbird/hush/blob/Codex/docs/adr/0001-source-capture-before-history.md) — closed proposal retained in the Codex edition; why completed-result replacement was not the proposed port boundary.

## Ground truth recorded on 2026-07-20

- Current hush is a Claude Code plugin: [manifest](../../../hush/.claude-plugin/plugin.json), [output style](../../../hush/output-styles/hush.md), [hooks](../../../hush/hooks/hooks.json), and four Claude-facing skills.
- The active Windows package is `OpenAI.Codex_26.715.7063.0_x64__2p2nqsd0c76g0`. The inspected `resources/codex` binary has SHA-256 `20D611EF1C9851F4DA1CB4609BEB6763904F72275CB91517B2400639CA1C28C4`.
- Static inspection found `PostToolUse`, `updatedMCPToolOutput`, and `suppressOutput`; it did not find `updatedToolOutput`, `outputStyle`, `output-styles`, or `force-for-plugin`.
- A synthetic hook run confirms current hush emits Claude-only shapes: `updatedToolOutput` from compression and an `updatedInput` without Codex's documented `permissionDecision: "allow"` wrapper. It cannot be copied unchanged.
- The installed CLI executable could not be launched from this sandbox, even after scoped escalation (`Access is denied`). No plugin was installed and no Codex configuration was changed.
- Later headless testing used the alternate bundled CLI at `C:\Users\Songbird\AppData\Local\OpenAI\Codex\bin\5dee10576ec7a5b8\codex.exe`, which reports `codex-cli 0.145.0-alpha.18`.
- A disposable plugin was installed from a temporary local marketplace, loaded in a fresh headless session, exercised `PLUGIN_ROOT` and `PLUGIN_DATA`, then removed with its marketplace entry. The probe did not reference or modify `hush/`.
- `UserPromptSubmit.additionalContext` influenced a normal response, but lost to a directly conflicting exact user-format request. `PreToolUse` can deny a command before execution and can rewrite with `permissionDecision: "allow"`; the latter is not a safe default because it also approves the replacement call.
- `PostToolUse.decision: "block"` replaced the model-visible result but treated it as hook-error feedback. Exit code `2` did not replace the result. `continue: false` with both `stopReason` and `additionalContext` still stored the full original output and injected the digest twice in this build.
- `tool_output_token_limit=200` reduced a 20,288-character tool result to a head-and-tail history item with `…4867 tokens truncated…`. The CLI event stream retained the full output, but the stored model input lost a mid-stream failure diagnostic. `PostToolUse` and code mode both received the already-capped form, so neither can repair that loss.
- A source-capture runner prototype reduced 20,288 raw characters to 211 model-facing characters on success and preserved a mid-stream failure diagnostic, a full 20,265-character sidecar, and the child exit code `7` on failure. A paired one-tool-call run used 27,314 input tokens versus 32,024 unwrapped, a reduction of 4,710 for that fixture. This is prototype evidence, not a release benchmark.

## Official basis

- [Build plugins](https://learn.chatgpt.com/docs/build-plugins): `.codex-plugin/plugin.json`, bundled skills/hooks, marketplaces, plugin hook trust, and `PLUGIN_ROOT`/`PLUGIN_DATA`.
- [Build skills](https://learn.chatgpt.com/docs/build-skills): SKILL.md contract, progressive disclosure, explicit and implicit invocation.
- [Hooks](https://learn.chatgpt.com/docs/hooks): current lifecycle schema, tool coverage, trust, result replacement behavior, and unsupported hook fields.
- [Plugins](https://learn.chatgpt.com/docs/plugins): supported plugin surfaces. Plugins are unavailable in the IDE extension and mobile; the page names Work mode/Desktop and Codex CLI as supported.
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference): `tool_output_token_limit` is the per-tool/function history storage budget.

The Codex manual helper completed successfully and reported its cached manual as current. The cited official pages above were then used for exact hook and configuration fields.
