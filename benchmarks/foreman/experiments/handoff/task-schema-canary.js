#!/usr/bin/env node
'use strict';
// Task-event schema canary (H3, ROADMAP.jsonl entry 032).
//
// task-created.js and task-completed.js both parse an UNDOCUMENTED hook
// input schema (task_id, task_subject, task_description — see their own
// header comments and docs/research/foreman-task-family-brief.md §2.2).
// Both hooks fail silent by design, so schema drift on a `claude` binary
// update would just quietly turn the mechanization off with no error
// anywhere. This script re-runs the probe that established the schema
// (brief §6) and asserts it still holds.
//
// Method: writes a logging hook + settings.json into a scratch dir under
// os.tmpdir(), registers it under BOTH TaskCreated and TaskCompleted, drives
// ONE cheap headless `claude -p --model haiku` session that creates a task
// then completes it, then checks the captured stdin JSON for both events.
// Costs pennies — exactly one driver session per invocation, by design.
//
// Release-checklist line: binary version changed since the last canary
// run? Run `node benchmarks/foreman/experiments/handoff/task-schema-canary.js` before
// cutting a foreman release, and update the schema-date comment in
// foreman/hooks/task-created.js + task-completed.js if it reveals drift.
//
//   node task-schema-canary.js
//
// Exits 0 with PASS on both events, nonzero otherwise (including zero
// captured events for either).

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REQUIRED_FIELDS = ['task_id', 'task_subject', 'task_description'];

const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foreman-task-canary-'));
const logFile = path.join(scratchDir, 'canary-log.jsonl');
const hookFile = path.join(scratchDir, 'log-probe.js');
const settingsFile = path.join(scratchDir, 'settings.json');

const HOOK_SRC = `#!/usr/bin/env node
"use strict";
const fs = require("fs");
const LOG_FILE = ${JSON.stringify(logFile)};
let raw = "";
try { raw = fs.readFileSync(0, "utf-8"); } catch {}
let data = {};
try { data = JSON.parse(raw || "{}"); } catch { data = { _parse_error: true, _raw: raw }; }
try { fs.appendFileSync(LOG_FILE, JSON.stringify(data) + "\\n"); } catch {}
process.exit(0);
`;
fs.writeFileSync(hookFile, HOOK_SRC);
fs.writeFileSync(logFile, '');

const hookCmd = `node ${JSON.stringify(hookFile)}`;
fs.writeFileSync(
  settingsFile,
  JSON.stringify(
    {
      hooks: {
        TaskCreated: [{ matcher: '', hooks: [{ type: 'command', command: hookCmd }] }],
        TaskCompleted: [{ matcher: '', hooks: [{ type: 'command', command: hookCmd }] }],
      },
    },
    null,
    2,
  ),
);

const versionRun = spawnSync('claude', ['--version'], { encoding: 'utf8', shell: true });
const binaryVersion = (versionRun.stdout || '').trim() || '(unknown — claude --version failed)';

const prompt =
  "Use TaskCreate to add one task (any subject/description), then immediately mark it completed via TaskUpdate. Do nothing else.";

const driverRun = spawnSync(
  'claude',
  [
    '-p',
    '--model',
    'haiku',
    '--settings',
    settingsFile,
    prompt,
    // --allowedTools is variadic (<tools...>) and swallows any argument
    // after it up to the next flag — it MUST come after the prompt or it
    // eats the prompt itself and claude errors "no prompt argument".
    '--allowedTools',
    'TaskCreate,TaskUpdate',
  ],
  // shell:false (default) — shell:true on Windows mangles this prompt's
  // parens/commas (cmd.exe's argv re-parsing), silently truncating it to
  // an empty prompt. claude is a real .exe on PATH; no shell needed.
  { encoding: 'utf8', cwd: scratchDir, timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] },
);

if (driverRun.error || driverRun.status !== 0) {
  console.log(`FAIL driver session did not complete cleanly (status ${driverRun.status})`);
  if (driverRun.stderr) console.log(driverRun.stderr.trim());
  console.log(`scratch dir left for inspection: ${scratchDir}`);
  process.exit(1);
}

let lines = [];
try {
  lines = fs
    .readFileSync(logFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
} catch (err) {
  console.log(`FAIL could not read/parse log file: ${err.message}`);
  console.log(`scratch dir left for inspection: ${scratchDir}`);
  process.exit(1);
}

let anyFail = false;
for (const eventName of ['TaskCreated', 'TaskCompleted']) {
  const entry = lines.find((l) => l.hook_event_name === eventName);
  if (!entry) {
    console.log(`FAIL ${eventName}: no event captured`);
    anyFail = true;
    continue;
  }
  const missing = REQUIRED_FIELDS.filter((f) => typeof entry[f] !== 'string');
  const observed = REQUIRED_FIELDS.filter((f) => f in entry);
  if (missing.length) {
    console.log(`FAIL ${eventName}: missing/non-string fields [${missing.join(', ')}] — observed fields: [${Object.keys(entry).join(', ')}]`);
    anyFail = true;
  } else {
    console.log(`PASS ${eventName}: fields present as strings [${observed.join(', ')}]`);
  }
}

console.log(`binary version: ${binaryVersion}`);

if (anyFail) {
  console.log(`\ncanary FAILED — schema drift detected. scratch dir left for inspection: ${scratchDir}`);
  process.exit(1);
}

fs.rmSync(scratchDir, { recursive: true, force: true });
console.log('\ncanary OK — Task-event schema unchanged');
process.exit(0);
