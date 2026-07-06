# Changelog

All notable changes to jetbrains-router are documented here. jetbrains-router
is a monorepo-folder plugin — its version is owned by
`.claude-plugin/marketplace.json` at the repo root, not by
`jetbrains-router/.claude-plugin/plugin.json` (which carries no version field
by convention).

## 2.0.0-alpha — 2026-07-05

Revival release. The plugin returns to the monorepo, rewritten from bash to Node.js and re-grounded against the current IntelliJ Platform MCP server (verified against the `mcp-server` plugin sources, build 262 / 2025.2+).

### Changed

- **Hooks ported bash → Node.js.** Drops the `jq` and git-bash dependencies entirely; hooks now run natively on Windows via `commandWindows` entries, matching the razor/hush convention. Deny decisions use the structured PreToolUse JSON output (`permissionDecision: "deny"`) instead of exit 2 + stderr.
- **One probe, one truth.** IDE detection and prefix selection were two separate process scans that could disagree — a lone PyCharm passed the "enforce" gate but got routed to `mcp__webstorm__*`. Now a single probe maps the running process to its prefix (webstorm, idea, rider, pycharm, phpstorm, goland, rubymine, clion, datagrip, rustrover, aqua, writerside) and gates enforcement with the same answer. The probe result is cached for 30 seconds, so `tasklist`/`ps` is no longer spawned on every tool call.
- **Tool map re-grounded on the 2025.2+ server.** `find_files_by_name_keyword` and `find_files_by_glob` no longer exist — `find -name` now redirects to the unified `search_file(q=<glob>)` with the actual glob extracted from the command. `read_file`'s parameter is `file_path` (was `pathInProject`) and accepts absolute paths, `..`, and jar/jrt URLs. Documented the new toolsets: `lint_files`, `apply_patch`, `get_project_dependencies`, `get_all_open_file_paths`, `open_file_in_editor`, `git_status`.
- **Edit redirects carry explicit `replaceAll`.** The IDE's `replace_text_in_file` defaults to replace-all, which silently diverges from native Edit's single-occurrence semantics — the redirect now instructs `replaceAll=false` (or `true` when the native call asked for `replace_all`).
- **Grep/Glob scoping upgraded.** The 2025.2+ `search_*` tools accept `paths` glob filters, so a search scoped to an in-project directory now redirects with a `paths=["<dir>/**"]` hint instead of only working project-wide. A search scoped *outside* the project root now fails open (previously it was redirected to a project-wide IDE search that could not see the target).
- Router skill made loadable again — 1.0.7 had both `user-invocable: false` and `disable-model-invocation: true`, leaving it unreachable by anyone.

### Added

- **PowerShell routing.** A conservative subset for Windows-first sessions: `Get-Content`/`gc`/`cat`/`type` (including `-TotalCount`/`-Tail`; `-Wait` bails), `Get-ChildItem`/`gci`/`ls`/`dir`, `Select-String`/`sls`, and the npm/tsc/jest/vitest build-and-test commands. Anything with pipes, variables, subexpressions, redirection, or quoting stays native.
- `node hooks/jb-lib.js --probe` CLI for the status skill: JSON report of enforcement state, detected prefix, kill-switch, and bypass list.
- `node:test` suite (47 tests) replacing the 15-file bash suite, covering redirects, passthrough scope, bypass controls, Bash and PowerShell command parsing, anti-bypass, path translation (including Windows drive-letter case), and the linked-worktree guard.

### Kept from 1.x

Fail-open everywhere (no IDE, malformed input, out-of-project paths, composed commands), the non-code passthrough scope (dotfiles, markdown, JSON/JSONL, `docs/`, config extensions, binaries), the subagent bypass (`agent_id` present → native tools), the linked-worktree guard with toplevel-anchored `rev-parse`, the `JETBRAINS_ROUTER_DISABLE` / `JETBRAINS_ROUTER_BYPASS` session controls, and the anti-bypass hard deny on `JETBRAINS_ROUTER_*=` command prefixes.

---

## 1.0.7-alpha and earlier — 2026-04-29 → 2026-05-08

Pre-revival history (bash implementation, standalone repo): PreToolUse routing for Read/Grep/Glob/Edit/Write/Bash with fail-open behavior, IDE auto-detection across Windows/macOS/Linux, non-code passthrough scope, worktree and subagent bypasses, anti-bypass env-prefix guard, function-call-syntax redirect messages, and a 15-file bash test suite. Deprecated 2026-05; superseded by 2.0.0-alpha.
