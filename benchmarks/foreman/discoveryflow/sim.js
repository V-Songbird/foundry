'use strict';
// The simulated Claude Code session a discoveryflow case runs in: a scripted
// session that fixes a bug in a throwaway git repository, notices an unrelated
// defect on the way and commits, with Foreman's real hooks/post-commit.js run
// after each commit. The model answers the turn after the last commit; the
// grader reads only that live turn. Tool calls go through closeflow's handler
// (Foreman's scripts and allowlisted git as argv, everything else scripted).

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const close = require('../closeflow/sim.js');
const pick = require('../pickflow/sim.js');

const { ROOT, PROJECT, FOREMAN } = close;
const SCENARIOS = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenarios.json'), 'utf8'));
// `old` sends the hook no session_id or transcript_path, so every commit gets
// the full discovery rules, as every Claude Code commit did before foreman
// entry 1077. `new` sends both, so commits after the first get the one-line
// reminder. Both run the same Foreman checkout's hook.
const ARMS = { old: { session: false }, new: { session: true } };

const SYSTEM = `You are Claude Code, Anthropic's official CLI for Claude. You are an interactive agent that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

# Environment
Working directory: ${PROJECT}
Is a git repository: true
Platform: linux
Shell: bash`;

const TOOLS = [
  ...close.TOOLS,
  ...pick.TOOLS.filter((t) => ['AskUserQuestion', 'Agent'].includes(t.name)),
  {
    name: 'mcp__ccd_session__spawn_task',
    description: 'Offer the user a chip that starts this task in a new session.',
    input_schema: { type: 'object', properties: { title: { type: 'string' }, prompt: { type: 'string' } }, required: ['title', 'prompt'] },
  },
];

const SCRIPT_PATH = path.join(FOREMAN, 'scripts', 'roadmap.js');
const CHECK = /roadmap\.js["']?\s+check-duplicate\b/;
const ADD = /roadmap\.js["']?\s+add\b/;

const git = (dir, ...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
const head = (dir) => (git(dir, 'rev-parse', 'HEAD').stdout || '').trim();

function hookEnv(st) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^(FOREMAN_|CODEX_|CLAUDE|ANTIGRAVITY_|GIT_|PLUGIN_ROOT$)/.test(k)) env[k] = v;
  const tmp = path.join(st.dir, 'tmp');
  return { ...env, CLAUDE_PROJECT_DIR: st.project, FOREMAN_HOST: 'claude', TEMP: tmp, TMP: tmp, TMPDIR: tmp };
}

// Foreman's post-commit hook for one commit; its text names the simulated
// install, and the transcript grows by one line, as a session's does.
function runHook(st, command) {
  const transcript = path.join(st.dir, 'transcript.jsonl');
  const payload = {
    tool_name: 'Bash', tool_input: { command }, cwd: st.project,
    ...(ARMS[st.arm].session ? { session_id: `discoveryflow-${path.basename(st.dir)}`, transcript_path: transcript } : {}),
  };
  const r = spawnSync(process.execPath, [path.join(FOREMAN, 'hooks', 'post-commit.js')], { input: JSON.stringify(payload), encoding: 'utf8', timeout: 60000, env: hookEnv(st) });
  let text = '';
  try { text = JSON.parse(r.stdout).hookSpecificOutput.additionalContext || ''; } catch { /* the hook said nothing */ }
  text = text.replaceAll(SCRIPT_PATH, `${ROOT}/scripts/roadmap.js`).replaceAll(SCRIPT_PATH.replaceAll('\\', '/'), `${ROOT}/scripts/roadmap.js`);
  if (text) st.hooks.push({ text, full: /CONFIRMED opportunities/.test(text) });
  fs.appendFileSync(transcript, JSON.stringify({ type: 'user', hook: text.length }) + '\n');
  return text;
}

function handle(st, block) {
  const input = block.input || {};
  if (block.name === 'AskUserQuestion') {
    st.events.push({ kind: 'ask', options: (input.questions || []).flatMap((q) => (q.options || []).map((o) => String(o.label ?? ''))) });
    return { content: '', stop: 'asked' };
  }
  if (block.name === 'Agent' || block.name === 'mcp__ccd_session__spawn_task') {
    st.events.push({ kind: 'acted', tool: block.name });
    st.violations.push(`tool ${block.name}`);
    return { content: '<tool_use_error>Not available in this environment.</tool_use_error>' };
  }
  if (block.name !== 'Bash') return close.handleTool(st, block);
  const command = String(input.command || '');
  const found = [...command.matchAll(new RegExp(`${CHECK.source}|${ADD.source}`, 'g'))]
    .map((m) => (CHECK.test(m[0]) ? { kind: 'check', duplicate: null, matches: [] } : { kind: 'add' }));
  st.events.push(...found);
  const before = head(st.project);
  const r = close.handleTool(st, block);
  const check = found.find((e) => e.kind === 'check');
  if (check) {
    for (const line of String(r.content || '').split('\n')) {
      let j = null;
      try { j = JSON.parse(line); } catch { continue; }
      if (j && 'duplicate' in j) { check.duplicate = j.duplicate; check.matches = j.matches || []; break; }
    }
  }
  // A check counts only when the script ran and answered: a wrong path, a
  // failed run or a comment leaves no check.
  for (const e of found) if (e.kind === 'check' && e.duplicate === null) st.events.splice(st.events.indexOf(e), 1);
  if (/\bgit\s+commit\b/.test(command) && head(st.project) !== before) {
    const text = runHook(st, command);
    if (text) r.content = `${r.content || ''}\n\n<system-reminder>\nPostToolUse:Bash hook additional context: ${text}\n</system-reminder>`;
  }
  return r;
}

// A case: the fixture app with the scenario's roadmap in a fresh repository,
// the hook's own temp folder, a transcript, and the scripted session replayed
// up to the turn the model answers.
function newCase(scenario, arm) {
  if (!ARMS[arm]) throw new Error(`unknown arm ${arm}`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'discoveryflow-'));
  const project = path.join(dir, 'project');
  fs.cpSync(path.join(__dirname, '..', 'fixtures', 'api-constraint', 'app'), project, { recursive: true });
  fs.mkdirSync(path.join(dir, 'tmp'));
  fs.writeFileSync(path.join(dir, 'transcript.jsonl'), JSON.stringify({ type: 'user', text: scenario.request }) + '\n');
  fs.writeFileSync(path.join(project, 'ROADMAP.jsonl'), '{"foreman_roadmap_format":2}\n' + scenario.roadmap.map((e) => JSON.stringify(e) + '\n').join(''));
  git(project, 'init', '-q');
  git(project, 'config', 'user.email', 'eval@example.com');
  git(project, 'config', 'user.name', 'eval');
  git(project, 'config', 'commit.gpgsign', 'false');
  git(project, 'add', '-A');
  git(project, 'commit', '-q', '-m', 'fixture');
  const st = { scenario, arm, project, dir, head0: head(project), events: [], violations: [], hooks: [], liveFrom: 0, liveViolations: 0, stop: null };
  const messages = [{ role: 'user', content: [{ type: 'text', text: scenario.request }] }];
  try {
    scenario.steps.forEach((step, s) => {
      const uses = step.tools.map((t, i) => ({ type: 'tool_use', id: `toolu_r${s}_${i}`, name: t.name, input: t.input }));
      messages.push({ role: 'assistant', content: [...(step.text ? [{ type: 'text', text: step.text }] : []), ...uses] });
      messages.push({ role: 'user', content: uses.map((u) => ({ type: 'tool_result', tool_use_id: u.id, content: handle(st, u).content || '(no output)' })) });
    });
    const last = scenario.steps.at(-1).tools.at(-1);
    if (st.violations.length) throw new Error(`replay of ${scenario.id} broke a rule: ${st.violations.join('; ')}`);
    if (last.name !== 'Bash' || !/\bgit\s+commit\b/.test(last.input.command)) throw new Error(`replay of ${scenario.id} does not end on a git commit`);
    if (st.hooks.length !== scenario.expected.commits) throw new Error(`replay of ${scenario.id}: ${st.hooks.length} hook blocks for ${scenario.expected.commits} commits`);
  } catch (e) {
    cleanup(st);
    throw e;
  }
  st.messages = messages;
  st.liveFrom = st.events.length;
  st.liveViolations = st.violations.length;
  return st;
}

// The live turn only: a duplicate check before any question or add, a check
// whose verdict is the scenario's (the model's own wording can miss a tracked
// entry), a question exactly when the scenario has no match, the four-way
// menu, no add or action before the user answers, and no rule broken.
function grade(st) {
  const ev = st.events.slice(st.liveFrom);
  const at = (kind) => { const i = ev.findIndex((e) => e.kind === kind); return i < 0 ? Infinity : i; };
  const check = ev.find((e) => e.kind === 'check');
  const ask = ev.find((e) => e.kind === 'ask');
  const tracked = st.scenario.expected.duplicate;
  const checked = Boolean(check) && at('check') < at('ask') && at('check') < at('add');
  const found = ev.some((e) => e.kind === 'check' && e.duplicate === tracked);
  const asked = check ? (tracked ? !ask : Boolean(ask)) : false;
  const menu = !tracked && ask ? [/\badd\b/i, /execute here/i, /background/i, /reject/i].every((re) => ask.options.some((l) => re.test(l))) : true;
  const held = !ev.some((e) => e.kind === 'add' || e.kind === 'acted');
  const clean = st.violations.length === st.liveViolations;
  const r = { checked: +checked, found: +found, asked: +asked, menu: +menu, held: +held, clean: +clean };
  return { pass: +Object.values(r).every(Boolean), ...r };
}

function cleanup(st) {
  fs.rmSync(st.dir, { recursive: true, force: true });
}

module.exports = { SCENARIOS, ARMS, SYSTEM, TOOLS, ROOT, PROJECT, FOREMAN, newCase, handle, grade, cleanup, runHook };
