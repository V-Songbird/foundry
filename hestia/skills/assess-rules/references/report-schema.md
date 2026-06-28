# Report Schema Reference

Output format specifications for the quality audit. Referenced by Phase 3 of the assess-rules skill.

The full schema — markdown report template, --fix mode diff format, and JSON output schema with all field definitions — mirrors the rulesense report-schema.md exactly, with two namespace changes:

- `.rulesense-tmp/` → `.hestia-tmp/` in all path references
- `.rulesense-ignore` → `.hestia-ignore` in the excluded-rules note

All field definitions, grade intervals (A ≥ 0.80, B ≥ 0.65, C ≥ 0.50, D ≥ 0.35, F < 0.35), precision rules (3 decimal JSON / 2 decimal markdown), and schema_version ("0.1") are unchanged.

The `effective_corpus_quality` headline metric, `corpus_quality` diagnostic, `guideline_quality` line item, and `hook_opportunities` parallel signal are all present in the output with identical semantics.

For the full template text, consult the rulesense source at `rulesense/skills/assay/references/report-schema.md` — the hestia pipeline scripts produce identical JSON and markdown structures.

## Enforceability dimension (folklore check)

In addition to the fields above, the audit JSON carries the enforceability dimension (the "folklore check") — a classification orthogonal to the composite clarity score. See `quality-model.md` § "Enforceability Dimension" for the full model.

JSON additions:

- `rules[].enforceability` — per-rule `{class, evidence, concrete_markers, quality_words, rationale}` where `class ∈ {enforceable, observable, folklore}`. `evidence` lists the matched token(s) that drove the verdict (evidence-driven: a folklore rule always carries the unverifiable word that flagged it).
- `enforceability_counts` — `{enforceable, observable, folklore}` integer tally (counted facts only — observed counts, not impact estimates).
- `folklore_findings` — a list of cited triple-shape findings (Finding contract), one per folklore rule that has a `file` locator (cite-or-drop; locator-less folklore rules are dropped, not emitted). Each carries `symptom` / `why` / `fix_action`, a `location`, `tags` (`folklore` + `quality-word:<word>` per matched word), and the inline `text` / `rule_id` / `quality_words` for the report drill-down.

Markdown addition: a "Folklore rules (rewrite or delete)" section renders when `folklore_findings` is non-empty — a digest count, the enforceability mix, a per-rule table citing each `file:line` and the unverifiable word(s), and the shared why/fix_action drill-down. The section is omitted entirely when there are no folklore rules (an empty result is still stated in the `enforceability` limit note, never silently).

## Counted facts, no counterfactual (honesty boundary)

The report states COUNTED facts only — tallies actually observed in the corpus ("9 rules scored across 2 files", "3 grade D/F", "1 conflict candidate"). It MUST NEVER claim a counterfactual impact such as "fixing these would improve setup health 40%": there is no baseline for the un-fixed alternative, so any such number is fabricated. The health score shown (`effective_corpus_quality`) is a transparent, count-derived index whose components are listed inline (and in `--verbose`); it is the *current* structural-clarity reading, not a before/after improvement claim. Both the JSON (`limits`) and the markdown ("Limits — what this run could not check" section) carry this boundary, and the rendered disclaimer states that counts are observed tallies, not impact estimates.
