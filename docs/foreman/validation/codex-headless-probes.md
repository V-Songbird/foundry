# Headless Codex probe evidence

## Status on 2026-08-08

The probes below are historical adapter evidence from 2026-07-20 using `codex-cli 0.144.6`. They informed the Codex port but are not final evidence for the rebased Foreman `1.1.2` package. Final normal-trust CLI and desktop measurements remain pending in [VALIDATION.md](codex-validation.md).

The historical run used a disposable Git repository, `codex exec --ephemeral`, and an explicit hook-trust bypass after inspecting the fixture hooks. That bypass must not appear in release installation instructions or final trust evidence.

| Historical probe | Observed result | Current port consequence |
| --- | --- | --- |
| Installed skill resources | A skill loaded from the plugin cache and resolved a sibling helper relative to `SKILL.md`. | All five skills use skill-relative helpers and references. |
| Skill shell environment | Ordinary skill commands had neither `PLUGIN_ROOT` nor `CLAUDE_PLUGIN_ROOT`. | Skill workflows do not depend on hook-only environment variables. |
| Native patch event | Codex reported `apply_patch` with unified patch text in `tool_input.command`; a Codex envelope could deny it. | The guard parses patch file and move records and also supports Edit/Write aliases. |
| SessionStart delivery | Raw hook stdout ran but was not model-visible. | SessionStart emits JSON `hookSpecificOutput.additionalContext`. |
| Successful commit event | Codex used canonical tool name `Bash`; post-commit context was model-visible. | Post-commit retains Bash registration and Codex JSON delivery. |
| Commit synchronization | The injected context led to status, SHA, and derived file recording in the disposable fixture. | Current logic records commit evidence and `observed_touches`, subject to current verification policy. |
| Subagent lifecycle | Start/stop events exposed ids, type, parent/session fields, and a final message but no assignment or roadmap marker. | Managed parent workflows are supported; a generic close gate and exact detached resume are not. |
| Spawn interception | The tested CLI did not emit a reliable pre/post-tool mapping for the spawned assignment. | Task-to-entry inference and decision anchors remain unregistered pending native evidence. |
| Cleanup | The disposable plugin and marketplace registrations were removed. | The historical fixture is not a production install result. |

## Rebased probe requirements

Repeat on the final 2026-08-08 source package without an automatic trust bypass:

1. Install through the CLI marketplace and review the exact hook definitions.
2. Confirm five installed skills and skill-relative helper resolution.
3. Confirm automatic `hooks/hooks.json` discovery with no manifest hooks field.
4. Capture native envelopes for SessionStart, apply_patch/Edit/Write, Bash commit, and subagent lifecycle events without recording prompt contents or secrets.
5. Exercise format-2 planned/observed fields, awaiting acceptance, archive/restore, doctor/correct, trailers, submodules, and discovery defaults.
6. Compare installed-cache files and hashes with the source package.
7. Remove and unregister the disposable installation.
8. Repeat the release lifecycle in the Codex desktop app.

Record measured values in [VALIDATION.md](codex-validation.md). If a current native event still cannot provide stable assignment and path evidence, keep the generic close gate, exact detached resume, and decision anchors deferred.
