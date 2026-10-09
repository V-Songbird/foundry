'use strict';

// Mutation check (runner/mutate.js). Local and pure, except one test that
// writes mutants to a temporary folder. No model call, no cost.
//
// Each family is pinned with a literal before-and-after, so a rewrite that
// drifts is caught here rather than in the sensitivity table.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  FAMILIES, mutationReport, rate, writeMutant,
  deleteFact, deleteBranchArm, flipStatus, alterPath, alterLine, paraphrase, compress,
} = require('../runner/mutate.js');
const { writeRecord, readRecords } = require('../runner/records.js');

const CAPS = { wordCap: 12, blockCap: 40 };

describe('each family is a fixed rewrite', () => {
  test('delete-fact drops the sentence with the most concrete tokens', () => {
    assert.strictEqual(
      deleteFact('Redis died. It refused `10.0.0.12:6379` at 02:14 in logs/app.log. Next: check it.'),
      'Redis died. Next: check it.');
    assert.strictEqual(deleteFact('- only `this` fact\n- plain words'), '- plain words');
    assert.strictEqual(deleteFact('Nothing concrete here.'), null);
  });

  test('delete-branch-arm drops the second table body row or list item', () => {
    assert.strictEqual(
      deleteBranchArm('| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n| 5 | 6 |'),
      '| a | b |\n|---|---|\n| 1 | 2 |\n| 5 | 6 |');
    assert.strictEqual(
      deleteBranchArm('Two arms:\n\n1. If Redis is up, restart.\n   Then watch it.\n\n2. Otherwise, fail over.\n   And page someone.\n3. Last.'),
      'Two arms:\n\n1. If Redis is up, restart.\n   Then watch it.\n\n3. Last.');
    assert.strictEqual(deleteBranchArm('| a | b |\n|---|---|\n| 1 | 2 |\n\n- one item'), null);
  });

  test('flip-status inverts the first status word outside code, keeping its capital', () => {
    assert.strictEqual(flipStatus('`failing` stays. Green: 625 passing, 0 failing.'),
      '`failing` stays. Red: 625 passing, 0 failing.');
    assert.strictEqual(flipStatus('No status word here.'), null);
  });

  test('alter-path renames the first file everywhere, link targets included', () => {
    assert.strictEqual(
      alterPath('[src/pricing.js:39](src/pricing.js:39) taxes it; see src/pricing.js and `lib/src/pricing.js`.'),
      '[src/pricing-utils.js:39](src/pricing-utils.js:39) taxes it; see src/pricing-utils.js and `lib/src/pricing.js`.');
    assert.strictEqual(alterPath('No file at all.'), null);
  });

  test('alter-line moves the first cited line by seven, in both link forms, or a bare "line N"', () => {
    assert.strictEqual(alterLine('[logs/app.log:182](logs/app.log#L182), not app.log:1820'),
      '[logs/app.log:189](logs/app.log#L189), not app.log:1820');
    assert.strictEqual(alterLine('It throws at line 14 of refresh.js.'), 'It throws at line 21 of refresh.js.');
    assert.strictEqual(alterLine('src/pricing.js has no line.'), null);
  });

  test('paraphrase and compress reword prose and leave code alone', () => {
    assert.strictEqual(paraphrase('The issue shows `every` failure because the problem started early.'),
      'The problem indicates `every` failure since the issue began early.');
    assert.strictEqual(compress('It is really `just` a fix in order to ship. Really, it does not matter.'),
      "It's `just` a fix to ship. it doesn't matter.");
    assert.strictEqual(compress('Nothing to cut.'), null);
  });

  test('no family changes a fenced block', () => {
    const fence = '```\nGreen: passing because it is really just src/a.js:3 at line 4\n- x\n- y\n```';
    const text = `Fixed src/b.js:9 at line 2, because it is really green.\n\n- one\n- two\n\n${fence}\n`;
    const ctx = { task: null, files: ['b.js'] };
    for (const f of FAMILIES) {
      const out = f.apply(text, ctx);
      assert.ok(out && out !== text, `${f.id} applies`);
      assert.ok(out.includes(fence), `${f.id} kept the fence`);
    }
  });
});

describe('mutationReport counts which way each meter moved', () => {
  // log-triage is a keywords task: redis, ECONNREFUSED|6379, cascade|storm|...
  const text = [
    '**Redis died.**',
    '',
    '`connect ECONNREFUSED 10.0.0.12:6379` at 02:14 in [logs/app.log:182](logs/app.log#L182).',
    '',
    'Then a cache miss storm.',
  ].join('\n');
  const report = mutationReport([{ task: 'log-triage', arm: 'a', finalText: text }, { error: 'x' }], { caps: CAPS });
  const f = report.families;

  test('a planted error lowers the meter that owns it', () => {
    assert.strictEqual(report.records, 1);
    // The densest sentence holds the only ECONNREFUSED|6379 hit.
    assert.deepStrictEqual(f['delete-fact'].meters.keywords, { n: 1, worse: 1, better: 0 });
    assert.deepStrictEqual(f['add-false-claim'].meters['link-missing'], { n: 1, worse: 1, better: 0 });
    // targetsExist strips the line, so a moved line is invisible to it.
    assert.deepStrictEqual(f['alter-line'].meters['link-missing'], { n: 1, worse: 0, better: 0 });
    assert.deepStrictEqual(f['alter-path'].meters['link-missing'], { n: 1, worse: 1, better: 0 });
  });

  test('a harmless addition with a real link leaves the link meter alone', () => {
    assert.deepStrictEqual(f['add-true-claim'].meters['link-missing'], { n: 1, worse: 0, better: 0 });
    assert.deepStrictEqual(f['add-true-claim'].meters.keywords, { n: 1, worse: 0, better: 0 });
  });

  test('a family that does not apply counts nothing', () => {
    assert.strictEqual(f['delete-branch-arm'].applied, 0);
    assert.strictEqual(f['delete-branch-arm'].meters.keywords.n, 0);
  });

  test('rate is sensitivity for errors and specificity for harmless rewrites', () => {
    assert.strictEqual(rate('error', { n: 4, worse: 3 }), 0.75);
    assert.strictEqual(rate('harmless', { n: 4, worse: 1 }), 0.75);
    assert.strictEqual(rate('error', { n: 0, worse: 0 }), null);
  });
});

test('a mutant is written as a record of its own batch and never overwrites', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutate-'));
  const src = path.join(dir, 'src');
  try {
    writeRecord(src, 'log-triage__a__r1', { key: 'log-triage__a__r1', batchId: 'b-1', task: 'log-triage', arm: 'a', finalText: 'Redis died.' }, { username: '', hosts: [] });
    const [record] = readRecords(src).runs;
    const out = path.join(dir, 'out');
    writeMutant(out, record, 'flip-status', 'Redis lived.');
    const [mutant] = readRecords(out).runs;
    assert.strictEqual(mutant.batchId, 'b-1~flip-status');
    assert.strictEqual(mutant.mutation, 'flip-status');
    assert.strictEqual(mutant.finalText, 'Redis lived.');
    assert.throws(() => writeMutant(out, record, 'flip-status', 'again'), /EEXIST/);
  } finally {
    try { fs.chmodSync(path.join(src, 'log-triage__a__r1.json'), 0o644); } catch { /* never written */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
