#!/usr/bin/env node
'use strict';
// Mechanical plainness report for a tag: Flesch-Kincaid grade level and
// complex-word share of what the user reads (all turns' deliverables), with
// code spans / identifiers / paths stripped first so only the prose is graded.
//
//   node plain-report.js --tag X

const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const tag = flag('tag', 'dev');

const runsDir = path.resolve(__dirname, '..', 'results', tag, 'runs');
const runs = fs.readdirSync(runsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf8')))
  .filter((r) => !r.error);

function stripToProse(text) {
  return (text || '')
    .replace(/```[\s\S]*?```/g, ' ')          // fenced code
    .replace(/`[^`]*`/g, ' ')                 // inline code
    .replace(/https?:\/\/\S+/g, ' ')          // URLs
    .replace(/\S*[\\/]\S*/g, ' ')             // paths
    .replace(/\S+\.(js|ts|json|md|jsonl|log|txt|py|svg)\b/gi, ' ') // bare filenames
    .replace(/[*_#>|]/g, ' ')                 // markdown furniture
    .replace(/[→←—-]+/g, ' ');
}

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]e|ed|es)$/, '');
  const groups = (stripped.match(/[aeiouy]{1,2}/g) || []).length;
  return Math.max(1, groups);
}

function grade(text) {
  const prose = stripToProse(text);
  const sentences = prose.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 2);
  const words = prose.match(/[a-zA-Z]+(?:'[a-z]+)?/g) || [];
  if (!sentences.length || words.length < 10) return null;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const complex = words.filter((w) => syllables(w) >= 3).length;
  return {
    fk: 0.39 * (words.length / sentences.length) + 11.8 * (syl / words.length) - 15.59,
    wordsPerSentence: words.length / sentences.length,
    complexPct: (complex / words.length) * 100,
    words: words.length,
  };
}

// Two things the FK grade cannot see, both named directly in the goal for this
// style: words a tired reader would have to look up, and minimizers that imply
// they should already have known the thing.
const JARGON = /\b(instanti\w+|serializ\w+|deserializ\w+|idempotent\w*|memoiz\w+|determinis\w+|nondeterminis\w+|invariant\w*|canonical\w*|orthogonal\w*|coerc\w+|mutat\w+|dereferenc\w+|polymorph\w+|heuristic\w*|semantics?|granular\w+|abstract\w+|encapsulat\w+|propagat\w+|travers\w+|invok\w+|predicate\w*|transitive\w*|recursiv\w+|asynchron\w+|concurren\w+|latenc\w+|throughput|provenanc\w+|ambient\w*|ergonom\w+|primitive\w*|monoton\w+|normaliz\w+|sanitiz\w+|throttl\w+|debounc\w+|upstream|downstream|idiomatic\w*|agnostic\w*|opaque\w*|implicit\w*|arbitrar\w+|instrument\w+|surfac(?:e|es|ing)|delta|regression\w*)\b/gi;
const MINIMIZERS = /\b(as you know|obviously|of course|simply|just|merely|trivial\w*|straightforward\w*|recall that|note that|clearly|naturally|should be familiar)\b/gi;

function friction(text) {
  const prose = stripToProse(text);
  const words = (prose.match(/[a-zA-Z]+(?:'[a-z]+)?/g) || []).length;
  if (words < 10) return null;
  return {
    jargonPer100: ((prose.match(JARGON) || []).length / words) * 100,
    minimizersPer100: ((prose.match(MINIMIZERS) || []).length / words) * 100,
  };
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const arms = [...new Set(runs.map((r) => r.arm))];
const tasks = [...new Set(runs.map((r) => r.task))];
const pad = (s, n) => String(s).padEnd(n);

console.log(`tag=${tag}  runs=${runs.length}\n`);
console.log('Flesch-Kincaid grade of the prose the user reads — per-rep spread in brackets\n');
console.log(pad('task', 20) + arms.map((a) => pad(a, 30)).join(''));
for (const t of tasks) {
  let line = pad(t, 20);
  for (const a of arms) {
    const gs = runs.filter((r) => r.task === t && r.arm === a)
      .map((r) => grade((r.finalTexts || [r.finalText]).join('\n')))
      .filter(Boolean);
    const v = gs.map((g) => g.fk.toFixed(1));
    line += pad(`${mean(gs.map((g) => g.fk)).toFixed(1)}  [${v.join(' ')}]`, 30);
  }
  console.log(line);
}

console.log('\nper arm (prose only, code spans stripped)');
for (const a of arms) {
  const mine = runs.filter((r) => r.arm === a);
  const text = (r) => (r.finalTexts || [r.finalText]).join('\n');
  const gs = mine.map((r) => grade(text(r))).filter(Boolean);
  const fr = mine.map((r) => friction(text(r))).filter(Boolean);
  console.log(
    `  ${pad(a, 10)} FK grade=${mean(gs.map((g) => g.fk)).toFixed(2)}  ` +
    `words/sentence=${mean(gs.map((g) => g.wordsPerSentence)).toFixed(1)}  ` +
    `complex-words=${mean(gs.map((g) => g.complexPct)).toFixed(1)}%  (n=${gs.length})`
  );
  console.log(
    `  ${pad('', 10)} jargon/100w=${mean(fr.map((f) => f.jargonPer100)).toFixed(2)}  ` +
    `minimizers/100w=${mean(fr.map((f) => f.minimizersPer100)).toFixed(2)}  ` +
    `read-words=${mean(mine.map((r) => r.finalWordsAll ?? r.finalWords ?? 0)).toFixed(0)}  ` +
    `narration=${mean(mine.map((r) => r.narrationWords ?? 0)).toFixed(1)}  ` +
    `pass=${mine.filter((r) => r.check?.pass).length}/${mine.length}`
  );
}
