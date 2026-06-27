# Report Schema Reference

Output format specifications for the quality audit. Referenced by Phase 3 of the assess-rules skill.

The full schema — markdown report template, --fix mode diff format, and JSON output schema with all field definitions — mirrors the rulesense report-schema.md exactly, with two namespace changes:

- `.rulesense-tmp/` → `.hestia-tmp/` in all path references
- `.rulesense-ignore` → `.hestia-ignore` in the excluded-rules note

All field definitions, grade intervals (A ≥ 0.80, B ≥ 0.65, C ≥ 0.50, D ≥ 0.35, F < 0.35), precision rules (3 decimal JSON / 2 decimal markdown), and schema_version ("0.1") are unchanged.

The `effective_corpus_quality` headline metric, `corpus_quality` diagnostic, `guideline_quality` line item, and `hook_opportunities` parallel signal are all present in the output with identical semantics.

For the full template text, consult the rulesense source at `rulesense/skills/assay/references/report-schema.md` — the hestia pipeline scripts produce identical JSON and markdown structures.
