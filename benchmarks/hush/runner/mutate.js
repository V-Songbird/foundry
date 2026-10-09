#!/usr/bin/env node
'use strict';
// Mutation check: do the free meters notice when a report is made wrong, and
// hold still when it is only reworded?
//
// A meter earns trust when a planted error lowers it and a harmless rewrite
// leaves it alone. This file plants both kinds, by code, in copies of retained
// final messages, and counts how often each meter moved the wrong way.
//
//   error families     delete-fact, delete-branch-arm, flip-status,
//                      alter-path, alter-line, add-false-claim
//   harmless families  add-true-claim, paraphrase, compress
//
// For an error family the rate is sensitivity: the share of mutants the meter
// scored worse than the original. For a harmless family it is specificity: the
// share it did NOT score worse. Each cell counts only records where the family
// applied and the meter gave a number both times.
//
// Every mutation is a fixed text rewrite, so a rerun gives the same table. None
// reads the meters, so a meter cannot be tested against its own oracle:
// delete-fact removes the sentence with the most concrete tokens (code spans,
// links, numbers, file names), not the sentence a rubric pattern matches.
// Fenced code is never changed, and word rewrites skip inline code and link
// targets.
//
// Only meters that need no model run here. The judge meters (retention.js,
// truth.js, answerable.js, retold.js, criteria.js) need paid calls; --copy-to
// writes each family's mutants as records, under a batch id of their own, so a
// judge can be pointed at them later without reusing a cached verdict. A
// `tests` check runs code in the session's workspace, which no text mutation
// touches, so it is left out rather than reported as blind.
//
//   node runner/mutate.js --records ../../.private/benchmarks/hush/records/rivalA-762f888b
//   node runner/mutate.js --records <dir> [--records <dir>] [--by-task] [--copy-to <empty dir>]
//
// The keyword meter is only as sensitive as each task's rubric: crash-origin's
// rubric names the line, so alter-line can lower it there and nowhere else.
// --by-task prints the table once per task as well as pooled.

const fs = require('node:fs');
const path = require('node:path');
const { readRecords, hashRecord, HASH_FIELD } = require('./records.js');
const { runCheck } = require('./metrics.js');
const checks = require('./criteria-checks.js');
const caps = require('./caps.js');
const readability = require('./readability.js');
const structure = require('./structure.js');

const ROOT = path.resolve(__dirname, '..');
const TASKS = [
  ...JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks-criteria.json'), 'utf8')).tasks,
];

// --- text plumbing -----------------------------------------------------------

const FENCE = /```[\s\S]*?(?:```|$)/g;
// Inline code and link targets: names a word rewrite must not touch.
const CODE = /(`[^`\n]+`|\]\([^)\s]*\))/;
const EXT = '(?:js|cjs|mjs|ts|tsx|jsx|json|jsonl|md|log|csv|txt|yml|yaml|toml|py|sh|ps1|html|css|sql)';
const FILE = new RegExp(`(?<![\\w/\\\\.-])(?:[\\w.-]+[\\\\/])*[\\w-]+(?:\\.[\\w-]+)*\\.${EXT}(?![\\w-])`);
const FILE_LINE = new RegExp(`(${FILE.source})(:|#L)(\\d+)`);
// What a line opens with before its sentences: indentation, a quote, a marker.
const LEAD = /^(\s*(?:>\s*)?(?:(?:[-*+]|\d+[.)])\s+)?)(.*)$/;
// caps.js splits sentences the same way.
const SPLIT = /(?<=[.!?][*_`"')\]]*)\s+/;
const SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** fn over the text between fenced blocks; fences come back exactly as written. */
function mapProse(text, fn) {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(FENCE)) {
    out += fn(text.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + fn(text.slice(last));
}

/** fn over prose words only: fences, inline code and link targets are kept. */
const mapPlain = (text, fn) => mapProse(text, (p) => p.split(CODE).map((s, i) => (i % 2 ? s : fn(s))).join(''));

/** The text with every fence blanked, so a search never lands in code. */
const unfenced = (text) => text.replace(FENCE, (m) => ' '.repeat(m.length));

/** Each line's kind: fence, blank, table, heading, item or prose. */
function classify(lines) {
  let inFence = false;
  return lines.map((l) => {
    if (/^\s*```/.test(l)) {
      if (!/^\s*```.*```/.test(l)) inFence = !inFence; // a one-line fence opens nothing
      return 'fence';
    }
    if (inFence) return 'fence';
    if (!l.trim()) return 'blank';
    if (/^\s*\|/.test(l)) return 'table';
    if (/^\s*#{1,6}\s/.test(l)) return 'heading';
    if (/^\s*(?:>\s*)?(?:[-*+]|\d+[.)])\s+\S/.test(l)) return 'item';
    return 'prose';
  });
}

const indent = (l) => l.match(/^\s*/)[0].length;
const CONCRETE = new RegExp(`\`[^\`\\n]+\`|\\[[^\\]\\n]+\\]\\([^)\\s]+\\)|\\b\\d[\\d.,:]*\\b|${FILE.source}`, 'g');
const concrete = (s) => (s.match(CONCRETE) || []).length;

/** Swap whole words from a lower-case table, keeping a leading capital. */
function swapper(table, { once = false } = {}) {
  const re = new RegExp(`\\b(${Object.keys(table).sort((a, b) => b.length - a.length).map(esc).join('|')})\\b`, 'gi');
  return (text) => {
    let done = false;
    const out = mapPlain(text, (s) => s.replace(re, (w) => {
      if (once && done) return w;
      done = true;
      const to = table[w.toLowerCase()];
      return to && /^[A-Z]/.test(w) ? to[0].toUpperCase() + to.slice(1) : to;
    }));
    return done ? out : null;
  };
}

// --- the mutations -----------------------------------------------------------

/** Drop the one sentence carrying the most concrete tokens. */
function deleteFact(text) {
  const lines = text.split('\n');
  const kinds = classify(lines);
  let best = null;
  lines.forEach((line, i) => {
    if (kinds[i] !== 'prose' && kinds[i] !== 'item') return;
    const [, lead, body] = line.match(LEAD);
    const parts = body.split(SPLIT);
    parts.forEach((s, j) => {
      const n = concrete(s);
      if (n && (!best || n > best.n)) best = { i, j, n, lead, parts };
    });
  });
  if (!best) return null;
  const rest = best.parts.filter((_, j) => j !== best.j).join(' ');
  if (rest.trim()) lines[best.i] = best.lead + rest; else lines.splice(best.i, 1);
  return lines.join('\n');
}

/** Drop the second arm of the first list or table that has at least two. */
function deleteBranchArm(text) {
  const lines = text.split('\n');
  const kinds = classify(lines);
  for (let i = 0; i < lines.length; i++) {
    if (kinds[i] === 'table') {
      let end = i;
      while (end < lines.length && kinds[end] === 'table') end++;
      const rows = [];
      for (let k = i; k < end; k++) if (!SEPARATOR.test(lines[k])) rows.push(k);
      // A header is a header only when a separator row follows it.
      const body = end > i + 1 && SEPARATOR.test(lines[i + 1]) ? rows.slice(1) : rows;
      if (body.length >= 2) { lines.splice(body[1], 1); return lines.join('\n'); }
      i = end - 1;
      continue;
    }
    if (kinds[i] !== 'item') continue;
    // The next item at the same depth, past blank lines and deeper continuation lines.
    let k = i + 1;
    while (k < lines.length && (kinds[k] === 'blank' || (kinds[k] !== 'item' && kinds[k] !== 'table' && kinds[k] !== 'heading' && indent(lines[k]) > indent(lines[i])))) k++;
    if (k < lines.length && kinds[k] === 'item' && indent(lines[k]) === indent(lines[i])) {
      let stop = k + 1;
      while (stop < lines.length && kinds[stop] === 'prose' && indent(lines[stop]) > indent(lines[k])) stop++;
      lines.splice(k, stop - k);
      return lines.join('\n');
    }
  }
  return null;
}

const flipStatus = swapper({
  pass: 'fail', fail: 'pass', passes: 'fails', fails: 'passes', passed: 'failed', failed: 'passed',
  passing: 'failing', failing: 'passing', green: 'red', red: 'green', succeeded: 'failed',
  success: 'failure', failure: 'success', fixed: 'broken', broken: 'fixed', safe: 'unsafe',
  unsafe: 'safe', healthy: 'unhealthy', unhealthy: 'healthy', resolved: 'unresolved',
  unresolved: 'resolved', works: 'fails',
}, { once: true });

/** Rename the first file the prose names, everywhere it names it. */
function alterPath(text) {
  const m = unfenced(text).match(FILE);
  if (!m) return null;
  const file = m[0];
  const ext = path.extname(file);
  const wrong = `${file.slice(0, -ext.length)}-utils${ext}`;
  const re = new RegExp(`(?<![\\w/\\\\.-])${esc(file)}(?![\\w-])`, 'g');
  return mapProse(text, (p) => p.replace(re, wrong));
}

/** Move the first cited line number by seven, everywhere it is cited. */
function alterLine(text) {
  const plain = unfenced(text);
  const m = plain.match(FILE_LINE);
  if (m) {
    const [, file, , n] = m;
    const re = new RegExp(`(?<![\\w/\\\\.-])${esc(file)}(:|#L)${n}(?!\\d)`, 'g');
    return mapProse(text, (p) => p.replace(re, (_, sep) => `${file}${sep}${Number(n) + 7}`));
  }
  const l = plain.match(/\bline (\d+)\b/i);
  if (!l) return null;
  return mapProse(text, (p) => p.replace(new RegExp(`\\b(line) ${l[1]}\\b`, 'gi'), (_, w) => `${w} ${Number(l[1]) + 7}`));
}

// Invented work: a fix in a file no fixture holds.
const FAKE_FILE = 'src/legacy/cache.js';
const FALSE_CLAIM = `I also fixed a second bug in [${FAKE_FILE}:12](${FAKE_FILE}:12).`;
// True of the task folder and useless to the reader, with a link that resolves,
// so it differs from the false claim in truth, not in shape.
const trueClaim = (files) => `The task folder holds ${files.length} files, among them [${files[0]}](${files[0]}).`;
const addClaim = (text, sentence) => `${text.trimEnd()}\n\n${sentence}`;

const paraphrase = swapper({
  because: 'since', however: 'but', every: 'each', start: 'begin', starts: 'begins', started: 'began',
  shows: 'indicates', showed: 'indicated', 'need to': 'have to', 'needs to': 'has to', 'look at': 'inspect',
  big: 'large', whole: 'entire', probably: 'likely', maybe: 'perhaps', many: 'numerous',
  'the issue': 'the problem', 'the problem': 'the issue', check: 'verify', checks: 'verifies', checked: 'verified',
  real: 'genuine',
});

// A filler goes with the comma and space after it, so no gap is left behind.
// "just" and "only" stay: in a report they usually restrict, not pad.
const FILLER = /\b(?:really|actually|basically|simply|very|quite|essentially|literally|definitely|clearly|obviously)\b,? ?/gi;
const shorten = swapper({
  'in order to': 'to', 'a lot of': 'many', 'is able to': 'can', 'are able to': 'can',
  'due to the fact that': 'because', 'do not': "don't", 'does not': "doesn't", 'did not': "didn't",
  'is not': "isn't", 'are not': "aren't", 'was not': "wasn't", cannot: "can't", 'it is': "it's",
  'there is': "there's", 'that is': "that's",
});
function compress(text) {
  const cut = mapPlain(text, (s) => s.replace(FILLER, ''));
  return shorten(cut) ?? (cut !== text ? cut : null);
}

const FAMILIES = [
  { id: 'delete-fact', kind: 'error', apply: deleteFact },
  { id: 'delete-branch-arm', kind: 'error', apply: deleteBranchArm },
  { id: 'flip-status', kind: 'error', apply: flipStatus },
  { id: 'alter-path', kind: 'error', apply: alterPath },
  { id: 'alter-line', kind: 'error', apply: alterLine },
  { id: 'add-false-claim', kind: 'error', apply: (t, ctx) => (ctx.files.includes(FAKE_FILE) ? null : addClaim(t, FALSE_CLAIM)) },
  { id: 'add-true-claim', kind: 'harmless', apply: (t, ctx) => (ctx.files.length ? addClaim(t, trueClaim(ctx.files)) : null) },
  { id: 'paraphrase', kind: 'harmless', apply: paraphrase },
  { id: 'compress', kind: 'harmless', apply: compress },
];

// --- the meters ----------------------------------------------------------------

const keywordCheck = (t, ctx) => (ctx.task?.check?.type === 'keywords' ? runCheck(ctx.task.check, t, null) : null);
const METERS = [
  { id: 'keywords', better: 'higher', of: (t, ctx) => keywordCheck(t, ctx)?.score ?? null },
  { id: 'keyword-pass', better: 'higher', of: (t, ctx) => { const c = keywordCheck(t, ctx); return c ? Number(c.pass) : null; } },
  { id: 'link-missing', better: 'lower', of: (t, ctx) => (ctx.files.length ? checks.targetsExist(checks.references(t).targets, ctx.files).missing.length : null) },
  { id: 'link-coverage', better: 'higher', of: (t) => checks.references(t).coverage },
  { id: 'cap-breaches', better: 'lower', of: (t, ctx) => { const a = caps.analyzeMessage(t, ctx.caps); return a.overWordCap + a.overBlockCap + a.semicolons + a.parenUnits; } },
  { id: 'reading-ease', better: 'higher', of: (t) => readability.analyzeMessage(t).ease },
  { id: 'structure-band', better: 'higher', of: (t) => { const s = structure.analyzeMessage(t); return s.boldInBand + s.blocksInBand; } },
];

// --- many records ------------------------------------------------------------

const EPS = 1e-9;

/**
 * family -> { kind, applied, meters: meter -> { n, worse, better } }.
 * onMutant(record, family, text) sees every mutant, for --copy-to.
 */
function mutationReport(records, { caps: capsCfg = caps.loadCaps(), onMutant = null } = {}) {
  const files = new Map();
  const contextOf = (taskId) => {
    const task = TASKS.find((t) => t.id === taskId) || null;
    const dir = task?.fixture ? path.join(ROOT, 'fixtures', task.fixture) : null;
    if (dir && !files.has(dir)) files.set(dir, checks.fixtureFiles(dir).sort());
    return { task, files: dir ? files.get(dir) : [], caps: capsCfg };
  };
  const families = Object.fromEntries(FAMILIES.map((f) => [f.id, {
    kind: f.kind, applied: 0, meters: Object.fromEntries(METERS.map((m) => [m.id, { n: 0, worse: 0, better: 0 }])),
  }]));
  let scored = 0;
  for (const r of records) {
    if (!r || r.error || !r.finalText) continue;
    scored++;
    const ctx = contextOf(r.task);
    const base = METERS.map((m) => m.of(r.finalText, ctx));
    for (const f of FAMILIES) {
      const text = f.apply(r.finalText, ctx);
      if (text == null || text === r.finalText) continue;
      const cell = families[f.id];
      cell.applied++;
      if (onMutant) onMutant(r, f.id, text);
      METERS.forEach((m, i) => {
        const after = m.of(text, ctx);
        if (base[i] == null || after == null) return;
        const c = cell.meters[m.id];
        c.n++;
        const gain = m.better === 'higher' ? after - base[i] : base[i] - after;
        if (gain < -EPS) c.worse++;
        else if (gain > EPS) c.better++;
      });
    }
  }
  return { records: scored, families };
}

/** Sensitivity for an error family, specificity for a harmless one; null with no comparable record. */
const rate = (kind, c) => (c.n ? (kind === 'error' ? c.worse / c.n : 1 - c.worse / c.n) : null);

/** Write one mutant as a record of its own batch, so no judge cache confuses it with the original. */
function writeMutant(dir, record, family, text) {
  const rec = { ...record, batchId: `${record.batchId}~${family}`, mutation: family, finalText: text };
  rec[HASH_FIELD] = hashRecord(rec);
  fs.mkdirSync(path.join(dir, family), { recursive: true });
  fs.writeFileSync(path.join(dir, family, `${record.key}.json`), JSON.stringify(rec, null, 2) + '\n', { flag: 'wx' });
}

// --- CLI ---------------------------------------------------------------------

const pct = (x) => (x == null ? '-' : `${(100 * x).toFixed(1)}%`);

function main() {
  const argv = process.argv.slice(2);
  const dirs = argv.flatMap((a, i) => (a === '--records' && argv[i + 1] ? [path.resolve(ROOT, argv[i + 1])] : []));
  const copyArg = argv.includes('--copy-to') ? argv[argv.indexOf('--copy-to') + 1] : null;
  if (!dirs.length) {
    console.error('Usage: mutate.js --records <dir> [--records <dir>] [--by-task] [--copy-to <empty dir>]');
    process.exit(1);
  }
  const copyTo = copyArg ? path.resolve(copyArg) : null;
  if (copyTo) {
    // Retained records are evidence: mutants never land beside them.
    if (dirs.some((d) => !path.relative(d, copyTo).startsWith('..') && !path.isAbsolute(path.relative(d, copyTo)))) {
      console.error(`--copy-to ${copyTo} sits inside a --records folder; pick a scratch folder`);
      process.exit(1);
    }
    if (fs.existsSync(copyTo) && fs.readdirSync(copyTo).length) {
      console.error(`--copy-to ${copyTo} is not empty`);
      process.exit(1);
    }
  }
  const records = dirs.flatMap((d) => readRecords(d).runs);
  const report = mutationReport(records, { onMutant: copyTo ? (r, f, t) => writeMutant(copyTo, r, f, t) : null });

  console.log(`mutation check — ${dirs.map((d) => path.relative(ROOT, d)).join(', ')}`);
  printReport('all tasks', report);
  // Rubrics differ per task, so a pooled rate can hide a task whose rubric does catch a family.
  if (argv.includes('--by-task')) {
    for (const task of [...new Set(records.map((r) => r?.task))].filter(Boolean).sort()) {
      printReport(task, mutationReport(records.filter((r) => r?.task === task)));
    }
  }
  if (copyTo) console.log(`\nmutants written under ${copyTo}, one folder per family`);
}

function printReport(label, report) {
  console.log(`\n== ${label}: ${report.records} records`);
  console.log('cells: mutants scored worse / mutants the meter scored both times\n');
  const head = ['family', 'kind', 'applied', ...METERS.map((m) => m.id)];
  console.log(head.join('\t'));
  for (const [id, f] of Object.entries(report.families)) {
    console.log([id, f.kind, f.applied, ...METERS.map((m) => `${f.meters[m.id].worse}/${f.meters[m.id].n}`)].join('\t'));
  }
  console.log('\nsensitivity (error families) and specificity (harmless families)\n');
  console.log(head.join('\t'));
  for (const [id, f] of Object.entries(report.families)) {
    console.log([id, f.kind, f.applied, ...METERS.map((m) => pct(rate(f.kind, f.meters[m.id])))].join('\t'));
  }
}

if (require.main === module) main();

module.exports = {
  FAMILIES, METERS, FAKE_FILE, mutationReport, rate, writeMutant,
  deleteFact, deleteBranchArm, flipStatus, alterPath, alterLine, paraphrase, compress,
};
