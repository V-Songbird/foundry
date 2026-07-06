'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS_DIR = path.join(__dirname, '..', 'hooks');

// Env for deterministic runs: force enforcement (skip the process probe) and
// scrub any router vars the host shell may carry.
function baseEnv(extra) {
  const env = { ...process.env, JETBRAINS_ROUTER_FORCE_INTERNAL: '1' };
  delete env.JETBRAINS_ROUTER_DISABLE;
  delete env.JETBRAINS_ROUTER_BYPASS;
  delete env.JETBRAINS_MCP_PREFIX;
  return { ...env, ...(extra || {}) };
}

/** Run the redirect hook with JSON stdin; returns spawnSync result. */
function runHook(stdinData, env) {
  return spawnSync('node', [path.join(HOOKS_DIR, 'redirect.js')], {
    input: JSON.stringify(stdinData),
    encoding: 'utf-8',
    timeout: 30000,
    env: baseEnv(env),
  });
}

/** The deny reason from hook stdout, or null when the hook passed through. */
function denyReason(result) {
  const out = (result.stdout || '').trim();
  if (!out) return null;
  const parsed = JSON.parse(out);
  if (parsed.hookSpecificOutput?.permissionDecision !== 'deny') return null;
  return parsed.hookSpecificOutput.permissionDecisionReason;
}

/** Shorthand: run + extract reason. */
function reasonFor(stdinData, env) {
  return denyReason(runHook(stdinData, env));
}

module.exports = { runHook, denyReason, reasonFor, HOOKS_DIR };
