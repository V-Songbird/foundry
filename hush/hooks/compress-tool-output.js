#!/usr/bin/env node
"use strict";

// PostToolUse hook: mechanically shrinks Bash/PowerShell output before it
// enters context. Deterministic text transforms only — no heuristic ever
// touches failure detail: failing runs get a much larger cap and everything
// kept is verbatim.

const fs = require("fs");

const WATCHED_TOOLS = new Set(["Bash", "PowerShell"]);

// Caps are in lines. Passing output is mostly noise (install trees, progress
// logs); failing output is evidence, so it keeps ~4x more.
const CAP_PASS = intEnv("HUSH_CAP_PASS", 60);
const CAP_FAIL = intEnv("HUSH_CAP_FAIL", 250);

function intEnv(name, fallback) {
  const n = parseInt(process.env[name] || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf-8") || "{}");
  } catch {
    return {};
  }
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*(?:\x07|\x1b\\)/g;

function stripAnsi(text) {
  return text.replace(ANSI_RE, "");
}

// Progress bars redraw via a bare \r (no following \n); only the final state
// of each physical line matters. \r\n is an ordinary Windows line ending, not
// a redraw — normalize it away first or every CRLF-terminated line (i.e.
// nearly all native Windows console output) collapses to empty.
function resolveCarriageReturns(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const i = line.lastIndexOf("\r");
      return i === -1 ? line : line.slice(i + 1);
    })
    .join("\n");
}

function dedupeConsecutive(lines) {
  const out = [];
  let run = 0;
  for (let i = 0; i <= lines.length; i++) {
    if (i < lines.length && out.length && lines[i] === out[out.length - 1] && lines[i].trim() !== "") {
      run++;
      continue;
    }
    if (run > 0) out.push(`[hush: previous line repeated ${run}x]`);
    run = 0;
    if (i < lines.length) out.push(lines[i]);
  }
  return out;
}

// Lines that look like they carry the task's actual signal (warnings, errors,
// deprecations) survive the cap regardless of position — only surrounding
// noise (progress logs, install trees) gets cut. A blind head+tail slice was
// caught clipping build warnings out of a passing run, which then made the
// agent re-run the command hunting for what it couldn't see — the cap
// destroying signal cost more tool calls than the cap ever saved. Deliberately
// broad regex: over-matching just keeps a few extra lines, never worse.
const SIGNAL_RE = /\b(WARN(?:ING)?|ERR(?:OR)?|FAIL(?:URE|ED)?|DEPRECATED|CRITICAL)\b/i;

// A bare "N lines omitted" reads to the model as "signal might be hidden in
// this gap." On a completeness task ("report EVERY warning") that distrust is
// rational and expensive: the model can't know the cap preserved every signal
// line, so it re-runs the command to recover what it thinks it's missing —
// each extra turn re-sends full context and the compression backfires. But
// capLines keeps every SIGNAL_RE match by construction, so an omitted span
// PROVABLY contains no warning/error/failure line. State that guarantee in the
// marker itself: it converts hush's internal knowledge into something the model
// can act on, so the visible slice is trustworthy and no re-run is needed.
function omittedMarker(n) {
  return `[hush: ${n} lines omitted, none with warnings/errors/failures]`;
}

function capLines(lines, cap) {
  if (lines.length <= cap) return lines;
  const signalIdx = new Set();
  lines.forEach((line, i) => {
    if (SIGNAL_RE.test(line)) signalIdx.add(i);
  });
  const budget = Math.max(0, cap - signalIdx.size);
  const head = Math.ceil(budget * 0.6);
  const tail = budget - head;
  const kept = new Set(signalIdx);
  for (let i = 0; i < head && i < lines.length; i++) kept.add(i);
  for (let i = Math.max(0, lines.length - tail); i < lines.length; i++) kept.add(i);

  const sortedKept = [...kept].sort((a, b) => a - b);
  const out = [];
  let last = -1;
  for (const i of sortedKept) {
    if (i - last > 1) out.push(omittedMarker(i - last - 1));
    out.push(lines[i]);
    last = i;
  }
  if (lines.length - 1 - last > 0) out.push(omittedMarker(lines.length - 1 - last));
  return out;
}

// Deliberately simple: word-boundary failure sniff, exit-code field wins when present.
// False positives only make the cap more generous — safe direction.
const FAILURE_RE = /(^|[^0-9a-zA-Z])(FAIL(ED|URE)?|fail(ed|ure)?s?:|Error|error:|ERR!|✗|✘|not ok|Traceback|exception|panic|fatal)([^0-9a-zA-Z]|$)/m;

function looksLikeFailure(text, exitCode) {
  if (typeof exitCode === "number") return exitCode !== 0;
  return FAILURE_RE.test(text);
}

// A command that just dumps a whole file's contents (cat/type/Get-Content,
// no pipe/chain/redirect) exits 0 without meaning "safe to trim like a build
// log" — a clean exit there just means the file was read. Source text has no
// WARN/ERROR markers for capLines' signal-preservation to anchor on, so the
// head+tail cap would cut arbitrary lines out of the middle of the file
// instead of out of actual log noise. Treat these like failures: keep more.
const FILE_DUMP_RE = /^\s*(cat|type|gc|Get-Content)\s+[^|;&<>]+$/i;

function isFileDump(command) {
  return typeof command === "string" && FILE_DUMP_RE.test(command.trim());
}

function compress(text, exitCode, isDump) {
  const cleaned = resolveCarriageReturns(stripAnsi(String(text)));
  const cap = isDump || looksLikeFailure(cleaned, exitCode) ? CAP_FAIL : CAP_PASS;
  const lines = capLines(dedupeConsecutive(cleaned.split("\n")), cap);
  return lines.join("\n");
}

function extractExitCode(response) {
  if (response && typeof response === "object") {
    for (const key of ["exitCode", "exit_code", "code"]) {
      if (typeof response[key] === "number") return response[key];
    }
  }
  return undefined;
}

function main() {
  if (process.env.HUSH_DISABLE === "1") return;
  const data = readInput();
  if (!WATCHED_TOOLS.has(data.tool_name)) return;

  const response = data.tool_response;
  const isDump = isFileDump(data.tool_input && data.tool_input.command);
  let updated;

  if (typeof response === "string") {
    const out = compress(response, undefined, isDump);
    if (out !== response) updated = out;
  } else if (response && typeof response === "object") {
    const exitCode = extractExitCode(response);
    const next = { ...response };
    let changed = false;
    for (const field of ["stdout", "stderr", "output"]) {
      if (typeof next[field] === "string") {
        const out = compress(next[field], exitCode, isDump);
        if (out !== next[field]) {
          next[field] = out;
          changed = true;
        }
      }
    }
    if (changed) updated = next;
  }

  if (updated === undefined) return; // nothing shrank — stay silent

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        updatedToolOutput: updated,
      },
    })
  );
}

if (require.main === module) main();

module.exports = {
  stripAnsi,
  resolveCarriageReturns,
  dedupeConsecutive,
  capLines,
  omittedMarker,
  looksLikeFailure,
  isFileDump,
  compress,
};
