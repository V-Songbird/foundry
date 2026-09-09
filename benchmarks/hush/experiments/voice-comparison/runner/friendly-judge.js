#!/usr/bin/env node
'use strict';
// Blind pairwise friendliness judge, same design as judge.js: for each
// task+rep it shows a model the two arms' deliverables position-swapped, judged
// twice, and asks which reads as a warmer, more human colleague WITHOUT being
// padded. A verdict counts only when both orderings agree; a split is a tie.
//
//   node friendly-judge.js --tag X --base s0 --cand s1 [--model sonnet]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const tag = flag('tag', 'dev');
const base = flag('base', 's0');
const cand = flag('cand', 's1');
const model = flag('model', 'sonnet');
// The default question asks which reply reads warmer. `--criterion plain` asks
// the other half of this style's goal instead: which one a tired reader could
// follow without already knowing the codebase's vocabulary.
const criterion = flag('criterion', 'friendly');

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

const workDir = path.join(os.tmpdir(), 'hush-fjudge');
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

const CRITERIA = {
  friendly: [
    'Question: which reply sounds more like a warm, friendly colleague — natural, human, easy to read —',
    'RATHER than terse, clipped, or robotic? Important: warmth must not come from padding. A reply that is',
    'longer, gushing, or full of filler is NOT friendlier. Prefer the one a busy developer would enjoy',
    'reading more while it still respects their time.',
  ],
  plain: [
    'The reader is a developer at the end of a long day, low on focus, who has not seen this codebase before.',
    '',
    'Question: which reply could that reader follow on one pass, without looking up a word and without',
    'already knowing the project\'s vocabulary? Penalise a reply for every term it uses as though the reader',
    'already shares it, and for any wording implying they should have known something. Important: clarity',
    'must not come from length. A longer reply that pads or over-explains is NOT clearer. Prefer the one',
    'that lands the same facts in fewer, smaller words.',
  ],
};

function judgePrompt(a, b) {
  return [
    'Two assistants answered the same coding request and reported back to the user.',
    'Judge ONLY the tone and shape of the writing, not the technical content. Assume both are correct.',
    '',
    ...CRITERIA[criterion],
    '',
    `=== REPLY A ===\n${a}`,
    '',
    `=== REPLY B ===\n${b}`,
    '',
    'Answer with exactly one JSON object and nothing else: {"winner": "A" | "B" | "tie", "reason": "<one short sentence>"}',
  ].join('\n');
}

function verdict(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { const j = JSON.parse(m[0]); return j.winner ?? j.friendlier; } catch { return null; }
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
      const v1 = verdict(r1.text); // cand friendlier if 'B'
      const v2 = verdict(r2.text); // cand friendlier if 'A'
      let out;
      if (v1 === 'B' && v2 === 'A') out = 'cand';
      else if (v1 === 'A' && v2 === 'B') out = 'base';
      else out = 'tie';
      results.push({ ...p, v1, v2, out });
      perTask[p.task] = perTask[p.task] || { cand: 0, base: 0, tie: 0 };
      perTask[p.task][out]++;
      if (out === 'cand') candWins++; else if (out === 'base') baseWins++; else ties++;
      console.log(`${p.task} r${p.rep}: ${out}  (${v1}/${v2})`);
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));

  console.log(`\n${cand} vs ${base} — ${criterion} (both orderings must agree; split = tie)`);
  for (const [t, s] of Object.entries(perTask)) console.log(`  ${t.padEnd(20)} cand=${s.cand} base=${s.base} tie=${s.tie}`);
  console.log(`total: ${cand} wins ${candWins}, ${base} wins ${baseWins}, tie ${ties}  — judge cost $${cost.toFixed(3)}`);
  fs.writeFileSync(path.resolve(__dirname, '..', 'results', tag, `${criterion}-${cand}-vs-${base}.json`),
    JSON.stringify({ candWins, baseWins, ties, cost, results }, null, 2));
}

main();
