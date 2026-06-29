# Changelog

All notable changes to nudge will be documented here.

## [0.2.1-alpha] — 2026-06-29

### Fixed
- "What the session needed" constrained to 2–3 sentences (was an uncapped paragraph)
- Step 3 rewrite now required to apply all relevant rubric dimensions (role, XML structure, output format, positive framing) — previously only addressed the identified gap, producing incomplete rewrites without role context or structure

## [0.2.0-alpha] — 2026-06-29

### Changed
- **Core behavior redesign:** skill now focuses on the first prompt only, using the rest of the session as evidence of what it missed
- Report produces one professional rewrite of the opening prompt (calibrated to the detected model and effort level) instead of analyzing multiple prompts
- Step 4 explanation is now required to be plain, non-technical language — no rubric labels or jargon
- Report format simplified: removed Pattern section and One thing to carry forward; report is opening prompt → gap → rewrite → explanation → efficiency

### Fixed
- Added `Read` to `allowed-tools` (skill reads two reference files)
- Added `disable-model-invocation: true` (broad trigger phrases risk auto-firing)
- Replaced prose question in Step 0 with proper `AskUserQuestion` directive
- Replaced natural-language "read" verbs with `MUST invoke Read` directives

## [0.1.0-alpha] — 2026-06-29

### Added
- Initial release
- `review` skill: end-of-session prompt analysis with 9-dimension rubric, concrete rewrites, and mechanism-first teaching output
- `references/model-effort-guide.md`: per-model rubric emphasis notes (Opus 4.8, Fable 5, Sonnet/Haiku) and effort decision matrix
- Step 0: model detection via self-knowledge, optional effort question, and model-aware analysis before the review begins
- Session efficiency section in report: effort vs. task-complexity verdict plus model-specific pattern flags (optional, omitted if effort not provided)
