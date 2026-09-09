---
status: accepted (publication governed by ADR 0009; same-records clause by ADR 0005)
date: 2026-08-06
---

# README hero graphics are posters, and the metaphor is the plugin's name

## Context

Each plugin README leads with a benchmark chart rendered as an inline SVG. Those charts set 10–13px type on a 940px canvas that GitHub squeezes to 700px — roughly 8px effective. Visitors who skim never get the point. Four design directions were mocked at real README width (2026-08-06); the owner picked the poster pattern and declared it a standing requirement.

## Decision

Every plugin's hero slot — the graphic directly under the logo and tagline — is a **poster**:

- **The metaphor is the plugin's name made visual.** hush: a loud waveform that flatlines. razor: an edge that cuts the excess away. foreman: one id walking the paper trail. A new plugin must find the image inside its own name before it ships a hero.
- **One image, one phrase, at most one number.** The phrase is short ("Quiet." / "279 lines never shipped."). The number must come from committed benchmark records — never invented, never projected.
- **The image is plotted from those same records — never hand-drawn.** The metaphor picks the form; the data draws it. hush's waveform is the actual per-run word counts. razor's edge sits at the level the real runs land. A stand-in shape that "looks like" the result is prohibited: it may showcase usage the plugin never produced.
- **Type reads at thumbnail size.** Nothing in the poster below ~13px effective at 700px render width. If a label needs squinting, it moves out of the poster.
- **Dark-first art ships with a light twin.** Same mechanism the current assets use: `prefers-color-scheme` inside the SVG, both modes deliberate.
- **The poster replaces only the hero.** The detailed, honest benchmark charts — including the losses — stay in the Benchmarks section below the fold.

## Status

ADR 0004 previously made records local. [ADR 0009](0009-public-research-and-evidence.md) now governs publication of retained evidence; real data remains required.

The requirement that the poster plot *the same* records the Benchmarks section cites is superseded by ADR 0005 (2026-08-18) — a poster may plot a retired run when the caption names the difference. Plotting real records is unchanged.

This is a permanent house rule, not a preference. Reverting or diluting the poster pattern requires an explicit owner decision recorded as a superseding ADR.

## Consequences

- Hero redesigns for hush, razor, and foreman replace `bench-narration.svg`, `bench-offcut.svg`, and add a foreman hero; the current data-dense SVGs move to (or stay in) the Benchmarks section.
- Poster artwork is generated from real retained records; regenerating a benchmark regenerates the poster. Per ADR 0005, the poster's records need not be the ones the Benchmarks section cites, but the caption must name any difference.
- New plugins carry this requirement from their first release.
