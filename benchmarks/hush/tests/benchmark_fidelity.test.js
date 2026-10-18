'use strict';

// The fidelity eval (runner/fidelity.js, fidelity/cases.json). Local: no
// `claude` CLI, no cost. Each case's message in anchors/fidelity/ passes its
// grader, one broken copy per grader fails it, and an empty reply fails every
// case. The graders read hush's modules, so those parts skip on a hush
// checkout without modules/.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { tasks, grade, hasContract } = require('../runner/fidelity.js');
const { pluginDir } = require('../../paths.js');

const ROOT = path.resolve(__dirname, '..');
const { jobs, cases, ungraded } = JSON.parse(fs.readFileSync(path.join(ROOT, 'fidelity', 'cases.json'), 'utf8'));
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const skip = !hasContract() && 'the hush checkout has no modules/ yet';

const gold = (c) => fs.readFileSync(path.join(ROOT, 'anchors', 'fidelity', `${c.gold || c.id}.md`), 'utf8');
const checkOf = (c) => ({ type: 'conformance', settings: c.settings, targets: c.targets });
const GOLDS = Object.fromEntries(cases.map((c) => [c.id, () => gold(c)]));

// Puts a block above the final rule and Next line, or at the end when there is none.
const before = (g, block) => (g.includes('\n\n---\n\n**Next')
  ? g.replace('\n\n---\n\n**Next', `\n\n${block}\n\n---\n\n**Next`) : `${g.trimEnd()}\n\n${block}\n`);
const words = (n) => Array(n / 10).fill('Ten words in this sentence and it stops right here.').join('\n\n');
const PASSED = '`node probe.js` passes, 1 of 1.';
// Passed checks and records lines in the forms a model writes them, with no
// command in code or no record verb; each must still fail its grader.
// A passed check on the bold result line is one too, though the result may
// name the outcome ("The discount test passes again.").
const resultLine = (r) => (g) => g.replace(/^\*\*.*\*\*$/m, r);
const PASSED_FORMS = [PASSED, 'All four tests pass and lint is clean.', '`test.js` now passes.',
  'Both checks passed: the tests (4 of 4) and the lint.', '`node test.js` passes, 4 of 4, but I did not run the app.',
  '`node test.js` fails, but `node lint.js` passes.', '- `node test.js`: 4 of 4', '`node probe.js` confirms the cause, 8 of 8.',
  'The tests pass now that the rate is not applied twice.', '- `node test.js`: 4 of 4 in 0.3 s', '- `node test.js`: 4 of 4 OK',
  '`node test.js` ran 4 of 4 in 2 s.', '`node probe.js` shows 8 of 8.', '`node probe.js` shows 8 of 8, all in the same second.',
  // A pass clause followed by a fail or negation about something else.
  'The tests pass, so the rate is no longer applied twice.', '`node test.js` passes now; it failed before.',
  '`node test.js` passes now, it failed before the fix.', '`node test.js` 4 of 4 pass, 0 fail.', '`node test.js`: 4 of 4 pass and 0 fail.',
  '`node test.js` passes, so the bug no longer shows.', '`node test.js` passed, but I did not run the app.', '`npm test` passes, but fails on Windows.',
  '`node test.js` passes with no errors.', '- `node test.js`: 4/4',
  // A fail, partial or past-time word that does not take back the pass.
  '`node test.js` passes now that the rate no longer doubles.', '`node test.js` and the other tests pass.',
  '`node test.js` passes before and after the change.']
  .map((s) => ['checks', (g) => before(g, s)])
  .concat(['**The discount test passes again: `node test.js`, 4 of 4.**', '**Fixed. All 4 tests pass and lint is clean.**',
    '**The discount test passes, 4 of 4.**'].map((r) => ['checks', resultLine(r)]));
// Failed checks, and counts of something other than checks, as in the explain
// job's probe; none is a passed check, so each copy still passes.
const NOT_PASSED = ['`node test.js` does not pass.', '`node test.js` no longer passes.', "`node lint.js` isn't clean.",
  '`node test.js` fails, 3 of 4 tests pass.', 'The tests did not pass.', '- `node test.js` fails: 3 of 4.',
  'I could not make `node test.js` pass.', '`node test.js` passes no longer.', '`node test.js` passed before the change and fails now.',
  '`node test.js` passed before the change, and now fails.', '`node test.js` passed before the change, but fails now.',
  '`node test.js` used to pass and now fails.', '`node test.js` fails while some tests pass.', '`node test.js` fails while the other tests pass.',
  '`node test.js` fails; the other tests pass.', '`node test.js` cannot pass yet.', 'No tests pass.', 'None of the tests pass.',
  '`node test.js` stopped passing.', 'I was unable to make `node test.js` pass.', '`node test.js` fails: 3/4.',
  '`node probe.js` shows 8 of 8 retries fire in the same second.', 'The retries pile up: `node probe.js` counts 8 of 8 retries in one second.',
  '`node probe.js` prints the same delay for 8 of 8 runs.',
  // An unequal count is a failure whatever it counts.
  '`node test.js` passes in 3 of 4 runs.', '`node test.js`: 3 of 4 runs pass.', '`node lint.js`: 3 of 4 files pass.']
  .map((s) => (g) => before(g, s))
  .concat(['**The retries spike because every client waits the same time.**', '**`node test.js` still fails, 3 of 4.**',
    '**The cause is in `src/retry.js`: it passes the same delay.**', '**The build passes again.**'].map(resultLine));
const RECORD_FORMS = ['I kept my notes in notes.md.', 'I kept my notes in [notes.md](notes.md).', 'Notes are in [notes.md](notes.md).',
  'I created [notes.md](notes.md) with the fix.', 'Docs written:\n\n- [notes.md](notes.md)']
  .map((s) => ['records', (g) => before(g, s)]);
const CODE_FILE = (g) => g.replace('[discount.js:7](src/discount.js:7)', '`src/discount.js`');
const FOOTNOTE = (g) => before(g, '[^1]: A compound discount applies the rate twice.');

// Case id -> [target, broken copy of the case's message], one per grader.
const BROKEN = {
  standard: [
    ['checks', (g) => before(g, PASSED)],
    ['rules', (g) => g.replace('\n\n---\n\n', '\n\n')],
    ['next', (g) => `${g.trimEnd()}\n\nOne more line.`],
    ['sentences', (g) => before(g, `${Array(15).fill('word').join(' ')}.`)],
    ['blocks', (g) => before(g, Array(9).fill('Five words sit right here.').join(' '))],
    ['emoji', (g) => g.replace('passes again.', 'passes again. 🎉')],
    ['markdown', (g) => before(g, '<details>more</details>')],
    ['files', CODE_FILE],
    ['length', (g) => before(g, words(200))],
  ],
  'next-top': [['next', GOLDS.standard], ['rules', (g) => g.replace('\n\n---\n\n', '\n\n')]],
  'next-off': [['next', GOLDS.standard]],
  'rules-off': [['rules', GOLDS.standard]],
  'detail-short': [['length', (g) => before(g, words(100))]],
  'detail-full': [['length', (g) => before(g, words(320))]],
  'detail-bare': [...PASSED_FORMS, ...RECORD_FORMS],
  'why-off': [['why', (g) => g.replace('---\n\n', '---\n\nThe total was wrong because the rate ran twice.\n\n')]],
  'checks-each': [['checks', (g) => g.replace(/- `node test\.js`.*\n- `node lint\.js`.*/, '- `node test.js` and `node lint.js` pass.')],
    ['checks', GOLDS.standard]],
  'checks-off': PASSED_FORMS,
  'records-off': RECORD_FORMS,
  'terms-inline': [['terms', FOOTNOTE]],
  'terms-none': [['terms', FOOTNOTE]],
  'markdown-basic': [['markdown', FOOTNOTE]],
  'markdown-plain': [['markdown', (g) => before(g, '| a | b |\n|---|---|\n| 1 | 2 |')], ['markdown', GOLDS.standard], ['rules', GOLDS.standard]],
  'files-link': [['files', CODE_FILE]],
  'sentences-20': [['sentences', (g) => before(g, `${Array(25).fill('word').join(' ')}.`)],
    ['blocks', (g) => before(g, Array(13).fill('Five words sit right here.').join(' '))]],
  'emoji-on': [['emoji', (g) => g.replace('💡', '🎉')], ['emoji', (g) => g.replace('✅ ', '')]],
  'headers-on': [['headers', (g) => g.replace('**Changes**\n', '')]],
};
BROKEN['full-report-checks-off'] = BROKEN['checks-off'];
BROKEN['full-report-records-off'] = BROKEN['records-off'];
BROKEN['full-report-minimal'] = BROKEN['detail-bare'];

// Case id -> compliant copies of the case's message, each of which must pass.
const COMPLIANT = {
  // A check mark on the sentence that already reports the passed check counts once.
  standard: [(g) => g.replace('`node test.js` passes, 4 of 4,', '`node test.js` passes ✓, 4 of 4,')],
  'checks-off': NOT_PASSED, 'detail-bare': NOT_PASSED, 'full-report-checks-off': NOT_PASSED, 'full-report-minimal': NOT_PASSED,
};

describe('fidelity graders', { skip }, () => {
  for (const c of cases) {
    test(`${c.id}: its message passes, each broken copy fails its grader, and an empty reply fails`, () => {
      const g = gold(c);
      const ok = grade(checkOf(c), g);
      assert.strictEqual(ok.pass, true, ok.detail);
      for (const copy of COMPLIANT[c.id] || []) {
        const r = grade(checkOf(c), copy(g));
        assert.strictEqual(r.pass, true, `${c.id}: a compliant copy fails: ${r.detail}`);
      }
      assert.ok(BROKEN[c.id]?.length, `${c.id} has no broken copy`);
      for (const [target, broken] of BROKEN[c.id]) {
        const r = grade(checkOf(c), broken(g));
        assert.strictEqual(r.pass, false, `${c.id}: a broken ${target} still passes`);
        assert.match(r.detail, new RegExp(`(?:^|; )${target} `), `${c.id}: ${target} is not what failed: ${r.detail}`);
      }
      assert.strictEqual(grade(checkOf(c), '').pass, false);
    });
  }

  test('an unknown target is a configuration error, not a miss', () => {
    assert.throws(() => grade({ settings: {}, targets: ['nonsense'] }, gold(cases[0])), /unknown check "nonsense"/);
  });
});

describe('fidelity coverage', { skip }, () => {
  const { KNOBS } = require(path.join(pluginDir('hush'), 'hooks', 'style-settings.js'));

  test('every setting value is a case, the standard case, or ungraded with a reason', () => {
    const standard = cases.find((c) => c.id === 'standard');
    assert.deepStrictEqual(standard.settings, {});
    for (const [knob, values] of Object.entries(KNOBS)) {
      for (const value of values.slice(1)) {
        const own = cases.find((c) => c.id === `${knob}-${value}`);
        assert.ok(own ? JSON.stringify(own.settings) === JSON.stringify({ [knob]: value }) : ungraded[`${knob}=${value}`],
          `${knob}=${value} has no case and no ungraded reason`);
      }
    }
    for (const key of Object.keys(ungraded)) {
      const [k, v] = key.split('=');
      assert.ok(KNOBS[k]?.includes(v), `ungraded ${key} is not a hush setting`);
    }
    for (const c of cases) {
      for (const [k, v] of Object.entries(c.settings)) assert.ok(KNOBS[k]?.includes(v), `${c.id}: ${k}=${v} is not a hush setting`);
    }
  });

  test('every hush module is a known setting value', () => {
    for (const f of fs.readdirSync(path.join(pluginDir('hush'), 'modules'))) {
      const m = f.match(/^([a-z]+)-(.+)\.md$/);
      assert.ok(m && KNOBS[m[1]]?.slice(1).includes(m[2]), `modules/${f} names no setting value`);
    }
  });
});

describe('fidelity tasks', () => {
  const all = tasks();

  test('two jobs times every case, with unique path-safe ids', () => {
    assert.strictEqual(all.length, Object.keys(jobs).length * cases.length);
    assert.strictEqual(all.length, 44);
    assert.strictEqual(new Set(all.map((t) => t.id)).size, all.length);
    for (const t of all) assert.match(t.id, /^fid-[a-z]+-[a-z0-9-]+$/);
  });

  test('every fixture, gold and overlay exists, and the overlay holds only CLAUDE.md', () => {
    for (const t of all) {
      assert.ok(CONFIG.segments[t.segment], `${t.id}: unknown segment ${t.segment}`);
      assert.ok(fs.existsSync(path.join(ROOT, 'fixtures', t.fixture)), `${t.id}: no fixture ${t.fixture}`);
      assert.ok(fs.existsSync(path.join(ROOT, 'anchors', 'fidelity', `${t.check.gold}.md`)), `${t.id}: no gold ${t.check.gold}`);
      if (t.overlay) assert.deepStrictEqual(fs.readdirSync(path.join(ROOT, t.overlay)), ['CLAUDE.md']);
    }
    assert.strictEqual(all.filter((t) => t.overlay).length, 6);
  });
});
