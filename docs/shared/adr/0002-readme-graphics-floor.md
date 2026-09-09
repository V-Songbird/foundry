---
status: accepted (publication governed by ADR 0009)
date: 2026-08-06
---

# Every README graphic renders real data at readable size

## Context

ADR 0001 fixes the hero slot. The charts below the fold share the original problem: `hush/assets/bench-cost.svg` sets 10–11px type on a 940px canvas that GitHub squeezes to 700px — roughly 8px effective. Its data is real; its rendering is not glanceable. This ADR extends the standard to every graphic a plugin README ships.

## Decision

Every graphic in a plugin README — hero, benchmark chart, concept diagram — meets all four:

1. **Real data only.** Marks are plotted from committed benchmark records. Concept diagrams (foreman's paper trail) carry no fabricated figures. Staged terminals, invented transcripts, and "representative" shapes never ship.
2. **A 13px floor.** No text below ~13px effective at 700px render width. Practically: author at 700–720px viewBox width and never below 13px, or scale the floor up with the canvas. SVG `<title>` tooltips don't count as labels — GitHub readers rarely find them.
3. **Both themes.** Light and dark via `prefers-color-scheme`, both deliberate — no gray-on-gray fallbacks.
4. **Fewer marks over smaller type.** When density and the floor collide, drop marks, aggregate, or split the chart. The type never shrinks to fit. Big direct deltas ("−18%") beat axis-reading.

The honest-losses rule stands unchanged: charts keep the segments where a plugin costs more.

## Status

ADR 0004 previously made records local. [ADR 0009](0009-public-research-and-evidence.md) now governs publication of retained evidence; real data remains required.

Correction, 2026-08-18: nothing in Consequences is outstanding. Three of the assets it names no longer exist — `hush/assets/bench-cost.svg` and `bench-narration.svg` were replaced by `hush/assets/hero.svg` and `bench-cuts.svg`, and `razor/assets/bench-offcut.svg` is gone. `razor/assets/bench-supplychain.svg` and `foreman/assets/paper-trail.svg` do still exist and were audited on this date: both clear the 13px floor at their 700px viewBox.

## Consequences

- `hush/assets/bench-cost.svg` and `bench-narration.svg` are out of conformance on the floor and get rebuilt to it. `razor/assets/bench-offcut.svg` (9.5px task labels) likewise. `bench-supplychain.svg` and `foreman/assets/paper-trail.svg` are close but audit against the floor before next release.
- Rebuilds regenerate from the committed records — never redrawn by eye from the old image.
