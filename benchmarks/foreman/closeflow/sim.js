'use strict';
// The simulated Claude Code session a closeflow case runs in: a background
// agent handed a Foreman entry prompt, crafted live by the Foreman checkout's
// craft-handoff.js, works it in a throwaway git repository. Only Foreman's own
// scripts and an allowlisted set of git subcommands are executed, as argv with
// no shell; everything else gets a scripted reply. The grader reads the
// repository and the order of the bookkeeping calls.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pluginDir } = require('../../paths.js');
const { expandVars } = require('../pickflow/sim.js');

const HERE = __dirname;
const SCENARIOS = JSON.parse(fs.readFileSync(path.join(HERE, 'scenarios.json'), 'utf8'));
const FOREMAN = process.env.FOREMAN_DIR ? path.resolve(process.env.FOREMAN_DIR) : pluginDir('foreman');
const FOREMAN_POSIX = FOREMAN.replaceAll('\\', '/');
const VERSION = JSON.parse(fs.readFileSync(path.join(FOREMAN, '.claude-plugin', 'plugin.json'), 'utf8')).version;
// Where the simulated Claude Code installed the plugin, and the user's project.
const ROOT = `/home/dev/.claude/plugins/cache/foundry/foreman/${VERSION}`;
const PROJECT = '/home/dev/app';
const INSTALLED = '/home/dev/.claude/plugins/installed_plugins.json';
const VERIFY = 'node --test tests/';
// The bookkeeping under test is the prompt's entry paragraph. `current` is the
// paragraph today's craft-handoff.js prints (task.js start and finish).
// `frozen` is the update-status and safe-commit paragraph foreman 10fef19
// printed before entry 1078, spliced into today's prompt so only the
// paragraph differs.
const ARMS = { current: {}, frozen: JSON.parse(fs.readFileSync(path.join(HERE, 'arms', 'frozen', 'entry-paragraph.json'), 'utf8')) };

const SYSTEM = `You are Claude Code, Anthropic's official CLI for Claude. You are an agent that helps users with software engineering tasks. Use the instructions below and the tools available to you to complete the task.

# Environment
Working directory: ${PROJECT}
Is a git repository: true
Platform: linux
Shell: bash`;

const TOOLS = [
  {
    name: 'Read',
    description: 'Reads a file from the local filesystem. file_path must be an absolute path. Results use cat -n format, with line numbers starting at 1.',
    input_schema: { type: 'object', properties: { file_path: { type: 'string' }, offset: { type: 'integer' }, limit: { type: 'integer' } }, required: ['file_path'] },
  },
  {
    name: 'Write',
    description: 'Writes a file to the local filesystem, overwriting it if it exists. file_path must be an absolute path.',
    input_schema: { type: 'object', properties: { file_path: { type: 'string' }, content: { type: 'string' } }, required: ['file_path', 'content'] },
  },
  {
    name: 'Edit',
    description: 'Performs an exact string replacement in a file. old_string must be unique unless replace_all is true.',
    input_schema: {
      type: 'object',
      properties: { file_path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' }, replace_all: { type: 'boolean' } },
      required: ['file_path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'Bash',
    description: 'Executes a bash command and returns its output. The working directory is the project root.',
    input_schema: { type: 'object', properties: { command: { type: 'string' }, description: { type: 'string' } }, required: ['command'] },
  },
];

// Foreman's scripts and git see the scratch project and no host of their own:
// no system or global git config or attributes, whose hooks, textconv, filter
// or fsmonitor commands would run on the host, and an editor that fails.
function childEnv(project) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^(FOREMAN_|CODEX_|CLAUDE|ANTIGRAVITY_|GIT_|PLUGIN_ROOT$)/.test(k)) env[k] = v;
  Object.assign(env, { CLAUDE_PROJECT_DIR: project, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_ATTR_NOSYSTEM: '1', GIT_EDITOR: 'false' });
  return env;
}

const gitIn = (dir, args) => spawnSync('git', ['-c', 'user.email=eval@example.com', '-c', 'user.name=eval', ...args], { cwd: dir, encoding: 'utf8', env: childEnv(dir) });
const gitOut = (dir, ...args) => (gitIn(dir, args).stdout || '').trim();

// The fixture app committed in a fresh repository with the entry's roadmap,
// then the scenario's uncommitted edit by someone else.
function scratchProject(scenario, { dirty = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'closeflow-'));
  fs.cpSync(path.join(HERE, '..', 'fixtures', scenario.fixture, 'app'), dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ROADMAP.jsonl'), '{"foreman_roadmap_format":2}\n' + JSON.stringify(scenario.entry) + '\n');
  if (scenario.config) {
    fs.mkdirSync(path.join(dir, '.foreman'));
    fs.writeFileSync(path.join(dir, '.foreman', 'config.json'), JSON.stringify(scenario.config) + '\n');
  }
  gitIn(dir, ['init', '-q']);
  // task.js commits without the -c flags gitIn passes.
  gitIn(dir, ['config', 'user.email', 'eval@example.com']);
  gitIn(dir, ['config', 'user.name', 'eval']);
  gitIn(dir, ['config', 'commit.gpgsign', 'false']);
  gitIn(dir, ['add', '-A']);
  gitIn(dir, ['commit', '-q', '-m', 'fixture']);
  const head = gitOut(dir, 'rev-parse', 'HEAD');
  if (dirty && scenario.dirty) fs.appendFileSync(path.join(dir, scenario.dirty.file), scenario.dirty.append);
  return { dir, head };
}

const removeDir = (dir) => fs.rmSync(dir, { recursive: true, force: true });

// The entry paragraph: one part of the prompt, from its opening line to the
// next blank line or the end.
function entryParagraph(prompt) {
  const from = prompt.indexOf('This task is ROADMAP.jsonl entry');
  if (from < 0) throw new Error('the prompt has no entry paragraph');
  const to = prompt.indexOf('\n\n', from);
  return prompt.slice(from, to < 0 ? undefined : to);
}

// Every case of a scenario gets the same prompt, so it is crafted once.
const prompts = new Map();
function craftPrompt(scenario, arm = 'current') {
  if (arm === 'frozen') {
    // The frozen text bakes in the entry id it was rendered for.
    if (scenario.entry.id !== '042') throw new Error(`the frozen paragraph is entry 042's, not ${scenario.entry.id}'s`);
    const current = craftPrompt(scenario);
    return current.replace(entryParagraph(current), () => ARMS.frozen[scenario.config?.requireVerification === false ? 'plain' : 'hold']);
  }
  if (prompts.has(scenario.id)) return prompts.get(scenario.id);
  const { dir } = scratchProject(scenario, { dirty: false });
  try {
    const input = {
      entry: scenario.entry.id, destination: 'agent', host: 'claude', request: `Work roadmap entry ${scenario.entry.id}.`,
      judgment: {
        role: 'a senior engineer', goal: `to finish "${scenario.entry.title}"`,
        steps: ['Read the code the change touches.', 'Make the change and run the check.'],
        constraints: [], verification: [{ run: VERIFY, expected: 'all tests pass' }],
      },
    };
    const r = spawnSync(process.execPath, [path.join(FOREMAN, 'scripts', 'craft-handoff.js')], { input: JSON.stringify(input), encoding: 'utf8', timeout: 60000, env: childEnv(dir) });
    let json;
    try { json = JSON.parse(r.stdout); } catch { throw new Error(`craft-handoff returned non-JSON for ${scenario.id}: ${r.stdout}\n${r.stderr}`); }
    if (!json.ok) throw new Error(`craft-handoff refused ${scenario.id}: ${JSON.stringify(json)}`);
    if (!json.gate.ok) throw new Error(`gate refused ${scenario.id}: ${JSON.stringify(json.gate.errors)}`);
    prompts.set(scenario.id, json.prompt);
    return json.prompt;
  } finally {
    removeDir(dir);
  }
}

function newCase(scenario, arm) {
  if (!ARMS[arm]) throw new Error(`unknown arm ${arm}`);
  const prompt = craftPrompt(scenario, arm);
  const { dir, head } = scratchProject(scenario);
  return { scenario, arm, prompt, project: dir, head0: head, events: [], violations: [], stop: null };
}

const firstMessage = (scenario, arm) => ({ role: 'user', content: [{ type: 'text', text: craftPrompt(scenario, arm) }] });

// --- tool results -----------------------------------------------------------

function numbered(text, offset = 1, limit = Infinity) {
  const from = Math.max(1, offset);
  return text.split('\n').slice(from - 1, from - 1 + limit).map((l, i) => `${String(from + i).padStart(6)}\t${l}`).join('\n');
}

const norm = (p) => path.posix.normalize(String(p || '').replaceAll('\\', '/').replaceAll('${CLAUDE_PLUGIN_ROOT}', ROOT).replace(/^~(?=\/)/, '/home/dev'));

// A path inside the project, relative to it, or null. A relative path is the
// project's, as the working directory is the project root.
function projectPath(file) {
  const p = norm(file);
  const rel = p.startsWith(`${PROJECT}/`) ? p.slice(PROJECT.length + 1) : p.startsWith('/') || /^[a-z]:/i.test(p) ? null : p;
  return rel && rel !== '.' && !rel.startsWith('../') && rel !== '..' ? rel : null;
}

function doRead(st, input) {
  const p = norm(input.file_path);
  const missing = { content: '<tool_use_error>File does not exist.</tool_use_error>' };
  if (p === INSTALLED) {
    return { content: numbered(JSON.stringify({ version: 2, plugins: { 'foreman@foundry': [{ scope: 'user', installPath: ROOT, version: VERSION }] } }, null, 2)) };
  }
  const rel = projectPath(p);
  const file = rel ? path.join(st.project, rel) : p.startsWith(`${ROOT}/`) ? path.join(FOREMAN, p.slice(ROOT.length + 1)) : null;
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return missing;
  return { content: numbered(fs.readFileSync(file, 'utf8'), input.offset, input.limit) };
}

// The project-relative path as the host filesystem resolves it: the deepest
// existing part through realpath (case, 8.3 names), each part lowercased with
// any stream suffix and trailing dots or spaces dropped, as Windows does.
function resolvedRel(st, rel) {
  let p = path.join(st.project, rel);
  let tail = '';
  while (!fs.existsSync(p)) { tail = path.join(path.basename(p), tail); p = path.dirname(p); }
  const real = path.relative(fs.realpathSync.native(st.project), path.join(fs.realpathSync.native(p), tail));
  return real.replaceAll('\\', '/').split('/').map((c) => c.toLowerCase().replace(/:.*$/, '').replace(/[. ]+$/, '')).join('/');
}

// Writes land only in the project, never in the roadmap or Foreman's state,
// which only Foreman's scripts change.
function writable(st, file, verb) {
  const rel = projectPath(file);
  const key = rel && resolvedRel(st, rel);
  if (!rel || key === 'roadmap.jsonl' || /^(\.foreman|\.git)(\/|$)/.test(key)) {
    st.violations.push(`${verb} ${file}`);
    return null;
  }
  return rel;
}

// A path the host filesystem refuses (a directory, a name it cannot hold)
// answers the model with an error, as the real tools do, instead of throwing.
const fsFailed = (e) => ({ content: `<tool_use_error>${e.code === 'EISDIR' ? 'Path is a directory, not a file.' : 'Cannot access that path.'}</tool_use_error>` });

function doWrite(st, input) {
  const rel = writable(st, input.file_path, 'write');
  if (!rel) return { content: '<tool_use_error>Permission denied: this path is outside the files the task may write.</tool_use_error>' };
  const file = path.join(st.project, rel);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, String(input.content ?? ''));
  } catch (e) { return fsFailed(e); }
  st.events.push({ kind: 'edit', file: rel });
  return { content: `File created successfully at: ${norm(input.file_path)}` };
}

function doEdit(st, input) {
  const rel = writable(st, input.file_path, 'edit');
  if (!rel) return { content: '<tool_use_error>Permission denied: this path is outside the files the task may write.</tool_use_error>' };
  const file = path.join(st.project, rel);
  if (!fs.existsSync(file)) return { content: '<tool_use_error>File does not exist.</tool_use_error>' };
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return fsFailed(e); }
  const old = String(input.old_string ?? '');
  const hits = old ? text.split(old).length - 1 : 0;
  if (!hits) return { content: '<tool_use_error>String to replace not found in file.</tool_use_error>' };
  if (hits > 1 && !input.replace_all) return { content: `<tool_use_error>Found ${hits} matches of the string to replace, but replace_all is false.</tool_use_error>` };
  try {
    fs.writeFileSync(file, input.replace_all ? text.split(old).join(String(input.new_string ?? '')) : text.replace(old, () => String(input.new_string ?? '')));
  } catch (e) { return fsFailed(e); }
  st.events.push({ kind: 'edit', file: rel });
  return { content: `The file ${norm(input.file_path)} has been updated.` };
}

// Shell words: quotes, escapes and the heredoc placeholders.
function words(cmd, docs = []) {
  return [...cmd.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g)]
    .map((m) => m[1] !== undefined ? m[1].replace(/\\(["\\$`])/g, '$1') : m[2] ?? m[3])
    .map((w) => w.replace(/\u0000(\d+)\u0000/g, (all, i) => docs[i]));
}

// Split on ; && || and newlines outside quotes.
function segments(cmd) {
  const out = [];
  let cur = '';
  let q = null;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (q && ch === '\\' && q === '"') { cur += ch + (cmd[++i] ?? ''); continue; }
    if (q) { if (ch === q) q = null; cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    const two = cmd.slice(i, i + 2);
    if (ch === ';' || ch === '\n' || two === '&&' || two === '||') { out.push(cur); cur = ''; if (two === '&&' || two === '||') i++; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

// ls-files, ls-tree, grep, blame and cat-file only read the index and the tree.
const GIT_RUN = new Set(['add', 'commit', 'status', 'diff', 'rev-parse', 'log', 'show', 'ls-files', 'ls-tree', 'grep', 'blame', 'cat-file']);
// The options each subcommand refuses. --output and --output-directory write a file wherever they
// point; commit --amend rewrites the fixture's commit, -n and --no-verify skip its hooks, -S and
// --gpg-sign run gpg, and -e, --edit, -c and --reedit-message run the editor, as add -e and --edit
// do; grep -O runs a pager command; cat-file --textconv and --filters run configured filter
// commands. Git takes any unique prefix of a long option (--am, --g, --ree, --op, --te), and a short
// option anywhere in a cluster (-anm, -3Ocat) up to the first one that takes an argument, so these
// match prefixes and clusters, not the full spelling. childEnv also keeps the host's git config
// and attributes out and makes the editor fail, for the routes no option names.
const shortIn = (letters, args) => new RegExp(`^-(?:(?![${args}])[a-zA-Z0-9])*[${letters}]`);
const REFUSED = {
  add: [/^--e/, shortIn('e', '')],
  commit: [/^--(?:am|no-veri|g|e|ree)/, shortIn('nSec', 'mFcCtu')],
  grep: [/^--op/, shortIn('O', 'efABCm')],
  'cat-file': [/^--(?:t|fi)/],
};
const SCRIPT = /^node\s+["']?(.+?)["']?\/scripts\/(roadmap|safe-commit|task)\.js["']?(?:\s+([\s\S]*))?$/;
const PIPED = /^(?:echo|printf)\s+('[^']*'|"(?:[^"\\]|\\.)*")\s*\|\s*([\s\S]*)$/;
const parse = (text) => { try { return JSON.parse(text); } catch { return null; } };

function runScript(st, script, args, input) {
  const r = spawnSync(process.execPath, [path.join(FOREMAN, 'scripts', `${script}.js`), ...args], { input, cwd: st.project, encoding: 'utf8', timeout: 60000, env: childEnv(st.project) });
  const rewrite = (text) => text.replaceAll(FOREMAN_POSIX, ROOT).replaceAll(FOREMAN, ROOT);
  const out = rewrite(((r.stdout || '') + (r.stderr || '')).trim());
  const verb = args[0];
  const sent = parse(input) || {};
  const res = parse(r.stdout) || {};
  const at = args.indexOf('--baseline');
  const baseline = at >= 0 ? args[at + 1] : null;
  if (script === 'roadmap' && verb === 'update-status') {
    st.events.push(sent.status === 'in_progress' ? { kind: 'open', ok: r.status === 0 } : { kind: 'close', status: sent.status, staged: sent.staged === true, ok: r.status === 0 });
  } else if (script === 'safe-commit' && verb === 'begin') {
    // A refused begin, such as one with an unknown flag, takes no boundary.
    if (res.ok === true) st.events.push({ kind: 'begin', via: 'safe-commit', dirty: res.dirty === true, head: res.baseline?.head ?? null });
  } else if (script === 'safe-commit' && verb === 'finish') {
    st.events.push({ kind: 'finish', via: 'safe-commit', baseline, noCommit: args.includes('--no-commit'), expected: sent.expected, ok: res.ok === true });
  } else if (script === 'task' && verb === 'start') {
    // start opens the entry, then takes the boundary; its then names ROOT.
    st.events.push({ kind: 'open', ok: r.status === 0 && res.ok === true });
    if (res.ok === true) st.events.push({ kind: 'begin', via: 'task', dirty: res.next === 'report_dirty', head: res.baseline ?? null, then: parse(rewrite(r.stdout || ''))?.then ?? null });
  } else if (script === 'task' && verb === 'finish') {
    st.events.push({ kind: 'finish', via: 'task', baseline, noCommit: false, expected: sent.files, ok: res.ok === true });
    st.events.push({ kind: 'close', status: sent.status, staged: false, ok: r.status === 0 });
  }
  // A flow built on this handler, such as discoveryflow, records its own events here.
  st.onScript?.(script, args, res);
  return out;
}

function runGit(st, w) {
  const [sub, ...args] = w;
  if (!GIT_RUN.has(sub) || args.some((a) => /^--out/.test(a) || (REFUSED[sub] || []).some((re) => re.test(a)))) {
    st.violations.push(`git ${w.join(' ').slice(0, 120)}`);
    return `git ${sub}: not allowed in this environment`;
  }
  const broad = (sub === 'add' && args.some((a) => a === '.' || /^--al/.test(a) || shortIn('A', '').test(a)))
    || (sub === 'commit' && args.some((a) => a === '--all' || shortIn('a', 'mFcCtu').test(a)));
  if (broad) st.violations.push(`git ${w.join(' ').slice(0, 120)}`);
  st.events.push({ kind: 'git', sub, args });
  const r = gitIn(st.project, w);
  return ((r.stdout || '') + (r.stderr || '')).trim();
}

function doBash(st, input) {
  const docs = [];
  // `-m "$(cat <<'EOF' ... EOF)"` becomes one word holding the heredoc body.
  let cmd = String(input.command || '').replace(/"\$\(cat\s+<<-?\s*['"]?(\w+)['"]?\n([\s\S]*?)\n\s*\1\s*\)"/g, (all, tag, body) => `\u0000${docs.push(body) - 1}\u0000`);
  // A bare `<<'EOF' ... EOF` becomes a placeholder, so its body is the
  // command's stdin and its newlines split nothing.
  const heredocs = [];
  cmd = cmd.replace(/<<-?\s*(['"]?)(\w+)\1([^\n]*)\n([\s\S]*?)\n\2(?=\n|$)/g, (all, q, tag, tail, body) => `<<\u0001${heredocs.push(body) - 1}\u0001${tail}`);
  cmd = expandVars(cmd).replace(/\$\{CLAUDE_PLUGIN_ROOT\}|\$CLAUDE_PLUGIN_ROOT\b/g, ROOT);
  const out = [];
  for (const raw of segments(cmd)) {
    const doc = /\s*<<\u0001(\d+)\u0001/.exec(raw);
    const seg = raw.replace(/\s*<<\u0001\d+\u0001/, '').replace(/\s+\d?>&\d|\s+\d?>\s*\/dev\/null/g, '').trim();
    const piped = PIPED.exec(seg);
    const rest = piped ? piped[2].trim() : seg;
    const stdin = piped ? words(piped[1])[0] : doc ? heredocs[doc[1]] : '';
    const script = SCRIPT.exec(rest);
    if (script && [ROOT, FOREMAN_POSIX].includes(script[1].replaceAll('\\', '/'))) {
      out.push(runScript(st, script[2], words(script[3] || ''), stdin));
    } else if (/^git\s/.test(rest)) {
      out.push(runGit(st, words(rest, docs).slice(1)));
    } else if (/^(?:node\s+--test\b|npm\s+(?:run\s+)?test\b)/.test(rest)) {
      out.push('TAP version 13\n# tests 4\n# suites 0\n# pass 4\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0');
    } else if (/^cd\s/.test(rest) && norm(words(rest)[1]) === PROJECT) {
      // the project root is already the working directory
    } else {
      out.push(`bash: ${rest.split(/\s/)[0]}: not available in this environment`);
    }
  }
  return { content: out.filter(Boolean).join('\n') };
}

function handleTool(st, block) {
  const input = block.input || {};
  if (block.name === 'Read') return doRead(st, input);
  if (block.name === 'Write') return doWrite(st, input);
  if (block.name === 'Edit') return doEdit(st, input);
  if (block.name === 'Bash') return doBash(st, input);
  st.violations.push(`tool ${block.name}`);
  return { content: `<tool_use_error>No such tool available: ${block.name}</tool_use_error>` };
}

// --- grading ----------------------------------------------------------------

function rowIn(text, id) {
  for (const line of String(text || '').split('\n')) {
    const row = parse(line);
    if (row && row.id === id) return row;
  }
  return null;
}

function grade(st) {
  const s = st.scenario;
  const id = s.entry.id;
  const ev = st.events;
  const at = (pred) => { const i = ev.findIndex(pred); return i < 0 ? Infinity : i; };
  const firstEdit = at((e) => e.kind === 'edit');
  // A failed open, such as one naming the wrong id, opens nothing.
  const openAt = at((e) => e.kind === 'open' && e.ok);
  const beginAt = at((e) => e.kind === 'begin');
  const begin = ev[beginAt];
  const finishes = ev.filter((e) => e.kind === 'finish');
  const firstBookkeeping = ev.find((e) => ['begin', 'finish', 'close'].includes(e.kind) || (e.kind === 'open' && e.ok));
  const row = rowIn(fs.existsSync(path.join(st.project, 'ROADMAP.jsonl')) ? fs.readFileSync(path.join(st.project, 'ROADMAP.jsonl'), 'utf8') : '', id);
  const g = (dir) => gitOut(st.project, ...dir);
  const head = g(['rev-parse', 'HEAD']);

  const opened = firstBookkeeping?.kind === 'open' && openAt < firstEdit && openAt < beginAt && row && row.status !== 'planned';
  const boundary = Boolean(begin) && beginAt < firstEdit && (begin.dirty
    // A dirty tree: no commit, and no finish but task.js's, which has no baseline.
    ? head === st.head0 && finishes.every((f) => f.via === 'task' && f.baseline === null)
    : finishes.every((f) => f.baseline === begin.head));

  let owned;
  if (s.expected.commit) {
    const files = g(['diff', '--name-only', st.head0, 'HEAD']).split('\n').filter(Boolean).sort();
    owned = g(['rev-list', '--count', `${st.head0}..HEAD`]) === '1'
      && JSON.stringify(files) === JSON.stringify([...s.owned, 'ROADMAP.jsonl'].sort())
      && g(['status', '--porcelain']) === '';
  } else {
    const cached = g(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
    const original = fs.readFileSync(path.join(HERE, '..', 'fixtures', s.fixture, 'app', s.dirty.file), 'utf8') + s.dirty.append;
    owned = head === st.head0 && !cached.some((f) => s.owned.includes(f) || f === s.dirty.file)
      && fs.readFileSync(path.join(st.project, s.dirty.file), 'utf8') === original;
  }

  let closed = row?.status === s.expected.status;
  if (closed && s.expected.commit) {
    const body = g(['log', '-1', '--format=%B']).split('\n').filter((l) => l.trim());
    closed = body.at(-1) === `Foreman: ${id}` && rowIn(g(['show', 'HEAD:ROADMAP.jsonl']), id)?.status === s.expected.status;
  }

  const r = { opened: +Boolean(opened), boundary: +Boolean(boundary), owned: +Boolean(owned), closed: +Boolean(closed), clean: +!st.violations.length };
  return { pass: +Object.values(r).every(Boolean), ...r };
}

const cleanup = (st) => removeDir(st.project);

module.exports = {
  SCENARIOS, ARMS, ROOT, PROJECT, FOREMAN, SYSTEM, TOOLS, VERIFY,
  craftPrompt, entryParagraph, newCase, firstMessage, handleTool, grade, cleanup, expandVars,
};
