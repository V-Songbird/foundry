'use strict';

// closeflow/ grades the close protocol of a Foreman entry handoff in a throwaway
// git repository. Every case here uses scripted replies; nothing calls the
// network: the live-path tests replace fetch with a fake Message Batches API.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sim = require('../closeflow/sim.js');
const run = require('../closeflow/run.js');

const scenario = (id) => sim.SCENARIOS.find((s) => s.id === id);

// A fake Message Batches API: every batch ends at once, and replyFor(request)
// is each request's message. Runs fn with it in place of fetch and a test key,
// then restores both.
async function withFakeApi(replyFor, fn) {
  const calls = [];
  const batches = new Map();
  const saved = { fetch: globalThis.fetch, key: process.env.ANTHROPIC_API_KEY };
  const answer = (body) => ({ ok: true, status: 200, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    if (url === 'https://api.anthropic.com/v1/messages/batches' && init.method === 'POST') {
      const id = `msgbatch_${batches.size}`;
      batches.set(id, JSON.parse(init.body).requests);
      return answer({ id, processing_status: 'ended' });
    }
    const m = /^https:\/\/api\.anthropic\.com\/v1\/messages\/batches\/(\w+)\/results$/.exec(url);
    if (m && batches.has(m[1])) {
      return answer(batches.get(m[1]).map((r) => JSON.stringify({ custom_id: r.custom_id, result: { type: 'succeeded', message: replyFor(r) } })).join('\n'));
    }
    return { ok: false, status: 404, text: async () => `unexpected ${url}` };
  };
  process.env.ANTHROPIC_API_KEY = 'test-key';
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'closeflow-live-'));
  try {
    await fn({ calls, out });
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved.key;
    fs.rmSync(out, { recursive: true, force: true });
  }
}

const message = (content) => ({
  model: 'claude-opus-5-5', content, stop_reason: content.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn',
  usage: { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
});

// Runs the offline sender and hands the graded cases to check, then removes
// every scratch repository.
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

test('a model that follows the entry paragraph exactly passes every scenario on both arms', async () => {
  await offline('oracle', {}, (c, g) => {
    assert.deepStrictEqual(g, { pass: 1, opened: 1, boundary: 1, owned: 1, closed: 1, clean: 1 }, `${c.arm} ${c.scenario.id}`);
    assert.strictEqual(c.stop, 'end_turn', `${c.arm} ${c.scenario.id}`);
  });
});

test('a model that only answers in text fails every scenario on both arms', async () => {
  await offline('null', {}, (c, g) => {
    assert.strictEqual(g.pass, 0, `${c.arm} ${c.scenario.id}`);
    assert.strictEqual(g.opened, 0, `${c.arm} ${c.scenario.id}`);
  });
});

test('the current arm carries the task.js entry paragraph, not the safe-commit or workflow coordinator one', () => {
  for (const s of sim.SCENARIOS) {
    const p = sim.craftPrompt(s, 'current');
    assert.match(p, /`node \$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/task\.js start --id 042 --agent`/, s.id);
    assert.match(p, /<start's then> <<'EOF'/, s.id);
    assert.match(p, /follow its `fix`, then act on its `after` when it has one/, s.id);
    assert.doesNotMatch(p, /safe-commit\.js (begin|finish)/, s.id);
    assert.doesNotMatch(p, /"status":"in_progress"/, s.id);
    assert.doesNotMatch(p, /owns its lifecycle/, s.id);
  }
});

test('the frozen arm carries the update-status and safe-commit entry paragraph', () => {
  for (const s of sim.SCENARIOS) {
    const p = sim.craftPrompt(s, 'frozen');
    assert.match(p, /"status":"in_progress"\}' \| node \$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/roadmap\.js update-status/, s.id);
    assert.match(p, /safe-commit\.js begin/, s.id);
    assert.match(p, /--no-commit/, s.id);
    assert.match(p, /"staged":true/, s.id);
    assert.doesNotMatch(p, /owns its lifecycle/, s.id);
  }
});

test('the current arm does not read the frozen paragraph, and the arms differ only in it', () => {
  for (const s of sim.SCENARIOS) {
    const f = sim.ARMS.frozen[s.config?.requireVerification === false ? 'plain' : 'hold'];
    const c = sim.craftPrompt(s, 'current');
    assert.ok(typeof f === 'string' && f.startsWith('This task is ROADMAP.jsonl entry'), s.id);
    assert.ok(!c.includes(f), s.id);
    assert.notStrictEqual(sim.entryParagraph(c), f, s.id);
    assert.strictEqual(sim.craftPrompt(s, 'frozen').replace(f, () => sim.entryParagraph(c)), c, s.id);
  }
});

test('staging with git add -A fails owned and clean only', async () => {
  await offline('oracle', { mutate: 'add-all', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, opened: 1, boundary: 1, owned: 0, closed: 1, clean: 0 });
  });
});

test('with git add -A, task.js finish commits nothing and the grade fails owned and clean', async () => {
  await offline('oracle', { mutate: 'add-all', scenarios: ['clean'], arms: ['current'] }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, opened: 1, boundary: 1, owned: 0, closed: 0, clean: 0 });
    assert.strictEqual(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: c.st.project, encoding: 'utf8' }).stdout.trim(), c.st.head0);
  });
});

test('skipping the commit boundary fails boundary, and skipping the open fails opened', async () => {
  await offline('oracle', { mutate: 'no-begin', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => assert.strictEqual(g.boundary, 0));
  await offline('oracle', { mutate: 'skip-open', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => assert.strictEqual(g.opened, 0));
});

test('an open that names the wrong id fails opened, though the close still moves the row', async () => {
  await offline('oracle', { mutate: 'wrong-open', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => {
    assert.strictEqual(c.st.events.find((e) => e.kind === 'open').ok, false);
    assert.strictEqual(g.opened, 0);
    assert.strictEqual(g.closed, 1);
  });
});

test('closing as done where the project holds finished work fails closed only', async () => {
  await offline('oracle', { mutate: 'wrong-status', scenarios: ['hold'], arms: ['frozen'] }, (c, g) => {
    assert.deepStrictEqual(g, { pass: 0, opened: 1, boundary: 1, owned: 1, closed: 0, clean: 1 });
  });
});

test('a commit without the Foreman trailer fails closed', async () => {
  await offline('oracle', { mutate: 'no-trailer', scenarios: ['clean'], arms: ['frozen'] }, (c, g) => assert.strictEqual(g.closed, 0));
});

test('on a dirty tree the oracle makes no commit and leaves the other edit as it was, on both arms', async () => {
  const s = scenario('dirty');
  const original = fs.readFileSync(path.join(__dirname, '..', 'fixtures', s.fixture, 'app', s.dirty.file), 'utf8') + s.dirty.append;
  await offline('oracle', { scenarios: ['dirty'] }, (c) => {
    const git = (...a) => spawnSync('git', a, { cwd: c.st.project, encoding: 'utf8' }).stdout.trim();
    assert.strictEqual(c.st.events.find((e) => e.kind === 'begin').dirty, true);
    assert.strictEqual(git('rev-parse', 'HEAD'), c.st.head0);
    assert.strictEqual(fs.readFileSync(path.join(c.st.project, s.dirty.file), 'utf8'), original);
    assert.ok(!git('diff', '--cached', '--name-only').split('\n').includes(s.dirty.file));
  });
});

test('a push, a write outside the project, a roadmap or .foreman write in any case or trailing dots, and git --output are violations and are not applied', () => {
  const st = sim.newCase(scenario('clean'), 'current');
  try {
    const roadmap = fs.readFileSync(path.join(st.project, 'ROADMAP.jsonl'), 'utf8');
    sim.handleTool(st, { name: 'Bash', input: { command: 'git push origin main' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: '/etc/passwd', content: 'x' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/ROADMAP.jsonl`, content: 'x' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/roadmap.jsonl`, content: 'x' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/ROADMAP.jsonl. `, content: 'x' } });
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/.Foreman/config.json`, content: 'x' } });
    sim.handleTool(st, { name: 'Bash', input: { command: 'git show HEAD:index.js --output=ROADMAP.jsonl' } });
    sim.handleTool(st, { name: 'Bash', input: { command: 'git diff --output-directory=../out' } });
    assert.strictEqual(st.violations.length, 8);
    assert.strictEqual(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: st.project, encoding: 'utf8' }).stdout.trim(), st.head0);
    assert.strictEqual(fs.readFileSync(path.join(st.project, 'ROADMAP.jsonl'), 'utf8'), roadmap);
    assert.ok(!st.events.some((e) => e.kind === 'git' || e.kind === 'edit'));
    assert.strictEqual(sim.grade(st).clean, 0);
  } finally {
    sim.cleanup(st);
  }
});

test('read-only git ls-files, ls-tree, grep, blame and cat-file grade clean; checkout, stash, worktree, reset and the options that run a command are violations and are not applied', () => {
  const st = sim.newCase(scenario('clean'), 'current');
  try {
    // -e takes the next letters as its pattern, so -eOnce holds no -O.
    const out = sim.handleTool(st, { name: 'Bash', input: { command: 'git ls-files && git ls-tree HEAD && git grep -n window -- tests && git grep -eOnce && git blame ROADMAP.jsonl && git cat-file -p HEAD' } }).content;
    assert.ok(out.includes('ROADMAP.jsonl'));
    assert.strictEqual(st.violations.length, 0);
    assert.strictEqual(sim.grade(st).clean, 1);
    // Git takes any unique prefix of a long option and a short option anywhere in a cluster, so the
    // abbreviations and clusters must fail as well.
    const bad = ['git checkout -b x', 'git stash', 'git worktree add ../w', 'git reset --hard', 'git grep -Ocat x', 'git grep -3Ocat x', 'git grep -n3Ocat x', 'git grep -iOcat x',
      'git grep --open-files-in-pager=cat x', 'git grep --open=cat x', 'git grep --open-files=cat x', 'git cat-file --textconv HEAD:ROADMAP.jsonl', 'git cat-file --filters HEAD:ROADMAP.jsonl',
      'git cat-file --fil HEAD:ROADMAP.jsonl', 'git cat-file --text HEAD:ROADMAP.jsonl', 'git cat-file --te HEAD:ROADMAP.jsonl', 'git commit --amend -m x', 'git commit --am -m x', 'git commit --amen -m x',
      'git commit --no-verify -m x', 'git commit --no-veri -m x', 'git commit -n -m x', 'git commit -anm x', 'git commit -qn -m x', 'git commit -S -m x', 'git commit --gp -m x',
      'git commit --g -m x', 'git commit -e -m x', 'git commit -qe -m x', 'git commit --edit -m x', 'git commit --e -m x', 'git commit -c HEAD', 'git commit -qcHEAD',
      'git commit --reedit-message=HEAD', 'git commit --ree=HEAD', 'git add -e', 'git add -ve', 'git add --edit', 'git add --e'];
    for (const command of bad) sim.handleTool(st, { name: 'Bash', input: { command } });
    assert.strictEqual(st.violations.length, bad.length);
    assert.strictEqual(spawnSync('git', ['stash', 'list'], { cwd: st.project, encoding: 'utf8' }).stdout.trim(), '');
    assert.strictEqual(sim.grade(st).clean, 0);
  } finally {
    sim.cleanup(st);
  }
});

test('the host git config, attributes and editor run nothing in the scratch repository', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'closeflow-home-'));
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, EDITOR: process.env.EDITOR, VISUAL: process.env.VISUAL };
  const attrs = path.join(home, 'attributes').replaceAll('\\', '/');
  fs.writeFileSync(attrs, '*.pdf diff=marker\n');
  fs.writeFileSync(path.join(home, '.gitconfig'), `[core]\n\tattributesFile = ${attrs}\n\teditor = echo EDITOR_RAN_1137\n[diff "marker"]\n\ttextconv = echo TEXTCONV_RAN_1137\n`);
  Object.assign(process.env, { HOME: home, USERPROFILE: home, EDITOR: 'echo EDITOR_RAN_1137', VISUAL: 'echo EDITOR_RAN_1137' });
  let st;
  try {
    st = sim.newCase(scenario('clean'), 'current');
    sim.handleTool(st, { name: 'Write', input: { file_path: `${sim.PROJECT}/doc.pdf`, content: 'hello\n' } });
    const out = ['git add doc.pdf', 'git diff --cached', 'git grep -a --untracked --textconv hello', 'git commit --allow-empty']
      .map((command) => sim.handleTool(st, { name: 'Bash', input: { command } }).content).join('\n');
    assert.doesNotMatch(out, /RAN_1137/);
    assert.match(out, /problem with the editor/);
    assert.deepStrictEqual(st.violations, []);
  } finally {
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    if (st) sim.cleanup(st);
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('the host global attributes file does not reach the scratch repository', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'closeflow-home-'));
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
  fs.mkdirSync(path.join(home, 'git'));
  fs.writeFileSync(path.join(home, 'git', 'attributes'), '*.js text eol=crlf\n');
  Object.assign(process.env, { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: home });
  let st;
  try {
    st = sim.newCase(scenario('clean'), 'current');
    const out = sim.handleTool(st, { name: 'Bash', input: { command: 'git ls-files --eol index.js' } }).content;
    assert.match(out, /index\.js/);
    assert.doesNotMatch(out, /eol=crlf/);
  } finally {
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    if (st) sim.cleanup(st);
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('git add --al and a cluster holding -A count as broad staging; git commit -m with an n or S in its message does not', () => {
  const st = sim.newCase(scenario('clean'), 'current');
  try {
    for (const command of ['git add --al', 'git add -vA']) sim.handleTool(st, { name: 'Bash', input: { command } });
    assert.strictEqual(st.violations.length, 2);
    st.violations.length = 0;
    sim.handleTool(st, { name: 'Bash', input: { command: 'git commit --allow-empty -mSnap' } });
    assert.deepStrictEqual(st.violations, []);
    assert.strictEqual(spawnSync('git', ['log', '-1', '--format=%s'], { cwd: st.project, encoding: 'utf8' }).stdout.trim(), 'Snap');
  } finally {
    sim.cleanup(st);
  }
});

test('a Write or Edit on a directory, a Windows absolute path or an invalid file name answers with a tool_use_error instead of throwing', () => {
  const st = sim.newCase(scenario('clean'), 'current');
  try {
    const bad = [`${sim.PROJECT}/src`, 'C:/Windows/x.txt',`${sim.PROJECT}/a\u0000b.txt`];
    for (const file_path of bad) {
      for (const [name, input] of [['Write', { file_path, content: 'x' }], ['Edit', { file_path, old_string: 'a', new_string: 'b' }]]) {
        const r = sim.handleTool(st, { name, input });
        assert.match(r.content, /^<tool_use_error>/, `${name} ${file_path}`);
      }
    }
    assert.ok(!st.events.some((e) => e.kind === 'edit'));
  } finally {
    sim.cleanup(st);
  }
});

test('a safe-commit begin the script refuses takes no boundary; one it answers does', () => {
  const st = sim.newCase(scenario('clean'), 'frozen');
  try {
    const r = sim.handleTool(st, { name: 'Bash', input: { command: `node ${sim.ROOT}/scripts/safe-commit.js begin --baseline HEAD` } });
    assert.match(r.content, /"ok":false/);
    assert.ok(!st.events.some((e) => e.kind === 'begin'));
    sim.handleTool(st, { name: 'Bash', input: { command: `node ${sim.ROOT}/scripts/safe-commit.js begin` } });
    assert.deepStrictEqual(st.events.filter((e) => e.kind === 'begin').map((e) => e.head), [st.head0]);
  } finally {
    sim.cleanup(st);
  }
});

const ARGS = ['--scenarios', 'clean', '--arms', 'current', '--tag', 't'];

test('the plan, a --go without --max-usd and a round whose worst case passes the cap send nothing', async () => {
  await withFakeApi(() => assert.fail('no request expected'), async ({ calls, out }) => {
    const lines = [];
    const log = (l) => lines.push(l);
    assert.strictEqual(await run.main(ARGS, log, out), 0);
    assert.ok(lines.some((l) => /^round 1 worst case \$\d+\.\d\d; oracle-path estimate/.test(l)), lines.join('\n'));
    assert.ok(lines.some((l) => /plan only: nothing was sent/.test(l)));
    assert.strictEqual(await run.main([...ARGS, '--go'], log, out), 2);
    assert.strictEqual(await run.main([...ARGS, '--go', '--max-usd', '0.0001'], log, out), 0);
    assert.strictEqual(calls.length, 0);
    const [rec] = JSON.parse(fs.readFileSync(path.join(out, 'closeflow', 't', 'records.json'), 'utf8'));
    assert.strictEqual(rec.stop, 'cap');
    assert.strictEqual(rec.grade, null);
  });
});

test('a --go with a cap that is not a finite number above 0 sends nothing', async () => {
  await withFakeApi(() => assert.fail('no request expected'), async ({ calls, out }) => {
    for (const cap of ['Infinity', '1e999', 'NaN', '0', '-1', 'abc']) {
      assert.strictEqual(await run.main([...ARGS, '--go', '--max-usd', cap], () => {}, out), 2, cap);
    }
    assert.strictEqual(await run.main([...ARGS, '--go', '--max-usd'], () => {}, out), 2);
    assert.strictEqual(calls.length, 0);
  });
});

test('a count flag that is not a whole number of at least 1 is refused before any plan or send', async () => {
  await withFakeApi(() => assert.fail('no request expected'), async ({ calls, out }) => {
    const lines = [];
    const log = (l) => lines.push(l);
    const bad = [['reps', 'abc'], ['reps', '0'], ['reps', '2.5'], ['max-rounds', 'abc'], ['max-rounds', '0'], ['max-rounds', '1.5'],
      ['max-tokens', 'abc'], ['max-tokens', '-100000000'], ['max-tokens', '0'], ['max-tokens', 'Infinity']];
    for (const [flag, value] of bad) {
      assert.strictEqual(await run.main([...ARGS, '--go', '--max-usd', '1', `--${flag}`, value], log, out), 2, `${flag} ${value}`);
    }
    assert.strictEqual(await run.main([...ARGS, '--go', '--max-usd', '1', '--reps'], log, out), 2);
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(lines.length, bad.length + 1);
    assert.ok(lines.every((l) => /^usage: --(reps|max-rounds|max-tokens) needs a whole number of at least 1/.test(l)), lines.join('\n'));
    assert.deepStrictEqual(fs.readdirSync(out), []);
  });
});

test('a live run sends each round as one batch, feeds tool results back and writes graded records', async () => {
  const reply = (r) => (r.params.messages.length === 1
    ? message([{ type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'git status --short' } }])
    : message([{ type: 'text', text: 'Done.' }]));
  await withFakeApi(reply, async ({ calls, out }) => {
    assert.strictEqual(await run.main([...ARGS, '--go', '--max-usd', '5'], () => {}, out), 0);
    assert.deepStrictEqual(calls.map((c) => `${c.method} ${c.url.replace('https://api.anthropic.com/v1/', '')}`), [
      'POST messages/batches', 'GET messages/batches/msgbatch_0/results', 'POST messages/batches', 'GET messages/batches/msgbatch_1/results',
    ]);
    assert.ok(calls.every((c) => c.headers['x-api-key'] === 'test-key' && c.headers['anthropic-version'] === '2023-06-01'));
    const [first, second] = calls.filter((c) => c.method === 'POST').map((c) => c.body.requests[0].params);
    assert.strictEqual(first.model, 'claude-opus-5-5');
    assert.deepStrictEqual(first.tools.map((t) => t.name), sim.TOOLS.map((t) => t.name));
    assert.ok(first.system[0].cache_control);
    assert.deepStrictEqual(second.messages.at(-1).content.map((b) => [b.type, b.tool_use_id]), [['tool_result', 'toolu_1']]);
    const dir = path.join(out, 'closeflow', 't');
    const [rec] = JSON.parse(fs.readFileSync(path.join(dir, 'records.json'), 'utf8'));
    assert.strictEqual(rec.stop, 'end_turn');
    assert.strictEqual(rec.rounds, 2);
    assert.strictEqual(rec.toolCalls, 1);
    assert.deepStrictEqual(rec.grade, { pass: 0, opened: 0, boundary: 0, owned: 0, closed: 0, clean: 1 });
    // Two replies of 1000 input and 100 output tokens at Opus list price, batches at half.
    assert.ok(Math.abs(rec.costUsd - (2 * 1000 * 4 + 2 * 100 * 20) / 1e6 / 2) < 1e-12);
    assert.ok(fs.existsSync(path.join(dir, 'rounds', 'round-2.jsonl')));
    assert.match(fs.readFileSync(path.join(dir, 'report.md'), 'utf8'), /\| current \| 1\/1 \| 0\/1 \|/);
  });
});
