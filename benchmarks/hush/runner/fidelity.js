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

const fs = require('node:fs');
const path = require('node:path');
const { loadContract, checkMessage } = require('./conformance.js');
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
function grade(check, finalText) {
  contract ||= loadContract(pluginDir('hush'));
  const out = checkMessage(finalText, { ...contract.DEFAULTS, ...check.settings }, TURN, contract);
  const names = ['result', ...check.targets];
  for (const n of names) if (!out[n]) throw new Error(`fidelity: unknown check "${n}"`);
  const missed = names.filter((n) => out[n].status !== 'pass');
  const scored = Object.values(out).filter((r) => r.status !== 'na');
  return {
    pass: missed.length === 0,
    score: scored.length ? scored.filter((r) => r.status === 'pass').length / scored.length : 0,
    detail: missed.length ? missed.map((n) => `${n} ${out[n].status}: ${out[n].why}`).join('; ') : `${names.length} checks pass`,
  };
}

module.exports = { tasks, grade, hasContract };
