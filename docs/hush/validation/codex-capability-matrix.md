# Capability matrix

> **Status note, 2026-08-18.** Snapshot of hush as of 2026-07-20. The delta
> re-read, MCP JSON table compression, mid-turn narration meter, `hush-compress`
> and `hush-stats` rows below name capabilities that have since been deleted
> from hush. See [README.md](../research/codex-port-dossier.md) before relying on any row here.

Status is deliberately conservative: **portable** means a documented Codex primitive exists; **candidate** means it still needs the live gate in [VALIDATION.md](codex-validation.md); **deferred** means shipping it now would overstate support.

| Claude hush capability | Current Claude mechanism | Codex disposition | Safe Codex design or reason to defer |
| --- | --- | --- | --- |
| Silent work and one concise final message | Forced output style plus repeated hook nudges | Candidate, never forced | A live `UserPromptSubmit` probe affected a normal response but yielded to a directly conflicting user format. Inject a small report contract and retain an explicit `$hush-report` skill; never claim absolute silence. |
| Output-style registration | `output-styles/hush.md`, `force-for-plugin: true`, activation swap | Deferred / no equivalent | Do not copy `output-styles/`, `force-for-plugin`, `outputStyle`, `pick-style`, or `craft-style`. Offer named report-contract skills only when explicit style choice is required. |
| Command-output compression | `PostToolUse` emits `updatedToolOutput` | Candidate through a different boundary | Transparent completed-result replacement remains unavailable. Instead, route noisy shell commands through a source-capture runner that compresses before the outer shell tool returns. A live prototype reduced 20,288 raw characters to 211 model-facing characters. |
| Failures and exit codes survive compression | `PreToolUse` wraps Bash/PowerShell and emits an exit marker | Candidate; core fixture passed | The runner retained a mid-stream failure diagnostic, wrote the full 20,265-character sidecar, and printed `original_exit_code=7`; Codex's Windows shell adapter separately normalized its tool status to `1`. Production must surface both without presenting the command as successful. |
| ANSI cleanup, caps, relevance, duplicate/template collapse | `compress-tool-output.js` | Portable inside the runner | Copy the calibrated pure transforms into the sibling with parity fixtures; do not edit or import runtime files from `hush/`. Keep errors/warnings verbatim and never compress a requested enumeration. |
| Sidecar full output | Secure temp sidecar and digest | Candidate; prototype passed in temp | The prototype wrote and retrieved the full sidecar. Production must prove its runner can use a private, sandbox-readable location on each platform, apply the existing secret screen, use atomic mode-0600 writes, and bound retention. |
| Native per-tool history cap | Host truncation | Portable but unsafe alone | `tool_output_token_limit=200` stored a head-and-tail preview with an explicit marker, but omitted a mid-stream diagnostic. Use only as defense in depth, never as hush's semantic compressor. A plugin cannot declare this host setting in its manifest. |
| Transparent completed-result replacement | Claude `updatedToolOutput` | Deferred by live proof | `decision: "block"` changes the result into hook-error feedback. `continue: false` plus `stopReason` and `additionalContext` left the full original in history and duplicated the digest. Exit code `2` also left the original. |
| Delta re-read | Claude `Read` hook response and transcript state | Deferred | Codex documents `Bash`, `apply_patch`, MCP, and local functions, not the Claude `Read` response shape. Revisit only after a real Codex read tool exposes stable hook input/output. |
| MCP JSON table compression | Claude result-shape handling and `updatedToolOutput` | Deferred | `updatedMCPToolOutput` is parsed but unsupported. Do not flatten or replace structured MCP results until a supported replacement contract is live-tested per tool. |
| Mid-turn narration meter | Reads Claude transcript format and injects correction | Deferred | Codex says `transcript_path` is convenient but not stable for hooks. A format-dependent enforcement hook is unsafe. Keep only the simple report contract; optionally collect debug data without policy effect. |
| Silence and execution nudges | `UserPromptSubmit` and `PostToolUse.additionalContext` | Portable | Port a short report contract and first-call execution contract. In a live run, the execution contract made Codex choose the runner on its only tool call. Both remain advisory and require hook trust. |
| Subagent brief | `SubagentStart.additionalContext` | Candidate | Port with Codex `SubagentStart`; determine actual agent-type matcher values in a live session before narrowing its matcher. |
| Pre-compaction summary shaping | Claude plain stdout instruction | Deferred | Codex ignores plain stdout for `PreCompact` and documents no compaction-summary injection field. Never emit a fake summary. |
| Post-compaction re-arm | Deletes session sentinels | Portable | Port the cleanup only. It is a no-output `PostCompact` hook; it does not restore a summary or style. |
| Stats and token breakdown | Claude transcript + debug manifest | Candidate / partial | Port the debug decision manifest to `PLUGIN_DATA`. Do not promise per-model token totals unless a supported Codex accounting interface is available. |
| `hush-compress` | Claude skill + Node verifier | Portable | Rewrite as a Codex skill. Preserve refusal rules, sibling-only output, cache-stability advice, and mechanical verification; change only root/path variables. |
| `hush-stats` | Claude skill + transcript parser | Candidate / partial | Provide decision-manifest totals first. Defer transcript token claims. |
| `pick-style` and `craft-style` | Claude output-style files and forced-slot swap | Deferred | No host equivalent. A future `$hush-style-*` skill may describe a report contract, but cannot activate a forced global style. |

## Surface status

| Surface | Status | Reason |
| --- | --- | --- |
| ChatGPT desktop app, Codex | Candidate | Official plugin installation and hook packaging are documented. Needs local marketplace install, trust review, and live session evidence. |
| Codex CLI | Candidate with substantial live evidence | The alternate bundled CLI installed and removed a disposable plugin, loaded plugin hooks, and passed the source-capture prototypes. Interactive trust UI and a packaged production runner remain release gates. |
| ChatGPT Work mode, desktop/web | Candidate for skill-only parts | Official plugin docs list Work mode. Hook behavior must be tested separately; do not assume local Node/runtime parity. |
| Codex IDE extension | Unsupported | Official plugin docs explicitly say plugins are unavailable in the IDE extension. A repo-local `AGENTS.md` can state a report preference, but it is not the sibling plugin. |
| Codex cloud | Deferred | The plugin support page does not name Codex cloud as a plugin surface. Do not advertise it until OpenAI documents it and a cloud run proves hook runtime, trust, and `PLUGIN_DATA` behavior. |
| Mobile / Chat mode | Unsupported | Official plugin docs exclude them. |
