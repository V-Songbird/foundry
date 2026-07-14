#!/usr/bin/env node
'use strict';

// Turns plumb's dormant-phase observation log into the numbers an arming
// decision rests on. Computes inputs only — it never decides anything.
//
// plumb arming doctrine: arming is a manual decision made by reviewing these
// numbers, never automatic. A suggested bar: at least 50 edit-turns logged,
// and a would-block rate the operator judges acceptable for this codebase.

const fs = require('fs');
const { logPath } = require('../hooks/plumb-lib');
const { CLAIM_PATTERNS } = require('../hooks/stop-gate');

const ARMING_DOCTRINE = [
  'plumb arming doctrine: arming is a manual decision made by reviewing these',
  'numbers, never automatic. A suggested bar: at least 50 edit-turns logged,',
  'and a would-block rate the operator judges acceptable for this codebase.',
  'This script computes the inputs; it never decides.',
].join('\n');

// candidate-dormant / candidate-armed-blocked are the base class's per-mode
// kind names; phantom-claim (Spec P1) and claimed-over-failure (Spec P3) each
// use one shared kind name across both modes (the `mode` field carries
// dormant/armed instead) — all four count as full candidates.
const CANDIDATE_KINDS = new Set(['candidate-dormant', 'candidate-armed-blocked', 'phantom-claim', 'claimed-over-failure']);

// Reads the JSONL log. Returns null when the file is missing (caller prints
// the clean "no observations yet" line); [] when it exists but is empty.
function readRecords(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch {
    return null;
  }
  const records = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec;
    try {
      rec = JSON.parse(trimmed);
    } catch {
      continue; // skip malformed lines
    }
    // Pre-P4 lines predate the `kind` field — they were always full
    // candidates logged only while dormant.
    if (!rec.kind) rec.kind = 'candidate-dormant';
    records.push(rec);
  }
  return records;
}

function buildReport(records) {
  const total = records.length;
  const byKind = {};
  for (const rec of records) byKind[rec.kind] = (byKind[rec.kind] || 0) + 1;

  const candidates = records.filter((r) => CANDIDATE_KINDS.has(r.kind));
  const wouldBlockCount = byKind['candidate-dormant'] || 0;
  const sessions = new Set(records.map((r) => r.session).filter(Boolean));
  const timestamps = records.map((r) => r.ts).filter(Boolean).sort();

  const alternations = CLAIM_PATTERNS.map((pattern) => {
    const re = new RegExp(pattern, 'i');
    const hits = candidates.filter((r) => typeof r.claim === 'string' && re.test(r.claim)).length;
    return { pattern, hits };
  });

  return {
    totalEditTurns: total,
    byKind,
    candidateCount: candidates.length,
    candidateRate: total ? candidates.length / total : 0,
    wouldBlockCount,
    wouldBlockRate: total ? wouldBlockCount / total : 0,
    sessions: sessions.size,
    dateRange: timestamps.length ? { from: timestamps[0], to: timestamps[timestamps.length - 1] } : null,
    alternations,
  };
}

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function formatReport(report) {
  const lines = [ARMING_DOCTRINE, ''];
  lines.push(`total edit-turns logged: ${report.totalEditTurns}`);
  lines.push(`sessions covered: ${report.sessions}`);
  lines.push(`date range: ${report.dateRange ? `${report.dateRange.from} .. ${report.dateRange.to}` : 'n/a'}`);
  lines.push('');
  lines.push('per-disposition counts:');
  for (const kind of Object.keys(report.byKind).sort()) {
    const count = report.byKind[kind];
    lines.push(`  ${kind}: ${count} (${pct(count / report.totalEditTurns)})`);
  }
  lines.push('');
  lines.push(`candidate rate: ${report.candidateCount} / ${report.totalEditTurns} (${pct(report.candidateRate)})`);
  lines.push(
    `would-block rate (candidates while dormant): ${report.wouldBlockCount} / ${report.totalEditTurns} (${pct(report.wouldBlockRate)})`
  );
  lines.push('');
  lines.push('CLAIM_RE alternation hits (which claim phrases fire, among candidate records):');
  for (const { pattern, hits } of report.alternations) {
    lines.push(`  ${String(hits).padStart(4)}  ${pattern}`);
  }
  return lines.join('\n');
}

function main() {
  const file = process.argv[2] || logPath();
  const records = readRecords(file);
  if (!records || records.length === 0) {
    console.log(`plumb: no observations yet (${file})`);
    process.exit(0);
  }
  console.log(formatReport(buildReport(records)));
  process.exit(0);
}

if (require.main === module) main();

module.exports = { readRecords, buildReport, formatReport, ARMING_DOCTRINE, CANDIDATE_KINDS };
