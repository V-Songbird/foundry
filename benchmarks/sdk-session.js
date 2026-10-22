'use strict';

// sdk-session.js — runs one Claude Code session through the Agent SDK, for the
// runners' --sdk flag.
//
// sdkOptions() translates the same CLI args a runner builds for claude -p, so
// both paths share one flag list; a flag with no mapping throws, so a flag a
// runner adds later cannot be dropped silently. runSession() returns stdout as
// the same stream-json lines `claude -p --output-format stream-json --verbose`
// prints, so each suite's existing parser reads it unchanged. The session bills
// ANTHROPIC_API_KEY. The SDK loads only under --sdk, through loadSdk(), so the
// claude -p path and the offline tests never need node_modules. prepareSdk()
// runs once before any session: a missing key, a missing SDK package or an
// unmapped flag stops the run there, never as a failed cell.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { wholeNumberUsage } = require('./flags.js');

const SDK = '@anthropic-ai/claude-agent-sdk';

function loadSdk() {
  return import(SDK);
}

function sdkOptions(args) {
  const o = { systemPrompt: { type: 'preset', preset: 'claude_code' }, plugins: [] };
  const list = (v) => v.split(',');
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const v = () => args[++i];
    switch (a) {
      case '-p': case '--verbose': break;
      case '--output-format': v(); break;
      case '--model': o.model = v(); break;
      case '--max-turns': {
        // Infinity or NaN would leave the session without a turn limit.
        const raw = v();
        const bad = wholeNumberUsage('max-turns', raw);
        if (bad) throw new Error(bad);
        o.maxTurns = Number(raw);
        break;
      }
      case '--setting-sources': o.settingSources = list(v()); break;
      case '--strict-mcp-config': o.strictMcpConfig = true; break;
      case '--permission-mode':
        o.permissionMode = v();
        if (o.permissionMode === 'bypassPermissions') o.allowDangerouslySkipPermissions = true;
        break;
      case '--allowedTools': o.allowedTools = list(v()); break;
      case '--disallowedTools': o.disallowedTools = list(v()); break;
      case '--plugin-dir': o.plugins.push({ type: 'local', path: v() }); break;
      case '--settings': o.settings = v(); break;
      case '--effort': o.effort = v(); break;
      case '--append-system-prompt': o.systemPrompt.append = v(); break;
      case '--resume': o.resume = v(); break;
      case '--continue': o.continue = true; break;
      default: throw new Error(`sdk-session: no Agent SDK mapping for ${a}`);
    }
  }
  return o;
}

async function runSession({ args, prompt, cwd, env, timeoutMs }) {
  const out = [];
  const err = [];
  const abortController = new AbortController();
  let timedOut = false;
  let result = null;
  let threw = false;
  let pid = null;
  // On Windows the SDK's abort ends only claude.exe, so the hooks, shells and
  // servers it started outlive the cell; taskkill /T ends that tree first, as
  // razor's claude -p path does.
  const timer = timeoutMs ? setTimeout(() => {
    timedOut = true;
    if (process.platform === 'win32' && pid) spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' });
    abortController.abort();
  }, timeoutMs) : null;
  try {
    const { query } = await module.exports.loadSdk();
    const options = { ...sdkOptions(args), cwd, env, abortController, stderr: (d) => err.push(String(d)),
      onProcessSpawned: (p) => { pid = p; } };
    for await (const m of query({ prompt, options })) {
      out.push(JSON.stringify(m) + '\n');
      if (m.type === 'result') result = m;
    }
  } catch (e) {
    threw = true;
    err.push(String(e));
  } finally {
    if (timer) clearTimeout(timer);
  }
  return {
    stdout: out.join(''),
    stderr: err.join(''),
    code: result && !threw ? 0 : 1,
    timedOut,
    costUsd: result?.total_cost_usd ?? null,
    numTurns: result?.num_turns ?? null,
    resultText: typeof result?.result === 'string' ? result.result : '',
    sessionId: result?.session_id ?? null,
  };
}

// argLists: every claude -p arg list the run will pass, so each is mapped once
// here; the --resume and --continue a later turn adds are mapped flags.
async function prepareSdk(argLists, env = process.env) {
  const stop = (why) => { console.error(why); process.exit(2); };
  if (!env.ANTHROPIC_API_KEY) {
    return stop('--sdk bills the Claude API key: load ANTHROPIC_API_KEY for this one command, '
      + 'as in node --env-file=<file> runner/run.js --sdk ...');
  }
  try { await module.exports.loadSdk(); } catch (e) {
    return stop(`--sdk needs ${SDK}: run npm ci in benchmarks/ first (${e.message})`);
  }
  try { for (const args of argLists) sdkOptions(args); } catch (e) { return stop(e.message); }
}

// The SDK build loadSdk() resolves, so a node_modules left stale after a pin
// bump is recorded as what ran; the package.json pin only when none is
// installed, as under the offline tests' fake SDK.
function sdkVersion() {
  const installed = require.resolve.paths(SDK).map((d) => path.join(d, SDK, 'package.json')).find((f) => fs.existsSync(f));
  return installed ? JSON.parse(fs.readFileSync(installed, 'utf8')).version : require('./package.json').dependencies[SDK];
}

module.exports = { sdkOptions, runSession, prepareSdk, sdkVersion, loadSdk };
