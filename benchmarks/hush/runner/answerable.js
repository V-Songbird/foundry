#!/usr/bin/env node
'use strict';
// Answerable: could a reader act on this message without asking a follow-up?
//
// CHANGED 2026-08-29, and numbers from before that date are not comparable:
// the judge used to mark "there is nothing to do next" as no answer at all.
// Only a reply willing to say a job is finished ever trips that, so it scored
// honesty as a miss and rewarded inventing a next step. The prompt now names
// it as an answer. Both arms are judged by the same prompt, as always.
//
// CHANGED AGAIN the same day, same rule about comparability: the second
// question reads "Which file, command or thing", and the judge was reading it
// as "which file". On a read-only diagnosis the thing to look at is a host or a
// service, not a path, so a correct reply scored as a miss. The prompt now says
// what its own word "thing" covers. It grants no new leniency: a reply that
// points at nothing is still a miss.
//
// Every other meter here scores the text. This one scores what a reader can get
// OUT of the text. A fresh session — no plugins, no output style, no sight of
// the work — is handed the original request and the one reply, and asked three
// fixed questions: what happened, what to open, what to do next. It answers in
// its own words or says the reply does not contain it.
//
// Two numbers come back per run:
//
//   answered   how many of the three questions the reply could answer at all
//   recovered  how many of the task's own rubric facts survive INTO those
//              answers, which is a stricter thing than the fact being somewhere
//              in the message
//
// WHY THAT SECOND NUMBER IS NOT CIRCULAR, and where it is still soft. The
// oracle is the task's rubric in tasks.json — the same independent ground truth
// runCheck already uses — never this file's own judgment and never the style's
// own rules. But runCheck greps the whole message, and this greps only the three
// answers, so a fact the reply merely name-drops can pass one and fail the
// other. That gap is the measurement. The soft part: a judge that quotes the
// reply wholesale will score like a grep, so `recovered` is a floor on
// reachability, not a comprehension score, and `answered` is the judge's
// opinion, one sample, on one model.
//
// COSTS MONEY. One judge call per record, on the Message Batches API with
// structured output, billed to ANTHROPIC_API_KEY instead of the Claude Code
// plan. Prints the plan and stops unless --go is passed; --max-usd caps the
// spend. --cli runs the old claude -p judge instead, one session per record.
// The two are different instruments, so every row, report and published file
// names its judge, and a figure from one is never compared with the other.
//
//   node runner/answerable.js --records ../../.private/benchmarks/hush/records/rm280-7e554675            # plan only
//   node --env-file=<key file> runner/answerable.js --records <dir> --max-usd 1 --go
//   node runner/answerable.js --tag shp1 --arms shape,shapeplus --cli --go    (the old claude -p judge)

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
// Keeps every cell's temp cwd out of the real ~/.claude registry and
// transcript store; runJudge calls it before each session starts.
const benchConfigDir = require('../../bench-config-dir.js');
const { runBatch, modelId } = require('../../batch-judge.js');
const { usdCap, flagOr, throwUsage } = require('../../flags.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(require('../../paths.js').dataDir('hush'), 'results');
const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'));

// The three questions, fixed and identical for every task and every arm. They
// are the three things the style itself promises to deliver — what happened,
// whether it worked, what comes next — asked from the reader's side.
const QUESTIONS = [
  'What happened, or what is wrong?',
  'Which file, command or thing should I open or run?',
  'What should I do next?',
];

const ABSENT = 'NOT IN THE REPLY';

function judgePrompt(taskPrompt, finalText) {
  return [
    'Someone asked an assistant for help. Below is the request they made, and the',
    'entire reply they got back. You cannot see the work that was done, and there',
    'is nothing else to look at.',
    '',
    'Answer the three questions using ONLY the reply. Do not guess, do not use',
    'anything you know about the tools or files involved, and do not explain your',
    `reasoning. If the reply does not contain an answer, write exactly ${ABSENT}.`,
    '',
    '"There is nothing to do" IS an answer to the third question. A reply that',
    'says the work is finished and needs no follow-up has answered it — write',
    `that, not ${ABSENT}. Only a reply that leaves the question open is a miss.`,
    '',
    'The second question says "file, command or thing", and it means all three.',
    'A host, service, endpoint, URL, log or command to run answers it just as a',
    `file path does. Write ${ABSENT} only when the reply points at nothing.`,
    '',
    'Write exactly three lines and nothing else:',
    ...QUESTIONS.map((q, i) => `A${i + 1}: <answer to: ${q}>`),
    '',
    '--- THE REQUEST ---',
    taskPrompt,
    '',
    '--- THE ENTIRE REPLY ---',
    finalText,
  ].join('\n');
}

// The Batches judge must answer in this shape; the API enforces it, so the
// three answers come back as JSON fields named like the prompt's lines.
const ANSWERS_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(QUESTIONS.map((_, i) => [`A${i + 1}`, { type: 'string' }])),
  required: QUESTIONS.map((_, i) => `A${i + 1}`),
  additionalProperties: false,
};

/**
 * Pull A1/A2/A3 out of the judge's reply: the schema's JSON object, or the
 * prompt's three lines from claude -p. A missing answer reads as absent.
 */
function parseAnswers(text) {
  let json = null;
  try { json = JSON.parse(text); } catch { /* the line format */ }
  const out = [];
  for (let i = 1; i <= QUESTIONS.length; i++) {
    if (json && typeof json === 'object') {
      const a = json[`A${i}`];
      out.push(typeof a === 'string' && a.trim() ? a.trim() : ABSENT);
      continue;
    }
    const m = String(text || '').match(new RegExp(`^\\s*A${i}\\s*:\\s*(.+?)\\s*$`, 'm'));
    out.push(m ? m[1] : ABSENT);
  }
  return out;
}

const isAbsent = (a) => !a || a.trim().toUpperCase().startsWith(ABSENT);

/**
 * Score one judged reply against the task's own rubric.
 * `patterns` comes from tasks.json — this file never invents an oracle.
 */
function scoreAnswers(answers, patterns = []) {
  const present = answers.filter((a) => !isAbsent(a));
  const corpus = present.join('\n');
  const hits = patterns.filter((p) => new RegExp(p, 'i').test(corpus));
  return {
    answered: present.length,
    answerable: present.length === QUESTIONS.length,
    // Which of the three was answered — the misses are two different things
    // (nothing to open vs nothing to do) and tuning needs them apart.
    perQuestion: answers.map((a) => !isAbsent(a)),
    recovered: hits.length,
    recoveredPct: patterns.length ? (100 * hits.length) / patterns.length : null,
    missed: patterns.filter((p) => !hits.includes(p)),
  };
}

// --- one judge call ----------------------------------------------------------

// The same two success-shaped failures the run harness refuses: a rate-limited
// call hands back the limit message AS the answer at cost 0, and any call that
// billed nothing did not happen the way we think it did.
const RATE_LIMITED = /you\s*['’]?ve hit your (session|usage|weekly) limit/i;

function judgeArgs(model) {
  return [
    '-p',
    '--output-format', 'json',
    '--model', model,
    '--max-turns', '1',
    // Same isolation the arms get: no user settings, no MCP, and here no tools
    // at all — the judge reads the reply it was handed and nothing else.
    '--setting-sources', 'project',
    '--strict-mcp-config',
    '--disallowedTools',
    'Read,Edit,Write,Glob,Grep,Bash,PowerShell,WebFetch,WebSearch,Agent,Task,TodoWrite',
  ];
}

function runJudge(prompt, model, cwd) {
  benchConfigDir();
  return new Promise((resolve) => {
    const child = spawn('claude', judgeArgs(model), { cwd, env: process.env, shell: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdin.write(prompt);
    child.stdin.end();
    const killer = setTimeout(() => child.kill('SIGKILL'), 120000);
    child.on('close', () => {
      clearTimeout(killer);
      let text = '', costUsd = null;
      try {
        const ev = JSON.parse(stdout);
        text = typeof ev.result === 'string' ? ev.result : '';
        costUsd = ev.total_cost_usd ?? null;
      } catch { /* fall through to the guard below */ }
      if (!text) return resolve({ error: `judge produced no reply: ${stderr.slice(0, 200)}` });
      if (RATE_LIMITED.test(text)) return resolve({ error: `rate limited: ${text.trim().slice(0, 120)}` });
      if (!(costUsd > 0)) return resolve({ error: `zero-cost judge call (cost=${costUsd})` });
      resolve({ text, costUsd });
    });
  });
}

// --- many records ------------------------------------------------------------

function readRecordsDir(dir) {
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'batch.json')
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .filter((r) => r && !r.error && r.finalText);
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** arm -> answerability totals. Judged rows only; a failed judge call is named, not averaged. */
function answerableReport(rows) {
  const arms = {};
  for (const arm of [...new Set(rows.map((r) => r.arm))]) {
    const mine = rows.filter((r) => r.arm === arm);
    const ok = mine.filter((r) => !r.error);
    arms[arm] = {
      runs: mine.length,
      judged: ok.length,
      failed: mine.length - ok.length,
      answered: mean(ok.map((r) => r.answered)),
      qPct: QUESTIONS.map((_, i) =>
        ok.length ? (100 * ok.filter((r) => r.perQuestion?.[i]).length) / ok.length : null),
      answerablePct: ok.length ? (100 * ok.filter((r) => r.answerable).length) / ok.length : null,
      recoveredPct: mean(ok.map((r) => r.recoveredPct).filter((n) => n != null)),
      costUsd: ok.reduce((n, r) => n + (r.costUsd || 0), 0),
    };
  }
  return { rows: rows.length, arms };
}

// --- CLI ---------------------------------------------------------------------

const n1 = (x) => (x == null ? '-' : x.toFixed(1));

async function main() {
  const argv = process.argv.slice(2);
  const at = (flag) => flagOr(argv, flag, null, throwUsage);
  const tag = at('--tag');
  const recordsArg = at('--records');
  const model = at('--model') || 'sonnet';
  const only = (at('--arms') || '').split(',').filter(Boolean);
  const save = at('--save');
  const go = argv.includes('--go');
  // Every judge prompt goes in one Message Batches job unless --cli asks for
  // the old claude -p judge; --max-usd caps a batch.
  const batch = !argv.includes('--cli');
  const maxUsd = usdCap(argv);
  const dir = recordsArg
    ? path.resolve(ROOT, recordsArg)
    : tag ? path.join(RESULTS, tag, 'runs') : null;
  if (!dir) {
    console.error('Usage: answerable.js --records <dir> | --tag <tag> [--arms a,b] [--model sonnet] [--max-usd <usd> | --cli] --go');
    process.exit(1);
  }

  const records = readRecordsDir(dir).filter((r) => !only.length || only.includes(r.arm));
  const jobs = records.map((r) => {
    const task = TASKS.find((t) => t.id === r.task);
    const taskPrompt = task?.prompt || (task?.prompts || []).join('\n') || '(prompt unavailable)';
    return {
      r,
      prompt: judgePrompt(taskPrompt, r.finalText),
      schema: ANSWERS_SCHEMA,
      patterns: task?.check?.type === 'keywords' ? task.check.patterns : [],
    };
  });
  // The same label retention.js caches under: `<model id>@batch` or the alias.
  const judge = batch ? `${modelId(model)}@batch` : model;
  const instrument = batch ? 'Batches API judge; compare only with other Batches figures'
    : 'claude -p judge; compare only with other claude -p figures';
  console.log(`answerable — ${path.relative(ROOT, dir)}`);
  console.log(`${records.length} judge calls on ${judge}, one per record, three fixed questions each.`);
  console.log(`instrument: ${instrument}`);
  if (batch) {
    const { plan } = await runBatch(jobs, { model });
    console.log(`worst case $${plan.worstUsd.toFixed(2)} for ~${plan.inputTokens} input tokens; cap --max-usd ${maxUsd || 'unset'}`);
  }
  if (!go) {
    console.log('\nplan only — nothing was sent and nothing was billed. Re-run with --go to spend.');
    return;
  }

  let replies = null;
  if (batch) {
    const out = await runBatch(jobs, { model, maxUsd, go: true });
    replies = out.results;
    console.log(`batch ${out.batchId} ended: $${out.spentUsd.toFixed(3)} spent`);
  }
  const cwd = batch ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'hush-answerable-'));
  const rows = [];
  for (const [i, { r, prompt, patterns }] of jobs.entries()) {
    const res = replies ? replies[i] : await runJudge(prompt, model, cwd);
    if (res.error) {
      rows.push({ arm: r.arm, task: r.task, judge, error: res.error });
      console.log(`ERR  ${r.task}__${r.arm}  ${res.error}`);
      continue;
    }
    const answers = parseAnswers(res.text);
    const scored = scoreAnswers(answers, patterns);
    // The judge's literal answers ride along so a --save file shows WHAT a
    // reader got out, not just how much.
    rows.push({ arm: r.arm, task: r.task, judge, costUsd: res.costUsd, answers, ...scored });
    console.log(`${scored.answerable ? 'OK  ' : 'GAP '} ${r.task}__${r.arm}  `
      + `q=${scored.perQuestion.map((b) => (b ? 'Y' : 'n')).join('')}  `
      + `answered=${scored.answered}/${QUESTIONS.length}  recovered=${n1(scored.recoveredPct)}%  `
      + `(${i + 1}/${records.length})`);
  }

  const report = answerableReport(rows);
  const arms = Object.keys(report.arms).sort(
    (a, b) => (a === 'baseline' ? -1 : b === 'baseline' ? 1 : a.localeCompare(b)));
  console.log(`\njudge: ${judge}; instrument: ${instrument}`);
  console.log('arm\truns\tjudged\tanswered/3\tq1%\tq2%\tq3%\tfully answerable%\trubric recovered%\t$');
  for (const a of arms) {
    const x = report.arms[a];
    console.log([a, x.runs, x.judged, n1(x.answered), ...x.qPct.map(n1), n1(x.answerablePct),
      n1(x.recoveredPct), x.costUsd.toFixed(3)].join('\t'));
  }
  if (save) {
    fs.writeFileSync(save, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    console.log(`\nsaved ${rows.length} judged rows to ${save}`);
  }

  // The README quotes these percentages, so they need a home on disk beside the
  // batch they came from. publish.js owns claims.md and never sees a judge run,
  // so this writes its own file next to it rather than editing that one.
  // A batch with any failed result publishes nothing: rerun it instead.
  const failed = rows.filter((r) => r.error).length;
  if (batch && failed) {
    console.log(`\n${failed} batch result(s) failed; published/answerable.md was not written.`);
    process.exitCode = 1;
    return;
  }
  if (dir) {
    const out = path.join(dir, 'published', 'answerable.md');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const body = Object.keys(report.arms).map((a) => {
      const x = report.arms[a];
      return `| ${a} | ${x.judged} | ${n1(x.qPct[0])}% | ${n1(x.qPct[1])}% | `
        + `${n1(x.qPct[2])}% | ${n1(x.answerablePct)}% | ${n1(x.recoveredPct)}% |`;
    });
    fs.writeFileSync(out, [
      `# answerable — batch ${path.basename(dir)}`,
      '',
      `${rows.length} judged replies, three fixed questions each, judged on ${judge}.`,
      '',
      `Instrument: ${instrument}.`,
      '',
      '| Arm | runs | q1 what happened | q2 what to open | q3 what next | all three | task facts recovered |',
      '|---|---|---|---|---|---|---|',
      ...body,
      '',
    ].join('\n'));
    console.log(`wrote ${out}`);
  }
  if (failed) console.log(`\n${failed} judge call(s) failed and were left out of the means.`);
}

if (require.main === module) main();

module.exports = {
  QUESTIONS, ABSENT, ANSWERS_SCHEMA, judgePrompt, parseAnswers, isAbsent, scoreAnswers, answerableReport,
  // retold.js runs the same second-stage judge over a retelling instead of the
  // reply, so it needs the same spawn and the same success guards.
  runJudge,
};
