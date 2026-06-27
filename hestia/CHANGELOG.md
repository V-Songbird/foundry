# Changelog

All notable changes to Hestia are documented here. Versions are owned by the marketplace manifest, not `plugin.json`.

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
