// Every number hush's README prints, read straight out of one batch's records.
// Local-only helper: the README is hand-written prose, this is what it must agree
// with. Run it once per basis batch and copy the figures across.
//
//   node docs/hush/research/scripts/hush-readme-numbers.js benchmarks/hush/records/<batch>
const fs = require('fs');
const p = require('path');
const { readabilityReport } = require(p.resolve('benchmarks/hush/runner/readability.js'));

const dir = process.argv[2];
const runs = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.json') && f !== 'batch.json')
  .map((f) => JSON.parse(fs.readFileSync(p.join(dir, f), 'utf8')))
  .filter((r) => !r.error);

const batch = JSON.parse(fs.readFileSync(p.join(dir, 'batch.json'), 'utf8'));
const arms = [...new Set(runs.map((r) => r.arm))].sort();
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f2 = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '—');

console.log(`batch ${batch.batchId} · model ${batch.model} · reps ${batch.reps} · ${runs.length} runs`);

console.log('\n== per session, by arm ==');
console.log('arm       n   toolChars  chatter  outTok   cost      words  w/sent  long%  ease  grade   silent  <=1 line   linked');
for (const a of arms) {
  const rs = runs.filter((r) => r.arm === a);
  const x = readabilityReport(rs).arms[a] || {};
  console.log(
    a.padEnd(9),
    String(rs.length).padStart(3),
    String(Math.round(mean(rs.map((r) => r.toolResultChars)))).padStart(10),
    String(Math.round(mean(rs.map((r) => r.narrationWords)))).padStart(8),
    String(Math.round(mean(rs.map((r) => r.usage?.output_tokens || 0)))).padStart(7),
    ('$' + mean(rs.map((r) => r.costUsd)).toFixed(4)).padStart(9),
    String(Math.round(x.words)).padStart(6),
    f2(x.wordsPerSentence).padStart(7),
    (f2(x.hardWordPct) + '%').padStart(6),
    f2(x.ease).padStart(5),
    f2(x.grade).padStart(6),
    `${rs.filter((r) => r.narrationWords === 0).length} of ${rs.length}`.padStart(8),
    `${rs.filter((r) => (r.narrationTexts || []).length <= 1).length} of ${rs.length}`.padStart(9),
    `${rs.filter((r) => /\]\([^)]+:\d+\)/.test(r.finalText || '')).length} of ${rs.length}`.padStart(8));
}

console.log('\n== cost per job, ordered by what the commands print per step ==');
const tasks = [...new Set(runs.map((r) => r.task))];
const rows = tasks.map((t) => {
  const rs = runs.filter((r) => r.task === t);
  const per = (a) => rs.filter((r) => r.arm === a);
  const chars = mean(per('baseline').map((r) => r.toolResultChars / Math.max(1, r.apiCalls)));
  const b = mean(per('baseline').map((r) => r.costUsd));
  const h = mean(per('hush').map((r) => r.costUsd));
  return { t, chars, b, h, pct: ((h - b) / b) * 100 };
}).sort((x, y) => x.chars - y.chars);
for (const r of rows) {
  console.log(`  ${r.t.padEnd(20)} ${(r.chars / 1000).toFixed(1)}k  baseline $${r.b.toFixed(3)}  hush $${r.h.toFixed(3)}  ${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(0)}%`);
}
const cheaper = rows.filter((r) => r.pct < 0).length;
console.log(`  hush cheaper on ${cheaper} of ${rows.length} jobs`);

console.log('\n== ground truth ==');
for (const a of arms) {
  const rs = runs.filter((r) => r.arm === a);
  console.log(`  ${a}: ${rs.filter((r) => r.check?.pass).length} of ${rs.length}`);
}

console.log('\n== session totals for the cuts chart ==');
const g = (a, f) => mean(runs.filter((r) => r.arm === a).map(f));
for (const [label, f] of [
  ['command output (chars)', (r) => r.toolResultChars],
  ['chatter (words)', (r) => r.narrationWords],
  ["Claude's output (tok)", (r) => r.usage?.output_tokens || 0],
  ['cost (USD)', (r) => r.costUsd],
]) {
  const b = g('baseline', f), h = g('hush', f);
  console.log(`  ${label.padEnd(24)} baseline ${f2(b, 4)}  hush ${f2(h, 4)}  ${(((h - b) / b) * 100).toFixed(0)}%`);
}
