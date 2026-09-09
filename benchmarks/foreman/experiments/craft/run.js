#!/usr/bin/env node
'use strict';
// foreman-craft: does a real model, executing foreman's pick-next-task
// step 3, assemble a gate-clean handoff prompt? Two arms:
//   pre  — template WITHOUT the mechanical-gate section, no checker
//          mentioned (the pre-gate plugin). Scored by running
//          check-prompt.js on the artifact afterward = unaided defect rate.
//   gate — current template, session told to run the gate and iterate.
//          Scored the same way; also counts gate invocations.
//
//   node run.js --tag craft1 --model sonnet --reps 3
//   node run.js --tag craft1 --model haiku --reps 3 --scenarios plain,trio
//
// Records: results/<tag>/records.jsonl (+ per-rep artifacts/transcripts).

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = __dirname;
const FOREMAN = process.env.FOREMAN_DIR ? path.resolve(process.env.FOREMAN_DIR) : path.resolve(ROOT, '../../../..', 'foreman');
const TEMPLATE = path.join(FOREMAN, 'prompt-template.md');
const CHECK = path.join(FOREMAN, 'scripts', 'check-prompt.js');

const argv = process.argv.slice(2);
function flag(name, dflt) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
}
const tag = flag('tag', 'dev');
const model = flag('model', 'haiku');
const reps = Number(flag('reps', 3));
const concurrency = Number(flag('concurrency', 3));
const armNames = flag('arms', 'pre,gate').split(',');
const RUN_TIMEOUT_MS = 360000;
const MAX_TURNS = 20;

// --- scenarios ---------------------------------------------------------------
const SCENARIOS = {
  // no config at all — defaults (persona on, nothing omitted)
  plain: {
    config: null,
    entry: {
      id: '004',
      title: 'Fix double-retry on 429 responses',
      why: 'The HTTP client retries 429s twice per attempt, tripping the rate limiter harder.',
      what: 'retry() in src/http/client.js:88-140 re-enters backoff() when Retry-After is present; dedupe the retry path and keep the Retry-After honor. Regression test in tests/client.test.js.',
      status: 'planned',
      touches: ['src/http/client.js', 'tests/client.test.js'],
      depends_on: [],
      unblocks: 1,
      unblocks_total: 2,
      collision: false,
      created_at: '2026-07-10',
      notes: '',
    },
    checkArgs: ['--destination', 'clipboard', '--entry', '004'],
  },
  // trio-shaped project: persona off, tone omitted, one custom section
  trio: {
    config: {
      usePersona: false,
      omitSections: ['tone'],
      customSections: [
        { tag: 'house_rules', content: 'Every commit message references the roadmap entry id it implements.' },
      ],
    },
    entry: {
      id: '007',
      title: 'Cache template renders per locale',
      why: 'renderEmail() re-parses the same MJML template on every send; p95 latency doubled after localization.',
      what: 'Add a keyed cache (template path + locale) in src/mail/render.js:30-75. Invalidate on file mtime change. Bench in tests/render.bench.js must show a warm-hit speedup.',
      status: 'planned',
      touches: ['src/mail/render.js', 'tests/render.bench.js'],
      depends_on: [],
      unblocks: 0,
      unblocks_total: 0,
      collision: false,
      created_at: '2026-07-08',
      notes: '',
    },
    checkArgs: ['--destination', 'clipboard', '--entry', '007'],
  },
  // Workflow-stage flavor: tone dropped, output_format replaced by the
  // fixed enforcement sentence, schema authored alongside
  workflow: {
    config: null,
    entry: {
      id: '015',
      title: 'Audit route handlers for missing input validation',
      why: 'Three prod 500s last week traced to unvalidated request bodies.',
      what: 'For every handler under src/routes/, record whether the body/query is validated before use, and where the gap is. Output feeds a Workflow stage that fans the fixes out.',
      status: 'planned',
      touches: ['src/routes/'],
      depends_on: [],
      unblocks: 2,
      unblocks_total: 4,
      collision: false,
      created_at: '2026-07-05',
      notes: '',
    },
    workflowStage: true,
    schemaAsk: 'per handler: file path, validated (yes/no), gap description with a file:line cite',
    checkArgs: ['--destination', 'clipboard', '--entry', '015', '--research', '--workflow-stage'],
  },
  // pure investigation — no verification command exists
  research: {
    config: null,
    entry: {
      id: '011',
      title: 'Map every consumer of the legacy config loader',
      why: 'We want to delete lib/config-legacy.js but nobody knows what still imports it.',
      what: 'Pure investigation, no code changes: find every import/require of lib/config-legacy.js (and dynamic uses via loadLegacyConfig), record each call site and what replacing it would take. Findings go into the roadmap entry notes.',
      status: 'planned',
      touches: ['lib/config-legacy.js'],
      depends_on: [],
      unblocks: 3,
      unblocks_total: 5,
      collision: false,
      created_at: '2026-07-01',
      notes: '',
    },
    checkArgs: ['--destination', 'clipboard', '--entry', '011', '--research'],
  },
};
const scenarioNames = flag('scenarios', Object.keys(SCENARIOS).join(',')).split(',');
for (const s of scenarioNames) if (!SCENARIOS[s]) throw new Error(`unknown scenario ${s}`);

// --- templates ---------------------------------------------------------------
// The pre arm sees the template as it was before the gate section existed —
// otherwise the baseline would read the gate instruction and stop being a
// baseline.
const templateFull = fs.readFileSync(TEMPLATE, 'utf8');
const GATE_HEADER = '## Mechanical gate (REQUIRED, after the checklist)';
const NEXT_HEADER = '## When NOT to hand off';
if (!templateFull.includes(GATE_HEADER)) throw new Error('template has no gate section — arms would be identical');
const templateNoGate =
  templateFull.slice(0, templateFull.indexOf(GATE_HEADER)) +
  templateFull.slice(templateFull.indexOf(NEXT_HEADER));

// Step-3 essentials, mirrored from skills/roadmap/SKILL.md (private harness
// copy — fidelity matters more than dedup here; step 3 is what a real pick
// session has in context). ${CLAUDE_PLUGIN_ROOT} resolved to the real root.
function step3Text(entryId) {
  return `Craft the handoff prompt using the prompt template's XML structure, straight from the candidate's fields — no verification pass:
- task_context goal <- title + why
- background / context <- what
- relevant_files seed <- touches, passed through as-is (area-level hints, not confirmed file:line ranges — that's fine, don't upgrade them yourself)
- task_rules' first bullet defaults to: "Explore \`relevant_files\` first (see \`truth_grounding\` above)." The remaining bullets and the verification command: infer them from the entry when inferable.
- Add one more fixed paragraph right after scope_discipline, naming this entry's id, so the destination session — not Foreman — is the one that flips it to in_progress:
  "This task is ROADMAP.jsonl entry \`${entryId}\`. Mark it \`in_progress\` before doing anything else — Foreman's picking flow deliberately leaves it \`planned\` until you do:
  \`echo '{"id":"${entryId}","status":"in_progress"}' | node ${FOREMAN.split(path.sep).join('/')}/scripts/roadmap.js update-status\`
  When the work concludes, close the entry the same way — the status it actually earned (\`done\`, \`dropped\`, \`rejected\`) and your full findings in \`notes\`. If the work changed code, commit it before closing and pass the sha — \`done\` means the work landed, and the commit is what lands it; a task that changed nothing (pure investigation) closes without one:
  \`echo '{"id":"${entryId}","status":"<status>","commit":"<sha>","notes":"<findings>"}' | node ${FOREMAN.split(path.sep).join('/')}/scripts/roadmap.js update-status\`
  The entry's \`notes\` is where the depth lives; your final chat message states the outcome and points at the entry."`;
}

function buildPrompt(scenario, arm, templatePath) {
  const s = SCENARIOS[scenario];
  const gatePart =
    arm === 'gate'
      ? `\n\nAfter assembling, run the template's mechanical gate and iterate until it passes:\n  node "${CHECK}" handoff.md ${s.checkArgs.map((a) => (a.startsWith('--') ? a : `"${a}"`)).join(' ')}\nFix every error it reports and re-run until it prints {"ok":true,...}. Never finish with a failing gate.`
      : '';
  const workflowPart = s.workflowStage
    ? `\n\nThe output-format selection is "Workflow stage" — apply the template's WORKFLOW-STAGE FLAVOR exactly. What should come back from the stage: ${s.schemaAsk}. Write the JSON Schema artifact into handoff.md after the prompt, in a fenced json block, per the flavor's delivery rule.`
    : '';
  return `You are executing the "Pick the next task" flow of the foreman plugin, step 3, for the project in the current directory. The task below has already been picked. The delivery destination is: Copy prompt to clipboard.${workflowPart}

Read the prompt template at "${templatePath}" and follow it exactly. Resolve the project's declaration config first by running:
  node "${path.join(FOREMAN, 'scripts', 'render-sections.js')}"
(from the current directory — it reads .foreman/config.json here).

${step3Text(s.entry.id)}

The picked candidate (from next-candidates):
${JSON.stringify(s.entry, null, 2)}

Assemble the handoff prompt and Write it to handoff.md in the current directory. Do not print the assembled prompt into your chat response; the file is the deliverable.${gatePart}

When done, reply with one line: DONE.`;
}

// --- claude invocation --------------------------------------------------------
function cleanEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(CLAUDECODE|CLAUDE_CODE_|FOREMAN_|HUSH_|RAZOR_)/.test(k)) continue;
    if (k === 'CLAUDE_PROJECT_DIR') continue;
    env[k] = v;
  }
  return env;
}

function baseArgs() {
  return [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--model', model,
    '--max-turns', String(MAX_TURNS),
    '--setting-sources', 'project',
    '--strict-mcp-config',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read,Edit,Write,Glob,Grep,Bash,PowerShell',
    '--disallowedTools', 'Bash(git*),PowerShell(git*),Agent,Task,ScheduleWakeup,CronCreate,RemoteTrigger',
  ];
}

const outDir = path.join(ROOT, 'results', tag);
fs.mkdirSync(path.join(outDir, 'transcripts'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'artifacts'), { recursive: true });
const workRoot = path.join(os.tmpdir(), 'foreman-craft', tag);
fs.mkdirSync(workRoot, { recursive: true });

function makeWorkDir(scenario, arm, rep) {
  const key = `${scenario}__${arm}__${model}__r${rep}`;
  const workDir = path.join(workRoot, key);
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  const s = SCENARIOS[scenario];
  if (s.config) {
    fs.mkdirSync(path.join(workDir, '.foreman'), { recursive: true });
    fs.writeFileSync(path.join(workDir, '.foreman', 'config.json'), JSON.stringify(s.config, null, 2));
  }
  fs.writeFileSync(path.join(workDir, 'ROADMAP.jsonl'), JSON.stringify({ ...s.entry, source: 'user', commits: [], updated_at: s.entry.created_at }) + '\n');
  // per-arm template copy, so the pre arm can't read the gate section
  const templatePath = path.join(workDir, 'prompt-template.md');
  fs.writeFileSync(templatePath, arm === 'pre' ? templateNoGate : templateFull);
  return { key, workDir, templatePath };
}

function parseStream(stdout) {
  const m = { costUsd: null, numTurns: null, resultSubtype: null, finalText: '', gateRuns: 0, toolCalls: 0 };
  for (const line of stdout.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    let ev;
    try { ev = JSON.parse(t); } catch { continue; }
    if (ev.type === 'assistant' && ev.message) {
      for (const c of ev.message.content || []) {
        if (c.type !== 'tool_use') continue;
        m.toolCalls += 1;
        if (/^(Bash|PowerShell)$/.test(String(c.name)) && c.input && /check-prompt\.js/.test(String(c.input.command || ''))) {
          m.gateRuns += 1;
        }
      }
    } else if (ev.type === 'result') {
      m.costUsd = ev.total_cost_usd ?? null;
      m.numTurns = ev.num_turns ?? null;
      m.resultSubtype = ev.subtype || null;
      m.finalText = typeof ev.result === 'string' ? ev.result : '';
    }
  }
  return m;
}

function scoreArtifact(workDir, scenario) {
  const artifact = path.join(workDir, 'handoff.md');
  if (!fs.existsSync(artifact)) return { produced: false, ok: false, errors: ['no handoff.md produced'], warnings: [] };
  const res = spawnSync('node', [CHECK, artifact, ...SCENARIOS[scenario].checkArgs], {
    cwd: workDir,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: workDir },
  });
  let json;
  try { json = JSON.parse(res.stdout); } catch {
    return { produced: true, ok: false, errors: [`checker crashed: ${res.stdout} ${res.stderr}`], warnings: [] };
  }
  return { produced: true, ok: !!json.ok, errors: json.errors || (json.error ? [json.error] : []), warnings: json.warnings || [] };
}

function oneRun(scenario, arm, rep) {
  const { key, workDir, templatePath } = makeWorkDir(scenario, arm, rep);
  const prompt = buildPrompt(scenario, arm, templatePath);
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('claude', baseArgs(), { cwd: workDir, env: cleanEnv(), shell: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdin.write(prompt);
    child.stdin.end();
    const killer = setTimeout(() => child.kill('SIGKILL'), RUN_TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(killer);
      fs.writeFileSync(path.join(outDir, 'transcripts', `${key}.jsonl`), stdout);
      const m = parseStream(stdout);
      // rate-limit trap (see benchmarks memory): a limited call reports
      // success-shaped output with the limit text as the answer.
      const limited = /limit reached|rate limit|usage limit/i.test(m.finalText) && (m.costUsd ?? 0) === 0;
      const score = scoreArtifact(workDir, scenario);
      if (score.produced) {
        fs.copyFileSync(path.join(workDir, 'handoff.md'), path.join(outDir, 'artifacts', `${key}.md`));
      }
      const record = {
        key, scenario, arm, model, rep,
        exitCode: code, wallMs: Date.now() - started,
        resultSubtype: m.resultSubtype, limited,
        costUsd: m.costUsd, numTurns: m.numTurns, toolCalls: m.toolCalls, gateRuns: m.gateRuns,
        ...score,
      };
      fs.appendFileSync(path.join(outDir, 'records.jsonl'), JSON.stringify(record) + '\n');
      console.log(`${key}: produced=${score.produced} ok=${score.ok} errors=${score.errors.length} gateRuns=${m.gateRuns} cost=$${(m.costUsd ?? 0).toFixed(4)}${limited ? ' RATE-LIMITED' : ''}`);
      resolve(record);
    });
  });
}

async function main() {
  const jobs = [];
  for (const scenario of scenarioNames) {
    for (const arm of armNames) {
      for (let rep = 1; rep <= reps; rep++) jobs.push([scenario, arm, rep]);
    }
  }
  console.log(`${jobs.length} runs (model=${model}, tag=${tag})`);
  const records = [];
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const [scenario, arm, rep] = jobs[next++];
      records.push(await oneRun(scenario, arm, rep));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  // summary
  const byArm = {};
  for (const r of records) {
    const k = `${r.arm}/${r.scenario}`;
    byArm[k] = byArm[k] || { n: 0, ok: 0, produced: 0, errors: 0, gateRuns: 0, cost: 0, limited: 0 };
    const b = byArm[k];
    b.n++; b.ok += r.ok ? 1 : 0; b.produced += r.produced ? 1 : 0;
    b.errors += r.errors.length; b.gateRuns += r.gateRuns; b.cost += r.costUsd || 0; b.limited += r.limited ? 1 : 0;
  }
  console.log('\narm/scenario           n  produced  gate-clean  total-errors  gateRuns  cost');
  for (const [k, b] of Object.entries(byArm).sort()) {
    console.log(`${k.padEnd(22)} ${b.n}  ${b.produced}         ${b.ok}           ${b.errors}             ${b.gateRuns}         $${b.cost.toFixed(3)}${b.limited ? `  LIMITED:${b.limited}` : ''}`);
  }
  const totalCost = records.reduce((s, r) => s + (r.costUsd || 0), 0);
  console.log(`\ntotal cost: $${totalCost.toFixed(3)}`);
}

main();
