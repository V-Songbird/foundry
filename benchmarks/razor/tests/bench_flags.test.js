'use strict';

// The runner ignored any flag it did not recognise, so `--dry-run` -- a flag the
// sibling harness has and this one never did -- started a real billed run.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { unknownFlags, KNOWN_FLAGS } = require('../runner/run.js');

describe('benchmark CLI flags', () => {
  test('a documented flag set passes', () => {
    const argv = ['--full', '--runs', '3', '--models', 'sonnet,opus', '--effort', 'high',
      '--arms', 'baseline,razor', '--seed', '12345', '--arm-dir', 'cut=/tmp/cut'];
    assert.deepStrictEqual(unknownFlags(argv), []);
  });

  test('an unknown flag is named back', () => {
    assert.deepStrictEqual(unknownFlags(['--full', '--dry-run', '--runs', '2']), ['--dry-run']);
  });

  test('every flag the runner reads is listed as known', () => {
    for (const f of ['task', 'arms', 'full', 'counter', 'note', 'runs', 'models', 'effort',
      'workers', 'seed', 'rescore', 'arm-dir', 'rival-dir', 'rival-name', 'selftest', 'smoke', 'default']) {
      assert.ok(KNOWN_FLAGS.includes(f), `--${f} missing from KNOWN_FLAGS`);
    }
  });
});

test('--max-cost is a known flag and stops new cells once the summed cost reaches it', () => {
  const { parseMaxCost, totalCost, costCapReached } = require('../runner/run.js');
  assert.deepStrictEqual(unknownFlags(['--default', '--max-cost', '40']), []);
  assert.strictEqual(parseMaxCost(null), null);
  assert.strictEqual(parseMaxCost('40'), 40);
  for (const bad of ['0', '-3', 'abc', '']) assert.ok(Number.isNaN(parseMaxCost(bad)), `${bad} is refused`);
  const done = [{ cost: 0.5 }, { cost: 1.25 }, { error: 'x' }];
  assert.strictEqual(totalCost(done), 1.75);
  assert.strictEqual(costCapReached(done, null), false, 'no cap never stops');
  assert.strictEqual(costCapReached(done, 1.76), false);
  assert.strictEqual(costCapReached(done, 1.75), true, 'reaching the cap stops');
  assert.strictEqual(costCapReached(done, 1), true);
});

// Both refusals run with BENCH_CONFIG_DIR removed and an empty PATH, so even a
// regression stops before a model session can start.
test('--max-cost refuses a non-positive or missing value before any session starts', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const emptyBin = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-maxcost-bin-'));
  try {
    const env = { ...process.env, PATH: emptyBin };
    delete env.BENCH_CONFIG_DIR;
    for (const args of [['--max-cost', '0'], ['--max-cost']]) {
      const run = spawnSync(process.execPath, [path.resolve(__dirname, '../runner/run.js'), '--smoke', ...args],
        { encoding: 'utf8', timeout: 30000, env });
      assert.ifError(run.error);
      assert.equal(run.status, 1, args.join(' ') + run.stdout + run.stderr);
      assert.match(run.stderr, /--max-cost wants a positive number/);
    }
  } finally {
    fs.rmSync(emptyBin, { recursive: true, force: true });
  }
});

// A fake claude first on PATH bills USD 0.6 per call, so with one worker and a
// cap of 1 the second cell is the last one started: the third is never begun.
test('--max-cost stops starting cells and results.json records why', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-max-cost-'));
  try {
    const bin = path.join(fixture, 'bin');
    const runs = path.join(fixture, 'runs');
    const config = path.join(fixture, 'config');
    fs.mkdirSync(bin);
    fs.mkdirSync(config);
    fs.writeFileSync(path.join(config, '.claude.json'), '{}');
    const stream = [
      { type: 'system', subtype: 'init', model: 'claude-test-model', session_id: 's1' },
      { type: 'result', subtype: 'success', is_error: false, result: 'done', total_cost_usd: 0.6, num_turns: 1,
        duration_ms: 10, session_id: 's1', usage: { input_tokens: 1, output_tokens: 1 } },
    ].map((o) => JSON.stringify(o)).join('\n') + '\n';
    const fake = path.join(bin, 'fake-claude.js');
    fs.writeFileSync(fake, `if (process.argv.includes('--version')) { console.log('0.0.0 (fake)'); return; }\n`
      + `process.stdout.write(${JSON.stringify(stream)});\n`);
    fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
    fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`, { mode: 0o755 });
    const env = { ...process.env, RAZOR_BENCH_RUNS: runs, RAZOR_BENCH_ALLOW_TEMP: '1', BENCH_CONFIG_DIR: config };
    for (const k of ['CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
    const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
    env[pathKey] = `${bin}${path.delimiter}${env[pathKey] || ''}`;
    const r = spawnSync(process.execPath, [path.resolve(__dirname, '../runner/run.js'),
      '--task', 'dep-slug', '--arms', 'baseline', '--runs', '3', '--workers', '1', '--max-cost', '1'],
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', env, timeout: 120000 });
    assert.ifError(r.error);
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /cost cap USD 1 reached at USD 1.2000, so 1 cells were not started/);
    const [stamp] = fs.readdirSync(runs);
    const res = JSON.parse(fs.readFileSync(path.join(runs, stamp, 'results.json'), 'utf8'));
    assert.strictEqual(res.results.length, 2);
    assert.strictEqual(res.max_cost, 1);
    assert.strictEqual(res.cost_total, 1.2);
    assert.match(res.stopped, /cost cap USD 1 reached/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a billed failed cell still counts toward the cost cap', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { scoreCell, totalCost } = require('../runner/run.js');
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-failed-cell-'));
  try {
    fs.writeFileSync(path.join(ws, '_claude.json'), JSON.stringify({ is_error: true, result: 'max turns', total_cost_usd: 0.7 }));
    const cell = await scoreCell('dep-slug', 'baseline', 'sonnet', ws);
    assert.match(cell.error, /api_error/);
    assert.strictEqual(totalCost([cell]), 0.7);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test('--models opus55 resolves to Claude Opus 5.5 and the older values keep their ids', () => {
  const { MODELS } = require('../runner/run.js');
  assert.strictEqual(MODELS.opus55, 'claude-opus-5-5');
  assert.strictEqual(MODELS.sonnet, 'claude-sonnet-5');
  assert.strictEqual(MODELS.opus, 'claude-opus-5');
  assert.strictEqual(MODELS.opus5, undefined, 'an unknown alias is not mapped');
  assert.deepStrictEqual(unknownFlags(['--models', 'opus55']), []);
});

test('the Claude live runner refuses native Codex hooks before starting a model session', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  // A Codex-only checkout: its hooks/hooks.json registers the Codex hook.
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-host-'));
  const results = path.join(fixture, 'must-not-be-created');
  fs.mkdirSync(path.join(fixture, '.codex-plugin'));
  fs.writeFileSync(path.join(fixture, '.codex-plugin', 'plugin.json'), '{"name":"razor"}');
  fs.mkdirSync(path.join(fixture, 'hooks'));
  fs.writeFileSync(path.join(fixture, 'hooks', 'hooks.json'),
    '{"hooks":{"PreToolUse":[{"hooks":[{"type":"command","command":"node ./hooks/codex-hook.js"}]}]}}');
  try {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../runner/run.js'), '--smoke'], {
      encoding: 'utf8', timeout: 30000,
      env: { ...process.env, RAZOR_DIR: fixture, RAZOR_BENCH_RUNS: results },
    });
    assert.ifError(run.error);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Claude benchmark runner; Codex hook arms cannot run here/);
    assert.equal(fs.existsSync(results), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

// razor exempts the system temp dir from its new-file check, so a live run at
// the default temp location could never measure it. BENCH_CONFIG_DIR is removed
// and PATH is empty, so even a regression stops before a model session starts.
test('a live run refuses temp run folders unless RAZOR_BENCH_ALLOW_TEMP opts in', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { spawnSync } = require('child_process');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-temp-'));
  const razor = path.join(fixture, 'razor');
  fs.mkdirSync(path.join(razor, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(razor, '.claude-plugin', 'plugin.json'), '{"name":"razor"}');
  const emptyBin = path.join(fixture, 'bin');
  fs.mkdirSync(emptyBin);
  const smoke = (extra) => {
    const env = { ...process.env, RAZOR_DIR: razor, PATH: emptyBin, ...extra };
    delete env.BENCH_CONFIG_DIR;
    if (!extra.RAZOR_BENCH_RUNS) delete env.RAZOR_BENCH_RUNS;
    if (!extra.RAZOR_BENCH_ALLOW_TEMP) delete env.RAZOR_BENCH_ALLOW_TEMP;
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../runner/run.js'), '--smoke'], {
      encoding: 'utf8', timeout: 60000, env,
    });
    assert.ifError(run.error);
    return run;
  };
  try {
    const byDefault = smoke({});
    assert.equal(byDefault.status, 2, byDefault.stdout + byDefault.stderr);
    assert.match(byDefault.stderr, /Run folder .* razor's new-file check never speaks/);
    assert.doesNotMatch(byDefault.stderr, /Set BENCH_CONFIG_DIR/);

    // hillclimb.js sets RAZOR_BENCH_RUNS to a folder under the temp default.
    const runs = path.join(fixture, 'runs');
    const chosen = smoke({ RAZOR_BENCH_RUNS: runs });
    assert.equal(chosen.status, 2, chosen.stdout + chosen.stderr);
    assert.match(chosen.stderr, /RAZOR_BENCH_ALLOW_TEMP=1/);
    assert.doesNotMatch(chosen.stderr, /Set BENCH_CONFIG_DIR/);

    const allowed = smoke({ RAZOR_BENCH_RUNS: runs, RAZOR_BENCH_ALLOW_TEMP: '1' });
    assert.match(allowed.stderr, /warning: Run folder .* never speaks/);
    assert.match(allowed.stderr, /Set BENCH_CONFIG_DIR/, 'an opted-in temp folder is not refused');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('offline instruments work from the razor package', () => {
  const path = require('path');
  const { spawnSync } = require('child_process');
  const root = process.env.RAZOR_DIR ? path.resolve(process.env.RAZOR_DIR) : require('../../paths.js').pluginDir('razor');
  const run = spawnSync(process.execPath, [path.resolve(__dirname, '../runner/run.js'), '--selftest'], {
    encoding: 'utf8', timeout: 30000,
    env: { ...process.env, RAZOR_DIR: root },
  });
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /selftest: all instruments valid/);
});
