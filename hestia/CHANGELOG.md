# Changelog

All notable changes to Hestia are documented here. Versions are owned by the marketplace manifest, not `plugin.json`.

## [1.0.2-beta] — 2026-06-27

### Changed — sharper lean doctrine (token reduction)
- **Response shape rule:** "one line max — what was skipped and when it matters." Replaces the vague "a few short lines" with a concrete ceiling.
- **No-defense rule:** never explain why you made something simple. The urge to justify a short solution is the bug — cut it.
- **Inline ceiling comments:** `// lean: <what this skips> — upgrade when <trigger>` marks deliberate simplifications at the site in code. Distinct from `hestia:later` (scope drift) — a ceiling comment stays with the code; `hestia:later` parks work the current task doesn't own.

## [1.0.1-beta] — 2026-06-27

### Changed — smarter truth-grounding in `/hestia:prepare`
- **YAGNI gate (Step 4):** before proposing Skills or Rules, prepare now checks whether a real gap exists. If training knowledge plus the gathered sources show no significant gaps, it skips artifact creation and notes the self-assessment is available in conversation — no noise for domains Claude already knows well.
- **Knowledge folder (Step 3):** GitHub repository URLs are now cloned shallow (`git clone --depth 1`) into `./knowledge/<lib-name>/` so the source is navigable on disk. Documentation and non-repo URLs stay as `WebFetch`.
- **Pointer-index Skills (Step 5):** Skills are now authored as pointer-indexes — each entry names a concept, states its constraint in one line, and points to a `./knowledge/<lib>/path:line` location in the cloned source. Claude reads the file directly when it needs depth. Narrative summaries are no longer written, eliminating the telephone-game distortion where source → Claude summary → skill adds two lossy hops.

## [1.0.0-beta] — 2026-06-27

First feature-complete, dogfooded release. All six pillars built, conformed to the official Claude Code spec, and hardened with an evidence-driven epistemics layer. Both interactive flows (`/hestia:checkup`, `/hestia:assess-rules`) were driven end-to-end as a live session — including the human F3/F8 judgment loop — before this promotion.

### Added — epistemics upgrade (evidence-driven)
- Finding contract: cite-or-drop (every finding must point at a `file:line` or it is dropped), triple-shape (symptom / why / fix), honest-limits ("what this run could not check"), counted-facts-only (no fabricated impact %).
- Folklore check: `/hestia:assess-rules` classifies every rule as enforceable / observable / folklore and flags unenforceable rules for rewrite-or-delete.
- Staleness-as-honesty: checkup/freshness derive a fresh/aging/stale label from cheap signals instead of storing a grade; cleared surfaces are recorded so repeat runs skip unchanged inputs.
- Lean + measurable injection: SubagentStart receives only the build-governing standing orders (~30% smaller); a confirm/dispute ledger makes the standing orders self-auditing.
- `hestia:later <what> — revisit when <trigger>`; debt flags trigger-less markers as silent-rot risk.
- Verify-the-detector: every probe has a known-bad fixture proving it fires.

### Changed — spec conformance
- Rules engine now parses rule frontmatter (`paths:` canonical; `globs:` legacy alias), making the F4 load-trigger factor live; recursive discovery of nested rules/commands; `@`-import resolution; `CLAUDE.local.md` and opt-in `~/.claude` user scope.
- Corrected the docs Hestia teaches (the `Setup` hook event, `@`-import depth, `disallowed-tools`, `PreToolUse` enforcement framing); subagent frontmatter keys (`tools:`/`skills:`).
- Curse-of-Knowledge framing for `prepare` + truth-grounding standing order.

### Fixed
- Numerous engine + skill-contract fixes found by an 11-agent docs audit and a live dogfood (the `--build-analysis` mode, `examples.json` regex, drift worktree noise, the `.hestia-tmp` same-directory rule, and more).

### Status
- 561 tests passing; manifest clean. Beta = feature-complete and dogfooded; real-world mileage across diverse projects earns the stable `1.0.0`.

## [0.1.0-alpha] — 2026-06-27

Initial scaffold. Hestia consolidates the `rulesense` and `scriptorium` plugins and the planned `virgil` freshness scope into a single setup-health toolbox.

### Added
- Flagship front door: `/hestia:checkup` — prioritized plain-language audit of CLAUDE.md, rules, agents, skills, hooks, commands
- Minimalism pillar: always-on lean doctrine (SessionStart hook), `/hestia:lean` mode control, `/hestia:lean-review`, `/hestia:lean-audit`, `/hestia:debt`
- Freshness watch: SessionStart nudge hook (throttled, signature-based), `/hestia:freshness` full staleness scan
- Rules engine: full 8-factor quality model (F1/F2/F3/F4/F7/F8) — `/hestia:assess-rules`, `/hestia:author-rules`, `/hestia:format-rules`, `/hestia:primer`
- Authoring pillar: `/hestia:scribe` (8-item pre-completion checklist), `proofreader` agent (13-item checklist, read-only), `/hestia:proofread`, `/hestia:run-tests`
- Plugin manifest and marketplace registration.
- Project scaffold: shared script library, setup-discovery module, state/coordination namespaces (`.hestia/`, `.hestia-tmp/`).
- All scripts stdlib-only; Python 3.10+; inter-script JSON contract

### Supersedes
- `rulesense` v1.x — rule quality capabilities moved to `/hestia:assess-rules`
- `scriptorium` — authoring + proofreader moved to `/hestia:scribe` and `/hestia:proofread`
- `virgil` (planned, never shipped) — staleness detection absorbed into freshness pillar

### Notes
- Read-only posture for all audit and watch surfaces; authoring/format skills write only on direct invocation behind approval gates.
- Build is phased — see the project plan for the full task breakdown.
