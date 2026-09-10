'use strict';
// Authoring helper for hush/assets/mascot.svg — Ember, the Foundry blob, at a
// keyboard: typing like mad and narrating every step, flame tuft going wild;
// then hush drops in, a paw to the mouth, and quiet focus with a calm flame
// and one clean line. Pure SMIL so a GitHub README <img> plays it. The SVG is
// the artifact; this script keeps the timing arithmetic honest.
const fs = require('node:fs');
const path = require('node:path');

const DUR = 14;
const k = (t) => (t / DUR).toFixed(4);
const EASE = '0.45 0 0.55 1';          // power2.inOut
const OUT = '0.22 1 0.36 1';           // power3.out, soft landing
const BACK = '0.34 1.56 0.64 1';       // back.out(1.7), playful overshoot
const LIN = '0 0 1 1';
const splines = (n, s) => Array.from({ length: n }, () => s).join(';');

function anim(attr, keys, opts = {}) {
  const times = keys.map(([t]) => k(t)).join(';');
  const values = keys.map(([, v]) => v).join(';');
  const type = opts.type ? ` type="${opts.type}"` : '';
  const tag = opts.type ? 'animateTransform' : 'animate';
  return `<${tag} attributeName="${attr}"${type} values="${values}" keyTimes="${times}" calcMode="spline" keySplines="${splines(keys.length - 1, opts.ease || EASE)}" dur="${DUR}s" repeatCount="indefinite"/>`;
}
// A part with a base translate and animated transform layers, each on its own
// <g>, because a non-additive animateTransform replaces the attribute it targets.
const part = (x, y, layers, body) => `<g transform="translate(${x} ${y})">${layers.map((l) => `<g>${l}`).join('')}${body}${'</g>'.repeat(layers.length)}</g>`;
const closeLoop = (keys) => { if (keys[keys.length - 1][0] < DUR) keys.push([DUR, keys[0][1]]); return keys; };
const fadeKeys = (t0, t1) => t1 == null
  ? [[0, 0], [t0, 0], [t0 + 0.3, 1], [DUR, 1]]
  : [[0, 0], [t0, 0], [t0 + 0.3, 1], [t1, 1], [t1 + 0.35, 0], [DUR, 0]];
const show = (t0, t1) => anim('opacity', fadeKeys(t0, t1), { ease: LIN });
function wave(t0, t1, step, a, b) {
  const keys = [];
  let flip = false;
  for (let t = t0; t < t1; t += step) { keys.push([Number(t.toFixed(3)), flip ? b : a]); flip = !flip; }
  return keys;
}

function bubble(x, y, w, text, t0, t1, cls = 'bub', tcls = 'ink', tailRight = true) {
  const pop = [[0, '0.85'], [t0, '0.85'], [t0 + 0.35, '1'], [DUR, '1']];
  const cx = x + w / 2, cy = y + 15;
  const tail = tailRight ? `M${x + w - 34} ${y + 28} l-4 13 l16 -11 z` : `M${x + 24} ${y + 28} l-7 13 l18 -11 z`;
  return `<g opacity="0">${show(t0, t1)}${part(cx, cy, [anim('transform', pop, { type: 'scale', ease: BACK })],
    `<g transform="translate(${-cx} ${-cy})"><rect class="${cls}" x="${x}" y="${y}" width="${w}" height="30" rx="15" filter="url(#soft)"/>`
    + `<path class="${cls}" d="${tail}"/>`
    + `<text class="${tcls}" x="${cx}" y="${y + 20}" font-size="14" font-weight="600" text-anchor="middle">${text}</text></g>`)}</g>`;
}

// ---- chatter -------------------------------------------------------------------
const bubbles = [
  bubble(44, 34, 236, 'Let me look at the codebase…', 0.6, 5.1),
  bubble(68, 72, 232, 'Now I\'ll check the config…', 1.9, 5.1),
  bubble(92, 110, 208, 'Running the tests…', 3.1, 5.1),
].join('');
const logs = Array.from({ length: 9 }, (_, i) => {
  const w = 56 + ((i * 41) % 96);
  const t = 1.2 + i * 0.38;
  return `<g opacity="0">${show(t, 5.3)}<rect class="mut" x="520" y="${228 - i * 11}" width="${w}" height="6" rx="3">`
    + anim('x', [[0, 560], [t, 560], [t + 0.35, 520], [DUR, 520]], { ease: OUT }) + `</rect></g>`;
}).join('');

// ---- Ember ---------------------------------------------------------------------
const breathKeys = closeLoop(wave(0, DUR, 1.75, '1 1', '1 1.02'));
const tiltKeys = closeLoop(wave(0, DUR, 2.0, '-1.5', '1.5'));
const crouch = anim('transform', [[0, '1 1'], [5.15, '1 1'], [5.3, '1.05 0.93'], [5.55, '1 1'], [DUR, '1 1']], { type: 'scale', ease: EASE });

// the flame tuft: wild while chattering, a small steady glow after hush, a happy pop at the end
const flameRot = [[0, '0'], ...wave(0.2, 5.1, 0.1, '-16', '16'), [5.2, '0'], [5.8, '0'], ...wave(5.8, 11.3, 0.8, '-3', '3'), [11.4, '0'], ...wave(11.5, 13.9, 0.6, '-4', '4'), [DUR, '0']];
const flameScale = [[0, '1.2 1.3'], ...wave(0.2, 5.1, 0.15, '1.35 1.6', '1.05 1.15'), [5.2, '1.1 1.2'], [5.7, '0.6 0.55'], [11.3, '0.6 0.55'], [11.6, '1.05 1.1'], [12.0, '0.9 0.9'], [DUR, '0.9 0.9']];
const flame = part(350, 134, [anim('transform', flameRot, { type: 'rotate', ease: EASE }), anim('transform', flameScale, { type: 'scale', ease: EASE })],
  `<g filter="url(#glow)"><path class="flame" d="M0 -42 C -18 -26, -20 -10, -6 -2 C -10 -14, 0 -20, 2 -28 C 8 -18, 16 -12, 8 0 C 22 -8, 22 -26, 0 -42 Z"/>
   <path class="flamecore" d="M1 -22 C -6 -14, -6 -6, -1 -2 C -2 -8, 2 -12, 3 -16 C 6 -10, 8 -6, 5 -1 C 10 -6, 8 -16, 1 -22 Z"/></g>`);

// frantic typing: motion ticks above the arms and two sweat drops that fly off
const ticks = (x) => `<g opacity="0">${anim('opacity', [[0, 0], ...wave(0.35, 5.1, 0.24, 1, 0.2), [5.15, 0], [DUR, 0]], { ease: LIN })}<path class="tick" d="M${x - 10} 206 l-4 -7 M${x} 203 v-8 M${x + 10} 206 l4 -7"/></g>`;
const sweatDrop = (t, x, dx) => `<g opacity="0">${show(t, t + 0.5)}${part(x, 150, [anim('transform', [[0, '0 0'], [t, '0 0'], [t + 0.7, `${dx} -26`], [DUR, `${dx} -26`]], { type: 'translate', ease: OUT })],
  `<path class="sweat" d="M0 -8 C 4 -2, 5 2, 0 6 C -5 2, -4 -2, 0 -8 Z"/>`)}</g>`;
const frantic = ticks(318) + ticks(382) + sweatDrop(2.4, 300, -14) + sweatDrop(4.0, 402, 14);

// arms: frantic alternating taps while chattering, a slow rhythm while focused,
// the right arm rising to the mouth for the shh in between
const leftTap = [[0, '0 0'], ...wave(0.3, 5.1, 0.12, '0 0', '0 -8'), [5.15, '0 0'], [7.3, '0 0'], ...wave(7.3, 11.3, 0.3, '0 0', '0 -5'), [11.4, '0 0'], [DUR, '0 0']];
const rightTap = [[0, '0 -8'], ...wave(0.3, 5.1, 0.12, '0 -8', '0 0'), [5.15, '0 0'], [5.25, '0 4'], [5.6, '-34 -30'], [6.7, '-34 -30'], [7.1, '0 0'], ...wave(7.45, 11.3, 0.3, '0 -5', '0 0'), [11.4, '0 0'], [DUR, '0 0']];
const armL = part(318, 228, [anim('transform', leftTap, { type: 'translate', ease: OUT })], `<ellipse class="skin" cx="0" cy="0" rx="15" ry="11"/>`);
const armR = part(382, 228, [anim('transform', rightTap, { type: 'translate', ease: OUT })], `<ellipse class="skin" cx="0" cy="0" rx="15" ry="11"/>`);

// mouth: an "o" that opens and closes while chattering, a calm smile otherwise, a big one at the end
const mouthOpen = `<g opacity="0">${anim('opacity', [[0, 0], ...wave(0.4, 5.1, 0.17, 1, 0), [5.15, 0], [DUR, 0]], { ease: LIN })}<ellipse class="mouth" cx="350" cy="197" rx="6" ry="7"/></g>`;
const smile = `<g>${anim('opacity', [[0, 1], ...wave(0.4, 5.1, 0.17, 0, 1), [5.15, 1], [DUR, 1]], { ease: LIN })}<path class="mouthline" d="M340 194 q10 9 20 0">${anim('d', [[0, 'M340 194 q10 9 20 0'], [11.3, 'M340 194 q10 9 20 0'], [11.7, 'M336 193 q14 14 28 0'], [DUR, 'M336 193 q14 14 28 0']], { ease: BACK })}</path></g>`;

// eyes: blinks, and half-closed lids for focus
const blinkTimes = [2.1, 4.4, 6.0, 8.3, 10.2, 12.6];
const lidKeys = [[0, '1 0']];
for (const t of blinkTimes) lidKeys.push([t - 0.001, '1 0'], [t + 0.07, '1 1'], [t + 0.16, '1 0']);
lidKeys.push([DUR, '1 0']);
const focusKeys = [[0, '1 0'], [7.0, '1 0'], [7.4, '1 0.5'], [10.9, '1 0.5'], [11.3, '1 0'], [DUR, '1 0']];
const eye = (x) => `<g>
  <ellipse class="ink" cx="${x}" cy="176" rx="6.5" ry="8.5"/>
  <circle class="card" cx="${x + 2.4}" cy="172.5" r="2.3"/><circle class="card" cx="${x - 2.2}" cy="179" r="1.1"/>
  ${part(x, 166, [anim('transform', lidKeys, { type: 'scale', ease: LIN })], `<rect class="skin" x="-9" y="0" width="18" height="21" rx="7"/>`)}
  ${part(x, 166, [anim('transform', focusKeys, { type: 'scale', ease: EASE })], `<rect class="skin" x="-9" y="0" width="18" height="21" rx="7"/>`)}
</g>`;

const ember = part(350, 246, [anim('transform', breathKeys, { type: 'scale', ease: EASE }), crouch],
  `<g transform="translate(-350 -246)">
  <ellipse class="shadow" cx="350" cy="247" rx="70" ry="6"/>
  ${part(350, 200, [anim('transform', tiltKeys, { type: 'rotate', ease: EASE })], `<g transform="translate(-350 -200)">
    ${flame}
    <path class="skin" d="M296 200 C 292 150, 316 126, 350 126 C 384 126, 408 150, 404 200 C 402 232, 384 246, 350 246 C 316 246, 298 232, 296 200 Z"/>
    <path class="belly" d="M318 208 C 318 188, 332 178, 350 178 C 368 178, 382 188, 382 208 C 382 226, 368 236, 350 236 C 332 236, 318 226, 318 208 Z"/>
    <circle class="blush" cx="320" cy="192" r="7"/><circle class="blush" cx="380" cy="192" r="7"/>
    ${eye(334)}${eye(366)}
    ${smile}${mouthOpen}
  </g>`)}
  <ellipse class="foot" cx="334" cy="246" rx="12" ry="5"/><ellipse class="foot" cx="366" cy="246" rx="12" ry="5"/>
</g>`);

// ---- keyboard on the desk, in front of Ember -----------------------------------
const keys = [];
for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) keys.push(`<rect class="key" x="${310 + c * 10 + r * 4}" y="${229 + r * 8}" width="7" height="5" rx="1.5"/>`);
const keyboard = `<g><rect class="kb" x="302" y="224" width="100" height="22" rx="5"/>${keys.join('')}</g>`;

// ---- hush arrives ---------------------------------------------------------------
const drop = anim('transform', [[0, '0 -90'], [5.0, '0 -90'], [5.4, '0 0'], [DUR, '0 0']], { type: 'translate', ease: BACK });
const squash = anim('transform', [[0, '1 1'], [5.35, '1 1'], [5.45, '1.14 0.86'], [5.7, '1 1'], [DUR, '1 1']], { type: 'scale', ease: EASE });
const pill = `<g opacity="0">${show(5.0)}${part(560, 44, [drop, squash],
  `<rect class="ac" x="-42" y="-17" width="84" height="34" rx="17" filter="url(#soft)"/><text class="card" x="0" y="6" font-size="16" font-weight="800" text-anchor="middle">hush</text>`)}</g>`;
const shh = `<g opacity="0">${show(5.7, 6.9)}<text class="ink" x="392" y="182" font-size="15" font-weight="700" font-style="italic">shh…</text></g>`;
// the one message at the end, in hush's shape: the outcome in bold, one short
// line naming the file to open, and a Next line. A speech tail points at Ember.
const note = `<g opacity="0">${show(11.4)}${part(536, 118, [anim('transform', [[0, '0.85'], [11.4, '0.85'], [11.75, '1'], [DUR, '1']], { type: 'scale', ease: BACK })],
  `<rect class="notecard" x="-114" y="-46" width="228" height="92" rx="12" filter="url(#soft)"/>
   <path class="notecard" d="M-114 4 l-14 8 l14 8 z"/>
   <text class="ink" x="-98" y="-22" font-size="15" font-weight="800">Done. One line to fix.</text>
   <text class="ink" x="-98" y="2" font-size="14">The fix is in <tspan class="link">pricing.js:39</tspan>.</text>
   <text class="mut2" x="-98" y="26" font-size="14">Next: nothing.</text>`)}</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 300" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" role="img" aria-label="A cartoon. Ember, a round orange blob with a little flame on its head, sits at a keyboard typing like mad and narrating in speech bubbles: let me look at the codebase, now I'll check the config, running the tests, while log lines pile up beside it and the flame flickers wildly. A blue hush badge drops in. Ember lifts a paw to its mouth: shh. The bubbles and the pile vanish, the flame settles to a small steady glow. Ember types slowly now, eyes half closed in focus, and at the end one short note appears in hush's shape: Done. One line to fix, in bold; the fix is in pricing.js:39, as a link; Next: nothing.">
<defs>
  <radialGradient id="emberGrad" cx="0.4" cy="0.3" r="0.85"><stop offset="0" stop-color="#ffd27a"/><stop offset="0.6" stop-color="#f5903f"/><stop offset="1" stop-color="#c8542a"/></radialGradient>
  <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff9a3c"/><stop offset="0.6" stop-color="#ffd23f"/><stop offset="1" stop-color="#fff2a8"/></linearGradient>
  <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#0b0b0b" flood-opacity=".10"/></filter>
  <filter id="soft" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0b0b0b" flood-opacity=".12"/></filter>
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<style>
.card{fill:#fcfcfb;stroke:rgba(11,11,11,.07)}.ink{fill:#0b0b0b}.mut{fill:#cfccc3}.desk{fill:#e4e1d8}.shadow{fill:#0b0b0b;opacity:.08}
.bub{fill:#f0efeb}.bubq{fill:#e3eefc}.ac{fill:#2a78d6}
.skin{fill:url(#emberGrad)}.belly{fill:#ffe0a8;opacity:.55}.foot{fill:#c8542a}.flame{fill:url(#flameGrad)}.flamecore{fill:#fff6c8;opacity:.9}
.mouth{fill:#8a3a3a}.mouthline{fill:none;stroke:#8a3a3a;stroke-width:2.5;stroke-linecap:round}.blush{fill:#ff7b7b;opacity:.35}
.kb{fill:#4d4d4a}.key{fill:#8a8a85}.tick{fill:none;stroke:#c8542a;stroke-width:2;stroke-linecap:round}.sweat{fill:#7cc4ff}.notecard{fill:#e3eefc}.link{fill:#2a78d6;text-decoration:underline}.mut2{fill:#52514e}
@media(prefers-color-scheme:dark){.card{fill:#161b22;stroke:#30363d}.ink{fill:#e6edf3}.mut{fill:#4b5563}.notecard{fill:#173a63}.link{fill:#8cc4ff}.mut2{fill:#b0b8c0}.desk{fill:#2b3038}.shadow{fill:#000;opacity:.35}.bub{fill:#2b2b29}.bubq{fill:#173a63}.ac{fill:#4c9be8}.kb{fill:#9aa0a6}.key{fill:#5f6670}}
</style>
<rect class="card" x="8" y="6" width="684" height="288" rx="18" filter="url(#s)"/>
<rect class="desk" x="90" y="246" width="540" height="8" rx="4"/>
${logs}
${ember}
${keyboard}
${armL}${armR}
${frantic}
${bubbles}
${pill}
${shh}
${note}
</svg>`;
fs.writeFileSync(path.join(__dirname, 'mascot-hush.svg'), svg);
console.log('wrote mascot-hush.svg', svg.length, 'bytes');
