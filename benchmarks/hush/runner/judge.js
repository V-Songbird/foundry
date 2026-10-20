#!/usr/bin/env node
// Score a batch's final messages with TypeSafe Jev.
//
//   node runner/judge.js --tag styleforge-1
//   node runner/judge.js --tag styleforge-1 --rubric rubric.json --concurrency 4
//
// run.js measures what a session COST. This measures whether the message it
// left behind is any good to read at 4am. One Jev request per run, every
// rubric question asked together over the same state — they are independent
// judgments of one message, so they go in one call and run in parallel.
//
// Reads results/<tag>/runs/*.json for the final message and the provenance,
// results/<tag>/transcripts/*.jsonl for what the session ACTUALLY did (the
// honesty gates compare the message against that, not against its own claims),
// and the task's `groundTruth` for what was actually true.
//
// Writes results/<tag>/judge.json plus a per-arm table on stdout.

'use strict';
const fs = require('node:fs');
const path = require('node:path');

const { wholeNumber, flagOr } = require('../../flags.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(require('../../paths.js').dataDir('hush'), 'results');
const API = process.env.TYPESAFE_API_URL || 'https://api.typesafe.ai/v1/systemone';
const KEY = process.env.TYPESAFE_API_KEY;

const argv = process.argv.slice(2);
const flag = (name, dflt = null) => flagOr(argv, name, dflt);
const has = (name) => argv.includes(`--${name}`);

const tag = flag('tag');
const rubricPath = path.resolve(ROOT, flag('rubric', 'rubric.json'));
// Read raw, not through flag(), which turns a missing or empty value into the default.
const concurrency = wholeNumber('concurrency', argv.includes('--concurrency') ? argv[argv.indexOf('--concurrency') + 1] : 4);
const force = has('force');

if (!tag) { console.error('usage: node runner/judge.js --tag NAME'); process.exit(2); }
if (!KEY) { console.error('TYPESAFE_API_KEY is not set in this process env.'); process.exit(2); }

const outDir = path.join(RESULTS, tag);
const runsDir = path.join(outDir, 'runs');
if (!fs.existsSync(runsDir)) { console.error(`no runs at ${runsDir}`); process.exit(2); }

const rubric = JSON.parse(fs.readFileSync(rubricPath, 'utf8'));
const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'));

// --- what the session actually did ------------------------------------------
// The honesty gates are only worth asking if Jev can see the real work. A
// message that says "I ran the tests" in a session that never spawned Bash is
// the exact failure we want caught, and it is invisible from the message alone.
function workActuallyDone(key) {
  const f = path.join(outDir, 'transcripts', `${key}.jsonl`);
  if (!fs.existsSync(f)) return null;
  const tools = [];
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s.startsWith('{')) continue;
    let ev; try { ev = JSON.parse(s); } catch { continue; }
    const blocks = ev?.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b.type !== 'tool_use') continue;
      const i = b.input || {};
      const target = i.file_path || i.path || i.command || i.pattern || i.prompt || '';
      tools.push({ tool: b.name, target: String(target).slice(0, 200) });
    }
  }
  if (!tools.length) return null;
  const files = [...new Set(tools.filter((t) => /^(Read|Edit|Write|NotebookEdit)$/.test(t.tool)).map((t) => t.target))];
  const commands = [...new Set(tools.filter((t) => t.tool === 'Bash' || t.tool === 'PowerShell').map((t) => t.target))];
  const searches = [...new Set(tools.filter((t) => t.tool === 'Grep' || t.tool === 'Glob').map((t) => t.target))];
  return {
    tool_calls_in_order: tools.map((t) => t.tool),
    files_opened: files,
    shell_commands_run: commands,
    searches_run: searches,
    note: 'This is the complete record of what the session did. Anything the message claims that is not here did not happen.',
  };
}

// --- one Jev request per run -------------------------------------------------
function buildQuestions() {
  const q = {};
  for (const [id, def] of Object.entries(rubric.questions)) {
    q[id] = { type: def.type, instructions: def.instructions, criteria: def.criteria };
  }
  return q;
}

async function askJev(state, attempt = 0) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: rubric.model, questions: buildQuestions() }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 4) throw new Error(`Jev ${res.status} after ${attempt} retries`);
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return askJev(state, attempt + 1);
  }
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// Normalize every answer onto 0..1 so groups can be averaged. A noul is
// already a probability. A score is a position on its own levels, so it is
// divided by the top level's index — never by the level count, which would
// make a perfect score unreachable.
function normalize(id, ans) {
  const def = rubric.questions[id];
  if (def.type === 'noul') return ans.noul;
  const top = def.criteria.length - 1;
  return top > 0 ? ans.score / top : 0;
}

// Some questions are worded so that YES is the bad outcome. Flipping them here
// rather than rewording keeps each question a plain, natural thing to ask.
const INVERTED = new Set(['wall_of_text', 'jargon_unexplained']);

function compose(answers) {
  const per = {};
  for (const [id, ans] of Object.entries(answers)) {
    if (!rubric.questions[id]) continue;
    const group = rubric.questions[id].group;
    // A Choice has no position on a line, so it gets no `value` and never
    // enters a group mean. Its whole point is the distribution: which repair
    // this message wants, and how sure Jev is that it wants that one.
    if (ans.type === 'choice') {
      per[id] = { choice: ans.choice, probabilities: ans.probabilities, confidence: ans.confidence ?? null, group };
      continue;
    }
    const v = normalize(id, ans);
    per[id] = {
      value: Number((INVERTED.has(id) ? 1 - v : v).toFixed(4)),
      raw: ans.type === 'noul' ? ans.noul : ans.score,
      confidence: ans.confidence ?? null,
      group,
    };
  }

  const groups = {};
  for (const [id, r] of Object.entries(per)) {
    if (r.group === 'gate' || r.value == null) continue;
    (groups[r.group] ||= []).push(r.value);
  }
  const groupMeans = {};
  for (const [g, vals] of Object.entries(groups)) {
    groupMeans[g] = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4));
  }

  // Gates are conditions, not weights. A message that invents work it never
  // did does not get to average that away against a nice table.
  const gateFailures = [];
  for (const [id, floor] of Object.entries(rubric.gates)) {
    if (per[id] && per[id].value < floor) gateFailures.push({ id, value: per[id].value, floor });
  }

  let composite = 0;
  for (const [g, w] of Object.entries(rubric.weights)) composite += (groupMeans[g] ?? 0) * w;

  return {
    per, groups: groupMeans,
    composite: Number(composite.toFixed(4)),
    gateFailures,
    passed: gateFailures.length === 0,
  };
}

// --- drive -------------------------------------------------------------------
async function main() {
  const judgePath = path.join(outDir, 'judge.json');
  const prior = !force && fs.existsSync(judgePath)
    ? JSON.parse(fs.readFileSync(judgePath, 'utf8'))
    : { tag, rubricVersion: rubric.version, judgedAt: null, runs: {} };

  const keys = fs.readdirSync(runsDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  const todo = keys.filter((k) => force || !prior.runs[k]);
  console.log(`${keys.length} runs, ${todo.length} to judge (${keys.length - todo.length} cached)`);

  let usage = { input_tokens: 0, output_tokens: 0 };
  let done = 0;
  const queue = [...todo];

  async function worker() {
    for (;;) {
      const key = queue.shift();
      if (!key) return;
      const run = JSON.parse(fs.readFileSync(path.join(runsDir, `${key}.json`), 'utf8'));
      if (run.error || !run.finalText) { console.log(`SKIP ${key} (no final message)`); continue; }
      const task = TASKS.find((t) => t.id === run.task);
      const prompts = task?.prompts || (task?.prompt ? [task.prompt] : []);

      const state = {
        situation: rubric.situation,
        reader: rubric.reader,
        developer_request: prompts.length === 1 ? prompts[0] : prompts,
        work_actually_done: workActuallyDone(key),
        ground_truth: task?.groundTruth ?? null,
        final_message: run.finalText,
      };

      try {
        const r = await askJev(state);
        usage.input_tokens += r.usage?.input_tokens || 0;
        usage.output_tokens += r.usage?.output_tokens || 0;
        prior.runs[key] = {
          task: run.task, arm: run.arm, rep: run.rep, model: run.model,
          costUsd: run.costUsd, finalWords: run.finalWords,
          checkPass: run.check?.pass ?? null,
          judgeModel: r.model,
          ...compose(r.answers),
        };
        done++;
        const s = prior.runs[key];
        console.log(`${s.passed ? 'OK  ' : 'GATE'} ${key.padEnd(34)} composite=${s.composite.toFixed(3)}`);
      } catch (err) {
        console.log(`FAIL ${key}  ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  prior.judgedAt = new Date().toISOString();
  prior.rubricVersion = rubric.version;
  prior.judgeUsage = usage;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(judgePath, JSON.stringify(prior, null, 2));

  report(prior);
  console.log(`\njudged ${done} runs, Jev usage ${usage.input_tokens} in / ${usage.output_tokens} out`);
  console.log(`wrote ${path.relative(process.cwd(), judgePath)}`);
}

function report(judged) {
  const byArm = {};
  for (const r of Object.values(judged.runs)) (byArm[r.arm] ||= []).push(r);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

  const isChoice = (id) => rubric.questions[id].type === 'choice';
  const dims = Object.keys(rubric.questions).filter((id) => rubric.questions[id].group !== 'gate' && !isChoice(id));
  const arms = Object.keys(byArm).sort();

  console.log('\n=== composite by arm ===');
  for (const arm of arms) {
    const rs = byArm[arm];
    const gates = rs.filter((r) => !r.passed).length;
    console.log(
      `${arm.padEnd(14)} n=${String(rs.length).padStart(2)}  composite=${mean(rs.map((r) => r.composite)).toFixed(3)}` +
      `  reader=${mean(rs.map((r) => r.groups.reader ?? 0)).toFixed(3)}` +
      `  comp=${mean(rs.map((r) => r.groups.comprehension ?? 0)).toFixed(3)}` +
      `  mech=${mean(rs.map((r) => r.groups.mechanics ?? 0)).toFixed(3)}` +
      `  voice=${mean(rs.map((r) => r.groups.voice ?? 0)).toFixed(3)}` +
      `  gatefail=${gates}  words=${mean(rs.map((r) => r.finalWords || 0)).toFixed(0)}` +
      `  $${mean(rs.map((r) => r.costUsd || 0)).toFixed(3)}`
    );
  }

  console.log('\n=== per dimension (mean, 0..1) ===');
  const w = Math.max(...dims.map((d) => d.length));
  console.log('dimension'.padEnd(w) + '  ' + arms.map((a) => a.padStart(9)).join(''));
  for (const d of dims) {
    const row = arms.map((a) => {
      const vals = byArm[a].map((r) => r.per[d]?.value).filter((v) => v != null);
      return (vals.length ? mean(vals).toFixed(3) : '  -  ').padStart(9);
    });
    console.log(d.padEnd(w) + '  ' + row.join(''));
  }

  console.log('\n=== gates (mean, lower is worse) ===');
  for (const g of Object.keys(rubric.gates)) {
    const row = arms.map((a) => {
      const vals = byArm[a].map((r) => r.per[g]?.value).filter((v) => v != null);
      return (vals.length ? mean(vals).toFixed(3) : '  -  ').padStart(9);
    });
    console.log(g.padEnd(w) + '  ' + row.join(''));
  }

  // The work queue. For each Choice, the mean probability mass each option
  // carried across an arm's runs — not just which option won each time, since
  // a repair that comes second on every run matters more than one that wins
  // once. Options are printed in descending mass and thin ones are dropped.
  for (const id of Object.keys(rubric.questions).filter(isChoice)) {
    console.log(`\n=== ${id} — mean probability mass per option ===`);
    const opts = Object.keys(rubric.questions[id].criteria);
    const head = 'option'.padEnd(24) + arms.map((a) => a.padStart(10)).join('');
    console.log(head);
    const rows = opts.map((o) => ({
      o,
      vals: arms.map((a) => mean(byArm[a].map((r) => r.per[id]?.probabilities?.[o] ?? 0))),
    })).sort((x, y) => Math.max(...y.vals) - Math.max(...x.vals));
    for (const { o, vals } of rows) {
      if (Math.max(...vals) < 0.05) continue;
      const best = Math.max(...vals);
      console.log(o.padEnd(24) + vals.map((v) => (v.toFixed(3) + (v === best ? '*' : ' ')).padStart(10)).join(''));
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
