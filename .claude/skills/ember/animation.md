# Animating Ember

Pure SMIL: `<animate>` and `<animateTransform>` with `calcMode="spline"`.
No CSS animation, no script — a GitHub README `<img>` runs neither. One
loop of `DUR = 14` seconds, `repeatCount="indefinite"`.

## The helpers every script carries

```js
const DUR = 14;
const k = (t) => (t / DUR).toFixed(4);            // seconds -> keyTime
const EASE = '0.45 0 0.55 1';   // power2.inOut, the default
const OUT  = '0.22 1 0.36 1';   // power3.out, arrivals and taps
const BACK = '0.34 1.56 0.64 1';// back.out(1.7), pops and the pill drop
const LIN  = '0 0 1 1';         // opacity only
anim(attr, [[t, value], ...], { type?, ease? })   // one <animate> or <animateTransform>
part(x, y, [layer, ...], body)                    // base translate, one <g> per animated layer
wave(t0, t1, step, a, b)                          // square wave between two values
closeLoop(keys)                                   // adds [DUR, first value] if the loop is short
show(t0, t1?)                                     // opacity fade in at t0, out at t1
bubble(x, y, w, text, t0, t1?, cls, tcls, tailRight)
```

`anim` builds `values`, `keyTimes` and one `keySplines` per segment. The
timing check in [workflow.md](workflow.md) enforces what SMIL needs: keyTimes
sorted from 0 to 1, values count equal to keyTimes count, keySplines count one
less. A list that ends before 14 s is a loop that snaps; `closeLoop` fixes it.

## The one rule that bit

A non-additive `animateTransform` **replaces** the element's `transform`
attribute. A group with `transform="translate(…)"` and a rotate animation on
the same element renders at the origin. `part()` exists so this never happens:
the base translate sits on an outer `<g>`, and each animated layer is its own
nested `<g>` with nothing else on it. Never put an animation on an element that
carries a base transform.

## The timeline, shared by all three scenes

| seconds | beat |
| --- | --- |
| 0 – 5.1 | trouble: chatter, the tower, the paper storm. Flame wild (`flameScale` between `1.35 1.6` and `1.05 1.15` every 0.15 s, `flameRot` ±16° every 0.1 s). Arms tap every 0.12 s. Bubbles pop at 0.6, 1.9, 3.1 and fade at 5.1. |
| 5.0 – 5.4 | the pill drops with `BACK` from `0 -90` to `0 0`, then a squash `1.14 0.86` at 5.45 back to `1 1` at 5.7. Pills sit at `(560 44)`. |
| 5.15 – 5.55 | anticipation: the whole body crouches `1.05 0.93` at 5.3. |
| 5.6 – 6.9 | the gesture: hush's paw to the mouth (`-34 -30`), razor's swipe (6.3 – 6.8, a 210-unit dash drawn with `stroke-dashoffset`), Foreman's papers sliding into the list (6.4 – 7.0). Flame settles to `0.6 0.55` at 5.7. |
| 7.0 – 11.3 | calm: lids at `1 0.5` from 7.4, taps every 0.3 s, flame rocking ±3° every 0.8 s. |
| 11.4 | the ending pops in with `BACK`: hush's note, razor's bubble, Foreman's pointing arm and bubble. Smile grows to the big one at 11.7. Flame pops `1.05 1.1` then rests at `0.9 0.9`. |
| 12 – 14 | hold, so the ending can be read. |

Idle motion runs under everything so Ember never looks dead: breathe
`1 1` ↔ `1 1.02` every 1.75 s from the feet, head tilt ±1.5° every 2 s, blinks
at fixed seconds (`2.1, 4.4, 6.0, 8.3, 10.2, 12.6` — 70 ms shut, 90 ms open).
During stress the tilt becomes a ±4° wobble every 0.25 s and sweat drops fly
off at 1.6, 3.2, 4.6.

## Faces

- Chatter: the "o" mouth toggles with the smile every 0.17 s; eyes open.
- Stress (Foreman): the persevering face, held. Eyes shut as `>` `<` strokes,
  brows slanted in, the pressed squiggle with a one-pixel tremble every 0.15 s.
  A mouth that flickers between shapes was rejected by the owner.
- Focus: lids at half, `1 0.5`.
- Ending: big smile, eyes open, flame small and glowing.

## Scene furniture

- Bubbles: `bubble()`; tail on the right for the chatter stack on the left of
  Ember, `tailRight=false` for a bubble on Ember's right.
- The log pile (hush): nine `.mut` bars sliding in from the right at
  `x=520`, 11 apart, every 0.38 s from 1.2 s, gone at 5.3.
- The tower (razor): boxes 18 apart from `y=232` up, `BACK` drop 60 units, all
  but the first swept `90 -20` at 6.5; the package box carries the red cross
  (`.no` `#e0653f`, `.nox` white 2.5). The `YAGNI` pill pops at 7.1.
- The storm (Foreman): nine sheets `32×40 rx=3` with three `.sheetline` rules,
  falling 0.9 s each from 0.5 s in 0.5 s steps, sliding to the list card at
  `(560 150)` from 6.4 to 7.0; the card pops at 6.6, ticks at 8.0, 9.1, 10.2.
- Sheets and cards need real contrast on the near-white card: `#f4f1e8` with a
  `#b8b4a8` stroke, dark `#3a3f47` with `#6b7280`. Pure white vanishes.

## Traps already paid for

- Two `const` with the same name in one script (`drop` for a sweat drop and
  for the pill) is a SyntaxError that only shows when the script runs.
- `sed` or Python rewrites with backslashes inside template strings mangle
  `\n` and `\s`; patch with a script that reads and writes the file, or edit
  by hand.
- `keyTimes` must start at exactly `0` and end at exactly `1`; a loop built
  with a step that does not divide 14 needs `closeLoop`.
- The `<img>` version is what GitHub shows; an inline `<svg>` in a test page
  may report `getCurrentTime() === 0` under the Browser pane and mislead you.
