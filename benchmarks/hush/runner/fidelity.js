'use strict';
// The fidelity eval: does a live session's final message keep the hush
// settings it was given? Two fixed jobs run once per case in
// fidelity/cases.json. Each case moves one setting, or sets the minimal preset,
// and names the conformance.js checks that setting owns. A case passes when
// the bold result and every one of those checks pass; a warn is a miss.
//
//   node runner/run.js --tag fid-plan --fidelity --arms hush --reps 1 --dry-run
//
// run.js hands each case its settings through HUSH_CONFIG_FILE, and copies a
// case's overlay, such as a CLAUDE.md that asks for a full report, over the
// fixture.
//
// Under checks=off and detail=bare, run.js's own report and --smoke grade the
// passed-check question with conformance.js's regex. runner/hillclimb.js,
// given --go and --max-usd, asks a model judge (judge() below) instead when it
// writes or regrades a variant.

const fs = require('node:fs');
const path = require('node:path');
const { loadContract, checkMessage } = require('./conformance.js');
const { runBatch } = require('../../batch-judge.js');
const { pluginDir } = require('../../paths.js');

const ROOT = path.resolve(__dirname, '..');
const CASES = path.join(ROOT, 'fidelity', 'cases.json');
// claude -p has no SendUserFile, so every file is rightly a link.
const TURN = { ask: false, work: true, noCards: true };

const hasContract = () => fs.existsSync(path.join(pluginDir('hush'), 'modules'));

function tasks() {
  const { jobs, cases } = JSON.parse(fs.readFileSync(CASES, 'utf8'));
  return Object.entries(jobs).flatMap(([job, j]) => cases.map((c) => ({
    id: `fid-${job}-${c.id}`,
    category: c.overlay ? 'fidelity-full-report' : 'fidelity-settings',
    segment: j.segment, fixture: j.fixture, prompt: j.prompt,
    hushSettings: c.settings,
    ...(c.overlay ? { overlay: c.overlay } : {}),
    check: { type: 'conformance', settings: c.settings, targets: c.targets, gold: c.gold || c.id },
  })));
}

let contract = null;
const strict = (s) => s.checks === 'off' || s.detail === 'bare';

/** A case whose passed-check question goes to the judge: checks=off or detail=bare. */
function needsJudge(check) {
  contract ||= loadContract(pluginDir('hush'));
  return check.targets.includes('checks') && strict({ ...contract.DEFAULTS, ...check.settings });
}

// Blind: it names no plugin, arm or setting.
function judgePrompt(finalText) {
  return [
    'Below is the final message an assistant wrote at the end of a coding session. Answer one question: does the message report that a check passed?',
    '',
    'A check is a command or tool run to verify the work: a test suite, a linter, a build, a type check, or a script such as a probe run to confirm a cause.',
    'The message reports a passed check when it says, in any wording, that such a check passed, succeeded, is green or clean, or gave a full count such as "4 of 4", even in a sentence that also reports a failure or another fact.',
    'It reports none when every check it mentions failed, partly failed ("3 of 4 runs pass", "3 passed, 1 failed"), no longer passes, used to pass, or was not run, or when a count measures something other than a check outcome, as in "8 of 8 retries fire in the same second".',
    'The first bold line is the result. It may name the outcome the user asked for, such as "The discount test passes again."; that alone reports no passed check. That line reports one when it names a command in inline code, a count, or several checks such as "tests" or "lint".',
    '',
    'Reply with JSON only: {"passed": true or false, "quote": "the sentence that reports the passed check, or an empty string"}',
    '',
    '--- MESSAGE ---',
    finalText,
    '--- END ---',
  ].join('\n');
}

const JUDGE_SCHEMA = {
  type: 'object',
  properties: { passed: { type: 'boolean' }, quote: { type: 'string' } },
  required: ['passed', 'quote'],
  additionalProperties: false,
};

function parseJudge(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('judge reply holds no JSON object');
  const { passed, quote } = JSON.parse(m[0]);
  if (typeof passed !== 'boolean') throw new Error('judge reply has no boolean passed');
  return { passed, quote: typeof quote === 'string' ? quote : '' };
}

/**
 * One judge request per text on the Message Batches API. Without go it
 * returns the plan only. Each verdict is {passed, quote} or {error}.
 */
async function judge(texts, { model = 'sonnet', maxUsd, go = false, log = console.log } = {}) {
  if (!texts.length) return { plan: null, verdicts: [] };
  const items = texts.map((t) => ({ prompt: judgePrompt(t), schema: JUDGE_SCHEMA }));
  const { plan } = await runBatch(items, { model });
  log(`judge: ${plan.requests} request(s) on ${plan.model}, worst case $${plan.worstUsd.toFixed(2)}; cap --max-usd ${maxUsd ?? 'unset'}`);
  if (!go) return { plan, verdicts: null };
  const out = await runBatch(items, { model, maxUsd, go: true, log });
  const verdicts = out.results.map((r) => {
    if (r.error) return { error: r.error };
    try { return parseJudge(r.text); } catch (e) { return { error: e.message }; }
  });
  return { plan, verdicts, spentUsd: out.spentUsd };
}

/** verdict, when given for a judged case, answers the passed-check question; {error} throws. */
function grade(check, finalText, verdict) {
  contract ||= loadContract(pluginDir('hush'));
  const judged = verdict !== undefined && needsJudge(check);
  if (judged && verdict.error) throw new Error(`fidelity judge: ${verdict.error}`);
  const out = checkMessage(finalText, { ...contract.DEFAULTS, ...check.settings }, TURN, contract,
    judged ? { passedCheck: verdict } : {});
  const names = ['result', ...check.targets];
  for (const n of names) if (!out[n]) throw new Error(`fidelity: unknown check "${n}"`);
  const missed = names.filter((n) => out[n].status !== 'pass');
  const scored = Object.values(out).filter((r) => r.status !== 'na');
  const detail = missed.length ? missed.map((n) => `${n} ${out[n].status}: ${out[n].why}`).join('; ') : `${names.length} checks pass`;
  return {
    pass: missed.length === 0,
    score: scored.length ? scored.filter((r) => r.status === 'pass').length / scored.length : 0,
    detail: judged ? `${detail} (judged)` : detail,
  };
}

module.exports = { tasks, grade, hasContract, needsJudge, judgePrompt, parseJudge, judge, JUDGE_SCHEMA };
