# Porting specification

## Package and state boundary

Foreman for Codex is a sibling package, not a dual-host mode inside `foreman/`.

```text
plugins/foreman-codex/
  .codex-plugin/plugin.json
  hooks/{hooks.json,lib.js,session-start.js,guard-roadmap-edit.js,post-commit.js}
  skills/{foreman,foreman-init,foreman-roadmap,foreman-craft-prompt,foreman-survey}/
  scripts/
  scripts/health/{roadmap-health.js,attention-cost.js}
  prompt-template-codex.md
  roadmap-schema.md
  tests/
```

The manifest points `skills` at `./skills/`. Codex discovers lifecycle configuration at the default `hooks/hooks.json` path, so the manifest carries no duplicate hooks field. Hook commands use `PLUGIN_ROOT` and hook-owned state uses `PLUGIN_DATA`; skill-authored commands resolve helpers relative to the loaded `SKILL.md`.

Project state remains host-neutral:

- `ROADMAP.jsonl` is the single active roadmap.
- `.foreman/archive.jsonl` is the single archive ledger.
- `.foreman/config.json` preserves existing keys and applies the same safe policy defaults.
- `.foreman/trial-log.jsonl` is optional, local project evidence enabled only by `trialLog: true`.

## Mechanical core

The sibling is rebased on Foreman `1.1.2` (`cdec583`). `roadmap.js` remains the JSON stdin/stdout compatibility seam and owns every roadmap mutation.

Format 2 separates:

- `planned_touches`: editable predicted scope used for collision and commit-ranking hints;
- `observed_touches`: append-only execution evidence derived from recorded commits.

Format-1 files remain readable. A write or explicit `migrate` performs the mechanical upgrade and preserves a timestamped backup. Archive migration follows the same rule.

The workflow exposes guarded operations for add, update-status, annotate, update-deps, correct, reassign-id, archive, restore, list, next-candidates, check-duplicate, doctor, and migrate. `doctor` reports structural findings; repair remains explicit and operation-specific.

## Five explicit Codex skills

| Skill | Ownership |
| --- | --- |
| `$foreman` | Routes six plain-language intents without reading or mutating the roadmap itself |
| `$foreman-init` | Creates or safely extends roadmap/config state after approval |
| `$foreman-roadmap` | Owns add, review, correct, doctor, lifecycle, archive/restore, pick, accept, resume, and reconcile-and-pick |
| `$foreman-craft-prompt` | Builds and checks standalone Codex handoffs |
| `$foreman-survey` | Grounds a bounded roadmap set against repository evidence and applies only confirmed corrections |

All remain explicit. If a structured chooser is unavailable, the skill asks the same bounded question in normal conversation.

## Lifecycle

Selection, preview, and clipboard copy do not start work. Current-task and supervised-subagent destinations transition a planned entry to `in_progress` immediately before execution. The active parent waits for subagent results and owns evidence recording and closure.

With `requireVerification` absent or true, completed work records its commit and `observed_touches`, then moves to `awaiting_acceptance`. User confirmation moves it to `done`; a rejection returns it to `in_progress` with durable notes. Explicit `requireVerification: false` permits direct closure.

Clipboard delivery leaves the entry unchanged and embeds the lifecycle instructions the destination needs. Durable recovery uses roadmap notes, commits, and observed paths; ephemeral agent identifiers are not persisted as resume promises.

## Prompt contract

The Codex template is Markdown and keeps evidence separate from hypotheses and unknowns. Its checker supports `standard` and `reinforced` profiles. Reinforced is required by signals such as risk, conflict, staleness, constraints, unfamiliarity, blind spots, and explicit unknowns; it adds task-specific provenance and uncertainty evidence rather than a different fixed structure.

Every handoff retains goal, measurable done state, current evidence and file hypotheses, constraints, ordered verification with expected signals, lifecycle ownership, and an evidence-backed outcome. Research and decision tasks retain their own completion semantics.

There is no Anthropic-to-OpenAI model mapping. Fable, Claude XML, and Workflow-schema delivery remain outside this port.

## Hook adapters

### SessionStart

The startup/clear matcher returns a Codex JSON `SessionStart.additionalContext` envelope. It distinguishes `in_progress` from `awaiting_acceptance`, labels stale work, rate-limits archive offers in `PLUGIN_DATA`, and records opt-in session/recovery trial events before silent branches.

### Native write guard

`PreToolUse` covers `apply_patch`, `Edit`, and `Write`. It parses native patch file headers and move targets, denies any `ROADMAP.jsonl`, and denies only the project-owned `.foreman/archive.jsonl`. Guidance names the corresponding correct, migrate, doctor, archive, restore, or reassign path. Malformed/unknown envelopes fail open; shell repair remains available for corrupt JSONL.

### Post-commit

`PostToolUse` matches canonical `Bash`, parses compound and `git -C` commit invocations, and respects confirmed native or wrapped exit status. It resolves the commit to the project root or a declared submodule and ignores unrelated repositories.

The emitted JSON `additionalContext` covers safe-on verification, `awaiting_acceptance`, `Foreman:` trailers, planned-file overlap ranking, commit-derived observed files, done-today and awaiting follow-ups, corrupt-roadmap doctor guidance, opt-in discovery, and one-time unanswered-discovery invitations. State dedupe stays in `PLUGIN_DATA`.

### Deferred lifecycle hooks

No `TaskCreated`, `TaskCompleted`, broad Stop close gate, or decision-anchor matcher is registered. The current Codex event set does not provide a reliable generic entry mapping, and decision-anchor attribution still lacks trustworthy native path evidence.

## Health and evidence

`commit-evidence.js` centralizes recorded SHA and trailer resolution across the root repository and declared submodules. `roadmap-doctor.js` uses the same evidence contract. `roadmap-health.js` and `attention-cost.js` produce mechanical product evidence; `trial-log.js` provides their opt-in usage denominator with a closed event vocabulary.

These reports are not release certification and do not import Claude benchmark or model conclusions.
