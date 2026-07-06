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

function capLines(lines, cap) {
  if (lines.length <= cap) return lines;
  const head = Math.ceil(cap * 0.6);
  const tail = cap - head;
  return [
    ...lines.slice(0, head),
    `[hush: ${lines.length - cap} lines omitted]`,
    ...lines.slice(lines.length - tail),
  ];
}

// Deliberately simple: word-boundary failure sniff, exit-code field wins when present.
// False positives only make the cap more generous — safe direction.
const FAILURE_RE = /(^|[^0-9a-zA-Z])(FAIL(ED|URE)?|fail(ed|ure)?s?:|Error|error:|ERR!|✗|✘|not ok|Traceback|exception|panic|fatal)([^0-9a-zA-Z]|$)/m;

function looksLikeFailure(text, exitCode) {
  if (typeof exitCode === "number") return exitCode !== 0;
  return FAILURE_RE.test(text);
}

function compress(text, exitCode) {
  const cleaned = resolveCarriageReturns(stripAnsi(String(text)));
  const cap = looksLikeFailure(cleaned, exitCode) ? CAP_FAIL : CAP_PASS;
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
  let updated;

  if (typeof response === "string") {
    const out = compress(response, undefined);
    if (out !== response) updated = out;
  } else if (response && typeof response === "object") {
    const exitCode = extractExitCode(response);
    const next = { ...response };
    let changed = false;
    for (const field of ["stdout", "stderr", "output"]) {
      if (typeof next[field] === "string") {
        const out = compress(next[field], exitCode);
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

module.exports = { stripAnsi, resolveCarriageReturns, dedupeConsecutive, capLines, looksLikeFailure, compress };
