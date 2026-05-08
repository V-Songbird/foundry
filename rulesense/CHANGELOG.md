# Changelog

All notable changes to rulesense are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); alpha releases may introduce breaking changes in minor versions.

## [Unreleased]

## [1.0.3-alpha] — 2026-05-07

### Fixed

- `/rulesense:file` skill: the prohibition on space-indented continuation lines was buried inside Transform 3 as a closing note, so the skill silently passed files whose primary bullets wrapped across multiple lines via 2-space continuation indent — including the `recommendation-files.md` shipped by `/rulesense:primer`. Promoted the rule to a first-class **Transform 4 — Unwrap continuation lines** with explicit detection criteria, output rules, an unconditional-application directive (the symptom is structural ambiguity regardless of the wrapped content's punctuation), and two worked examples. Updated the Phase 4 diff format to include a wrapped→unwrapped pair so the emitted diff exhibits the intended pattern. Updated counts in description and Phase 3 intro from "three transforms" to "four transforms"

### Changed

- `/rulesense:primer` bundled file (`recommendation-files.md`): reformatted to comply with the now-correct `/rulesense:file` rules. Every primary bullet and `Why:` sub-bullet was previously written across multiple source lines via 2-space continuation indent (the exact anti-pattern Transform 4 forbids). Each is now a single unwrapped line per bullet. Wording is unchanged; only the line breaks moved. Running `/rulesense:primer` followed by `/rulesense:file` against the bundled file is now a no-op as intended

## [1.0.2-alpha] — 2026-05-07

### Changed

- `/rulesense:primer` bundled rules: rewrote the existing 3 rules to follow forge's writing principles — concrete tool-call triggers (`Bash mv`/`git mv`/`rm -r`, `Edit`/`Write` to instruction files), single-imperative parent bullets, sub-list format for edge cases and WHY clauses
- `/rulesense:primer` bundled file: removed the `default-category: mandate` frontmatter block — `mandate` is rulesense's default and the field is not part of Claude Code's official rule frontmatter spec

### Added

- Five new rules in `/rulesense:primer`'s bundled file covering stale-reference vectors beyond file paths: batch-shell-rename extension (`rename`/`mmv`/`find -exec mv`/for-loop renames not covered by the single-`mv` trigger), sibling instruction-file consistency check (CLAUDE.md/README.md/AGENTS.md convention drift), exported-symbol rename audit, build-script rename audit (`package.json` scripts, `Makefile` targets, `pyproject.toml`/`Cargo.toml` entries), and environment-variable rename audit

## [1.0.1-alpha] — 2026-05-07

### Added

- `/rulesense:primer` skill: copies a curated, project-agnostic recommendation-rules file into `.claude/rules/recommendation-files.md` so Claude re-reads its own instruction files (CLAUDE.md, README.md, AGENTS.md, `.claude/rules/*.md`) after structural changes (renames, moves, deletions) and verifies cited file paths before stating them as fact; bundled rules cover four scenarios — post-restructure audit, path-citation verification, doc-edit path check, and first-session project orientation; offers Overwrite / Merge / Cancel via `AskUserQuestion` when the destination file already exists

## [1.0.0-alpha] — 2026-04-29

### Added

- `/rulesense:assay` skill: structural audit of CLAUDE.md and `.claude/rules/` files; scores each rule against eight factors (F1 trigger specificity, F2 conditional coverage, F3 Claude compliance judgment, F4 action presence, F7 framing, F8 redundancy) and returns a graded report with rewrite suggestions; `--fix` flag suggests and applies rewrites interactively
- `/rulesense:forge` skill: interactive rule authoring with real-time structural scoring; multi-rule brainstorm mode, 3-checkpoint review flow (draft → score → post-write); creates `.claude/rules/` files scored for Claude's parsing
- `/rulesense:file` skill: reformats rule files for readability — one concept per bullet, blank-line separation, 80-char wrap; never changes rule content, produces a before/after diff for confirmation before writing
- `run_audit.py` orchestrator: single entry point handling all pipeline mechanics; modes `--prepare`, `--finalize`, `--prepare-fix`, `--score-rewrites`, `--finalize-fix`, `--score-draft`, `--finalize-draft`, `--build-analysis`, `--cleanup`
- Failure-class diagnostics: distinguishes structural, framing, and coverage failure classes for targeted fix guidance
- Conflict detection: identifies rules that contradict each other within the same rule file
- Bright-line threshold system: mechanical pass/fail gates calibrated to Claude's actual parsing behavior
- High-stakes rule scaffold: templates for rules that govern irreversible or high-blast-radius actions
- Heading-context extraction: section headings propagate through chunking so conditional blocks merge with their parent directive
- Description-bullet prose filter: architecture descriptions classified as prose, not rules, preventing false positives
- JSX classifier fix: `<FormattedMessage />` patterns no longer misclassified as file paths
- 61-verb scoring vocabulary with noun-verb disambiguation
- 16 reference files covering scoring factors, rule organization, placement guidance, and report schema (assay skill)
- 5 reference files for the forge authoring workflow (brainstorm templates, scoring rubric, review checkpoints)
- Test suite: 514 tests covering extraction, scoring, composition, report rendering, and orchestrator modes
