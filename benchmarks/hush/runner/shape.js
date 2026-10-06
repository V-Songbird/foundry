#!/usr/bin/env node
// Mechanical shape of a batch's final messages, per arm.
//
//   node runner/shape.js --tag sf2 [--tag sf1 ...]
//
// Jev judges how a message reads. This counts what is physically in it, so a
// judged score can be checked against something that cannot drift: markdown
// links, table rows, bold marks, code fences, words, and whether the first
// line is a verdict or a preamble. When the two disagree, the disagreement is
// the finding.

'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(require('../../paths.js').dataDir('hush'), 'results');
const tags = process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a === '--tag' && arr[i + 1]) acc.push(arr[i + 1]);
  return acc;
}, []);
if (!tags.length) { console.error('usage: node runner/shape.js --tag NAME [--tag NAME2]'); process.exit(2); }

const rows = [];
for (const tag of tags) {
  const dir = path.join(RESULTS, tag, 'runs');
  if (!fs.existsSync(dir)) { console.error(`no runs for tag ${tag}`); continue; }
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const t = r.finalText;
    if (!t) continue;
    const firstLine = t.split('\n').find((l) => l.trim()) || '';
    rows.push({
      tag, arm: r.arm, words: r.finalWords || 0,
      links: (t.match(/\[[^\]]+\]\([^)]+\)/g) || []).length,
      tableRows: (t.match(/^\|/gm) || []).length,
      bold: (t.match(/\*\*[^*]+\*\*/g) || []).length,
      fences: (t.match(/^```/gm) || []).length / 2,
      lines: t.split('\n').filter((l) => l.trim()).length,
      // A verdict line names an outcome. A preamble names the work, or is a
      // markdown heading with nothing decided in it.
      verdictFirst: /\*\*/.test(firstLine) && !/^#/.test(firstLine) ? 1 : 0,
      nextLine: /(^|\n)\s*(\*\*)?Next:/.test(t) ? 1 : 0,
    });
  }
}

const byArm = {};
for (const r of rows) (byArm[`${r.tag}/${r.arm}`] ||= []).push(r);
const mean = (xs, k) => xs.reduce((a, b) => a + b[k], 0) / xs.length;

const keys = Object.keys(byArm).sort();
const w = Math.max(...keys.map((k) => k.length), 12);
console.log('arm'.padEnd(w) + '    n  words  lines  links  rows  bold  code  verdict1st  Next:');
for (const k of keys) {
  const g = byArm[k];
  console.log(
    k.padEnd(w) +
    String(g.length).padStart(5) +
    mean(g, 'words').toFixed(0).padStart(7) +
    mean(g, 'lines').toFixed(1).padStart(7) +
    mean(g, 'links').toFixed(1).padStart(7) +
    mean(g, 'tableRows').toFixed(1).padStart(6) +
    mean(g, 'bold').toFixed(1).padStart(6) +
    mean(g, 'fences').toFixed(1).padStart(6) +
    `${(mean(g, 'verdictFirst') * 100).toFixed(0)}%`.padStart(12) +
    `${(mean(g, 'nextLine') * 100).toFixed(0)}%`.padStart(7)
  );
}
