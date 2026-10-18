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
  'detail-bare': [['checks', (g) => before(g, PASSED)], ['records', (g) => before(g, 'I kept my notes in [notes.md](notes.md).')]],
  'why-off': [['why', (g) => g.replace('---\n\n', '---\n\nThe total was wrong because the rate ran twice.\n\n')]],
  'checks-each': [['checks', (g) => g.replace(/- `node test\.js`.*\n- `node lint\.js`.*/, '- `node test.js` and `node lint.js` pass.')],
    ['checks', GOLDS.standard]],
  'checks-off': [['checks', (g) => before(g, PASSED)]],
  'records-off': [['records', (g) => before(g, 'I kept my notes in notes.md.')]],
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

describe('fidelity graders', { skip }, () => {
  for (const c of cases) {
    test(`${c.id}: its message passes, each broken copy fails its grader, and an empty reply fails`, () => {
      const g = gold(c);
      const ok = grade(checkOf(c), g);
      assert.strictEqual(ok.pass, true, ok.detail);
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
