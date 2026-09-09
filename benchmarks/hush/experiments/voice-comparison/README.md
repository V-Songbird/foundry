# Historical Hush voice comparison

Retained experiment suite and its recorded outputs. Contents:

- **this file + `runner/`, `fixtures/`, `tasks.json`** — hush vs caveman (below)
- **[`razor-vs-ponytail/`](../../../razor/experiments/dependency-comparison/README.md)** — razor vs ponytail agentic
  head-to-head (Python harness reusing ponytail's own benchmark instruments)

# hush vs caveman

Reproducible, ground-truthed comparison of two token-reduction plugins for Claude Code:

- **hush** (this monorepo, `../hush`) — forced output style + deterministic PostToolUse
  compression of Bash/PowerShell output + narration meter.
- **caveman** (`D:/Projects/Knowledge/caveman`) — SessionStart-injected "talk like caveman"
  ruleset + skills; compresses what the agent *says*.

## Method

Every measurement comes from **real headless Claude Code sessions** (`claude -p
--output-format stream-json`), one fresh isolated workspace per run. Token counts and cost
are taken from the API's own `usage` blocks in the transcript — not tokenizer estimates.

### Arms

| Arm | How |
|---|---|
| `baseline` | plain Claude Code, no plugin |
| `hush` | `--plugin-dir <monorepo>/hush` + `--settings settings-hush.json` (pins `outputStyle: hush:Hush` — `force-for-plugin` does not apply under `--setting-sources project` in `-p` mode) |
| `caveman` | `--plugin-dir D:/Projects/Knowledge/caveman`, `CAVEMAN_DEFAULT_MODE=full` |

Isolation per run:
- `--setting-sources project` — the user's global settings, plugins and hooks (razor,
  foreman, …) are excluded; the scratch workspace has no project settings, so each arm is
  exactly baseline + its one plugin.
- `--strict-mcp-config` — no MCP servers.
- fresh copy of the task fixture as cwd; `--permission-mode acceptEdits` plus a scoped
  `--allowedTools` allowlist (node + read-only shell commands + file tools) — no blanket
  permission bypass; `--max-turns` cap and a hard wall-clock kill.

### Task suite (ground truth per task)

| Task | Category | Ground truth |
|---|---|---|
| `explain-rerender` | Q&A, no tools | keyword rubric (reference identity, useMemo/memo) |
| `explain-rebase` | Q&A, no tools | keyword rubric (history rewrite, merge commit, shared branches) |
| `bugfix-expiry` | tool: fix failing tests | `node --test` exits 0 in the workspace afterwards |
| `bugfix-pagination` | tool: fix failing tests | `node --test` exits 0 |
| `noisy-build` | tool: 900-line noisy build output | final answer names all 3 planted warning codes + files |
| `refactor-rename` | tool: multi-file rename | `node --test` exits 0 |
| `repo-summary` | tool: explore + summarize | rubric: names the real components |
| `log-triage` | tool: ~720-line log | final answer names the planted root cause (redis ECONNREFUSED) |

Q&A tasks measure pure output compression (caveman's home turf). Tool tasks additionally
measure **context traffic** — the sum of input+cache tokens across every API call in the
session — which is where hush's tool-output compression should show up. Correctness is
checked mechanically so compression that destroys accuracy scores as a failure, not a win.

### Metrics per run

- `cost_usd`, `num_turns`, `duration_ms`, wall time (from the `result` event)
- `output_tokens`, `input_tokens`, `cache_read`, `cache_creation` (result usage)
- `context_traffic` — Σ over all API calls of input + cache-read + cache-creation tokens
- `narration_words` (assistant text before the final message) vs `final_words`
- `tool_result_chars` — bytes of tool output that entered context
- `pass` + `score` from the task's checker

## Run it

```bash
node runner/run.js --tag smoke --tasks explain-rerender --reps 1 --model haiku   # plumbing check
node runner/run.js --tag full --reps 2 --model sonnet                            # the real thing
node runner/report.js --tag full                                                 # -> results/full/report.md + report.html
```

Flags: `--tasks a,b` `--arms baseline,hush,caveman` `--reps N` `--model M`
`--concurrency N` `--tag NAME`.

## Fairness notes / limits

- Each plugin adds its own fixed prompt overhead (hush: output style; caveman: SessionStart
  context). That overhead is *part of the product* and is deliberately included in the
  measurement, not subtracted.
- Caveman's statusline nudge is suppressed naturally (the user config has a statusLine);
  mode is pinned to `full` via env for determinism.
- Single model per run set; temperature is whatever `claude -p` uses. Reps + min/max
  columns expose variance, but this is not a powered experiment.
- Q&A fidelity is a keyword rubric, not an LLM judge — crude but deterministic and
  hand-ground-truthed. A degenerate one-word answer fails it.
