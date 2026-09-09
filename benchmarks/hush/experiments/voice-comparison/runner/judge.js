#!/usr/bin/env node
'use strict';
// Blind pairwise plainness judge: for each task+rep, shows a haiku session the
// two arms' deliverables (position-swapped, judged twice) and asks which is
// easier for a non-expert to follow. Verdicts count only when both orderings
// agree; a split is a tie.
//
//   node judge.js --tag X --base hush --cand plainA [--model haiku]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const tag = flag('tag', 'dev');
const base = flag('base', 'hush');
const cand = flag('cand', 'plainA');
const model = flag('model', 'haiku');

const runsDir = path.resolve(__dirname, '..', 'results', tag, 'runs');
const runs = fs.readdirSync(runsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(runsDir, f), 'utf8')))
  .filter((r) => !r.error);

const byKey = new Map(runs.map((r) => [`${r.task}__${r.arm}__r${r.rep}`, r]));
const pairs = [];
for (const r of runs.filter((x) => x.arm === base)) {
  const c = byKey.get(`${r.task}__${cand}__r${r.rep}`);
  if (c) pairs.push({ task: r.task, rep: r.rep, base: r, cand: c });
}
if (!pairs.length) { console.error('no pairs found'); process.exit(1); }

const workDir = path.join(os.tmpdir(), 'hush-judge');
fs.mkdirSync(workDir, { recursive: true });

function cleanEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(CLAUDECODE|CLAUDE_CODE_|HUSH_|CAVEMAN_)/.test(k)) continue;
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

function judgePrompt(task, a, b) {
  return [
    'Two different assistants completed the same coding task and reported back to the user.',
    'Judge ONLY the writing of the reports, not the work itself. Assume both are factually correct.',
    '',
    'Question: which report would be easier to follow for a reader who is not a software expert —',
    'plainer words, less jargon, no more structure than the content needs?',
    '',
    `=== REPORT A ===\n${a}`,
    '',
    `=== REPORT B ===\n${b}`,
    '',
    'Answer with exactly one JSON object and nothing else: {"plainer": "A" | "B" | "tie", "reason": "<one short sentence>"}',
  ].join('\n');
}

function verdict(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]).plainer; } catch { return null; }
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
        ask(judgePrompt(p.task, A, B)),   // A=base, B=cand
        ask(judgePrompt(p.task, B, A)),   // A=cand, B=base
      ]);
      cost += r1.cost + r2.cost;
      const v1 = verdict(r1.text); // cand wins if 'B'
      const v2 = verdict(r2.text); // cand wins if 'A'
      let out;
      if (v1 === 'B' && v2 === 'A') out = 'cand';
      else if (v1 === 'A' && v2 === 'B') out = 'base';
      else out = 'tie';
      results.push({ ...p, v1, v2, out });
      perTask[p.task] = perTask[p.task] || { cand: 0, base: 0, tie: 0 };
      perTask[p.task][out === 'cand' ? 'cand' : out === 'base' ? 'base' : 'tie']++;
      if (out === 'cand') candWins++; else if (out === 'base') baseWins++; else ties++;
      console.log(`${p.task} r${p.rep}: ${out}  (${v1}/${v2})`);
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));

  console.log(`\n${cand} vs ${base} (both orderings must agree; split = tie)`);
  for (const [t, s] of Object.entries(perTask)) console.log(`  ${t.padEnd(20)} cand=${s.cand} base=${s.base} tie=${s.tie}`);
  console.log(`total: ${cand} plainer in ${candWins}, ${base} in ${baseWins}, tie ${ties}  — judge cost $${cost.toFixed(3)}`);
  fs.writeFileSync(path.resolve(__dirname, '..', 'results', tag, `judge-${cand}-vs-${base}.json`),
    JSON.stringify({ candWins, baseWins, ties, cost, results }, null, 2));
}

main();
