// Shared runtime utilities for forge hooks — state file, output format
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const STATE_FILE = '.forge-active';
const LEVELS     = ['lite', 'full', 'deep'];

function getClaudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

const statePath = path.join(getClaudeDir(), STATE_FILE);

function setLevel(level) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, level, 'utf8');
}

function clearLevel() {
  try { fs.unlinkSync(statePath); } catch (_) {}
}

function readLevel() {
  try {
    const content = fs.readFileSync(statePath, 'utf8').trim();
    return LEVELS.includes(content) ? content : null;
  } catch (_) {
    return null;
  }
}

// SubagentStart requires the hookSpecificOutput envelope; all other events write
// plain text to stdout. Context is silently dropped if empty.
function writeOutput(event, context) {
  if (!context) return;
  if (event === 'SubagentStart') {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: event, additionalContext: context },
    }));
    return;
  }
  process.stdout.write(context);
}

module.exports = { LEVELS, setLevel, clearLevel, readLevel, writeOutput };
