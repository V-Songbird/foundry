'use strict';
// Rebuild razor's README benchmark tables from a run's results.json.
//
//   per cell: median total_loc over that job x arm x model
//   bold:     the fewest lines in the row (ties all bold)
//   dagger:   that arm did not come out correct AND package-free every rep
//   average:  mean total_loc over every session of that arm on this model
//
//   node tables.js <run-dir>

const fs = require('node:fs');
const path = require('node:path');

const JOBS = [
  ['dep-slug', 'Slugify a title'],
  ['dep-querystring', 'Parse a query string'],
  ['dep-uuid', 'Generate a unique id'],
  ['reuse-scan', 'Add a scorer to an existing module'],
  ['sprawl-todo', 'Add due dates to a todo CLI'],
  ['dep-http', 'A one-line HTTP GET'],
  ['dep-retry', 'Retry a flaky call'],
  ['dep-dotenv', 'Read a `.env` file'],
  ['dep-http-lib', '"Just use axios" and fetch'],
  ['dep-retry-lib', '"p-retry\'s the move" and retry'],
  ['dep-dotenv-lib', '"dotenv does this" and read a `.env` file'],
];
const ARMS = ['baseline', 'ponytail', 'razor'];
const HEAD = { baseline: 'no plugin', ponytail: 'ponytail', razor: 'razor' };

const runDir = process.argv[2];
if (!runDir) { console.error('usage: node tables.js <run-dir>'); process.exit(1); }
const rows = JSON.parse(fs.readFileSync(path.join(runDir, 'results.json'), 'utf8')).results;

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const cells = (job, arm, model) => rows.filter((r) => r.task === job && r.arm === arm && r.model === model);

for (const model of ['sonnet', 'opus']) {
  console.log(`\n**On Claude ${model === 'sonnet' ? 'Sonnet' : 'Opus'}**\n`);
  console.log(`| Coding job | ${ARMS.map((a) => HEAD[a]).join(' | ')} |`);
  console.log('| --- | --- | --- | --- |');
  for (const [job, label] of JOBS) {
    const vals = ARMS.map((a) => {
      const c = cells(job, a, model);
      return { arm: a, loc: median(c.map((r) => r.total_loc)), clean: c.every((r) => r.correct === 1 && r.safe === 1) };
    });
    const low = Math.min(...vals.map((v) => v.loc));
    const out = vals.map((v) => `${v.loc === low ? `**${v.loc}**` : v.loc}${v.clean ? '' : '†'}`);
    console.log(`| ${label} | ${out.join(' | ')} |`);
  }
  const avgs = ARMS.map((a) => {
    const c = rows.filter((r) => r.arm === a && r.model === model && JOBS.some(([j]) => j === r.task));
    return { arm: a, avg: c.reduce((s, r) => s + r.total_loc, 0) / c.length };
  });
  const lowAvg = Math.min(...avgs.map((v) => v.avg));
  console.log(`| Average across the set | ${avgs.map((v) => {
    const t = v.avg.toFixed(1);
    return v.avg === lowAvg ? `**${t}**` : t;
  }).join(' | ')} |`);
}

// headline figures the surrounding prose quotes
for (const model of ['sonnet', 'opus']) {
  for (const arm of ARMS) {
    const c = rows.filter((r) => r.arm === arm && r.model === model);
    const bad = c.filter((r) => r.correct !== 1).length;
    const unsafe = c.filter((r) => r.safe !== 1).length;
    const inst = c.reduce((s, r) => s + (r.install_attempts || 0), 0);
    const cost = c.reduce((s, r) => s + (r.cost || 0), 0) / c.length;
    console.error(`${model} ${arm.padEnd(9)} n=${c.length} wrong=${bad} unsafe=${unsafe} installs=${inst} $/session=${cost.toFixed(4)}`);
  }
}
