#!/usr/bin/env node
"use strict";

// Stop hook: measures mid-turn narration (assistant text blocks before the
// final message of the turn) and injects one corrective line only when the
// budget is exceeded. Costs zero tokens while the agent behaves.

const fs = require("fs");
const readline = require("readline");

const BUDGET = (() => {
  const n = parseInt(process.env.HUSH_NARRATION_BUDGET || "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 120;
})();

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf-8") || "{}");
  } catch {
    return {};
  }
}

function isRealUserPrompt(entry) {
  if (entry.type !== "user" || entry.isSidechain) return false;
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

// Returns { narration, blocks } for the last turn: all assistant text blocks
// since the last real user prompt, excluding the final block (that one is the
// deliverable, not narration).
function measureLastTurn(lines) {
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip malformed */
    }
  }
  const texts = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isRealUserPrompt(entries[i])) break;
    texts.unshift(...assistantTextBlocks(entries[i]));
  }
  if (texts.length <= 1) return { narration: 0, blocks: 0 };
  const midTurn = texts.slice(0, -1);
  return {
    narration: midTurn.reduce((sum, t) => sum + wordCount(t), 0),
    blocks: midTurn.length,
  };
}

async function main() {
  if (process.env.HUSH_DISABLE === "1") return;
  const data = readInput();
  if (!data.transcript_path || !fs.existsSync(data.transcript_path)) return;

  const lines = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(data.transcript_path, "utf-8"),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) lines.push(line);
  }

  const { narration, blocks } = measureLastTurn(lines);
  if (narration <= BUDGET) return;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext: `hush: ${narration} words of mid-turn narration across ${blocks} blocks this turn (budget ${BUDGET}). Work silently; put everything in the final message.`,
      },
    })
  );
}

if (require.main === module) main();

module.exports = { measureLastTurn, isRealUserPrompt, wordCount };
