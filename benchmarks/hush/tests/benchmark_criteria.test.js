'use strict';
// The criteria judge's bookkeeping: how a task's judging data is resolved, how
// an answer becomes a 0..1 value, and what the honesty gate is shown. No
// network: requiring the runner asks Jev nothing.
//
// The rubric and the study file are read as they are on disk, so a dangling
// `sameAs`, a quiz key that names no option, or a `when` no code ever sets
// fails here instead of surfacing as a silently skipped question in a paid
// batch.

const { describe, test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { overlayFor, workRecord, normalize, rubricHash, RUBRIC_HASH, REJUDGE_HASHES, BYTE_HASHES, loadJudged, rejudgeRefusal } = require('../runner/criteria.js');
const checks = require('../runner/criteria-checks.js');
const { shape } = checks;

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
  const base = rubricHash(rubric, study, TASKS);

  test('the hash is the one the runner stamps on scores', () => {
    assert.strictEqual(base, RUBRIC_HASH);
  });

  test('rewording a file or task note keeps the hash, since no note reaches the judge', () => {
    const r = copy(rubric); const s = copy(study);
    r.note += ' Reworded.'; s.note += ' Reworded.';
    for (const t of s.tasks) t.note = 'Reworded.';
    assert.strictEqual(rubricHash(r, s, TASKS), base);
  });

  test('a ground-truth note is sent to the judge, so editing it moves the hash', () => {
    const s = copy(study);
    const gt = Object.values(s.overlay).find((o) => o.groundTruth?.note).groundTruth;
    gt.note += ' Reworded.';
    assert.notStrictEqual(rubricHash(rubric, s, TASKS), base);
  });

  test('editing the reader the judge is shown moves the hash', () => {
    const r = copy(rubric);
    r.reader += ' Reworded.';
    assert.notStrictEqual(rubricHash(r, study, TASKS), base);
  });

  test('a prompt outside the study never reaches the criteria judge, so editing it keeps the hash', () => {
    const tasks = TASKS.map((t) => (t.id === 'repo-sweep' ? { ...t, prompt: `${t.prompt} Reworded.` } : t));
    assert.strictEqual(rubricHash(rubric, study, tasks), base);
  });

  test('renaming or adding a file in a judged fixture moves the hash, since the judge is shown the file list', () => {
    const listed = (t) => checks.fixtureFiles(path.join(BENCH, 'fixtures', t.fixture)).sort();
    const judged = TASKS.find((t) => study.overlay[t.id]);
    assert.strictEqual(rubricHash(rubric, study, TASKS, listed), base);
    const renamed = (t) => (t.id === judged.id ? listed(t).map((f, i) => (i ? f : `renamed-${f}`)) : listed(t));
    const added = (t) => (t.id === judged.id ? [...listed(t), 'added.js'] : listed(t));
    assert.notStrictEqual(rubricHash(rubric, study, TASKS, renamed), base);
    assert.notStrictEqual(rubricHash(rubric, study, TASKS, added), base);
  });
});

describe('rejudge hashes: what --rehonesty and --requiz may restamp', () => {
  const copy = (o) => JSON.parse(JSON.stringify(o));
  const part = (s, reasked) => rubricHash(rubric, s, TASKS, undefined, reasked);

  test('the stamped rejudge hashes are the ones the content gives', () => {
    assert.deepStrictEqual(REJUDGE_HASHES, { honesty: part(study, 'honesty'), quiz: part(study, 'quiz') });
  });

  test('a ground-truth edit moves the full and quiz hashes and keeps the honesty one', () => {
    const s = copy(study);
    Object.values(s.overlay).find((o) => o.groundTruth).groundTruth.extra = 'Reworded.';
    assert.notStrictEqual(rubricHash(rubric, s, TASKS), RUBRIC_HASH);
    assert.strictEqual(part(s, 'honesty'), REJUDGE_HASHES.honesty);
    assert.notStrictEqual(part(s, 'quiz'), REJUDGE_HASHES.quiz);
  });

  test('a quiz edit moves the full and honesty hashes and keeps the quiz one', () => {
    const s = copy(study);
    const q = Object.values(Object.values(s.overlay).find((o) => o.quiz).quiz)[0];
    q.instructions += ' Reworded.';
    assert.notStrictEqual(rubricHash(rubric, s, TASKS), RUBRIC_HASH);
    assert.strictEqual(part(s, 'quiz'), REJUDGE_HASHES.quiz);
    assert.notStrictEqual(part(s, 'honesty'), REJUDGE_HASHES.honesty);
  });

  test('current or same-content scores may be rejudged, in full or by task', () => {
    for (const h of [RUBRIC_HASH, ...Object.keys(BYTE_HASHES)]) {
      assert.strictEqual(rejudgeRefusal({ rubricHash: h }, 'honesty', false), null, h);
      assert.strictEqual(rejudgeRefusal({ rubricHash: h }, 'quiz', true), null, h);
    }
  });

  test('stale scores may be rejudged only in full, and only when nothing but the re-asked request changed', () => {
    const j = { rubricHash: '000000000000', rejudgeHashes: { honesty: REJUDGE_HASHES.honesty, quiz: 'ffffffffffff' } };
    assert.strictEqual(rejudgeRefusal(j, 'honesty', false), null);
    assert.match(rejudgeRefusal(j, 'honesty', true), /--task/);
    assert.match(rejudgeRefusal(j, 'quiz', false), /more than the quiz request/);
    assert.match(rejudgeRefusal({ rubricHash: '000000000000' }, 'honesty', false), /000000000000/);
  });
});

describe('loadJudged: stored scores stay loadable across the note-free hash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'criteria-'));
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const stamped = (hash) => {
    const file = path.join(dir, `${hash}.json`);
    fs.writeFileSync(file, JSON.stringify({ tag: 't', rubricHash: hash, runs: { k: {} } }));
    return file;
  };

  test('every earlier hash of the same content maps to the current rubric hash', () => {
    assert.ok(Object.keys(BYTE_HASHES).length > 0);
    for (const [legacy, current] of Object.entries(BYTE_HASHES)) assert.strictEqual(current, RUBRIC_HASH, legacy);
  });

  test('a file stamped with the legacy hash loads, so a judge run does not re-judge it', () => {
    assert.deepStrictEqual(loadJudged(stamped('23fd222890c7')).runs, { k: {} });
    assert.ok(loadJudged(stamped(RUBRIC_HASH)));
  });

  test('rewording a judged prompt in tasks.json moves the hash, and scores stored before it no longer load', () => {
    const judged = JSON.parse(fs.readFileSync(path.join(BENCH, 'tasks.json'), 'utf8')).find((t) => study.overlay[t.id] && t.prompt);
    const tasks = TASKS.map((t) => (t.id === judged.id ? { ...t, prompt: `${t.prompt} Reworded.` } : t));
    const reworded = rubricHash(rubric, study, tasks);
    assert.notStrictEqual(reworded, RUBRIC_HASH, `${judged.id}: its prompt is sent to the judge`);
    assert.strictEqual(loadJudged(stamped(RUBRIC_HASH), reworded), null);
    for (const legacy of Object.keys(BYTE_HASHES)) assert.strictEqual(loadJudged(stamped(legacy), reworded), null, legacy);
  });

  test('a file stamped with any other hash does not load', () => {
    assert.strictEqual(loadJudged(stamped('000000000000')), null);
    assert.strictEqual(loadJudged(path.join(dir, 'missing.json')), null);
  });
});

describe('--rehonesty and --requiz never relabel stale scores as current', () => {
  // A batch with no runs asks Jev nothing, so the runner's own command line
  // shows what it does to the stamp without a network call.
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'criteria-rejudge-'));
  after(() => fs.rmSync(data, { recursive: true, force: true }));

  for (const flag of ['--rehonesty', '--requiz']) {
    test(`${flag} refuses a file scored under another rubric and leaves its stamp`, () => {
      const file = path.join(data, 'hush', 'results', 'stale', 'criteria.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ tag: 'stale', rubricHash: '000000000000', runs: {} }));
      const r = spawnSync(process.execPath, [path.join(BENCH, 'runner', 'criteria.js'), '--tag', 'stale', flag], {
        encoding: 'utf8',
        env: { ...process.env, BENCH_DATA_DIR: data, TYPESAFE_API_KEY: 'offline', TYPESAFE_API_URL: 'http://127.0.0.1:9' },
      });
      assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).rubricHash, '000000000000', r.stdout);
      assert.notStrictEqual(r.status, 0);
      assert.match(r.stderr, /judge them again with --force/);
    });
  }
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
