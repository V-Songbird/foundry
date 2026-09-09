# Ember, the character

Every number here is what the shipped scripts use. The canvas is
`viewBox="0 0 700 300"`, the card is `x=8 y=6 w=684 h=288 rx=18` with the
`#s` drop shadow, the desk is `x=90 y=246 w=540 h=8 rx=4`. Ember stands on the
desk, centred at `x=350`, feet at `y=246`.

## Body

Drawn inside a group translated to `(350 246)` then back, so scale and crouch
pivot at the feet, and the head group pivots at `(350 200)` for the tilt.

```
shadow   ellipse cx=350 cy=247 rx=70 ry=6                      class shadow
body     M296 200 C 292 150, 316 126, 350 126 C 384 126, 408 150, 404 200
         C 402 232, 384 246, 350 246 C 316 246, 298 232, 296 200 Z   class skin
belly    M318 208 C 318 188, 332 178, 350 178 C 368 178, 382 188, 382 208
         C 382 226, 368 236, 350 236 C 332 236, 318 226, 318 208 Z   class belly
blush    circles at (320 192) and (380 192), r=7                  class blush
eyes     ellipses at x=334 and x=366, cy=176, rx=6.5 ry=8.5       class ink
         highlights: circle (x+2.4, 172.5) r=2.3 and (x-2.2, 179) r=1.1, class card
lids     rect x=-9 y=0 w=18 h=21 rx=7 in class skin, scaled from (x 166)
         — scale "1 0" open, "1 1" shut, "1 0.5" half closed for focus
mouth    calm smile  M340 194 q10 9 20 0        (class mouthline)
         big smile   M336 193 q14 14 28 0       (the ending)
         open "o"    ellipse cx=350 cy=197 rx=6 ry=7  (class mouth, chatter only)
         pressed     M338 199 q4 -6 8 0 q4 6 8 0 q4 -6 8 0  (stress, with a 1px tremble)
shut eye M(x-dir*7) 170 l(dir*8) 6 l(-dir*8) 6   — dir 1 for the left eye, -1 right
brow     M(x-dir*9) 156 l(dir*14) 5              — slanted in, stress only
feet     ellipses at (334 246) and (366 246), rx=12 ry=5           class foot
arms     ellipses rx=15 ry=11, based at (318 228) and (382 228), class skin,
         drawn AFTER the keyboard so they sit on the keys
flame    group at (350 134):
         outer  M0 -42 C -18 -26, -20 -10, -6 -2 C -10 -14, 0 -20, 2 -28
                C 8 -18, 16 -12, 8 0 C 22 -8, 22 -26, 0 -42 Z        class flame
         core   M1 -22 C -6 -14, -6 -6, -1 -2 C -2 -8, 2 -12, 3 -16
                C 6 -10, 8 -6, 5 -1 C 10 -6, 8 -16, 1 -22 Z           class flamecore
         wrapped in <g filter="url(#glow)">
keyboard rect x=302 y=224 w=100 h=22 rx=5 (class kb) with two rows of
         7×5 keys, x=310+c*10+r*4, y=229+r*8, class key
```

## Palette

Light theme first, dark theme in the `@media(prefers-color-scheme:dark)`
block. Define every colour in both.

```
emberGrad   radial cx=.4 cy=.3 r=.85   #ffd27a → #f5903f (60%) → #c8542a
flameGrad   linear bottom→top          #ff9a3c → #ffd23f (60%) → #fff2a8
.skin       url(#emberGrad)            .belly  #ffe0a8 at .55 opacity
.foot       #c8542a                    .flamecore #fff6c8 at .9
.blush      #ff7b7b at .35             .mouth  #8a3a3a   .mouthline stroke #8a3a3a 2.5
.eyeline    stroke #0b0b0b 3  (dark: #e6edf3)   — the shut eyes and brows
.sweat      #7cc4ff                    .tick   stroke #c8542a 2 (typing motion ticks)
.card       #fcfcfb / dark #161b22     .ink    #0b0b0b / dark #e6edf3
.desk       #e4e1d8 / dark #2b3038     .shadow #0b0b0b .08 / dark #000 .35
.bub        #f0efeb / dark #2b2b29     (chatter bubbles)
.kb         #4d4d4a / dark #9aa0a6     .key    #8a8a85 / dark #5f6670
.mut        #cfccc3 / dark #4b5563     (log lines, the pile)
glow        feGaussianBlur stdDeviation=4 merged under SourceGraphic
soft        feDropShadow dy=2 stdDeviation=2 at .12 (bubbles, pills, cards)
```

One accent per plugin, used for the pill, the swipe, the tags and the tinted
answer bubble; warm gray `#dcd9d0` (dark `#3d3c37`) stands for "before".

| Plugin | accent light | accent dark | answer tint light / dark |
| --- | --- | --- | --- |
| hush | `#2a78d6` | `#4c9be8` | `#e3eefc` / `#173a63` |
| razor | `#059669` | `#3fb950` | `#e3f2e3` / `#17301f` |
| foreman | `#16a34a` | `#22c55e` | `#e3f2e3` / `#17301f` |

## Text

Bubbles: 14px semibold, `rx=15`, 30 tall, tail toward the speaker. Pills:
16px extra-bold on a 34-tall pill. Box labels and captions: 13px, the floor.
Never smaller. Speech is a paraphrase of what Claude does ("Let me look at the
codebase…"), never a quote from a benchmark.
