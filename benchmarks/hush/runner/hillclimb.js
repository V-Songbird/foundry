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
//
// Flags after -- go to run.js. --flow defaults to <Foundry>/.claude/hillclimb/hush.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const hc = require('../../hillclimb.js');
const { runCheck, checkTask } = require('./metrics.js');
const { workspaceName } = require('./provenance.js');
const { dataDir } = require('../../paths.js');

const ROOT = path.resolve(__dirname, '..');
const TASKS = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8')).map((t) => [t.id, t]));
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

// Oracle: a keyword task's reference answer under anchors/, where one exists;
// the tests tasks ship no reference solution. Null: an empty reply in the
// untouched fixture, so the fixture alone must not satisfy the grader.
function smoke() {
  const cases = [];
  for (const task of TASKS.values()) {
    const gold = path.join(ROOT, 'anchors', task.id, 'gold.md');
    if (task.check.type === 'keywords' && fs.existsSync(gold)) {
      cases.push({ id: task.id, kind: 'oracle', pass: grade(runCheck(task.check, fs.readFileSync(gold, 'utf8'), null)).pass });
    }
    const ws = hc.scratchCopy(path.join(ROOT, 'fixtures', task.fixture));
    try { cases.push({ id: task.id, kind: 'null', pass: grade(runCheck(task.check, '', ws)).pass }); }
    finally { fs.rmSync(ws, { recursive: true, force: true }); }
  }
  return cases;
}

const suite = { name: 'hush', arm: 'hush', adapt, live, gradeStored, smoke };
module.exports = suite;
if (require.main === module) hc.main(suite).then((code) => { process.exitCode = code; });
