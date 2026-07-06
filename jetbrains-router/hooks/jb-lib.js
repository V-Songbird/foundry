'use strict';

// Shared runtime for jetbrains-router hooks: IDE process probe (with a short
// TTL cache so tasklist/ps isn't spawned on every tool call), path
// translation, passthrough rules, and stdin parsing.
//
// Also a CLI: `node jb-lib.js --probe` prints the probe result as JSON for
// the status skill (exit 0 = routing would enforce, exit 1 = fail open).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Process basename (lowercased, '.exe' and trailing '64' stripped) → the
// mcpServers key JetBrains auto-configure produces, which becomes the
// mcp__<key>__* tool prefix. One probe drives both enforcement and prefix
// selection, so a lone PyCharm never gets routed to mcp__webstorm__*.
const IDE_PREFIXES = {
  webstorm: 'webstorm',
  idea: 'idea',
  rider: 'rider',
  pycharm: 'pycharm',
  phpstorm: 'phpstorm',
  goland: 'goland',
  rubymine: 'rubymine',
  clion: 'clion',
  datagrip: 'datagrip',
  rustrover: 'rustrover',
  aqua: 'aqua',
  writerside: 'writerside',
};

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf-8') || '{}');
  } catch {
    return {};
  }
}

// ---- IDE process probe ------------------------------------------------

const PROBE_TTL_MS = 30_000;
const PROBE_CACHE = path.join(os.tmpdir(), 'jetbrains-router-probe.json');

function scanProcesses() {
  let names;
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('tasklist', ['/NH', '/FO', 'CSV'], {
        encoding: 'utf-8',
        timeout: 4000,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      names = [...out.matchAll(/^"([^"]+)"/gm)].map((m) => m[1]);
    } else {
      const out = execFileSync('ps', ['-A', '-o', 'comm='], {
        encoding: 'utf-8',
        timeout: 4000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      names = out.split('\n').map((l) => path.basename(l.trim()));
    }
  } catch {
    return null;
  }
  for (const raw of names) {
    const base = raw.toLowerCase().replace(/\.exe$/, '').replace(/64$/, '');
    if (IDE_PREFIXES[base]) return IDE_PREFIXES[base];
  }
  return null;
}

// Machine-wide probe, cached for 30s — PreToolUse fires on every routed
// tool call and spawning tasklist each time is the old bash version's
// biggest cost. Negative results are cached too; if the IDE opens or
// closes mid-session the router follows within the TTL.
function probeProcesses() {
  try {
    const c = JSON.parse(fs.readFileSync(PROBE_CACHE, 'utf-8'));
    if (Date.now() - c.ts < PROBE_TTL_MS) return c.prefix;
  } catch {
    /* no cache yet */
  }
  const prefix = scanProcesses();
  try {
    fs.writeFileSync(PROBE_CACHE, JSON.stringify({ prefix, ts: Date.now() }));
  } catch {
    /* best effort */
  }
  return prefix;
}

// The active mcp__<prefix>__* prefix, or null when routing should fail open.
//   1. JETBRAINS_ROUTER_DISABLE=1        → null (kill switch)
//   2. JETBRAINS_ROUTER_FORCE_INTERNAL=1 → enforce without probing (test
//      suite / wrapper launchers where the IDE shows up as `java`)
//   3. process probe                      → matching prefix or null
// JETBRAINS_MCP_PREFIX overrides the *name* (renamed mcpServers entry,
// multi-IDE tie-break) but never forces enforcement by itself.
function activePrefix(env = process.env) {
  if (env.JETBRAINS_ROUTER_DISABLE === '1') return null;
  if (env.JETBRAINS_ROUTER_FORCE_INTERNAL === '1') {
    return env.JETBRAINS_MCP_PREFIX || 'webstorm';
  }
  const detected = probeProcesses();
  if (!detected) return null;
  return env.JETBRAINS_MCP_PREFIX || detected;
}

// ---- path translation --------------------------------------------------

function isAbsolutePath(p) {
  return /^(\/|[A-Za-z]:\/)/.test(p);
}

// Windows drive letters are case-insensitive — normalize for comparison.
function driveNorm(p) {
  return /^[A-Za-z]:/.test(p) ? p[0].toLowerCase() + p.slice(1) : p;
}

// Absolute → project-relative (forward slashes, no leading slash).
// Returns '' when the path is absolute but outside the project root, or
// when there is no root to relativize against — callers fail open on ''.
function toProjectRelative(p, root) {
  if (!p) return '';
  const pn = String(p).replace(/\\/g, '/');
  if (!root) return isAbsolutePath(pn) ? '' : pn;
  const rn = String(root).replace(/\\/g, '/').replace(/\/+$/, '');
  const pc = driveNorm(pn);
  const rc = driveNorm(rn);
  if (rc && pc.startsWith(rc + '/')) return pc.slice(rc.length + 1);
  return isAbsolutePath(pn) ? '' : pn;
}

// Resolve to an absolute path for existence checks (Edit/Write dispatch).
function toAbsolute(p, cwd) {
  const pn = String(p).replace(/\\/g, '/');
  if (isAbsolutePath(pn)) return pn;
  return cwd ? String(cwd).replace(/\\/g, '/').replace(/\/+$/, '') + '/' + pn : pn;
}

// ---- routing scope -----------------------------------------------------

// Non-code paths stay on native tools: dotfiles/dotfolders, markdown,
// JSON/JSONL, docs/, and config extensions are meta-files agents read for
// Claude Code or project configuration — the IDE index adds no value and
// routing them breaks reads of Claude Code's own config.
// Arg: project-relative path, forward slashes, no leading slash.
function isPassthroughPath(rel) {
  if (rel.startsWith('.')) return true; // dotfile or root dotfolder
  if (rel.includes('/.')) return true; // interior dot segment
  if (/\.(md|mdx|json|jsonl|yml|yaml|toml|ini|cfg|conf|properties|lock|env)$/i.test(rel)) return true;
  if (rel === 'docs' || rel.startsWith('docs/')) return true;
  return false;
}

const BINARY_EXT =
  /\.(png|jpe?g|gif|bmp|tiff?|ico|webp|avif|pdf|zip|tar|tgz|gz|bz2|xz|7z|rar|exe|dll|so|dylib|class|jar|war|wasm|mp3|mp4|mov|avi|mkv|ogg|flac|wav|webm|m4a|ttf|otf|woff2?|eot|pyc|pyo|o|a|lib|obj|bin|iso|dmg)$/i;

function isBinaryPath(p) {
  return BINARY_EXT.test(p);
}

// ---- worktree guard ----------------------------------------------------

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

// In a linked git worktree the IDE almost never has the worktree open —
// translated paths would point at files its MCP server can't see. Both
// rev-parse calls are anchored to --show-toplevel: from a subdirectory git
// returns --git-dir absolute but --git-common-dir relative, so a raw
// compare would flag every subdir cwd as a worktree.
function isLinkedWorktree(cwd) {
  if (!cwd) return false;
  const top = git(['rev-parse', '--show-toplevel'], cwd);
  if (!top) return false;
  const gd = git(['rev-parse', '--git-dir'], top);
  const gcd = git(['rev-parse', '--git-common-dir'], top);
  return Boolean(gd && gcd && gd !== gcd);
}

module.exports = {
  readInput,
  activePrefix,
  toProjectRelative,
  toAbsolute,
  isPassthroughPath,
  isBinaryPath,
  isLinkedWorktree,
  IDE_PREFIXES,
};

// ---- CLI for the status skill -------------------------------------------

if (require.main === module && process.argv.includes('--probe')) {
  const disabled = process.env.JETBRAINS_ROUTER_DISABLE === '1';
  const prefix = activePrefix();
  process.stdout.write(
    JSON.stringify({
      enforcing: Boolean(prefix),
      prefix,
      disabled,
      forced: process.env.JETBRAINS_ROUTER_FORCE_INTERNAL === '1',
      bypass: process.env.JETBRAINS_ROUTER_BYPASS || null,
    }) + '\n'
  );
  process.exit(prefix ? 0 : 1);
}
