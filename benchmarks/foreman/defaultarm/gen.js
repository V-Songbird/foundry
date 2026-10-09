#!/usr/bin/env node
'use strict';
// The `foreman-std` arm — a fact-matched foreman handoff for the DEFAULT grid.
//
// Why this exists. The hand-frozen fixtures/*/prompts/foreman.md is not a
// foreman arm: it fails the product's own gate (check-prompt.js) with six
// errors: altered <scope_discipline>, no closure-evidence rule, no <plan>, no
// no-invention line, no fixed closing paragraph, and an UNBOUNDED fix loop.
// Foreman would refuse to hand it over. Measuring it measures nothing.
//
// Generating the prompt through craft-handoff.js is not enough on its own.
// Passing the constraint facts as `judgment.context`, which the standard
// profile drops, means `index.js is frozen` and `do not touch src/format.js`
// never reach the session; naming the task's REAL file in planned_touches
// quietly repairs moved-file's stale-brief trap before the session sees it.
//
// This generator fixes both: constraint facts go to `judgment.constraints`
// (which renders into <task_rules> at either profile), and planned_touches
// carries the CLAIMED location — the same file name every other arm states,
// wrong one included. Foreman's truth-grounding block is then what has to catch
// it, which is the actual product claim under test.
//
//   node defaultarm/gen.js          # write the arm prompt for every task
//   node defaultarm/gen.js --check  # exit 1 if missing or drifted
//
// Run data stays on the operator's machine, never in the repository. This
// writes prompts.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const ARM = 'foreman-std';

const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'))
  .filter((t) => !t.measurementOnly);

const FOREMAN_DIR = process.env.FOREMAN_DIR
  ? path.resolve(process.env.FOREMAN_DIR)
  : require('../../paths.js').pluginDir('foreman');
const CRAFT = path.join(FOREMAN_DIR, 'scripts', 'craft-handoff.js');

function fact(task, prefix) {
  return task.briefFacts.find((f) => f.startsWith(prefix)) || '';
}

// The file the BRIEF names — which on the stale-brief task is deliberately the
// wrong one. Every other arm states it; so must this one, or the trap is only
// sprung on three of four arms.
function claimedFile(task) {
  const loc = fact(task, 'fix location:') || fact(task, 'claimed location');
  const m = loc.match(/(?:^|[\s(])((?:src|lib|app)\/[A-Za-z0-9_.-]+\.[a-z]+)/);
  if (m) return [m[1]];
  const named = (task.checks && task.checks.mustChange) || [];
  return named.length ? named : ['src'];
}

// Same facts as every other arm, mapped onto the fields foreman actually
// renders. Constraint facts go to `constraints`, never `context`, which the
// standard profile drops.
function judgmentFor(task) {
  const symptom = fact(task, 'symptom:').replace(/^symptom:\s*/, '');
  const location = fact(task, 'fix location:').replace(/^fix location:\s*/, '')
    // The claim only: the stale-brief fact goes on to name the real file, which
    // no arm may state.
    || fact(task, 'claimed location').replace(/^claimed location[^:]*:\s*/, '').split(' — ')[0];
  const constraints = task.briefFacts
    .filter((f) => f.startsWith('constraint:'))
    .map((f) => f.replace(/^constraint:\s*/, ''));
  return {
    role: 'a senior engineer',
    goal: `to fix ${symptom || task.id} so the suite passes`,
    context: location,
    steps: ['Read the code the change touches.', 'Make the change and run the check.'],
    constraints,
    verification: [{ run: task.testCommand, expected: 'all tests pass' }],
  };
}

function stageProject(task) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `foreman-defaultarm-${task.id}-`));
  fs.cpSync(path.join(ROOT, 'fixtures', task.fixture, 'app'), dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'ROADMAP.jsonl'),
    JSON.stringify({ foreman_roadmap_format: 2 }) + '\n',
    'utf8'
  );
  return dir;
}

function craft(task, project) {
  const input = JSON.stringify({
    title: `Fix ${task.id}`,
    what: task.briefFacts.join(' '),
    planned_touches: claimedFile(task),
    destination: 'clipboard',
    request: task.briefFacts[0].replace(/^symptom:\s*/, 'Fix: '),
    judgment: judgmentFor(task),
  });
  const result = spawnSync('node', [CRAFT], {
    input,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: project },
  });
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new Error(`craft-handoff returned non-JSON for ${task.id}: ${result.stdout}\n${result.stderr}`);
  }
  if (!json.ok) throw new Error(`craft-handoff refused ${task.id}: ${JSON.stringify(json)}`);
  if (!json.gate.ok) throw new Error(`gate refused ${task.id}: ${JSON.stringify(json.gate.errors)}`);
  return { prompt: json.prompt, profile: json.profile };
}

// Fact parity is the whole basis of the comparison, so it is asserted rather
// than assumed: every constraint fact and the claimed file name have to be
// present in the assembled prompt.
function assertParity(task, prompt) {
  for (const c of task.briefFacts.filter((f) => f.startsWith('constraint:'))) {
    const stem = c.replace(/^constraint:\s*/, '').split(/[\s,—(]/)[0].replace(/[^A-Za-z0-9_./-]/g, '');
    if (stem && !prompt.includes(stem)) {
      throw new Error(`${task.id}: constraint fact "${stem}" missing from the assembled prompt`);
    }
  }
  for (const f of claimedFile(task)) {
    if (f !== 'src' && !prompt.includes(f)) {
      throw new Error(`${task.id}: the brief's claimed file "${f}" is missing — the trap is not being sprung`);
    }
  }
  const real = (fact(task, 'claimed location').match(/reality is ((?:src|lib|app)\/[A-Za-z0-9_.-]+\.[a-z]+)/) || [])[1];
  if (real && prompt.includes(real)) {
    throw new Error(`${task.id}: the prompt names the real file "${real}" — the stale-brief trap is repaired`);
  }
}

function promptPath(task) {
  return path.join(ROOT, 'fixtures', task.fixture, 'prompts', `${ARM}.md`);
}

function main() {
  const check = process.argv.includes('--check');
  let drifted = 0;
  for (const task of TASKS) {
    const { prompt, profile } = craft(task, stageProject(task));
    assertParity(task, prompt);
    const target = promptPath(task);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    if (current === prompt) continue;
    drifted += 1;
    if (check) {
      console.error(`drifted: ${path.relative(ROOT, target).split(path.sep).join('/')}`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, prompt, 'utf8');
    console.log(`wrote ${path.relative(ROOT, target).split(path.sep).join('/')} (${prompt.length} chars, profile ${profile})`);
  }
  if (check) {
    if (drifted) {
      console.error(`${drifted} foreman-std arm prompt(s) missing or stale — run: node defaultarm/gen.js`);
      process.exit(1);
    }
    console.log('foreman-std arm current');
    return;
  }
  console.log('gen OK');
}

if (require.main === module) main();

module.exports = { ARM, claimedFile, judgmentFor, promptPath };
