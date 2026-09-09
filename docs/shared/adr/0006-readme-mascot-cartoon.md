---
status: accepted
date: 2026-09-05
---

# One mascot cartoon per README, beside the data replay

## Context

ADR 0002 makes every README graphic real plotted data. That rule bought trust
and it stays. But the two plugins that grew to 100k and 27k stars grew on a
feeling a stranger could share in one glance, not on a chart. On 2026-09-05
the owner decided each README also carries one short cartoon: a mascot living
the plugin's before-and-after. The data replay (ADR 0002) and the hero poster
(ADR 0001) stay exactly as they are; the cartoon is added, not swapped in.

## Decision

Each plugin README may carry **one** mascot cartoon, under these rules:

1. **Original character.** The mascot is Foundry's own: **Ember**, a round
   orange blob with a small flame on its head, drawn from scratch and picked
   by the owner on 2026-09-05 over a songbird and a cat. The flame is its
   mood — wild when Claude is loud or careless, a small steady glow when the
   plugin has done its job. Never Anthropic's pixel mascot, its logo, or a
   look-alike of any other project's character; not a real animal either.
2. **It shows a feeling, never a fact.** No numbers, no quoted output, no
   claim the replay or the numbers section does not already make. Speech
   bubbles may paraphrase what Claude does ("Let me look at the codebase…");
   they do not quote a benchmark.
3. **Pure SVG.** SMIL or CSS animation only, because a GitHub README `<img>`
   runs no script. Both themes via `prefers-color-scheme`. Any text in it
   clears the 13px floor from ADR 0002. Loops, with a hold on the last frame
   long enough to read.
4. **Placement.** Directly under the `> **TL;DR**` block, above the data
   replay. Emotion first, proof second. The hero poster stays at the top.
5. **Hand-drawn is allowed here and only here.** ADR 0002's "real data only"
   clause does not apply to this one asset. Every other graphic on the page
   still obeys it.
6. **One accent per plugin** (ADR 0003) carries over: hush blue, razor green,
   foreman green, warm gray for "before".

## Status

Accepted 2026-09-05. Supersedes ADR 0002's clause 1 for exactly one asset per
README, `assets/mascot.svg`. Nothing else in 0001–0005 changes.

## Consequences

- Shipped 2026-09-05: `hush/assets/mascot.svg` (1.11.4), `razor/assets/mascot.svg`
  (1.5.7), `foreman/assets/mascot.svg` (2.5.5). Same body, three scenes: hush
  is chatter then shh; razor is a tower of extras then one swipe; foreman is a
  paper storm then one list ticked off.
- The cartoon is the shareable asset for posts; a PNG of its last frame goes
  with the replay PNGs under `docs/launch/png/`.
- Each SVG is authored through a small local script under
  `docs/launch/mascot/` that only keeps the SMIL timing lists consistent; the
  drawing is by hand. Nothing of that ships, and no plugin needs it.
