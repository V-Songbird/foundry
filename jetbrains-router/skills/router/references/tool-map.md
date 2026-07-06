# Native-to-JetBrains IDE tool mapping

Verified against the IntelliJ Platform `mcp-server` plugin sources, build 262 (2025.2+ toolsets). Tool names below use `mcp__<ide>__` as the placeholder — substitute the prefix registered in this session (`webstorm`, `rider`, `idea`, `pycharm`, …).

## Reading and searching

| Native | IDE replacement | Notes |
|---|---|---|
| `Read` | `read_file` | Param is `file_path` — accepts project-relative paths, absolute paths, `..`, archive entries (`lib.jar!/pkg/Foo.class`), and `file://`/`jar://`/`jrt://` URLs; paths returned by `search_*` tools pass back as-is. Reflects the editor's in-memory buffer (unsaved edits visible). Returns 1-indexed numbered lines. Modes: `slice` (default; `start_line` + `max_lines`), `lines` (`start_line`/`end_line` inclusive), `line_columns`, `offsets`, `indentation`. Use partial modes for files over a few hundred lines. Can decompile `.class` files. |
| `Grep` (regex) | `search_regex` | Required: `q`. Optional `paths` (project-relative globs with `!` excludes, e.g. `["src/**", "!**/test/**"]`), `limit` (default 1000). Returns snippet + 1-based line/column. |
| `Grep` (literal) | `search_text` | Required: `q`. Same shape and options as `search_regex`. |
| Identifier lookup | `search_symbol` | Required: `q`. Semantic — resolves classes/methods/fields to their definition. Optional `include_external=true` to include SDK/library symbols. Check the result's `lineText` before reading the file — it often carries enough context. Empty result for a symbol that visibly exists = language not indexed by this IDE; fall back to `search_text` for the session. |
| `Glob` | `search_file` | Required: `q` — a glob relative to the project root (`**/*.kt`, `src/**/Foo*.java`); patterns without `/` are treated as `**/pattern`. Optional `paths` filters, `includeExcluded`, `limit`. Replaces the older `find_files_by_name_keyword` / `find_files_by_glob` tools, which no longer exist. |
| `ls` / directory listing | `list_directory_tree` | Required: `directoryPath` (project-relative). Optional `maxDepth` (default 5). |

## Editing

| Native | IDE replacement | Notes |
|---|---|---|
| `Edit` | `replace_text_in_file` | Required: `pathInProject`, `oldText`, `newText`. **`replaceAll` defaults to `true`** — pass `replaceAll=false` to mirror native Edit's single-occurrence semantics. `caseSensitive` defaults to `true`. Auto-saves. Empty `oldText` on an empty file sets the content (create-then-fill). |
| `Write` (new file) | `create_new_file` | Required: `pathInProject`. `text` carries the content; parent directories auto-created. `overwrite=true` replaces an existing file (the router only redirects new files — native Write keeps its read-before-write guard for existing ones). |
| Rename a symbol | `rename_refactoring` | Required: `pathInProject`, `symbolName`, `newName`. Updates every reference — prefer over text edits for identifier renames. |
| Apply a diff | `apply_patch` | `input` (or `patch`): unified git diff or apply_patch format. Useful for multi-hunk changes in one call. |
| Format file | `reformat_file` | Required: `path` (project-relative). |

## Diagnostics and build

| Native | IDE replacement | Notes |
|---|---|---|
| `tsc` / `npm run build` / `gradle check` on one file | `get_file_problems` | Required: `filePath`. `errorsOnly` defaults to `true`; set `false` to include warnings. Returns the IDE's live inspection results — compile errors, unresolved symbols, deprecations — without a cold language-server start. **Prefer this whenever the question is "does this file have errors?"** No native equivalent. |
| Lint several files | `lint_files` | Required: `file_paths` (list, project-relative). `min_severity`: `warning` (default) or `error`. |
| Full build | `build_project` | Optional `rebuild=true`, or `filesToRebuild` for a scoped compile. Returns structured compile errors. |
| `npm test` / test runner | `execute_run_configuration` | Required: `configurationName` — call `get_run_configurations` first. Optional one-shot overrides: `programArguments`, `workingDirectory`, `envs`; `waitForExit=false` for fire-and-forget. |
| Docs / signature at position | `get_symbol_info` | Required: `filePath`, `line`, `column` (1-based). No native equivalent. |

## Project model

| Tool | Purpose |
|---|---|
| `get_project_modules` | Module list with types — also the cheapest "is the right project open?" probe |
| `get_project_dependencies` | Declared project dependencies |
| `get_all_open_file_paths` | What the user has open right now (active file marked) |
| `open_file_in_editor` | Show a file to the user in the IDE |

## VCS (native git usually wins)

| Tool | Purpose |
|---|---|
| `git_status` | Per-repository status with optional untracked/ignored; native `git status` is equivalent, native `git log`/`diff`/`blame` have no IDE counterpart |
| `get_repositories` | VCS roots the IDE knows about |

## Terminal

`execute_terminal_command(command, executeInShell=false, reuseExistingTerminalWindow=true)` — caps output at 2000 lines and may prompt the user in the IDE. Native Bash/PowerShell is almost always the better choice; the router never redirects to it.

## Product-specific extras

Paid-IDE builds bundle additional toolsets not present in every product (observed empirically; availability varies by product and version):

- **Database tools** (WebStorm, Rider, and other IDEs with the Database plugin): `list_database_connections`, `execute_sql_query`, `preview_table_data`, `list_database_schemas`, and friends.
- **Debugger control** (IDEA): the `xdebug_*` family — breakpoints, stepping, frame values, expression evaluation.
- **Notebooks** (IDEA): `runNotebookCell`.
- **Rider**: `permission_prompt` — a security gate; pass through, never intercept.

Check the session's registered tool list before relying on any of these.
