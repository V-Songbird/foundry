# razor vs ponytail — agentic benchmark

Head-to-head between two implementations of the same lazy-dev philosophy:

- **ponytail** (`D:\Projects\Knowledge\ponytail`) — prompt-injection delivery: ruleset injected
  at SessionStart, re-injected into every subagent spawn and tracked on every prompt.
- **razor** (`../../razor`) — harness-level delivery: ~300-token ladder once per session, gated
  subagent injection, plus mechanical soft gates (dependency guard, new-file meter, git build
  ledger).

Every cell is a **real headless Claude Code session** (`claude -p`) in an isolated workspace,
scored on the files it leaves behind and the CLI's own usage JSON. No SDK, no mocks of the
agent itself.

## Credits / reuse

The harness reuses ponytail's own published benchmark instruments
(`benchmarks/agentic/{tasks,run}.py` are imported directly): its 7-task deterministic safety
tier, its LOC counters (tests never count as bloat), its selftest protocol (good ref must
pass, bad ref must be caught, before any API spend), and its isolation recipe
(`--setting-sources project,local` + one `--plugin-dir` per arm — the fix for the baseline
contamination its 2026-06-17 run documented). Using the competitor's own instruments removes a
whole class of "your benchmark favors your plugin" objections for the reused tiers.

## Arms

| arm | activation |
|---|---|
| `baseline` | no plugin (the fair agent baseline) |
| `ponytail` | `--plugin-dir D:\Projects\Knowledge\ponytail` (env `PONYTAIL_REPO` overrides) |
| `razor` | `--plugin-dir ..\..\razor` (env `RAZOR_DIR` overrides) |
| `karpathy` | *(not in default `ARMS`, select with `--arms`)* prompt-only rival: a single `CLAUDE.md` fetched at run time (`fetch_rival_claude_md`, env `RIVAL_CLAUDE_MD_URL` overrides) and written into the workspace as project memory — no `--plugin-dir`, no hooks. Cached at `_cache/rival_claude_md.txt` (gitignored); never committed. |

Only one plugin/CLAUDE.md arm is ever loaded per cell. The user's globally-installed plugins (including the
live razor + hush of the parent session) are excluded from every cell via `--setting-sources
project,local`, and `RAZOR_*` / `PONYTAIL_*` / `HUSH_*` env vars are stripped from the cell
environment.

## Tiers

| tier | tasks | Bash | ground truth |
|---|---|---|---|
| **safety** (reused) | safe-path, critic-email, rate-limit, sql-user, auth-token, csv-sum, cache | off | produced function executed against adversarial input (deterministic, stdlib-only) |
| **vibe/greenfield** (reused) | vibe-todo, vibe-restapi, vibe-jsonconf | off | LOC of delivered code (over-build proxy) |
| **dependency traps** (new) | dep-slug, dep-toml, dep-uuid | **on**, package managers shimmed | task solvable with stdlib/platform; `safe` = no new dependency (static import scan + manifest diff + shim log). Correctness executed. |
| **sprawl trap** (new) | sprawl-todo | **on** | CLI behavior executed (add/list/overdue); new-file count + diff LOC from git |
| **injection overhead** (new) | oh-question, oh-typo | off | answer/edit correctness; the metric is tokens/cost/time on tasks where the plugins can only add overhead |

Why the new tiers: ponytail's own benchmark runs with Bash disallowed, which makes razor's
mechanical layer (dep guard on Bash, ledger on git) invisible — the reused tiers compare the
*rulesets*, the new tiers compare the *mechanisms*. Package managers are shimmed to no-ops
that log the call (`_pkgmgr.log`), so installs are observed but never executed; razor's deny
fires *before* the shim, so a razor-arm agent that backs off after the deny leaves the log
empty while the deny itself is visible in the stream transcript.

Optional: ponytail's 12-ticket real-repo LOC tier also works here (task ids `tmpl-*`) if you
clone the fixture: `git clone https://github.com/fastapi/full-stack-fastapi-template`,
checkout `cd83fc1`, and point `_TMPL` in ponytail's `tasks.py` at the clone.

## Metrics per cell

- `correct` / `safe` — deterministic gates (see tiers).
- `total_loc` / `src_loc` / `src_files` / `new_files` — delivered code; tests excluded and
  tracked separately; git-diff-based on git-seeded tiers.
- `cost`, `in/out/cache tokens`, `duration_ms`, `turns` — straight from the CLI result JSON.
- `install_attempts` — package-add commands that reached the shims.
- `razor_dep_denies` / `razor_file_denies` / `razor_ledger` — razor gate firings, counted from
  the full `stream-json` transcript (kept per cell as `_claude.stream.jsonl` — that's also
  where you read *how* each arm behaved, message by message).

## Run

```bash
python bench.py --selftest            # prove every instrument; no API spend. Run first.
python bench.py --smoke               # oh-question x 3 arms x 1 run  (~$0.05, ~2 min)
python bench.py --default --runs 3    # full sweep: 16 tasks x 3 arms x 3 = 144 cells
python bench.py --task dep-slug,dep-uuid --arms baseline,razor --runs 4
python bench.py --rescore runs/<stamp>   # recompute metrics offline after a scorer tweak
python report.py runs/<stamp>            # -> report.md + report.html + charts.svg
```

Ballpark on haiku: ~$0.02–0.06/cell, so the default n=3 sweep is roughly **$3–9 and
40–80 min** at 4 workers. Needs: `claude` on PATH (authenticated), Python 3.11+ (tomllib),
node on PATH (fnm: run from a shell where `fnm env` has been applied — both plugins' hooks and
the dep-uuid scorer need it).

Workspaces are kept under `runs/<stamp>/<task>__<arm>__<model>__<n>/`; every measurement is
recomputable offline with `--rescore`, so a metric change never costs API twice.

## What this can and cannot show

- **Can:** whether each delivery mechanism actually changes what the agent builds (deps added,
  files created, LOC), what it costs (tokens/time, including each plugin's own injection tax),
  and whether leanness drops safety — with variance, on ground-truthed tasks.
- **Cannot:** production-readiness from 16 tasks; a deterministic safety check is a floor, not
  a proof. LLM-judge passes for over-engineering/completeness exist upstream
  (`judge.py` / `complete.py`) and can be pointed at kept run dirs for the reused tiers.
- Known asymmetries kept in view: razor's ledger only fires at +500 LOC (won't trip on these
  small tasks); ponytail's `full` mode is its default and is what runs here; both plugins'
  hooks need node — a cell where node resolution fails silently degrades to baseline behavior
  (the smoke test checks activation markers in the stream for exactly this reason).
