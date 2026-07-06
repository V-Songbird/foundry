# Changelog

All notable changes to forge are documented here. As of 1.4.1-alpha, forge
is a monorepo-folder plugin — its version is owned by
`.claude-plugin/marketplace.json` at the repo root, not by
`forge/.claude-plugin/plugin.json` (which carries no version field by
convention).

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); alpha releases may introduce breaking changes in minor versions.

## [Unreleased]

## [1.4.1-alpha] — 2026-07-05

### Changed — moved into the claude-plugins monorepo

- Forge's standalone repository is retired for development; the source now
  lives directly in [claude-plugins](https://github.com/V-Songbird/claude-plugins)
  as a plain folder (previously mounted as a git submodule pinned by SHA).
  The marketplace entry's source changed from a URL+SHA to `./forge`, the
  version field moved to marketplace.json per the monorepo convention, and
  homepage/repository now point at the monorepo. No functional changes.
- `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` removed — the monorepo root's
  community files cover all plugins.

## [1.4.0-alpha] — 2026-06-30

### Changed

- **Analysis pipeline (Steps 2–6) is now a single `Workflow` call for full and deep runs.** The orchestrator keeps Steps 1 and 2.3 (the domain-skill scan needs the `Skill` tool, which a Workflow cannot call) in the main session, invokes one Forge Workflow that runs the structural search + reality-check spike (a scout), the parallel experts, plan synthesis, the adversarial critique, an optional refuter panel, and the revision, then resumes at the Step 7 approval gate. Every handoff between phases is schema-validated at the tool layer with automatic retry — no more heading-parsing between steps. The script, schemas, and arg shape live in `skills/forge/references/workflow-pipeline.md`.
- **Level semantics unified.** `full` and `deep` now share the same Workflow pipeline; `deep` differs only by toggling the refuter-panel Verify phase. The old per-step deep-mode gate (a separate Workflow at Steps 3 and 5) is gone — depth is one boolean passed into the pipeline. `lite` is unchanged (in-session, no Workflow).
- **The approval gate and spike-stop stay in the main session.** A Workflow cannot call `AskUserQuestion`, so a refuted spike returns `{ spikeRefuted: true }` and halts before experts, and the Step 7 digest + approval run after the Workflow returns — the two points where control deliberately returns to the orchestrator.

### Added

- **`forge-plan-synthesizer` agent** — the Workflow-path equivalent of the `master-plan` skill (Step 4). Receives the expert reports as structured input rather than reading conversation, produces the master plan and gate counts. No model pin (inherits the session model); `effort: high`.
- **`forge-plan-reviser` agent** — the Workflow-path equivalent of the `plan-revise` skill (Step 6). Receives the plan, critique, and panel verdicts as input, reads the cited code, returns the revised plan with its critique-resolution table. No `SendMessage` back-channel to the critic (grounds refutations in code alone — an accepted tradeoff for running inside a Workflow). No model pin; `effort: high`.

### Removed

- **`skills/expert-analysis/references/workflow-dispatch.md` and `skills/critic-review/references/workflow-panel.md`** — the two per-step deep-mode Workflow scripts, now absorbed into the single `workflow-pipeline.md`. The `expert-analysis`, `critic-review`, `master-plan`, and `plan-revise` skills remain as the sequential fallback path used only when the `Workflow` tool is absent or a pipeline phase errors.

## [1.3.1-alpha] — 2026-06-30

### Changed

- **Expert-roles catalog trimmed.** Removed the seven "Role line" archetype blocks from `expert-roles.md` — the file's own comment said they are not spliced into dispatch prompts; the archetypes live in `forge/agents/forge-expert.md`. Moved the three-question expert-selection heuristic (architectural shape / risk axis / validation surface) from the catalog into the `expert-analysis` SKILL.md "Picking experts" section, where the cap, merge-rule, and user-override rules already lived. Removes the only other place those rules were duplicated.
- **`setLevel` no longer calls `mkdirSync`.** The `~/.claude` directory is guaranteed to exist at Claude Code runtime; the defensive `mkdirSync` was a no-op on every real invocation. Removed.

## [1.3.0-alpha] — 2026-06-29

### Changed

- **Communication contract — two registers.** The orchestrator now speaks to the user in just two registers: a terse *status register* (one plain line per phase — "Running 3 experts…", "Critic reviewing the plan…") between gates, and a richer *decision register* only when the user must read or decide (a spike refutation, the Step 7 approval gate, an escalated open question). A new "Communication — what reaches the user" section in the main skill defines both, with a per-phase say-this / not-this table. This is the reliability lever: a user who can find the one decision actually makes it, instead of TL;DR-ing a wall of process and rubber-stamping.
- **Silent plumbing.** Model pins and fallbacks (a Fable-pinned subagent dropping to another model), the `forge:`-namespaced `subagent_type`, re-dispatch, retries, and tool mechanics are now explicitly internal — never narrated. A subagent dying and being re-dispatched is not a user event; failures surface only when unrecoverable and only in plain language. `expert-analysis` and `critic-review` gained "User-facing output" sections enforcing this at the two dispatch points where the narration leaked worst.
- **Show the plan once.** The user reads the master plan exactly once — final form, at the Step 7 gate. `master-plan` now drafts the plan as the verbatim input to the critic dispatch and emits only a status line; `plan-revise` is the single point where the plan reaches the user, behind the digest. This removes the duplicate full-plan read (draft + revised) the pipeline previously printed.
- **Gate metrics demoted to internal.** The `coverage:` (`master-plan`) and `resolution:` (`plan-revise`) footers added in 1.2.0 are no longer emitted to the user as machine lines. Their substance — domains reviewed, conflicts resolved, whether the critic's findings were absorbed or pushed to the user — now reaches the user once, in plain language, inside the Step 7 digest. The counts remain an internal continuity signal feeding that digest.

## [1.2.0-alpha] — 2026-06-27

### Added

- **Three explicit workflow levels.** `/forge lite` runs in-session (no expert or critic dispatch) for prototypes and bounded changes. `/forge` (default) runs the full pipeline. `/forge deep` adds Workflow dispatch with schema-validated reports and a two-refuter panel — previously this was an implicit opt-in detected from prose; it is now a first-class level set by command.
- **Investigation Ladder.** The workflow's entry logic is now structured as a five-rung ladder: trivial → project-skill check → reality-check spike → full forge → deep forge. The orchestrator stops at the first rung that covers the task, making short-circuit exits (rungs 2 and 3) visible rather than buried in step descriptions.
- **Routing table in main skill.** A task-shape → right-tool table makes it explicit when forge is the wrong tool and names the alternative (direct edit, `/code-review`, project skill, `/forge lite`).
- **Tagged expert findings (`## Findings summary`).** Each `forge-expert` report now opens with a machine-readable summary section before its prose. Tags — `conflict:`, `risk:`, `touch:`, `assumption:`, `contract:` — allow `master-plan` to seed `Files touched` sets from `touch:` lines without re-parsing prose, and allow `adversarial-critic` to verify the highest-stakes claims first rather than scanning freeform markdown.
- **Per-gate scoring metrics.** `master-plan` emits `coverage: <N> domains · <M> conflicts resolved · <P> assumptions flagged for critic` after the plan. `plan-revise` emits `resolution: <N> verified-blocking fixed · <M> refuted · <P> escalated to user` before step 7. These give the user a one-line read on each gate without parsing the full output.
- **`UserPromptSubmit` hook.** Tracks explicit `/forge`, `/forge lite`, `/forge deep` commands and writes the active level to `~/.claude/.forge-active`. Also emits a one-line routing hint when the user's prompt shows action-verb + architectural-signal patterns and forge is not already active, surfacing the option without requiring the user to know the workflow by heart.
- **`SubagentStart` hook.** When a forge run is active, injects a brief citation-discipline reminder into every spawned subagent. Silent when forge is not active. Reinforces `file:line` discipline across the pipeline without duplicating it in each agent's frontmatter.

### Changed

- **Adversarial critic prioritizes tagged findings.** `adversarial-critic` now reads `conflict:` and `risk:` tagged lines from expert `## Findings summary` sections before scanning the plan's prose — concentrating its turn budget on pre-flagged high-stakes claims.
- **Master-plan synthesis starts from tagged findings.** Step 1 of the synthesis procedure is now a `## Findings summary` scan across all expert reports; conflicts are reconciled before step descriptions are drafted, preventing plans built on top of unresolved expert disagreements.

## [1.1.0-alpha] — 2026-06-11

### Added

- **Deep mode (user opt-in).** When the user explicitly asks for a deep / thorough run AND the `Workflow` tool is available (Claude Code ≥ 2.1.154), Steps 3 and 5 upgrade from `Agent` dispatch to `Workflow` orchestration: experts return schema-validated reports (tool-layer validation + retry replaces heading-parsing), and every Blocking critic finding is audited by a two-refuter panel with distinct lenses (identifier accuracy / consequence severity) before `/forge:plan-revise` spends verification cycles on it. Script templates: [skills/expert-analysis/references/workflow-dispatch.md](skills/expert-analysis/references/workflow-dispatch.md) and [skills/critic-review/references/workflow-panel.md](skills/critic-review/references/workflow-panel.md). Standard `Agent` dispatch remains the default path and the fallback when `Workflow` is unavailable.
- **External-verification lens for experts.** `forge-expert` may now ground claims that live outside the repo (framework version behavior, platform API contracts, library semantics) via `WebFetch`/`WebSearch` — citing the doc URL with the same discipline as `file:line`, pinning the version against the project's actual manifest/lockfile first, and never substituting a fetch for reading the project's code.
- **Resume, don't re-dispatch, when context is an asset.** Blocker resolution and contested critic findings now continue the original subagent via `SendMessage` (context + worktree intact) instead of fresh dispatch: `dispatch-implementation` resumes implementers for decision-only blockers; `plan-revise` gives the critic one confirm-or-withdraw exchange on refuted Blocking findings. Fresh dispatch remains the rule when the assignment itself changes, and the fallback on builds without `SendMessage`.
- **Plan digest at the approval gate.** Step 7 now presents a short, dev-pitched digest (intention, shape of the change, risks and critic deltas, verification — no W-IDs or `file:line` machinery) above the full plan, so the human approves on understanding instead of rubber-stamping a Claude-facing artifact. The digest is presentation only; the full plan remains the single canonical artifact for the critic and implementers.

### Changed

- **Final report recalibrated to a developer reader.** The two mandatory user-facing sections ("How to test this feature", "How is this feature useful?") are now pitched at a developer who did not follow the run — concrete commands and technical terms welcome, internals walkthroughs out — replacing the old "non-developer / no technical terms" framing. The report template also moves "Plan adherence" below the user-facing sections so skimming readers can stop early.

- **Fable 5 model pass.** Research-shaped agents pin `fable`: `forge-expert` (was `sonnet`) and `adversarial-critic` (was `opus`; effort `medium` → `high`). Synthesis skills (`master-plan`, `plan-revise`, the `forge` orchestrator) drop their `opus` pins and inherit the session model, so they never age into downgrades when newer models ship. `forge-implementer` stays `sonnet` as a documented cost choice — implementers execute a pre-verified plan.
- **Turn budgets scaled to research depth.** `forge-expert` `maxTurns` 20 → 40 (investigate to turn 30, report by 33); `adversarial-critic` 18 → 30 (checkpoints 23/27). The 1.0.3-era tightening was a weak-model mitigation that had become the binding constraint on investigation depth.

### Fixed

- Removed the residual `name:` parameter from the `Agent` dispatch templates in `expert-analysis` and `critic-review` — the same silently-dropped parameter that 1.0.6 removed from `dispatch-implementation` — and added the do-not-re-add note to both skills.

## [1.0.5-alpha] — 2026-05-28

### Removed

- Removed unused `disable-model-invocation: true` from the `dispatch-implementation` and `build-and-report` skills. (Entry backfilled — this release was originally published as a marketplace version bump without a changelog entry.)

## [1.0.6-alpha] — 2026-05-28

### Fixed

- `forge-implementer` agents hitting `maxTurns` mid-implementation on parallel dispatches: raised frontmatter `maxTurns` from `30` → `60` (mirrors the kairoi 1.0.5-alpha fix; same failure mode, same remedy) and added a "Turn budget" section at the top of [forge-implementer.md](agents/forge-implementer.md) with explicit checkpoints (turn 40: stop reading; turn 50: finalize edits; turn 55: commit-or-escalate). Implementers now escalate as a Blocker rather than silently truncate when the work doesn't fit the budget.
- `dispatch-implementation` Agent template: removed `max_turns: 30` and `name: "Implementer W<N>"` from the call template. Per Claude Code's tool reference, neither parameter is accepted at the `Agent` call site — both were silently dropped by the harness, while the "self-documenting" comment misled readers into thinking they controlled the per-dispatch budget. The template now points readers to the agent frontmatter, which is the only effective control.

## [1.0.4-alpha] — 2026-05-08

### Removed

- Stripped the undocumented `color` frontmatter key from all 7 skills (`master-plan`, `critic-review`, `plan-revise`, `build-and-report`, `dispatch-implementation`, `forge`, `expert-analysis`). `color` is valid for subagent definitions only, not skills (silent no-op on `SKILL.md` per upstream spec).

### Fixed

- Frontmatter compliance pass on all 7 skills: split trigger phrases out of `description` into a `when_to_use` field, added `allowed-tools` declarations covering each skill's directive tool invocations, and added `disable-model-invocation: true` to side-effect skills (`build-and-report` runs `git merge`; `dispatch-implementation` spawns worktrees).
- `critic-review`: the `Agent(...)` dispatch block now sets `model: "opus"` to enforce the synthesis-shaped role. The body prose previously claimed Opus but the call did not pin it, leaving the actual model up to the dispatcher's default.

## [1.0.3-alpha] — 2026-05-02

### Fixed

- `forge-expert` agents hitting `maxTurns` mid-investigation without producing a structured report: moved the turn-budget section to the top of the agent instructions (before all other content) and tightened the thresholds — investigation cutoff moved from turn 14 → turn 10, report-writing deadline from turn 17 → turn 13, leaving 7 turns of margin for report generation instead of 3

## [1.0.2-alpha] — 2026-05-01

### Added

- Step 2.3 (domain-skill scan): before the reality-check spike, the orchestrator now scans `.claude/skills/` for project skills claiming domain authority over the feature's area, invokes any match, and threads the output into expert dispatch prompts — preventing experts from re-deriving schema facts that a project skill already encodes authoritatively
- Optional `## Domain authority` section in the `/forge:expert-analysis` dispatch template: when Step 2.3 loads a skill, its output is passed here so the receiving expert treats it as ground truth rather than searching files for the same answers

## [1.0.1-alpha] — 2026-04-30

- Removed tool usage from skills and agents to avoid blocking mcp tool dependencies.

## [1.0.0-alpha] — 2026-04-29

### Added

- `/forge:forge` orchestrator skill: 10-step pre-code feature review pipeline — understand requirements → structural search → reality-check spike → parallel expert analysis → master plan → adversarial critic → plan revise → user approval → implementation → build + report
- Entry guard: skips the full pipeline for trivial localized changes (typo fixes, single-method bugs); enters forge only when the feature crosses ≥ 2 architectural areas or touches a trust boundary
- Reality-check spike (Step 2.5): targeted ≤ 30-line probe against the single riskiest assumption before any planning begins; surfaces refutations to the user rather than silently re-scoping
- `/forge:expert-analysis` skill + `forge-expert` subagent: parallel domain expert analysis (architecture, security, performance, testing, UX); each expert reads actual code and returns a scoped report
- `/forge:master-plan` skill: synthesizes expert reports into a single-layer implementation plan (Feature, Steps with W-prefixed IDs, `Files touched`, `Done when` criteria, Risks, Open questions)
- `/forge:critic-review` skill + `adversarial-critic` subagent: ground-truths the master plan against the codebase; emits a structured critique organized as Blocking / High-priority gap / Open question; includes self-doubt rule for Blocking findings to reduce false positives
- `/forge:plan-revise` skill: incorporates critic findings and user feedback into a revised plan before approval
- User approval gate (Step 8): `AskUserQuestion` halt — the pipeline does not proceed to implementation without explicit approval
- `/forge:dispatch-implementation` skill + `forge-implementer` subagent: optional parallel worktree dispatch for plans with parallel-friendly steps
- `/forge:build-and-report` skill: optional stack-specific build and verify step after implementation; defers build commands to the consuming project's CLAUDE.md
- Color and effort metadata on all skills and agents for session-context visibility
- Stack-agnostic design: no hardcoded build commands; all stack-specific behavior deferred to the project's own CLAUDE.md
