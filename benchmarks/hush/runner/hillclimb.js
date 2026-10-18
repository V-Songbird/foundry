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
//   node --env-file=<key file> runner/hillclimb.js --variant v1 --flow <Foundry>/.claude/hillclimb/hush-fidelity --regrade --go --max-usd 1
//                                                        # regrade, the checks=off and detail=bare rows by a model judge
//
// Flags after -- go to run.js. --flow defaults to <Foundry>/.claude/hillclimb/hush.
// Give the fidelity eval its own --flow: the tag comes from the flow's name,
// so the default flow would collide with the main suite's batch.
// --go and --max-usd are taken only with --regrade. Without them a judged row
// prints the worst case and is listed as SKIP; a judge error is a SKIP too.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const hc = require('../../hillclimb.js');
const { runCheck, checkTask } = require('./metrics.js');
const { workspaceName } = require('./provenance.js');
const fidelity = require('./fidelity.js');
const { dataDir } = require('../../paths.js');

const ROOT = path.resolve(__dirname, '..');
const TASKS = new Map([...JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8')), ...fidelity.tasks()].map((t) => [t.id, t]));
const prompts = (task) => task.prompts || [task.prompt];
const grade = (check) => ({ pass: check.pass ? 1 : 0, score: check.score });
const judged = new Map(); // meta.run -> the judge's verdicts for the two regrade passes, in call order

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
  if (task.check.type === 'conformance' && fidelity.needsJudge(task.check)) {
    const v = judged.get(meta.run);
    if (!v?.length) throw new Error('the passed-check question needs the judge: add --go --max-usd <usd>, with the key loaded through node --env-file');
    return grade(fidelity.grade(task.check, rec.finalText || '', v.shift()));
  }
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

// Asks the judge about every stored row of a checks=off or detail=bare case,
// twice, one request per regrade pass, and keeps the verdicts for gradeStored.
// A row whose run file is gone is left out; gradeStored then lists it as SKIP.
async function judgeStored(rows, { go, maxUsd, log = console.log } = {}) {
  judged.clear();
  const picked = [];
  const texts = [];
  for (const row of rows) {
    const task = TASKS.get(row.meta?.task);
    if (task?.check.type !== 'conformance' || !fidelity.needsJudge(task.check)) continue;
    let text;
    try { text = JSON.parse(fs.readFileSync(row.meta.run, 'utf8')).finalText || ''; } catch { continue; }
    picked.push(row.meta.run);
    texts.push(text, text);
  }
  const r = await fidelity.judge(texts, { go, maxUsd, log });
  if (r.verdicts?.length) picked.forEach((run, i) => judged.set(run, [r.verdicts[2 * i], r.verdicts[2 * i + 1]]));
  if (r.spentUsd !== undefined) log(`judge spent $${r.spentUsd.toFixed(3)}`);
  return r;
}

// hc.main with --go and --max-usd taken off a --regrade call; any other call
// keeps them, so hc.main still refuses them.
async function cli(argv = process.argv.slice(2)) {
  const sep = argv.indexOf('--');
  let own = sep < 0 ? argv : argv.slice(0, sep);
  const tail = sep < 0 ? [] : argv.slice(sep);
  const valueOf = (n) => { const i = own.indexOf(n); return i < 0 ? null : own[i + 1] ?? null; };
  if (!own.includes('--regrade')) return hc.main(suite, argv);
  const go = own.includes('--go');
  const maxUsd = valueOf('--max-usd');
  own = own.filter((a, i) => a !== '--go' && a !== '--max-usd' && own[i - 1] !== '--max-usd');
  const flow = path.resolve(valueOf('--flow') || path.join(hc.FOUNDRY, '.claude', 'hillclimb', suite.name));
  const file = path.join(flow, String(valueOf('--variant')), 'results.jsonl');
  if (fs.existsSync(file)) {
    const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    try {
      await judgeStored(rows, { go, maxUsd: maxUsd === null ? undefined : Number(maxUsd) });
    } catch (err) {
      console.log(err.message);
      return 1;
    }
  }
  return hc.main(suite, [...own, ...tail]);
}

const suite = { name: 'hush', arm: 'hush', adapt, live, gradeStored, smoke, cli, judgeStored };
module.exports = suite;
if (require.main === module) cli().then((code) => { process.exitCode = code; });
