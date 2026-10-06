'use strict';
// The criteria judge's bookkeeping: how a task's judging data is resolved, how
// an answer becomes a 0..1 value, and what the honesty gate is shown. No
// network: requiring the runner asks Jev nothing.
//
// The rubric and the study file are read as they are on disk, so a dangling
// `sameAs`, a quiz key that names no option, or a `when` no code ever sets
// fails here instead of surfacing as a silently skipped question in a paid
// batch.

const { describe, test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { overlayFor, workRecord, normalize, rubricHash, RUBRIC_HASH } = require('../runner/criteria.js');
const { shape } = require('../runner/criteria-checks.js');

const BENCH = path.join(__dirname, '..');
const rubric = JSON.parse(fs.readFileSync(path.join(BENCH, 'rubric-criteria.json'), 'utf8'));
const study = JSON.parse(fs.readFileSync(path.join(BENCH, 'tasks-criteria.json'), 'utf8'));
const TASKS = [...JSON.parse(fs.readFileSync(path.join(BENCH, 'tasks.json'), 'utf8')), ...study.tasks];

describe('overlayFor: per-task judging data', () => {
  test('the Spanish task reuses the English quiz and ground truth, and keeps its own language', () => {
    const es = overlayFor('failing-suite-es');
    const en = overlayFor('failing-suite');
    assert.strictEqual(es.language, 'es');
    assert.strictEqual(en.language, 'en');
    assert.deepStrictEqual(Object.keys(es.quiz), Object.keys(en.quiz));
    assert.deepStrictEqual(es.groundTruth, en.groundTruth);
  });

  test('the brief explanation borrows the deep one and keeps only the questions a short answer must carry', () => {
    const brief = overlayFor('explain-brief');
    assert.deepStrictEqual(Object.keys(brief.quiz).sort(), ['apply_owner', 'explain_dropped', 'recall_order', 'recall_reader']);
    assert.strictEqual(brief.asksDepth, false);
    assert.strictEqual(overlayFor('explain-deep').asksDepth, true);
    assert.deepStrictEqual(brief.groundTruth, overlayFor('explain-deep').groundTruth);
  });

  test('style-forge takes its ground truth from tasks.json, where the earlier study put it', () => {
    assert.ok(overlayFor('style-forge').groundTruth.root_cause.includes('dep-4471'));
  });

  test('a task outside the study has no overlay', () => {
    assert.strictEqual(overlayFor('repo-sweep'), null);
  });
});

describe('the study file is internally sound', () => {
  const ids = [...study.dev, ...study.heldOut];

  test('every dev and held-out task exists, has a fixture, and resolves to a quiz and a ground truth', () => {
    for (const id of ids) {
      const task = TASKS.find((t) => t.id === id);
      assert.ok(task, `${id} is not a task`);
      assert.ok(fs.existsSync(path.join(BENCH, 'fixtures', task.fixture)), `${id} names a missing fixture`);
      const ov = overlayFor(id);
      assert.ok(ov && Object.keys(ov.quiz).length >= 4, `${id} has no usable quiz`);
      assert.ok(ov.groundTruth, `${id} has no ground truth for the honesty gate`);
    }
  });

  test('every quiz key names a real option, and every question can answer "not stated"', () => {
    for (const id of ids) {
      for (const [qid, q] of Object.entries(overlayFor(id).quiz)) {
        for (const key of [].concat(q.key)) assert.ok(key in q.criteria, `${id}.${qid}: key "${key}" is not an option`);
        assert.ok(Object.keys(q.criteria).some((o) => /not_stated|cannot_tell/.test(o)), `${id}.${qid} has no way to say the message does not say`);
        assert.ok(['recall', 'explanation', 'verification', 'application', 'transfer'].includes(q.level), `${id}.${qid}: unknown level ${q.level}`);
      }
    }
  });

  test('held-out tasks are never dev tasks', () => {
    assert.deepStrictEqual(study.heldOut.filter((id) => study.dev.includes(id)), []);
  });
});

describe('the rubric is internally sound', () => {
  const all = Object.values(rubric.requests).flatMap((r) => Object.entries(r.questions));

  test('weights sum to one and every weighted group has at least one question', () => {
    const sum = Object.values(rubric.weights).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
    for (const g of Object.keys(rubric.weights)) {
      if (g === 'quiz') continue; // the quiz lives per task, not in the rubric
      assert.ok(all.some(([, q]) => q.group === g), `no question feeds group ${g}`);
    }
  });

  test('every `when` is a condition code actually sets', () => {
    const set = new Set([...Object.keys(shape('x').flags), 'has_references', 'asks_depth', 'asks_understanding', 'check_question']);
    for (const [id, q] of all) if (q.when) assert.ok(set.has(q.when), `${id} waits on "${q.when}", which nothing sets`);
  });

  test('a scored choice names an option that exists, and every gate is a question', () => {
    for (const [id, q] of all) if (q.type === 'choice' && q.value) assert.ok(q.value in q.criteria, `${id} scores a missing option`);
    for (const g of Object.keys(rubric.gates)) assert.ok(all.some(([id]) => id === g), `gate ${g} is not asked`);
  });

  test('a score has at least two levels, so dividing by the top index is safe', () => {
    for (const [id, q] of all) if (q.type === 'score') assert.ok(q.criteria.length >= 2, `${id} has ${q.criteria.length} level(s)`);
  });
});

describe('rubricHash: which edits invalidate stored scores', () => {
  const copy = (o) => JSON.parse(JSON.stringify(o));
  const base = rubricHash(rubric, study);

  test('the hash is the one the runner stamps on scores', () => {
    assert.strictEqual(base, RUBRIC_HASH);
  });

  test('rewording a file or task note keeps the hash, since no note reaches the judge', () => {
    const r = copy(rubric); const s = copy(study);
    r.note += ' Reworded.'; s.note += ' Reworded.';
    for (const t of s.tasks) t.note = 'Reworded.';
    assert.strictEqual(rubricHash(r, s), base);
  });

  test('a ground-truth note is sent to the judge, so editing it moves the hash', () => {
    const s = copy(study);
    const gt = Object.values(s.overlay).find((o) => o.groundTruth?.note).groundTruth;
    gt.note += ' Reworded.';
    assert.notStrictEqual(rubricHash(rubric, s), base);
  });

  test('editing the reader the judge is shown moves the hash', () => {
    const r = copy(rubric);
    r.reader += ' Reworded.';
    assert.notStrictEqual(rubricHash(r, study), base);
  });
});

describe('normalize: an answer becomes a value where higher is better', () => {
  test('a noul is its probability, flipped when yes is the bad outcome', () => {
    assert.strictEqual(normalize({ type: 'noul' }, { noul: 0.8 }), 0.8);
    assert.ok(Math.abs(normalize({ type: 'noul', invert: true }, { noul: 0.8 }) - 0.2) < 1e-9);
  });

  test('a score is divided by the top level index, so a perfect score reaches one', () => {
    assert.strictEqual(normalize({ type: 'score', criteria: ['a', 'b', 'c'] }, { score: 2 }), 1);
    assert.strictEqual(normalize({ type: 'score', criteria: ['a', 'b', 'c', 'd'] }, { score: 1.5 }), 0.5);
  });

  test('a choice scores the probability of its named option, and a diagnostic choice scores nothing', () => {
    assert.strictEqual(normalize({ type: 'choice', value: 'fits' }, { probabilities: { fits: 0.7, too_little: 0.3 } }), 0.7);
    assert.strictEqual(normalize({ type: 'choice' }, { probabilities: { a: 1 } }), null);
  });
});

describe('workRecord: what the honesty gate is shown', () => {
  const asst = (...blocks) => ({ type: 'assistant', message: { content: blocks } });

  test('tool calls are grouped by kind, in order, with their targets', () => {
    const w = workRecord([
      asst({ type: 'tool_use', name: 'PowerShell', input: { command: 'node run-tests.js' } }),
      asst({ type: 'tool_use', name: 'Read', input: { file_path: 'src/pricing.js' } }),
      asst({ type: 'tool_use', name: 'Grep', input: { pattern: 'orderTotal' } }),
    ]);
    assert.deepStrictEqual(w.tool_calls_in_order, ['PowerShell', 'Read', 'Grep']);
    assert.deepStrictEqual(w.shell_commands_run, ['node run-tests.js']);
    assert.deepStrictEqual(w.files_opened, ['src/pricing.js']);
    assert.deepStrictEqual(w.searches_run, ['orderTotal']);
  });

  test('a session with no tool call, or no transcript, gives no record to check against', () => {
    assert.strictEqual(workRecord([asst({ type: 'text', text: 'Done.' })]), null);
    assert.strictEqual(workRecord(null), null);
  });
});
