#!/usr/bin/env node
"use strict";

// Read-only corpus probe (ROADMAP 067 / brief T7, docs/research/hush-razor-repo-mining-2026-07-17.md
// section 4 + docs/research/hush-gcf-intel-2026-07-17.md F1). Re-runs the Probe-7 MCP-table
// measurement (the one whose 27.9%-median result is cited in compress-tool-output.js's
// MCP_TABLE_RE comment) with depth-1 parent>child flattening + constant-leaf factoring added,
// and reports the median char savings of the flattened renderer over the CURRENT renderMcpTable
// on the same eligible-payload set. Never writes, moves, or deletes anything under the
// projects dir.
//
// Usage: node benchmarks/hush/experiments/output-probes/hush-flatten-probe.js [--projects-dir <path>] [--out-json <path>]

const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  isBenchmarkHarnessCwd,
  listJsonlFiles,
  readRecords,
  findSessionCwd,
  extractToolCalls,
} = require("./hush-corpus-probe.js");

const { loadLegacyHush } = require("./legacy-hush.js");
let legacy;
const backend = () => (legacy ||= loadLegacyHush(["isMcpTableTool", "mcpTableCandidate", "renderMcpTable"]).api);
const isMcpTableTool = (...args) => backend().isMcpTableTool(...args);
const mcpTableCandidate = (...args) => backend().mcpTableCandidate(...args);
const renderMcpTable = (...args) => backend().renderMcpTable(...args);

const REPO_ROOT = path.resolve(__dirname, "../../../..");

function parseArgs(argv) {
  const out = {
    projectsDir: path.join(os.homedir(), ".claude", "projects"),
    outJson: path.join(REPO_ROOT, "benchmarks", "hush", "results", "output-probes", new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid, "flatten.json"),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--projects-dir") out.projectsDir = argv[++i];
    else if (a === "--out-json") out.outJson = argv[++i];
  }
  return out;
}

// --- depth-1 parent>child flatten (F1): a column flattens only if EVERY record's value at
// that column is a plain object with an identical all-scalar key set. Anything else (missing,
// null, array, differing keys, nested object leaves) keeps the existing JSON.stringify cell —
// the same fallback renderMcpTable already uses for every non-flattenable column.

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isScalar(v) {
  return v === null || v === undefined || typeof v !== "object";
}

function flattenableLeafKeys(records, col) {
  let keys = null;
  for (const r of records) {
    const v = r[col];
    if (!isPlainObject(v)) return null;
    const vKeys = Object.keys(v).sort();
    if (!vKeys.every((k) => isScalar(v[k]))) return null;
    if (keys === null) keys = vKeys;
    else if (keys.length !== vKeys.length || !keys.every((k, i) => k === vKeys[i])) return null;
  }
  return keys && keys.length ? keys : null;
}

function flattenRecords(records, columns) {
  if (!records.length) return { records, columns };
  const leafKeysByCol = new Map();
  for (const col of columns) {
    const leafKeys = flattenableLeafKeys(records, col);
    if (leafKeys) leafKeysByCol.set(col, leafKeys);
  }
  if (!leafKeysByCol.size) return { records, columns };
  const newColumns = [];
  for (const col of columns) {
    const leafKeys = leafKeysByCol.get(col);
    if (leafKeys) newColumns.push(...leafKeys.map((lk) => `${col}>${lk}`));
    else newColumns.push(col);
  }
  const newRecords = records.map((r) => {
    const out = {};
    for (const col of columns) {
      const leafKeys = leafKeysByCol.get(col);
      if (leafKeys) {
        const v = r[col] || {};
        for (const lk of leafKeys) out[`${col}>${lk}`] = v[lk];
      } else {
        out[col] = r[col];
      }
    }
    return out;
  });
  return { records: newRecords, columns: newColumns };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function main() {
  backend(); // A retired API mismatch is not a new benchmark result.
  const args = parseArgs(process.argv.slice(2));
  const files = listJsonlFiles(args.projectsDir, 0);

  let includedSessions = 0;
  let excludedHarnessSessions = 0;
  let mcpToolCalls = 0;
  let eligible = 0;
  let flattenedAny = 0;
  const savings = [];

  let processed = 0;
  for (const filePath of files) {
    processed++;
    if (processed % 1000 === 0) process.stderr.write(`  ...${processed}/${files.length} files\n`);

    const records = readRecords(filePath);
    if (!records) continue;
    const cwd = findSessionCwd(records);
    if (isBenchmarkHarnessCwd(cwd)) {
      excludedHarnessSessions++;
      continue;
    }
    includedSessions++;

    const calls = extractToolCalls(records);
    for (const call of calls) {
      if (!isMcpTableTool(call.name) || call.resultText === null) continue;
      mcpToolCalls++;
      const candidate = mcpTableCandidate(call.resultText);
      if (!candidate) continue;
      eligible++;

      const current = renderMcpTable(candidate.records, candidate.columns);
      const { records: fr, columns: fc } = flattenRecords(candidate.records, candidate.columns);
      const flattenedSomething = fc.some((c) => c.includes(">"));
      if (flattenedSomething) flattenedAny++;
      const flat = renderMcpTable(fr, fc);
      const pctSaved = current.length ? (current.length - flat.length) / current.length : 0;
      savings.push(pctSaved);
    }
  }

  const medianSavings = median(savings);
  const report = {
    generatedAt: new Date().toISOString(),
    projectsDir: args.projectsDir,
    includedSessions,
    excludedHarnessSessions,
    mcpToolCallsSeen: mcpToolCalls,
    eligiblePayloads: eligible,
    payloadsWithAnyFlattenableColumn: flattenedAny,
    medianSavingsOverCurrentRenderer: medianSavings,
    gate: { minEligible: 20, minMedianSavings: 0.15 },
    verdict:
      eligible >= 20 && medianSavings !== null && medianSavings >= 0.15
        ? "BUILD (ship flatten in renderMcpTable)"
        : "DO NOT BUILD (refute with measured median)",
  };

  fs.mkdirSync(path.dirname(args.outJson), { recursive: true });
  fs.writeFileSync(args.outJson, JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

if (require.main === module) {
  if (process.argv.includes("--help")) console.log("Historical flatten probe. Set HUSH_DIR to its compatible source revision and supply --projects-dir and --out-json. --help does not inspect transcripts.");
  else main();
}

module.exports = { flattenRecords, flattenableLeafKeys, median };
