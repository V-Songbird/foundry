# jetbrains-router

**Makes Claude work through your JetBrains IDE — live error detection, reads that see unsaved changes, searches that skip the junk.**

---

## What is this?

Claude Code's native tools read files from disk and search with filesystem tools. Your JetBrains IDE already knows more: it holds the current editor buffers (including what you haven't saved), a project index that excludes `node_modules` and everything `.gitignore`'d, and a live diagnostic engine that knows about every error without running a build.

jetbrains-router routes Claude's file operations through the IDE's MCP server whenever a JetBrains IDE is running. Ask "does this file have errors?" and Claude gets the IDE's in-memory inspection results instead of spawning `tsc` or `gradle`. Every read reflects what's actually in your editor. Every search runs against the project index.

**Fails open**: no IDE running, MCP unreachable, weird input — every tool call passes through to native behavior without error or interruption. Install it and forget it.

## Why you'd want it

- **Instant diagnostics.** `get_file_problems` replaces cold `tsc`/`gradle`/`mypy` runs with the IDE's live inspection index.
- **No stale reads.** Claude sees your unsaved editor changes; native disk reads don't.
- **Cleaner searches.** The project index skips build outputs and ignored paths — fewer tokens burned on noise.
- **Zero configuration.** Auto-detects which IDE is running (WebStorm, IntelliJ IDEA, Rider, PyCharm, PhpStorm, GoLand, RubyMine, CLion, RustRover, and friends) and routes to the matching MCP prefix.

## Requirements

- A JetBrains IDE 2025.2+ with the MCP Server enabled (Settings → Tools → MCP Server), connected to Claude Code as an MCP server.
- Node.js (already required by Claude Code).

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install jetbrains-router
```

---

## How it works (for the curious)

A single `PreToolUse` hook watches `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash`, and `PowerShell`. When a JetBrains IDE process is detected (probe cached 30s) and the call has a direct IDE equivalent, the native call is denied with a reason naming the exact replacement — tool, required parameter names, and the pre-translated project-relative path:

> jetbrains-router: retry as mcp__webstorm__read_file(file_path="src/components/App.tsx") — this redirect is expected.

Claude retries with the IDE tool; one round-trip, correct parameters, no guessing. A reference skill (`/jetbrains-router:router`) carries the full native-to-IDE tool map, verified against the IntelliJ Platform MCP server sources (2025.2+).

### Routing scope

Routing applies to **source code inside the open project**. Always native, even with an IDE connected:

| Category | Examples |
|----------|---------|
| Dotfiles and dotfolders | `.claude/`, `.idea/`, `.gitignore`, `.env` |
| Markdown, JSON, JSONL | `CLAUDE.md`, `README.md`, `package.json` |
| `docs/` and config extensions | `.yml`, `.toml`, `.ini`, `.properties`, `.lock`, … |
| Binary files | images, archives, compiled artifacts |
| Paths outside the project root | the IDE can't see them |
| Composed shell commands | pipes, redirection, chaining, quoting |
| git commands | native `git` is strictly richer |
| Linked git worktrees | the IDE almost never has the worktree open |
| Subagents | `agent_id` in the payload → native tools, unconditionally |

For `Grep`/`Glob`, a search scoped to one of these areas stays native; a search scoped to an in-project source directory redirects with a `paths=["<dir>/**"]` hint; whole-project searches always redirect.

### Bash and PowerShell command routing

Simple, single commands with IDE equivalents get redirected: `cat`/`head`/`tail` → `read_file`, `ls` → `list_directory_tree`, `grep`/`rg` → `search_text`/`search_regex`, `find -name` → `search_file`, `npm run build`/`tsc` → `build_project`, `npm test`/`jest`/`vitest` → run configurations. On PowerShell: `Get-Content`, `Get-ChildItem`, `Select-String`, and their aliases. Anything composed — pipes, redirects, chains, quoting, variables — stays native; over-bailing is preferred over routing a composed command by accident.

Prefixing a command with `JETBRAINS_ROUTER_*=…` is hard-denied: those are the user's session controls, and setting them inside a command doesn't disable the hook anyway.

## Skills

| Name | Description |
|------|-------------|
| `/jetbrains-router:router` | The native-to-IDE tool mapping — required parameters, path translation, when to stay native |
| `/jetbrains-router:status` | Reports whether routing is active, which IDE prefix is live, and any mismatch between hook and MCP state |

## Configuration

Environment variables, set before launching Claude Code:

| Variable | Effect |
|----------|--------|
| `JETBRAINS_ROUTER_DISABLE=1` | Kill-switch: disables all routing |
| `JETBRAINS_ROUTER_BYPASS=Read,Edit` | Disables routing for specific tools (comma-separated) |
| `JETBRAINS_MCP_PREFIX=<name>` | Overrides the detected prefix — renamed `mcpServers` entries, or tie-break when several IDEs run |

## Known limits

- The redirect costs one model round-trip when it fires — that's the mechanism. The router skill teaches Claude to go to the IDE tool first, so steady-state sessions rarely pay it.
- The process probe matches executable names; an IDE launched through a bare `java` wrapper isn't detected (routing just stays off).
- IDE language support gates the value: Kotlin/Java need IDEA, C# needs Rider — in other IDEs symbol search and diagnostics return empty for those files, and the skill tells Claude to fall back to text search.
- `execute_terminal_command` is never a redirect target: 2000-line output cap and an IDE-side confirmation prompt make native shells strictly better.

## Tests

```
node --test jetbrains-router/tests/*.test.js
```

## License

MIT — see [LICENSE](./LICENSE).
