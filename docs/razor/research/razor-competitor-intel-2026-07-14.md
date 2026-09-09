# razor × competitor intelligence — surviving findings from the 2026-07-14 sweep

> **Status 2026-08-18 — HISTORICAL, two claims dead.** The search meter named here as a
> differentiator was deleted in razor 1.0.0. The dependency-guard/wrapper interaction listed as
> unresolved was verified closed the same week; the finding is written into `dep-guard.js` above
> `parseInstallCommand`. R1 and R2 both shipped. Nothing in this file is open work.

**Date:** 2026-07-14 · **Competitor clones:** `D:\Projects\Knowledge\{token-goat, token-optimizer, RDXmin, headroom}` · **Companion:** `docs/hush/research/hush-competitor-intel-2026-07-13.md` covers the same four clones from hush's compression/dedup angle; this file is the razor angle only.

This file preserves the razor-relevant findings from that sweep after the original combined report was trimmed out of this repo's research notes (an identical copy of the full original is kept in the sibling repo this repo split off from). Nothing plugin-specific beyond razor is repeated here.

## Headline finding: RDXmin's ladder is a near-verbatim twin of razor's RULESET

RDXmin's `skills/rdx/SKILL.md` "Efficiency Ladder" matches razor's ladder rung-for-rung: same 7 rungs in the same order (YAGNI skip-and-say-so → codebase reuse → stdlib → platform → installed dep, "never add a new dep for what a few lines can do" → one line → minimum code that works), "stop at the first rung that holds," root-cause-not-symptom bug framing, the same never-cut carve-out (trust-boundary validation, data-loss error handling, security, accessibility, explicit requests), and even a matching marker-comment convention (`// rdx:` vs razor's `// razor:`). MIT license, so no legal exposure either way; direction of influence undetermined (RDXmin's repo is young; razor's ladder predates its public README refresh).

**Strategic read: the ladder text is commodity now.** Razor's defensible moat is the six mechanical gates — RDXmin ships zero enforcement, prose only — plus the evidence-bearing deny messages and the benchmark rigor, not the wording of the ladder itself.

## Market-gap findings (across all four clones)

- **Unused-dependency detection existed nowhere** in the four repos — this evidence is what the now-shipped `/razor:unused` skill was built to fill.
- **Search-efficiency meters: nothing mechanical anywhere else** — razor's search-meter is still unique in the market.

## Open technical risk, unresolved: hush-wrapper interaction with razor's dep-guard

Under `bypassPermissions`/`HUSH_WRAP=1`, hush's exit-code-preserving wrapper rewrites install commands (e.g. PowerShell `& { npm install axios } 2>&1 | Out-String -Width 4096` + trailer). If a hook ever receives that rewritten form instead of the original `tool_input`, razor dep-guard's `parseSegment` won't recognize the leading `& {` and the install gate would silently stop firing — exactly in the bypassPermissions environment the benchmark harness uses. No benchmark to date carried install-bait, so this interaction is still untested. Fix if the risk proves real: strip a leading `& {` / matching trailing `}` and trailing `2>&1 | Out-String…`-style pipe tails in `parseSegment`, the same way it already strips redirects.

## Refused ideas (razor axis) — do not re-propose without new evidence

- Symbol-index/graph analyses (token-goat's `dead` / `coverage-gaps` / `impact` / `arch`) as razor features — needs a persistent machine-wide index/daemon, a different product; razor is hook-only by charter.
- token-optimizer's behavioral detectors (retry_churn / cascade / looping / output_waste) as razor gates — retrospective, report-only, hardcoded token guesstimates; razor's live gates already cover the real-time cases.
- Per-turn ladder reminder (RDXmin, ~40 tok/turn) — razor injects at session boundaries by design; per-turn prose is recurring cost with no measured benefit.
- Hint-efficacy auto-suppression for razor's gates (token-goat's hint_stats pattern) — razor's gates are ask-once-retry-passes with benchmark-validated efficacy (0% needless-deps); "did the deny change the approach" isn't mechanically attributable, and suppression would silently disable a proven guard.
- MEMORY.md/CLAUDE.md/skill-bloat structural audits (token-optimizer's angle) — different product axis (config hygiene); razor stays code-leanness only.

## Validations of razor's existing choices

- RDXmin ships razor's ladder as prose with zero enforcement; nobody in the four clones has install/manifest/import gates at all.
- Razor's evidence-bearing denies (listing actually-installed deps) exceed anything found in the market; token-goat's denies instruct, razor's denies prove.
- Razor's "no `model` field in hook input" reading is independently corroborated — token-goat suppresses per-(category, harness) explicitly because the payload has no model field.
