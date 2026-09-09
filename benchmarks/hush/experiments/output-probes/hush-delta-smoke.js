#!/usr/bin/env node
"use strict";

if (require.main === module && process.argv.includes("--help")) {
  console.log("Historical paid delta probe: set HUSH_DIR to a compatible retained revision and pass --allow-live, --reps and --tag. Without --allow-live no model session starts. --help reads no transcripts or authentication state.");
  process.exit(0);
}
if (require.main === module && (!process.argv.includes("--allow-live") || !process.env.HUSH_DIR)) {
  console.error("This historical live probe requires explicit --allow-live and HUSH_DIR. Use --help before selecting a source revision.");
  process.exit(2);
}

// One-off LIVE smoke (ROADMAP 066 close-out): confirms hush's re-read delta
// (compress-tool-output.js's maybeDelta, ROADMAP 066b) actually fires end-to-end
// on a real Haiku session and produces a measurable savings on its intended
// trigger: a full re-read of a watched log path whose content changed
// EXTERNALLY between reads. The external change is simulated by THIS SCRIPT
// editing the fixture file directly on disk between the two turns — never via
// the session's own Edit/Write/MultiEdit, which would count as a self-edit and
// correctly suppress the delta (see invalidateDeltaPath in the hook).
//
// hush-on vs hush-off (baseline), reusing config.json's own arm definitions
// (pluginDirs/settings), but pinned to model=haiku and a narrow disallowedTools
// list regardless of config.json's default — this is a Read-only two-turn task,
// not one of tasks.json's declarative suite entries, because the scenario needs
// a scripted file mutation BETWEEN two turns of the same session, which
// tasks.json's prompts[] array has no hook for.
//
// Usage: node benchmarks/hush/experiments/output-probes/hush-delta-smoke.js [--reps 3] [--tag <name>]
//
// Hard-capped by design: 2 arms x --reps (default 3) = 6 cells, Haiku only.
// Never commits/publishes numbers — writes its own local JSON report only.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("node:child_process");
const { parseTranscript } = require("../voice-comparison/runner/metrics.js");
const { extractToolCalls } = require("./hush-corpus-probe.js");
const { loadLegacyHush } = require("./legacy-hush.js");

const ROOT = __dirname;
const CONFIG = JSON.parse(fs.readFileSync(path.resolve(ROOT, "../voice-comparison/config.json"), "utf8"));
const DELTA_HEADER_RE = /\[hush hook: this file changed since your last read/;
// Known trap (benchmarks harness lesson): a rate-limited headless call returns
// subtype success / cost 0 with the limit message itself as the "answer" —
// silently poisons any metric read from it as a real result.
const RATE_LIMIT_RE = /you've hit your (session|usage) limit/i;
const COST_CAP_USD = 0.9;

function flag(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const reps = Number(flag("reps", 3));
const tag = flag("tag", `delta-smoke-${Date.now()}`);
if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(tag)) throw new Error("Invalid run tag: use a simple name without path separators.");

const workRoot = path.join(os.tmpdir(), "hush-delta-smoke", tag);

function cleanEnv(armEnv) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(CLAUDECODE|CLAUDE_CODE_|HUSH_|CAVEMAN_)/.test(k)) continue;
    env[k] = v;
  }
  return Object.assign(env, armEnv);
}

// Mirrors runner/run.js's buildArgs, but Read-only: no shell, no edit surface.
// Nothing in this scenario needs Bash/Edit/Write, and blocking them removes any
// chance the model "fixes" the file itself (a self-edit would legitimately
// suppress the delta, per invalidateDeltaPath) or bypasses the Read tool
// entirely via a shell file dump.
function buildArgs(arm) {
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--model", "haiku",
    "--max-turns", "6",
    "--setting-sources", "project",
    "--strict-mcp-config",
    "--permission-mode", "bypassPermissions",
    "--disallowedTools",
    "Bash,PowerShell,Agent,Task,ScheduleWakeup,CronCreate,RemoteTrigger,Edit,MultiEdit,Write,WebFetch,WebSearch",
  ];
  for (const d of CONFIG.arms[arm].pluginDirs) args.push("--plugin-dir", d);
  if (CONFIG.arms[arm].settings) args.push("--settings", CONFIG.arms[arm].settings);
  return args;
}

function spawnClaude(args, workDir, env, prompt) {
  return new Promise((resolve) => {
    const child = spawn("claude", args, { cwd: workDir, env, shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.stdin.write(prompt);
    child.stdin.end();
    const killer = setTimeout(() => child.kill("SIGKILL"), 180000);
    child.on("close", (code) => { clearTimeout(killer); resolve({ stdout, stderr, code }); });
  });
}

function parseRecords(stdout) {
  const out = [];
  for (const line of stdout.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* partial line on kill */ }
  }
  return out;
}

// Steady, log-shaped, same-template content (like the unit tests' steadyLines)
// — 50 lines stays under CAP_PASS (60) so the FIRST read isn't itself capped,
// isolating what we're actually testing: the delta on the SECOND read.
const STEADY_LINES = 50;
function steadyLog() {
  return Array.from({ length: STEADY_LINES }, (_, i) =>
    `10:${String(i % 60).padStart(2, "0")} info request handled in ${20 + i}ms`
  ).join("\n");
}

async function oneCell(arm, rep) {
  const key = `${arm}__r${rep}`;
  const workDir = path.join(workRoot, key);
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(workDir, "logs"), { recursive: true });
  const logPath = path.join(workDir, "logs", "app.log");
  const logPathPosix = logPath.replace(/\\/g, "/");
  fs.writeFileSync(logPath, steadyLog());

  const env = cleanEnv(CONFIG.arms[arm].env || {});
  const args = buildArgs(arm);

  const t1 = await spawnClaude(args, workDir, env,
    `Read the log file at ${logPathPosix} in full and tell me, in one short sentence, what kind of activity it records.`);

  // Simulated external change — a second process appending/rewriting the log,
  // NOT the session's own Edit/Write/MultiEdit.
  const lines = fs.readFileSync(logPath, "utf8").split("\n");
  lines[29] = "10:30 ERROR redis ECONNREFUSED 127.0.0.1:6379";
  fs.writeFileSync(logPath, lines.join("\n"));

  const t2 = await spawnClaude([...args, "--continue"], workDir, env,
    `The file at ${logPathPosix} may have changed since you last read it. Read it again in full (the exact same path, no offset or limit) and tell me exactly what is different from before.`);

  const p1 = parseTranscript(t1.stdout);
  const p2 = parseTranscript(t2.stdout);
  const rateLimited = RATE_LIMIT_RE.test(p1.finalText || "") || RATE_LIMIT_RE.test(p2.finalText || "");
  const costUsd = (p1.costUsd || 0) + (p2.costUsd || 0);

  const calls1 = extractToolCalls(parseRecords(t1.stdout));
  const calls2 = extractToolCalls(parseRecords(t2.stdout));
  const reads2 = calls2.filter((c) => c.name === "Read");
  const targetRead = reads2.find((c) => {
    const fp = c.input && typeof c.input.file_path === "string" ? c.input.file_path.replace(/\\/g, "/") : "";
    const isRange = c.input && (c.input.offset != null || c.input.limit != null);
    return fp === logPathPosix && !isRange;
  });

  const deltaOnTarget = !!(targetRead && targetRead.resultText && DELTA_HEADER_RE.test(targetRead.resultText));
  const anyDeltaAnywhere = [...calls1, ...calls2].some((c) => c.resultText && DELTA_HEADER_RE.test(c.resultText));
  const falseTriggerElsewhere = anyDeltaAnywhere && !deltaOnTarget;

  const poisoned = rateLimited || costUsd === 0 || t1.code !== 0 || t2.code !== 0;

  return {
    key, arm, rep,
    turn2FoundFullReRead: !!targetRead,
    deltaMarkerFired: deltaOnTarget,
    falseTriggerElsewhere,
    bytesOutTurn2Read: targetRead && targetRead.resultText ? targetRead.resultText.length : null,
    costUsd,
    rateLimited,
    poisoned,
    exitCode1: t1.code, exitCode2: t2.code,
    resultSubtype1: p1.resultSubtype, resultSubtype2: p2.resultSubtype,
    finalText2: (p2.finalText || "").slice(0, 300),
  };
}

function summarize(results) {
  const on = results.filter((r) => r.arm === "hush" && !r.poisoned);
  const off = results.filter((r) => r.arm === "baseline" && !r.poisoned);
  const onBytes = on.filter((r) => r.deltaMarkerFired).map((r) => r.bytesOutTurn2Read);
  const offBytes = off.filter((r) => r.turn2FoundFullReRead).map((r) => r.bytesOutTurn2Read);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const avgOn = avg(onBytes);
  const avgOff = avg(offBytes);
  return {
    hushOnCells: on.length,
    hushOnDeltaFired: on.filter((r) => r.deltaMarkerFired).length,
    hushOnFalseTrigger: on.filter((r) => r.falseTriggerElsewhere).length,
    baselineCells: off.length,
    avgBytesHushOnDelta: avgOn,
    avgBytesBaselineFullRead: avgOff,
    savingsVsBaseline: avgOn !== null && avgOff !== null ? (avgOff - avgOn) / avgOff : null,
    anyPoisonedCells: results.some((r) => r.poisoned),
  };
}

async function main() {
  const legacy = loadLegacyHush(["mcpTableCandidate"]);
  CONFIG.arms.hush.pluginDirs = [legacy.root];
  fs.mkdirSync(workRoot, { recursive: true });
  const results = [];
  let totalCost = 0;
  const arms = ["baseline", "hush"];
  outer:
  for (const arm of arms) {
    for (let r = 1; r <= reps; r++) {
      if (totalCost >= COST_CAP_USD) { console.log(`cost cap $${COST_CAP_USD} reached — stopping`); break outer; }
      const res = await oneCell(arm, r);
      totalCost += res.costUsd || 0;
      results.push(res);
      console.log(JSON.stringify(res));
    }
  }
  const summary = summarize(results);
  const outFile = path.resolve(ROOT, "../../results/output-probes", tag, "delta.json");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), reps, totalCost, summary, results }, null, 2));
  console.log(`\nsummary: ${JSON.stringify(summary, null, 2)}`);
  console.log(`total cost: $${totalCost.toFixed(4)}`);
  console.log(`results -> ${outFile}`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
