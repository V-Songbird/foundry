#!/usr/bin/env node
'use strict';
// Orchestrates headless `claude -p` sessions: tasks x arms x reps, isolated
// workspaces, stream-json transcripts, metrics + ground-truth check per run.
//
//   node run.js --tag full [--tasks a,b] [--arms baseline,hush] [--reps 2]
//               [--model sonnet] [--concurrency 3]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { parseTranscript, runCheck } = require('./metrics.js');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'));

// --- CLI args ---------------------------------------------------------------
const argv = process.argv.slice(2);
function flag(name, dflt) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
}
const tag = flag('tag', 'dev');
const model = flag('model', CONFIG.model);
const reps = Number(flag('reps', CONFIG.reps));
const concurrency = Number(flag('concurrency', CONFIG.concurrency));
const armNames = (flag('arms', Object.keys(CONFIG.arms).join(','))).split(',');
const taskIds = flag('tasks', null);
const resume = argv.includes('--resume');
const tasks = taskIds ? TASKS.filter((t) => taskIds.split(',').includes(t.id)) : TASKS;

const outDir = path.join(ROOT, 'results', tag);
for (const d of ['runs', 'transcripts']) fs.mkdirSync(path.join(outDir, d), { recursive: true });

// Workdirs live OUTSIDE the repo, in the OS temp dir. Claude Code injects
// ambient git status / recent commits into the system prompt for any cwd
// inside a git working tree, regardless of tool restrictions — a workdir
// nested under this monorepo silently leaked the whole repo's history (other
// plugins, unrelated commits) into every session, and a weak model went
// chasing it via `git log`/`git show` well past what the task fixture needed.
const workRoot = path.join(os.tmpdir(), 'hush-bench', tag);
fs.mkdirSync(workRoot, { recursive: true });

// --- environment ------------------------------------------------------------
// Strip nested-session and plugin-tuning vars so each arm starts clean.
function cleanEnv(armEnv) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(CLAUDECODE|CLAUDE_CODE_|HUSH_|CAVEMAN_|RAZOR_|PONYTAIL_)/.test(k)) continue;
    env[k] = v;
  }
  return Object.assign(env, armEnv);
}

function buildArgs(arm) {
  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--model', model,
    '--max-turns', String(CONFIG.maxTurns),
    '--setting-sources', 'project',
    '--strict-mcp-config',
    // bypassPermissions is required here, not a convenience. On this Windows
    // host the headless child exposes NO Bash tool — PowerShell is the sole
    // shell — and under the scoped-allowlist acceptEdits mode its persistent
    // session gets PERMANENTLY poisoned ("Command name is a dynamic expression
    // which cannot be statically validated" on every subsequent command, even
    // `echo hi`) the instant the model issues a script-block pipeline such as
    // `Get-ChildItem | Where-Object {...}` — which the model reliably does as
    // its first exploration step, so tests/builds never ran and the agent
    // hand-traced instead, manufacturing spoken verdicts. bypassPermissions
    // skips the static validation that chokes, so the shell works. Safe because
    // each run is an isolated temp copy of one fixture with no network, and the
    // dangerous tools are still denied below. Both arms get the identical mode.
    '--permission-mode', 'bypassPermissions',
    // disallowedTools is still honored under bypass. Deny the shell/agent/
    // scheduling surface a weaker model could wander into; Bash is listed
    // defensively though it isn't registered on this host.
    '--disallowedTools',
    'Bash,PowerShell(git*),Agent,Task,ScheduleWakeup,CronCreate,RemoteTrigger',
  ];
  for (const d of CONFIG.arms[arm].pluginDirs) args.push('--plugin-dir', d);
  // STALE-COMMENT FIX 2026-07-19: force-for-plugin output styles DO inject
  // into the system prompt in -p mode (ablation-proven, tag bulletwhy), even
  // though the init event still reports output_style "default"/the settings
  // pick. Any arm that loads the hush plugin dir therefore carries the stock
  // hush style invisibly; an arm's settings file selects a style IN ADDITION,
  // not instead. To measure a style alone, load no plugin dir (or a copy with
  // the force-for-plugin line stripped).
  if (CONFIG.arms[arm].settings) args.push('--settings', CONFIG.arms[arm].settings);
  return args;
}

// --- single run -------------------------------------------------------------
function spawnClaude(args, workDir, env, prompt) {
  return new Promise((resolve) => {
    const child = spawn('claude', args, {
      cwd: workDir,
      env,
      shell: true, // resolves claude.cmd on Windows; all args are space-free
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdin.write(prompt);
    child.stdin.end();
    const killer = setTimeout(() => child.kill('SIGKILL'), CONFIG.runTimeoutMs);
    child.on('close', (code) => {
      clearTimeout(killer);
      resolve({ stdout, stderr, code });
    });
  });
}

// A task may carry `prompt` (single turn) or `prompts` (a multi-turn session:
// first call plain -p, each later call -p --continue in the same workdir, so
// history accumulation and re-send costs show up in contextTraffic the way
// they do in real sessions). Per-call metrics are summed; finalText/check
// come from the last turn.
// A batch is a long chain of paid API calls, and the runner is a child of
// whatever shell launched it — an editor restart or a killed parent takes the
// whole run down mid-flight. Completed runs are already on disk, so --resume
// re-reads them instead of paying for them twice.
function completedRun(key) {
  const f = path.join(outDir, 'runs', `${key}.json`);
  if (!resume || !fs.existsSync(f)) return null;
  try {
    const r = JSON.parse(fs.readFileSync(f, 'utf8'));
    return r.error ? null : r;
  } catch { return null; }
}

async function oneRun(task, arm, rep) {
  const key = `${task.id}__${arm}__r${rep}`;
  const done = completedRun(key);
  if (done) { console.log(`SKIP ${key}  (already on disk)`); return done; }
  const workDir = path.join(workRoot, key);
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  if (task.fixture) fs.cpSync(path.join(ROOT, 'fixtures', task.fixture), workDir, { recursive: true });

  const prompts = task.prompts || [task.prompt];
  const env = cleanEnv(CONFIG.arms[arm].env);
  const started = Date.now();
  const calls = [];
  let stderrAll = '';
  for (let i = 0; i < prompts.length; i++) {
    const args = buildArgs(arm);
    if (i > 0) args.push('--continue');
    const r = await spawnClaude(args, workDir, env, prompts[i]);
    calls.push(r.stdout);
    stderrAll += r.stderr;
    if (r.code !== 0 && !r.stdout.trim()) break; // hard spawn failure: stop the chain
  }
  const wallMs = Date.now() - started;
  fs.writeFileSync(path.join(outDir, 'transcripts', `${key}.jsonl`), calls.join('\n'));

  let record;
  try {
    const parsed = calls.map((s) => parseTranscript(s));
    const last = parsed[parsed.length - 1];
    // A rate-limited call is not a failed call — the CLI reports subtype
    // "success", exits 0, and returns "You've hit your session limit ..." as the
    // model's answer, at cost 0. Left alone it lands in the averages as a
    // ~27-word final message that passes for a very terse arm, silently poisoning
    // a whole batch. Fail it loudly so it reads as an error and --resume re-runs it.
    const limited = parsed.find((p) => /you've hit your (session|usage) limit/i.test(p.finalText || ''));
    if (limited) throw new Error(`rate limited: ${limited.finalText.trim().slice(0, 120)}`);
    const sum = (f) => parsed.reduce((n, p) => n + (p[f] || 0), 0);
    const check = runCheck(task.check, last.finalText, workDir);
    record = {
      key, task: task.id, category: task.category, arm, rep, model,
      turnsRun: calls.length, wallMs, check,
      outputStyle: parsed[0].outputStyle,
      costUsd: parsed.reduce((n, p) => n + (p.costUsd || 0), 0),
      numTurns: sum('numTurns'), durationMs: sum('durationMs'),
      resultSubtype: last.resultSubtype,
      usage: { output_tokens: parsed.reduce((n, p) => n + (p.usage?.output_tokens || 0), 0) },
      contextTraffic: sum('contextTraffic'), apiCalls: sum('apiCalls'),
      toolCalls: sum('toolCalls'), toolResultChars: sum('toolResultChars'),
      narrationWords: sum('narrationWords'), finalWords: last.finalWords,
      // What the user actually had to read: every turn's deliverable, not just
      // the last one. On a multi-turn task the middle turns carry the long
      // explanations, so `finalWords` alone understates the reading load.
      finalWordsAll: sum('finalWords'),
      finalText: last.finalText,
      finalTexts: parsed.map((p) => p.finalText),
      stderr: stderrAll.slice(0, 2000),
    };
  } catch (err) {
    record = { key, task: task.id, arm, rep, wallMs, error: String(err), stderr: stderrAll.slice(0, 2000) };
  }
  fs.writeFileSync(path.join(outDir, 'runs', `${key}.json`), JSON.stringify(record, null, 2));
  const ok = record.check ? (record.check.pass ? 'PASS' : 'FAIL') : 'ERR ';
  console.log(`${ok} ${key}  cost=$${record.costUsd ?? '?'}  out=${record.usage?.output_tokens ?? '?'}tok  traffic=${record.contextTraffic ?? '?'}  ${Math.round(wallMs / 1000)}s`);
  return record;
}

// --- pool -------------------------------------------------------------------
async function main() {
  const queue = [];
  for (const task of tasks) for (const arm of armNames) for (let r = 1; r <= reps; r++) queue.push([task, arm, r]);
  console.log(`${queue.length} runs (${tasks.length} tasks x ${armNames.length} arms x ${reps} reps), model=${model}, tag=${tag}`);

  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < queue.length) {
      const [task, arm, r] = queue[idx++];
      results.push(await oneRun(task, arm, r));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));

  const failures = results.filter((r) => !r.check || !r.check.pass);
  console.log(`\ndone: ${results.length - failures.length}/${results.length} passed ground truth`);
  if (failures.length) console.log('non-passing:', failures.map((f) => f.key).join(', '));
}

main();
