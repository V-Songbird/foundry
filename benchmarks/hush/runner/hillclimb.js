#!/usr/bin/env node
'use strict';
// The entry point /claude-api hillclimb calls once per variant. It runs the
// hush arm through runner/run.js, then writes the variant's results.jsonl,
// traces/ and errors.jsonl from that run's records and transcripts.
//
//   node runner/hillclimb.js --variant baseline -- --reps 2 --model sonnet
//   node runner/hillclimb.js --variant v1 --from <tag>   # adapt a finished run, start nothing
//   node runner/hillclimb.js --variant v1 --regrade      # grade stored output twice, list flips
//   node runner/hillclimb.js --smoke                     # oracle and null through the grader
//   node runner/hillclimb.js --variant baseline --flow <Foundry>/.claude/hillclimb/hush-fidelity -- --fidelity --reps 2
//                                                        # the message-settings fidelity eval
//   node --env-file=<key file> runner/hillclimb.js --variant v1 --flow <Foundry>/.claude/hillclimb/hush-fidelity --from <tag> --go --max-usd 1
//                                                        # the fidelity eval, checks=off and detail=bare graded by a model judge
//
// Flags after -- go to run.js. --flow defaults to <Foundry>/.claude/hillclimb/hush.
// Give the fidelity eval its own --flow: the tag comes from the flow's name,
// so the default flow would collide with the main suite's batch.
// --go and --max-usd let the CLI send the fidelity eval's checks=off and
// detail=bare rows to the judge, whether it writes the variant (a live run or
// --from) or regrades it. Before any session or batch starts, the CLI refuses
// a judge bound above --max-usd: batch-judge.js's estimate for every request
// at the input bound, at three characters per token and without the schema's
// tokens, so an estimate, not a hard limit. Without them the CLI prints
// the worst case, writes those rows to errors.jsonl and lists them as SKIP on
// a regrade. With the key loaded, a live run's claude -p sessions bill that
// key too; --max-usd caps only the judge batch.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const hc = require('../../hillclimb.js');
const { runCheck, checkTask } = require('./metrics.js');
const { workspaceName } = require('./provenance.js');
const fidelity = require('./fidelity.js');
const { MAX_TOKENS } = require('../../batch-judge.js');
const { dataDir } = require('../../paths.js');

const ROOT = path.resolve(__dirname, '..');
const TASKS = new Map([...JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8')), ...fidelity.tasks()].map((t) => [t.id, t]));
const prompts = (task) => task.prompts || [task.prompt];
const grade = (check) => ({ pass: check.pass ? 1 : 0, score: check.score });

function adapt(tag, arm) {
  const out = path.join(dataDir('hush'), 'results', tag);
  const attempts = [];
  const unknown = new Set();
  for (const f of fs.readdirSync(path.join(out, 'runs')).filter((n) => n.endsWith('.json')).sort()) {
    const run = path.join(out, 'runs', f);
    const rec = JSON.parse(fs.readFileSync(run, 'utf8'));
    const task = TASKS.get(rec.task);
    if (rec.arm === arm && !task) unknown.add(rec.task);
    if (rec.arm !== arm || !task) continue;
    let transcript = '';
    try { transcript = fs.readFileSync(path.join(out, 'transcripts', `${rec.key}.jsonl`), 'utf8'); } catch { /* none */ }
    attempts.push({
      prompt_id: rec.task, rep: rec.rep - 1, prompt: prompts(task).join('\n\n'),
      tags: [rec.segment, task.category].filter(Boolean),
      grade: rec.check ? grade(rec.check) : null, error: rec.error,
      // turnsRun pins the call count to what the run sent, not today's tasks.json.
      stream: hc.readStream(transcript, prompts(task), rec.turnsRun ?? prompts(task).length),
      meta: {
        task: rec.task, run, cli_cost_usd: rec.costUsd ?? null,
        workDir: path.join(os.tmpdir(), 'work', workspaceName(rec.batchId, rec.key)),
      },
    });
  }
  // Tasks added with -- --extra-tasks are not in tasks.json, so they cannot be graded here.
  if (unknown.size) console.warn(`skipped records of tasks not in tasks.json: ${[...unknown].join(', ')}`);
  return attempts;
}

function live(tag, arm, extra) {
  // run.js keeps a tag's seed in batch.json; a second call on the tag resumes it.
  const planned = fs.existsSync(path.join(dataDir('hush'), 'results', tag, 'batch.json'));
  const r = spawnSync(process.execPath, [path.join(__dirname, 'run.js'), '--tag', tag, '--arms', arm,
    ...(planned ? ['--resume'] : []), ...extra], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`run.js exited ${r.status}`);
  return tag;
}

// The stored final message, and for a tests check or a keyword check that reads
// files (orFiles) a copy of the workspace the session left. checkTask takes a
// held-out grader from the fixture, as the live run did.
function gradeStored(meta) {
  const task = TASKS.get(meta.task);
  const rec = JSON.parse(fs.readFileSync(meta.run, 'utf8'));
  const ws = hc.scratchCopy(meta.workDir);
  try {
    if ((task.check.type === 'tests' || task.check.orFiles) && !ws) throw new Error(`workspace ${meta.workDir} is gone`);
    return grade(checkTask(task, rec.finalText || '', ws));
  } finally {
    if (ws) fs.rmSync(ws, { recursive: true, force: true });
  }
}

// Oracle: a keyword task's reference answer under anchors/, where one exists,
// and a fidelity case's message under anchors/fidelity/; the tests tasks ship
// no reference solution. Null: an empty reply in the untouched fixture, so the
// fixture alone must not satisfy the grader.
function smoke() {
  const cases = [];
  const graded = fidelity.hasContract();
  if (!graded) console.warn('fidelity cases left out: the hush checkout has no modules/, so their grader cannot load');
  for (const task of TASKS.values()) {
    const conformance = task.check.type === 'conformance';
    if (conformance && !graded) continue;
    const gold = conformance ? path.join(ROOT, 'anchors', 'fidelity', `${task.check.gold}.md`) : path.join(ROOT, 'anchors', task.id, 'gold.md');
    if ((conformance || task.check.type === 'keywords') && fs.existsSync(gold)) {
      cases.push({ id: task.id, kind: 'oracle', pass: grade(runCheck(task.check, fs.readFileSync(gold, 'utf8'), null)).pass });
    }
    const ws = hc.scratchCopy(path.join(ROOT, 'fixtures', task.fixture));
    try { cases.push({ id: task.id, kind: 'null', pass: grade(runCheck(task.check, '', ws)).pass }); }
    finally { fs.rmSync(ws, { recursive: true, force: true }); }
  }
  return cases;
}

// The checks=off and detail=bare cases of the fidelity eval, whose passed-check
// question the model judge answers when the CLI writes or regrades a variant.
const NEEDS_JUDGE = 'the passed-check question needs the judge: add --go --max-usd <usd>, with the key loaded through node --env-file';
const judgedCase = (meta) => { const t = TASKS.get(meta?.task); return t?.check.type === 'conformance' && fidelity.needsJudge(t.check); };
const finalText = (run) => JSON.parse(fs.readFileSync(run, 'utf8')).finalText || '';
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
// The stored rows of a variant that a regrade sends to the judge, in file order.
const judgedRows = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : [])
  .map((l) => JSON.parse(l)).filter((r) => judgedCase(r.meta) && fs.existsSync(r.meta.run));
const { rowKey } = hc;

// One judge batch over the stored final message of each run, `times` requests
// per run in a row. Returns the verdicts in request order, or null without --go.
async function judgeRuns(runs, times, { go, maxUsd, log = console.log }) {
  const r = await fidelity.judge(runs.flatMap((run) => Array(times).fill(finalText(run))), { go, maxUsd, log });
  if (r.spentUsd !== undefined) log(`judge spent $${r.spentUsd.toFixed(3)}`);
  return r.verdicts;
}

// The judge requests a call can send, counted before any session starts: the
// strict records a live run will make (its tasks x reps), those of the --from
// run, or two per stored strict row on --regrade.
function judgeRequests(opts, extra, file) {
  if (opts.regrade) return 2 * judgedRows(file).length;
  if (opts.from) {
    const dir = path.join(dataDir('hush'), 'results', opts.from, 'runs');
    const recs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => readJson(path.join(dir, n))) : [];
    return recs.filter((r) => r.arm === opts.arm && judgedCase(r)).length;
  }
  const val = (n) => { const i = extra.indexOf(`--${n}`); return i < 0 ? null : extra[i + 1]; };
  const ids = val('tasks')?.split(',');
  const picked = [...TASKS.values()].filter((t) => (ids ? ids.includes(t.id) : extra.includes('--fidelity')) && judgedCase({ task: t.id }));
  return picked.length * Number(val('reps') ?? readJson(path.join(ROOT, 'config.json')).reps);
}

// adapt, with each judged case graded again with the judge's verdict in place
// of the regex grade the run recorded. An unjudged row, a judge error or a
// refused batch goes to errors.jsonl as judge_error, never to results.jsonl.
async function adaptJudged(source, arm, opts) {
  const attempts = adapt(source, arm);
  const picked = attempts.filter((a) => a.grade && !a.stream.failure && judgedCase(a.meta));
  let verdicts = null;
  let refused = null;
  try { verdicts = await judgeRuns(picked.map((a) => a.meta.run), 1, opts); } catch (err) { refused = err.message; console.log(refused); }
  for (const [i, a] of picked.entries()) {
    try {
      const v = verdicts?.[i];
      if (!v) throw new Error(refused || NEEDS_JUDGE);
      a.grade = grade(fidelity.grade(TASKS.get(a.meta.task).check, finalText(a.meta.run), v));
    } catch (err) {
      Object.assign(a, { grade: null, error: err.message });
      a.stream.failure = 'judge_error';
    }
  }
  return attempts;
}

// The suite hc.main runs from the CLI. A regrade sends one batch, two requests
// per judged row in file order, at its first judged row, after hc.main has
// checked every argument; a judge error or a missing verdict is that row's SKIP.
// Verdicts are kept per row (prompt_id and rep), so a row whose first pass
// throws leaves its second verdict behind without shifting any later row's,
// even one that shares its run file.
function judgedSuite(opts, file) {
  let verdicts = null;
  const byRow = async () => {
    const rows = judgedRows(file);
    const v = await judgeRuns(rows.map((r) => r.meta.run), 2, opts);
    return v && new Map(rows.map((r, i) => [rowKey(r), [v[2 * i], v[2 * i + 1]]]));
  };
  return {
    ...suite,
    live(tag, arm, extra) {
      if (process.env.ANTHROPIC_API_KEY) console.log(BILLING);
      return suite.live(tag, arm, extra);
    },
    adapt: (source, arm) => adaptJudged(source, arm, opts),
    async gradeStored(meta, row) {
      if (!judgedCase(meta)) return gradeStored(meta);
      const text = finalText(meta.run);
      verdicts ||= byRow();
      const v = (await verdicts)?.get(rowKey(row))?.shift();
      if (!v) throw new Error(NEEDS_JUDGE);
      return grade(fidelity.grade(TASKS.get(meta.task).check, text, v));
    },
  };
}

const BILLING = 'ANTHROPIC_API_KEY is loaded, so the claude -p sessions this run starts bill that key too; --max-usd caps only the judge batch';

// hc.main with --go and --max-usd taken off and checked first: --go needs a
// positive --max-usd, the key and no --smoke, and the judge's estimated bound
// must fit the cap, so a session or a batch never starts with a judge that
// cannot answer. hc.main then checks every other argument before the batch
// goes out. A flag given twice is read at its last value, as hc.main reads it.
async function cli(argv = process.argv.slice(2)) {
  const sep = argv.indexOf('--');
  const own = sep < 0 ? argv : argv.slice(0, sep);
  const extra = sep < 0 ? [] : argv.slice(sep + 1);
  const at = own.indexOf('--max-usd');
  const go = own.includes('--go');
  const maxUsd = at < 0 ? undefined : Number(own[at + 1]);
  const kept = own.filter((a, i) => a !== '--go' && (at < 0 || (i !== at && i !== at + 1)));
  const valueOf = (n) => { const i = kept.lastIndexOf(n); return i < 0 ? null : kept[i + 1]; };
  const flow = path.resolve(valueOf('--flow') || path.join(hc.FOUNDRY, '.claude', 'hillclimb', suite.name));
  const file = path.join(flow, String(valueOf('--variant')), 'results.jsonl');
  // Infinity is refused too: batch-judge.js's cap test passes it, so the cap would not cap.
  let problem = (at >= 0 && !(Number.isFinite(maxUsd) && maxUsd > 0) &&`--max-usd needs a positive number of USD, got ${own[at + 1]}`)
    || (go && at < 0 && '--go needs --max-usd <usd>')
    || (go && kept.includes('--smoke') && '--go has no use with --smoke, which never asks the judge')
    || (go && !process.env.ANTHROPIC_API_KEY && '--go needs ANTHROPIC_API_KEY; run with node --env-file=<key file>');
  if (!problem && go) {
    const n = judgeRequests({ regrade: kept.includes('--regrade'), from: valueOf('--from'), arm: valueOf('--arm') || suite.arm }, extra, file);
    const bound = fidelity.judgeBoundUsd(n);
    console.log(`judge bound: ${n} request(s), $${bound.toFixed(2)} estimated by batch-judge.js (input up to ${fidelity.JUDGE_INPUT_CHARS} characters, reply up to ${MAX_TOKENS} tokens); cap --max-usd ${maxUsd}`);
    if (bound > maxUsd) problem = `judge bound $${bound.toFixed(2)} is above --max-usd ${maxUsd}; no session started and nothing was sent`;
  }
  if (problem) {
    console.error(problem);
    return 2;
  }
  return hc.main(judgedSuite({ go, maxUsd }, file), [...kept, ...(sep < 0 ? [] : argv.slice(sep))]);
}

const suite = { name: 'hush', arm: 'hush', adapt, live, gradeStored, smoke, cli };
module.exports = suite;
// A throw outside hc.main's own catch, such as a malformed results.jsonl line
// while --go counts the judge bound, ends with its message and exit code 1.
if (require.main === module) {
  cli().catch((err) => { console.error(`hush: ${err.message}`); return 1; }).then((code) => { process.exitCode = code; });
}
