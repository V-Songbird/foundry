#!/usr/bin/env node
'use strict';

// PreToolUse (Read|Grep|Glob|Edit|Write|Bash|PowerShell) — the enforcement
// side of jetbrains-router. When a JetBrains IDE is running and the native
// call has a direct mcp__<ide>__* equivalent, deny the native call with a
// reason naming the IDE tool and the pre-translated project-relative path.
// Everything else — no IDE, non-code paths, composed shell commands,
// subagents, worktrees, malformed input — passes through silently.

const {
  readInput,
  activePrefix,
  toProjectRelative,
  toAbsolute,
  isPassthroughPath,
  isBinaryPath,
  isLinkedWorktree,
} = require('./jb-lib');

const fs = require('fs');

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'jetbrains-router: ' + reason,
      },
    })
  );
}

// ---- per-tool dispatch: return a deny reason, or null to pass through ----

function fileRedirect(input, cwd, p, kind) {
  const fp = input.file_path || '';
  if (isBinaryPath(fp)) return null;
  const rel = toProjectRelative(fp, cwd);
  if (!rel || isPassthroughPath(rel)) return null;

  if (kind === 'Read') {
    return `retry as mcp__${p}__read_file(file_path="${rel}") — this redirect is expected.`;
  }
  if (kind === 'Edit') {
    // replace_text_in_file requires the file to exist; let native Edit
    // produce its own clearer "file not found" otherwise.
    if (!fs.existsSync(toAbsolute(fp, cwd))) return null;
    const all = input.replace_all === true;
    return (
      `retry as mcp__${p}__replace_text_in_file(pathInProject="${rel}", oldText=<old_string>, ` +
      `newText=<new_string>, replaceAll=${all}) — pass replaceAll explicitly, the IDE default ` +
      `is true. This redirect is expected.`
    );
  }
  // Write: create_new_file needs overwrite=true for existing files, but
  // native Write's read-before-write guard is worth keeping — only new
  // files are routed.
  if (fs.existsSync(toAbsolute(fp, cwd))) return null;
  return `retry as mcp__${p}__create_new_file(pathInProject="${rel}", text=<content>) — this redirect is expected.`;
}

// Grep/Glob share the scoping rules: a search scoped to a passthrough area
// stays native; a scope outside the project fails open (the IDE can't see
// it); an in-project scope becomes a paths=["<rel>/**"] hint.
function searchScope(input, cwd) {
  const scoped = input.path || '';
  if (!scoped) return { pass: false, hint: '' };
  const rel = toProjectRelative(scoped, cwd);
  if (!rel) return { pass: true }; // outside project root
  if (isPassthroughPath(rel)) return { pass: true };
  return { pass: false, hint: `, paths=["${rel}/**"]` };
}

function grepRedirect(input, cwd, p) {
  const scope = searchScope(input, cwd);
  if (scope.pass) return null;
  return (
    `retry as mcp__${p}__search_regex(q="${input.pattern || ''}"${scope.hint}) — required ` +
    `parameter is 'q' (not pattern, regex, query, or search). For plain literals use ` +
    `mcp__${p}__search_text(q=...). This redirect is expected.`
  );
}

function globRedirect(input, cwd, p) {
  const scope = searchScope(input, cwd);
  if (scope.pass) return null;
  return (
    `retry as mcp__${p}__search_file(q="${input.pattern || ''}"${scope.hint}) — required ` +
    `parameter is 'q' (not glob, pattern, namePattern, query, or search); glob patterns are ` +
    `relative to the project root. This redirect is expected.`
  );
}

// ---- Bash command dispatch ----------------------------------------------

const ANTI_BYPASS =
  'do not set JETBRAINS_ROUTER_* env vars as a command prefix. Those are the ' +
  "user's session controls (kill switch, per-tool bypass list) — not an agent escape hatch. " +
  'Setting them in the command does not disable the hook. If a redirect is genuinely wrong, ' +
  'surface it to the user instead of working around it.';

// Peel leading `env` / `env -i` / KEY=VAL tokens so an env-var prefix can't
// dodge the dispatch patterns. Returns the normalized command, or null when
// the prefix tries to set JETBRAINS_ROUTER_* (anti-bypass: hard deny).
function peelEnvPrefix(cmd) {
  let c = cmd;
  if (c.startsWith('env -i ')) c = c.slice(7);
  else if (c.startsWith('env ')) c = c.slice(4);
  for (let i = 0; i < 16; i++) {
    const m = c.match(/^([A-Za-z_][A-Za-z0-9_]*)=\S*\s+/);
    if (!m) break;
    if (m[1].startsWith('JETBRAINS_ROUTER_')) return null;
    c = c.slice(m[0].length);
  }
  return c;
}

const FIND_COMPLEX =
  /\s-(exec|execdir|delete|prune|not|type|[amc]time|or|o|and|a|mindepth|maxdepth|i?path|newer|size|empty|i?regex|user|group|uid|gid|perm|print0|fprint)\b/;

function buildRedirect(p) {
  return (
    `retry as mcp__${p}__build_project — returns structured compile errors. For single-file ` +
    `diagnostics prefer mcp__${p}__get_file_problems(filePath=...). This redirect is expected.`
  );
}

function testRedirect(p) {
  return (
    `retry as mcp__${p}__execute_run_configuration (list configs first with ` +
    `mcp__${p}__get_run_configurations) — this redirect is expected.`
  );
}

function grepCmdRedirect(p) {
  return (
    `retry as mcp__${p}__search_text(q="<pattern>") for literals or ` +
    `mcp__${p}__search_regex(q="<pattern>") for regex — required parameter is 'q'. ` +
    `This redirect is expected.`
  );
}

function readFileRedirect(p, rel) {
  return `retry as mcp__${p}__read_file(file_path="${rel}") — this redirect is expected.`;
}

function bashRedirect(command, cwd, p) {
  const stripped = String(command || '').replace(/^\s+/, '');
  if (!stripped) return null;

  // Pipes, redirection, chaining, backgrounding: composition the IDE tools
  // can't model — native Bash keeps it. Quotes bail too: operand extraction
  // by whitespace split is unsafe with quoted tokens.
  if (/[|<>;&]/.test(stripped)) return null;
  if (/['"`]/.test(stripped)) return null;

  const cmd = peelEnvPrefix(stripped);
  if (cmd === null) return ANTI_BYPASS;

  if (/^(npm run build|yarn build|pnpm build|yarn tsc|npm run tsc|pnpm tsc)\b/.test(cmd) || /^tsc(\s|$)/.test(cmd)) {
    return buildRedirect(p);
  }
  if (/^(npm test|npm run test|yarn test|pnpm test)\b/.test(cmd) || /^(jest|vitest)(\s|$)/.test(cmd)) {
    return testRedirect(p);
  }

  const tokens = cmd.split(/\s+/);
  const exe = tokens[0];

  if (exe === 'cat' || exe === 'head' || exe === 'tail') {
    if (tokens.includes('-f') || tokens.includes('--follow')) return null; // follow, not a snapshot
    const fileArg = tokens[tokens.length - 1];
    if (fileArg.startsWith('-')) return null; // trailing flag — not worth parsing
    if (isBinaryPath(fileArg)) return null;
    const rel = toProjectRelative(fileArg, cwd);
    if (!rel || isPassthroughPath(rel)) return null;
    return readFileRedirect(p, rel);
  }

  if (exe === 'ls') {
    // First non-flag token; a few flags take values.
    const valueFlags = new Set(['--color', '--format', '--time', '--sort']);
    let arg = '.';
    for (let i = 1; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === '--') continue;
      if (valueFlags.has(t)) {
        i++;
        continue;
      }
      if (t.startsWith('-')) continue;
      arg = t;
      break;
    }
    const rel = toProjectRelative(arg, cwd);
    if (!rel) return null;
    return `retry as mcp__${p}__list_directory_tree(directoryPath="${rel}") — this redirect is expected.`;
  }

  if (exe === 'grep' || exe === 'rg' || exe === 'egrep' || exe === 'fgrep') {
    return grepCmdRedirect(p);
  }

  if (exe === 'find') {
    const name = cmd.match(/\s-i?name\s+(\S+)/);
    if (!name) return null;
    if (FIND_COMPLEX.test(cmd)) return null; // richer predicates than a glob can model
    return (
      `retry as mcp__${p}__search_file(q="${name[1]}") — glob patterns relative to the ` +
      `project root; required parameter is 'q'. This redirect is expected.`
    );
  }

  return null;
}

// ---- PowerShell command dispatch -----------------------------------------

// Conservative subset: single plain commands only. Anything with pipes,
// variables, subexpressions, redirection, or quoting stays native.
function powershellRedirect(command, cwd, p) {
  const stripped = String(command || '').replace(/^\s+/, '');
  if (!stripped) return null;
  if (/[|<>;&$`'"]/.test(stripped) || stripped.includes('\n')) return null;

  if (/^(npm run build|yarn build|pnpm build)\b/i.test(stripped) || /^tsc(\s|$)/i.test(stripped)) {
    return buildRedirect(p);
  }
  if (/^(npm test|npm run test|yarn test|pnpm test)\b/i.test(stripped) || /^(jest|vitest)(\s|$)/i.test(stripped)) {
    return testRedirect(p);
  }

  const tokens = stripped.split(/\s+/);
  const exe = tokens[0].toLowerCase();

  if (['get-content', 'gc', 'cat', 'type'].includes(exe)) {
    // -Wait is a follow (tail -f); range/format flags carry a value.
    const valueFlags = new Set(['-totalcount', '-tail', '-head', '-first', '-last', '-readcount', '-encoding']);
    let fileArg = '';
    for (let i = 1; i < tokens.length; i++) {
      const t = tokens[i];
      const tl = t.toLowerCase();
      if (tl === '-wait') return null;
      if (valueFlags.has(tl)) {
        i++;
        continue;
      }
      if (t.startsWith('-')) return null; // unknown flag — bail
      if (fileArg) return null; // more than one operand — bail
      fileArg = t;
    }
    if (!fileArg || isBinaryPath(fileArg)) return null;
    const rel = toProjectRelative(fileArg, cwd);
    if (!rel || isPassthroughPath(rel)) return null;
    return readFileRedirect(p, rel);
  }

  if (['get-childitem', 'gci', 'ls', 'dir'].includes(exe)) {
    if (tokens.slice(1).some((t) => t.startsWith('-'))) return null; // PS flag parsing — bail
    const arg = tokens[1] || '.';
    const rel = toProjectRelative(arg, cwd);
    if (!rel) return null;
    return `retry as mcp__${p}__list_directory_tree(directoryPath="${rel}") — this redirect is expected.`;
  }

  if (exe === 'select-string' || exe === 'sls') {
    return grepCmdRedirect(p);
  }

  return null;
}

// ---- main -----------------------------------------------------------------

function dispatch(tool, input, cwd, p) {
  switch (tool) {
    case 'Read':
    case 'Edit':
    case 'Write':
      return fileRedirect(input, cwd, p, tool);
    case 'Grep':
      return grepRedirect(input, cwd, p);
    case 'Glob':
      return globRedirect(input, cwd, p);
    case 'Bash':
      return bashRedirect(input.command, cwd, p);
    case 'PowerShell':
      return powershellRedirect(input.command, cwd, p);
    default:
      return null;
  }
}

function main() {
  const data = readInput();
  if (!data.tool_name) return;

  // Subagents may not have the JetBrains MCP tools in their allowed set —
  // agent_id is present only in subagent payloads.
  if (data.agent_id) return;

  const bypass = (process.env.JETBRAINS_ROUTER_BYPASS || '').split(',').map((s) => s.trim());
  if (bypass.includes(data.tool_name)) return;

  const prefix = activePrefix();
  if (!prefix) return;

  if (isLinkedWorktree(data.cwd)) return;

  const reason = dispatch(data.tool_name, data.tool_input || {}, data.cwd || '', prefix);
  if (reason) deny(reason);
}

if (require.main === module) main();

module.exports = { dispatch, bashRedirect, powershellRedirect };
