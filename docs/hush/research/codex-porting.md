# Porting specification

> **Status note, 2026-08-18.** Snapshot of hush as of 2026-07-20. The
> `hush-compress` and `hush-stats` porting steps and the narration-meter warning
> name features hush no longer has, and `hush/benchmarks/` has since moved to
> the parent repo. See [README.md](codex-port-dossier.md) before following any step here.

## Non-negotiable boundary

Create a sibling package; do not make the Claude directory dual-hosted. Do not alter `hush/.claude-plugin`, `hush/output-styles`, `hush/hooks`, `hush/skills`, scripts, benchmarks, or measurements. Their wire format, tools, path variables, and forced-style behavior are Claude-specific.

The eventual package root should be separate:

```text
plugins/hush-codex/
  .codex-plugin/plugin.json
  hooks/hooks.json
  hooks/
    report-contract.js
    route-command.js
    postcompact-rearm.js
    lib/
  scripts/
    run-command.js
    retrieve-sidecar.js
  skills/
    hush-compress/SKILL.md
    hush-stats/SKILL.md
    hush-report/SKILL.md
  tests/
```

`plugin.json` needs a stable kebab-case name, version, description, `skills: "./skills/"`, and either the default `hooks/hooks.json` or an explicit `hooks` path. Paths must be `./`-prefixed and remain inside the plugin root. Do not place anything but `plugin.json` in `.codex-plugin/`.

## Delivery architecture

### What cannot be ported

Claude hush's forced style uses the `output-styles/` registry and `force-for-plugin: true`. Codex documents neither. A skill is lazy-loaded, and hook `additionalContext` is extra developer context; neither has the same priority guarantee.

Do not emulate a forced slot by editing user configuration, swapping plugin-cache files, adding a `Stop` continuation, or using `suppressOutput`. `suppressOutput` is parsed but not implemented, and `Stop` creates another prompt rather than formatting the current final response.

### What to ship

1. A small `UserPromptSubmit` hook emits a report contract and an execution contract naming the installed source-capture runner.
2. Codex calls that runner first for commands likely to produce noisy shell output.
3. A `PreToolUse` denial catches selected unwrapped commands before execution and supplies one exact runner retry.
4. An explicit `hush-report` skill contains the complete reporting rules for deterministic user invocation.
5. Progress remains allowed when Codex requires it, a user decision or approval is needed, or work is blocked.

The reporting contract remains advisory. The execution path can be mechanically enforced only by denying a direct command and asking for a retry.

## Compression architecture

### Source-capture runner

Compress before the outer shell tool creates its result. Invoke the runner through Codex's ordinary shell tool so sandbox and lifecycle inheritance can be preserved; that inheritance is still a release test because the prototype used dangerous bypass. The runner must:

1. Receive an exact command specification without model-generated shell interpolation. Prefer a restrictive single-use job or an encoded command string.
2. Execute once from the original `cwd`, with the relevant environment and the platform shell Codex would have used.
3. Capture stdout and stderr without an unbounded memory buffer. Preserve useful ordering or label the streams separately.
4. Record the child exit code before compression and print it in the digest. The tested Windows shell adapter normalized child exit `7` to tool status `1`, so the digest is authoritative for the original code.
5. Run the sibling copy of the calibrated ANSI cleanup, signal retention, duplicate/template collapse, caps, relevance, enumeration carve-out, and sidecar logic.
6. Emit original output unchanged below the pass-through threshold; otherwise emit a bounded, self-identifying digest.
7. Exit with the child status and terminate the child on cancellation or timeout.

Do not execute arbitrary commands inside a plugin MCP server. It is not the ordinary Codex shell boundary and may not inherit its sandbox. MCP may later expose sidecar retrieval, but it is not the command executor.

### First-call routing and fallback

The execution contract should produce a runner call first. A headless prototype did so with one tool call. Against an unwrapped one-call fixture, total input fell from 32,024 to 27,314 tokens. These numbers prove the boundary can save context; they are not a release benchmark.

If Codex proposes a direct noisy command, `PreToolUse` returns `permissionDecision: "deny"` and a reason stating that the original did not run, plus one exact retry command. This preserves side-effect correctness but adds a model round trip. On the measured medium fixture, fallback routing used more total input than first-call routing.

Do not silently rewrite by default. Codex requires `permissionDecision: "allow"` with `updatedInput`, which also approves the replacement. This CLI reported `permission_mode: "bypassPermissions"` for both `approval_policy=never` with `workspace-write` and the full dangerous bypass, so the hook cannot distinguish those security postures from that field. Automatic rewriting is an explicit security-sensitive opt-in only.

## Hook adapters

### `PreToolUse`: route before execution

Codex reports the Windows shell path to hooks as canonical tool name `Bash`. The safe default blocks a selected unwrapped command:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "HUSH_ROUTE_REQUIRED: original command was not executed; retry with ..."
  }
}
```

The retry is a new tool call and follows normal policy. Exclude the runner, sidecar retrieval, interactive or TTY commands, background sessions, and explicit raw or enumeration requests to prevent loops and semantic changes.

### `PostToolUse`: not the compression boundary

Claude's `updatedToolOutput` field is not a Codex interface. In CLI `0.145.0-alpha.18`, `decision: "block"` replaced output but made it hook-error feedback; exit code `2` left the original visible. A complete `continue: false` response with both `stopReason` and `hookSpecificOutput.additionalContext` also stored the full original and injected the digest twice.

Do not transform results through `PostToolUse` in this CLI generation. A non-blocking `additionalContext` may repeat a tiny report nudge, but compression belongs in the runner.

### Native history limit and code mode

`tool_output_token_limit` is real. At `200`, Codex stored a head-and-tail preview and the marker `…4867 tokens truncated…`, while the CLI event stream retained the full 20,288 characters. The stored input omitted a mid-stream failure diagnostic, so this is not semantic compression.

The limit acts before both `PostToolUse` and code-mode JavaScript receive the result. Each saw only about 900 characters and the same truncation marker. Code mode therefore cannot recover the omitted raw output. Leave the host limit as defense in depth; do not lower it during plugin installation or claim that it preserves signals.

## State, sidecars, and secrets

Use `PLUGIN_DATA` for hook-owned jobs when the runner can read them through the active sandbox. Use a validated private temp location for runner-owned sidecars when `PLUGIN_DATA` is not writable from the shell sandbox. Never reuse `.claude`, `$HOME`, a host transcript directory, or an assumed path.

Jobs must be single-use or tamper-evident, avoid command-secret leakage, and be deleted after consumption. Sidecars need restrictive permissions, atomic writes, bounded retention, and the existing hush secret screen. The approval surface must show the original command clearly enough for review. Do not encourage a persistent broad allow rule for `run-command.js`.

`PostCompact` may remove stale state. It cannot inject a compaction summary: Codex ignores `PreCompact` plain stdout and has no documented summary-replacement field.

## Transcript-derived logic

Do not port the narration meter or transcript token parser as control logic. Codex marks `transcript_path` as unstable. Debug-only observation may be explored behind an opt-in flag, but no enforcement or savings claim may depend on it.

## Skills

Codex skills require `name` and `description` frontmatter and clear trigger wording:

- `hush-compress`: preserve refusal-before-read, immutable source, sibling `.hush` output, cache-stability advice, and mechanical verification. Resolve bundled paths from `PLUGIN_ROOT`.
- `hush-stats`: report the sibling's own opt-in decision manifest. Omit per-model totals until a stable accounting source is proved.
- `hush-report`: provide the report and execution contracts and explain that neither is a forced host output style.

Do not port `allowed-tools`, `/hush:` syntax, `AskUserQuestion`, `.claude/output-styles`, or activation scripts without a verified Codex equivalent.

## Packaging and trust

Add the sibling to `.agents/plugins/marketplace.json`, then install it through the desktop Plugins UI or CLI. Plugin hooks are non-managed: Codex skips them until the user reviews and trusts the exact definitions, and a hash change requires review again.

## Implementation order

1. Scaffold the sibling manifest, marketplace entry, report skill, and no hooks.
2. Prove install and discovery on desktop and CLI.
3. Add and trust the report and execution contracts; measure first-call routing.
4. Build the runner with pass-through, success, failure, cancellation, shell-fidelity, secret, enumeration, and sidecar fixtures.
5. Add denial/retry fallback after loop and approval tests pass.
6. Copy pure transforms into the sibling with parity fixtures against Claude hush; never alter or import runtime files from `hush/`.
7. Add sidecars and debug-only stats.
8. Consider compact-start context, subagent briefs, re-read delta, and MCP result handling.
9. Publish only features and surfaces that pass the matrix gates.
