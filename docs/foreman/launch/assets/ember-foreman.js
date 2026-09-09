'use strict';
// Authoring helper for foreman/assets/mascot.svg — Ember at a desk, buried
// under a flurry of loose papers, flame going wild; Foreman drops in, the
// papers gather into one neat list, and three checks tick in one by one while
// Ember calms down. Then "What's next? This one." Pure SMIL for a README <img>.
const fs = require('node:fs');
const path = require('node:path');

const DUR = 14;
const k = (t) => (t / DUR).toFixed(4);
const EASE = '0.45 0 0.55 1';
const OUT = '0.22 1 0.36 1';
const BACK = '0.34 1.56 0.64 1';
const LIN = '0 0 1 1';
const splines = (n, s) => Array.from({ length: n }, () => s).join(';');
function anim(attr, keys, opts = {}) {
  const times = keys.map(([t]) => k(t)).join(';');
  const values = keys.map(([, v]) => v).join(';');
  const type = opts.type ? ` type="${opts.type}"` : '';
  const tag = opts.type ? 'animateTransform' : 'animate';
  return `<${tag} attributeName="${attr}"${type} values="${values}" keyTimes="${times}" calcMode="spline" keySplines="${splines(keys.length - 1, opts.ease || EASE)}" dur="${DUR}s" repeatCount="indefinite"/>`;
}
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

// ---- the flurry: loose papers fall around Ember and pile on the desk ----------
// Each sheet drifts down with its own tilt, lands, and at 6.4 s slides into the
// list on the right. Nothing on them is legible on purpose: a feeling, not a fact.
const sheets = [
  { x: 150, y: 214, rot: -18, t: 0.5 }, { x: 205, y: 226, rot: 12, t: 1.0 }, { x: 118, y: 236, rot: 6, t: 1.5 },
  { x: 470, y: 222, rot: 20, t: 2.0 }, { x: 520, y: 236, rot: -9, t: 2.5 }, { x: 178, y: 200, rot: 26, t: 3.0 },
  { x: 496, y: 200, rot: -24, t: 3.5 }, { x: 240, y: 236, rot: -4, t: 4.0 }, { x: 452, y: 240, rot: 8, t: 4.5 },
];
const list = { x: 560, y: 150 };
const flurry = sheets.map((s, i) => {
  const fall = anim('transform', [[0, `${s.x} -60`], [s.t, `${s.x} -60`], [s.t + 0.9, `${s.x} ${s.y}`], [6.4, `${s.x} ${s.y}`], [7.0, `${list.x} ${list.y + 8}`], [DUR, `${list.x} ${list.y + 8}`]], { type: 'translate', ease: OUT });
  const spin = anim('transform', [[0, `${s.rot - 30}`], [s.t, `${s.rot - 30}`], [s.t + 0.9, `${s.rot}`], [6.4, `${s.rot}`], [7.0, '0'], [DUR, '0']], { type: 'rotate', ease: OUT });
  return `<g opacity="0">${show(s.t, 6.9)}${part(0, 0, [fall, spin], `<rect class="sheet" x="-16" y="-20" width="32" height="40" rx="3"/><path class="sheetline" d="M-9 -10 h18 M-9 -3 h18 M-9 4 h12"/>`)}</g>`;
}).join('');

// ---- the list: one card with three lines, ticked one by one ---------------------
const card = `<g opacity="0">${show(6.6)}${part(list.x, list.y, [anim('transform', [[0, '0.8'], [6.6, '0.8'], [7.0, '1'], [DUR, '1']], { type: 'scale', ease: BACK })],
  `<rect class="listcard" x="-62" y="-52" width="124" height="104" rx="10" filter="url(#soft)"/>
   <text class="listt" x="-50" y="-30" font-size="13" font-weight="700">the plan</text>
   ${[0, 1, 2].map((i) => `<rect class="listline" x="-30" y="${-12 + i * 22}" width="${70 - i * 12}" height="6" rx="3"/><rect class="chk" x="-50" y="${-18 + i * 22}" width="14" height="14" rx="3"/>`).join('')}`)}</g>`;
const ticks = [0, 1, 2].map((i) => {
  const t = 8.0 + i * 1.1;
  return `<g opacity="0">${show(t)}${part(list.x - 43, list.y - 11 + i * 22, [anim('transform', [[0, '0.4'], [t, '0.4'], [t + 0.3, '1'], [DUR, '1']], { type: 'scale', ease: BACK })],
    `<path class="tickmark" d="M-5 0 l3 4 l8 -9"/>`)}</g>`;
}).join('');

// ---- Ember: stressed, then calm --------------------------------------------------
const breathKeys = closeLoop(wave(0, DUR, 1.75, '1 1', '1 1.02'));
// a frightened wobble while the papers fall, a gentle tilt after
const tiltKeys = [[0, '0'], ...wave(0.3, 5.1, 0.25, '-4', '4'), [5.2, '0'], ...wave(5.5, DUR, 2.0, '-1.5', '1.5')];
closeLoop(tiltKeys);
const crouch = anim('transform', [[0, '1 1'], [5.15, '1 1'], [5.3, '1.05 0.93'], [5.55, '1 1'], [DUR, '1 1']], { type: 'scale', ease: EASE });
const flameRot = [[0, '0'], ...wave(0.2, 5.1, 0.1, '-16', '16'), [5.2, '0'], [5.8, '0'], ...wave(5.8, 11.3, 0.8, '-3', '3'), [11.4, '0'], ...wave(11.5, 13.9, 0.6, '-4', '4'), [DUR, '0']];
const flameScale = [[0, '1.2 1.3'], ...wave(0.2, 5.1, 0.15, '1.35 1.6', '1.05 1.15'), [5.2, '1.1 1.2'], [5.7, '0.6 0.55'], [11.3, '0.6 0.55'], [11.6, '1.05 1.1'], [12.0, '0.9 0.9'], [DUR, '0.9 0.9']];
const flame = part(350, 134, [anim('transform', flameRot, { type: 'rotate', ease: EASE }), anim('transform', flameScale, { type: 'scale', ease: EASE })],
  `<g filter="url(#glow)"><path class="flame" d="M0 -42 C -18 -26, -20 -10, -6 -2 C -10 -14, 0 -20, 2 -28 C 8 -18, 16 -12, 8 0 C 22 -8, 22 -26, 0 -42 Z"/>
   <path class="flamecore" d="M1 -22 C -6 -14, -6 -6, -1 -2 C -2 -8, 2 -12, 3 -16 C 6 -10, 8 -6, 5 -1 C 10 -6, 8 -16, 1 -22 Z"/></g>`);
// arms: flailing while the papers fall, folded calm on the desk after, one lifts to point at the list at the end
const leftArm = [[0, '0 0'], ...wave(0.3, 5.1, 0.2, '-6 -14', '4 2'), [5.15, '0 0'], [DUR, '0 0']];
const rightArm = [[0, '4 2'], ...wave(0.3, 5.1, 0.2, '6 -14', '-4 2'), [5.15, '0 0'], [11.3, '0 0'], [11.7, '14 -18'], [DUR, '14 -18']];
const armL = part(318, 228, [anim('transform', leftArm, { type: 'translate', ease: OUT })], `<ellipse class="skin" cx="0" cy="0" rx="15" ry="11"/>`);
const armR = part(382, 228, [anim('transform', rightArm, { type: 'translate', ease: OUT })], `<ellipse class="skin" cx="0" cy="0" rx="15" ry="11"/>`);
// sweat while stressed
const sweatDrop = (t, x, dx) => `<g opacity="0">${show(t, t + 0.5)}${part(x, 150, [anim('transform', [[0, '0 0'], [t, '0 0'], [t + 0.7, `${dx} -26`], [DUR, `${dx} -26`]], { type: 'translate', ease: OUT })],
  `<path class="sweat" d="M0 -8 C 4 -2, 5 2, 0 6 C -5 2, -4 -2, 0 -8 Z"/>`)}</g>`;
const sweat = sweatDrop(1.6, 300, -14) + sweatDrop(3.2, 402, 14) + sweatDrop(4.6, 300, -14);
// mouth: while the papers fall, a pressed squiggle held with a small tremble (the
// persevering face); after Foreman lands, a calm smile that grows at the end
const tremble = anim('transform', [[0, '0 0'], ...wave(0.3, 5.1, 0.15, '0 0', '0 1'), [5.15, '0 0'], [DUR, '0 0']], { type: 'translate', ease: LIN });
const stressMouth = `<g opacity="0">${anim('opacity', [[0, 1], [5.1, 1], [5.4, 0], [DUR, 0]], { ease: LIN })}${part(0, 0, [tremble], `<path class="mouthline" d="M338 199 q4 -6 8 0 q4 6 8 0 q4 -6 8 0"/>`)}</g>`;
const smile = `<g opacity="0">${anim('opacity', [[0, 0], [5.1, 0], [5.4, 1], [DUR, 1]], { ease: LIN })}<path class="mouthline" d="M340 194 q10 9 20 0">${anim('d', [[0, 'M340 194 q10 9 20 0'], [11.3, 'M340 194 q10 9 20 0'], [11.7, 'M336 193 q14 14 28 0'], [DUR, 'M336 193 q14 14 28 0']], { ease: BACK })}</path></g>`;
const mouthOpen = '';
// eyes: squeezed shut with slanted brows while the papers fall (the persevering
// face), then open, blinking, and looking at the list at the end
const blinkTimes = [6.0, 8.3, 10.2, 12.6];
const lidKeys = [[0, '1 0']];
for (const t of blinkTimes) lidKeys.push([t - 0.001, '1 0'], [t + 0.07, '1 1'], [t + 0.16, '1 0']);
lidKeys.push([DUR, '1 0']);
const dart = [[0, '0 0'], [11.3, '0 0'], [11.7, '3 -1'], [DUR, '3 -1']];
const openEyes = anim('opacity', [[0, 0], [5.1, 0], [5.4, 1], [DUR, 1]], { ease: LIN });
const shutEyes = anim('opacity', [[0, 1], [5.1, 1], [5.4, 0], [DUR, 0]], { ease: LIN });
const eye = (x, dir) => `<g>
  <g opacity="0">${openEyes}
    ${part(x, 176, [anim('transform', dart, { type: 'translate', ease: EASE })], `<ellipse class="ink" cx="0" cy="0" rx="6.5" ry="8.5"/><circle class="card" cx="2.4" cy="-3.5" r="2.3"/><circle class="card" cx="-2.2" cy="3" r="1.1"/>`)}
    ${part(x, 166, [anim('transform', lidKeys, { type: 'scale', ease: LIN })], `<rect class="skin" x="-9" y="0" width="18" height="21" rx="7"/>`)}
  </g>
  <g opacity="0">${shutEyes}
    <path class="eyeline" d="M${x - dir * 7} 170 l${dir * 8} 6 l${-dir * 8} 6"/>
    <path class="eyeline" d="M${x - dir * 9} 156 l${dir * 14} 5"/>
  </g>
</g>`;
const ember = part(350, 246, [anim('transform', breathKeys, { type: 'scale', ease: EASE }), crouch],
  `<g transform="translate(-350 -246)">
  <ellipse class="shadow" cx="350" cy="247" rx="70" ry="6"/>
  ${part(350, 200, [anim('transform', tiltKeys, { type: 'rotate', ease: EASE })], `<g transform="translate(-350 -200)">
    ${flame}
    <path class="skin" d="M296 200 C 292 150, 316 126, 350 126 C 384 126, 408 150, 404 200 C 402 232, 384 246, 350 246 C 316 246, 298 232, 296 200 Z"/>
    <path class="belly" d="M318 208 C 318 188, 332 178, 350 178 C 368 178, 382 188, 382 208 C 382 226, 368 236, 350 236 C 332 236, 318 226, 318 208 Z"/>
    <circle class="blush" cx="320" cy="192" r="7"/><circle class="blush" cx="380" cy="192" r="7"/>
    ${eye(334, 1)}${eye(366, -1)}
    ${smile}${stressMouth}
  </g>`)}
  <ellipse class="foot" cx="334" cy="246" rx="12" ry="5"/><ellipse class="foot" cx="366" cy="246" rx="12" ry="5"/>
</g>`);

// ---- Foreman arrives -----------------------------------------------------------
const drop = anim('transform', [[0, '0 -90'], [5.0, '0 -90'], [5.4, '0 0'], [DUR, '0 0']], { type: 'translate', ease: BACK });
const squash = anim('transform', [[0, '1 1'], [5.35, '1 1'], [5.45, '1.14 0.86'], [5.7, '1 1'], [DUR, '1 1']], { type: 'scale', ease: EASE });
const pill = `<g opacity="0">${show(5.0)}${part(560, 44, [drop, squash],
  `<rect class="ac" x="-52" y="-17" width="104" height="34" rx="17" filter="url(#soft)"/><text class="card" x="0" y="6" font-size="16" font-weight="800" text-anchor="middle">Foreman</text>`)}</g>`;
const done = bubble(110, 92, 200, 'What’s next? This one.', 11.4, null, 'bubq', 'ink', true);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 300" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" role="img" aria-label="A cartoon. Ember, a round orange blob with a little flame on its head, sits at a desk while loose papers rain down around it; it flails, sweats, and its flame flickers wildly. A green Foreman badge drops in. The papers gather into one neat list card, and three checks tick in one by one while Ember settles, its flame a small steady glow. At the end Ember points at the list and one bubble appears: What's next? This one.">
<defs>
  <radialGradient id="emberGrad" cx="0.4" cy="0.3" r="0.85"><stop offset="0" stop-color="#ffd27a"/><stop offset="0.6" stop-color="#f5903f"/><stop offset="1" stop-color="#c8542a"/></radialGradient>
  <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff9a3c"/><stop offset="0.6" stop-color="#ffd23f"/><stop offset="1" stop-color="#fff2a8"/></linearGradient>
  <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#0b0b0b" flood-opacity=".10"/></filter>
  <filter id="soft" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0b0b0b" flood-opacity=".12"/></filter>
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<style>
.card{fill:#fcfcfb;stroke:rgba(11,11,11,.07)}.ink{fill:#0b0b0b}.desk{fill:#e4e1d8}.shadow{fill:#0b0b0b;opacity:.08}
.bub{fill:#f0efeb}.bubq{fill:#e3f2e3}.ac{fill:#16a34a}
.sheet{fill:#f4f1e8;stroke:#b8b4a8;stroke-width:1.5}.sheetline{fill:none;stroke:#b8b4a8;stroke-width:2;stroke-linecap:round}
.listcard{fill:#fff;stroke:#cfccc3}.listt{fill:#52514e}.listline{fill:#dcd9d0}.chk{fill:none;stroke:#16a34a;stroke-width:2}.tickmark{fill:none;stroke:#16a34a;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.skin{fill:url(#emberGrad)}.belly{fill:#ffe0a8;opacity:.55}.foot{fill:#c8542a}.flame{fill:url(#flameGrad)}.flamecore{fill:#fff6c8;opacity:.9}
.mouthline{fill:none;stroke:#8a3a3a;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.eyeline{fill:none;stroke:#0b0b0b;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.blush{fill:#ff7b7b;opacity:.35}.sweat{fill:#7cc4ff}
@media(prefers-color-scheme:dark){.card{fill:#161b22;stroke:#30363d}.ink{fill:#e6edf3}.eyeline{stroke:#e6edf3}.desk{fill:#2b3038}.shadow{fill:#000;opacity:.35}.bub{fill:#2b2b29}.bubq{fill:#17301f}.ac{fill:#22c55e}.sheet{fill:#3a3f47;stroke:#6b7280}.sheetline{stroke:#8b93a1}.listcard{fill:#1f2630;stroke:#30363d}.listt{fill:#b0b8c0}.listline{fill:#3d3c37}.chk{stroke:#22c55e}.tickmark{stroke:#22c55e}}
</style>
<rect class="card" x="8" y="6" width="684" height="288" rx="18" filter="url(#s)"/>
<rect class="desk" x="90" y="246" width="540" height="8" rx="4"/>
${card}
${ember}
${armL}${armR}
${flurry}
${ticks}
${sweat}
${pill}
${done}
</svg>`;
const out = process.argv[2] || path.join(__dirname, 'mascot-foreman.svg');
fs.writeFileSync(out, svg);
console.log('wrote', out, svg.length, 'bytes');
