#!/usr/bin/env node
// Pool judged batches by arm.
//
//   node runner/pool.js --tag sf1 --tag sf2 --tag sf3
//
// One batch of three or four reps decides nothing on its own — the per-rep
// spread in this harness is wider than most of the differences between arms.
// This pools every judged run of an arm across batches and reports the mean,
// the standard deviation, the worst rep, and the per-dimension means, so a
// promotion argument rests on the whole record rather than on the batch that
// happened to come out favourably.
//
// Pooling is only legitimate because Jev is deterministic on identical input
// and stock hush landed within 0.006 of itself across independent batches.
// Both were measured, not assumed.

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { flagAll } = require('../../flags.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(require('../../paths.js').dataDir('hush'), 'results');
const argv = process.argv.slice(2);
const tags = flagAll(argv, 'tag');
if (!tags.length) { console.error('usage: node runner/pool.js --tag NAME [--tag NAME2 ...]'); process.exit(2); }

const rubric = JSON.parse(fs.readFileSync(path.join(ROOT, 'rubric.json'), 'utf8'));

const byArm = {};
for (const tag of tags) {
  const f = path.join(RESULTS, tag, 'judge.json');
  if (!fs.existsSync(f)) { console.error(`no judge.json for ${tag}`); continue; }
  for (const r of Object.values(JSON.parse(fs.readFileSync(f, 'utf8')).runs)) {
    (byArm[r.arm] ||= []).push({ ...r, tag });
  }
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, b) => a + (b - mean(xs)) ** 2, 0) / (xs.length - 1)));

const arms = Object.keys(byArm).sort((a, b) => mean(byArm[b].map((r) => r.composite)) - mean(byArm[a].map((r) => r.composite)));

console.log(`pooled over ${tags.join(', ')}\n`);
console.log('arm'.padEnd(11) + '   n  composite     sd    worst   reader    comp     mech    voice   gatefail  words');
for (const a of arms) {
  const g = byArm[a];
  const c = g.map((r) => r.composite);
  console.log(
    a.padEnd(11) +
    String(g.length).padStart(4) +
    mean(c).toFixed(3).padStart(11) +
    sd(c).toFixed(3).padStart(7) +
    Math.min(...c).toFixed(3).padStart(9) +
    mean(g.map((r) => r.groups.reader ?? 0)).toFixed(3).padStart(9) +
    mean(g.map((r) => r.groups.comprehension ?? 0)).toFixed(3).padStart(8) +
    mean(g.map((r) => r.groups.mechanics ?? 0)).toFixed(3).padStart(9) +
    mean(g.map((r) => r.groups.voice ?? 0)).toFixed(3).padStart(9) +
    String(g.filter((r) => !r.passed).length).padStart(10) +
    mean(g.map((r) => r.finalWords || 0)).toFixed(0).padStart(7)
  );
}

const isChoice = (id) => rubric.questions[id].type === 'choice';
const dims = Object.keys(rubric.questions).filter((d) => !isChoice(d));
const w = Math.max(...dims.map((d) => d.length), 24);
console.log('\nper dimension, pooled\n');
console.log('dimension'.padEnd(w) + arms.map((a) => a.padStart(11)).join(''));
for (const d of dims) {
  const vals = arms.map((a) => mean(byArm[a].map((r) => r.per[d]?.value ?? 0)));
  const best = Math.max(...vals);
  console.log(d.padEnd(w) + vals.map((v) => (v.toFixed(3) + (v === best ? '*' : ' ')).padStart(11)).join(''));
}

// The diagnostic Choices, pooled: mean probability mass per option per arm.
// This is the ranked work queue — what these messages ask to have fixed.
for (const id of Object.keys(rubric.questions).filter(isChoice)) {
  const opts = Object.keys(rubric.questions[id].criteria);
  const rows = opts.map((o) => ({
    o, vals: arms.map((a) => mean(byArm[a].map((r) => r.per[id]?.probabilities?.[o] ?? 0))),
  })).sort((x, y) => Math.max(...y.vals) - Math.max(...x.vals));
  if (!rows.some((r) => Math.max(...r.vals) >= 0.05)) continue;
  console.log(`\n${id} — mean probability mass per option\n`);
  console.log('option'.padEnd(w) + arms.map((a) => a.padStart(11)).join(''));
  for (const { o, vals } of rows) {
    if (Math.max(...vals) < 0.05) continue;
    const best = Math.max(...vals);
    console.log(o.padEnd(w) + vals.map((v) => (v.toFixed(3) + (v === best ? '*' : ' ')).padStart(11)).join(''));
  }
}
