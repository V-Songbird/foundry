#!/usr/bin/env node
'use strict';
// Post-hoc final-message FORMAT analysis: the readability axis the token
// metrics are blind to. Deterministic proxies only, computed from each run
// record's stored finalText.   node runner/format-report.js --tag <tag>
//
//  boldLead   first non-empty line opens with **...** (outcome-first lead)
//  bullets    count of markdown bullet lines (- or *)
//  ticks      count of `backtick` spans (identifiers/paths/commands marked)
//  arrows     count of → outside backticks (arrow-chain telegraph indicator)
//  fnRatio    function-word ratio — articles/copulas/conjunctions over total
//             words; readable prose ~0.30+, telegraph fragments much lower
//  words      finalWords from the run record

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const tag = argv[argv.indexOf('--tag') + 1] || 'dev';
const dir = path.join(ROOT, 'results', tag, 'runs');

const FN_WORDS = new Set(('the a an is are was were be been being and or but so to of in on at ' +
  'for with by from as that which this these those it its').split(' '));

function analyze(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const lines = text.split('\n').filter((l) => l.trim());
  const noTicks = text.replace(/`[^`]*`/g, '');
  const words = noTicks.toLowerCase().match(/[a-z']+/g) || [];
  const fn = words.filter((w) => FN_WORDS.has(w)).length;
  return {
    boldLead: /^\s*\*\*[^*]/.test(lines[0] || ''),
    bullets: lines.filter((l) => /^\s*[-*]\s+\S/.test(l)).length,
    // bold labels introducing a section or a labeled one-liner: **Timeline:** / **Fix:** ...
    topicLeads: lines.filter((l) => /^\s*\*\*[^*\n]{1,40}:\*\*/.test(l)).length,
    ticks: (text.match(/`[^`]+`/g) || []).length,
    arrows: (noTicks.match(/→/g) || []).length,
    fnRatio: words.length ? fn / words.length : 0,
  };
}

const runs = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  .filter((r) => !r.error && r.finalText);

const arms = [...new Set(runs.map((r) => r.arm))].sort();
const tasks = [...new Set(runs.map((r) => r.task))].sort();
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pct = (x) => (x * 100).toFixed(0) + '%';

console.log(`final-message format — tag ${tag}, ${runs.length} runs\n`);
for (const task of tasks) {
  console.log(`== ${task} ==`);
  console.log('arm          n  boldLead  bullets  leads  ticks  arrows  fnRatio  finalWords');
  for (const arm of arms) {
    const rs = runs.filter((r) => r.task === task && r.arm === arm);
    const a = rs.map((r) => analyze(r.finalText)).filter(Boolean);
    if (!a.length) continue;
    console.log(
      arm.padEnd(12),
      String(rs.length).padStart(2),
      pct(mean(a.map((x) => (x.boldLead ? 1 : 0)))).padStart(8),
      mean(a.map((x) => x.bullets)).toFixed(1).padStart(8),
      mean(a.map((x) => x.topicLeads)).toFixed(1).padStart(6),
      mean(a.map((x) => x.ticks)).toFixed(1).padStart(6),
      mean(a.map((x) => x.arrows)).toFixed(1).padStart(7),
      mean(a.map((x) => x.fnRatio)).toFixed(2).padStart(8),
      mean(rs.map((r) => r.finalWords ?? NaN)).toFixed(0).padStart(11),
    );
  }
  console.log();
}
