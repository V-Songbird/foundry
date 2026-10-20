'use strict';

// The Hush benchmark's scripts that read their own flags refuse a value flag with no value, or with
// another flag as its value, with a usage line naming it, as flags.js does, and keep the
// exit code their other failures already had. Every case stops at the flag check, so no
// session starts and nothing is written.

const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { keylessEnv } = require('../../test-env.js');

const BENCH = path.resolve(__dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'local-flag-readers-'));
after(() => fs.rmSync(DATA, { recursive: true, force: true }));

function run(script, ...args) {
  const env = keylessEnv({ BENCH_DATA_DIR: DATA });
  return spawnSync(process.execPath, [path.join(BENCH, script), ...args],
    { cwd: BENCH, encoding: 'utf8', env, timeout: 60000 });
}

describe('exit 2 readers', () => {
  const cases = [
    ['hush/runner/judge.js', '--rubric'],
    ['hush/runner/retold.js', '--records'],
    // Repeatable and positional readers: a trailing flag was skipped, or the next flag was taken as its value.
    ['hush/runner/criteria.js', '--tag'],
    ['hush/runner/duel.js', '--tag'],
    ['hush/runner/pool.js', '--tag'],
    ['hush/runner/shape.js', '--tag'],
    ['hush/runner/conformance.js', '--json'],
    ['hush/runner/judge-parity.js', '--records'],
    ['hush/scripts/readiness-gate.js', '--records'],
    ['hush/scripts/readiness-gate.js', '--previous'],
  ];
  for (const [script, ...args] of cases) {
    const name = args[args.length - 1];
    test(`${script} refuses ${name} with no value`, () => {
      const r = run(script, ...args);
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, new RegExp(`usage: ${name} needs a value but none was given`));
    });
    test(`${script} refuses ${name} followed by another flag`, () => {
      const r = run(script, ...args, '--go');
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, new RegExp(`usage: ${name} needs a value, got --go`));
    });
  }
});

describe('an empty --tag', () => {
  // An empty tag would put the run's directory at the results root itself.
  test('hush/runner/run.js refuses --tag "", exit 2', () => {
    const r = run('hush/runner/run.js', '--dry-run', '--tag', '');
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /usage: --tag needs a value, got nothing/);
  });
});

describe('readiness-gate.js', () => {
  // Four arguments passed the old length check, with '--previous' read as the records folder.
  test('refuses --records followed by --previous, exit 2', () => {
    const r = run('hush/scripts/readiness-gate.js', '--records', '--previous', 'a', 'b');
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /usage: --records needs a value, got --previous/);
  });
});

describe('whole-number --concurrency', () => {
  for (const [script, args] of [['hush/runner/judge.js', []], ['hush/runner/criteria.js', ['--tag', 'x']]]) {
    for (const [value, got] of [['abc', 'abc'], ['1.5', '1.5'], ['0', '0']]) {
      test(`${script} refuses --concurrency ${value}, exit 2`, () => {
        const r = run(script, ...args, '--concurrency', value);
        assert.strictEqual(r.status, 2, r.stdout + r.stderr);
        assert.match(r.stderr, new RegExp(`usage: --concurrency needs a whole number of at least 1, got ${got}`));
      });
    }
  }
});

describe('report.js usage line', () => {
  test('hush/runner/report.js prints the usage line alone, with no uncaught-exception banner', () => {
    const r = run('hush/runner/report.js', '--tag');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.strictEqual(r.stderr.trim(), 'usage: --tag needs a value but none was given');
  });
});

describe('empty --tag value', () => {
  // The old readers read an empty --tag as 'dev' (report.js) or skipped it (pool.js, shape.js); none may take it as a folder name.
  test('hush/runner/report.js refuses --tag "", exit 1, with no stack trace', () => {
    const r = run('hush/runner/report.js', '--tag', '');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.strictEqual(r.stderr.trim(), 'usage: --tag needs a value, got nothing');
  });
  for (const script of ['hush/runner/pool.js', 'hush/runner/shape.js', 'hush/runner/criteria.js', 'hush/runner/duel.js']) {
    test(`${script} refuses --tag "", exit 2`, () => {
      const r = run(script, '--tag', '');
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, /usage: --tag needs a value, got nothing/);
    });
  }
  for (const script of ['hush/runner/answerable.js', 'hush/runner/structure.js', 'hush/runner/readability.js']) {
    test(`${script} refuses --tag "" with its usage line, exit 1`, () => {
      const r = run(script, '--tag', '');
      assert.strictEqual(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stderr, /^Usage: \w+\.js /m);
    });
  }
  test('flagAll refuses an empty value, flagOr keeps it unless told otherwise', () => {
    const flags = require('../../flags.js');
    const fail = (m) => { throw new Error(m); };
    assert.throws(() => flags.flagAll(['--tag', 'a', '--tag', ''], 'tag', fail), /--tag needs a value, got nothing/);
    assert.strictEqual(flags.flagOr(['--tag', ''], 'tag', 'dev', fail), '');
    assert.throws(() => flags.flagOr(['--tag', ''], 'tag', 'dev', fail, false), /--tag needs a value, got nothing/);
  });
});

describe('retold --save', () => {
  // Read before the paid loop: without --go the plan-only path used to return before it was ever read.
  test('hush/runner/retold.js refuses --save with no value before any call', () => {
    const dir = fs.mkdtempSync(path.join(DATA, 'records-'));
    const r = run('hush/runner/retold.js', '--records', dir, '--save');
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /usage: --save needs a value but none was given/);
  });
});

describe('hillclimb.js flags after --', () => {
  // The judge bound reads --tasks and --reps from the run.js flags, so a missing value refuses before it counts.
  for (const [extra, pattern] of [[['--reps'], /usage: --reps needs a value but none was given/], [['--tasks', '--reps', '2'], /usage: --tasks needs a value, got --reps/], [['--reps', 'abc'], /usage: --reps needs a whole number of at least 1, got abc/]]) {
    test(`hush/runner/hillclimb.js refuses ${extra.join(' ')} after --, exit 2`, () => {
      const r = run('hush/runner/hillclimb.js', '--variant', 'v1', '--flow', path.join(DATA, 'flow'), '--go', '--max-usd', '1', '--', ...extra);
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, pattern);
    });
  }
});

describe('hillclimb.js --variant under --go', () => {
  // The judge bound builds its results path from --variant, so a missing value refuses before the path is built.
  test('hush/runner/hillclimb.js refuses --variant with no value, exit 2', () => {
    const r = run('hush/runner/hillclimb.js', '--flow', path.join(DATA, 'flow'), '--go', '--max-usd', '1', '--variant');
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /usage: --variant needs a value but none was given/);
    assert.doesNotMatch(r.stdout + r.stderr, /undefined/);
  });
});

describe('keyless runs', () => {
  test('run() hands a script no TYPESAFE_API_KEY', () => {
    const saved = process.env.TYPESAFE_API_KEY;
    process.env.TYPESAFE_API_KEY = 'tsk-test-not-a-key';
    try {
      const r = run('hush/runner/judge.js', '--tag', 'x');
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, /TYPESAFE_API_KEY is not set/);
    } finally {
      if (saved === undefined) delete process.env.TYPESAFE_API_KEY;
      else process.env.TYPESAFE_API_KEY = saved;
    }
  });
  test('run() hands a script no ANTHROPIC_API_KEY', () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-test-not-a-key';
    try {
      const r = run('hush/runner/hillclimb.js', '--flow', path.join(DATA, 'flow'), '--variant', 'v1', '--go', '--max-usd', '1');
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stderr, /--go needs ANTHROPIC_API_KEY/);
    } finally {
      if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = saved;
    }
  });
});

describe('exit 1 readers', () => {
  const cases = [
    ['hush/runner/demo.js', '--out'],
    ['hush/runner/publish.js', '--out'],
    // These read argv[argv.indexOf(flag) + 1] or took the next argument unchecked; each keeps its Usage exit 1.
    ['hush/runner/report.js', '--tag'],
    ['hush/runner/answerable.js', '--tag'],
    ['hush/runner/caps.js', '--records'],
    ['hush/runner/readability.js', '--records'],
    ['hush/runner/structure.js', '--records'],
    ['hush/runner/retention.js', '--records'],
    ['hush/runner/truth.js', '--records'],
    ['hush/runner/mutate.js', '--records'],
    ['hush/runner/mutate.js', '--copy-to'],
  ];
  for (const [script, name] of cases) {
    test(`${script} refuses ${name} with no value, exit 1`, () => {
      const r = run(script, name);
      assert.strictEqual(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout + r.stderr, new RegExp(`usage: ${name} needs a value but none was given`));
    });
    test(`${script} refuses ${name} followed by another flag, exit 1`, () => {
      const r = run(script, name, '--x');
      assert.strictEqual(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout + r.stderr, new RegExp(`usage: ${name} needs a value, got --x`));
    });
  }
});
