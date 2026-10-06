#!/usr/bin/env node
'use strict';
// The entry point /claude-api hillclimb calls once per variant. It runs the
// razor arm through runner/run.js, then writes the variant's results.jsonl,
// traces/ and errors.jsonl from the cell workspaces that run left behind.
//
//   node runner/hillclimb.js --variant baseline -- --default --runs 2
//   node runner/hillclimb.js --variant v1 --from <run folder>   # adapt a finished run, start nothing
//   node runner/hillclimb.js --variant v1 --regrade             # grade stored output twice, list flips
//   node runner/hillclimb.js --smoke                            # oracle and null through the grader
//
// Flags after -- go to run.js, which needs a task selector such as --default.
// --flow defaults to <Foundry>/.claude/hillclimb/razor.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const hc = require('../../hillclimb.js');
const { RAZOR_TASKS: TASKS } = require('./tasks.js');
const { scoreCell, RUNS_DIR } = require('./run.js');

const ROOT = path.resolve(__dirname, '..');
const prompts = (task) => [task.prompt, ...(task.followups || []).map((f) => f.prompt)];
const grade = (s) => ({ pass: s.correct === 1 && s.safe === 1 ? 1 : 0, correct: s.correct, safe: s.safe });

// A run folder, or a folder of them (what live() leaves), whose newest wins.
function runFolder(source) {
  const dir = fs.existsSync(source) ? path.resolve(source) : path.join(RUNS_DIR, source);
  const stamps = fs.readdirSync(dir).filter((n) => /^\d{8}-\d{6}$/.test(n)).sort();
  return stamps.length ? path.join(dir, stamps.at(-1)) : dir;
}

async function adapt(source, arm) {
  const dir = runFolder(source);
  const attempts = [];
  const models = new Set();
  for (const name of fs.readdirSync(dir).sort()) {
    const [tid, cellArm, model, rep, more] = name.split('__');
    if (more !== undefined || cellArm !== arm || !(tid in TASKS)) continue;
    models.add(model);
    const ws = path.join(dir, name);
    let transcript = '';
    try { transcript = fs.readFileSync(path.join(ws, '_claude.stream.jsonl'), 'utf8'); } catch { /* none */ }
    const s = await scoreCell(tid, arm, model, ws);
    attempts.push({
      prompt_id: tid, rep: Number(rep), prompt: prompts(TASKS[tid]).join('\n\n'),
      tags: [TASKS[tid].counter ? 'counter' : TASKS[tid].note ? 'note' : 'core', TASKS[tid].axis || 'safe'],
      grade: 'correct' in s ? grade(s) : null, error: s.error,
      stream: hc.readStream(transcript, prompts(TASKS[tid])),
      meta: {
        task: tid, arm, model, workDir: ws, reason: s.reason, cli_cost_usd: s.cost ?? null,
        total_loc: s.total_loc, new_files: s.new_files, install_attempts: s.install_attempts,
      },
    });
  }
  if (models.size > 1) throw new Error(`${dir} mixes models ${[...models].join(', ')}; a variant runs one model`);
  return attempts;
}

function live(tag, arm, extra) {
  const runs = path.join(RUNS_DIR, tag);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'run.js'), '--arms', arm, ...extra],
    { cwd: ROOT, stdio: 'inherit', env: { ...process.env, RAZOR_BENCH_RUNS: runs } });
  if (r.status !== 0) throw new Error(`run.js exited ${r.status}`);
  return runs;
}

async function gradeStored(meta) {
  const ws = hc.scratchCopy(meta.workDir);
  if (!ws) throw new Error(`workspace ${meta.workDir} is gone`);
  try {
    const s = await scoreCell(meta.task, meta.arm, meta.model, ws);
    if (!('correct' in s)) throw new Error(s.error);
    return grade(s);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
}

// Oracle: each task's reference `good` file over its seed. Null: the seed with
// nothing written, which is what a session that did nothing leaves.
async function smoke() {
  const cases = [];
  for (const [tid, task] of Object.entries(TASKS)) {
    for (const kind of ['oracle', 'null']) {
      const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-smoke-'));
      try {
        for (const [fn, content] of Object.entries(task.seed || {})) {
          fs.mkdirSync(path.dirname(path.join(ws, fn)), { recursive: true });
          fs.writeFileSync(path.join(ws, fn), content);
        }
        if (kind === 'oracle') fs.writeFileSync(path.join(ws, task.file), task.good);
        cases.push({ id: tid, kind, pass: grade(await task.score(ws)).pass });
      } finally {
        fs.rmSync(ws, { recursive: true, force: true });
      }
    }
  }
  return cases;
}

const suite = { name: 'razor', arm: 'razor', adapt, live, gradeStored, smoke };
module.exports = suite;
if (require.main === module) hc.main(suite).then((code) => { process.exitCode = code; });
