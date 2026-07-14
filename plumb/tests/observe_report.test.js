'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { freshLog } = require('./helpers');
const { readRecords, buildReport, formatReport } = require('../scripts/observe-report');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'observe-report.js');

function writeLog(log, records) {
  fs.writeFileSync(log, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

function syntheticRecords() {
  return [
    { ts: '2026-07-01T00:00:00.000Z', session: 's1', turnKey: 't1', mode: 'dormant', kind: 'check-ran' },
    { ts: '2026-07-01T00:01:00.000Z', session: 's1', turnKey: 't2', mode: 'dormant', kind: 'no-claim' },
    { ts: '2026-07-01T00:02:00.000Z', session: 's1', turnKey: 't3', mode: 'dormant', kind: 'no-claim-text' },
    {
      ts: '2026-07-02T00:00:00.000Z',
      session: 's2',
      turnKey: 't4',
      mode: 'dormant',
      kind: 'candidate-dormant',
      files: ['a.js'],
      tools: ['Edit'],
      claim: 'All set.',
    },
    {
      ts: '2026-07-02T00:01:00.000Z',
      session: 's2',
      turnKey: 't5',
      mode: 'armed',
      kind: 'candidate-armed-blocked',
      files: ['b.js'],
      tools: ['Edit'],
      claim: 'The build is fixed.',
    },
    { ts: '2026-07-02T00:02:00.000Z', session: 's2', turnKey: 't5', mode: 'armed', kind: 'suppressed-repeat-turn' },
    { ts: '2026-07-02T00:03:00.000Z', session: 's2', turnKey: 't6', mode: 'armed', kind: 'suppressed-session-cap' },
    // pre-P4 record: no `kind` field — must be treated as candidate-dormant
    { ts: '2026-07-03T00:00:00.000Z', session: 's3', turnKey: 't7', mode: 'dormant', files: ['c.js'], tools: ['Write'], claim: 'good to go' },
  ];
}

describe('unit: readRecords / buildReport / formatReport', () => {
  test('backward compat: lines without kind are treated as candidate-dormant', () => {
    const log = freshLog();
    writeLog(log, syntheticRecords());
    const records = readRecords(log);
    assert.strictEqual(records.length, 8);
    assert.strictEqual(records[7].kind, 'candidate-dormant');
  });

  test('buildReport computes correct counts and rates', () => {
    const report = buildReport(readRecords((() => {
      const log = freshLog();
      writeLog(log, syntheticRecords());
      return log;
    })()));
    assert.strictEqual(report.totalEditTurns, 8);
    assert.strictEqual(report.byKind['check-ran'], 1);
    assert.strictEqual(report.byKind['no-claim'], 1);
    assert.strictEqual(report.byKind['no-claim-text'], 1);
    assert.strictEqual(report.byKind['candidate-dormant'], 2); // one logged + one legacy
    assert.strictEqual(report.byKind['candidate-armed-blocked'], 1);
    assert.strictEqual(report.byKind['suppressed-repeat-turn'], 1);
    assert.strictEqual(report.byKind['suppressed-session-cap'], 1);
    assert.strictEqual(report.candidateCount, 3); // 2 candidate-dormant + 1 candidate-armed-blocked
    assert.strictEqual(report.wouldBlockCount, 2);
    assert.strictEqual(report.sessions, 3);
    assert.deepStrictEqual(report.dateRange, { from: '2026-07-01T00:00:00.000Z', to: '2026-07-03T00:00:00.000Z' });
  });

  test('alternation table counts which claim phrases fire among candidates only', () => {
    const log = freshLog();
    writeLog(log, syntheticRecords());
    const report = buildReport(readRecords(log));
    const allSet = report.alternations.find((a) => a.pattern === 'all set');
    const isFixed = report.alternations.find((a) => a.pattern === '(is|are) (now )?(fixed|resolved|passing|working)');
    const goodToGo = report.alternations.find((a) => a.pattern === 'good to go');
    assert.strictEqual(allSet.hits, 1); // "All set."
    assert.strictEqual(isFixed.hits, 1); // "The build is fixed."
    assert.strictEqual(goodToGo.hits, 1); // legacy record's claim
  });

  test('formatReport includes the arming doctrine header and every section', () => {
    const log = freshLog();
    writeLog(log, syntheticRecords());
    const text = formatReport(buildReport(readRecords(log)));
    assert.match(text, /arming is a manual decision/);
    assert.match(text, /total edit-turns logged: 8/);
    assert.match(text, /sessions covered: 3/);
    assert.match(text, /candidate rate: 3 \/ 8/);
    assert.match(text, /would-block rate/);
    assert.match(text, /CLAIM_RE alternation hits/);
  });
});

describe('integration: CLI', () => {
  test('missing log exits 0 with a clean message', () => {
    const missing = path.join(freshLog(), '..', 'does-not-exist.jsonl');
    const r = spawnSync('node', [SCRIPT, missing], { encoding: 'utf-8' });
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /no observations yet/);
  });

  test('empty log exits 0 with a clean message', () => {
    const log = freshLog();
    fs.writeFileSync(log, '');
    const r = spawnSync('node', [SCRIPT, log], { encoding: 'utf-8' });
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /no observations yet/);
  });

  test('prints the full report for a real log via argv override', () => {
    const log = freshLog();
    writeLog(log, syntheticRecords());
    const r = spawnSync('node', [SCRIPT, log], { encoding: 'utf-8' });
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /total edit-turns logged: 8/);
    assert.match(r.stdout, /candidate-armed-blocked: 1/);
  });
});
