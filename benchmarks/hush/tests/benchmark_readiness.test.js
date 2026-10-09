'use strict';

// The Hush 2.0 readiness gate, under test. A gate nobody can fail proves
// nothing, so a conforming batch must pass and each broken point must flip
// that point, and only that point, with a message that names it.

const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const gate = require('../scripts/readiness-gate.js');
const { writeRecord, readRecords } = require('../runner/records.js');
const { buildClaims } = require('../runner/publish.js');

const GATE = path.join(__dirname, '..', 'scripts', 'readiness-gate.js');
const BATCH = 'fixture-0001';

const scratch = [];
after(() => {
  for (const dir of scratch) {
    // Records are written read-only, so unlock them before removing the folder.
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f);
        else fs.chmodSync(f, 0o666);
      }
    };
    try { walk(dir); } catch { /* already gone */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Final messages. HUSH keeps every cap; BASE breaks the sentence cap once and
// carries one semicolon and one aside in four sentences.
const HUSH_TEXT = '**The suite passes again.**\n\nThe tier table had one stale row. I fixed it in `src/tiers.js`.\n\n'
  + 'I ran `node run-tests.js` after the change. All tests pass.\n\nNext: run `node run-tests.js` yourself.';
const BASE_TEXT = 'I looked into the failing suite and found that the tier table in `src/tiers.js` had a stale row for '
  + 'premium customers; that row billed them at the standard rate (since the last migration).\n\n'
  + 'I fixed the row. All tests pass now.\n\nYou can run the suite again whenever you like.';
// Every sentence over 12 words, every block within 40.
const LONG_SENTENCES = '**The suite passes again after one stale row in the tier table was fixed today.**\n\n'
  + 'The tier table in `src/tiers.js` billed premium customers at the standard rate since last week.\n\n'
  + 'Next: run `node run-tests.js` yourself and read the one changed row in the tier table.';
// Short sentences, one block of 50 words.
const LONG_BLOCK = '**The suite passes again.** The tier table had one stale row. It billed premium customers wrongly. '
  + 'I fixed that row today. The fix is one line long. I ran the full suite after it. All tests pass now. '
  + 'I did not test a real invoice. Next: run `node run-tests.js` yourself.';
// A semicolon in every sentence.
const SEMICOLONS = '**The suite passes; one row was stale.**\n\nThe tier table was wrong; I fixed it.\n\nNext: run the suite; read the change.';

const TASKS = [['noisy-build', 'noisy-output'], ['rename', 'search-heavy']];

/** Two tasks, two arms, two reps. The noisy job's baseline mean cost is $0.42. */
function synthRuns() {
  const cost = { 'noisy-build': { baseline: [0.40, 0.44], hush: [0.30, 0.32] }, rename: { baseline: [0.20, 0.24], hush: [0.21, 0.25] } };
  const out = [];
  let orderIndex = 0;
  for (const [task, segment] of TASKS) {
    for (const arm of ['baseline', 'hush']) {
      cost[task][arm].forEach((costUsd, i) => {
        const hush = arm === 'hush';
        out.push({
          key: `${task}__${arm}__r${i + 1}`,
          batchId: BATCH, seed: '4242', orderIndex: orderIndex++, task, segment, arm, rep: i + 1,
          model: 'opus', modelId: 'claude-opus-5-5', check: { pass: true },
          outputStyle: hush ? 'hush:Hush' : 'default',
          costUsd, usage: { output_tokens: 900 }, contextTraffic: 90000, apiCalls: 10,
          toolResultChars: segment === 'noisy-output' && hush ? 30000 : 90000,
          narrationWords: hush ? 0 : 6, narrationTexts: hush ? [] : ['Let me look.', 'Now checking.'],
          finalText: hush ? HUSH_TEXT : BASE_TEXT, wallMs: 40000,
        });
      });
    }
  }
  return out;
}

const STYLE = 'One fact per sentence. 12 words per sentence, tops.\n\nBlank line between blocks. 40 words per block, tops.\n';
const README = `# hush\n\nBatch \`${BATCH}\` on model id \`claude-opus-5-5\`: a session without the plugin averaged **$0.42** on the noisy job.\n`;

// No inherited GIT_DIR or GIT_INDEX_FILE may point the fixture at a real repository.
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const git = (dir, args, env = gitEnv) => spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', env }).stdout.trim();

/**
 * Commits everything in `dir` with plumbing, so no commit hook runs, on top of
 * the current HEAD when there is one, and returns the commit.
 */
function commitAll(dir) {
  git(dir, ['init', '-q']);
  git(dir, ['add', '-A']);
  const tree = git(dir, ['write-tree']);
  const parent = git(dir, ['rev-parse', '--verify', '-q', 'HEAD']);
  const commit = git(dir, ['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', 'release'],
    { ...gitEnv, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' });
  git(dir, ['update-ref', 'HEAD', commit]);
  return commit;
}

const PREVIOUS = 'previous-0000';

/**
 * A Foundry-shaped folder: <root>/hush is the plugin checkout, committed as
 * the measured build after one commit per earlier release in `edit.history`
 * (default 1.9.0), <root>/records/<batch> the batch, and
 * <root>/records/previous-0000 the previous release's batch. `edit` changes the
 * runs, the manifest (null writes none) or the plugin files. `edit.later`
 * changes the plugin folder in a commit after the measured one,
 * `edit.checkout` changes it without committing, and `edit.git: false` leaves
 * it outside Git. `edit.previous` changes the previous batch's manifest (null
 * gives the gate no previous batch), and `edit.previousRuns` its runs.
 */
function fixture(edit = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-readiness-'));
  scratch.push(root);
  const runs = (edit.runs || ((r) => r))(synthRuns());

  const pluginDir = path.join(root, 'hush');
  for (const dir of ['output-styles', '.claude-plugin', 'docs', 'assets']) fs.mkdirSync(path.join(pluginDir, dir), { recursive: true });
  const manifestFile = path.join(pluginDir, '.claude-plugin', 'plugin.json');
  if (edit.git !== false) {
    for (const version of edit.history || ['1.9.0']) {
      fs.writeFileSync(manifestFile, JSON.stringify({ name: 'hush', version }));
      commitAll(pluginDir);
    }
  }
  fs.writeFileSync(path.join(pluginDir, 'output-styles', 'hush.md'), STYLE);
  fs.writeFileSync(manifestFile, JSON.stringify({ name: 'hush', version: edit.version || '2.0.0' }));
  fs.writeFileSync(path.join(pluginDir, 'README.md'), edit.readme === undefined ? README : edit.readme);
  fs.writeFileSync(path.join(pluginDir, 'docs', 'changelog.md'), '# Changelog\n');
  fs.writeFileSync(path.join(pluginDir, 'assets', 'banner.svg'), '<svg/>\n');
  const head = edit.git === false ? 'c4f1469a9d6eb9db7b2c716347d0202513066bf5' : commitAll(pluginDir);
  if (edit.later) {
    edit.later(pluginDir);
    commitAll(pluginDir);
  }
  if (edit.checkout) edit.checkout(pluginDir);

  const previousDir = path.join(root, 'records', PREVIOUS);
  const previous = { batchId: PREVIOUS, seed: '4141', model: 'opus', hush: { version: '1.9.0' } };
  if (edit.previous) edit.previous(previous);
  const previousRuns = (edit.previousRuns || ((r) => r))(synthRuns().filter((r) => r.arm === 'hush'));
  for (const r of previousRuns) writeRecord(previousDir, r.key, { ...r, batchId: PREVIOUS, seed: '4141' });
  writeRecord(previousDir, 'batch', previous);

  const manifest = {
    batchId: BATCH, seed: '4242', model: 'opus', reps: 2, arms: ['baseline', 'hush'],
    tasks: TASKS.map(([id, segment]) => ({ id, segment })),
    order: synthRuns().map((r) => r.key),
    hush: { head, dirty: false, version: '2.0.0' },
  };
  if (edit.manifest) edit.manifest(manifest);

  const recordsDir = path.join(root, 'records', BATCH);
  for (const r of runs) writeRecord(recordsDir, r.key, r);
  // writeRecord's sanitizer keeps the 40-character commit under hush.head.
  if (edit.manifest !== null) writeRecord(recordsDir, 'batch', manifest);

  if (edit.published !== 'none') {
    const { runs: kept, batches } = readRecords(recordsDir);
    let markdown = null;
    try { markdown = buildClaims(kept, batches).markdown; } catch { /* an incomplete batch publishes nothing */ }
    if (markdown !== null) {
      fs.mkdirSync(path.join(recordsDir, 'published'));
      fs.writeFileSync(path.join(recordsDir, 'published', 'claims.md'), markdown + (edit.published === 'stale' ? '\nedited by hand\n' : ''));
    }
  }
  return { root, recordsDir, pluginDir, previousDir: edit.previous === null ? null : previousDir };
}

const run = (f) => gate.runGate({ recordsDir: f.recordsDir, previousDir: f.previousDir, pluginDir: f.pluginDir });
const unmetPoints = (report) => report.results.filter((r) => !r.met).map((r) => r.n);
const point = (report, n) => report.results.find((r) => r.n === n);
const onHush = (key, change) => (runs) => runs.map((r) => (r.key === key ? change({ ...r }) : r));
const allHush = (change) => (runs) => runs.map((r) => (r.arm === 'hush' ? change({ ...r }) : r));
// Both arms of the batch get the same text, so hush ties the no-plugin arm and
// only the previous release, which keeps HUSH_TEXT, can tell it regressed.
const allRuns = (finalText) => (runs) => runs.map((r) => ({ ...r, finalText }));

describe('the readiness gate', () => {
  test('passes a conforming batch on every point', () => {
    const report = run(fixture());
    assert.deepStrictEqual(report.results.filter((r) => !r.met).map((r) => `${r.n}: ${r.missing}`), []);
    assert.strictEqual(report.ok, true);
    assert.deepStrictEqual(report.results.map((r) => r.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    for (const r of report.results) assert.ok(r.proof, `point ${r.n} names no proof`);
    assert.match(gate.render(report), /READY TO PUBLISH: every point met\./);
  });

  const BREAKS = [
    ['a record has no seed', { runs: onHush('rename__hush__r1', (r) => { delete r.seed; return r; }) }, [1], /carry no batch, seed, segment or model id: rename__hush__r1/],
    ['a planned run has no record', { manifest: (m) => m.order.push('rename__hush__r3') }, [1, 11], /is incomplete: 1 of 9 planned runs have no record/],
    ['a record has no model id', { runs: onHush('noisy-build__hush__r1', (r) => { delete r.modelId; return r; }) }, [1, 6, 7, 8], /carry no batch, seed, segment or model id: noisy-build__hush__r1/],
    ['the batch has no batch.json', { manifest: null }, [1, 2, 6, 7, 8, 11], /expected one batch\.json, found 0/],
    ['batch.json names another batch', { manifest: (m) => { m.batchId = 'other-0002'; } }, [1, 11], /batch\.json names other-0002, the records name fixture-0001/],
    ['a run errored', { runs: onHush('rename__hush__r2', (r) => ({ key: r.key, batchId: r.batchId, seed: r.seed, task: r.task, segment: r.segment, arm: r.arm, rep: r.rep, model: r.model, error: 'Error: killed' })) }, [1], /1 run\(s\) errored with no scored output: rename__hush__r2/],
    ['the hush checkout was dirty', { manifest: (m) => { m.hush.dirty = true; } }, [2], /uncommitted changes/],
    ['the batch predates the sanitizer keeping the commit', { manifest: (m) => { m.hush.head = '<redacted-secret>'; } }, [2], /lost the hush commit to the record sanitizer, so the batch predates the runner keeping it/],
    ['the batch measured another version', { version: '2.1.0' }, [2], /measured hush 2\.0\.0, the checkout is 2\.1\.0/],
    ['batch.json lists no planned runs', { manifest: (m) => { delete m.order; } }, [1, 11], /lists no planned runs \(order is missing or empty\)/],
    ['batch.json plans an empty order', { manifest: (m) => { m.order = []; } }, [1, 11], /lists no planned runs \(order is missing or empty\)/],
    ['the voice changed in a commit after the measured one', { later: (dir) => fs.appendFileSync(path.join(dir, 'output-styles', 'hush.md'), 'Lead with the result.\n') }, [2], /hush changed output-styles\/hush\.md after the measured commit/],
    ['a later commit changed the voice and the checkout reverts it uncommitted', {
      later: (dir) => fs.appendFileSync(path.join(dir, 'output-styles', 'hush.md'), 'Lead with the result.\n'),
      checkout: (dir) => fs.writeFileSync(path.join(dir, 'output-styles', 'hush.md'), STYLE),
    }, [2], /uncommitted or untracked changes.*hush changed output-styles\/hush\.md after the measured commit/],
    ['the checkout holds an untracked code file', { checkout: (dir) => { fs.mkdirSync(path.join(dir, 'hooks')); fs.writeFileSync(path.join(dir, 'hooks', 'extra.js'), '// new\n'); } }, [2], /uncommitted or untracked changes/],
    ['the checkout edits a README uncommitted', { checkout: (dir) => fs.appendFileSync(path.join(dir, 'README.md'), '\nDraft.\n') }, [2], /uncommitted or untracked changes/],
    ['the checkout does not hold the measured commit', { manifest: (m) => { m.hush.head = 'f'.repeat(40); } }, [2], /does not hold the measured commit f{40}/],
    ['the checkout is not a Git checkout', { git: false }, [2, 6, 7, 8], /not its own Git checkout/],
    ['a hush session ran without the voice', { runs: onHush('noisy-build__hush__r2', (r) => ({ ...r, outputStyle: 'default' })) }, [3], /do not: noisy-build__hush__r2/],
    ['a hush job failed its check', { runs: onHush('rename__hush__r1', (r) => ({ ...r, check: { pass: false } })) }, [4], /do not: rename__hush__r1/],
    ['a hush session broke in twice', { runs: onHush('noisy-build__hush__r1', (r) => ({ ...r, narrationTexts: ['Looking.', 'Still looking.'] })) }, [5], /do not: noisy-build__hush__r1/],
    ['hush sentences run long', { runs: allHush((r) => ({ ...r, finalText: LONG_SENTENCES })) }, [6], /hush has a higher share than baseline/],
    ['hush blocks run long', { runs: allHush((r) => ({ ...r, finalText: LONG_BLOCK })) }, [7], /hush has a higher share than baseline/],
    ['hush sentences carry semicolons', { runs: allHush((r) => ({ ...r, finalText: SEMICOLONS })) }, [8], /hush has a higher share than baseline/],
    ['hush sentences run longer than in the previous release', { runs: allRuns(LONG_SENTENCES) }, [6], /hush 2\.0\.0 has a higher share than the previous release 1\.9\.0/],
    ['hush blocks run longer than in the previous release', { runs: allRuns(LONG_BLOCK) }, [7], /hush 2\.0\.0 has a higher share than the previous release 1\.9\.0/],
    ['hush carries more semicolons than in the previous release', { runs: allRuns(SEMICOLONS) }, [8], /hush 2\.0\.0 has a higher share than the previous release 1\.9\.0/],
    ['no previous release batch is given', { previous: null }, [6, 7, 8], /no previous release batch to compare: pass --previous/],
    ['the previous batch measured the same release', { previous: (m) => { m.hush.version = '2.0.0'; } }, [6, 7, 8], /measured hush 2\.0\.0, not 1\.9\.0, the release before 2\.0\.0/],
    ['the previous batch records no hush version', { previous: (m) => { delete m.hush; } }, [6, 7, 8], /measured hush undefined, not 1\.9\.0, the release before 2\.0\.0/],
    ['the previous batch measured an older release than the last one', { history: ['1.9.0', '1.12.1'] }, [6, 7, 8], /measured hush 1\.9\.0, not 1\.12\.1, the release before 2\.0\.0/],
    ['the checkout\'s history holds no earlier release', { history: [] }, [6, 7, 8], /manifest history names no release before 2\.0\.0/],
    ['the previous batch ran on another model', { previous: (m) => { m.model = 'sonnet'; } }, [6, 7, 8], /ran on sonnet, this batch on opus/],
    ['the previous batch ran on another model id under the same alias', { previousRuns: (runs) => runs.map((r) => ({ ...r, modelId: 'claude-opus-4-1' })) }, [6, 7, 8], /the previous batch's hush runs used claude-opus-4-1, this batch's claude-opus-5-5/],
    ['the previous batch records no model id', { previousRuns: (runs) => runs.map(({ modelId, ...r }) => r) }, [6, 7, 8], /the previous batch has hush runs with no model id/],
    ['the previous batch has no hush runs', { previousRuns: () => [] }, [6, 7, 8], /previous release batch has no usable hush runs/],
    ['a hush answer opens with a preamble', { runs: onHush('rename__hush__r2', (r) => ({ ...r, finalText: `Let me explain. ${HUSH_TEXT}` })) }, [9], /do not: rename__hush__r2/],
    ['hush carries more noisy output', { runs: allHush((r) => ({ ...r, toolResultChars: 120000 })) }, [10], /does not carry less tool output per call/],
    ['hush carries exactly as much noisy output', { runs: allHush((r) => ({ ...r, toolResultChars: 90000 })) }, [10], /does not carry less tool output per call/],
    ['the published claims were edited', { published: 'stale' }, [11], /claims\.md is stale/],
    ['the claims were never published', { published: 'none' }, [11], /claims\.md was never generated/],
    ['the README prints a figure no record produces', { readme: README.replace('$0.42', '$9.99') }, [11], /1 README figure\(s\) no record produces: \$9\.99/],
    ['the README prints whole and thousands dollar figures no record produces', { readme: README.replace('$0.42', '$3 and $1,204.50') }, [11], /2 README figure\(s\) no record produces: \$3, \$1,204\.50/],
    ['the README names another model id', { readme: README.replace('claude-opus-5-5', 'claude-opus-5') }, [11], /README\.md does not name model id\(s\) claude-opus-5-5 that the batch's records carry/],
    ['the README names the model id only as a prefix of another', { readme: README.replace('claude-opus-5-5', 'claude-opus-5-5-preview') }, [11], /does not name model id\(s\) claude-opus-5-5/],
    ['the README prints a figure after a fence closed by a longer run', { readme: `${README}\n\`\`\`\necho $1\n\`\`\`\`\nprose $0.42 and \`x\` then $9.99 \`y\`\n` }, [11], /1 README figure\(s\) no record produces: \$9\.99/],
    ['the README prints a figure after a stray backtick and a blank line', { readme: `${README}\nPress the \` key.\n\nThen \`x\` costs $9.99 and \`y\` too.\n` }, [11], /1 README figure\(s\) no record produces: \$9\.99/],
    ['the README names another batch', { readme: '# hush\n\nBatch `older-0000` averaged **$0.42**.\n' }, [11], /README\.md does not name batch fixture-0001/],
  ];

  for (const [name, edit, points, message] of BREAKS) {
    test(`fails point ${points.join(' and ')} when ${name}`, () => {
      const report = run(fixture(edit));
      assert.deepStrictEqual(unmetPoints(report), points);
      assert.match(point(report, points[0]).missing, message);
      assert.match(gate.render(report), new RegExp(`NOT READY TO PUBLISH: point\\(s\\) ${points.join(', ')} unmet\\.`));
    });
  }

  test('matches a dollar figure at its own precision, with thousands separators', () => {
    assert.strictEqual(gate.figureIsGenerated('$1,204.50', [1204.5]), true);
    assert.strictEqual(gate.figureIsGenerated('$3', [2.6]), true);
    assert.strictEqual(gate.figureIsGenerated('$3', [2.4]), false);
  });

  test('passes when a later commit changed only the README, docs and assets', () => {
    const report = run(fixture({ later: (dir) => {
      fs.appendFileSync(path.join(dir, 'README.md'), '\nMeasured on Opus.\n');
      fs.appendFileSync(path.join(dir, 'docs', 'changelog.md'), '\n## 2.0.0\n');
      fs.writeFileSync(path.join(dir, 'assets', 'banner.svg'), '<svg width="1"/>\n');
    } }));
    assert.deepStrictEqual(report.results.filter((r) => !r.met).map((r) => `${r.n}: ${r.missing}`), []);
    assert.ok(point(report, 2).evidence.includes('3 file(s) changed from the measured commit to HEAD, 0 outside README.md, docs/ and assets/'));
  });

  test('passes when a later commit adds a docs file with a non-ASCII name', () => {
    const report = run(fixture({ later: (dir) => fs.writeFileSync(path.join(dir, 'docs', 'guía.md'), '# Guía\n') }));
    assert.deepStrictEqual(report.results.filter((r) => !r.met).map((r) => `${r.n}: ${r.missing}`), []);
    assert.ok(point(report, 2).evidence.includes('1 file(s) changed from the measured commit to HEAD, 0 outside README.md, docs/ and assets/'));
  });

  test('ignores dollar signs inside fenced and inline code in the README', () => {
    const readme = `${README}\n\`\`\`bash\nawk '{print $1}' build.log\n\`\`\`\n\nThen run \`sed 's/a/$2/' x\` or \`\`echo $3,000\`\`.\n`;
    const report = run(fixture({ readme }));
    assert.deepStrictEqual(report.results.filter((r) => !r.met).map((r) => `${r.n}: ${r.missing}`), []);
    assert.match(point(report, 11).evidence.join('\n'), /prints 1 dollar figure\(s\) outside code/);
  });

  test('treats an unclosed fence in the README as code to the end', () => {
    const report = run(fixture({ readme: `${README}\n\`\`\`bash\nawk {print $1}\n` }));
    assert.deepStrictEqual(report.results.filter((r) => !r.met).map((r) => `${r.n}: ${r.missing}`), []);
    assert.match(point(report, 11).evidence.join('\n'), /prints 1 dollar figure\(s\) outside code/);
  });

  test('counts no dollar figure inside a span a stray backtick opens on the same line', () => {
    const report = run(fixture({ readme: `${README}\nPress the \` key, then $9.99 \`x and more.\n` }));
    assert.deepStrictEqual(report.results.filter((r) => !r.met).map((r) => `${r.n}: ${r.missing}`), []);
    assert.match(point(report, 11).evidence.join('\n'), /prints 1 dollar figure\(s\) outside code/);
  });

  test('reports each batch.json problem as one gap on point 1', () => {
    const cases = [
      [(m) => { delete m.order; }, /lists no planned runs/],
      [(m) => { m.order = []; }, /lists no planned runs/],
      [null, /expected one batch\.json, found 0/],
      [(m) => { m.batchId = 'other-0002'; }, /batch\.json names other-0002/],
    ];
    for (const [manifest, cause] of cases) {
      const missing = point(run(fixture({ manifest })), 1).missing;
      assert.match(missing, cause);
      assert.strictEqual(missing.split('; ').length, 1, missing);
    }
  });

  test('fails point 2 when a later commit changes a presentation file and a code file', () => {
    const report = run(fixture({ later: (dir) => {
      fs.appendFileSync(path.join(dir, 'docs', 'changelog.md'), '\n## 2.0.1\n');
      fs.writeFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'hush', version: '2.0.0', description: 'x' }));
    } }));
    assert.deepStrictEqual(unmetPoints(report), [2]);
    assert.match(point(report, 2).missing, /hush changed \.claude-plugin\/plugin\.json after the measured commit/);
  });

  test('fails point 1 naming the arm a batch lacks', () => {
    const report = run(fixture({
      runs: (runs) => runs.filter((r) => r.arm !== 'baseline'),
      manifest: (m) => { m.arms = ['hush']; m.order = m.order.filter((k) => !k.includes('__baseline__')); },
    }));
    assert.ok(unmetPoints(report).includes(1));
    assert.match(point(report, 1).missing, /the batch has no baseline arm/);
    for (const n of [6, 7, 8]) assert.match(point(report, n).missing, /needs a hush and a baseline arm/);
    assert.match(point(report, 10).missing, /no hush and baseline runs on the noisy-output segment/);
  });

  test('fails every point closed when the hush checkout cannot be read', () => {
    const f = fixture();
    const report = gate.runGate({ recordsDir: f.recordsDir, pluginDir: path.join(f.root, 'missing') });
    assert.deepStrictEqual(unmetPoints(report), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    for (const r of report.results) assert.match(r.missing, /the check itself failed: the hush checkout cannot be read/);
  });

  test('fails every point closed when a record was edited after it was written', () => {
    const f = fixture();
    const file = path.join(f.recordsDir, 'rename__hush__r1.json');
    const edited = JSON.parse(fs.readFileSync(file, 'utf8'));
    edited.costUsd = 0.01;
    fs.chmodSync(file, 0o666);
    fs.writeFileSync(file, JSON.stringify(edited));
    const report = run(f);
    assert.deepStrictEqual(unmetPoints(report), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    assert.match(point(report, 1).missing, /hash mismatch/);
  });

  test('exits 0 on a ready batch, 1 naming each failed point, and 2 without both batches', () => {
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    delete env.NODE_CHANNEL_FD;
    const cli = (f) => spawnSync(process.execPath, [GATE, '--records', f.recordsDir, '--previous', f.previousDir],
      { encoding: 'utf8', env: { ...env, BENCH_PLUGINS_DIR: f.root } });

    const ready = cli(fixture());
    assert.strictEqual(ready.status, 0, ready.stdout + ready.stderr);
    assert.match(ready.stdout, /READY TO PUBLISH: every point met\./);

    const broken = cli(fixture({ runs: onHush('rename__hush__r1', (r) => ({ ...r, check: { pass: false } })), version: '2.1.0' }));
    assert.strictEqual(broken.status, 1, broken.stdout + broken.stderr);
    assert.match(broken.stdout, /\[NOT MET\] 2\. The batch measured one clean hush build/);
    assert.match(broken.stdout, /\[NOT MET\] 4\. Correctness comes before silence/);
    assert.match(broken.stdout, /NOT READY TO PUBLISH: point\(s\) 2, 4 unmet\./);

    for (const args of [[], ['--records', 'x']]) {
      const usage = spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8', env });
      assert.strictEqual(usage.status, 2);
      assert.match(usage.stderr, /Usage: node scripts\/readiness-gate\.js --records <batch folder> --previous <batch folder>/);
    }
  });
});
