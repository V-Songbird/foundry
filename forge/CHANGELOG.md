# Changelog

All notable changes to forge are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); alpha releases may introduce breaking changes in minor versions.

## [Unreleased]

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
