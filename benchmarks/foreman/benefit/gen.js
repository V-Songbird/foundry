#!/usr/bin/env node
'use strict';
// Does a fact stated as a task constraint change the outcome, and what does a
// false one cost?
//
// The fixture is `pinned-dup`: the `adjacent-mess` module with the ticket that
// pins its three copy-pasted percentile helpers removed from everywhere. Not
// the code comment, not the brief, not the prompt. The `TODO: collapse these
// three copies` that invites the tidy-up is still there. So a session without
// the pin has every reason to unify them and nothing telling it not to.
//
//   arm         where it runs     the pin
//   ---         -------------     -------
//   cut-on      pinned-dup        true: the helpers must stay apart
//   cut-wrong   unpinned-dup      false: the task asks for the collapse, and
//                                 nothing in the fixture can refute the line
//
// Both arms are the same prompt: pinned-dup's frozen foreman.md with one
// Constraints line spliced into <task_rules>. `unpinned-dup` is pinned-dup's
// own fixture with the opposite truth, so the fixture alone decides whether
// the line is right.
//
// The three helpers' distinguishing lines are pinned as `sentinels` in
// tasks.json, so collapsing them is caught however it is done — one shared
// helper, three thin delegates, anything. `fixtures/pinned-dup/lazy/` is that
// exact tidy-up and selfcheck runs it every time, which keeps the detector
// honest without spending a session on it.
//
//   node benefit/gen.js            # write every arm prompt
//   node benefit/gen.js --check    # exit 1 if any is missing or stale
//
// Run data stays on the operator's machine, never in the repository. This
// file writes prompts only.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'pinned-dup');
const PROMPTS = path.join(FIXTURE, 'prompts');

// One line and one claim, worded the way a constraint reads in a shipped
// handoff.
const CUT_LINE =
  '- Do NOT unify the three percentile helpers in src/stats.js (p50/p90/p99) — they are copy-pasted on purpose; ticket PERF-1123 pins them until the sampling rework lands';

const ARMS = {
  'cut-on': CUT_LINE,
  'cut-wrong': CUT_LINE,
};

// The line goes under Constraints: inside <task_rules>, after the last
// constraint the frozen prompt already carries.
const ANCHOR = '- Do NOT change test files; make the code satisfy the tests\n';

function build(armName) {
  if (!(armName in ARMS)) throw new Error(`unknown arm ${armName}`);
  const base = fs.readFileSync(path.join(PROMPTS, 'foreman.md'), 'utf8');
  const at = base.indexOf(ANCHOR);
  if (at === -1) {
    throw new Error(`foreman.md no longer contains ${JSON.stringify(ANCHOR)} — the arms cannot be spliced`);
  }
  const cut = at + ANCHOR.length;
  return `${base.slice(0, cut)}${ARMS[armName]}\n${base.slice(cut)}`;
}

function armPath(armName) {
  return path.join(PROMPTS, `${armName}.md`);
}

function main() {
  const check = process.argv.includes('--check');
  const stale = [];
  for (const armName of Object.keys(ARMS)) {
    const wanted = build(armName);
    const target = armPath(armName);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    if (current === wanted) continue;
    if (check) {
      stale.push(path.relative(ROOT, target));
      continue;
    }
    fs.writeFileSync(target, wanted, 'utf8');
    console.log(`wrote ${path.relative(ROOT, target)}`);
  }
  if (check && stale.length) {
    console.error(`stale or missing arm prompts: ${stale.join(', ')}\nRun: node benefit/gen.js`);
    process.exit(1);
  }
  if (check) console.log('benefit arms current');
}

if (require.main === module) main();

module.exports = { ARMS, build, armPath, CUT_LINE };
