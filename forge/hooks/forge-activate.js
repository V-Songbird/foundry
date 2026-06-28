#!/usr/bin/env node
// forge — UserPromptSubmit hook
//
// Two jobs:
//   1. Track explicit /forge level commands and write the active level to a flag
//      file so the SubagentStart hook can propagate context into subagents.
//   2. Detect architectural feature requests and emit a one-line routing hint
//      when forge is not already active — so the user is aware of the option
//      without requiring them to know the workflow by heart.

const { LEVELS, setLevel, clearLevel, readLevel, writeOutput } = require('./forge-runtime');

// Verbs that signal an implementation request (not a question or explanation)
const ACTION_VERBS   = /\b(add|build|implement|create|design|develop|refactor|migrate|introduce|extend|wire up|set up)\b/i;

// Terms that suggest a cross-cutting or trust-boundary change
const ARCH_SIGNALS   = /\b(auth[a-z]*|middleware|payment|checkout|webhook|api\s+endpoint|migration|schema\s+change|event\s+bus|message\s+queue|background\s+worker|service\s+layer|integration|pipeline|permission|role.based|session\s+token|trust\s+boundary)\b/i;

// Scope signals: multi-area language that raises the likelihood of cross-cutting work
const SCOPE_SIGNALS  = /\b(multiple|across|throughout|end-to-end|full.stack|the\s+whole|every\s+(service|module|layer))\b/i;

function shouldSuggestForge(prompt) {
  if (prompt.length < 25) return false;
  // Questions and explanations are not implementation requests
  if (/^(what|why|how|can you|could you|explain|show me|tell me|help me understand)\b/i.test(prompt)) return false;
  return ACTION_VERBS.test(prompt) && (ARCH_SIGNALS.test(prompt) || SCOPE_SIGNALS.test(prompt));
}

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data   = JSON.parse(input.replace(/^﻿/, ''));
    const prompt = (data.prompt || '').trim();
    const lower  = prompt.toLowerCase();

    // ── Explicit /forge level commands ──────────────────────────────────────
    if (/^\/forge(:|$|\s)/i.test(prompt)) {
      const parts = lower.split(/\s+/);
      const cmd   = parts[0]; // /forge or /forge:forge
      const arg   = parts[1] || '';

      let level = null;
      if (cmd === '/forge' || cmd === '/forge:forge') {
        if (arg === 'lite')       level = 'lite';
        else if (arg === 'deep')  level = 'deep';
        else                      level = 'full'; // bare /forge or /forge full
      }

      if (level) {
        setLevel(level);
        writeOutput('UserPromptSubmit', `FORGE LEVEL: ${level}`);
        return;
      }
    }

    // ── Explicit deactivation ────────────────────────────────────────────────
    if (/\b(cancel forge|stop forge|abort forge)\b/i.test(prompt)) {
      clearLevel();
      writeOutput('UserPromptSubmit', 'FORGE OFF');
      return;
    }

    // ── Scope routing hint ───────────────────────────────────────────────────
    // Only fires when forge is not already active, to avoid noise during a run.
    if (!readLevel() && shouldSuggestForge(lower)) {
      writeOutput(
        'UserPromptSubmit',
        'FORGE ROUTING HINT: this request shows signals of a cross-cutting or ' +
        'trust-boundary change. If it touches ≥2 architectural areas, consider ' +
        'investigating with /forge before writing code.',
      );
    }
  } catch (_) {
    // Silent fail — never block the user's prompt
  }
});
