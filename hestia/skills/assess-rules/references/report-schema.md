# Report Schema Reference

Output format specifications for the quality audit. Referenced by Phase 3 of the assess-rules skill.

The full schema — markdown report template, --fix mode diff format, and JSON output schema with all field definitions — mirrors the rulesense report-schema.md exactly, with two namespace changes:

- `.rulesense-tmp/` → `.hestia-tmp/` in all path references
- `.rulesense-ignore` → `.hestia-ignore` in the excluded-rules note

All field definitions, grade intervals (A ≥ 0.80, B ≥ 0.65, C ≥ 0.50, D ≥ 0.35, F < 0.35), precision rules (3 decimal JSON / 2 decimal markdown), and schema_version ("0.1") are unchanged.

The `effective_corpus_quality` headline metric, `corpus_quality` diagnostic, `guideline_quality` line item, and `hook_opportunities` parallel signal are all present in the output with identical semantics.

For the full template text, consult the rulesense source at `rulesense/skills/assay/references/report-schema.md` — the hestia pipeline scripts produce identical JSON and markdown structures.

## Counted facts, no counterfactual (honesty boundary)

The report states COUNTED facts only — tallies actually observed in the corpus ("9 rules scored across 2 files", "3 grade D/F", "1 conflict candidate"). It MUST NEVER claim a counterfactual impact such as "fixing these would improve setup health 40%": there is no baseline for the un-fixed alternative, so any such number is fabricated. The health score shown (`effective_corpus_quality`) is a transparent, count-derived index whose components are listed inline (and in `--verbose`); it is the *current* structural-clarity reading, not a before/after improvement claim. Both the JSON (`limits`) and the markdown ("Limits — what this run could not check" section) carry this boundary, and the rendered disclaimer states that counts are observed tallies, not impact estimates.
