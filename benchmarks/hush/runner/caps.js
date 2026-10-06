#!/usr/bin/env node
'use strict';
// Cap conformance: does the message hush actually shipped obey the limits
// hush's own output style states?
//
// The harness already reports what a session cost and how much it said. It has
// never reported whether the one final message honors its own contract — the
// per-sentence word cap, the per-block word cap, the banned punctuation. This scores that
// from `finalText`, a field every run record already carries, so it needs no
// new batch and costs nothing to run.
//
// KNOWN CEILING, and it matters. This is a regex pass over markdown, not a
// parser. It cannot see whether a sentence was long because the reader asked
// for depth, it splits sentences on punctuation so an abbreviation mid-line can
// end a unit early, and it makes one judgment call the style does not make: a
// fenced block is exempt from every count, because fenced blocks are where
// `Never compress` content lives. Numbers from this file are comparable between
// two arms scored by the same version. They are NOT a verdict on the style
// contract, and this file must never become the definition of the caps — the
// style prose is that definition, and this is a second, independent reading of
// it. Where the two disagree, the style wins and this file is wrong.
//
// Deliberately not wired into report.js or publish.js: those build the public
// claims, and this meter is a second reading of the contract, not the contract.
//
//   node runner/caps.js --records ../../.private/benchmarks/hush/records/claims2-sonnet-4c486329
//   node runner/caps.js --tag full

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(require('../../paths.js').dataDir('hush'), 'results');
// The same hush checkout metrics.js reads.
const STYLE = path.join(require('../../paths.js').pluginDir('hush'), 'output-styles', 'hush.md');

// --- the caps, read from the style rather than copied out of it --------------
// verify-style.js already treats the canonical style file as the source of
// truth for every invariant. Same rule here: a cap hard-coded in this file
// would keep scoring the old number after someone changed the style, and no
// test would notice. Parsing throws instead, loudly, at the one place that
// knows both numbers.
function readCaps(styleText) {
  const wordCap = styleText.match(/(\d+) words per sentence, tops/);
  const blockCap = styleText.match(/(\d+) words per block, tops/);
  if (!wordCap || !blockCap) {
    throw new Error('caps.js: could not read the sentence and block caps from the style file — the wording changed, so update this parser rather than guessing');
  }
  return { wordCap: Number(wordCap[1]), blockCap: Number(blockCap[1]) };
}

function loadCaps() {
  return readCaps(fs.readFileSync(STYLE, 'utf8'));
}

// --- one message ------------------------------------------------------------

// The match takes the line break after the closing fence too, so removing a
// fence leaves no blank line where the style's text had none.
const FENCE = /```[\s\S]*?(?:```[ \t]*\n?|$)/g;
// A fence that opens and closes on one line is inline code, not a block.
const INLINE_FENCE = /^```[^\n]*```/;

/** Inline code is one word (a path is a name, not a sentence). Also the one
 *  place punctuation inside an identifier must not be mistaken for prose. */
const collapseCode = (s) => s.replace(/`[^`\n]+`/g, 'X');

/** A markdown link reads as its label — the target in parentheses is plumbing,
 *  not prose, so it must not count as words or as a parenthetical aside. */
const collapseLinks = (s) => s.replace(/\[([^\]\n]*)\]\(([^)\s]*)\)/g, '$1');

const countWords = (s) => (collapseCode(s).match(/\S+/g) || []).length;

/**
 * The units the sentence cap applies to. The style counts words per sentence
 * and says a table cell and a list item work the same way, so a bullet holding
 * two sentences is two units, and so is a table cell holding two.
 *
 * Headings are not sentences. With `cells` false, table rows are skipped too:
 * blocksOf() uses that, because the style offers a table as the way out of a
 * long block.
 */
function unitsOf(prose, cells = true) {
  const out = [];
  const pushSentences = (body) => {
    // A sentence may close inside markup — the style asks for a bold topic
    // lead, so "**Fixed it.** Here is why." is two sentences with `**` sitting
    // between the period and the space. Let the closers through or the two
    // merge into one unit and score as a single long sentence.
    for (const piece of body.split(/(?<=[.!?][*_`"')\]]*)\s+/)) {
      const unit = piece.trim();
      if (unit) out.push(unit);
    }
  };
  for (const raw of prose.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('|')) {                         // table row
      if (!cells) continue;
      for (const cell of line.replace(/^\||\|$/g, '').split(/(?<!\\)\|/)) {
        if (!/^[-:\s]*$/.test(cell)) pushSentences(cell.trim()); // skip separators
      }
      continue;
    }
    if (/^#{1,6}\s/.test(line)) continue;               // heading
    const body = line.replace(/^>\s*/, '').replace(/^([-*+]|\d+\.)\s+/, '').trim();
    if (!body || /^[-|:\s]+$/.test(body)) continue;     // bare marker
    pushSentences(body);
  }
  return out;
}

/**
 * Word count of each block. The style says a block is the text between two
 * blank lines, so a whole list is one block. A block counts the words of its
 * sentence units, but table rows and headings add nothing: the style offers a
 * table as the way out of a long block. A fenced block is exempt from the
 * count, like every other count here, but it does not end a block: prose
 * above and below a fence with no blank line between is one block.
 */
function blocksOf(prose) {
  return prose.split(/\n[ \t]*\n/)
    .map((block) => unitsOf(block, false).reduce((n, u) => n + countWords(u), 0))
    .filter((words) => words > 0);
}

/** Score one final message against one set of caps. */
function analyzeMessage(text, caps) {
  const src = String(text || '');
  const fenced = (src.match(FENCE) || []).filter((m) => !INLINE_FENCE.test(m));
  // Inline code reads as one word. A fence opened after text on its line leaves
  // a line break, so the text before it never joins the text after it into one
  // sentence; one opened after indentation alone leaves nothing, so no
  // whitespace-only line splits its block.
  const prose = collapseLinks(src.replace(FENCE, (m, at) => {
    if (INLINE_FENCE.test(m)) return m.endsWith('\n') ? 'X\n' : 'X';
    return /\S/.test(src.slice(src.lastIndexOf('\n', at - 1) + 1, at)) ? '\n' : '';
  }));

  const blocks = blocksOf(prose);
  const units = unitsOf(prose).map((text) => ({ text, words: countWords(text) }));
  const over = units.filter((u) => u.words > caps.wordCap);
  const longest = units.reduce((w, u) => (w === null || u.words > w.words ? u : w), null);

  // Banned marks, counted outside inline code so a `a;b` identifier is not a
  // semicolon and `fn(x)` is not an aside.
  const bare = collapseCode(prose);

  return {
    blocks: blocks.length,
    overBlockCap: blocks.filter((words) => words > caps.blockCap).length,
    longestBlockWords: blocks.length ? Math.max(...blocks) : 0,
    units: units.length,
    overWordCap: over.length,
    semicolons: (bare.match(/;/g) || []).length,
    // razor: a one-character group like "(a)" is read as an enumeration label
    // and not counted, so this under-reports the style's literal wording. The
    // rule bans the mark because it smuggles a second fact, and a single letter
    // smuggles none. Upgrade path if that judgment ever needs testing: drop the
    // {2,} and report both counts side by side.
    parenUnits: units.filter((u) => /\([^)]{2,}\)/.test(collapseCode(u.text))).length,
    fencedBlocks: fenced.length,
    longestWords: longest ? longest.words : 0,
    longestText: longest ? longest.text : '',
    // The over-cap shape matters more than the count: a message one word over
    // is a rounding argument, one at triple the cap is a different rule.
    overBands: bands(over.map((u) => u.words), caps.wordCap),
  };
}

function bands(lengths, cap) {
  const out = { [`${cap + 1}-${cap + 5}`]: 0, [`${cap + 6}-${2 * cap}`]: 0, [`${2 * cap + 1}-${3 * cap}`]: 0, [`${3 * cap + 1}+`]: 0 };
  const keys = Object.keys(out);
  for (const n of lengths) {
    if (n > 3 * cap) out[keys[3]]++;
    else if (n > 2 * cap) out[keys[2]]++;
    else if (n > cap + 5) out[keys[1]]++;
    else out[keys[0]]++;
  }
  return out;
}

// --- many records -----------------------------------------------------------

const sum = (rows, key) => rows.reduce((n, r) => n + r[key], 0);

/**
 * arm -> totals, plus the single worst sentence and the tasks that carry the
 * breaches. A rate needs its denominator beside it, so units ships with every
 * count that is measured per unit.
 */
function capReport(records, caps) {
  const scored = [];
  for (const r of records) {
    if (!r || r.error || !r.finalText) continue;
    scored.push({ arm: r.arm, task: r.task, segment: r.segment || 'unsegmented', ...analyzeMessage(r.finalText, caps) });
  }

  const arms = {};
  for (const arm of [...new Set(scored.map((s) => s.arm))]) {
    const rows = scored.filter((s) => s.arm === arm);
    const worst = rows.reduce((w, s) => (w === null || s.longestWords > w.longestWords ? s : w), null);
    const byTask = {};
    for (const s of rows) if (s.overWordCap) byTask[s.task] = (byTask[s.task] || 0) + s.overWordCap;
    const overBands = {};
    for (const s of rows) for (const [band, n] of Object.entries(s.overBands)) overBands[band] = (overBands[band] || 0) + n;

    arms[arm] = {
      runs: rows.length,
      units: sum(rows, 'units'),
      overWordCap: sum(rows, 'overWordCap'),
      overWordCapPct: rows.length ? (100 * sum(rows, 'overWordCap')) / Math.max(1, sum(rows, 'units')) : NaN,
      blocks: sum(rows, 'blocks'),
      overBlockCap: sum(rows, 'overBlockCap'),
      semicolons: sum(rows, 'semicolons'),
      parenUnits: sum(rows, 'parenUnits'),
      overBands,
      worst: worst ? { task: worst.task, words: worst.longestWords, text: worst.longestText } : null,
      overWordCapByTask: Object.fromEntries(Object.entries(byTask).sort((a, b) => b[1] - a[1])),
    };
  }
  return { caps, runs: scored.length, arms };
}

// --- CLI --------------------------------------------------------------------

function readRecordsDir(dir) {
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'batch.json')
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

function main() {
  const argv = process.argv.slice(2);
  const at = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : null);
  const tag = at('--tag');
  const recordsArg = at('--records');
  const dir = recordsArg
    ? path.resolve(ROOT, recordsArg)
    : tag
      ? path.join(RESULTS, tag, 'runs')
      : null;
  if (!dir) {
    console.error('Usage: caps.js --records <dir> | --tag <tag>');
    process.exit(1);
  }

  const caps = loadCaps();
  const report = capReport(readRecordsDir(dir), caps);
  const baselineFirst = Object.keys(report.arms).sort(
    (a, b) => (a === 'baseline' ? -1 : b === 'baseline' ? 1 : a.localeCompare(b)));

  console.log(`cap conformance — ${path.relative(ROOT, dir)}`);
  console.log(`caps read from the style: ${caps.wordCap} words per sentence, ${caps.blockCap} words per block\n`);
  console.log(['arm', 'runs', 'units', `>${caps.wordCap}w`, 'rate', 'blocks', `>${caps.blockCap}w blocks`, ';', '(aside)', 'longest'].join('\t'));
  for (const arm of baselineFirst) {
    const a = report.arms[arm];
    console.log([
      arm, a.runs, a.units, a.overWordCap, `${a.overWordCapPct.toFixed(1)}%`,
      a.blocks, a.overBlockCap, a.semicolons, a.parenUnits, `${a.worst?.words ?? 0}w`,
    ].join('\t'));
  }
  for (const arm of baselineFirst) {
    const a = report.arms[arm];
    console.log(`\n${arm}: over-cap bands ${JSON.stringify(a.overBands)}`);
    console.log(`${arm}: over-cap sentences by task ${JSON.stringify(a.overWordCapByTask)}`);
    if (a.worst) console.log(`${arm}: longest [${a.worst.words}w ${a.worst.task}] ${a.worst.text}`);
  }
}

if (require.main === module) main();

module.exports = { readCaps, loadCaps, analyzeMessage, capReport, unitsOf, countWords };
