#!/usr/bin/env node
"use strict";

// Dual-mode narration meter.
// - PostToolUse: measures narration accumulated so far in the current turn
//   (every text block so far precedes a tool call, so all of it is narration)
//   and injects one corrective line the moment the budget is crossed — at
//   most once per turn, so the correction lands inside the offending turn.
// - Stop: turn-end measurement, final block exempt (it's the deliverable).
// Either mode fires at most once per turn — any fire marks the turn corrected.
// Costs zero tokens while the agent behaves.

const fs = require("fs");
const os = require("os");
const path = require("path");

const BUDGET = (() => {
  const n = parseInt(process.env.HUSH_NARRATION_BUDGET || "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 120;
})();

// Deliberately simple: fixed 1MB tail window — a single turn larger than that undercounts
// its narration, which only delays the fire. Raise if that ever bites.
const TAIL_BYTES = 1024 * 1024;

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf-8") || "{}");
  } catch {
    return {};
  }
}

// Runs on every tool call in long sessions, so never read the whole
// transcript — only the tail window, dropping the leading partial line.
function readTailLines(file) {
  const fd = fs.openSync(file, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    let lines = buf.toString("utf-8").split("\n");
    if (start > 0) lines = lines.slice(1);
    return lines.filter((l) => l.trim());
  } finally {
    fs.closeSync(fd);
  }
}

function isRealUserPrompt(entry) {
  if (entry.type !== "user" || entry.isSidechain) return false;
  // Harness-injected continuations look like fresh user turns but aren't:
  // task-notification entries carry origin.kind === "task-notification", and
  // ScheduleWakeup firings carry isMeta === true with no origin at all. Only
  // origin.kind === "human" (or its absence, for older transcripts) is a turn
  // boundary a person actually typed.
  if (entry.isMeta) return false;
  if (entry.origin && entry.origin.kind !== "human") return false;
  const content = entry.message?.content;
  if (typeof content === "string") return true;
  if (Array.isArray(content)) {
    // Tool results come back as type:"user" lines; a real prompt has text
    // items and no tool_result items.
    return content.some((c) => c.type === "text") && !content.some((c) => c.type === "tool_result");
  }
  return false;
}

function assistantTextBlocks(entry) {
  if (entry.type !== "assistant" || entry.isSidechain) return [];
  const content = entry.message?.content;
  if (!Array.isArray(content)) return [];
  return content.filter((c) => c.type === "text" && typeof c.text === "string").map((c) => c.text);
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

// All assistant text blocks since the last real user prompt, plus a stable
// key identifying that turn (for the once-per-turn state dedup).
function currentTurn(lines) {
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip malformed */
    }
  }
  const texts = [];
  let turnKey = "window-start";
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isRealUserPrompt(entries[i])) {
      turnKey = entries[i].uuid || entries[i].timestamp || "unknown-turn";
      break;
    }
    texts.unshift(...assistantTextBlocks(entries[i]));
  }
  return { texts, turnKey };
}

function tally(texts) {
  return {
    narration: texts.reduce((sum, t) => sum + wordCount(t), 0),
    blocks: texts.length,
  };
}

// Mid-turn: everything so far is narration (a tool call followed each block).
function measureCurrentTurn(lines) {
  const { texts, turnKey } = currentTurn(lines);
  return { ...tally(texts), turnKey };
}

// Turn end: the final block is the deliverable, not narration.
function measureLastTurn(lines) {
  const { texts, turnKey } = currentTurn(lines);
  if (texts.length <= 1) return { narration: 0, blocks: 0, turnKey };
  return { ...tally(texts.slice(0, -1)), turnKey };
}

function statePath(sessionId) {
  const safe = String(sessionId || "unknown").replace(/[^a-zA-Z0-9-]/g, "_");
  return path.join(os.tmpdir(), `hush-meter-${safe}.json`);
}

function readState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionId), "utf-8"));
  } catch {
    return {};
  }
}

function writeState(sessionId, state) {
  try {
    fs.writeFileSync(statePath(sessionId), JSON.stringify(state));
  } catch {
    /* best effort — losing state means one extra reminder, not breakage */
  }
}

function main() {
  if (process.env.HUSH_DISABLE === "1") return;
  if (process.env.HUSH_NARRATION === "off") return;
  const data = readInput();
  if (!data.transcript_path || !fs.existsSync(data.transcript_path)) return;

  const lines = readTailLines(data.transcript_path);
  const midTurn = data.hook_event_name === "PostToolUse";
  const { narration, blocks, turnKey } = midTurn ? measureCurrentTurn(lines) : measureLastTurn(lines);
  if (narration <= BUDGET) return;
  if (readState(data.session_id).turnKey === turnKey) return; // already corrected this turn
  // Any fire marks the turn — Stop included, else a notification/wakeup chain
  // (several Stop events, same turnKey) re-fires on every stop and each
  // correction forces a reply whose words re-count into the same turn.
  writeState(data.session_id, { turnKey });

  const message = midTurn
    ? `hush: ${narration} words of narration across ${blocks} blocks so far this turn (budget ${BUDGET}). Stop narrating — keep working silently and put everything in one final message.`
    : `hush: ${narration} words of mid-turn narration across ${blocks} blocks this turn (budget ${BUDGET}). Work silently; put everything in the final message.`;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: midTurn ? "PostToolUse" : "Stop",
        additionalContext: message,
      },
    })
  );
}

if (require.main === module) main();

module.exports = { measureLastTurn, measureCurrentTurn, isRealUserPrompt, wordCount };
