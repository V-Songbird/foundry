---
name: ember
description: Draws or fixes an Ember scene — the Foundry mascot's animated SVG at `<plugin>/assets/mascot.svg`, authored by a `docs/<plugin>/launch/assets/ember-<plugin>.js` script as pure SMIL on a 14 s loop. Use when the user asks to draw, change, or fix a mascot cartoon, an Ember scene, the README animation, or a mascot for a new plugin — e.g. "give X a mascot", "Ember's mouth looks wrong", "make an Ember scene for the launch post". Do NOT use for the data replays (`assets/demo.svg`, drawn by each harness's `runner/demo.js`) or the hero posters — only for Ember.
---

# Ember

Ember is the Foundry mascot: a round orange blob with a small flame on its
head. The flame is its mood. Wild while Claude misbehaves, a small steady glow
once the plugin has done its job. Original, drawn from scratch, never
Anthropic's mascot, never a real animal. The owner approved the character and
all three scenes on 2026-09-05; after that, a change to a mascot is a new ask,
not a fix.

The rules come from `docs/shared/adr/0006-readme-mascot-cartoon.md` (local, never
committed). In short: one mascot per README, directly under the `> **TL;DR**`
block and above the data replay; a feeling, never a fact — no numbers, no
quoted benchmark output; pure SVG with SMIL, because a GitHub README `<img>`
runs no script; both themes via `prefers-color-scheme`; no text under 13px.

## What exists

| Plugin | Scene | Script |
| --- | --- | --- |
| hush | chatter bubbles and a log pile, the blue `hush` pill, a paw to the mouth, calm typing, a note in hush's shape | `docs/hush/launch/assets/ember-hush.js` |
| razor | a tower of extra boxes, the green `razor` pill, one swipe, the package leaves with a red cross, a YAGNI tag | `docs/razor/launch/assets/ember-razor.js` |
| foreman | a paper storm and the persevering face, the green `Foreman` pill, papers gather into one list, three ticks | `docs/foreman/launch/assets/ember-foreman.js` |

Each script writes the SVG; the SVG is the artifact and ships as
`<plugin>/assets/mascot.svg`. The scripts, the character sheet
`docs/shared/launch/assets/concepts.svg`, and this skill are local-only. Nothing a
plugin runs depends on them.

## How to make a scene

1. Read [character.md](character.md) for the body, palette and accents, and
   [animation.md](animation.md) for the timeline, the helpers and the traps.
2. Copy the closest `docs/<plugin>/launch/assets/ember-<plugin>.js` to a new script.
   Keep the body block and the helpers; change only the scene around Ember.
   Every scene keeps the same beats on the 14 s clock, so the three read as one
   family.
3. Follow [workflow.md](workflow.md): build to a scratch path, run the timing
   check, parse the XML, preview both themes, then ship and release.

## What the owner has already said

- Each scene must show the plugin's actual mechanism, not just a mood. hush
  ends on a note in hush's own shape. razor stamps the refused package and tags
  what stays with `YAGNI`. Foreman turns the papers into a list and ticks it.
- Stress is a held face, not a flicker. The persevering face: eyes squeezed
  shut, brows slanted in, a pressed squiggle mouth with a one-pixel tremble.
- The flame reads the mood even in a still frame. Keep it large and glowing
  while things go wrong, small and steady after.
- No rival's name anywhere in a scene or a script. Names of rivals live only in
  a plugin's README.
