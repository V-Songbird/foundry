'use strict';
// The simulated Claude Code session a pickflow case runs in: the tools the
// model sees, the scripted result of every call, the P1 `step pick` prototype
// and the grader. Nothing the model writes is executed. Skill files come from
// the Foreman checkout; menu, list and trial-log outputs are real runs of
// Foreman's own scripts on the scenario's fixture roadmap.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pluginDir } = require('../../paths.js');

const HERE = __dirname;
const SCENARIOS = JSON.parse(fs.readFileSync(path.join(HERE, 'scenarios.json'), 'utf8'));
// Where the simulated Claude Code installed the plugin, and the user's project.
const ROOT = '/home/dev/.claude/plugins/cache/foundry/foreman/4.1.0';
const PROJECT = '/home/dev/app';
// Claude Code states today's date; pick.md's staleness offer needs it. The
// fixtures' in-progress and waiting rows are under 30 days old on this date.
const TODAY = '2026-03-20';
const FOREMAN = process.env.FOREMAN_DIR ? path.resolve(process.env.FOREMAN_DIR) : pluginDir('foreman');

// An arm swaps skill files; everything it does not name is read from Foreman.
// `real` reads every file and runs every script from another Foreman checkout,
// such as a topic branch: its `step pick` is the real one, run on a scratch
// git copy of the fixture with the trial log on.
const REAL = process.env.PICKFLOW_REAL_DIR
  ? path.resolve(process.env.PICKFLOW_REAL_DIR)
  : path.resolve(HERE, '..', '..', '..', '.private', 'foreman-step-pick');
const ARMS = {
  // `prose` is frozen at foreman 4200026 (4.1.0), before entry 1076 moved pick.md
  // to action codes: pick.md, destination-question.md and the sibling files they
  // link, which changed in the same move. `p1` swaps nothing: it reads Foreman's
  // current code-table files, with the `step pick` prototype below.
  prose: Object.fromEntries(
    ['pick', 'destination-question', 'accept', 'resume', 'defer', 'hint', 'reconcile', 'prepare-increments']
      .map((f) => [`skills/roadmap/${f}.md`, path.join(HERE, 'arms', 'prose', `${f}.md`)])
  ),
  p1: {},
  real: { root: REAL },
};

const Q2_NAMES = ['Execute here', 'Execute here, split by check', 'Execute with a background agent', 'Copy prompt to clipboard'];
const Q2_DEST = ['here', 'split', 'agent', 'clipboard'];

const SYSTEM = `You are Claude Code, Anthropic's official CLI for Claude. You are an interactive agent that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

# Environment
Working directory: ${PROJECT}
Is a git repository: true
Platform: linux
Shell: bash
Today's date: ${TODAY}`;

const TOOLS = [
  {
    name: 'Read',
    description: 'Reads a file from the local filesystem. file_path must be an absolute path. Results use cat -n format, with line numbers starting at 1.',
    input_schema: {
      type: 'object',
      properties: { file_path: { type: 'string' }, offset: { type: 'integer' }, limit: { type: 'integer' } },
      required: ['file_path'],
    },
  },
  {
    name: 'Bash',
    description: 'Executes a bash command and returns its output. The working directory is the project root.',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string' }, description: { type: 'string' } },
      required: ['command'],
    },
  },
  {
    name: 'Skill',
    description: 'Invoke a skill by name. Available skills: foreman:foreman, foreman:roadmap, foreman:survey, foreman:init, foreman:craft-prompt.',
    input_schema: {
      type: 'object',
      properties: { skill: { type: 'string' }, args: { type: 'string' } },
      required: ['skill'],
    },
  },
  // A Claude Code session can delegate; without these the destination rules
  // rightly caution against the background agent. Calling either before the
  // destination question is a violation.
  {
    name: 'Agent',
    description: 'Launch a new agent to handle a task autonomously. Set run_in_background to run it in the background.',
    input_schema: {
      type: 'object',
      properties: { description: { type: 'string' }, prompt: { type: 'string' }, run_in_background: { type: 'boolean' } },
      required: ['description', 'prompt'],
    },
  },
  {
    name: 'TaskCreate',
    description: 'Create a task in the session task list.',
    input_schema: {
      type: 'object',
      properties: { subject: { type: 'string' }, description: { type: 'string' } },
      required: ['subject', 'description'],
    },
  },
  {
    name: 'AskUserQuestion',
    description: 'Ask the user questions during execution. Each question has 2-4 options; the user can always pick "Other" to type their own answer, so never author one.',
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array', minItems: 1, maxItems: 4,
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              header: { type: 'string' },
              multiSelect: { type: 'boolean' },
              options: {
                type: 'array', minItems: 2, maxItems: 4,
                items: {
                  type: 'object',
                  properties: { label: { type: 'string' }, description: { type: 'string' }, preview: { type: 'string' } },
                  required: ['label', 'description'],
                },
              },
            },
            required: ['question', 'header', 'options', 'multiSelect'],
          },
        },
      },
      required: ['questions'],
    },
  },
];

// The hook reading Claude Code appends after a tool call once the session is
// past Foreman's line. P1 reads the same state inside `step pick` instead.
const CONTEXT_READING = '\n\n<system-reminder>\nPostToolUse:Bash hook additional context: [Foreman] Context reading for the destination question: this session is about 41% full (141,959 tokens against this session\'s 350,000-token compaction point), at or above Foreman\'s 25% line. If you reach "How do you want to run this?" this turn, apply the high-context rule in skills/roadmap/destination-question.md. This is a reading, not an instruction to the user — never quote the number at them unless they ask.\n</system-reminder>';

// The same reading, worded as the step-pick branch's hook words it.
const CONTEXT_READING_REAL = CONTEXT_READING.replace(
  'skills/roadmap/destination-question.md.',
  'skills/roadmap/destination-question.md; in a roadmap pick, pass --context-high to roadmap.js step pick.'
);

const fixtureDir = (s) => path.join(HERE, 'fixtures', s.fixture);

// `st` (a case) points a real-arm run at that arm's checkout and the case's
// scratch project; without it the script reads the fixture in place.
function runScript(scenario, script, args, st = null) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^(FOREMAN_|CODEX_|CLAUDE|ANTIGRAVITY_|PLUGIN_ROOT$)/.test(k)) env[k] = v;
  env.CLAUDE_PROJECT_DIR = st?.project || fixtureDir(scenario);
  const r = spawnSync(process.execPath, [path.join(st?.root || FOREMAN, 'scripts', script), ...args], { env, encoding: 'utf8', timeout: 30000 });
  return { out: (r.stdout || '') + (r.stderr || ''), code: r.status };
}

// The real arm's project: the fixture committed in a fresh repository, the
// trial log on, and an untracked file when the scenario's tree is dirty.
function scratchProject(scenario) {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'pickflow-'));
  fs.cpSync(fixtureDir(scenario), dir, { recursive: true });
  fs.mkdirSync(path.join(dir, '.foreman'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.foreman', 'config.json'), '{"trialLog":true}\n');
  const git = (...a) => spawnSync('git', ['-c', 'user.email=eval@example.com', '-c', 'user.name=eval', ...a], { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'fixture');
  if (scenario.dirty) fs.writeFileSync(path.join(dir, 'notes.txt'), 'uncommitted\n');
  return dir;
}

// A skill file as the model would see it: an arm's swap, or Foreman's own.
function skillFile(arm, rel) {
  const p = ARMS[arm][rel] || path.join(ARMS[arm].root || FOREMAN, ...rel.split('/'));
  return fs.existsSync(p) && fs.statSync(p).isFile() ? fs.readFileSync(p, 'utf8') : null;
}

// Claude Code fills ${CLAUDE_PLUGIN_ROOT} in a skill body, not in a Read.
function skillBody(arm, rel) {
  return skillFile(arm, rel).replace(/^---\n[\s\S]*?\n---\n+/, '').replaceAll('${CLAUDE_PLUGIN_ROOT}', ROOT);
}

function firstMessage(scenario, arm) {
  return {
    role: 'user',
    content: [
      { type: 'text', text: `<command-message>foreman:foreman</command-message>\n<command-name>/foreman:foreman</command-name>\n<command-args>${scenario.request}</command-args>` },
      { type: 'text', text: `Base directory for this skill: ${ROOT}/skills/foreman\n\n${skillBody(arm, 'skills/foreman/SKILL.md')}\n\nARGUMENTS: ${scenario.request}` },
    ],
  };
}

function newCase(scenario, arm) {
  if (!ARMS[arm]) throw new Error(`unknown arm ${arm}`);
  const real = ARMS[arm].root ? { root: ARMS[arm].root, project: scratchProject(scenario) } : {};
  const menuOut = runScript(scenario, 'roadmap.js', ['next-candidates', '--menu']).out;
  return {
    ...real,
    scenario, arm, menuOut, menu: JSON.parse(menuOut),
    q1s: [], q2: null, events: [], violations: [], readFiles: [], contextSent: false, stop: null,
  };
}

// --- the P1 prototype -------------------------------------------------------

// Q1's options: up to two awaiting_acceptance and two in_progress rows, oldest
// first, then the ranked candidates; the first carries (Recommended).
function q1Options(menu) {
  const old = (a) => [...(a || [])].sort((x, y) => String(x.updated_at).localeCompare(String(y.updated_at))).slice(0, 2);
  const rows = [
    ...old(menu.awaiting_acceptance).map((r) => ({ kind: 'accept', r, label: `Accept: ${r.title} (${r.id})`, reason: `finished, waiting on you since ${r.updated_at}` })),
    ...old(menu.in_progress).map((r) => ({ kind: 'resume', r, label: `Resume: ${r.title} (${r.id})`, reason: `in progress since ${r.updated_at}` })),
    ...menu.candidates.map((r) => ({ kind: 'planned', r, label: `${r.title} (${r.id})`, reason: r.reason })),
  ].slice(0, 4);
  return rows.map((o, i) => ({ ...o, label: i === 0 ? `${o.label} (Recommended)` : o.label }));
}

// destination-question.md's rules, as data. `collision` is the selected menu
// row's flag: undefined for a resume row, which is unknown, not false.
function q2Options({ inProgressOther, collision, dirty, checks, sliced, contextHigh, canDelegate = true }) {
  const shortest = (xs) => xs.filter(Boolean).sort((a, b) => a.length - b.length)[0] || null;
  const caution = [
    null,
    shortest([dirty && 'No commits and no branch: the tree already has uncommitted changes.',
      checks < 2 && 'Only one task, so this is Execute here under another name.',
      checks >= 2 && !sliced && 'The later tasks would only run a command; one task holds everything.']),
    shortest([collision === true && 'It edits files another running task also plans to touch.',
      checks < 1 && 'Nothing runnable, so it cannot tell whether it succeeded.',
      dirty && 'It edits this same tree, around your uncommitted changes.',
      !canDelegate && 'This session cannot start one; the prompt can still be copied.']),
    null,
  ];
  let rec = 0;
  if (contextHigh) rec = 3;
  else if (inProgressOther && collision === false && !dirty && checks >= 1 && canDelegate) rec = 2;
  else if (checks >= 2 && sliced && !dirty) rec = 1;
  const base = ['Work the whole prompt in this session.', 'One task per check, each committed on its own branch.',
    'Offload it and get notified when it finishes.', 'Just get the text, no execution.'];
  const why = ['', 'The work verifies in stages, so it can commit in stages.',
    'Other work is running and this task stays clear of it.', 'This session is filling up; a fresh one will do better.'];
  return Q2_NAMES.map((name, i) => ({
    dest: Q2_DEST[i],
    label: name + (i === rec ? ' (Recommended)' : '') + (caution[i] ? ' (Caution)' : ''),
    description: [base[i], i === rec && why[i], caution[i]].filter(Boolean).join(' '),
  }));
}

function flagsOf(command) {
  const v = (n) => (command.match(new RegExp(`--${n}[=\\s]+["']?([\\w-]+)`)) || [])[1] ?? null;
  return { chose: v('chose'), after: v('after'), entry: v('entry'), checks: v('checks'), dest: v('dest'),
    sliced: /--sliced\b/.test(command), intro: /--intro\b/.test(command) };
}

function entryRow(st, id) {
  const out = runScript(st.scenario, 'roadmap.js', ['list', '--ids', id]).out;
  try { return JSON.parse(out).entries?.[0] || null; } catch { return null; }
}

function p1Step(st, command) {
  const f = flagsOf(command);
  const step = `node ${ROOT}/scripts/roadmap.js step pick`;
  const opts = q1Options(st.menu);
  if (f.dest) return { ok: true, next: 'craft', entry: f.entry, dest: f.dest };
  if (f.entry) {
    const row = entryRow(st, f.entry);
    if (!row) return { ok: false, error: 'unknown_entry', fix: 'run step pick again and choose a listed id' };
    if (f.checks === null || !/^\d+$/.test(f.checks)) return { ok: false, error: 'missing_checks', fix: 'pass --checks <n>, the number of runnable verification rows' };
    const cand = st.menu.candidates.find((c) => c.id === row.id);
    const options = q2Options({
      inProgressOther: (st.menu.in_progress || []).some((r) => r.id !== row.id),
      collision: cand ? cand.collision : undefined,
      dirty: st.scenario.dirty, checks: Number(f.checks), sliced: f.sliced, contextHigh: st.scenario.contextHigh,
    });
    const question = f.intro ? `${row.title} (${row.id}): ${row.why} How do you want to run this?` : 'How do you want to run this?';
    return { ok: true, next: 'ask_q2', question, options, then: `${step} --entry ${row.id} --dest <dest>` };
  }
  if (f.chose) {
    if (f.chose === 'other') return { ok: false, error: 'not_on_menu', fix: 'ask the user which entry they mean, then run step pick --chose <id>' };
    if (f.chose === 'defer') return { ok: true, next: 'defer' };
    const row = entryRow(st, f.chose);
    if (!row) return { ok: false, error: 'unknown_entry', fix: 'run step pick again and choose a listed id' };
    const at = opts.findIndex((o) => o.r.id === row.id);
    if (f.after === 'q1') {
      st.events.push({ event: 'question_asked' });
      if (opts[at]?.kind === 'planned') {
        st.events.push(opts[at].label.endsWith('(Recommended)') ? { event: 'pick_accepted', rank: at + 1 } : { event: 'pick_overridden', chosen_rank: at + 1 });
      } else if (at < 0) st.events.push({ event: 'pick_overridden', chosen_rank: null });
    }
    if (row.status === 'awaiting_acceptance') return { ok: true, next: 'accept', entry: row };
    if (row.status === 'in_progress') return { ok: true, next: 'resume', entry: row };
    st.loaded = row.id;
    const intro = f.after === 'q1' ? '' : ' --intro';
    return { ok: true, next: 'gather_checks', entry: row, then: `${step} --entry ${row.id}${intro} --checks <n>` };
  }
  if (!opts.length) return { ok: true, next: 'empty' };
  if (opts.length === 1) return p1Step(st, `${step} --chose ${opts[0].r.id}`);
  return {
    ok: true, next: 'ask_q1', question: 'Which task next?',
    options: opts.map((o) => ({ id: o.r.id, label: o.label, why: o.r.why, reason: o.reason })),
    then: `${step} --chose <id> --after q1`,
  };
}

// --- tool results -----------------------------------------------------------

function numbered(text, offset = 1, limit = Infinity) {
  const lines = text.split('\n');
  const from = Math.max(1, offset);
  return lines.slice(from - 1, from - 1 + limit).map((l, i) => `${String(from + i).padStart(6)}\t${l}`).join('\n');
}

// A path inside the plugin, relative to its root, or null.
function skillPath(file) {
  const p = path.posix.normalize(String(file || '').replaceAll('\\', '/').replaceAll('${CLAUDE_PLUGIN_ROOT}', ROOT));
  return p.startsWith(`${ROOT}/`) ? p.slice(ROOT.length + 1) : null;
}

function doRead(st, input) {
  const rel = skillPath(input.file_path);
  if (rel === null) {
    st.violations.push(`read ${input.file_path}`);
    return { content: '<tool_use_error>File does not exist.</tool_use_error>' };
  }
  const text = skillFile(st.arm, rel);
  if (text === null) return { content: '<tool_use_error>File does not exist.</tool_use_error>' };
  st.readFiles.push(rel);
  return { content: numbered(text, input.offset, input.limit) };
}

function doSkill(st, input) {
  const name = String(input.skill || '').replace(/^foreman:/, '');
  if (name !== 'roadmap') {
    st.violations.push(`skill ${input.skill}`);
    return { content: `<tool_use_error>Unknown skill: ${input.skill}</tool_use_error>` };
  }
  return { content: `Base directory for this skill: ${ROOT}/skills/roadmap\n\n${skillBody(st.arm, 'skills/roadmap/SKILL.md')}${input.args ? `\n\nARGUMENTS: ${input.args}` : ''}` };
}

// The commands a shell line runs: split on ; & && || | and newlines outside
// quotes, each a list of words with quotes joined and removed, comments and
// redirections dropped. `op` is the operator before the command.
function commands(cmd) {
  const out = [];
  let cur = { op: null, words: [] };
  let word = null;
  let q = null;
  const end = () => { if (word !== null) cur.words.push(word); word = null; };
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (q === "'") { if (ch === "'") q = null; else word += ch; continue; }
    if (q === '"') {
      if (ch === '"') q = null;
      else word += ch === '\\' && /["\\$`]/.test(cmd[i + 1] ?? '') ? cmd[++i] : ch;
      continue;
    }
    if (ch === '"' || ch === "'") { q = ch; word ??= ''; continue; }
    if (ch === '\\') { word = (word ?? '') + (cmd[++i] ?? ''); continue; }
    if (ch === '#' && word === null) { while (i + 1 < cmd.length && cmd[i + 1] !== '\n') i++; continue; }
    if (ch === ' ' || ch === '\t') { end(); continue; }
    const two = cmd.slice(i, i + 2);
    const op = two === '&&' || two === '||' ? two : /[;|\n]/.test(ch) || (ch === '&' && cmd[i - 1] !== '>') ? ch : null;
    if (op) { end(); out.push(cur); cur = { op, words: [] }; i += op.length - 1; continue; }
    word = (word ?? '') + ch;
  }
  end();
  out.push(cur);
  for (const c of out) c.words = c.words.filter((w, i, a) => !/^\d*>/.test(w) && !/^\d*>>?$/.test(a[i - 1] ?? ''));
  return out.filter((c) => c.words.length);
}

const home = (p) => p.replace(/^~(?=\/|$)/, '/home/dev');

// `P=<dir>; node $P/roadmap.js ...` names the plugin through a variable: the
// assignments are dropped and their uses expanded, as the shell would.
function expandVars(cmd) {
  const vars = {};
  const rest = cmd.split(/(\s*(?:;|&&|\|\||\n)\s*)/).filter((seg) => {
    const m = /^(?:export\s+)?([A-Za-z_]\w*)=(?:"([^"]*)"|'([^']*)'|(\S*))$/.exec(seg.trim());
    if (!m) return true;
    vars[m[1]] = m[2] ?? m[3] ?? m[4];
    return false;
  }).join('').replace(/^\s*(?:;|&&|\|\|)\s*/, '');
  return Object.keys(vars).length
    ? rest.replace(/\$\{?([A-Za-z_]\w*)\}?/g, (all, name) => (name in vars ? vars[name] : all))
    : cmd;
}

function doBash(st, input) {
  const cmd = expandVars(String(input.command || '')).replace(/\$\{CLAUDE_PLUGIN_ROOT\}|\$CLAUDE_PLUGIN_ROOT\b/g, ROOT);
  const out = [];
  let stop = null;
  if (/craft-handoff\.js/.test(cmd)) {
    st.violations.push('craft before the destination question');
    return { content: '{"ok":false,"error":"stopped by the evaluation"}', stop: 'crafted' };
  }
  if (/update-status|codex-task\.js\s+start/.test(cmd)) {
    st.violations.push('status change');
    return { content: '{"ok":true}' };
  }
  // An attempt above is a violation wherever it points; a call that earns an
  // event or an answer is one the shell would run: a command of its own, not
  // text quoted in another or a comment, after no `||` (the sim's commands
  // succeed), naming the install's own script from the folder it runs in.
  const calls = [];
  let cwd = PROJECT;
  for (const c of commands(cmd)) {
    if (c.op === '||') continue;
    const [bin, file, ...args] = c.words;
    if (bin === 'cd') { cwd = path.posix.resolve(cwd, home(file ?? '~')); continue; }
    const m = bin === 'node' && /(?:^|\/)scripts\/(roadmap|trial-log|safe-commit)\.js$/.exec(file || '');
    if (!m) continue;
    const at = path.posix.resolve(cwd, home(file));
    if (at === `${ROOT}/scripts/${m[1]}.js`) calls.push({ script: m[1], args });
    else out.push(`node:internal/modules/cjs/loader: Error: Cannot find module '${at}'`);
  }
  const realSt = st.project ? st : null;
  for (const { script, args } of calls) {
    const verb = args[0];
    if (script === 'trial-log') {
      const r = runScript(st.scenario, 'trial-log.js', args, realSt);
      // The real arm reads every event back from the project's log at grading.
      if (r.code === 0 && !realSt) {
        let fields = {};
        try { fields = JSON.parse(args[1] || '{}'); } catch { /* the script accepted it */ }
        st.events.push({ event: verb, ...fields });
      }
      out.push(r.out.trim());
    } else if (script === 'safe-commit') {
      if (verb === 'begin') {
        out.push(st.scenario.dirty ? '{"ok":true,"dirty":true,"reason":"working_tree_has_changes"}'
          : '{"ok":true,"dirty":false,"baseline":{"head":"9f2c41d0b6a7e3f5c8d1a2b4e6f7091827364554","state_hash":"e3b0c44298fc1c14"}}');
      }
    } else if (verb === 'step' && realSt) {
      const text = runScript(st.scenario, 'roadmap.js', args, realSt).out.trim()
        .replaceAll(path.join(st.root, 'scripts', 'roadmap.js').replaceAll('\\', '/'), `${ROOT}/scripts/roadmap.js`);
      out.push(text);
      let next = null;
      try { next = JSON.parse(text).next; } catch { /* an error line */ }
      if (st.scenario.contextHigh && !st.contextSent && (next === 'gather_checks' || next === 'resume')) {
        st.contextSent = true;
        out.push(CONTEXT_READING_REAL.trim());
      }
    } else if (verb === 'step') {
      out.push(st.arm === 'p1' ? JSON.stringify(p1Step(st, args.join(' '))) : 'roadmap.js: unknown command "step". Run roadmap.js --help.');
    } else if (verb && args.includes('--help')) {
      out.push(runScript(st.scenario, 'roadmap.js', [verb, '--help'], realSt).out.trim());
    } else if (verb === 'next-candidates') {
      out.push(realSt ? runScript(st.scenario, 'roadmap.js', ['next-candidates', '--menu'], realSt).out.trim() : st.menuOut.trim());
    } else if (verb === 'list') {
      const ids = (args.join(' ').match(/--ids[=\s]+([\w,]+)/) || [])[1];
      out.push(runScript(st.scenario, 'roadmap.js', ids ? ['list', '--ids', ids] : ['list'], realSt).out.trim());
      if (ids) st.loaded = ids;
      if (st.scenario.contextHigh && st.arm === 'prose' && ids && !st.contextSent) {
        st.contextSent = true;
        out.push(CONTEXT_READING.trim());
      }
    }
  }
  // The roadmap skill's pre-check, `test -f ROADMAP.jsonl && echo A || echo B`: the file exists.
  const said = /^\s*(?:test\s+-[ef]|\[\s+-[ef])\s+\S*ROADMAP\.jsonl\b[^;|&]*&&\s*echo\s+["']?([\w-]+)["']?\s*(?:\|\|\s*echo\s+["']?[\w-]+["']?\s*)?$/.exec(cmd);
  if (said) return { content: said[1] };
  // Every other part of a chained command must be one the flow needs.
  let refused = false;
  for (const seg of cmd.split(/\s*(?:;|&&|\|\||\n)\s*/).filter(Boolean)) {
    if (/(?:roadmap|trial-log|safe-commit)\.js|^(?:cd|echo|true)\b/.test(seg)) continue;
    if (/^date\b/.test(seg)) { out.push(TODAY); continue; }
    if (/ROADMAP\.jsonl/.test(seg) && /^(?:test\s+-[ef]|\[\s+-[ef]|ls\b)/.test(seg)) {
      if (/^ls\b/.test(seg)) out.push(/^ls\s+-\w*l/.test(seg) ? `-rw-r--r-- 1 dev dev 2048 Mar 15 10:00 ${PROJECT}/ROADMAP.jsonl` : 'ROADMAP.jsonl');
      continue;
    }
    // `cat` of a skill file is a Read by another name.
    const cat = /^cat\s+["']?([^"'\s]+)["']?$/.exec(seg);
    const rel = cat && skillPath(cat[1]);
    const text = rel && skillFile(st.arm, rel);
    if (text) { st.readFiles.push(rel); out.push(text); continue; }
    st.violations.push(`command ${seg.slice(0, 120)}`);
    out.push(`bash: ${seg.split(/\s/)[0]}: not available in this environment`);
    refused = true;
  }
  if (!out.length && refused) return { content: 'bash: this command is not available in this environment', stop };
  return { content: out.join('\n'), stop };
}

// A question offering a destination, even under other names, is Q2 and ends
// the case; the grader then wants the exact names. Any other question is
// Q1-like and is answered with the scenario's choice.
function doAsk(st, input) {
  const qs = Array.isArray(input.questions) ? input.questions : [];
  const asks = qs.map((q) => ({ question: String(q.question || ''), options: (q.options || []).map((o) => ({ label: String(o.label || ''), description: String(o.description || '') })) }));
  const q2 = asks.find((a) => a.options.some((o) => /execute|clipboard|background agent/i.test(o.label)));
  if (q2) {
    st.q2 = q2;
    return { content: '', stop: 'q2' };
  }
  st.q1s.push(...asks);
  const id = st.scenario.choose;
  const answers = asks.map((a) => {
    const hit = a.options.find((o) => idOf(o.label) === id);
    return `"${a.question}"="${hit ? hit.label : `${id}`}"`;
  });
  return { content: `User has answered your questions: ${answers.join(', ')}. You can now continue with the user's answers in mind.` };
}

function handleTool(st, block) {
  const input = block.input || {};
  if (block.name === 'Read') return doRead(st, input);
  if (block.name === 'Bash') return doBash(st, input);
  if (block.name === 'Skill') return doSkill(st, input);
  if (block.name === 'AskUserQuestion') return doAsk(st, input);
  st.violations.push(`tool ${block.name}`);
  return { content: `<tool_use_error>No such tool available: ${block.name}</tool_use_error>` };
}

// Text the model wrote between calls: the menu JSON must never be pasted.
function noteText(st, text) {
  if (/"candidates"\s*:|"total_unblocked"/.test(text)) st.violations.push('pasted menu JSON');
}

// --- grading ----------------------------------------------------------------

function baseLabel(label) {
  return String(label).replace(/\s*\((Recommended|Caution)\)/g, '').trim();
}
function idOf(label) {
  const all = [...String(label).matchAll(/\((\d{3})\)/g)];
  return all.length ? all.at(-1)[1] : null;
}

function gradeQ1(st) {
  const ex = st.scenario.expected;
  if (ex.q1 === null) return st.q1s.length === 0;
  if (st.q1s.length !== 1) return false;
  const opts = st.q1s[0].options;
  const ids = opts.map((o) => idOf(o.label));
  if (JSON.stringify(ids) !== JSON.stringify(ex.q1)) return false;
  if (!opts.every((o, i) => /\(Recommended\)/.test(o.label) === (i === 0))) return false;
  return opts.every((o) => {
    const want = ex.q1Prefix[idOf(o.label)] || null;
    const has = (o.label.match(/^(Accept:|Resume:)/) || [])[1] || null;
    return want === has;
  });
}

function gradeQ2(st) {
  const ex = st.scenario.expected;
  if (!st.q2) return false;
  const opts = st.q2.options;
  if (JSON.stringify(opts.map((o) => baseLabel(o.label))) !== JSON.stringify(Q2_NAMES)) return false;
  const tagged = (tag) => opts.filter((o) => o.label.includes(`(${tag})`)).map((o) => baseLabel(o.label)).sort();
  if (JSON.stringify(tagged('Recommended')) !== JSON.stringify([ex.q2Recommended])) return false;
  if (JSON.stringify(tagged('Caution')) !== JSON.stringify([...ex.q2Caution].sort())) return false;
  return !ex.q2NamesEntry || st.q2.question.includes(`(${st.scenario.choose})`);
}

// The real arm's pick events, as its step and any trial-log call wrote them.
// menu_shown and hint_used are the CLI's own and are not graded.
function loggedEvents(st) {
  let text = '';
  try { text = fs.readFileSync(path.join(st.project, '.foreman', 'trial-log.jsonl'), 'utf8'); } catch { /* nothing logged */ }
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .filter((e) => ['question_asked', 'pick_accepted', 'pick_overridden'].includes(e.event))
    .map(({ event, flow, rank, chosen_rank }) => ({ event, ...(flow && { flow }), ...(rank !== undefined && { rank }), ...(chosen_rank !== undefined && { chosen_rank }) }));
}

function grade(st) {
  if (st.project) st.events = loggedEvents(st);
  const g = {
    q1: gradeQ1(st) ? 1 : 0,
    q2: gradeQ2(st) ? 1 : 0,
    events: JSON.stringify(st.events.map((e) => e.event)) === JSON.stringify(st.scenario.expected.events) ? 1 : 0,
    clean: st.violations.length ? 0 : 1,
  };
  return { pass: g.q1 && g.q2 && g.events && g.clean ? 1 : 0, ...g };
}

module.exports = {
  SCENARIOS, ROOT, PROJECT, FOREMAN, ARMS, SYSTEM, TOOLS, Q2_NAMES,
  firstMessage, newCase, handleTool, noteText, grade, q1Options, q2Options, p1Step, entryRow, skillFile, baseLabel, idOf,
  expandVars,
};
