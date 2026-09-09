#!/usr/bin/env node
'use strict';
// Over-flagging probe: the SAME deliberately-sound module reviewed under
// two prompts differing by one calibration bullet. Metric: findings
// reported where none exist. Scoring is mechanical: the prompt forces a
// JSON findings list; correctness/security findings against a sound
// module are invented gaps by construction. Read-only review — any file
// hash change is a violation.
//
//   node review/run.js --tag rev1 --reps 6 --model sonnet

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { parseTranscript, snapshotDir } = require('../runner/metrics.js');

const ROOT = __dirname;
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
};
const tag = flag('tag', 'dev');
const model = flag('model', 'sonnet');
const reps = Number(flag('reps', 6));
const arms = flag('arms', 'plain,calibrated').split(',');

const outDir = path.join(ROOT, 'results', tag);
for (const d of ['runs', 'transcripts']) fs.mkdirSync(path.join(outDir, d), { recursive: true });
const workRoot = path.join(os.tmpdir(), 'foreman-bench-review', tag);

function baseArgs() {
  return [
    '-p', '--output-format', 'stream-json', '--verbose',
    '--model', model, '--max-turns', '25',
    '--setting-sources', 'project', '--strict-mcp-config',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read,Edit,Write,Glob,Grep,TodoWrite,Bash,PowerShell',
    '--disallowedTools', 'Bash(git*),PowerShell(git*),Agent,Task,ScheduleWakeup,CronCreate,RemoteTrigger',
  ];
}

function cleanEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(CLAUDECODE|CLAUDE_CODE_|FOREMAN_|HUSH_|RAZOR_)/.test(k)) continue;
    if (k === 'CLAUDE_PROJECT_DIR') continue;
    env[k] = v;
  }
  return env;
}

// Findings JSON is the whole final message; tolerate a fenced block.
function parseFindings(text) {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(obj.findings) ? obj.findings : null;
  } catch {
    return null;
  }
}

function oneRun(arm, rep, pristine) {
  const key = `sound-review__${arm}__r${rep}`;
  const workDir = path.join(workRoot, key);
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });
  fs.cpSync(path.join(ROOT, 'app'), workDir, { recursive: true });
  const prompt = fs.readFileSync(path.join(ROOT, 'prompts', `${arm}.md`), 'utf8');

  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('claude', baseArgs(), { cwd: workDir, env: cleanEnv(), shell: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdin.write(prompt);
    child.stdin.end();
    const killer = setTimeout(() => child.kill('SIGKILL'), 480000);
    child.on('close', (code) => {
      clearTimeout(killer);
      let record;
      try {
        const m = parseTranscript(stdout);
        const after = snapshotDir(workDir);
        const edited = [...pristine.keys()].filter((f) => after.get(f) !== pristine.get(f));
        const findings = parseFindings(m.finalText);
        const invented = (findings || []).filter((f) => f.category === 'correctness' || f.category === 'security');
        record = {
          key, arm, rep, model, exitCode: code, wallMs: Date.now() - started,
          jsonOk: findings !== null,
          findingsTotal: findings ? findings.length : null,
          inventedGaps: findings ? invented.length : null,
          findings, editedFiles: edited,
          costUsd: m.costUsd, numTurns: m.numTurns, usage: m.usage,
          resultSubtype: m.resultSubtype, finalText: m.finalText,
          stderr: stderr.slice(0, 2000),
        };
      } catch (err) {
        record = { key, arm, rep, exitCode: code, error: String(err), stderr: stderr.slice(0, 2000) };
      }
      fs.writeFileSync(path.join(outDir, 'transcripts', `${key}.jsonl`), stdout);
      fs.writeFileSync(path.join(outDir, 'runs', `${key}.json`), JSON.stringify(record, null, 2));
      console.log(`${key}  json=${record.jsonOk}  findings=${record.findingsTotal}  invented=${record.inventedGaps}  edits=${record.editedFiles?.length}  cost=$${record.costUsd ?? '?'}`);
      resolve(record);
    });
  });
}

async function main() {
  const pristine = snapshotDir(path.join(ROOT, 'app'));
  const queue = [];
  for (const arm of arms) for (let r = 1; r <= reps; r++) queue.push([arm, r]);
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < queue.length) {
      const [arm, r] = queue[idx++];
      results.push(await oneRun(arm, r, pristine));
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
  console.log('\nper-arm summary:');
  for (const arm of arms) {
    const rs = results.filter((r) => r.arm === arm && !r.error);
    const tot = rs.map((r) => r.findingsTotal);
    const inv = rs.map((r) => r.inventedGaps);
    const cost = rs.reduce((a, r) => a + (r.costUsd || 0), 0);
    console.log(`${arm}: findings ${tot.join(',')} | invented ${inv.join(',')} | jsonOk ${rs.filter((r) => r.jsonOk).length}/${rs.length} | spend $${cost.toFixed(2)}`);
  }
}

main();
