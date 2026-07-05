#!/usr/bin/env node
'use strict';

// PreToolUse (Bash|PowerShell) — soft gate on new-dependency installs.
//
// The first attempt to install a named package is denied with the
// reuse-first reason (rungs 3–5); re-running the same install passes. One
// forced reconsideration per dependency, never a hard block, and razor
// never *grants* permission — on the pass path it stays silent so the
// user's normal permission flow still applies.
//
// Only project-dependency managers are guarded. Lockfile restores
// (`npm install` bare, `npm ci`, `pip install -r ...`, `poetry install`)
// and system package managers (apt, brew, winget) are out of scope.

const { readInput, readState, writeState, isActive } = require('./razor-lib');

// manager → subcommands that add a named package
const ADD_SUBCOMMANDS = {
  npm: ['install', 'i', 'add'],
  pnpm: ['install', 'i', 'add'],
  yarn: ['add'],
  bun: ['add', 'install', 'i'],
  pip: ['install'],
  pip3: ['install'],
  pipenv: ['install'],
  poetry: ['add'],
  uv: ['add'],
  cargo: ['add'],
  go: ['get'],
  composer: ['require'],
  gem: ['install'],
};

// pip args that mean "restore/develop", not "add a new dependency"
const PIP_RESTORE_FLAGS = new Set(['-r', '--requirement', '-e', '--editable']);

function packageArgs(args) {
  return args.filter((a) => a && !a.startsWith('-') && a !== '.');
}

// Parse one shell segment; returns {manager, packages} when it adds a new
// named dependency, null otherwise.
function parseSegment(segment) {
  const tokens = segment.trim().split(/\s+/).filter(Boolean);
  while (tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0]) || tokens[0] === 'sudo')) {
    tokens.shift();
  }
  if (!tokens.length) return null;

  let cmd = tokens.shift().toLowerCase().replace(/\.(exe|cmd)$/, '');

  // python -m pip install …  →  pip install …
  if ((cmd === 'python' || cmd === 'python3' || cmd === 'py') && tokens[0] === '-m' && /^pip3?$/.test(tokens[1] || '')) {
    cmd = tokens[1];
    tokens.splice(0, 2);
  }
  // uv pip install …  →  pip install …
  if (cmd === 'uv' && tokens[0] === 'pip') {
    cmd = 'pip';
    tokens.shift();
  }
  // yarn global add …  →  yarn add …
  if (cmd === 'yarn' && tokens[0] === 'global') tokens.shift();

  // dotnet add [proj] package Name
  if (cmd === 'dotnet' && tokens[0] === 'add') {
    const idx = tokens.indexOf('package');
    if (idx !== -1 && tokens[idx + 1]) return { manager: 'dotnet', packages: [tokens[idx + 1]] };
    return null;
  }

  const subs = ADD_SUBCOMMANDS[cmd];
  if (!subs) return null;
  const sub = (tokens.shift() || '').toLowerCase();
  if (!subs.includes(sub)) return null;

  if (/^pip3?$/.test(cmd) && tokens.some((t) => PIP_RESTORE_FLAGS.has(t))) return null;

  const packages = packageArgs(tokens);
  if (!packages.length) return null; // bare install = lockfile restore
  return { manager: cmd, packages };
}

// Scan a whole command line (split on shell chaining) for a dependency add.
function parseInstallCommand(command) {
  for (const segment of String(command || '').split(/&&|\|\||;|\|/)) {
    const hit = parseSegment(segment);
    if (hit) return hit;
  }
  return null;
}

function depKey(hit) {
  return `${hit.manager}:${hit.packages.map((p) => p.toLowerCase()).sort().join(',')}`;
}

function main() {
  if (process.env.RAZOR_DEP_GUARD === 'off') return;
  const data = readInput();
  if (!isActive(readState(data.session_id))) return;

  const hit = parseInstallCommand(data.tool_input && data.tool_input.command);
  if (!hit) return;

  const state = readState(data.session_id);
  const key = depKey(hit);
  if (state.deniedDeps && state.deniedDeps[key]) return; // already reconsidered — normal permission flow applies

  state.deniedDeps = state.deniedDeps || {};
  state.deniedDeps[key] = true;
  writeState(data.session_id, state);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `razor: '${hit.packages.join(' ')}' adds a new ${hit.manager} dependency. ` +
          'Rungs 3-5 — check the stdlib, the platform, and already-installed deps first. ' +
          'If nothing covers it, run the same command again and razor will not object.',
      },
    })
  );
}

if (require.main === module) main();

module.exports = { parseInstallCommand, depKey };
