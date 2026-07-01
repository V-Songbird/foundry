const LIST = /\b\d+[.)]\s+\w/i;

const CONJ = /\b(?:also|additionally|and\s+then|furthermore)\b/gi;

const DEFERRED = /\b(?:TODO|later|we\s+should|we\s+need\s+to|should\s+also|eventually|at\s+some\s+point)\b/i;

const MULTI_HINT =
  "[Relay] Multi-part request detected. Before starting, identify which subtasks " +
  "are independent and can run in parallel subagents.";
const DEFERRED_HINT =
  "[Relay] Deferred-work signal detected. If any item is out of current task scope, " +
  "flag it for spawn_task rather than deferring silently.";

const MIN_PROMPT_LEN = 20;

function readStdin() {
  const fs = require("fs");
  try {
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function main() {
  let data;
  try {
    data = JSON.parse(readStdin() || "{}");
  } catch {
    return;
  }

  const prompt = (data.prompt || "").trim();
  if (prompt.length < MIN_PROMPT_LEN) return;

  const hints = [];
  if (LIST.test(prompt) || (prompt.match(CONJ) || []).length >= 2) {
    hints.push(MULTI_HINT);
  }
  if (DEFERRED.test(prompt)) {
    hints.push(DEFERRED_HINT);
  }
  if (hints.length === 0) return;

  try {
    process.stdout.write(hints.join("\n"));
  } catch {
    // ignore
  }
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.exit(0);
  }
}

module.exports = { main };
