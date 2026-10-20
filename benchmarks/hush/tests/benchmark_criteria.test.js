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
const { keylessEnv } = require('../../test-env.js');

const criteria = require('../runner/criteria.js');
const { overlayFor, workRecord, normalize, rubricHash, RUBRIC_HASH, REJUDGE_HASHES, BYTE_HASHES, BYTE_REJUDGE_HASHES, loadJudged, rejudgeRefusal, rejudgeHonesty } = criteria;
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

  test('rewording a honesty question keeps the honesty hash; changing how its answer is stored moves it', () => {
    const edited = (edit) => { const r = copy(rubric); edit(r.requests.honesty.questions.no_invented_work); return rubricHash(r, study, TASKS, undefined, 'honesty'); };
    assert.strictEqual(edited((q) => { q.instructions += ' Reworded.'; q.criteria = 'Reworded.'; }), REJUDGE_HASHES.honesty);
    for (const [field, value] of [['invert', true], ['group', 'load'], ['type', 'score'], ['when', 'has_references']]) {
      assert.notStrictEqual(edited((q) => { q[field] = value; }), REJUDGE_HASHES.honesty, field);
    }
  });

  test('current or same-content scores may be rejudged, in full or by task', () => {
    for (const h of [RUBRIC_HASH, ...Object.keys(BYTE_HASHES).filter((k) => BYTE_HASHES[k] === RUBRIC_HASH)]) {
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

  test('every content an earlier hash maps to keeps its rejudge hashes, and the current content\'s are the stamped ones', () => {
    assert.ok(Object.keys(BYTE_HASHES).length > 0);
    for (const [legacy, content] of Object.entries(BYTE_HASHES)) assert.ok(BYTE_REJUDGE_HASHES[content], legacy);
    // Only the current content is checked: a rubric edit leaves an earlier content's hashes as they were.
    if (BYTE_REJUDGE_HASHES[RUBRIC_HASH]) assert.deepStrictEqual(BYTE_REJUDGE_HASHES[RUBRIC_HASH], REJUDGE_HASHES);
  });

  // A file stamped before rejudge hashes were stored, whose content differs
  // from the current one in one re-asked request, as after a later edit.
  for (const [edited, other, edit] of [
    ['quiz', 'honesty', (s) => { Object.values(Object.values(s.overlay).find((o) => o.quiz).quiz)[0].instructions += ' Earlier.'; }],
    ['honesty', 'quiz', (s) => { Object.values(s.overlay).find((o) => o.groundTruth).groundTruth.extra = 'Earlier.'; }],
  ]) {
    test(`a legacy file whose content differs only in the ${edited} request may be rejudged for ${edited} alone`, () => {
      const s = copy(study);
      edit(s);
      const content = rubricHash(rubric, s, TASKS);
      BYTE_HASHES['111111111111'] = content;
      BYTE_REJUDGE_HASHES[content] = { honesty: part(s, 'honesty'), quiz: part(s, 'quiz') };
      try {
        const j = { rubricHash: '111111111111' };
        assert.strictEqual(rejudgeRefusal(j, edited, false), null);
        assert.match(String(rejudgeRefusal(j, edited, true)), /--task/);
        assert.match(String(rejudgeRefusal(j, other, false)), new RegExp(`more than the ${other} request`));
        assert.match(String(rejudgeRefusal({ ...j, rejudgeHashes: { [edited]: 'ffffffffffff' } }, edited, false)), new RegExp(`more than the ${edited} request`));
      } finally { delete BYTE_HASHES['111111111111']; delete BYTE_REJUDGE_HASHES[content]; }
    });
  }
});

describe('loadJudged: stored scores stay loadable across earlier hashes of the same content', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'criteria-'));
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const stamped = (hash) => {
    const file = path.join(dir, `${hash}.json`);
    fs.writeFileSync(file, JSON.stringify({ tag: 't', rubricHash: hash, runs: { k: {} } }));
    return file;
  };

  test('a file stamped with an earlier hash loads under the content hash it maps to, so a judge run does not re-judge it', () => {
    assert.deepStrictEqual(loadJudged(stamped('23fd222890c7'), BYTE_HASHES['23fd222890c7']).runs, { k: {} });
    assert.ok(loadJudged(stamped(RUBRIC_HASH)));
  });

  // The stored batches are stamped 23fd222890c7, whose content hash is this one.
  // A change to how rubricHash serializes its input would mark them all stale.
  test('the current content hash is pinned, and a file stamped with its earlier hash loads by default', () => {
    assert.strictEqual(RUBRIC_HASH, '5fa66bab2a58');
    assert.deepStrictEqual(loadJudged(stamped('23fd222890c7')).runs, { k: {} });
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

  const STALE = '000000000000';
  const run = (tag, flag, stored) => {
    const file = path.join(data, 'hush', 'results', tag, 'criteria.json');
    fs.mkdirSync(path.join(path.dirname(file), 'runs'), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ tag, ...stored }));
    for (const key of Object.keys(stored.runs)) fs.writeFileSync(path.join(path.dirname(file), 'runs', `${key}.json`), JSON.stringify({ finalText: 'Done.' }));
    const r = spawnSync(process.execPath, [path.join(BENCH, 'runner', 'criteria.js'), '--tag', tag, flag], {
      encoding: 'utf8',
      env: keylessEnv({ BENCH_DATA_DIR: data, TYPESAFE_API_KEY: 'offline', TYPESAFE_API_URL: 'http://127.0.0.1:9' }),
    });
    return { r, j: JSON.parse(fs.readFileSync(file, 'utf8')) };
  };

  for (const flag of ['--rehonesty', '--requiz']) {
    test(`${flag} refuses a file scored under another rubric and leaves its stamp`, () => {
      const { r, j } = run(`stale${flag}`, flag, { rubricHash: STALE, runs: {} });
      assert.strictEqual(j.rubricHash, STALE, r.stdout);
      assert.notStrictEqual(r.status, 0);
      assert.match(r.stderr, /judge them again with --force/);
    });

    test(`${flag} restamps a stale file whose rejudge hash shows only the re-asked request changed`, () => {
      const { r, j } = run(`allowed${flag}`, flag, { rubricHash: STALE, rejudgeHashes: REJUDGE_HASHES, runs: {} });
      assert.strictEqual(r.status, 0, r.stderr);
      assert.strictEqual(j.rubricHash, RUBRIC_HASH);
      assert.deepStrictEqual(j.rejudgeHashes, REJUDGE_HASHES);
    });

    test(`${flag} keeps the old stamp and the old answers when a request fails`, () => {
      const per = { no_contradiction_of_evidence: { group: 'gate', value: 0.1, confidence: null, applicable: true } };
      const stored = { task: 'failing-suite', per, quiz: { mean: 0.2, byLevel: {}, per: {} }, groups: { quiz: 0.2 }, gateFailures: [], passed: true };
      const { r, j } = run(`failed${flag}`, flag, { rubricHash: STALE, rejudgeHashes: REJUDGE_HASHES, runs: { k1: stored } });
      assert.match(r.stdout, /FAIL k1/);
      assert.match(r.stderr, /keeps rubric 000000000000/);
      assert.notStrictEqual(r.status, 0);
      assert.strictEqual(j.rubricHash, STALE);
      assert.deepStrictEqual(j.runs.k1, stored);
    });
  }

  test('a judge run stamps the rubric and rejudge hashes, for a batch and for anchors', () => {
    const tag = 'judged';
    const runs = path.join(data, 'hush', 'results', tag, 'runs');
    fs.mkdirSync(runs, { recursive: true });
    fs.writeFileSync(path.join(runs, 'k1.json'), JSON.stringify({ error: 'session failed' }));
    const anchors = path.join(data, 'anchors-empty');
    fs.mkdirSync(anchors, { recursive: true });
    const env = keylessEnv({ BENCH_DATA_DIR: data, TYPESAFE_API_KEY: 'offline', TYPESAFE_API_URL: 'http://127.0.0.1:9' });
    for (const [args, file] of [
      [['--tag', tag], path.join(data, 'hush', 'results', tag, 'criteria.json')],
      [['--anchors', '--anchors-dir', anchors], path.join(data, 'hush', 'results', 'criteria-anchors-empty', 'criteria.json')],
    ]) {
      const r = spawnSync(process.execPath, [path.join(BENCH, 'runner', 'criteria.js'), ...args], { encoding: 'utf8', env });
      assert.strictEqual(r.status, 0, r.stderr);
      const j = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.strictEqual(j.rubricHash, RUBRIC_HASH, args.join(' '));
      assert.deepStrictEqual(j.rejudgeHashes, REJUDGE_HASHES, args.join(' '));
    }
  });

  test('a judge run whose request fails exits non-zero and leaves the run unscored', () => {
    const tag = 'judge-failed';
    const runs = path.join(data, 'hush', 'results', tag, 'runs');
    fs.mkdirSync(runs, { recursive: true });
    fs.writeFileSync(path.join(runs, 'k1.json'), JSON.stringify({ task: 'failing-suite', arm: 'hush', rep: 0, finalText: 'Done.' }));
    // Nothing listens on port 9, so every judge request fails.
    const r = spawnSync(process.execPath, [path.join(BENCH, 'runner', 'criteria.js'), '--tag', tag], {
      encoding: 'utf8',
      env: keylessEnv({ BENCH_DATA_DIR: data, TYPESAFE_API_KEY: 'offline', TYPESAFE_API_URL: 'http://127.0.0.1:9' }),
    });
    assert.match(r.stdout, /FAIL k1/);
    assert.match(r.stderr, /1 run\(s\) failed/);
    assert.notStrictEqual(r.status, 0);
    const j = JSON.parse(fs.readFileSync(path.join(data, 'hush', 'results', tag, 'criteria.json'), 'utf8'));
    assert.deepStrictEqual(j.runs, {});
  });

  test('an --anchors run whose request fails exits non-zero and leaves the anchor unscored', () => {
    const anchors = path.join(data, 'anchors-failed');
    fs.mkdirSync(path.join(anchors, 'failing-suite'), { recursive: true });
    fs.writeFileSync(path.join(anchors, 'failing-suite', 'gold.md'), 'Done.');
    // Nothing listens on port 9, so every judge request fails.
    const r = spawnSync(process.execPath, [path.join(BENCH, 'runner', 'criteria.js'), '--anchors', '--anchors-dir', anchors], {
      encoding: 'utf8',
      env: keylessEnv({ BENCH_DATA_DIR: data, TYPESAFE_API_KEY: 'offline', TYPESAFE_API_URL: 'http://127.0.0.1:9' }),
    });
    assert.match(r.stdout, /FAIL failing-suite__gold/);
    assert.match(r.stderr, /1 anchor\(s\) failed/);
    assert.notStrictEqual(r.status, 0);
    const j = JSON.parse(fs.readFileSync(path.join(data, 'hush', 'results', 'criteria-anchors-failed', 'criteria.json'), 'utf8'));
    assert.deepStrictEqual(j.runs, {});
  });

  test('--rehonesty drops answers to honesty questions it no longer asks, and recomputes the gates', async () => {
    const file = path.join(data, 'dropped.json');
    const gate = (value) => ({ group: 'gate', value, confidence: null, applicable: true });
    fs.writeFileSync(file, JSON.stringify({ tag: 't', rubricHash: STALE, rejudgeHashes: REJUDGE_HASHES, runs: {
      k1: { task: 'failing-suite', per: { no_invented_work: gate(0.1), no_contradiction_of_evidence: gate(0.1) }, gateFailures: [{ id: 'no_invented_work' }], passed: false },
    } }));
    const real = globalThis.fetch;
    const asked = [];
    globalThis.fetch = async (url, init) => {
      asked.push(Object.keys(JSON.parse(init.body).questions));
      return { ok: true, status: 200, json: async () => ({ answers: { no_contradiction_of_evidence: { noul: 0.9 } } }) };
    };
    try {
      await rejudgeHonesty(file, () => 'Done.', () => null);
    } finally { globalThis.fetch = real; }
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepStrictEqual(asked, [['no_contradiction_of_evidence']]);
    assert.deepStrictEqual(Object.keys(j.runs.k1.per), ['no_contradiction_of_evidence']);
    assert.strictEqual(j.runs.k1.per.no_contradiction_of_evidence.value, 0.9);
    assert.deepStrictEqual(j.runs.k1.gateFailures, []);
    assert.strictEqual(j.runs.k1.passed, true);
    assert.strictEqual(j.rubricHash, RUBRIC_HASH);
  });

  test('--rehonesty stores each answer with its question\'s group, inversion, confidence and when condition', async () => {
    const file = path.join(data, 'stored.json');
    fs.writeFileSync(file, JSON.stringify({ tag: 't', rubricHash: RUBRIC_HASH, runs: {
      k1: { task: 'failing-suite', mech: { flags: { has_references: false } }, per: {}, gateFailures: [], passed: true },
    } }));
    const q = criteria.rubric.requests.honesty.questions.no_contradiction_of_evidence;
    const saved = { ...q };
    Object.assign(q, { group: 'load', invert: true, when: 'has_references' });
    const real = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ answers: { no_contradiction_of_evidence: { noul: 0.9, confidence: 0.6 } } }) });
    try {
      await rejudgeHonesty(file, () => 'Done.', () => null);
    } finally {
      globalThis.fetch = real;
      for (const k of Object.keys(q)) delete q[k];
      Object.assign(q, saved);
    }
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepStrictEqual(j.runs.k1.per.no_contradiction_of_evidence, { group: 'load', value: 0.1, confidence: 0.6, applicable: false });
  });

  test('--rehonesty keeps a run\'s stored answers when the response cannot be read', async () => {
    const file = path.join(data, 'unreadable.json');
    const gate = (value) => ({ group: 'gate', value, confidence: null, applicable: true });
    const stored = { task: 'failing-suite', per: { no_contradiction_of_evidence: gate(0.1) }, gateFailures: [{ id: 'no_contradiction_of_evidence', value: 0.1, floor: 0.5 }], passed: false };
    fs.writeFileSync(file, JSON.stringify({ tag: 't', rubricHash: STALE, rejudgeHashes: REJUDGE_HASHES, runs: { k1: stored } }));
    const real = globalThis.fetch;
    const exitCode = process.exitCode;
    // A 200 response whose answer lacks `noul`.
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ answers: { no_contradiction_of_evidence: { confidence: 0.6 } } }) });
    try {
      await rejudgeHonesty(file, () => 'Done.', () => null);
    } finally { globalThis.fetch = real; process.exitCode = exitCode; }
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepStrictEqual(j.runs.k1, stored);
    assert.strictEqual(j.rubricHash, STALE);
  });

  test('--rehonesty fails a run whose answer to an inverted question lacks `noul`, instead of storing NaN', async () => {
    const file = path.join(data, 'unreadable-inverted.json');
    const gate = (value) => ({ group: 'gate', value, confidence: null, applicable: true });
    const stored = { task: 'failing-suite', per: { no_contradiction_of_evidence: gate(0.1) }, gateFailures: [{ id: 'no_contradiction_of_evidence', value: 0.1, floor: 0.5 }], passed: false };
    fs.writeFileSync(file, JSON.stringify({ tag: 't', rubricHash: STALE, rejudgeHashes: REJUDGE_HASHES, runs: { k1: stored } }));
    const q = criteria.rubric.requests.honesty.questions.no_contradiction_of_evidence;
    const invert = q.invert;
    q.invert = true;
    const real = globalThis.fetch;
    const exitCode = process.exitCode;
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ answers: { no_contradiction_of_evidence: { confidence: 0.6 } } }) });
    try {
      await rejudgeHonesty(file, () => 'Done.', () => null);
    } finally {
      globalThis.fetch = real; process.exitCode = exitCode;
      if (invert === undefined) delete q.invert; else q.invert = invert;
    }
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepStrictEqual(j.runs.k1, stored);
    assert.strictEqual(j.rubricHash, STALE);
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

  test('an answer without its number is refused for every kind, never stored as NaN', () => {
    for (const def of [{ type: 'noul' }, { type: 'noul', invert: true }, { type: 'score', criteria: ['a', 'b', 'c'] }]) {
      assert.throws(() => normalize(def, { confidence: 0.6 }), /no answer/, JSON.stringify(def));
    }
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

  test('the files read through the shell are listed in one order, whatever order the fixture list arrives in', () => {
    const events = [asst({ type: 'tool_use', name: 'Bash', input: { command: 'cat b.js a.js' } })];
    assert.deepStrictEqual(workRecord(events, ['b.js', 'a.js']).files_read_or_searched_by_shell_commands, ['a.js', 'b.js']);
    assert.deepStrictEqual(workRecord(events, ['a.js', 'b.js']).files_read_or_searched_by_shell_commands, ['a.js', 'b.js']);
  });

  test('a session with no tool call, or no transcript, gives no record to check against', () => {
    assert.strictEqual(workRecord([asst({ type: 'text', text: 'Done.' })]), null);
    assert.strictEqual(workRecord(null), null);
  });
});
