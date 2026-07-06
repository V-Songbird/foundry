---
name: router
description: Reference for routing Claude Code file-ops through a JetBrains IDE MCP server (mcp__webstorm__*, mcp__rider__*, mcp__idea__*, mcp__pycharm__*, etc.). Load when a jetbrains-router redirect fires on a native Read/Grep/Glob/Edit/Write/Bash call, or before the first file operation in a session where JetBrains MCP tools are registered. Covers the native-to-IDE tool mapping, required parameter names, path translation, and when to stay on native tools. Do NOT load for sessions without JetBrains MCP tools, or for work limited to dotfiles, markdown, JSON, or config files — the hook passes those through automatically.
user-invocable: true
---

# jetbrains-routing

## When this applies

A `mcp__<ide>__*` tool (webstorm, rider, idea, pycharm, phpstorm, goland, rubymine, clion, rustrover, …) is listed in the session's available tools. Check once per session — if none is present, the JetBrains MCP server isn't connected and this guidance doesn't apply (use native tools; the hook fails open).

## Why route

- **Live diagnostics**: `get_file_problems` / `lint_files` return the IDE's in-memory inspection results — no `tsc`/`gradle`/`mypy` cold start.
- **Unsaved-buffer reads**: `read_file` reflects the editor's current buffer, including changes the user hasn't saved.
- **Project-index search**: `search_text` / `search_regex` / `search_symbol` / `search_file` skip `node_modules`, build outputs, and `.gitignore`'d paths via the project model, and return 1-based line/column coordinates.

## Prefix

JetBrains auto-configure registers the MCP server under the lowercase product name (`webstorm`, `rider`, `idea`, `pycharm`, …) — that becomes the `mcp__<prefix>__*` tool prefix. The hook auto-detects the running IDE. If you renamed your `mcpServers` entry, or run several IDEs at once, `JETBRAINS_MCP_PREFIX=<name>` picks the target.

## Tool mapping

**Use the JetBrains replacement whenever a `mcp__<ide>__*` tool is registered.** The `PreToolUse` hook denies a native call with a reason naming the IDE tool and the pre-translated project-relative path — going native first costs the round-trip for nothing.

Full mapping with required parameters and usage notes: [references/tool-map.md](references/tool-map.md). Load it before the first routed call in a session. The high-traffic ones:

| Native | IDE tool | Required params |
|---|---|---|
| Read | `read_file` | `file_path` (relative or absolute; `mode`/`start_line`/`max_lines` for partial reads) |
| Grep | `search_regex` / `search_text` | `q` — optionally `paths=["src/**"]` to scope |
| Glob | `search_file` | `q` (glob, project-relative) |
| Edit | `replace_text_in_file` | `pathInProject`, `oldText`, `newText` — pass `replaceAll` explicitly (IDE default is `true`) |
| Write (new file) | `create_new_file` | `pathInProject`, `text` |
| Bash build / tsc | `build_project` — or `get_file_problems(filePath=…)` for one file | |
| Bash test | `execute_run_configuration` after `get_run_configurations` | `configurationName` |

## Path translation

Most JetBrains tools take **project-relative** paths (`pathInProject` / `filePath` / `directoryPath`). Strip the project root prefix and use forward slashes: `D:\Projects\app\src\main.ts` → `src/main.ts`. `read_file`'s `file_path` also accepts absolute paths, `..` segments, and jar/jrt URLs — anything returned by a `search_*` tool can be passed back as-is.

## Stay on native tools for

- **Composed shell commands** — pipes, redirection, chaining. `execute_terminal_command` caps output at 2000 lines and may prompt the user in the IDE.
- **git commands.** `git_status` / `get_repositories` exist but native `git` is strictly richer — log, diff, blame, staging.
- **Binary files** — `read_file` errors on them.
- **Paths outside the project root** — the IDE only sees the open project.
- **Non-code paths** (hook passes these through automatically): dotfiles/dotfolders, markdown, JSON/JSONL, `docs/`, config extensions (`.yml`, `.yaml`, `.toml`, `.ini`, `.cfg`, `.conf`, `.properties`, `.lock`, `.env`).
- **Interactive or long-running commands** — dev servers, watchers, REPLs.
- **Linked git worktrees** — the hook fails open there; the IDE's open project is almost never the worktree.
- **Languages the active IDE doesn't index** — Kotlin/Java outside IDEA, C# outside Rider: `search_symbol` and `get_file_problems` return empty. If `search_symbol` returns nothing for a symbol you can see in a source file, switch to `search_text` for the session and don't retry.

## Escape hatches

Session-level controls, set by the human before launching Claude Code — never as a command prefix:

- `JETBRAINS_ROUTER_BYPASS=Read,Edit` — leave specific native tools alone (comma-separated).
- `JETBRAINS_ROUTER_DISABLE=1` — kill-switch every redirect.

The hook hard-denies any Bash command prefixed with `JETBRAINS_ROUTER_*=…` — that doesn't disable the hook (it reads its own env, not the command's) and is treated as a bypass attempt. If a redirect is genuinely wrong, surface it to the user.

## Ordering heuristic

1. Before the first file operation of a session, check whether a `mcp__<ide>__*` prefix is registered. Yes → IDE replacement; no → native.
2. On the first JetBrains call, `get_project_modules` once confirms the IDE has the project you expect open.
3. Translate paths to project-relative form before calling — the deny reason carries the translated path if you ever get one, but getting it right first saves the round-trip.
4. When `search_symbol` returns a result, check its `lineText` before issuing a `read_file` — it often carries enough context.
