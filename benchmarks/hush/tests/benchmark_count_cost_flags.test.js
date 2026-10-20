'use strict';

// The judge scripts read --concurrency, --reps and --max-usd with a bare Number().
// A non-numeric count planned NaN workers (truth.js and retention.js judged
// nothing), and --max-usd Infinity passed batch-judge.js's cap test, so the batch
// went out with no limit. Each script now refuses such a value with exit 2 before
// it reads a record or reaches a judge. No case passes --go with a real key; the
// key is a placeholder or absent, and the refusal comes first.

const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const RUNNER = path.resolve(__dirname, '..', 'runner');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-count-cost-'));
after(() => fs.rmSync(DATA, { recursive: true, force: true }));

function run(script, ...args) {
  const env = { ...process.env, BENCH_DATA_DIR: DATA, ANTHROPIC_API_KEY: 'placeholder', TYPESAFE_API_KEY: 'placeholder' };
  for (const k of ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD']) delete env[k];
  return spawnSync(process.execPath, [path.join(RUNNER, script), ...args], { encoding: 'utf8', env, timeout: 60000 });
}
const refused = (r, pattern, label) => {
  assert.strictEqual(r.status, 2, `${label}: ${r.stdout}${r.stderr}`);
  assert.match(r.stderr, pattern, label);
  assert.doesNotMatch(r.stdout, /NaN/, label);
};

describe('count flags', () => {
  const countCases = [
    ['retention.js', ['--records', 'none'], 'concurrency'],
    ['truth.js', ['--records', 'none'], 'concurrency'],
    ['judge.js', ['--tag', 'none'], 'concurrency'],
    ['judge-parity.js', ['--records', 'none', '--answerable', 'none'], 'reps'],
  ];
  for (const [script, base, name] of countCases) {
    test(`${script} refuses a non-numeric or non-positive --${name}`, () => {
      for (const bad of ['abc', '0', '1.5', '']) {
        refused(run(script, ...base, `--${name}`, bad), new RegExp(`usage: --${name} needs a whole number of at least 1`), `${script} ${bad}`);
      }
      refused(run(script, ...base, `--${name}`), new RegExp(`usage: --${name} needs a whole number of at least 1, got undefined`), `${script} no value`);
    });
  }
});

describe('--max-usd', () => {
  const capCases = [
    ['retention.js', ['--records', 'none']],
    ['answerable.js', ['--records', 'none']],
    ['judge-parity.js', ['--records', 'none', '--answerable', 'none']],
  ];
  for (const [script, base] of capCases) {
    test(`${script} refuses a cap that is not a finite number above 0`, () => {
      for (const bad of ['abc', '0', '-1', 'Infinity', '1e999', '']) {
        refused(run(script, ...base, '--go', '--max-usd', bad), /usage: --max-usd needs a positive number of USD/, `${script} ${bad}`);
      }
      refused(run(script, ...base, '--go', '--max-usd'), /usage: --max-usd needs a positive number of USD, got undefined/, `${script} no value`);
      refused(run(script, ...base, '--max-usd', '--go'), /usage: --max-usd needs a positive number of USD, got --go/, `${script} flag as value`);
    });
  }

  test('hillclimb.js refuses an Infinity cap before it counts the bound', () => {
    const r = run('hillclimb.js', '--variant', 'v1', '--flow', path.join(DATA, 'flow'), '--go', '--max-usd', 'Infinity');
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /--max-usd needs a positive number of USD, got Infinity/);
  });
});
