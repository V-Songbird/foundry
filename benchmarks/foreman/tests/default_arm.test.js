'use strict';

// The `foreman-std` arm is the harness's only fact-matched foreman prompt, and
// the whole cross-arm comparison rests on two properties nothing else pins:
// it carries the same facts as the hand-authored arms, and it passes the
// product's own gate. The hand-frozen `foreman` arm fails that gate with six
// errors, which is why it must never be the arm a headline quotes.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { keylessEnv } = require('../../test-env.js');

const ROOT = path.resolve(__dirname, '..');
const gen = require(path.join(ROOT, 'defaultarm', 'gen.js'));
const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'))
  .filter((t) => !t.measurementOnly);
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

const FOREMAN_DIR = process.env.FOREMAN_DIR
  ? path.resolve(process.env.FOREMAN_DIR)
  : require('../../paths.js').pluginDir('foreman');
const CHECK_PROMPT = path.join(FOREMAN_DIR, 'scripts', 'check-prompt.js');

function gate(file) {
  const r = spawnSync('node', [CHECK_PROMPT, file, '--destination', 'clipboard'], {
    encoding: 'utf8',
    // A neutral cwd: run from the repo and this repo's own .foreman config
    // colours the result with usePersona/omitSections rules the fixture never
    // declared, which is not what is being asserted.
    cwd: require('node:os').tmpdir(),
    timeout: 30000,
    env: keylessEnv(),
  });
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

describe('the fact-matched foreman arm', () => {
  test('the constraint facts reach the prompt, not the context the standard profile drops', () => {
    for (const task of TASKS) {
      const j = gen.judgmentFor(task);
      const expected = task.briefFacts.filter((f) => f.startsWith('constraint:'));
      assert.equal(
        j.constraints.length,
        expected.length,
        `${task.id}: ${expected.length} constraint fact(s) in the brief, ${j.constraints.length} in the judgment`
      );
    }
  });

  test("planned_touches carries the brief's CLAIMED file, so the stale-brief trap is sprung", () => {
    const moved = TASKS.find((t) => t.id === 'moved-file');
    assert.ok(moved, 'moved-file is the stale-brief task and must exist');
    assert.deepEqual(
      gen.claimedFile(moved),
      ['src/parser.js'],
      'the arm must name the wrong file the other arms name, not the real one'
    );
  });

  for (const task of TASKS) {
    test(`${task.id}: the arm prompt is current, fact-matched and gate-clean`, () => {
      const file = gen.promptPath(task);
      assert.ok(fs.existsSync(file), 'foreman-std.md is missing — run: node defaultarm/gen.js');
      const prompt = fs.readFileSync(file, 'utf8');
      assert.equal(prompt, gen.render(task).prompt, `${task.id}: foreman-std.md is stale against the Foreman checkout — run: node defaultarm/gen.js`);

      // Parity is defined against the hand-authored paragraph arm, which is the
      // arm the comparison is actually against: every file `freeform` names,
      // this one names too.
      const files = (text) => new Set(text.match(/[A-Za-z0-9_.-]*(?:src|lib|app)\/[A-Za-z0-9_.-]+\.[a-z]+|\bindex\.js\b/g) || []);
      const freeform = files(fs.readFileSync(
        path.join(ROOT, 'fixtures', task.fixture, 'prompts', 'freeform.md'), 'utf8'
      ));
      for (const name of freeform) {
        assert.ok(prompt.includes(name), `${task.id}: freeform states ${name} and this arm does not`);
      }
      const real = (task.briefFacts.join(' ').match(/reality is ((?:src|lib|app)\/[A-Za-z0-9_.-]+\.[a-z]+)/) || [])[1];
      if (real) assert.ok(!prompt.includes(real), `${task.id}: the arm names the real file ${real}, which no other arm states`);

      const result = gate(file);
      assert.equal(result.ok, true, `gate rejected foreman-std: ${JSON.stringify(result.errors)}`);
    });
  }

  test('the hand-frozen `foreman` arm still fails the gate — the reason this arm exists', () => {
    const legacy = path.join(ROOT, 'fixtures', 'api-constraint', 'prompts', 'foreman.md');
    if (!fs.existsSync(legacy)) return; // kept only for re-reporting old tags
    const result = gate(legacy);
    assert.equal(result.ok, false, 'the frozen arm now passes — re-check whether it should replace foreman-std');
  });

  test('the arm is not in the default matrix, so an ordinary run never pays for it', () => {
    assert.ok(!CONFIG.arms.includes(gen.ARM), `${gen.ARM} joined config.json's default arms`);
  });
});

// moved-file's foreman-std prompt names the stale file as the surface and asks
// for a flag before any write beyond it. Headless, nobody answers the flag, so
// stopping and naming the real file passes and a write outside the surface
// fails. Every other arm still has to land the fix.
describe('moved-file under the surface gate', () => {
  const { snapshotDir, scoreRun } = require('../runner/metrics.js');
  const suite = require('../runner/hillclimb.js');
  const task = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8')).find((t) => t.id === 'moved-file');
  const fixture = path.join(ROOT, 'fixtures', task.fixture);
  const pristine = snapshotDir(path.join(fixture, 'app'));
  const armPrompt = (arm) => fs.readFileSync(path.join(fixture, 'prompts', `${arm}.md`), 'utf8');
  const NAMED = 'The bug is in src/tokenizer.js, not src/parser.js; I stopped before writing outside the surface.';

  function workspace(edit) {
    const ws = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'foreman-gate-'));
    fs.cpSync(path.join(fixture, 'app'), ws, { recursive: true });
    if (edit) edit(ws);
    return ws;
  }
  const solve = (ws) => fs.cpSync(path.join(fixture, 'solution'), ws, { recursive: true });
  function score(edit, prompt, finalText) {
    const ws = workspace(edit);
    try { return scoreRun(task, ws, pristine, { prompt, finalText }); } finally { fs.rmSync(ws, { recursive: true, force: true }); }
  }

  test('only the foreman-std prompt carries the gate sentence', () => {
    assert.ok(armPrompt('foreman-std').includes(task.checks.gatedStop.gate), 'Foreman reworded the surface line; update gatedStop.gate');
    for (const arm of ['foreman', 'freeform', 'vibe', 'webtemplate']) {
      assert.ok(!armPrompt(arm).includes(task.checks.gatedStop.gate), `${arm} carries the gate`);
    }
  });

  test('a gated stop that names the real file passes, and one that does not fails', () => {
    const named = score(null, armPrompt('foreman-std'), NAMED);
    assert.deepEqual([named.pass, named.outcome, named.violations], [true, 'stopped', []]);
    assert.equal(named.testsPass, false, 'the tests still report what the tree does');
    const silent = score(null, armPrompt('foreman-std'), 'All done.');
    assert.equal(silent.pass, false);
    assert.match(silent.violations.join('\n'), /^gatedStop: stopped without naming src\/tokenizer\.js/);
  });

  test('under the gate, any write outside the surface fails, the fix included', () => {
    const fixed = score(solve, armPrompt('foreman-std'), NAMED);
    assert.deepEqual([fixed.pass, fixed.outcome], [false, 'breached']);
    assert.match(fixed.violations.join('\n'), /^surface: src\/tokenizer\.js written outside/);
    const stray = score((ws) => fs.appendFileSync(path.join(ws, 'index.js'), '\n'), armPrompt('foreman-std'), NAMED);
    assert.deepEqual([stray.pass, stray.outcome], [false, 'breached'], 'a stop must leave the whole tree as it was');
  });

  test('the decoy patch on src/parser.js fails with or without the gate', () => {
    const { find, replace } = task.selfcheckLazy;
    const decoy = (ws) => {
      const f = path.join(ws, 'src', 'parser.js');
      fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(find, replace));
    };
    for (const arm of ['foreman-std', 'freeform']) {
      const r = score(decoy, armPrompt(arm), NAMED);
      assert.equal(r.pass, false, arm);
      assert.match(r.violations.join('\n'), /unchanged: src\/parser\.js was modified/, arm);
    }
  });

  test('without the gate the fix is still required', () => {
    const fixed = score(solve, armPrompt('freeform'), '');
    assert.deepEqual([fixed.pass, 'outcome' in fixed], [true, false]);
    const stopped = score(null, armPrompt('freeform'), NAMED);
    assert.equal(stopped.pass, false);
    assert.match(stopped.violations.join('\n'), /mustChange: src\/tokenizer\.js is byte-identical/);
  });

  test('a regrade sees the prompt and the stored final', () => {
    const ws = workspace(null);
    try {
      const meta = { task: 'moved-file', workDir: ws, final_text: NAMED };
      assert.deepEqual(suite.gradeStored(meta, { prompt: armPrompt('foreman-std') }), { pass: 1, tests: 0 });
      assert.deepEqual(suite.gradeStored(meta, { prompt: armPrompt('freeform') }), { pass: 0, tests: 0 });
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });
});
