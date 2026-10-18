'use strict';

// The fidelity eval (runner/fidelity.js, fidelity/cases.json). Local: no
// `claude` CLI, no cost. Each case's message in anchors/fidelity/ passes its
// grader, one broken copy per grader fails it, and an empty reply fails every
// case. The graders read hush's modules, so those parts skip on a hush
// checkout without modules/.

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { tasks, grade, hasContract, judgePrompt, parseJudge, judge, JUDGE_SCHEMA } = require('../runner/fidelity.js');
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

// The judge that --regrade asks under checks=off and detail=bare. Offline:
// fetch is replaced, so any network call the test did not stub fails it.
describe('fidelity judge', { skip }, () => {
  const caseOf = (id) => cases.find((c) => c.id === id);
  const reply = (id, text, stop = 'end_turn') => JSON.stringify({ custom_id: id, result: { type: 'succeeded',
    message: { stop_reason: stop, content: [{ type: 'text', text }], usage: { input_tokens: 500, output_tokens: 50 } } } });
  // A Batches API that ends at once and answers with these result lines; posts collects each POST body.
  const batchApi = (lines, posts) => async (url, init = {}) => {
    if (init.method === 'POST') {
      posts.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: 'msgbatch_test', processing_status: 'ended' }));
    }
    if (url.endsWith('/results')) return new Response(lines.join('\n'));
    throw new Error(`unexpected call ${url}`);
  };
  let realFetch, savedKey;
  beforeEach(() => {
    realFetch = global.fetch;
    global.fetch = () => { throw new Error('network call in an offline test'); };
    savedKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    global.fetch = realFetch;
    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedKey;
  });

  test('the prompt holds the message verbatim, the result-line exception, and names no setting', () => {
    const msg = '**Done.**\n\n`node test.js` passes.';
    const p = judgePrompt(msg);
    assert.ok(p.includes(`--- MESSAGE ---\n${msg}\n--- END ---`));
    assert.match(p, /that alone reports no passed check/);
    assert.doesNotMatch(p, /hush|checks=off|detail=bare/i);
  });

  test('the reply parser takes the JSON object and refuses anything without a boolean passed', () => {
    assert.deepStrictEqual(parseJudge('{"passed":true,"quote":"x"}'), { passed: true, quote: 'x' });
    assert.deepStrictEqual(parseJudge('Here: {"passed": false, "quote": ""} done'), { passed: false, quote: '' });
    assert.throws(() => parseJudge('It passed.'), /no JSON object/);
    assert.throws(() => parseJudge('{"passed":"yes"}'), /boolean passed/);
    assert.throws(() => parseJudge('{}'), /boolean passed/);
  });

  test('a verdict decides the passed-check question of a strict case, and an error throws', () => {
    for (const id of ['checks-off', 'detail-bare']) {
      const c = caseOf(id);
      const g = gold(c);
      assert.strictEqual(grade(checkOf(c), g, { passed: false, quote: '' }).pass, true);
      const hit = grade(checkOf(c), g, { passed: true, quote: '`node test.js` passes.' });
      assert.strictEqual(hit.pass, false);
      assert.match(hit.detail, /(?:^|; )checks /);
      assert.match(hit.detail, /`node test\.js` passes\./);
      assert.throws(() => grade(checkOf(c), g, { error: 'no result returned' }), /fidelity judge/);
      // A check mark in a diff block stays the regex's to catch.
      assert.strictEqual(grade(checkOf(c), before(g, '```diff\n+ ✓ `node test.js`\n```'), { passed: false, quote: '' }).pass, false);
    }
    const std = caseOf('standard');
    const broken = before(gold(std), PASSED);
    assert.deepStrictEqual(grade(checkOf(std), broken, { passed: false, quote: '' }), grade(checkOf(std), broken));
  });

  test('a mixed count the regex reads as a passed check passes when the judge says none', () => {
    const c = caseOf('checks-off');
    const copy = before(gold(c), '`node test.js`: 3 passed, 1 failed.');
    assert.strictEqual(grade(checkOf(c), copy).pass, false, 'the regex no longer misgrades this form; pick another');
    assert.strictEqual(grade(checkOf(c), copy, { passed: false, quote: '' }).pass, true);
  });

  test('judge plans without sending, needs a cap, and refuses a worst case above it', async () => {
    const logs = [];
    const plan = await judge(['a', 'b'], { log: (l) => logs.push(l) });
    assert.strictEqual(plan.verdicts, null);
    assert.strictEqual(plan.plan.requests, 2);
    assert.match(logs[0], /worst case \$\d+\.\d\d; cap --max-usd unset/);
    await assert.rejects(judge(['a'], { go: true, log: () => {} }), /max-usd is required/);
    process.env.ANTHROPIC_API_KEY = 'test-key';
    await assert.rejects(judge(['a'], { go: true, maxUsd: 0.0001, log: () => {} }), /nothing was sent/);
    assert.deepStrictEqual(await judge([], { go: true }), { plan: null, verdicts: [] });
  });

  test('judge turns every result that is not a JSON verdict into an error', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const posts = [];
    global.fetch = batchApi([
      reply('j0', '{"passed":true,"quote":"`node test.js` passes."}'),
      JSON.stringify({ custom_id: 'j1', result: { type: 'errored', error: { type: 'overloaded' } } }),
      reply('j2', '{"passed":', 'max_tokens'),
      reply('j4', 'It reports a passed check.'),
    ], posts);
    const r = await judge(['m0', 'm1', 'm2', 'm3', 'm4'], { go: true, maxUsd: 1, log: () => {} });
    assert.deepStrictEqual(r.verdicts[0], { passed: true, quote: '`node test.js` passes.' });
    assert.match(r.verdicts[1].error, /^errored/);
    assert.match(r.verdicts[2].error, /max_tokens/);
    assert.match(r.verdicts[3].error, /no result/);
    assert.match(r.verdicts[4].error, /no JSON object/);
    assert.strictEqual(posts.length, 1);
    assert.deepStrictEqual(posts[0].requests[0].params.output_config.format.schema, JUDGE_SCHEMA);
  });

  test('--regrade sends each strict row twice, and lists a missing or failed verdict as SKIP', async (t) => {
    const suite = require('../runner/hillclimb.js');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-fidelity-judge-'));
    t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
    const FLOW = path.join(tmp, 'flow');
    const run = path.join(tmp, 'run.json');
    const c = caseOf('checks-off');
    fs.writeFileSync(run, JSON.stringify({ finalText: gold(c) }));
    fs.mkdirSync(path.join(FLOW, 'baseline'), { recursive: true });
    const recorded = { pass: 1, score: grade(checkOf(c), gold(c)).score };
    fs.writeFileSync(path.join(FLOW, 'baseline', 'results.jsonl'), `${JSON.stringify({ prompt_id: 'fid-fix-checks-off', rep: 0,
      grade: recorded, meta: { task: 'fid-fix-checks-off', run, workDir: path.join(tmp, 'gone') } })}\n`);
    const log = t.mock.method(console, 'log', () => {});
    const call = async (...extra) => {
      log.mock.resetCalls();
      const code = await suite.cli(['--variant', 'baseline', '--flow', FLOW, '--regrade', ...extra]);
      return { code, out: log.mock.calls.map((x) => x.arguments.join(' ')).join('\n') };
    };

    let r = await call();
    assert.match(r.out, /worst case \$/);
    assert.match(r.out, /SKIP fid-fix-checks-off_rep0: .*--go --max-usd/);
    assert.match(r.out, /regraded 0 rows/);
    assert.strictEqual(r.code, 1);

    r = await call('--go', '--max-usd', '0.0001');
    assert.match(r.out, /nothing was sent/);
    assert.doesNotMatch(r.out, /regraded/);
    assert.strictEqual(r.code, 1);

    process.env.ANTHROPIC_API_KEY = 'test-key';
    const posts = [];
    global.fetch = batchApi([reply('j0', '{"passed":false,"quote":""}'),
      reply('j1', '{"passed":true,"quote":"The discount test passes again."}')], posts);
    r = await call('--go', '--max-usd', '1');
    assert.match(r.out, /FLIP fid-fix-checks-off_rep0 pass: recorded 1, then 1, then 0/);
    assert.match(r.out, /judge spent \$/);
    assert.strictEqual(r.code, 1);
    assert.strictEqual(posts.length, 1);
    assert.strictEqual(posts[0].requests.length, 2);
    assert.strictEqual(posts[0].requests[0].params.messages[0].content, judgePrompt(gold(c)));

    global.fetch = batchApi([reply('j0', '{"passed":false,"quote":""}'),
      JSON.stringify({ custom_id: 'j1', result: { type: 'errored', error: {} } })], []);
    r = await call('--go', '--max-usd', '1');
    assert.match(r.out, /SKIP fid-fix-checks-off_rep0: fidelity judge: errored/);
    assert.doesNotMatch(r.out, /FLIP/);
    assert.strictEqual(r.code, 1);

    // Without --regrade, --go stays an unknown flag.
    const err = t.mock.method(console, 'error', () => {});
    assert.strictEqual(await suite.cli(['--variant', 'baseline', '--flow', FLOW, '--from', 'x', '--go']), 2);
    assert.match(err.mock.calls[0].arguments[0], /unknown flag --go/);
  });
});
