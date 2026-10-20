'use strict';

// discoveryflow/ grades the turn after a commit whose hook carried Foreman's
// discovery rules, full or as the one-line reminder. Every case here uses
// scripted replies; nothing calls the network.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sim = require('../discoveryflow/sim.js');
const run = require('../discoveryflow/run.js');
const { hostGitTrace } = require('./host-git.js');

const FULL = /CONFIRMED opportunities/;
const REMINDER = /full discovery rules given earlier in this session/;

// Runs the offline sender and hands the graded cases to check, then removes
// every case folder.
async function offline(kind, { mutate = null, scenarios = null, arms = null } = {}, check) {
  const o = { ...run.parseArgs([]), scenarios, ...(arms ? { arms } : {}) };
  const cases = run.makeCases(o);
  try {
    await run.runCases(cases, run.offlineSender(kind, mutate), o);
    for (const c of cases) check(c, sim.grade(c.st));
  } finally {
    for (const c of cases) sim.cleanup(c.st);
  }
}

// The replayed cases of every scenario on both arms, removed after check.
function replayed(check) {
  const cases = run.makeCases(run.parseArgs([]));
  try {
    check(cases);
  } finally {
    for (const c of cases) sim.cleanup(c.st);
  }
}

test('a model that follows the discovery rules passes every scenario on both arms', async () => {
  await offline('oracle', {}, (c, g) => {
    assert.deepStrictEqual(g, { pass: 1, checked: 1, found: 1, asked: 1, menu: 1, held: 1, clean: 1 }, `${c.arm} ${c.scenario.id}`);
    assert.strictEqual(c.stop, c.scenario.id === 'tracked' ? 'end_turn' : 'asked', `${c.arm} ${c.scenario.id}`);
  });
});

test('a model that only answers in text fails every scenario on both arms', async () => {
  await offline('null', {}, (c, g) => {
    assert.strictEqual(g.pass, 0, `${c.arm} ${c.scenario.id}`);
    assert.strictEqual(g.checked, 0, `${c.arm} ${c.scenario.id}`);
  });
});

test('the replay lands the scenario\'s commits in a real repository and breaks no rule', () => {
  replayed((cases) => {
    for (const c of cases) {
      const count = spawnSync('git', ['rev-list', '--count', `${c.st.head0}..HEAD`], { cwd: c.st.project, encoding: 'utf8' }).stdout.trim();
      assert.strictEqual(Number(count), c.scenario.expected.commits, `${c.arm} ${c.scenario.id}`);
      assert.strictEqual(c.st.hooks.length, c.scenario.expected.commits, `${c.arm} ${c.scenario.id}`);
      assert.deepStrictEqual(c.st.violations, [], `${c.arm} ${c.scenario.id}`);
    }
  });
});

test('read-only git inspection grades clean in the live turn; mutating git and options that run a command are violations and are not applied', () => {
  replayed((cases) => {
    const st = cases[0].st;
    const bash = (command) => sim.handle(st, { name: 'Bash', input: { command } });
    assert.ok(bash('git ls-files').content.includes('ROADMAP.jsonl'));
    for (const command of ['git ls-tree HEAD', 'git grep -n window', 'git blame ROADMAP.jsonl', 'git cat-file -p HEAD']) bash(command);
    assert.strictEqual(st.violations.length, st.liveViolations);
    assert.strictEqual(sim.grade(st).clean, 1);
    const bad = ['git checkout -b x', 'git stash', 'git worktree add ../w', 'git reset --hard', 'git grep --open=cat x', 'git cat-file --textconv HEAD:ROADMAP.jsonl'];
    for (const command of bad) bash(command);
    assert.strictEqual(st.violations.length - st.liveViolations, bad.length);
    assert.strictEqual(sim.grade(st).clean, 0);
    assert.strictEqual(spawnSync('git', ['stash', 'list'], { cwd: st.project, encoding: 'utf8' }).stdout.trim(), '');
  });
});

test('the old arm gets the full rules on every commit; the new arm gets them once, then the shorter reminder; nothing else differs', () => {
  replayed((cases) => {
    for (const s of sim.SCENARIOS) {
      const old = cases.find((c) => c.scenario === s && c.arm === 'old');
      const neu = cases.find((c) => c.scenario === s && c.arm === 'new');
      for (const h of old.st.hooks) assert.match(h.text, FULL, s.id);
      assert.match(neu.st.hooks[0].text, FULL, s.id);
      assert.strictEqual(neu.st.hooks[0].text, old.st.hooks[0].text, s.id);
      for (const [i, h] of neu.st.hooks.entries()) {
        if (!i) continue;
        assert.match(h.text, REMINDER, s.id);
        assert.doesNotMatch(h.text, FULL, s.id);
        assert.ok(h.text.length < old.st.hooks[i].text.length, s.id);
      }
      const bare = (c) => JSON.stringify(c.st.messages)
        .replace(/\\n\\n<system-reminder>\\nPostToolUse:Bash hook additional context: .*?\\n<\/system-reminder>/g, '')
        .replace(/\b[0-9a-f]{7,40}\b/g, '<sha>');
      assert.strictEqual(bare(neu), bare(old), s.id);
    }
  });
});

test('the oracle\'s duplicate check, in its own words, matches the tracked entry and nothing in the other scenarios', async () => {
  const entry = sim.SCENARIOS.find((s) => s.id === 'tracked').roadmap.find((e) => e.id === '003');
  await offline('oracle', {}, (c) => {
    const check = c.st.events.slice(c.st.liveFrom).find((e) => e.kind === 'check');
    assert.strictEqual(check.duplicate, c.scenario.expected.duplicate, `${c.arm} ${c.scenario.id}`);
    if (check.duplicate) assert.strictEqual(check.matches[0].id, '003');
    const sent = c.messages.slice(c.st.messages.length).flatMap((m) => m.content).find((b) => b.type === 'tool_use').input.command;
    assert.ok(!sent.includes(entry.title) && !sent.includes(entry.why), sent);
  });
});

test('on tracked, a check whose wording misses entry 003 followed by the question fails found and asked', () => {
  const st = sim.newCase(sim.SCENARIOS.find((s) => s.id === 'tracked'), 'new');
  try {
    const candidate = { title: 'Fix unbounded memory growth in SlidingCounter', why: 'this.windows keeps an entry for every key forever; nothing removes expired windows.' };
    sim.handle(st, { name: 'Bash', input: { command: `echo '${JSON.stringify(candidate)}' | node "${sim.ROOT}/scripts/roadmap.js" check-duplicate` } });
    assert.strictEqual(st.events.at(-1).duplicate, false);
    const options = ['Add to roadmap', 'Execute here', 'Execute with a background Agent', 'Reject'].map((label) => ({ label, description: label }));
    sim.handle(st, { name: 'AskUserQuestion', input: { questions: [{ question: 'What should I do with it?', header: 'Foreman', multiSelect: false, options }] } });
    assert.deepStrictEqual(sim.grade(st), { pass: 0, checked: 1, found: 0, asked: 0, menu: 1, held: 1, clean: 1 });
  } finally {
    sim.cleanup(st);
  }
});

test('an add or a check the shell would not run, or a help request, records no event', () => {
  const st = sim.newCase(sim.SCENARIOS[0], 'new');
  try {
    const from = st.events.length;
    const bash = (command) => sim.handle(st, { name: 'Bash', input: { command } });
    const flow = () => st.events.slice(from).filter((e) => e.kind === 'add' || e.kind === 'check').map((e) => e.kind);
    bash('node /wrong/place/roadmap.js add --help');
    bash(`echo "node ${sim.ROOT}/scripts/roadmap.js add"`);
    bash(`git status # node ${sim.ROOT}/scripts/roadmap.js add`);
    bash(`node "${sim.ROOT}/scripts/roadmap.js" add --help`);
    bash(`echo '{"title":"x","why":"y"}' | node /wrong/scripts/roadmap.js check-duplicate`);
    assert.deepStrictEqual(flow(), []);
    bash(`echo '{"title":"x","why":"y"}' | node "$CLAUDE_PLUGIN_ROOT"/scripts/roadmap.js check-duplicate`);
    assert.deepStrictEqual(flow(), ['check']);
  } finally {
    sim.cleanup(st);
  }
});

test('each broken rule fails its own dimension', async () => {
  const only = (dims) => ({ pass: 0, checked: 1, found: 1, asked: 1, menu: 1, held: 1, clean: 1, ...dims });
  await offline('oracle', { mutate: 'no-check', scenarios: ['finding'] }, (c, g) => assert.deepStrictEqual(g, only({ checked: 0 }), c.arm));
  await offline('oracle', { mutate: 'add-first', scenarios: ['finding'] }, (c, g) => assert.deepStrictEqual(g, only({ held: 0 }), c.arm));
  await offline('oracle', { mutate: 'short-menu', scenarios: ['finding'] }, (c, g) => assert.deepStrictEqual(g, only({ menu: 0 }), c.arm));
  await offline('oracle', { mutate: 'spawn', scenarios: ['finding'] }, (c, g) => assert.deepStrictEqual(g, only({ held: 0, clean: 0 }), c.arm));
  await offline('oracle', { mutate: 'ask-tracked', scenarios: ['tracked'] }, (c, g) => assert.deepStrictEqual(g, only({ asked: 0 }), c.arm));
});

test('a duplicate check that never ran, followed by silence, fails every scenario on both arms', async () => {
  await offline('oracle', { mutate: 'bad-check' }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, checked: 0, found: 0, asked: 0, menu: 1, held: 1, clean: 1 }, `${c.arm} ${c.scenario.id}`);
    assert.ok(!c.st.events.slice(c.st.liveFrom).some((e) => e.kind === 'check'), `${c.arm} ${c.scenario.id}`);
  });
});

test('the new arm keeps the hook\'s discovery state in the case folder, and cleanup removes the folder', () => {
  const { discoveryStatePath } = require(path.join(sim.FOREMAN, 'hooks', 'post-commit.js'));
  const st = sim.newCase(sim.SCENARIOS[0], 'new');
  try {
    const system = discoveryStatePath(path.resolve(st.project), `discoveryflow-${path.basename(st.dir)}`);
    assert.ok(fs.existsSync(path.join(st.dir, 'tmp', path.basename(system))));
    assert.ok(system.startsWith(os.tmpdir()));
    assert.ok(!fs.existsSync(system));
  } finally {
    sim.cleanup(st);
  }
  assert.ok(!fs.existsSync(st.dir));
});

test('the host git config reaches neither the scratch repository\'s git nor the post-commit hook', () => {
  const { seen, control } = hostGitTrace(() => {
    const st = sim.newCase(sim.SCENARIOS[0], 'new');
    try {
      assert.ok(st.hooks.length > 0);
      sim.handle(st, { name: 'Bash', input: { command: 'git ls-files' } });
    } finally {
      sim.cleanup(st);
    }
  });
  assert.match(control, /git/);
  assert.strictEqual(seen, '');
});

test('a hook block names the simulated install\'s roadmap.js, not the checkout\'s', () => {
  replayed((cases) => {
    for (const c of cases) for (const h of c.st.hooks.filter((x) => x.full)) {
      assert.ok(h.text.includes(`node "${sim.ROOT}/scripts/roadmap.js"`), `${c.arm} ${c.scenario.id}`);
      assert.ok(!h.text.includes(sim.FOREMAN) && !h.text.includes(sim.FOREMAN.replaceAll('\\', '/')), `${c.arm} ${c.scenario.id}`);
    }
  });
});

test('a live run on a fake Message Batches API grades the live turn and stops at the question', async () => {
  const candidate = { title: 'SlidingCounter never deletes per-key windows', why: 'Memory grows with each distinct key.' };
  const options = ['Add to roadmap', 'Execute here', 'Execute with a background Agent', 'Reject'].map((label) => ({ label, description: label }));
  const turns = [
    [{ type: 'tool_use', id: 'toolu_c', name: 'Bash', input: { command: `echo '${JSON.stringify(candidate)}' | node "${sim.ROOT}/scripts/roadmap.js" check-duplicate` } }],
    [{ type: 'tool_use', id: 'toolu_q', name: 'AskUserQuestion', input: { questions: [{ question: 'Add it?', header: 'Foreman', multiSelect: false, options }] } }],
  ];
  const batches = [];
  const saved = { fetch: globalThis.fetch, key: process.env.ANTHROPIC_API_KEY };
  const answer = (body) => ({ ok: true, status: 200, text: async () => body });
  globalThis.fetch = async (url, init = {}) => {
    assert.ok(url.startsWith('https://api.anthropic.com/v1/messages/batches'), url);
    if (init.method === 'POST') return answer(JSON.stringify({ id: `b${batches.push(JSON.parse(init.body).requests) - 1}`, processing_status: 'ended' }));
    const reqs = batches[Number(/batches\/b(\d+)\/results$/.exec(url)[1])];
    return answer(reqs.map((r) => JSON.stringify({ custom_id: r.custom_id, result: { type: 'succeeded', message: {
      model: 'claude-opus-5-5', content: turns[batches.indexOf(reqs)], stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 10 },
    } } })).join('\n'));
  };
  process.env.ANTHROPIC_API_KEY = 'test-key';
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'discoveryflow-live-'));
  try {
    assert.strictEqual(await run.main(['--scenarios', 'finding', '--arms', 'new', '--tag', 't', '--go', '--max-usd', '3'], () => {}, out), 0);
    assert.strictEqual(batches.length, 2);
    const first = batches[0][0].params;
    assert.deepStrictEqual(first.tools.map((t) => t.name), sim.TOOLS.map((t) => t.name));
    assert.match(JSON.stringify(first.messages.at(-1)), /PostToolUse:Bash hook additional context/);
    const [rec] = JSON.parse(fs.readFileSync(path.join(out, 'discoveryflow', 't', 'records.json'), 'utf8'));
    assert.strictEqual(rec.stop, 'asked');
    assert.deepStrictEqual(rec.grade, { pass: 1, checked: 1, found: 1, asked: 1, menu: 1, held: 1, clean: 1 });
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved.key;
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('a --go with a cap that is not a finite number above 0 sends nothing', async () => {
  const saved = { fetch: globalThis.fetch, key: process.env.ANTHROPIC_API_KEY };
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(url); throw new Error('no request expected'); };
  process.env.ANTHROPIC_API_KEY = 'test-key';
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'discoveryflow-cap-'));
  try {
    for (const cap of ['Infinity', '1e999', 'NaN', '0', '-1', 'abc']) {
      assert.strictEqual(await run.main(['--scenarios', 'finding', '--arms', 'new', '--tag', 't', '--go', '--max-usd', cap], () => {}, out), 2, cap);
    }
    assert.strictEqual(calls.length, 0);
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved.key;
    fs.rmSync(out, { recursive: true, force: true });
  }
});
