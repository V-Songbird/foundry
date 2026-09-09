#!/usr/bin/env node
'use strict';
// Bullet + brevity + silence rollup for a tag. Counts what the user reads
// across ALL turns' deliverables: unordered bullet lines (the thing we are
// trying to reduce), ordered list items (legit steps, kept separate), words,
// narration, ground-truth pass, cost. Per-rep spread shown so a mean is never
// read as signal on its own.
//
//   node bullet-report.js --tag X [--arms s0,s1,s2]

const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const tag = flag('tag', 'dev');
const only = flag('arms', null);

const runsDir = path.resolve(__dirname, '..', 'results', tag, 'runs');
let runs = fs.readdirSync(runsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf8')))
  .filter((r) => !r.error);
if (only) runs = runs.filter((r) => only.split(',').includes(r.arm));

// Unordered bullet lines inside fenced code blocks are content, not report
// structure — strip fences before counting.
function countBullets(text) {
  const noCode = (text || '').replace(/```[\s\S]*?```/g, '');
  const lines = noCode.split('\n');
  let unordered = 0, ordered = 0;
  for (const l of lines) {
    if (/^\s*[-*+]\s+\S/.test(l)) unordered++;
    else if (/^\s*\d+\.\s+\S/.test(l)) ordered++;
  }
  return { unordered, ordered };
}

function deliverable(r) {
  return (r.finalTexts || [r.finalText]).join('\n\n');
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (a) => (a.length ? (100 * a.filter(Boolean).length / a.length) : 0);
const pad = (s, n) => String(s).padEnd(n);

for (const r of runs) {
  const b = countBullets(deliverable(r));
  r._bul = b.unordered; r._ord = b.ordered;
  r._words = r.finalWordsAll ?? r.finalWords ?? 0;
  r._nar = r.narrationWords ?? 0;
  r._pass = !!(r.check && r.check.pass);
  r._cost = r.costUsd ?? 0;
}

const arms = [...new Set(runs.map((r) => r.arm))].sort();
const tasks = [...new Set(runs.map((r) => r.task))].sort();

console.log(`\ntag=${tag}  runs=${runs.length}\n`);
console.log('PER ARM  (bul = unordered bullet lines/run, the target metric)');
console.log(pad('arm', 8) + pad('n', 4) + pad('bul', 8) + pad('%wBul', 8) + pad('ord', 7) + pad('words', 8) + pad('narr', 7) + pad('pass%', 8) + pad('$/run', 9));
for (const a of arms) {
  const rr = runs.filter((r) => r.arm === a);
  console.log(
    pad(a, 8) + pad(rr.length, 4) +
    pad(mean(rr.map((r) => r._bul)).toFixed(1), 8) +
    pad(pct(rr.map((r) => r._bul > 0)).toFixed(0), 8) +
    pad(mean(rr.map((r) => r._ord)).toFixed(1), 7) +
    pad(mean(rr.map((r) => r._words)).toFixed(0), 8) +
    pad(mean(rr.map((r) => r._nar)).toFixed(1), 7) +
    pad(pct(rr.map((r) => r._pass)).toFixed(0), 8) +
    pad('$' + mean(rr.map((r) => r._cost)).toFixed(3), 9)
  );
}

console.log('\nUNORDERED BULLETS per task x arm  (each rep shown; [] = spread)');
console.log(pad('task', 20) + arms.map((a) => pad(a, 16)).join(''));
for (const t of tasks) {
  let line = pad(t, 20);
  for (const a of arms) {
    const rr = runs.filter((r) => r.task === t && r.arm === a);
    const v = rr.map((r) => r._bul);
    line += pad(`${mean(v).toFixed(1)} [${v.join(' ')}]`, 16);
  }
  console.log(line);
}

console.log('\nWORDS per task x arm');
console.log(pad('task', 20) + arms.map((a) => pad(a, 16)).join(''));
for (const t of tasks) {
  let line = pad(t, 20);
  for (const a of arms) {
    const rr = runs.filter((r) => r.task === t && r.arm === a);
    const v = rr.map((r) => r._words);
    line += pad(`${mean(v).toFixed(0)} [${v.join(' ')}]`, 16);
  }
  console.log(line);
}
