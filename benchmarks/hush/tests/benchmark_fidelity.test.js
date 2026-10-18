'use strict';

// The fidelity eval (runner/fidelity.js, fidelity/cases.json). Local: no
// `claude` CLI, no cost. Each case's message in anchors/fidelity/ passes its
// grader, one broken copy per grader fails it, and an empty reply fails every
// case. The graders read hush's modules, so those parts skip on a hush
// checkout without modules/.

const { test, describe, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// The judge tests adapt a synthetic run from here; paths.js reads it on load.
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-fidelity-data-'));
process.env.BENCH_DATA_DIR = DATA;
after(() => fs.rmSync(DATA, { recursive: true, force: true }));

const { tasks, grade, hasContract, judgePrompt, parseJudge, judge, judgeBoundUsd, JUDGE_SCHEMA, JUDGE_INPUT_CHARS } = require('../runner/fidelity.js');
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

// The judge that runner/hillclimb.js asks under checks=off and detail=bare. Offline:
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
    assert.match(p, /partly failed \("3 of 4 runs pass", "3 passed, 1 failed"\)/);
    assert.match(p, /a count measures something other than a check outcome, as in "8 of 8 retries fire/);
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

  test('a message past the input bound is never sent, so the bound holds for any message', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const posts = [];
    global.fetch = batchApi([reply('j0', '{"passed":false,"quote":""}')], posts);
    const r = await judge(['short', 'x'.repeat(JUDGE_INPUT_CHARS)], { go: true, maxUsd: 1, log: () => {} });
    assert.strictEqual(posts[0].requests.length, 1);
    assert.deepStrictEqual(r.verdicts[0], { passed: false, quote: '' });
    assert.match(r.verdicts[1].error, /longer than 12000 characters; not sent/);
    // 4,000 tokens in and 4,096 out on Sonnet, at half the list price.
    assert.ok(Math.abs(judgeBoundUsd(1) - 0.02448) < 1e-9);
    const sent = await judge(['x'.repeat(JUDGE_INPUT_CHARS - judgePrompt('').length)], { log: () => {} });
    assert.ok(sent.plan.worstUsd <= judgeBoundUsd(1));
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

    process.env.ANTHROPIC_API_KEY = 'test-key';
    const err = t.mock.method(console, 'error', () => {});
    r = await call('--go', '--max-usd', '0.04');
    assert.match(r.out, /judge bound: 2 request\(s\), \$0\.05/);
    assert.match(err.mock.calls.at(-1).arguments[0], /above --max-usd 0\.04; no session started and nothing was sent/);
    assert.doesNotMatch(r.out, /regraded/);
    assert.strictEqual(r.code, 2);

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

  });

  test('every argument is checked before the judge sends anything or a run starts', async (t) => {
    const suite = require('../runner/hillclimb.js');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-fidelity-args-'));
    t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
    const FLOW = path.join(tmp, 'flow');
    const run = path.join(tmp, 'run.json');
    fs.writeFileSync(run, JSON.stringify({ finalText: gold(caseOf('checks-off')) }));
    for (const v of ['baseline', 'v-bad']) {
      fs.mkdirSync(path.join(FLOW, v), { recursive: true });
      fs.writeFileSync(path.join(FLOW, v, 'results.jsonl'), `${JSON.stringify({ prompt_id: 'fid-fix-checks-off', rep: 0,
        grade: { pass: 1, score: 1 }, meta: { task: 'fid-fix-checks-off', run } })}\n`);
    }
    const calls = [];
    global.fetch = async (url) => { calls.push(url); throw new Error('sent'); };
    t.mock.method(console, 'log', () => {});
    const err = t.mock.method(console, 'error', () => {});
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const regrade = ['--flow', FLOW, '--regrade', '--go', '--max-usd', '1'];
    for (const argv of [['--variant', 'baseline', ...regrade, '--bogus'], ['--variant', 'v-bad', ...regrade],
      ['--variant', 'baseline', ...regrade, '--arm'], ['--variant', 'baseline', '--flow', FLOW, '--regrade', '--go'],
      ['--variant', 'baseline', '--flow', FLOW, '--regrade', '--max-usd', '--go'],
      ['--variant', 'baseline', '--flow', FLOW, '--from', 'none', '--go', '--max-usd', '0'],
      ['--variant', 'baseline', '--flow', FLOW, '--smoke', '--go', '--max-usd', '1']]) {
      assert.strictEqual(await suite.cli(argv), 2, argv.join(' '));
    }
    // The same check stands in front of a live run; --from keeps a regression here from starting one.
    delete process.env.ANTHROPIC_API_KEY;
    assert.strictEqual(await suite.cli(['--variant', 'baseline', '--flow', FLOW, '--from', 'none', '--go', '--max-usd', '1']), 2);
    assert.match(err.mock.calls.at(-1).arguments[0], /ANTHROPIC_API_KEY/);
    assert.deepStrictEqual(calls, []);
  });

  test('a live run is refused before it starts when the judge bound passes the cap, and names its billing', async (t) => {
    const suite = require('../runner/hillclimb.js');
    const FLOW = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-fidelity-live-'));
    t.after(() => fs.rmSync(FLOW, { recursive: true, force: true }));
    // A stand-in for the live run, so no check here can start a session.
    const started = t.mock.method(suite, 'live', () => { throw new Error('live run stopped by the test'); });
    const log = t.mock.method(console, 'log', () => {});
    const err = t.mock.method(console, 'error', () => {});
    global.fetch = async () => { throw new Error('sent'); };
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const cli = (usd, ...extra) => suite.cli(['--variant', 'baseline', '--flow', FLOW, '--go', '--max-usd', usd, '--', ...extra]);

    // 8 strict tasks x 2 reps, each at the input bound plus 4096 tokens out.
    assert.strictEqual(await cli('0.3', '--fidelity', '--reps', '2'), 2);
    assert.ok(log.mock.calls.some((c) => /judge bound: 16 request\(s\), \$0\.39/.test(c.arguments[0])));
    assert.match(err.mock.calls.at(-1).arguments[0], /no session started/);
    assert.strictEqual(await cli('0.01', '--tasks', 'fid-fix-checks-off,fid-fix-standard', '--reps', '1'), 2);
    assert.strictEqual(started.mock.callCount(), 0);

    await assert.rejects(cli('1', '--fidelity', '--reps', '2'), /stopped by the test/);
    assert.strictEqual(started.mock.callCount(), 1);
    assert.ok(log.mock.calls.some((c) => /bill that key too; --max-usd caps only the judge batch/.test(c.arguments[0])));
  });

  test('writing a variant grades each strict row by one verdict, and files a missing one as judge_error', async (t) => {
    const suite = require('../runner/hillclimb.js');
    const tag = 'hc-fidelity-judge';
    const out = path.join(DATA, 'hush', 'results', tag);
    const FLOW = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-fidelity-flow-'));
    t.after(() => fs.rmSync(FLOW, { recursive: true, force: true }));
    fs.mkdirSync(path.join(out, 'runs'), { recursive: true });
    fs.mkdirSync(path.join(out, 'transcripts'), { recursive: true });
    // A mixed count the regex misread as a passed check, a strict case, and a case the judge never sees.
    const mixed = before(gold(caseOf('checks-off')), '`node test.js`: 3 passed, 1 failed.');
    const records = [['fid-fix-checks-off', mixed], ['fid-fix-detail-bare', gold(caseOf('detail-bare'))],
      ['fid-fix-standard', gold(caseOf('standard'))]];
    for (const [task, finalText] of records) {
      const key = `${task}__hush__r1`;
      const id = task.replace('fid-fix-', '');
      fs.writeFileSync(path.join(out, 'runs', `${key}.json`), JSON.stringify({ key, batchId: 'b', task, arm: 'hush', rep: 1,
        segment: 'noisy-output', finalText, check: grade(checkOf(caseOf(id)), finalText) }));
      fs.writeFileSync(path.join(out, 'transcripts', `${key}.jsonl`), [
        { type: 'system', subtype: 'init', model: 'sonnet' },
        { type: 'assistant', message: { model: 'claude-test', content: [{ type: 'text', text: finalText }] } },
        { type: 'result', subtype: 'success', result: finalText, duration_ms: 1000, usage: {} },
      ].map((e) => JSON.stringify(e)).join('\n'));
    }
    const read = (f) => fs.readFileSync(path.join(FLOW, 'baseline', f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const log = t.mock.method(console, 'log', () => {});
    const cli = (...extra) => suite.cli(['--variant', 'baseline', '--flow', FLOW, '--from', tag, ...extra]);

    // Without --go: the worst case is printed, nothing is sent, and the strict rows wait in errors.jsonl.
    assert.strictEqual(await cli(), 0);
    assert.ok(log.mock.calls.some((c) => /judge: 2 request\(s\).*worst case \$/.test(c.arguments[0])));
    assert.deepStrictEqual(read('results.jsonl').map((r) => r.prompt_id), ['fid-fix-standard']);
    assert.deepStrictEqual(read('errors.jsonl').map((e) => [e.prompt_id, e.failure_class]),
      [['fid-fix-checks-off', 'judge_error'], ['fid-fix-detail-bare', 'judge_error']]);
    assert.match(read('errors.jsonl')[0].error, /--go --max-usd/);

    process.env.ANTHROPIC_API_KEY = 'test-key';
    const posts = [];
    global.fetch = batchApi([reply('j0', '{"passed":false,"quote":""}'),
      JSON.stringify({ custom_id: 'j1', result: { type: 'errored', error: {} } })], posts);
    assert.strictEqual(await cli('--go', '--max-usd', '1'), 0);
    assert.strictEqual(posts.length, 1);
    assert.deepStrictEqual(posts[0].requests.map((q) => q.params.messages[0].content),
      [judgePrompt(mixed), judgePrompt(gold(caseOf('detail-bare')))]);
    const rows = read('results.jsonl');
    assert.deepStrictEqual(rows.map((r) => [r.prompt_id, r.grade.pass]), [['fid-fix-checks-off', 1], ['fid-fix-standard', 1]]);
    const errors = read('errors.jsonl');
    assert.deepStrictEqual(errors.map((e) => [e.prompt_id, e.failure_class]), [['fid-fix-detail-bare', 'judge_error']]);
    assert.match(errors[0].error, /fidelity judge: errored/);

    // A bound above the cap is refused before anything is sent or written.
    posts.length = 0;
    t.mock.method(console, 'error', () => {});
    assert.strictEqual(await cli('--go', '--max-usd', '0.04'), 2);
    assert.ok(log.mock.calls.some((c) => /judge bound: 2 request\(s\)/.test(c.arguments[0])));
    assert.strictEqual(posts.length, 0);
    assert.deepStrictEqual(read('results.jsonl'), rows);
    assert.deepStrictEqual(read('errors.jsonl'), errors);
  });
});
