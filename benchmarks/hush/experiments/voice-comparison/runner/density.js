#!/usr/bin/env node
'use strict';
// Reading-load report for a tag: how many words the user had to read per run,
// summed across every turn's deliverable (finalWordsAll), plus the ground-truth
// pass rate that gates any claim about it.
//
//   node density.js --tag dense1 [--dump checkout-session]

const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const tag = flag('tag', 'dev');
const dump = flag('dump', null);

const runsDir = path.resolve(__dirname, '..', 'results', tag, 'runs');
const runs = fs.readdirSync(runsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf8')))
  .filter((r) => !r.error);

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const arms = [...new Set(runs.map((r) => r.arm))];
const tasks = [...new Set(runs.map((r) => r.task))];

const cell = (t, a) => runs.filter((r) => r.task === t && r.arm === a);

console.log(`tag=${tag}  runs=${runs.length}\n`);
console.log('read-words per run (every turn summed) — per-rep spread in brackets\n');
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('task', 20) + arms.map((a) => pad(a, 34)).join(''));
for (const t of tasks) {
  let line = pad(t, 20);
  for (const a of arms) {
    const c = cell(t, a);
    const w = c.map((r) => r.finalWordsAll ?? r.finalWords ?? 0);
    line += pad(`${Math.round(mean(w))}  [${w.join(' ')}]`, 34);
  }
  console.log(line);
}

console.log('\ntotals per arm');
for (const a of arms) {
  const c = runs.filter((r) => r.arm === a);
  const w = c.map((r) => r.finalWordsAll ?? r.finalWords ?? 0);
  const pass = c.filter((r) => r.check?.pass).length;
  console.log(
    `  ${pad(a, 10)} read=${Math.round(mean(w))}w  narration=${Math.round(mean(c.map((r) => r.narrationWords || 0)))}w  ` +
    `cost=$${mean(c.map((r) => r.costUsd || 0)).toFixed(4)}  out=${Math.round(mean(c.map((r) => r.usage?.output_tokens || 0)))}tok  ` +
    `pass=${pass}/${c.length}`
  );
}

const base = arms.includes('hushold') ? 'hushold' : arms[0];
for (const a of arms.filter((x) => x !== base)) {
  const w = (arm) => mean(runs.filter((r) => r.arm === arm).map((r) => r.finalWordsAll ?? r.finalWords ?? 0));
  const d = ((w(a) - w(base)) / w(base)) * 100;
  console.log(`\n${a} vs ${base}: read-words ${d >= 0 ? '+' : ''}${d.toFixed(1)}%`);
}

if (dump) {
  for (const a of arms) {
    for (const r of cell(dump, a)) {
      console.log(`\n${'='.repeat(70)}\n${r.key}  (${r.finalWordsAll}w, check=${r.check?.pass})`);
      (r.finalTexts || [r.finalText]).forEach((t, i) => {
        console.log(`\n--- turn ${i + 1} ---\n${t}`);
      });
    }
  }
}
