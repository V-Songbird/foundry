---
status: accepted
date: 2026-08-06
---

# Below-the-fold graphics use the Bold flat style, marketplace-wide

## Context

ADR 0001 makes the hero a name-as-metaphor poster; ADR 0002 sets the floor every README graphic must meet. Four candidate styles for the remaining graphics — benchmark charts and concept diagrams — were mocked side by side on real data (2026-08-06): Ledger, Blueprint, Bold flat, Ink. The owner picked Bold flat.

## Decision

Every non-hero graphic in every plugin README uses one shared style — **Bold flat**:

- **Marks are chunky rounded pills** on a white card with a soft shadow, generous radius, no gridlines.
- **Comparisons are paired pills**: warm gray (`#dcd9d0`) for the no-plugin baseline, the plugin's accent color for the plugin. Baseline first, plugin under it.
- **Deltas are chips, not axis reads**: pill-shaped, bold, ≥14px — green tint (`#e3f2e3` / `#0a6b0a`) only when the plugin wins, neutral gray tint otherwise. Losses keep their chips; honesty stays visible.
- **Labels are 15px+ semibold**, titles ~20px extra-bold, subtitles muted. Identifiers and code tokens stay monospace.
- **Concept diagrams** (foreman's paper trail) use numbered accent circles in rounded tinted step cards, the terminal step highlighted.
- **One accent per plugin** — hush blue, razor green, foreman green — used only for that plugin's own marks.
- ADR 0002 still governs: real data from benchmark records, 13px floor, both themes, drop marks before shrinking type. [ADR 0009](0009-public-research-and-evidence.md) governs evidence publication.

The style is deliberately distinct from the hero poster (dark, metaphor-led) so the two never compete on one page.

## Status

Marketplace-wide standard. New plugins adopt it from their first release; changing it requires a superseding ADR.

Correction, 2026-08-18: nothing in Consequences is outstanding. `bench-cost.svg`, `bench-narration.svg` and `bench-offcut.svg` no longer exist; `hush/assets/bench-cuts.svg` is the surviving hush chart in this style. `razor/assets/bench-supplychain.svg` (razor 2b2cc52) and `foreman/assets/paper-trail.svg` (foreman 6359db2) were both redrawn in this style on 2026-08-06. This line supersedes the earlier same-day correction, which wrongly called those two outstanding and named the hero poster as a Bold flat replacement.

## Consequences

- The rebuilds ADR 0002 already schedules (`bench-cost.svg`, `bench-narration.svg`, `bench-offcut.svg`, `bench-supplychain.svg`, `paper-trail.svg`) land in this style.
- Reference mock: the four-style comparison page from the 2026-08-06 design session (Bold flat section).
