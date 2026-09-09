#!/usr/bin/env node
"use strict";

// Read-only corpus probe (ROADMAP 063 / brief T1, docs/research/hush-razor-repo-mining-2026-07-17.md
// section 4). Scans local Claude Code transcripts under ~/.claude/projects and measures five
// independent, probe-gated hush candidates without ever touching a transcript file:
//
//   (a) same-command re-run incidence + line-overlap distribution on cleaned outputs
//   (b) re-Read incidence of files whose content changed between reads
//   (c) Spearman correlation of transcript file size vs last-usage context tokens
//   (d) cache-degradation signature incidence (flat cache_read + growing cache_creation +
//       ratio<0.5 over a 4-turn window)
//   (e) count of Bash/PowerShell results that parse as JSON and pass hush's mcpTableCandidate gate
//
// Usage: node benchmarks/hush/experiments/output-probes/hush-corpus-probe.js [--projects-dir <path>] [--out-json <path>]
//                                               [--out-md <path>] [--limit-dirs N]
//
// Never writes, moves, or deletes anything under the projects dir. All other files it writes
// are its own JSON/markdown report outputs.

const fs = require("fs");
const os = require("os");
const path = require("path");

const { loadLegacyHush } = require("./legacy-hush.js");
let legacy;
const backend = () => (legacy ||= loadLegacyHush(["stripAnsi", "resolveCarriageReturns", "mcpTableCandidate"]).api);
const stripAnsi = (...args) => backend().stripAnsi(...args);
const resolveCarriageReturns = (...args) => backend().resolveCarriageReturns(...args);
const mcpTableCandidate = (...args) => backend().mcpTableCandidate(...args);

const REPO_ROOT = path.resolve(__dirname, "../../../..");

function parseArgs(argv) {
  const run = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const output = path.join(REPO_ROOT, "benchmarks", "hush", "results", "output-probes", run);
  const out = {
    projectsDir: path.join(os.homedir(), ".claude", "projects"),
    outJson: path.join(output, "corpus.json"),
    outMd: path.join(output, "corpus.md"),
    limitDirs: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--projects-dir") out.projectsDir = argv[++i];
    else if (a === "--out-json") out.outJson = argv[++i];
    else if (a === "--out-md") out.outMd = argv[++i];
    else if (a === "--limit-dirs") out.limitDirs = parseInt(argv[++i], 10) || 0;
  }
  return out;
}

// --- exclusion: benchmark-harness sessions are non-independent (probe 008 precedent) --------
//
// Every private harness runner in this repo (benchmarks/hush/experiments/voice-comparison/runner, foreman-craft, foreman-handoff)
// spawns headless sessions with cwd = path.join(os.tmpdir(), '<harness-name>', tag, cell) —
// confirmed by reading their spawn call sites. razor-vs-ponytail and the public benchmarks/razor
// and hush/benchmarks repro harnesses instead use an isolated cwd *inside* a `benchmarks` (or
// `.benchmarks`) directory of this repo. Both shapes are synthetic, repeated-fixture task runs,
// not organic engineering sessions, so both are excluded from every measurement below.
function isBenchmarkHarnessCwd(cwd) {
  if (typeof cwd !== "string" || !cwd) return false;
  const norm = cwd.replace(/\\/g, "/");
  if (/\/\.?benchmarks\//i.test(norm)) return true;
  const tmp = os.tmpdir().replace(/\\/g, "/").toLowerCase();
  if (norm.toLowerCase().startsWith(tmp)) return true;
  return false;
}

function listJsonlFiles(projectsDir, limitDirs) {
  let dirs;
  try {
    dirs = fs.readdirSync(projectsDir);
  } catch (e) {
    throw new Error(`cannot read projects dir ${projectsDir}: ${e.message}`);
  }
  if (limitDirs > 0) dirs = dirs.slice(0, limitDirs);
  const files = [];
  for (const d of dirs) {
    const full = path.join(projectsDir, d);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    let entries;
    try {
      entries = fs.readdirSync(full);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (f.endsWith(".jsonl")) files.push(path.join(full, f));
    }
  }
  return files;
}

function readRecords(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
  const lines = text.split("\n");
  const records = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      /* skip malformed line (partial write, in-progress session) */
    }
  }
  return records;
}

function findSessionCwd(records) {
  for (const r of records) {
    if (typeof r.cwd === "string" && r.cwd) return r.cwd;
  }
  return null;
}

// --- shared indexing: tool_use blocks paired to their tool_result by id, in file order ------

function extractToolCalls(records) {
  const pending = new Map(); // tool_use_id -> {name, input}
  const calls = []; // {name, input, resultText}
  for (const r of records) {
    if (r.type === "assistant" && Array.isArray(r.message && r.message.content)) {
      for (const c of r.message.content) {
        if (c && c.type === "tool_use" && c.id) pending.set(c.id, { name: c.name, input: c.input });
      }
    }
    if (r.type === "user" && Array.isArray(r.message && r.message.content)) {
      for (const c of r.message.content) {
        if (c && c.type === "tool_result" && c.tool_use_id && pending.has(c.tool_use_id)) {
          const use = pending.get(c.tool_use_id);
          pending.delete(c.tool_use_id);
          let resultText = null;
          if (typeof c.content === "string") resultText = c.content;
          else if (Array.isArray(c.content)) {
            const t = c.content
              .filter((b) => b && b.type === "text" && typeof b.text === "string")
              .map((b) => b.text)
              .join("\n");
            resultText = t || null;
          }
          calls.push({ name: use.name, input: use.input, resultText });
        }
      }
    }
  }
  return calls;
}

function extractUsageSequence(records) {
  const seq = [];
  for (const r of records) {
    if (r.type !== "assistant") continue;
    const u = r.message && r.message.usage;
    if (
      u &&
      typeof u.input_tokens === "number" &&
      typeof u.cache_read_input_tokens === "number" &&
      typeof u.cache_creation_input_tokens === "number"
    ) {
      seq.push({
        input: u.input_tokens,
        cacheRead: u.cache_read_input_tokens,
        cacheCreation: u.cache_creation_input_tokens,
      });
    }
  }
  return seq;
}

// --- (a) same-command re-run + cleaned-output line overlap -----------------------------------

const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

function cleanText(text) {
  return resolveCarriageReturns(stripAnsi(String(text)));
}

function lineOverlap(a, b) {
  const sa = new Set(a.split("\n"));
  const sb = new Set(b.split("\n"));
  let inter = 0;
  for (const l of sa) if (sb.has(l)) inter++;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 1 : inter / union;
}

function analyzeRepeatCommands(calls, agg) {
  const lastSeen = new Map(); // "tool::command" -> cleaned text of last occurrence
  for (const call of calls) {
    if (!SHELL_TOOLS.has(call.name)) continue;
    const command = call.input && typeof call.input.command === "string" ? call.input.command.trim() : null;
    if (!command || call.resultText === null) continue;
    const key = `${call.name}::${command}`;
    const cleaned = cleanText(call.resultText);
    agg.totalShellCalls++;
    if (lastSeen.has(key)) {
      const prev = lastSeen.get(key);
      agg.rerunPairs++;
      const exact = prev === cleaned;
      const overlap = exact ? 1 : lineOverlap(prev, cleaned);
      agg.overlaps.push(overlap);
      if (exact) agg.bucketExact++;
      else if (overlap >= 0.9) agg.bucketHigh90++;
      else if (overlap >= 0.7) agg.bucketHigh70++;
      else if (overlap >= 0.5) agg.bucketMid50++;
      else agg.bucketLow++;
    }
    lastSeen.set(key, cleaned);
  }
}

// --- (b) re-Read incidence of files whose content changed ------------------------------------

function cheapHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

const WRITE_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);

// T6's re-read delta target is a file that changed for a reason OUTSIDE the session's own
// editing (an external build/codegen/log write) — never a source file the same session just
// Edited, which the model already knows it changed. Track a sticky per-path flag set whenever
// an Edit/Write/MultiEdit touches that path, so a changed re-read can be split into
// "self-edited in between" (expected, not a delta candidate) vs "changed with no self-edit
// seen" (the actual external-change signal).
function analyzeRepeatReads(calls, agg) {
  const lastSeen = new Map(); // file_path -> hash of last FULL read content
  const editedSince = new Set(); // file_path touched by Edit/Write/MultiEdit since its last full read
  for (const call of calls) {
    if (WRITE_TOOLS.has(call.name)) {
      const p = call.input && typeof call.input.file_path === "string" ? call.input.file_path : null;
      if (p) editedSince.add(p);
      continue;
    }
    if (call.name !== "Read") continue;
    const filePath = call.input && typeof call.input.file_path === "string" ? call.input.file_path : null;
    if (!filePath) continue;
    // The transcript's own tool_result content for Read is the plain cat-n-numbered text the
    // model actually saw (confirmed by direct inspection) — not the {file:{content}} shape the
    // PostToolUse hook receives live. Use it as-is: this is what "changed between reads" means.
    const content = call.resultText;
    if (content === null) continue;
    // A partial read (offset/limit set) covers a different slice than a prior full or partial
    // read of the same path — comparing those strings would flag "changed" on every offset
    // change even when the file is untouched. Only full-file reads (no offset, no limit) are
    // ever compared, on both sides of the pair.
    const isPartial = call.input && (call.input.offset != null || call.input.limit != null);
    if (isPartial) continue;
    agg.totalReads++;
    const hash = cheapHash(content);
    if (lastSeen.has(filePath)) {
      agg.rereads++;
      if (lastSeen.get(filePath) !== hash) {
        agg.rereadsChanged++;
        if (editedSince.has(filePath)) agg.rereadsChangedSelfEdited++;
        else agg.rereadsChangedExternal++;
      }
    }
    lastSeen.set(filePath, hash);
    editedSince.delete(filePath);
  }
}

// --- (c) Spearman correlation: transcript size vs last-usage context tokens ------------------

function rankOf(values) {
  const idx = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
  const ranks = new Array(values.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && values[idx[j + 1]] === values[idx[i]]) j++;
    const avgRank = (i + j) / 2 + 1; // 1-based average rank for ties
    for (let k = i; k <= j; k++) ranks[idx[k]] = avgRank;
    i = j + 1;
  }
  return ranks;
}

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    dx2 = 0,
    dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return null;
  return num / Math.sqrt(dx2 * dy2);
}

function spearman(pairs) {
  if (pairs.length < 2) return { n: pairs.length, rho: null };
  const xs = pairs.map((p) => p.x);
  const ys = pairs.map((p) => p.y);
  const rx = rankOf(xs);
  const ry = rankOf(ys);
  return { n: pairs.length, rho: pearson(rx, ry) };
}

// --- (d) cache-degradation signature (clauditor cache-health.ts:36-46, operationalized) ------
//
// Source formula (from the mined intel, code not available to us — PolyForm-NC clean-room
// reference only): cacheRatio = cache_read / (input + cache_read + cache_creation) per turn;
// "broken" = flat cache_read + growing cache_creation + ratio < 0.5 over the last 4 turns. The
// exact thresholds for "flat" / "growing" aren't specified in the mined text, so this probe
// picks explicit, documented tolerances and reports two independent readings of "ratio < 0.5
// over 4 turns" (aggregate-over-window and every-turn-individually) so the verdict isn't
// hostage to one interpretation.
const DEGRADE_WINDOW = 4;
const FLAT_TOLERANCE = 0.15; // (max-min)/max <= this counts as "flat"
const GROWTH_MIN_FRACTION = 0.2; // last must exceed first by at least this fraction
const GROWTH_DIP_TOLERANCE = 0.1; // no single step may drop more than this fraction

function isFlat(vals) {
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  if (max === 0) return true;
  return (max - min) / max <= FLAT_TOLERANCE;
}

function isGrowing(vals) {
  const first = vals[0];
  const last = vals[vals.length - 1];
  if (last <= first * (1 + GROWTH_MIN_FRACTION) && !(first === 0 && last > 0)) return false;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] < vals[i - 1] * (1 - GROWTH_DIP_TOLERANCE)) return false;
  }
  return true;
}

function analyzeCacheDegradation(usageSeq, agg) {
  if (usageSeq.length < DEGRADE_WINDOW) return;
  agg.eligibleSessions++;
  let sessionHitAggregate = false;
  let sessionHitPerTurn = false;
  for (let start = 0; start + DEGRADE_WINDOW <= usageSeq.length; start++) {
    const window = usageSeq.slice(start, start + DEGRADE_WINDOW);
    agg.windowsExamined++;
    const cacheReads = window.map((w) => w.cacheRead);
    const cacheCreations = window.map((w) => w.cacheCreation);
    const flat = isFlat(cacheReads);
    const growing = isGrowing(cacheCreations);
    if (!flat || !growing) continue;

    const totalRead = cacheReads.reduce((a, b) => a + b, 0);
    const totalAll = window.reduce((a, w) => a + w.input + w.cacheRead + w.cacheCreation, 0);
    const aggregateRatio = totalAll === 0 ? 1 : totalRead / totalAll;
    if (aggregateRatio < 0.5) {
      agg.windowsHitAggregate++;
      sessionHitAggregate = true;
    }

    const perTurnRatios = window.map((w) => {
      const total = w.input + w.cacheRead + w.cacheCreation;
      return total === 0 ? 1 : w.cacheRead / total;
    });
    if (perTurnRatios.every((r) => r < 0.5)) {
      agg.windowsHitPerTurn++;
      sessionHitPerTurn = true;
    }
  }
  if (sessionHitAggregate) agg.sessionsHitAggregate++;
  if (sessionHitPerTurn) agg.sessionsHitPerTurn++;
}

// --- (e) Bash/PowerShell results parsing as JSON that pass hush's mcpTableCandidate gate ----

function analyzeShellJsonTables(calls, agg) {
  for (const call of calls) {
    if (!SHELL_TOOLS.has(call.name) || call.resultText === null) continue;
    agg.totalShellResults++;
    if (call.resultText.length < 2048) continue;
    agg.bigResults++;
    let parsed = false;
    try {
      JSON.parse(call.resultText);
      parsed = true;
    } catch {
      /* not JSON */
    }
    if (!parsed) continue;
    agg.jsonParseable++;
    if (mcpTableCandidate(call.resultText)) agg.passesGate++;
  }
}

// --- main --------------------------------------------------------------------------------

function main() {
  backend(); // Validate the historical source before reading any transcripts.
  const args = parseArgs(process.argv.slice(2));
  const files = listJsonlFiles(args.projectsDir, args.limitDirs);

  const stats = {
    projectsDir: args.projectsDir,
    totalFiles: files.length,
    includedSessions: 0,
    excludedHarnessSessions: 0,
    excludedUnreadableSessions: 0,
    unknownCwdSessions: 0,

    a: { totalShellCalls: 0, rerunPairs: 0, overlaps: [], bucketExact: 0, bucketHigh90: 0, bucketHigh70: 0, bucketMid50: 0, bucketLow: 0 },
    b: { totalReads: 0, rereads: 0, rereadsChanged: 0, rereadsChangedSelfEdited: 0, rereadsChangedExternal: 0 },
    cPairs: [],
    d: { eligibleSessions: 0, windowsExamined: 0, windowsHitAggregate: 0, windowsHitPerTurn: 0, sessionsHitAggregate: 0, sessionsHitPerTurn: 0 },
    e: { totalShellResults: 0, bigResults: 0, jsonParseable: 0, passesGate: 0 },
  };

  let processed = 0;
  for (const filePath of files) {
    processed++;
    if (processed % 500 === 0) process.stderr.write(`  ...${processed}/${files.length} files\n`);

    const records = readRecords(filePath);
    if (!records) {
      stats.excludedUnreadableSessions++;
      continue;
    }
    const cwd = findSessionCwd(records);
    if (cwd === null) stats.unknownCwdSessions++;
    if (isBenchmarkHarnessCwd(cwd)) {
      stats.excludedHarnessSessions++;
      continue;
    }
    stats.includedSessions++;

    const calls = extractToolCalls(records);
    analyzeRepeatCommands(calls, stats.a);
    analyzeRepeatReads(calls, stats.b);
    analyzeShellJsonTables(calls, stats.e);

    const usageSeq = extractUsageSequence(records);
    if (usageSeq.length) {
      let fileSize;
      try {
        fileSize = fs.statSync(filePath).size;
      } catch {
        fileSize = null;
      }
      if (fileSize !== null) {
        const last = usageSeq[usageSeq.length - 1];
        stats.cPairs.push({ x: fileSize, y: last.input + last.cacheRead + last.cacheCreation });
      }
    }
    analyzeCacheDegradation(usageSeq, stats.d);
  }

  const spearmanResult = spearman(stats.cPairs);

  const report = {
    generatedAt: new Date().toISOString(),
    corpus: {
      projectsDir: stats.projectsDir,
      totalSessionFiles: stats.totalFiles,
      includedSessions: stats.includedSessions,
      excludedHarnessSessions: stats.excludedHarnessSessions,
      excludedUnreadableSessions: stats.excludedUnreadableSessions,
      unknownCwdSessions: stats.unknownCwdSessions,
    },
    a_sameCommandRerun: {
      totalShellCalls: stats.a.totalShellCalls,
      rerunPairs: stats.a.rerunPairs,
      rerunRate: stats.a.totalShellCalls ? stats.a.rerunPairs / stats.a.totalShellCalls : 0,
      buckets: {
        exactIdentical: stats.a.bucketExact,
        overlap90to100: stats.a.bucketHigh90,
        overlap70to90: stats.a.bucketHigh70,
        overlap50to70: stats.a.bucketMid50,
        overlapBelow50: stats.a.bucketLow,
      },
      shareExactOrHighOverlap: stats.a.rerunPairs
        ? (stats.a.bucketExact + stats.a.bucketHigh90 + stats.a.bucketHigh70) / stats.a.rerunPairs
        : 0,
    },
    b_reReadChanged: {
      totalReads: stats.b.totalReads,
      rereads: stats.b.rereads,
      rereadsChanged: stats.b.rereadsChanged,
      rereadsChangedSelfEdited: stats.b.rereadsChangedSelfEdited,
      rereadsChangedExternal: stats.b.rereadsChangedExternal,
      changedShareOfRereads: stats.b.rereads ? stats.b.rereadsChanged / stats.b.rereads : 0,
      externalChangedShareOfRereads: stats.b.rereads ? stats.b.rereadsChangedExternal / stats.b.rereads : 0,
    },
    c_sizeVsContextTokens: {
      n: spearmanResult.n,
      rho: spearmanResult.rho,
    },
    d_cacheDegradation: {
      eligibleSessions: stats.d.eligibleSessions,
      windowsExamined: stats.d.windowsExamined,
      windowsHitAggregateRatio: stats.d.windowsHitAggregate,
      windowsHitPerTurnRatio: stats.d.windowsHitPerTurn,
      sessionsHitAggregateRatio: stats.d.sessionsHitAggregate,
      sessionsHitPerTurnRatio: stats.d.sessionsHitPerTurn,
      sessionIncidenceAggregate: stats.d.eligibleSessions ? stats.d.sessionsHitAggregate / stats.d.eligibleSessions : 0,
      sessionIncidencePerTurn: stats.d.eligibleSessions ? stats.d.sessionsHitPerTurn / stats.d.eligibleSessions : 0,
    },
    e_shellJsonTables: {
      totalShellResults: stats.e.totalShellResults,
      bigResults: stats.e.bigResults,
      jsonParseable: stats.e.jsonParseable,
      passesGate: stats.e.passesGate,
    },
  };

  fs.mkdirSync(path.dirname(args.outJson), { recursive: true });
  fs.writeFileSync(args.outJson, JSON.stringify(report, null, 2));

  fs.mkdirSync(path.dirname(args.outMd), { recursive: true });
  fs.writeFileSync(args.outMd, renderMarkdown(report));

  process.stdout.write(`corpus probe done: ${stats.includedSessions} included / ${stats.totalFiles} total sessions\n`);
  process.stdout.write(`  json -> ${args.outJson}\n`);
  process.stdout.write(`  md   -> ${args.outMd}\n`);
}

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function verdict(ok, yes, no) {
  return ok ? yes : no;
}

function renderMarkdown(r) {
  const a = r.a_sameCommandRerun;
  const b = r.b_reReadChanged;
  const c = r.c_sizeVsContextTokens;
  const d = r.d_cacheDegradation;
  const e = r.e_shellJsonTables;

  const aGoNoGo = a.rerunPairs >= 20 && a.shareExactOrHighOverlap >= 0.3;
  // T6's re-read-delta target is explicitly non-source (logs/generated) paths that changed for
  // a reason outside the session's own editing — gate on the external-change count, not the raw
  // changed count (which is dominated by ordinary edit-then-verify-read on source files).
  const bGoNoGo = b.rereadsChangedExternal >= 20;
  const dGoNoGo = d.eligibleSessions >= 10 && d.sessionIncidenceAggregate >= 0.05;
  const eGoNoGo = e.passesGate >= 20;

  return `# Corpus probe verdicts — ROADMAP 063 / brief T1

Generated ${r.generatedAt}. Read-only scan of \`${r.corpus.projectsDir}\`. Full numbers in the
sibling JSON report (\`hush-corpus-probe-results.json\` in \`.scratch/\`, gitignored).

## Corpus

- Total session files on disk: ${r.corpus.totalSessionFiles}
- Excluded as benchmark-harness (non-independent, cwd under a \`benchmarks\`/\`.scratch\` dir or the OS temp root): ${r.corpus.excludedHarnessSessions}
- Excluded as unreadable: ${r.corpus.excludedUnreadableSessions}
- **Included (organic) sessions measured: ${r.corpus.includedSessions}**
- Sessions with no recoverable \`cwd\` (kept, not excluded): ${r.corpus.unknownCwdSessions}

---

## (a) Same-command re-run incidence — gates ROADMAP 066(a), informs T6 re-run delta

- Shell (Bash/PowerShell) tool calls measured: ${a.totalShellCalls}
- Re-run pairs found (same tool + exact command string, re-run within the same session): **${a.rerunPairs}** (rate ${pct(a.rerunRate)} of all shell calls)
- Overlap distribution on cleaned outputs (stripAnsi + resolveCarriageReturns, hush's own cleaning pass):
  - exact-identical: ${a.buckets.exactIdentical}
  - 90-100% line overlap: ${a.buckets.overlap90to100}
  - 70-90% line overlap: ${a.buckets.overlap70to90}
  - 50-70% line overlap: ${a.buckets.overlap50to70}
  - below 50% line overlap: ${a.buckets.overlapBelow50}
- Share of re-run pairs at exact-identical or >=70% overlap: ${pct(a.shareExactOrHighOverlap)}

**Verdict: ${verdict(aGoNoGo, "BUILD candidate", "DO NOT BUILD")}** (gate: >=20 re-run pairs AND >=30% of them exact-identical or >=70% overlap).
${verdict(
  aGoNoGo,
  "Re-run volume clears the gate — worth sizing the squeez-style fuzzy-dedup half of T6.",
  `Re-run pair *volume* clears the bar (${a.rerunPairs} >= 20), but the overlap share (${pct(
    a.shareExactOrHighOverlap
  )}) falls just under the 30% line — a close call, not a clean null result like RDXmin's 0-hit replay or hush's 0.3.7 refutation. Exact-identical alone is ${a.buckets.exactIdentical} of ${
    a.rerunPairs
  } pairs (${pct(a.buckets.exactIdentical / a.rerunPairs)}); the bulk of re-run pairs (${pct(
    a.buckets.overlapBelow50 / a.rerunPairs
  )}) share under half their lines, meaning most same-command re-runs genuinely produce different output. Treat as a soft no for now; re-run this probe after the corpus grows before ruling it out for good.`
)}

---

## (b) Re-Read incidence of files whose content changed — gates ROADMAP 066(b), informs T6 re-read delta

Only full-file re-reads (no offset/limit on either side of the pair) are compared — a partial
read at a different offset/limit isn't a valid content comparison. Changed re-reads are further
split by whether the same session Edited/Wrote that exact path in between: T6's re-read-delta
target is explicitly non-source (logs/generated) paths that changed for a reason **outside**
the session's own editing, so an edit-then-verify-read (expected, not a delta candidate) is
counted separately from a genuinely external change.

- Read tool calls with recoverable file content: ${b.totalReads}
- Full-file re-reads of a previously-read path within the same session: **${b.rereads}**
- Of those, content changed since the prior read: ${b.rereadsChanged} (${pct(b.changedShareOfRereads)} of re-reads)
  - changed with an Edit/Write/MultiEdit on that path in between (expected, self-caused): ${b.rereadsChangedSelfEdited}
  - changed with **no** self-edit seen in between (the external-change signal T6 targets): **${b.rereadsChangedExternal}** (${pct(b.externalChangedShareOfRereads)} of re-reads)

**Verdict: ${verdict(bGoNoGo, "BUILD candidate", "DO NOT BUILD")}** (gate: >=20 externally-changed re-reads).
${verdict(
  bGoNoGo,
  "External-change re-read volume clears the gate — worth sizing the token-optimizer-style diff-delta half of T6.",
  "Too few re-reads show a content change that ISN'T explained by the session's own Edit/Write on that path — the raw changed-re-read count looks high, but it's almost entirely ordinary edit-then-verify-read on source files, which T6 explicitly excludes (never delta a file the session just edited)."
)}

---

## (c) Transcript file size vs last-usage context tokens — informs ROADMAP 064(c), pressureScale proxy quality

- Sessions with at least one usable \`usage\` record: ${c.n}
- Spearman rho (file size in bytes vs last assistant record's input + cache_read + cache_creation): ${c.rho === null ? "n/a (insufficient variance)" : c.rho.toFixed(3)}

This item has no build/no-build gate of its own — it informs ROADMAP 064(c) (whether to swap
\`pressureScale\`'s file-size proxy for a real usage-token read).

**Verdict: ${
    c.rho === null
      ? "INCONCLUSIVE"
      : c.rho >= 0.7
        ? "PROXY HOLDS"
        : c.rho >= 0.4
          ? "PROXY PARTIAL"
          : "PROXY WEAK"
  }** ${
    c.rho === null
      ? "Not enough data to compute a correlation."
      : c.rho >= 0.7
        ? "Strong positive correlation — file size is a solid free proxy for context pressure; \`pressureScale\`'s current file-size heuristic is well grounded, low priority to replace with a real usage-token read."
        : c.rho >= 0.4
          ? "Moderate correlation — file size is a usable but imperfect proxy; a usage-token-based pressure signal (clauditor L1) would be a real accuracy improvement if the cost of reading it is low."
          : "Weak correlation — file size is a poor stand-in for actual context pressure on this corpus; \`pressureScale\` should be reconsidered in favor of a real usage-token read (clauditor L1/ccusage shape)."
  }

---

## (d) Cache-degradation signature incidence — gates the cache-health candidate (Tier 2, R7)

Operationalized from the mined description (clauditor \`cache-health.ts:36-46\`; source not
available to us, PolyForm-NC clean-room reference only) as: over a sliding ${DEGRADE_WINDOW}-turn
window of assistant \`usage\` records, flat cache_read (relative range <= ${FLAT_TOLERANCE}) AND
growing cache_creation (grows by >= ${GROWTH_MIN_FRACTION * 100}% end-to-end, no single-step drop > ${
    GROWTH_DIP_TOLERANCE * 100
  }%) AND cacheRatio < 0.5. Two independent readings of the ratio condition are reported since the
source didn't specify aggregate-vs-per-turn:

- Sessions with >=${DEGRADE_WINDOW} usage records (eligible): ${d.eligibleSessions}
- 4-turn windows examined: ${d.windowsExamined}
- Windows hitting flat+growing+ratio<0.5 (aggregate-over-window ratio): ${d.windowsHitAggregateRatio}
- Windows hitting flat+growing+ratio<0.5 (every individual turn's ratio): ${d.windowsHitPerTurnRatio}
- **Sessions with >=1 hit (aggregate ratio): ${d.sessionsHitAggregateRatio} (${pct(d.sessionIncidenceAggregate)} of eligible sessions)**
- Sessions with >=1 hit (per-turn ratio, stricter): ${d.sessionsHitPerTurnRatio} (${pct(d.sessionIncidencePerTurn)} of eligible sessions)

**Verdict: ${verdict(dGoNoGo, "BUILD candidate", "DO NOT BUILD")}** (gate: >=10 eligible sessions AND >=5% aggregate-ratio incidence).
${verdict(
  dGoNoGo,
  "The degradation signature occurs often enough on this corpus to justify the one-shot cache-health warning.",
  `The aggregate-ratio incidence (${pct(
    d.sessionIncidenceAggregate
  )} of ${d.eligibleSessions} eligible sessions) sits just under the chosen 5% line, not near zero — this is a close call, not a clean non-event like razor's 0.3.7/0.3.8 result. ${
    d.sessionsHitAggregateRatio
  } real sessions did show the flat-cache_read + growing-cache_creation + sub-0.5-ratio shape. Read as a soft no at this threshold; a slightly lower bar (or a larger corpus) would flip it to a build candidate, so this is worth a second look rather than a closed door.`
)}

---

## (e) Bash/PowerShell results parsing as JSON and passing mcpTableCandidate — gates ROADMAP 067(e) / T7

- Shell tool results measured: ${e.totalShellResults}
- Results >=2KB (mcpTableCandidate's own size floor): ${e.bigResults}
- Of those, JSON-parseable: ${e.jsonParseable}
- Of those, passing the full mcpTableCandidate gate (>=5 homogeneous objects, >=80% key overlap) as reused verbatim from \`hush/hooks/compress-tool-output.js\`: **${e.passesGate}**

**Verdict: ${verdict(eGoNoGo, "BUILD candidate", "DO NOT BUILD")}** (gate: >=20 passing results, mirroring the scale of the original MCP corpus probe that sized \`renderMcpTable\`).
${verdict(
  eGoNoGo,
  "Shell-JSON volume clears the gate — worth routing cleaned JSON-parsable Bash/PowerShell output through mcpTableCandidate per T7.",
  "Shell-JSON volume passing the full gate is too low on this corpus to justify extending mcpTableCandidate to shell output; most large shell JSON either isn't homogeneous-record-shaped or doesn't clear the 2KB/5-record/80%-key-overlap bar."
)}
`;
}

if (require.main === module) {
  if (process.argv.includes("--help")) console.log("Historical corpus probe. Set HUSH_DIR to its compatible source revision, then supply --projects-dir, --out-json and --out-md. Reads transcripts only when explicitly run; --help reads none.");
  else main();
}

module.exports = {
  isBenchmarkHarnessCwd,
  lineOverlap,
  cheapHash,
  rankOf,
  pearson,
  spearman,
  isFlat,
  isGrowing,
  cleanText,
  listJsonlFiles,
  readRecords,
  findSessionCwd,
  extractToolCalls,
};
