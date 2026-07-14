'use strict';

// Shared runtime for plumb: stdin parsing, settings, per-session state, the
// observation log, and the transcript forensics the completion gate reasons
// over. The turn-boundary schema (isRealUserPrompt) is kept byte-identical to
// hush's and razor's on purpose — the three plugins must agree on what counts
// as a real human turn, or their per-turn budgets drift apart.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf-8') || '{}');
  } catch {
    return {};
  }
}

// Settings resolve in order: explicit PLUMB_* env var, then the plugin option
// set at enable time (CLAUDE_PLUGIN_OPTION_*, uppercased by the harness), then
// the built-in default.
function settingBool(name, fallback) {
  const env = process.env[`PLUMB_${name}`];
  if (env !== undefined && env !== '') return env === '1' || env === 'true' || env === 'on';
  const opt = process.env[`CLAUDE_PLUGIN_OPTION_${name}`];
  if (opt !== undefined && opt !== '') return opt === 'true';
  return fallback;
}

// Same resolution order as settingBool, for numeric settings (PLUMB_SESSION_CAP).
function settingNumber(name, fallback) {
  for (const raw of [process.env[`PLUMB_${name}`], process.env[`CLAUDE_PLUGIN_OPTION_${name}`]]) {
    if (raw === undefined || raw === '') continue;
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

// Dormant by default: the gate observes and logs what it WOULD block, but never
// interrupts a turn until it's explicitly armed. Arming is the deliberate step
// taken only after the observation log shows the heuristic's false-positive rate
// is low enough to trust at turn's end.
function isArmed() {
  return settingBool('ARM', false) || process.env.PLUMB_MODE === 'armed';
}

function isActive() {
  return process.env.PLUMB_DISABLE !== '1';
}

// State lives in the plugin's persistent data dir when the harness provides one
// (tmp cleaners can't re-arm a fired gate mid-session there); tmpdir is the
// fallback. Same contract as razor's stateDir.
function stateDir() {
  const dir = process.env.CLAUDE_PLUGIN_DATA;
  if (dir) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      /* unwritable — fall through to tmpdir */
    }
  }
  return os.tmpdir();
}

function safeId(id) {
  return String(id || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_');
}

function statePath(sessionId) {
  return path.join(stateDir(), `plumb-${safeId(sessionId)}.json`);
}

function readState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionId), 'utf-8'));
  } catch {
    return {};
  }
}

// Symlink-refusing, atomic-rename write for the state file — inline since
// writeState is its only consumer (same recipe razor ships, kept per-plugin
// since plumb and razor never import across each other). win32 has no uid,
// so a symlinked parent dir is trusted only when it resolves under
// tmpdir/homedir (case-insensitive); O_NOFOLLOW degrades to 0 there too,
// leaving the lstat checks below as the accepted residual defense.
function safeWriteFileSync(target, content) {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });

  let realDir = dir;
  const dstat = fs.lstatSync(dir);
  if (dstat.isSymbolicLink()) {
    realDir = fs.realpathSync(dir);
    const rstat = fs.statSync(realDir);
    if (!rstat.isDirectory()) throw new Error('plumb: dir target not a directory');
    if (typeof process.getuid === 'function') {
      if (rstat.uid !== process.getuid()) throw new Error('plumb: dir owned by another user');
    } else {
      const roots = [os.tmpdir(), os.homedir()].map((r) => path.resolve(r).toLowerCase() + path.sep);
      const real = path.resolve(realDir).toLowerCase() + path.sep;
      if (!roots.some((r) => real.startsWith(r))) throw new Error('plumb: dir outside trusted roots');
    }
  }

  const realTarget = path.join(realDir, path.basename(target));
  try {
    if (fs.lstatSync(realTarget).isSymbolicLink()) throw new Error('plumb: target is a symlink');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  const tmpPath = path.join(realDir, `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`);
  const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
  const fd = fs.openSync(tmpPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW, 0o600);
  try {
    fs.writeSync(fd, content);
    try {
      fs.fchmodSync(fd, 0o600);
    } catch {
      /* best-effort; irrelevant on win32 */
    }
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.renameSync(tmpPath, realTarget);
  } catch (e) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* best-effort cleanup */
    }
    throw e;
  }
}

function writeState(sessionId, state) {
  try {
    safeWriteFileSync(statePath(sessionId), JSON.stringify(state));
  } catch {
    /* best effort — losing state means one extra checkpoint, not breakage */
  }
}

function clearSessionState(sessionId) {
  if (!sessionId) return;
  try {
    fs.unlinkSync(statePath(sessionId));
  } catch {
    /* already gone */
  }
}

// Sessions that never reach SessionEnd (crashes, kills) would leak state files;
// sweep anything plumb-owned older than a week.
const GC_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function gcStateFiles() {
  const dir = stateDir();
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  const cutoff = Date.now() - GC_AGE_MS;
  for (const name of names) {
    if (!/^plumb-.*\.json$/.test(name)) continue;
    const file = path.join(dir, name);
    try {
      if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
    } catch {
      /* best effort */
    }
  }
}

// The observation log is the whole point of the dormant phase: every candidate
// the gate detects is appended here whether or not it fired, so the claim/edit/
// check heuristic can be calibrated against real turns before it's armed.
function logPath() {
  return process.env.PLUMB_LOG || path.join(stateDir(), 'plumb-observations.jsonl');
}

function logObservation(record) {
  try {
    const target = logPath();
    // Appends can't go through the temp+rename dance safe-write uses, so an
    // lstat refusal is the whole defense here: a symlinked log path is
    // skipped rather than followed and appended through.
    try {
      if (fs.lstatSync(target).isSymbolicLink()) return;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    fs.appendFileSync(target, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n');
  } catch {
    /* best effort — the log is diagnostics, never load-bearing */
  }
}

// Best-effort git call; null on any failure (not a repo, no git, timeout).
// Same recipe razor-lib.js ships (razor/hooks/razor-lib.js:210) — reimplemented
// here rather than imported since plumb and razor never share code across
// plugin boundaries.
function git(args, cwd) {
  if (!cwd) return null;
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

// ---- transcript forensics (shared turn-boundary contract with hush + razor) ----

const TAIL_BYTES = 1024 * 1024;

function readTailLines(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    let lines = buf.toString('utf-8').split('\n');
    if (start > 0) lines = lines.slice(1);
    return lines.filter((l) => l.trim());
  } finally {
    fs.closeSync(fd);
  }
}

function isRealUserPrompt(entry) {
  if (entry.type !== 'user' || entry.isSidechain) return false;
  // Harness-injected continuations look like fresh user turns but aren't: task
  // notifications carry origin.kind !== "human", ScheduleWakeup firings carry
  // isMeta. Only a prompt a person actually typed is a turn boundary — and a
  // plumb block itself produces one of these injected continuations, so getting
  // this right is what keeps the gate scoped to one human turn.
  if (entry.isMeta) return false;
  if (entry.origin && entry.origin.kind !== 'human') return false;
  const content = entry.message?.content;
  if (typeof content === 'string') return true;
  if (Array.isArray(content)) {
    return content.some((c) => c.type === 'text') && !content.some((c) => c.type === 'tool_result');
  }
  return false;
}

// The current turn: a stable key (the last real prompt's uuid) plus every
// transcript entry after it. Everything the gate measures — edits made, checks
// run, the closing claim — lives in these entries.
function currentTurn(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return { turnKey: 'no-transcript', entries: [] };
  let lines;
  try {
    lines = readTailLines(transcriptPath);
  } catch {
    return { turnKey: 'no-transcript', entries: [] };
  }
  const parsed = [];
  for (const l of lines) {
    try {
      parsed.push(JSON.parse(l));
    } catch {
      /* skip malformed */
    }
  }
  let boundary = -1;
  let turnKey = 'window-start';
  for (let i = parsed.length - 1; i >= 0; i--) {
    if (isRealUserPrompt(parsed[i])) {
      boundary = i;
      turnKey = parsed[i].uuid || parsed[i].timestamp || 'unknown-turn';
      break;
    }
  }
  return { turnKey, entries: boundary === -1 ? parsed : parsed.slice(boundary + 1) };
}

// Turn key preference: hook input carries prompt_id (a stable per-human-turn
// id) on the happy path, so deriving a key from a 1MB transcript tail is
// wasted work — razor already keys turns this way. Falls back to the
// transcript-derived key when prompt_id is absent (older harness). Callers
// that also need currentTurn's entries (e.g. stop-gate) can pass the
// already-computed transcript key as the second arg to avoid parsing the
// transcript twice; unit tests can call turnKey(data) alone.
function turnKey(data, transcriptTurnKey) {
  if (typeof data.prompt_id === 'string' && data.prompt_id) return data.prompt_id;
  return transcriptTurnKey !== undefined ? transcriptTurnKey : currentTurn(data.transcript_path).turnKey;
}

// Every tool the assistant called this turn, in order — {name, input}.
// A subagent's OWN transcript (agent_transcript_path) has isSidechain:true on
// every single entry — relative to the root session everything there is a
// sidechain, so the flag carries no discriminating signal in that file.
// Callers scanning a subagent transcript pass { allowSidechain: true } to
// stop excluding it; main-thread callers (default) keep excluding real
// sidechains from the parent transcript, unchanged.
function turnToolCalls(entries, opts) {
  const allowSidechain = !!(opts && opts.allowSidechain);
  const calls = [];
  for (const e of entries) {
    if (e.type !== 'assistant' || (e.isSidechain && !allowSidechain)) continue;
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c.type === 'tool_use' && c.name) calls.push({ name: c.name, input: c.input || {} });
    }
  }
  return calls;
}

// The text of the turn's closing assistant message — the fallback when the Stop
// payload doesn't carry last_assistant_message. Walks back to the most recent
// assistant entry that actually has text (the final message may follow a run of
// tool calls).
function lastAssistantText(entries, opts) {
  const allowSidechain = !!(opts && opts.allowSidechain);
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type !== 'assistant' || (e.isSidechain && !allowSidechain)) continue;
    const content = e.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const texts = content.filter((c) => c.type === 'text' && typeof c.text === 'string').map((c) => c.text);
      if (texts.length) return texts.join('\n');
    }
  }
  return '';
}

// ---- check outcome (Spec P3): a check RUNNING is not the same as it PASSING.
// stop-gate's ranCheck() only proves a check ran; checkOutcome pairs each
// matching Bash/PowerShell tool_use with its tool_result — assistant entries
// carry tool_use blocks with an id, the paired tool_result blocks live in
// LATER type:"user" entries' content arrays, matched by tool_use_id — and
// classifies pass/fail with the caller's failRe. CHECK_RE/FAIL_RE stay owned
// by stop-gate.js (the classification vocabulary); checkOutcome only owns the
// transcript-pairing mechanics, so it takes both regexes as params.

function toolResultText(block) {
  const c = block.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n');
  }
  return '';
}

function findToolResult(entries, toolUseId, opts) {
  const allowSidechain = !!(opts && opts.allowSidechain);
  for (const e of entries) {
    if (e.type !== 'user' || (e.isSidechain && !allowSidechain)) continue;
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c.type === 'tool_result' && c.tool_use_id === toolUseId) return c;
    }
  }
  return null;
}

// Returns 'passed' | 'failed' | 'unknown'. Any failed check wins outright. A
// check with no findable result counts toward 'unknown', never 'failed' — an
// unseen result is not evidence of failure (fail toward silence). No matching
// check calls at all is also 'unknown' (no evidence either way).
function checkOutcome(entries, checkRe, failRe, opts) {
  const allowSidechain = !!(opts && opts.allowSidechain);
  let sawCheck = false;
  let sawUnknown = false;

  for (const e of entries) {
    if (e.type !== 'assistant' || (e.isSidechain && !allowSidechain)) continue;
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c.type !== 'tool_use') continue;
      if (c.name !== 'Bash' && c.name !== 'PowerShell') continue;
      const cmd = c.input && c.input.command;
      if (typeof cmd !== 'string' || !checkRe.test(cmd)) continue;
      sawCheck = true;

      const result = findToolResult(entries, c.id, opts);
      if (!result) {
        sawUnknown = true;
        continue;
      }
      if (result.is_error === true || failRe.test(toolResultText(result))) return 'failed';
    }
  }

  if (!sawCheck) return 'unknown';
  return sawUnknown ? 'unknown' : 'passed';
}

module.exports = {
  readInput,
  settingBool,
  settingNumber,
  isArmed,
  isActive,
  stateDir,
  statePath,
  readState,
  writeState,
  safeWriteFileSync,
  clearSessionState,
  gcStateFiles,
  logPath,
  logObservation,
  git,
  TAIL_BYTES,
  readTailLines,
  isRealUserPrompt,
  currentTurn,
  turnKey,
  turnToolCalls,
  lastAssistantText,
  checkOutcome,
};
