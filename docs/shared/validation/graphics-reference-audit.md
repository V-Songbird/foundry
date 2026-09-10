# Graphics reference audit

Reviewed the tracked Foundry tree, including docs, launch material, research drafts, benchmark captures and historical asset directories. Inventory at review: 616 tracked image files; 473 are in explicitly historical source/design/benchmark scopes.

## Corrections

- Hush's retained benchmark page now embeds the maintained flat-ink chart. The original image remains linked at its recorded commit; numbers, prose and limitations are unchanged.
- Thirty image references in six README drafts now resolve to canonical assets within Foundry, not across stale submodule pointers.
- Four Hush/Razor launch PNGs were regenerated from the final recorded demo frames; both themes use the current framing and unchanged code/output text.
- Two legacy Ember entry points now delegate to the current generator. Their original implementations and the old Ember skill instructions are archived unchanged.
- The Ember skill now follows the canonical art guide and C layout. Old design galleries and preview directories are visibly marked historical.

## Intentional historical material

Benchmark records, archived runs, experimental arms, retained source SVGs and v1/v2 design originals are reproducibility evidence. They are not restyled in place. Current docs must embed maintained derivatives and link originals as provenance. External GitHub badges remain external service graphics.

## Checks

Run node scripts/git-hooks/check-graphic-references.js to detect stale first-party raw embeds, references to archived art and missing local graphics in active documentation. This check runs in pre-commit and README CI. Its regression tests cover the reported retained-source case and historical exemptions. Rebuild launch PNGs with node scripts/render-launch-graphics.cjs using the existing Sharp runtime via NODE_PATH.
