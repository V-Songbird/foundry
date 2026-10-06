#!/usr/bin/env node
'use strict';
// The entry point /claude-api hillclimb calls once per variant. It runs one
// handoff arm through runner/run.js, then writes the variant's results.jsonl,
// traces/ and errors.jsonl from that run's records and transcripts.
//
//   node runner/hillclimb.js --variant baseline -- --reps 2 --model sonnet
//   node runner/hillclimb.js --variant v1 --from <tag>   # adapt a finished run, start nothing
//   node runner/hillclimb.js --variant v1 --regrade      # grade stored output twice, list flips
//   node runner/hillclimb.js --smoke                     # oracle and null through the grader
//
// The default arm is foreman-std, whose prompts defaultarm/gen.js writes from
// the Foreman checkout: regenerate them after changing Foreman, before a run.
// Flags after -- go to run.js. --flow defaults to <Foundry>/.claude/hillclimb/foreman.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const hc = require('../../hillclimb.js');
const { snapshotDir, scoreRun, textSha256 } = require('./metrics.js');
const { dataDir } = require('../../paths.js');

const ROOT = path.resolve(__dirname, '..');
const TASKS = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8')).map((t) => [t.id, t]));
const appDir = (task) => path.join(ROOT, 'fixtures', task.fixture, 'app');
const grade = (check) => ({ pass: check.pass ? 1 : 0, tests: check.testsPass ? 1 : 0 });

function adapt(tag, arm) {
  const out = path.join(dataDir('foreman'), 'results', tag);
  const attempts = [];
  const models = new Set();
  for (const f of fs.readdirSync(path.join(out, 'runs')).filter((n) => n.endsWith('.json')).sort()) {
    const rec = JSON.parse(fs.readFileSync(path.join(out, 'runs', f), 'utf8'));
    const task = TASKS.get(rec.task);
    if (rec.arm !== arm || !task) continue;
    if (rec.model) models.add(rec.model);
    let transcript = '';
    try { transcript = fs.readFileSync(path.join(out, 'transcripts', `${rec.key}.jsonl`), 'utf8'); } catch { /* none */ }
    // Error records carry no promptFile; their prompt is never shown. The file
    // is read as it is now, so a prompt regenerated since the run is flagged:
    // by its hash, or by its length on a record that predates the hash.
    const prompt = rec.promptFile ? fs.readFileSync(path.join(ROOT, rec.promptFile), 'utf8') : '';
    const promptChanged = rec.promptSha256 ? textSha256(prompt) !== rec.promptSha256
      : rec.promptChars != null && prompt.length !== rec.promptChars;
    if (promptChanged) console.warn(`warning: ${rec.promptFile} changed since ${rec.key} ran; its row shows the current prompt`);
    attempts.push({
      prompt_id: rec.task, rep: rec.rep - 1, prompt, tags: [task.fixture, arm],
      grade: rec.check ? grade(rec.check) : null, error: rec.error,
      stream: hc.readStream(transcript, [prompt]),
      meta: {
        task: rec.task, workDir: path.join(os.tmpdir(), 'foreman-bench', tag, rec.key),
        violations: rec.check?.violations, cli_cost_usd: rec.costUsd ?? null,
        ...(promptChanged ? { prompt_changed: true } : {}),
      },
    });
  }
  if (models.size > 1) throw new Error(`${out} mixes models ${[...models].join(', ')}; a variant runs one model`);
  return attempts;
}

// run.js never clears a tag's runs/, so a second call on the same variant
// would mix its records with the first call's.
function live(tag, arm, extra) {
  const runs = path.join(dataDir('foreman'), 'results', tag, 'runs');
  if (fs.existsSync(runs) && fs.readdirSync(runs).some((n) => n.endsWith('.json'))) {
    throw new Error(`${runs} already holds records; adapt them with --from ${tag}, or move them aside to run again`);
  }
  const r = spawnSync(process.execPath, [path.join(__dirname, 'run.js'), '--tag', tag, '--arms', arm, ...extra],
    { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`run.js exited ${r.status}`);
  return tag;
}

// The grader may write into the tree it grades (test output), so it grades a
// copy. A workspace scored before held-back tests ran in a private copy still
// holds them; they are removed from the copy first, or the shipped-tests step
// would run them too.
function gradeStored(meta) {
  const task = TASKS.get(meta.task);
  const ws = hc.scratchCopy(meta.workDir);
  if (!ws) throw new Error(`workspace ${meta.workDir} is gone`);
  try {
    const hidden = path.join(ROOT, 'fixtures', task.fixture, 'hidden');
    for (const f of fs.existsSync(hidden) ? snapshotDir(hidden).keys() : []) {
      if (!fs.existsSync(path.join(appDir(task), f))) fs.rmSync(path.join(ws, f), { force: true });
    }
    return grade(scoreRun(task, ws, snapshotDir(appDir(task))));
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
}

// Oracle: the fixture's solution over its app. Null: the app untouched.
function smoke() {
  const cases = [];
  for (const task of TASKS.values()) {
    for (const kind of ['oracle', 'null']) {
      const ws = hc.scratchCopy(appDir(task));
      try {
        if (kind === 'oracle') {
          fs.cpSync(path.join(ROOT, 'fixtures', task.fixture, task.solutionDir || 'solution'), ws, { recursive: true });
        }
        cases.push({ id: task.id, kind, pass: grade(scoreRun(task, ws, snapshotDir(appDir(task)))).pass });
      } finally {
        fs.rmSync(ws, { recursive: true, force: true });
      }
    }
  }
  return cases;
}

const suite = { name: 'foreman', arm: 'foreman-std', adapt, live, gradeStored, smoke };
module.exports = suite;
if (require.main === module) hc.main(suite).then((code) => { process.exitCode = code; });
