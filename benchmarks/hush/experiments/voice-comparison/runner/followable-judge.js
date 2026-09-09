#!/usr/bin/env node
'use strict';
// Blind pairwise FOLLOWABILITY judge (sibling of friendly-judge.js). For each
// task+rep it shows a model the two arms' deliverables position-swapped, judged
// twice, and asks which reply a developer NEW to the codebase could act on
// without a follow-up. A verdict counts only when both orderings agree; a split
// is a tie. Padding is explicitly not rewarded.
//
//   node followable-judge.js --tag X --base dStock --cand dExpl [--tasks a,b] [--model sonnet]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const tag = flag('tag', 'dev');
const base = flag('base', 'dStock');
const cand = flag('cand', 'dExpl');
const model = flag('model', 'sonnet');
const only = flag('tasks', null);
const taskSet = only ? new Set(only.split(',')) : null;

const runsDir = path.resolve(__dirname, '..', 'results', tag, 'runs');
const runs = fs.readdirSync(runsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf8')))
  .filter((r) => !r.error && (!taskSet || taskSet.has(r.task)));

const byKey = new Map(runs.map((r) => [`${r.task}__${r.arm}__r${r.rep}`, r]));
const pairs = [];
for (const r of runs.filter((x) => x.arm === base)) {
  const c = byKey.get(`${r.task}__${cand}__r${r.rep}`);
  if (c) pairs.push({ task: r.task, rep: r.rep, base: r, cand: c });
}
if (!pairs.length) { console.error('no pairs found'); process.exit(1); }

const workDir = path.join(os.tmpdir(), 'hush-followjudge');
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
      try {
        const j = JSON.parse(out);
        resolve({ text: j.result || '', cost: j.total_cost_usd || 0 });
      } catch { resolve({ text: out, cost: 0 }); }
    });
  });
}

function deliverable(r) {
  return (r.finalTexts || [r.finalText]).map((t, i) => `-- reply to request ${i + 1} --\n${t}`).join('\n\n');
}

function judgePrompt(a, b) {
  return [
    'Two assistants answered the same coding request and reported back to the user.',
    'Judge ONLY how self-contained and followable the writing is, not whether it is correct. Assume both are technically correct.',
    '',
    'Imagine the reader is a developer who knows general programming but is NEW to this particular',
    'codebase and did not see the assistant\'s earlier turns. Which reply lets that reader understand the',
    'reasoning and take the next step WITHOUT having to ask a follow-up like "what do you mean" or',
    '"explain in plain english"?',
    '',
    'Reward a reply that names a thing before shortening it, defines its own shorthand, says what a file',
    'or symbol DOES rather than only pointing at a line number, and keeps the one step of "why" behind a',
    'conclusion. Penalize a reply that assumes the reader already shares the author\'s context or uses',
    'undefined jargon. Do NOT reward padding: a longer or wordier reply that still leaves the reader',
    'guessing is WORSE, not better. Prefer the reply that lands the first time with the fewest words.',
    '',
    `=== REPLY A ===\n${a}`,
    '',
    `=== REPLY B ===\n${b}`,
    '',
    'Answer with exactly one JSON object and nothing else: {"followable": "A" | "B" | "tie", "reason": "<one short sentence>"}',
  ].join('\n');
}

function verdict(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]).followable; } catch { return null; }
}

async function main() {
  let candWins = 0, baseWins = 0, ties = 0, cost = 0;
  const perTask = {};
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < pairs.length) {
      const p = pairs[idx++];
      const A = deliverable(p.base), B = deliverable(p.cand);
      const [r1, r2] = await Promise.all([
        ask(judgePrompt(A, B)),   // A=base, B=cand
        ask(judgePrompt(B, A)),   // A=cand, B=base
      ]);
      cost += r1.cost + r2.cost;
      const v1 = verdict(r1.text); // cand more followable if 'B'
      const v2 = verdict(r2.text); // cand more followable if 'A'
      let out;
      if (v1 === 'B' && v2 === 'A') out = 'cand';
      else if (v1 === 'A' && v2 === 'B') out = 'base';
      else out = 'tie';
      results.push({ ...p, base: undefined, cand: undefined, task: p.task, rep: p.rep, v1, v2, out });
      perTask[p.task] = perTask[p.task] || { cand: 0, base: 0, tie: 0 };
      perTask[p.task][out]++;
      if (out === 'cand') candWins++; else if (out === 'base') baseWins++; else ties++;
      console.log(`${p.task} r${p.rep}: ${out}  (${v1}/${v2})`);
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));

  console.log(`\n${cand} vs ${base} — more followable (both orderings must agree; split = tie)`);
  for (const [t, s] of Object.entries(perTask)) console.log(`  ${t.padEnd(20)} cand=${s.cand} base=${s.base} tie=${s.tie}`);
  console.log(`total: ${cand} more followable in ${candWins}, ${base} in ${baseWins}, tie ${ties}  — judge cost $${cost.toFixed(3)}`);
  fs.writeFileSync(path.resolve(__dirname, '..', 'results', tag, `followable-${cand}-vs-${base}.json`),
    JSON.stringify({ candWins, baseWins, ties, cost, results }, null, 2));
}

main();
