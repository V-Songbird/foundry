# Changelog

All notable changes to scriptorium are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); alpha releases may introduce breaking changes in minor versions.

## [Unreleased]

## [1.0.2-alpha] — 2026-05-08

### Fixed

- `proofreader` agent: false-positive flagging of the documented `user-invocable` skill frontmatter key. Item 11's unknown-keys check now inlines the authoritative valid-key sets for skills, subagents, and slash commands (with the cross-type collision matrix — `color` is subagent-only, `user-invocable`/`allowed-tools`/`disable-model-invocation`/`argument-hint`/`arguments`/`paths`/`shell`/`context`/`agent`/`when_to_use` are skill-only) so the agent cannot fall back to training-data guesses.
- `proofreader` agent: false-positive flagging of `${CLAUDE_PLUGIN_ROOT}` paths as undocumented. Item 9 (file references resolve) now explicitly handles documented runtime variables (`${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`) — substitute before checking, never flag the variable itself as undocumented.
- `scribe` reference-set drift: corrected `Task` → `Agent` in `claude-md.md`, `decomposition.md`, and `workflow-skill-shapes.md` (the Task tool was renamed to Agent in Claude Code v2.1.63; `Task` still works as an alias but the canonical form is `Agent`). Added the `${CLAUDE_EFFORT}` runtime variable to the string-substitution table in `skill-authoring.md`.
- `scribe` SKILL.md: split `description` into `description` (the *what*) plus a new `when_to_use` field (the *when*) so the skill itself follows the rule it teaches.

### Changed

- All 10 scribe reference files have refreshed footer dates (2026-05-08); upstream-source content was already current except for the `Task` → `Agent` rename above.

## [1.0.1-alpha] — 2026-05-07

### Changed

- `proofreader` item 8a now measures the **combined** `description` + `when_to_use` length against the 1,536-char cap (the actual upstream truncation unit in the skill listing), not `description` alone — a 1,000-char `description` plus a 1,000-char `when_to_use` no longer slips past the audit
- `scribe` item 8 and the body-budget table updated to match (combined-cap wording, source pointer to `references/skill-authoring.md` § 3)

### Added

- `proofreader` item 11 sub-rule: `description` says both *what* and *when* — partial fail when neither field anchors the trigger condition (per upstream "What the skill does and when to use it")
- `proofreader` item 11 sub-rule: front-loading the key use case — advisory `Suggest:` annotation emitted in Evidence when the first sentence buries the dominant trigger noun (per upstream "Put the key use case first"); explicitly excluded from verdict math and partial-fail tally
- Item 11 Output-format Evidence template extended with worked phrasings for both new sub-rules

## [1.0.0-alpha] — 2026-04-29

### Added

- `/scriptorium:scribe` skill: comprehensive authoring guide for Claude Code instruction artifacts (SKILL.md, CLAUDE.md, plan files, subagent definitions, slash commands, hook scripts); covers every tool parameter, phrasing pattern, frontmatter field, and decomposition shape that Claude Code parses and executes reliably
- 13-item authoring checklist covering: `AskUserQuestion` full shape, `TodoWrite`/`TaskCreate`+`TaskUpdate` lifecycle, `Bash` description field, `Agent` dispatch parameters, plan-gate `ExitPlanMode` usage, no `AskUserQuestion` inside subagents, literal tool names with strong directive verbs, `SKILL.md` body shape and token budget, file reference resolution, user-facing output phrasing, frontmatter validity, decomposition opportunity (SUGGEST-only), and dynamic-injection safety
- `proofreader` subagent: audits any instruction artifact against the 13-item checklist; returns a structured PASS/FAIL/N/A/SUGGEST report per item with line-anchored evidence and concrete revision text
- Directory-mode cross-file pattern detection: flags the same checklist failure repeated across ≥ 3 files as a single systemic entry
- Decomposition guidance: identifies SKILL.md files that should be split into orchestrator + subagents; provides proposed file-tree output
- Dynamic-injection safety check: flags write-shaped commands in `` !`cmd` `` and ` ```! ` blocks that run unconditionally
- 12 reference files covering tools, workflow shapes, plans, hooks, permissions, dynamic context, agent frontmatter, key bindings, and decomposition patterns
- 6 worked examples: strong CLAUDE.md, plan file, SKILL.md, subagent definition, workflow decomposition, and a full worked example walkthrough
