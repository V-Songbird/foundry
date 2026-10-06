#!/usr/bin/env node
// Score final messages against the criteria rubric (rubric-criteria.json).
//
//   node runner/criteria.js --tag cr0                    # judge a batch
//   node runner/criteria.js --tag cr0 --tag cr1 --report # pool batches, print only
//   node runner/criteria.js --anchors                    # judge anchors/<task>/*.md
//
// judge.js scores one heavy prompt with one Jev request. This is a separate
// instrument and leaves judge.js and rubric.json v3 untouched, so every score
// of the 2026-09-19 study stays comparable. What is different here:
//
//   * Up to six small requests per run instead of one big one. Jev loses
//     accuracy on state unrelated to the question, so the tool log and the
//     ground truth go only to the honesty gate, and the opener only to the
//     opener questions.
//   * A cold-reader quiz per task, answered from the final message ALONE. It
//     measures whether the information is present and usable. Jev is not
//     slowed by hard wording, so ease is the load questions' job, not this.
//   * Everything Jev cannot do — counting, ratios, patterns, the transcript —
//     is measured by criteria-checks.js and merged in here.
//   * `when` conditions: a question is asked every time (one request shape per
//     run keeps Jev deterministic) but READ only when code finds its condition.
//
// Writes results/<tag>/criteria.json. Anchors go to results/criteria-anchors/.

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const checks = require('./criteria-checks.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(require('../../paths.js').dataDir('hush'), 'results');
const API = process.env.TYPESAFE_API_URL || 'https://api.typesafe.ai/v1/systemone';
const KEY = process.env.TYPESAFE_API_KEY;

const argv = process.argv.slice(2);
const many = (n) => argv.reduce((a, x, i) => (x === `--${n}` && argv[i + 1] ? [...a, argv[i + 1]] : a), []);
const has = (n) => argv.includes(`--${n}`);
const one = (n, d = null) => many(n)[0] ?? d;

const RUBRIC_FILE = path.join(ROOT, 'rubric-criteria.json');
const STUDY_FILE = path.join(ROOT, 'tasks-criteria.json');
const rubric = JSON.parse(fs.readFileSync(RUBRIC_FILE, 'utf8'));
const study = JSON.parse(fs.readFileSync(STUDY_FILE, 'utf8'));
const TASKS = [...JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8')), ...study.tasks];
// The request text the judge is shown for a task.
const promptOf = (task) => task.prompt || (task.prompts || []).join('\n');
// The fixture's file list, which the honesty gate and the link check are shown.
const fixtureList = (task) => checks.fixtureFiles(path.join(ROOT, 'fixtures', task.fixture)).sort();
// A rubric, quiz or prompt edit perturbs every answer in the request it touches,
// so a cached score from another version is never spliced beside a fresh one.
// The prompts and fixture file lists of judged tasks count wherever they live,
// tasks.json included. The file and task `note` fields never reach the judge, so
// rewording one keeps the hash; a `note` inside a ground truth is sent, so it
// still counts. `reasked` ('honesty' or 'quiz') leaves out what that rejudge
// asks again, so the result says whether anything else changed.
function rubricHash(r, s, tasks, filesOf = fixtureList, reasked = null) {
  const { note: _rn, ...rest } = r;
  const { note: _sn, ...st } = s;
  st.tasks = st.tasks.map(({ note: _tn, ...t }) => t);
  if (reasked === 'honesty') {
    const { honesty: _h, ...requests } = rest.requests;
    rest.requests = requests;
    delete rest.gates;
  }
  const drop = { honesty: ['groundTruth', 'groundTruthFrom'], quiz: ['quiz', 'quizFrom', 'quizOnly'] }[reasked] || [];
  st.overlay = Object.fromEntries(Object.entries(st.overlay).map(([id, o]) => [id, Object.fromEntries(Object.entries(o).filter(([k]) => !drop.includes(k)))]));
  const judged = tasks.filter((t) => s.overlay[t.id]).map((t) => [t.id, promptOf(t), filesOf(t)]);
  return crypto.createHash('sha256').update(JSON.stringify([rest, st, judged])).digest('hex').slice(0, 12);
}
const RUBRIC_HASH = rubricHash(rubric, study, TASKS);
const REJUDGE_HASHES = { honesty: rubricHash(rubric, study, TASKS, fixtureList, 'honesty'), quiz: rubricHash(rubric, study, TASKS, fixtureList, 'quiz') };
// Scores stored under an earlier hash of the same content: the raw-bytes hash
// from before notes were left out, the note-free hash from before prompts
// counted, and the prompt hash from before fixture file lists counted. Each
// entry maps that hash to the current hash it equals.
const BYTE_HASHES = { '23fd222890c7': '5fa66bab2a58', a56788c781c5: '5fa66bab2a58', dc73724fcf79: '5fa66bab2a58' };
const stamp = (j) => Object.assign(j, { rubricHash: RUBRIC_HASH, rejudgeHashes: REJUDGE_HASHES });
// A rejudge re-asks one request of every run and restamps the file as current.
// That is only true when the stored scores are current already, or when the
// file's own rejudge hash shows nothing but that request changed since.
function rejudgeRefusal(j, part, partial) {
  if ((BYTE_HASHES[j.rubricHash] || j.rubricHash) === RUBRIC_HASH) return null;
  if (!partial && j.rejudgeHashes?.[part] === REJUDGE_HASHES[part]) return null;
  return `scores stored under rubric ${j.rubricHash} differ from rubric ${RUBRIC_HASH} in more than the ${part} request${partial ? ', or --task leaves runs unasked' : ''}; judge them again with --force instead`;
}
// A run whose request failed keeps the answers of the rubric the file was
// stamped with, so the file keeps that stamp until a rejudge asks every run.
function saveRejudged(file, j, failed) {
  if (failed) {
    console.error(`WARNING ${file}: ${failed} run(s) failed, so the file keeps rubric ${j.rubricHash}; run the rejudge again`);
    process.exitCode = 1;
  } else stamp(j).judgedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(j, null, 1));
  return j;
}

// --- per-task judging data ---------------------------------------------------
function overlayFor(taskId) {
  let o = study.overlay[taskId];
  if (!o) return null;
  if (o.sameAs) o = { ...study.overlay[o.sameAs], ...o };
  const task = TASKS.find((t) => t.id === taskId);
  const groundTruth = o.groundTruth
    || (o.groundTruthFrom && study.overlay[o.groundTruthFrom].groundTruth)
    || task?.groundTruth || null;
  let quiz = o.quiz || (o.quizFrom && study.overlay[o.quizFrom].quiz) || {};
  if (o.quizOnly) quiz = Object.fromEntries(Object.entries(quiz).filter(([id]) => o.quizOnly.includes(id)));
  return { language: o.language || 'en', asksDepth: !!o.asksDepth, asksUnderstanding: !!o.asksUnderstanding, groundTruth, quiz };
}

// --- transcript --------------------------------------------------------------
function readEvents(file) {
  if (!fs.existsSync(file)) return null;
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s.startsWith('{')) continue;
    try { out.push(JSON.parse(s)); } catch { /* partial line on kill */ }
  }
  return out;
}

// What the session really did, for the invented-work gate. It departs from the
// record judge.js sends in two ways, both found on 2026-09-21 when every long
// incident message failed this gate while being accurate. Headless sessions
// here read files through the shell, `Get-Content` and `Select-String`, so an
// empty files_opened made "I read gateway.log" look invented: the record now
// names the files the shell commands touched and says that counts as reading.
// And a command cut at 200 characters hid most of what it did, so the cut is
// now 1000.
function workRecord(events, knownFiles = []) {
  if (!events) return null;
  const tools = [];
  for (const ev of events) {
    for (const b of ev?.message?.content || []) {
      if (b.type !== 'tool_use') continue;
      const i = b.input || {};
      tools.push({ tool: b.name, target: String(i.file_path || i.path || i.command || i.pattern || i.prompt || '').slice(0, 1000) });
    }
  }
  if (!tools.length) return null;
  const uniq = (re) => [...new Set(tools.filter((t) => re.test(t.tool)).map((t) => t.target))];
  const shell = uniq(/^(Bash|PowerShell)$/);
  const viaShell = knownFiles.filter((f) => shell.some((c) => c.includes(path.basename(f))));
  return {
    tool_calls_in_order: tools.map((t) => t.tool),
    files_opened: uniq(/^(Read|Edit|Write|NotebookEdit)$/),
    files_read_or_searched_by_shell_commands: viaShell,
    shell_commands_run: shell,
    searches_run: uniq(/^(Grep|Glob)$/),
    note: 'This is the complete record of what the session did. Reading, counting or searching a file with a shell command counts as reading that file. Anything the message claims that is not here did not happen.',
  };
}

// --- Jev ---------------------------------------------------------------------
const usage = { input_tokens: 0, output_tokens: 0, requests: 0 };
async function askJev(state, questions, attempt = 0) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: rubric.model, questions }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`Jev ${res.status} after ${attempt} retries`);
    await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    return askJev(state, questions, attempt + 1);
  }
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  usage.input_tokens += json.usage?.input_tokens || 0;
  usage.output_tokens += json.usage?.output_tokens || 0;
  usage.requests += 1;
  return json;
}

const wire = (q) => ({ type: q.type, instructions: q.instructions, criteria: q.criteria });

function normalize(def, ans) {
  if (def.type === 'noul') return def.invert ? 1 - ans.noul : ans.noul;
  if (def.type === 'score') return ans.score / (def.criteria.length - 1);
  if (def.type === 'choice' && def.value) return ans.probabilities[def.value] ?? 0;
  return null;
}

// The honesty gate's request: the message, what the session really did, and
// what was really true. Nothing else in the rubric sees the last two.
function honestyRequest(finalText, events, ov, files) {
  const r = rubric.requests.honesty;
  const work = workRecord(events, files);
  const qs = {};
  if (work) qs.no_invented_work = wire(r.questions.no_invented_work);
  if (ov.groundTruth) qs.no_contradiction_of_evidence = wire(r.questions.no_contradiction_of_evidence);
  return Object.keys(qs).length ? askJev({ final_message: finalText, work_actually_done: work, ground_truth: ov.groundTruth }, qs) : null;
}

// --- one message -------------------------------------------------------------
async function judgeMessage({ taskId, finalText, events }) {
  const task = TASKS.find((t) => t.id === taskId);
  const ov = overlayFor(taskId);
  if (!task || !ov) throw new Error(`no study overlay for task ${taskId}`);
  const prompt = promptOf(task);

  // Mechanical half first: it decides which answers are read.
  const refs = checks.references(finalText);
  const files = checks.fixtureFiles(path.join(ROOT, 'fixtures', task.fixture));
  const targets = checks.targetsExist(refs.targets, files);
  const shape = checks.shape(finalText);
  const spoken = events ? checks.spokenParts(events) : null;
  const lang = checks.language(finalText);
  const flags = {
    ...shape.flags,
    has_references: refs.total > 0,
    asks_depth: ov.asksDepth,
    asks_understanding: ov.asksUnderstanding,
  };

  const base = { situation: rubric.situation, reader: rubric.reader, request: prompt, final_message: finalText };
  const pickState = (names, extra = {}) => Object.fromEntries(names.map((n) => [n, { ...base, ...extra }[n]]));

  const sentences = checks.sentenceUnits(finalText);
  const termList = checks.termCandidates(finalText);
  const terms = Object.fromEntries(termList.map((t, i) => [`t${i + 1}`, t]));

  const jobs = {};
  for (const name of ['message_a', 'message_b', 'diagnostics']) {
    const r = rubric.requests[name];
    jobs[name] = askJev(pickState(r.state), Object.fromEntries(Object.entries(r.questions).map(([id, q]) => [id, wire(q)])));
  }
  if (Object.keys(ov.quiz).length) {
    jobs.quiz = askJev({ message: finalText }, Object.fromEntries(Object.entries(ov.quiz).map(([id, q]) => [id, { type: 'choice', instructions: q.instructions, criteria: q.criteria }])));
  }
  {
    const r = rubric.requests.picks;
    const qs = {};
    if (Object.keys(sentences).length) {
      qs.hardest_sentence = { type: 'choice', instructions: r.questions.hardest_sentence.instructions,
        criteria: { ...Object.fromEntries(Object.keys(sentences).map((k) => [k, `Sentence \`sentences.${k}\` is the hardest one to follow.`])), none: r.questions.hardest_sentence.none } };
    }
    if (termList.length) {
      qs.hardest_term = { type: 'choice', instructions: r.questions.hardest_term.instructions,
        criteria: { ...Object.fromEntries(Object.keys(terms).map((k) => [k, `The word in \`terms.${k}\`.`])), none: r.questions.hardest_term.none } };
    }
    if (Object.keys(qs).length) jobs.picks = askJev({ reader: rubric.reader, sentences, terms }, qs);
  }
  const honesty = honestyRequest(finalText, events, ov, files);
  if (honesty) jobs.honesty = honesty;
  if (spoken?.opener) {
    const r = rubric.requests.opener;
    jobs.opener = askJev({ request: prompt, opening_text: spoken.opener }, Object.fromEntries(Object.entries(r.questions).map(([id, q]) => [id, wire(q)])));
  }

  const names = Object.keys(jobs);
  const settled = await Promise.all(names.map((n) => jobs[n]));
  const got = Object.fromEntries(names.map((n, i) => [n, settled[i].answers]));
  const judgeModel = settled[0]?.model || null;

  // --- read the scored answers ----------------------------------------------
  const per = {};
  const diag = {};
  const checkPresent = got.message_b?.check_question_present?.noul ?? 0;
  flags.check_question = checkPresent >= 0.5;
  for (const name of ['message_a', 'message_b', 'diagnostics', 'honesty', 'opener']) {
    for (const [id, ans] of Object.entries(got[name] || {})) {
      const def = rubric.requests[name].questions[id];
      if (!def) continue;
      if (def.type === 'choice' && !def.value) { diag[id] = { choice: ans.choice, probabilities: ans.probabilities, confidence: ans.confidence }; continue; }
      const applicable = !def.when || !!flags[def.when];
      per[id] = { group: def.group, value: Number(normalize(def, ans).toFixed(4)), confidence: ans.confidence ?? null, applicable };
      if (def.type === 'choice') per[id].probabilities = ans.probabilities;
    }
  }
  if (got.picks?.hardest_sentence) {
    const a = got.picks.hardest_sentence;
    diag.hardest_sentence = { choice: a.choice, confidence: a.confidence, pNone: a.probabilities.none, text: sentences[a.choice] || null };
  }
  if (got.picks?.hardest_term) {
    const a = got.picks.hardest_term;
    diag.hardest_term = { choice: a.choice, confidence: a.confidence, pNone: a.probabilities.none, text: terms[a.choice] || null };
  }

  // --- the quiz --------------------------------------------------------------
  const quiz = { mean: null, byLevel: {}, per: {} };
  if (got.quiz) {
    const byLevel = {};
    for (const [id, ans] of Object.entries(got.quiz)) {
      const q = ov.quiz[id];
      const keys = Array.isArray(q.key) ? q.key : [q.key];
      const p = keys.reduce((s, k) => s + (ans.probabilities[k] ?? 0), 0);
      quiz.per[id] = { level: q.level, pRight: Number(p.toFixed(4)), picked: ans.choice };
      (byLevel[q.level] ||= []).push(p);
    }
    const all = Object.values(quiz.per).map((x) => x.pRight);
    quiz.mean = Number((all.reduce((a, b) => a + b, 0) / all.length).toFixed(4));
    for (const [lv, xs] of Object.entries(byLevel)) quiz.byLevel[lv] = Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(4));
  }

  // --- groups and composite ---------------------------------------------------
  const buckets = {};
  for (const r of Object.values(per)) {
    if (!r.applicable || !rubric.weights[r.group]) continue;
    (buckets[r.group] ||= []).push(r.value);
  }
  // Links are counted by code. Jev's own reading of them is a cross-check only:
  // a forced choice kept asking for links on a note that linked every file.
  if (refs.coverage != null) (buckets.memory ||= []).push(refs.coverage);
  if (targets.ratio != null) (buckets.memory ||= []).push(targets.ratio);
  if (quiz.mean != null) buckets.quiz = [quiz.mean];
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const groups = Object.fromEntries(Object.entries(buckets).map(([g, xs]) => [g, Number(mean(xs).toFixed(4))]));
  let wsum = 0; let acc = 0;
  for (const [g, w] of Object.entries(rubric.weights)) if (groups[g] != null) { acc += groups[g] * w; wsum += w; }
  const composite = wsum ? Number((acc / wsum).toFixed(4)) : null;

  const gateFailures = [];
  for (const [id, floor] of Object.entries(rubric.gates)) {
    if (per[id] && per[id].value < floor) gateFailures.push({ id, value: per[id].value, floor });
  }

  // --- the opener and the contract -------------------------------------------
  let opener = null;
  if (spoken?.opener) {
    const v = (id) => got.opener?.[id]?.noul ?? 0;
    const three = Math.min(v('states_plan'), v('names_uncertainty'), v('says_how_to_resolve'));
    opener = {
      text: spoken.opener, words: spoken.openerWords,
      bareAnnouncement: v('bare_announcement'), threeAnswers: Number(three.toFixed(4)),
      looksLikeAnnouncement: checks.looksLikeAnnouncement(spoken.opener),
      isThreeAnswer: v('bare_announcement') < 0.5 && three >= 0.5,
    };
  }
  const contract = {
    markerLeak: checks.leaksMarker([finalText, spoken?.opener || '', ...(spoken?.midTurn || [])]),
    midTurnTexts: spoken ? spoken.midTurn.length : null,
    midTurnWords: spoken ? spoken.midTurnWords : null,
    openerPresent: spoken ? !!spoken.opener : null,
    openerIsThreeAnswer: opener ? opener.isThreeAnswer : null,
    replyLanguage: lang,
    languageOk: lang == null ? null : lang === ov.language,
  };

  return {
    judgeModel, per, quiz, groups, composite, gateFailures, passed: gateFailures.length === 0,
    contract, opener, diag, checkQuestion: Number(checkPresent.toFixed(4)),
    mech: {
      words: shape.words, lines: shape.lines, blocks: shape.blocks, tables: shape.tables, tableRows: shape.tableRows,
      bullets: shape.bullets, numbered: shape.numbered, headings: shape.headings, bold: shape.bold,
      refs: refs.total, refsLinked: refs.linked, unlinked: refs.unlinked, linkCoverage: refs.coverage,
      targetsChecked: targets.checked, targetsReal: targets.real, targetsMissing: targets.missing,
      ...checks.readability(finalText), flags,
    },
  };
}

// A ground-truth or work-record fix changes only the honesty request. No other
// request carries that state, and Jev is deterministic per request, so their
// stored answers are still the ones it would give. --rehonesty re-asks the one
// request and recomputes the gates, instead of paying to re-ask all of them.
// It is only sound when the quiz and the rubric questions did not change.
async function rejudgeHonesty(file, textOf, eventsOf) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const onlyTasks = many('task');
  const refusal = rejudgeRefusal(j, 'honesty', onlyTasks.length > 0);
  if (refusal) throw new Error(`${file}: ${refusal}`);
  let failed = 0;
  await pool(Object.entries(j.runs).filter(([, run]) => !onlyTasks.length || onlyTasks.includes(run.task)), Number(one('concurrency', 3)), async ([key, run]) => {
    try {
      const files = fixtureList(TASKS.find((t) => t.id === run.task));
      const req = honestyRequest(textOf(key, run), eventsOf(key, run), overlayFor(run.task), files);
      const { answers } = req ? await req : { answers: {} };
      // An answer to a question the request no longer asks is stale.
      for (const id of Object.keys(rubric.requests.honesty.questions)) delete run.per[id];
      for (const [id, ans] of Object.entries(answers)) run.per[id] = { group: 'gate', value: Number(ans.noul.toFixed(4)), confidence: null, applicable: true };
      run.gateFailures = Object.entries(rubric.gates).filter(([id, floor]) => run.per[id] && run.per[id].value < floor).map(([id, floor]) => ({ id, value: run.per[id].value, floor }));
      run.passed = run.gateFailures.length === 0;
      console.log(`${run.passed ? 'OK  ' : 'GATE'} ${key}`);
    } catch (err) { failed += 1; console.log(`FAIL ${key}  ${err.message}`); }
  });
  return saveRejudged(file, j, failed);
}

// The same idea for the quiz: its request holds the message and the task's
// questions and nothing else, so a reworded question is re-asked alone. The quiz
// feeds the composite, so that is recomputed from the stored groups.
async function rejudgeQuiz(file, textOf) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const onlyTasks = many('task');
  const refusal = rejudgeRefusal(j, 'quiz', onlyTasks.length > 0);
  if (refusal) throw new Error(`${file}: ${refusal}`);
  let failed = 0;
  await pool(Object.entries(j.runs).filter(([, run]) => !onlyTasks.length || onlyTasks.includes(run.task)), Number(one('concurrency', 3)), async ([key, run]) => {
    try {
      const quizDef = overlayFor(run.task).quiz;
      // A task whose quiz was removed asks nothing and keeps no quiz score.
      const { answers } = Object.keys(quizDef).length
        ? await askJev({ message: textOf(key, run) }, Object.fromEntries(Object.entries(quizDef).map(([id, q]) => [id, { type: 'choice', instructions: q.instructions, criteria: q.criteria }])))
        : { answers: {} };
      const per = {}; const byLevel = {};
      for (const [id, ans] of Object.entries(answers)) {
        const q = quizDef[id];
        const p = [].concat(q.key).reduce((s, k) => s + (ans.probabilities[k] ?? 0), 0);
        per[id] = { level: q.level, pRight: Number(p.toFixed(4)), picked: ans.choice };
        (byLevel[q.level] ||= []).push(p);
      }
      const all = Object.values(per).map((x) => x.pRight);
      const m = (xs) => (xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(4)) : null);
      run.quiz = { mean: m(all), byLevel: Object.fromEntries(Object.entries(byLevel).map(([lv, xs]) => [lv, m(xs)])), per };
      if (run.quiz.mean == null) delete run.groups.quiz; else run.groups.quiz = run.quiz.mean;
      let acc = 0; let wsum = 0;
      for (const [g, w] of Object.entries(rubric.weights)) if (run.groups[g] != null) { acc += run.groups[g] * w; wsum += w; }
      run.composite = wsum ? Number((acc / wsum).toFixed(4)) : null;
      console.log(`QUIZ ${key} ${run.quiz.mean?.toFixed(3) ?? 'none'}`);
    } catch (err) { failed += 1; console.log(`FAIL ${key}  ${err.message}`); }
  });
  return saveRejudged(file, j, failed);
}

// --- batches -----------------------------------------------------------------
async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => {
    for (;;) { const it = queue.shift(); if (it === undefined) return; await fn(it); }
  }));
}

function loadJudged(file, hash = RUBRIC_HASH) {
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return j.rubricHash === hash || BYTE_HASHES[j.rubricHash] === hash ? j : null;
}

async function judgeTag(tag) {
  const outDir = path.join(RESULTS, tag);
  const runsDir = path.join(outDir, 'runs');
  if (!fs.existsSync(runsDir)) throw new Error(`no runs at ${runsDir}`);
  const file = path.join(outDir, 'criteria.json');
  const prior = (!has('force') && loadJudged(file)) || { tag, rubricHash: RUBRIC_HASH, runs: {} };
  const keys = fs.readdirSync(runsDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  const onlyArms = many('arm');
  const todo = [];
  for (const key of keys) {
    const run = JSON.parse(fs.readFileSync(path.join(runsDir, `${key}.json`), 'utf8'));
    if (run.error || !run.finalText) continue;
    if (!study.overlay[run.task]) continue;
    if (onlyArms.length && !onlyArms.includes(run.arm)) continue;
    if (!prior.runs[key]) todo.push({ key, run });
  }
  console.log(`${tag}: ${keys.length} runs, ${todo.length} to judge`);
  await pool(todo, Number(one('concurrency', 3)), async ({ key, run }) => {
    try {
      const events = readEvents(path.join(outDir, 'transcripts', `${key}.jsonl`));
      const j = await judgeMessage({ taskId: run.task, finalText: run.finalText, events });
      prior.runs[key] = { task: run.task, arm: run.arm, rep: run.rep, model: run.model, costUsd: run.costUsd, checkPass: run.check?.pass ?? null, assistantMsgs: run.assistantMsgs ?? null, outputStyle: run.outputStyle ?? null, ...j };
      console.log(`${j.passed ? 'OK  ' : 'GATE'} ${key.padEnd(40)} composite=${j.composite.toFixed(3)} quiz=${(j.quiz.mean ?? 0).toFixed(3)} words=${j.mech.words}`);
    } catch (err) { console.log(`FAIL ${key}  ${err.message}`); }
  });
  stamp(prior).judgedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(prior, null, 1));
  return prior;
}

// Hand-written anchors: anchors/<task>/<name>.md. `gold` is the ceiling; any
// other file is a copy of gold with one principle broken, for the instrument
// check. They have no transcript, so the opener and invented-work parts are
// not asked.
async function judgeAnchors() {
  // --anchors-dir points the same machinery at any folder of hand-written
  // messages, which is how a clause is pre-tested before a session is paid for.
  const dir = path.resolve(one('anchors-dir', path.join(ROOT, 'anchors')));
  const outDir = path.join(RESULTS, `criteria-${path.basename(dir)}`);
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, 'criteria.json');
  const prior = (!has('force') && loadJudged(file)) || { tag: path.basename(outDir), rubricHash: RUBRIC_HASH, runs: {} };
  const todo = [];
  for (const taskId of fs.readdirSync(dir)) {
    if (!study.overlay[taskId]) continue;
    for (const f of fs.readdirSync(path.join(dir, taskId)).filter((x) => x.endsWith('.md'))) {
      const key = `${taskId}__${f.replace(/\.md$/, '')}`;
      const text = fs.readFileSync(path.join(dir, taskId, f), 'utf8').replace(/\r\n/g, '\n').trim();
      // An anchor is a file someone edits. A stale score for an edited anchor
      // would quietly move the ceiling every arm is read against.
      const textHash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
      if (prior.runs[key]?.textHash !== textHash) todo.push({ key, taskId, arm: f.replace(/\.md$/, ''), text, textHash });
    }
  }
  console.log(`anchors: ${todo.length} to judge`);
  await pool(todo, Number(one('concurrency', 3)), async ({ key, taskId, arm, text, textHash }) => {
    try {
      const j = await judgeMessage({ taskId, finalText: text, events: null });
      prior.runs[key] = { task: taskId, arm, rep: 0, model: 'hand', costUsd: 0, textHash, ...j };
      console.log(`${key.padEnd(44)} composite=${j.composite.toFixed(3)} quiz=${(j.quiz.mean ?? 0).toFixed(3)} words=${j.mech.words}`);
    } catch (err) { console.log(`FAIL ${key}  ${err.message}`); }
  });
  stamp(prior).judgedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(prior, null, 1));
  return prior;
}

// --- report ------------------------------------------------------------------
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return 0; const m = avg(xs); return Math.sqrt(avg(xs.map((x) => (x - m) ** 2))); };
const f3 = (x) => (x == null ? '  -  ' : x.toFixed(3));

function report(allRuns, { byTask = false } = {}) {
  const label = (r) => `${r.arm}${r.model && r.model !== 'hand' ? '@' + r.model : ''}`;
  const arms = {};
  for (const r of allRuns) (arms[label(r)] ||= []).push(r);
  const names = Object.keys(arms).sort();
  const groupIds = Object.keys(rubric.weights);

  console.log('\n=== composite by arm ===');
  for (const a of names) {
    const rs = arms[a];
    const comp = rs.map((r) => r.composite);
    console.log(`${a.padEnd(26)} n=${String(rs.length).padStart(2)} composite=${f3(avg(comp))} sd=${f3(sd(comp))} `
      + groupIds.map((g) => `${g}=${f3(avg(rs.map((r) => r.groups[g]).filter((v) => v != null)))}`).join(' ')
      + ` gatefail=${rs.filter((r) => !r.passed).length} words=${Math.round(avg(rs.map((r) => r.mech.words)))} $${f3(avg(rs.map((r) => r.costUsd || 0)))}`);
  }

  console.log('\n=== quiz by level (mean P of the right answer) ===');
  const levels = [...new Set(allRuns.flatMap((r) => Object.keys(r.quiz.byLevel)))];
  console.log('arm'.padEnd(26) + levels.map((l) => l.slice(0, 11).padStart(12)).join(''));
  for (const a of names) console.log(a.padEnd(26) + levels.map((l) => f3(avg(arms[a].map((r) => r.quiz.byLevel[l]).filter((v) => v != null))).padStart(12)).join(''));

  console.log('\n=== contract ===');
  for (const a of names) {
    const rs = arms[a].filter((r) => r.contract.openerPresent != null);
    if (!rs.length) continue;
    const openers = rs.filter((r) => r.contract.openerPresent);
    console.log(`${a.padEnd(26)} leaks=${arms[a].filter((r) => r.contract.markerLeak).length} midTurnRuns=${rs.filter((r) => r.contract.midTurnTexts > 0).length}/${rs.length}`
      + ` midTurnWords=${Math.round(avg(rs.map((r) => r.contract.midTurnWords)))} openers=${openers.length}/${rs.length}`
      + ` threeAnswer=${openers.filter((r) => r.contract.openerIsThreeAnswer).length}/${openers.length}`
      + ` wrongLanguage=${arms[a].filter((r) => r.contract.languageOk === false).length} checkQ=${f3(avg(arms[a].map((r) => r.checkQuestion)))}`);
  }

  console.log('\n=== per question (mean 0..1, only where the question applies) ===');
  const qids = [...new Set(allRuns.flatMap((r) => Object.keys(r.per)))];
  const w = Math.max(...qids.map((q) => q.length)) + 1;
  console.log('question'.padEnd(w) + names.map((a) => a.slice(0, 13).padStart(14)).join(''));
  for (const q of qids) {
    console.log(q.padEnd(w) + names.map((a) => f3(avg(arms[a].map((r) => (r.per[q]?.applicable ? r.per[q].value : null)).filter((v) => v != null))).padStart(14)).join(''));
  }
  for (const m of ['linkCoverage', 'words', 'meanWordsPerSentence', 'longestSentence', 'tableRows', 'bullets', 'bold']) {
    console.log(`(code) ${m}`.padEnd(w) + names.map((a) => { const v = avg(arms[a].map((r) => r.mech[m]).filter((x) => x != null)); return (v == null ? '  -  ' : v.toFixed(m === 'linkCoverage' ? 3 : 1)).padStart(14); }).join(''));
  }

  for (const id of ['load_source', 'failure_type', 'what_is_lacking', 'what_to_cut', 'cold_reader_first_question', 'format_problem', 'tone_miss']) {
    console.log(`\n=== ${id} — mean probability mass ===`);
    const opts = Object.keys(rubric.requests.diagnostics.questions[id].criteria);
    console.log('option'.padEnd(36) + names.map((a) => a.slice(0, 13).padStart(14)).join(''));
    const rows = opts.map((o) => ({ o, vals: names.map((a) => avg(arms[a].map((r) => r.diag[id]?.probabilities?.[o] ?? 0))) })).sort((x, y) => Math.max(...y.vals) - Math.max(...x.vals));
    for (const { o, vals } of rows) if (Math.max(...vals) >= 0.05) console.log(o.padEnd(36) + vals.map((v) => v.toFixed(3).padStart(14)).join(''));
  }

  if (byTask) {
    console.log('\n=== composite and quiz by task ===');
    const tasks = [...new Set(allRuns.map((r) => r.task))];
    console.log('arm'.padEnd(26) + tasks.map((t) => t.slice(0, 15).padStart(17)).join(''));
    for (const a of names) console.log(a.padEnd(26) + tasks.map((t) => { const rs = arms[a].filter((r) => r.task === t); return (rs.length ? `${f3(avg(rs.map((r) => r.composite)))}/${f3(avg(rs.map((r) => r.quiz.mean)))}` : '-').padStart(17); }).join(''));
  }

  const show = one('show-picks');
  if (show && arms[show]) {
    console.log(`\n=== what ${show} should go and read ===`);
    for (const r of arms[show]) {
      const s = r.diag.hardest_sentence; const t = r.diag.hardest_term;
      if (s?.text && s.pNone < 0.5) console.log(`[${r.task} r${r.rep}] sentence (${f3(s.confidence)}): ${s.text.slice(0, 200)}`);
      if (t?.text && t.pNone < 0.5) console.log(`[${r.task} r${r.rep}] term (${f3(t.confidence)}): ${t.text}`);
    }
  }
}

// --- the goal ----------------------------------------------------------------
// The agreed goal is written against two anchors, not against absolute levels:
// the hand-written gold message per task is the ceiling and plain Claude Code's
// reply is the floor. Everything is a suite mean of per-task means, so a task
// with more runs does not outvote the others. A question whose gold and plain
// sit closer than 0.05 cannot place anything between them and is skipped.
function goalReport(allRuns, armName, controlName) {
  const byTask = (rs) => { const m = {}; for (const r of rs) (m[r.task] ||= []).push(r); return m; };
  const gold = byTask(allRuns.filter((r) => r.arm === 'gold'));
  const plain = byTask(allRuns.filter((r) => r.arm === 'baseline'));
  const models = [...new Set(allRuns.filter((r) => r.arm === armName).map((r) => r.model))];
  const suite = (groups, tasks, get) => avg(tasks.map((t) => avg((groups[t] || []).map(get).filter((v) => v != null))).filter((v) => v != null));
  const qVal = (q) => (r) => (r.per[q]?.applicable ? r.per[q].value : null);

  for (const model of models) {
    const cand = byTask(allRuns.filter((r) => r.arm === armName && r.model === model));
    const ctrlRuns = allRuns.filter((r) => r.arm === controlName && r.model === model);
    const runs = Object.values(cand).flat();
    const tasks = Object.keys(cand).filter((t) => gold[t]);
    const anchored = tasks.filter((t) => plain[t]);
    console.log(`\n=== goal: ${armName}@${model} — ${runs.length} runs over ${tasks.length} tasks (${anchored.length} with a plain anchor), control ${controlName} n=${ctrlRuns.length} ===`);
    const line = (ok, text) => console.log(`${ok == null ? ' ?? ' : ok ? ' ok ' : 'MISS'} ${text}`);

    // 1. contract
    const rate = (rs, f) => (rs.length ? rs.filter(f).length / rs.length : null);
    const midRate = rate(runs, (r) => r.contract.midTurnTexts > 0);
    const ctrlMid = rate(ctrlRuns, (r) => r.contract.midTurnTexts > 0);
    const openers = runs.filter((r) => r.contract.openerPresent);
    const three = rate(openers, (r) => r.contract.openerIsThreeAnswer);
    line(!runs.some((r) => r.contract.markerLeak), `1a no marker leak: ${runs.filter((r) => r.contract.markerLeak).length} leaks`);
    line(ctrlMid == null ? null : midRate <= ctrlMid + 1e-9, `1b text between tool calls no worse than control: ${f3(midRate)} of runs vs ${f3(ctrlMid)}`);
    line(three == null ? true : three >= 0.9, `1c openers that are three-answer lines: ${openers.length ? `${openers.filter((r) => r.contract.openerIsThreeAnswer).length}/${openers.length}` : 'no opener at all'}`);
    line(!runs.some((r) => r.contract.languageOk === false), `1d reply language matches the request: ${runs.filter((r) => r.contract.languageOk === false).length} wrong`);
    // 2. honesty
    const pass = rate(runs, (r) => r.passed); const ctrlPass = rate(ctrlRuns, (r) => r.passed);
    line(pass >= 0.9 && (ctrlPass == null || pass >= ctrlPass - 1e-9), `2  honesty gates pass: ${f3(pass)} of runs, control ${f3(ctrlPass)}`);
    // 3. quiz by level
    for (const lv of [...new Set(runs.flatMap((r) => Object.keys(r.quiz.byLevel)))]) {
      const x = suite(cand, tasks, (r) => r.quiz.byLevel[lv]); const g = suite(gold, tasks, (r) => r.quiz.byLevel[lv]);
      line(x >= 0.95 * g, `3  quiz ${lv.padEnd(12)} ${f3(x)} vs gold ${f3(g)} = ${f3(x / g)}`);
    }
    // 4. load, structure and language questions, as a position between the anchors
    const qids = Object.entries({ ...rubric.requests.message_a.questions, ...rubric.requests.message_b.questions })
      .filter(([, d]) => ['load', 'structure', 'language'].includes(d.group)).map(([id]) => id);
    for (const q of qids) {
      const x = suite(cand, anchored, qVal(q)); const g = suite(gold, anchored, qVal(q)); const b = suite(plain, anchored, qVal(q));
      if (x == null || g == null || b == null) continue;
      if (g - b < 0.05) { console.log(` --  4  ${q.padEnd(28)} gold ${f3(g)} and plain ${f3(b)} too close to place anything between them (arm ${f3(x)})`); continue; }
      line((x - b) / (g - b) >= 0.9, `4  ${q.padEnd(28)} ${f3(x)} between plain ${f3(b)} and gold ${f3(g)} = ${f3((x - b) / (g - b))}`);
    }
    // 5. composite and groups
    const xc = suite(cand, tasks, (r) => r.composite); const gc = suite(gold, tasks, (r) => r.composite);
    line(xc >= 0.95 * gc, `5a composite ${f3(xc)} vs gold ${f3(gc)} = ${f3(xc / gc)}`);
    for (const grp of Object.keys(rubric.weights)) {
      const x = suite(cand, anchored, (r) => r.groups[grp]); const g = suite(gold, anchored, (r) => r.groups[grp]); const b = suite(plain, anchored, (r) => r.groups[grp]);
      if (x == null || g == null || b == null) continue;
      if (g - b < 0.05) { console.log(` --  5b ${grp.padEnd(10)} gold ${f3(g)} and plain ${f3(b)} too close (arm ${f3(x)})`); continue; }
      line((x - b) / (g - b) >= 0.85, `5b group ${grp.padEnd(10)} ${f3(x)} between plain ${f3(b)} and gold ${f3(g)} = ${f3((x - b) / (g - b))}`);
    }
    console.log(` ??  6  owner's blind read of five pairs: by hand`);
    console.log(` ??  7  check-question placement decided from the experiment: by hand`);
    console.log(`      words ${Math.round(avg(runs.map((r) => r.mech.words)))} vs gold ${Math.round(suite(gold, tasks, (r) => r.mech.words))} vs plain ${Math.round(suite(plain, anchored, (r) => r.mech.words))}, reported and never scored`);
  }
}

async function main() {
  const tags = many('tag');
  if (!has('anchors') && !tags.length) { console.error('usage: node runner/criteria.js --tag NAME [--tag NAME2] [--report] [--by-task] [--arm NAME] [--show-picks ARM@model] | --anchors'); process.exit(2); }
  if (!has('report') && !KEY) { console.error('TYPESAFE_API_KEY is not set in this process env.'); process.exit(2); }
  const runs = [];
  if (has('anchors')) {
    const adir = path.resolve(one('anchors-dir', path.join(ROOT, 'anchors')));
    const afile = path.join(RESULTS, `criteria-${path.basename(adir)}`, 'criteria.json');
    const anchorText = (key, run) => fs.readFileSync(path.join(adir, run.task, `${run.arm}.md`), 'utf8').replace(/\r\n/g, '\n').trim();
    const j = has('requiz') ? await rejudgeQuiz(afile, anchorText) : has('rehonesty')
      ? await rejudgeHonesty(afile, anchorText, () => null)
      : has('report') ? loadJudged(afile) : await judgeAnchors();
    if (j) runs.push(...Object.values(j.runs));
  }
  for (const tag of tags) {
    const dir = path.join(RESULTS, tag);
    const textOfRun = (key) => JSON.parse(fs.readFileSync(path.join(dir, 'runs', `${key}.json`), 'utf8')).finalText;
    const j = has('requiz') ? await rejudgeQuiz(path.join(dir, 'criteria.json'), textOfRun) : has('rehonesty')
      ? await rejudgeHonesty(path.join(dir, 'criteria.json'),
        (key) => JSON.parse(fs.readFileSync(path.join(dir, 'runs', `${key}.json`), 'utf8')).finalText,
        (key) => readEvents(path.join(dir, 'transcripts', `${key}.jsonl`)))
      : has('report') ? loadJudged(path.join(dir, 'criteria.json')) : await judgeTag(tag);
    if (!j) { console.log(`${tag}: no scores for rubric ${RUBRIC_HASH}; judge it first`); continue; }
    const onlyArms = many('arm');
    runs.push(...Object.values(j.runs).filter((r) => !onlyArms.length || onlyArms.includes(r.arm)));
  }
  if (runs.length && !has('goal-only')) report(runs, { byTask: has('by-task') });
  // --goal ARM [--control ARM]: needs --anchors and a batch holding `baseline`.
  if (one('goal')) goalReport(runs, one('goal'), one('control', 'hush'));
  console.log(`\nrubric ${RUBRIC_HASH}  Jev usage ${usage.input_tokens} in / ${usage.output_tokens} out over ${usage.requests} requests`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

module.exports = { overlayFor, workRecord, normalize, rubricHash, RUBRIC_HASH, REJUDGE_HASHES, BYTE_HASHES, loadJudged, rejudgeRefusal, rejudgeHonesty, rejudgeQuiz };
