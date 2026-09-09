#!/usr/bin/env node
'use strict';
// Absolute followability rubric judge. The pairwise friendly/followable judges
// collapse to position bias on near-equal replies; this one scores each
// deliverable ON ITS OWN, blind to which arm produced it, on a 1-5 scale for
// "could a developer new to this codebase act on this without a follow-up?".
// Each deliverable is scored `--scorings` times and averaged. No A/B ordering,
// so no position bias. Anti-padding is stated in the rubric.
//
//   node rubric-judge.js --tag X --arms dStock,dExpl --tasks a,b [--scorings 2] [--model sonnet]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const tag = flag('tag', 'dev');
const arms = flag('arms', 'dStock,dExpl').split(',');
const model = flag('model', 'sonnet');
const scorings = Number(flag('scorings', 2));
const only = flag('tasks', null);
const taskSet = only ? new Set(only.split(',')) : null;

const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'));
const promptsById = new Map(TASKS.map((t) => [t.id, t.prompts || [t.prompt]]));

const runsDir = path.join(ROOT, 'results', tag, 'runs');
const runs = fs.readdirSync(runsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf8')))
  .filter((r) => !r.error && arms.includes(r.arm) && (!taskSet || taskSet.has(r.task)));

const workDir = path.join(os.tmpdir(), 'hush-rubric');
fs.mkdirSync(workDir, { recursive: true });

function cleanEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(CLAUDECODE|CLAUDE_CODE_|HUSH_|CAVEMAN_|RAZOR_)/.test(k)) continue;
    env[k] = v;
  }
  return env;
}

function ask(prompt) {
  return new Promise((resolve) => {
    const child = spawn('claude', [
      '-p', '--output-format', 'json', '--model', model,
      '--max-turns', '1', '--strict-mcp-config', '--setting-sources', 'project',
      '--disallowedTools', 'Bash,PowerShell,Agent,Task,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch',
    ], { cwd: workDir, env: cleanEnv(), shell: true });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stdin.write(prompt);
    child.stdin.end();
    const killer = setTimeout(() => child.kill('SIGKILL'), 120000);
    child.on('close', () => {
      clearTimeout(killer);
      try { const j = JSON.parse(out); resolve({ text: j.result || '', cost: j.total_cost_usd || 0 }); }
      catch { resolve({ text: out, cost: 0 }); }
    });
  });
}

function transcript(r) {
  const prompts = promptsById.get(r.task) || [''];
  const replies = r.finalTexts || [r.finalText];
  const turns = [];
  for (let i = 0; i < prompts.length; i++) {
    turns.push(`Request ${i + 1}:\n${prompts[i]}\n\nReply ${i + 1}:\n${replies[i] ?? '(no reply)'}`);
  }
  return turns.join('\n\n----\n\n');
}

function judgePrompt(r) {
  return [
    'A developer made the request(s) below, and an assistant replied to each. Judge ONLY how',
    'self-contained and followable the reply is — assume the technical content is correct.',
    '',
    'Imagine the reader is a competent developer who is NEW to this particular codebase and did NOT see',
    'any of the assistant\'s internal work (the files it read, its earlier reasoning). Score how well this',
    'reader could act on the reply WITHOUT having to ask a follow-up such as "what do you mean" or',
    '"explain that in plain english".',
    '',
    'Rubric (1-5):',
    '  5 = Nothing to ask. Every term and reference is explained in place, the one key "why" is stated,',
    '      and any file or symbol named is said to DO something, not just pointed at. Newcomer acts at once.',
    '  3 = Mostly clear, but the newcomer would stall on one undefined term, bare reference, or missing link.',
    '  1 = Assumes deep shared context: undefined jargon, "it/this" standing for whole ideas, code pointed at',
    '      but not explained. The newcomer must ask a follow-up before doing anything.',
    '',
    'Length is NOT a virtue. A short reply that leaves nothing to ask scores 5; a long, padded reply that',
    'still forces a follow-up scores low. Judge landing, not word count.',
    '',
    '=== BEGIN TRANSCRIPT ===',
    transcript(r),
    '=== END TRANSCRIPT ===',
    '',
    'Answer with exactly one JSON object and nothing else: {"score": <1-5 integer>, "gaps": "<the follow-up a newcomer would still need, or none>"}',
  ].join('\n');
}

function parseScore(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { const s = Number(JSON.parse(m[0]).score); return Number.isFinite(s) ? s : null; } catch { return null; }
}

async function main() {
  let cost = 0;
  const scored = [];
  let idx = 0;
  async function worker() {
    while (idx < runs.length) {
      const r = runs[idx++];
      const calls = await Promise.all(Array.from({ length: scorings }, () => ask(judgePrompt(r))));
      const scores = calls.map((c) => { cost += c.cost; return parseScore(c.text); }).filter((x) => x != null);
      const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      scored.push({ task: r.task, arm: r.arm, rep: r.rep, scores, mean, finalWords: r.finalWords });
      console.log(`${r.task.padEnd(18)} ${r.arm.padEnd(7)} r${r.rep}: ${mean == null ? '?' : mean.toFixed(1)}  (${scores.join(',')})`);
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));

  // Aggregate: mean rubric score per task per arm, and overall per arm.
  const agg = {};
  for (const s of scored) {
    if (s.mean == null) continue;
    (agg[s.task] = agg[s.task] || {});
    (agg[s.task][s.arm] = agg[s.task][s.arm] || []).push(s.mean);
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(`\nrubric followability (0-5), ${arms.join(' vs ')} — higher is better`);
  const overall = {};
  for (const task of Object.keys(agg).sort()) {
    const parts = arms.map((a) => {
      const arr = agg[task][a] || [];
      if (arr.length) { overall[a] = (overall[a] || []).concat(arr); return `${a}=${avg(arr).toFixed(2)} (n${arr.length})`; }
      return `${a}=--`;
    });
    console.log(`  ${task.padEnd(18)} ${parts.join('   ')}`);
  }
  const oline = arms.map((a) => `${a}=${overall[a] ? avg(overall[a]).toFixed(2) : '--'}`).join('   ');
  console.log(`  ${'OVERALL'.padEnd(18)} ${oline}   — judge cost $${cost.toFixed(3)}`);

  fs.writeFileSync(path.join(ROOT, 'results', tag, `rubric-${arms.join('-')}.json`),
    JSON.stringify({ scored, agg, overall: Object.fromEntries(arms.map((a) => [a, overall[a] ? avg(overall[a]) : null])), cost }, null, 2));
}

main();
