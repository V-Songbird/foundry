'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS_DIR = path.join(__dirname, '..', 'hooks');

/** Run a hook script from hooks/ with JSON stdin; returns spawnSync result. */
function runHook(name, stdinData, env) {
  return spawnSync('node', [path.join(HOOKS_DIR, name)], {
    input: stdinData === undefined ? undefined : JSON.stringify(stdinData),
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env, ...(env || {}) },
  });
}

/** Parse hook stdout as JSON, or null when the hook stayed silent. */
function hookOutput(result) {
  const out = (result.stdout || '').trim();
  return out ? JSON.parse(out) : null;
}

/** Unique session id per test so state files never collide across runs. */
let counter = 0;
function freshSession() {
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `plumb-test-${process.pid}-${unique}-${++counter}`;
}

/**
 * Write a minimal transcript for one turn: a real user prompt, one assistant
 * entry carrying the given tool calls (edits + Bash commands), an optional
 * paired tool_result entry, and an optional closing assistant text message.
 * Returns the .jsonl path.
 *
 *   calls:    [{ name, input }]  e.g. { name: 'Edit', input: { file_path: 'a.js' } }
 *   commands: ['npm test', ...] become Bash tool_use entries with no result
 *             (checkOutcome sees them as 'unknown' — same as today's behavior).
 *             An entry may instead be an object to attach a paired tool_result:
 *             { command, result, is_error }. `name` defaults to 'Bash'; pass
 *             { command, name: 'PowerShell', result } for a PowerShell check.
 *   finalText: the turn's closing assistant message
 */
function writeTurn({ uuid = 'turn-1', calls = [], commands = [], finalText = '' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plumb-t-'));
  const file = path.join(dir, 't.jsonl');
  const lines = [
    JSON.stringify({ type: 'user', uuid, message: { role: 'user', content: 'please implement the thing' } }),
  ];
  const content = [];
  const results = [];
  for (const c of calls) content.push({ type: 'tool_use', name: c.name, input: c.input || {}, id: `tu${content.length}` });
  for (const cmd of commands) {
    const isObj = typeof cmd === 'object' && cmd !== null;
    const command = isObj ? cmd.command : cmd;
    const id = `tu${content.length}`;
    content.push({ type: 'tool_use', name: (isObj && cmd.name) || 'Bash', input: { command }, id });
    if (isObj && Object.prototype.hasOwnProperty.call(cmd, 'result')) {
      const block = { type: 'tool_result', tool_use_id: id, content: cmd.result };
      if (Object.prototype.hasOwnProperty.call(cmd, 'is_error')) block.is_error = cmd.is_error;
      results.push(block);
    }
  }
  if (content.length) lines.push(JSON.stringify({ type: 'assistant', message: { role: 'assistant', content } }));
  if (results.length) lines.push(JSON.stringify({ type: 'user', message: { role: 'user', content: results } }));
  if (finalText) {
    lines.push(JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: finalText }] } }));
  }
  fs.writeFileSync(file, lines.map((l) => l + '\n').join(''));
  return file;
}

/** A fresh temp file path (not yet created) for an isolated observation log. */
function freshLog() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'plumb-log-')), 'obs.jsonl');
}

module.exports = { runHook, hookOutput, freshSession, writeTurn, freshLog, HOOKS_DIR };
