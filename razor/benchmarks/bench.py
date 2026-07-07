#!/usr/bin/env python3
"""razor agentic benchmark — reproduce the README numbers yourself.

Every cell is a real headless Claude Code session (`claude -p`) in an isolated, throwaway
workspace, with exactly one plugin loaded via --plugin-dir (or none for the baseline). The
user's globally-installed plugins are excluded from every cell via --setting-sources
project,local, so nothing but the arm under test is active. Each cell is scored on the files
the session leaves behind plus the CLI's own usage JSON (cost/tokens/duration).

Two arms ship by default:
  baseline  no plugin — the fair agent baseline
  razor     the razor plugin in this repo (../, or env RAZOR_DIR)
Bring your own third arm to compare against anything with --rival-dir <path-to-a-plugin>.

  python bench.py --selftest          # prove every instrument, no API spend. Run first.
  python bench.py --smoke             # 1 cheap task x each arm x 1, verifies plugin activation
  python bench.py --default           # the default sweep (small, ~$1-3 on haiku)
  python bench.py --full --runs 3     # every task, more reps
  python bench.py --task dep-slug,oh-question --arms baseline,razor --runs 2
  python bench.py --default --rival-dir /path/to/some/other/plugin
  python bench.py --rescore runs/<stamp>   # recompute metrics offline, no API
  python report.py runs/<stamp>            # tables + SVG charts -> runs/<stamp>/report.md
"""
import argparse, concurrent.futures, datetime, json, os, re, shutil, statistics, subprocess, sys, tempfile
from collections import defaultdict
from pathlib import Path

from razor_tasks import RAZOR_TASKS, pkg_add_attempts

HERE = Path(__file__).resolve().parent
# The razor plugin dir. This harness lives at razor/benchmarks/, so the plugin is one level up.
RAZOR_DIR = Path(os.environ.get("RAZOR_DIR", str(HERE.parent)))

TASKS = RAZOR_TASKS

# Arms are resolved in main(): baseline + razor always, plus an optional user-supplied rival.
ARM_DIRS = {"razor": str(RAZOR_DIR)}     # plugin dir per non-baseline arm; rival added at runtime
MODELS = {"haiku": "claude-haiku-4-5-20251001", "sonnet": "claude-sonnet-5",
          "opus": "claude-opus-4-8"}

# A small default subset across the tiers so a curious run is cheap; --full runs everything.
DEFAULT_TASKS = ["dep-slug", "dep-toml", "reuse-scan", "sprawl-todo", "oh-question", "oh-typo"]
FULL_TASKS = list(TASKS)

# Cells run in a scratch dir OUTSIDE this repo's git tree, on purpose. A cell is a real Claude
# session with bypassPermissions; if it sat inside your project's working tree, an auto-commit
# (or a stray `git` the agent runs) could sweep files into your repo. Keeping every workspace
# under the system temp dir means a sandboxed session can never touch your project. Override
# with RAZOR_BENCH_RUNS if you want them elsewhere.
RUNS_DIR = Path(os.environ.get("RAZOR_BENCH_RUNS") or (Path(tempfile.gettempdir()) / "razor-bench"))
CELL_TIMEOUT = 300

# Never let a cell's agent reach for version control or spawn subagents — belt-and-suspenders
# on top of the out-of-tree workspace, and it keeps a cell from wandering off into git history.
GUARD_TOOLS = ["Agent", "Task", "ScheduleWakeup", "CronCreate", "RemoteTrigger"]

# razor's deny/inject markers, counted in the raw stream to show gate behavior per cell.
MARKERS = {
    "razor_dep_denies": "adds a new ",           # dep-guard deny reason
    "razor_file_denies": "razor: new file #",    # file-meter deny reason
    "razor_ledger": "razor ledger:",             # build-ledger question
}

SHIM_MANAGERS = ("npm", "pnpm", "yarn", "pip", "pip3", "poetry", "uv")

# --- self-contained instruments: LOC counting + git diffing -------------------------------
# These are generic (line counting, git plumbing) — no plugin logic. Kept inline so this
# harness imports nothing outside its own folder.

CODE_EXT = {".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".go", ".rs", ".java",
            ".rb", ".sh"}

# Added to every arm's system prompt, identically, on the Bash-disallowed code tiers. We
# measure code PRODUCTION, not execution: agents write the implementation and stop, so a
# flailing verify loop can't inflate tokens/time. Writing tests stays explicitly allowed.
NO_RUN = ("Write the implementation (include tests if you normally would for a change like "
          "this). Do not run a dev server, install dependencies, run a database, or open a "
          "browser to verify -- just write the code and stop. Only the code you write is "
          "measured, not its execution.")

def _is_test(p: Path, workdir: Path):
    rel = p.relative_to(workdir)
    name = p.name.lower()
    return (name.startswith("test_") or name.endswith("_test.py") or name == "conftest.py"
            or any(part.lower() in ("test", "tests") for part in rel.parts[:-1]))

def _count(p: Path, with_comments: bool):
    try: lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    except Exception: return 0
    n = 0
    for ln in lines:
        s = ln.strip()
        if not s: continue
        if not with_comments and s.startswith(("#", "//", "*", "/*", "*/")): continue
        n += 1
    return n

_SELFCHECK_DEFS = ("def demo(", "def _demo(", "def selfcheck(", "def _selfcheck(",
                   "def _check(", "def _smoke(", "def smoke(")
def _selfcheck_split(p: Path):
    """Split a produced .py file at the first TOP-LEVEL self-check marker (a `__main__` guard
    or a demo()/selfcheck() function) through end of file. On a surgical task that delivers
    ONE function, an in-file self-check is a runnable check, not source bloat, so it's split
    off here and counted as test LOC instead of penalising the arm that wrote it."""
    try: lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    except Exception: return 0, 0, 0, 0
    start = None
    for i, ln in enumerate(lines):
        if ln[:1] not in (" ", "\t") and (ln.startswith("if __name__")
                                          or ln.startswith(_SELFCHECK_DEFS)):
            start = i; break
    def cnt(seq):
        t = c = 0
        for ln in seq:
            s = ln.strip()
            if not s: continue
            t += 1
            if not s.startswith(("#", "//", "*", "/*", "*/")): c += 1
        return t, c
    if start is None:
        t, c = cnt(lines); return t, c, 0, 0
    t, c = cnt(lines[:start]); st, sc = cnt(lines[start:])
    return t, c, st, sc

def code_stats(workdir: Path, selfcheck_as_test: bool = False):
    """LOC over code-extension source files only. total_loc counts every non-blank line
    including comments/docstrings (the bloat a vibe baseline actually produces); src_loc is
    code-only. Tests tracked separately, never as bloat. selfcheck_as_test (surgical tasks):
    an in-file __main__/demo() self-check is reclassified from source to test."""
    fixture = set()                                   # files that were seeded, not delivered
    fm = workdir / "_fixture_files.json"
    if fm.exists():
        try: fixture = set(json.loads(fm.read_text(encoding="utf-8")))
        except Exception: pass
    def _rel(p): return str(p.relative_to(workdir)).replace("\\", "/")
    files = [p for p in workdir.rglob("*") if p.is_file() and p.suffix in CODE_EXT
             and "__pycache__" not in p.parts and "node_modules" not in p.parts
             and not p.name.startswith((".", "_")) and _rel(p) not in fixture]
    src = [p for p in files if not _is_test(p, workdir)]
    tst = [p for p in files if _is_test(p, workdir)]
    test_loc = sum(_count(p, True) for p in tst)
    if selfcheck_as_test:
        total = code = sc_test = 0
        for p in src:
            t, c, st, _ = _selfcheck_split(p)
            total += t; code += c; sc_test += st
        return {"files": len(files), "src_files": len(src),
                "total_loc": total, "src_loc": code,
                "test_files": len(tst), "test_loc": test_loc + sc_test}
    return {"files": len(files), "src_files": len(src),
            "total_loc": sum(_count(p, True) for p in src),   # incl comments (the bloat)
            "src_loc": sum(_count(p, False) for p in src),    # code only
            "test_files": len(tst), "test_loc": test_loc}

def _git(workdir, *args):
    return subprocess.run([shutil.which("git") or "git", *args], cwd=str(workdir),
                          capture_output=True, text=True)

def _git_snapshot(workdir):
    """Commit the seeded repo so we can diff exactly what the agent changes."""
    _git(workdir, "init", "-q")
    _git(workdir, "add", "-A")
    _git(workdir, "-c", "user.email=bench@local", "-c", "user.name=bench",
         "commit", "-q", "-m", "base", "--no-verify")

_SKIP_DIFF = ("-lock", ".lock", ".gen.ts", "lock.json", "routeTree.gen")
def git_diff_stats(workdir):
    """Added lines (incl comments) of code files the agent created OR modified vs the seeded
    base — the delivered-code metric, matching the '+N' a PR/diff shows. Tests counted
    separately; lockfiles/generated files skipped."""
    _git(workdir, "add", "-A")
    out = _git(workdir, "diff", "--cached", "--numstat", "HEAD").stdout
    loc = files = test_loc = test_files = 0
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) != 3: continue
        added, _deleted, path = parts
        if added == "-": continue                              # binary
        if Path(path).suffix not in CODE_EXT: continue
        if any(k in path for k in _SKIP_DIFF) or "node_modules" in path: continue
        n = int(added)
        if _is_test(Path(workdir) / path, Path(workdir)): test_loc += n; test_files += 1
        else: loc += n; files += 1
    return {"files": files, "src_files": files, "total_loc": loc, "src_loc": loc,
            "test_files": test_files, "test_loc": test_loc}

def chat_code_loc(text):
    """LOC of fenced code blocks in a chat answer: (total incl comments, code-only)."""
    total = code = 0
    for b in re.findall(r"```[a-zA-Z0-9_+-]*\r?\n(.*?)```", text or "", re.S):
        for ln in b.splitlines():
            s = ln.strip()
            if not s: continue
            total += 1
            if not s.startswith(("#", "//", "*", "/*", "*/")): code += 1
    return total, code

def _claude_version():
    try:
        return subprocess.run([shutil.which("claude") or "claude", "--version"],
                              capture_output=True, text=True).stdout.strip()
    except Exception:
        return "unknown"

# --- cell execution + scoring --------------------------------------------------------------

def write_shims(ws: Path):
    """Package managers become no-ops that log the call: installs are observed, never executed.
    razor's PreToolUse deny fires BEFORE the shim, so a razor-arm agent that backs off after
    the deny leaves the log empty; an agent that retries hits the shim and is logged."""
    d = ws / "_shims"
    d.mkdir(exist_ok=True)
    for name in SHIM_MANAGERS:
        sh = d / name
        sh.write_text("#!/bin/sh\n"
                      f'echo "{name} $*" >> "$(dirname "$0")/../_pkgmgr.log"\n'
                      'echo "(shim) ok"\nexit 0\n', encoding="utf-8", newline="\n")
        os.chmod(sh, 0o755)
        (d / f"{name}.cmd").write_text("@echo off\r\n"
                                       f'echo {name} %* >> "%~dp0..\\_pkgmgr.log"\r\n'
                                       "echo (shim) ok\r\n", encoding="utf-8")
    return d

def cell_env(shim_dir):
    env = os.environ.copy()
    for k in list(env):                      # don't leak this session's plugin config into cells
        if k.startswith(("RAZOR_", "HUSH_")):
            del env[k]
    env.pop("CLAUDECODE", None)
    env.pop("CLAUDE_CODE_ENTRYPOINT", None)
    if shim_dir:
        env["PATH"] = str(shim_dir) + os.pathsep + env.get("PATH", "")
    return env

def extract_result(ws: Path):
    """stream-json -> final result event written as _claude.json, plus the raw stream text
    for marker counting."""
    stream = ws / "_claude.stream.jsonl"
    raw = stream.read_text(encoding="utf-8", errors="ignore") if stream.exists() else ""
    result = None
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            ev = json.loads(line)
        except Exception:
            continue
        if ev.get("type") == "result":
            result = ev
    if result is not None:
        (ws / "_claude.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return raw

def score_cell(task_id, arm, model, ws: Path):
    task = TASKS[task_id]
    raw = extract_result(ws)
    meta = {}
    cj = ws / "_claude.json"
    if cj.exists():
        try:
            j = json.loads(cj.read_text(encoding="utf-8"))
            u = j.get("usage") or {}
            meta = {"cost": j.get("total_cost_usd"), "duration_ms": j.get("duration_ms"),
                    "turns": j.get("num_turns"),
                    "denials": len(j.get("permission_denials") or []),
                    "out_tokens": u.get("output_tokens"), "in_tokens": u.get("input_tokens"),
                    "cache_tokens": (u.get("cache_read_input_tokens") or 0)
                                    + (u.get("cache_creation_input_tokens") or 0)}
            result_text = j.get("result") or ""
            if j.get("is_error") or j.get("api_error_status"):
                return {"task": task_id, "arm": arm, "model": model,
                        "error": f"api_error {j.get('api_error_status')}: {result_text[:120]}"}
        except Exception:
            result_text = ""
    else:
        result_text = ""
    for key, marker in MARKERS.items():
        meta[key] = raw.count(marker)
    meta["install_attempts"] = len(pkg_add_attempts(ws))

    surgical = not task.get("open") and not task.get("fixture") and not task.get("meta")
    if task.get("meta"):     # overhead tier: seeded files aren't delivered code
        stats = {"files": 0, "src_files": 0, "total_loc": 0, "src_loc": 0,
                 "test_files": 0, "test_loc": 0, "new_files": 0}
    elif task.get("fixture") or task.get("git"):
        stats = git_diff_stats(ws)
        stats["new_files"] = git_new_files(ws)
    else:
        stats = code_stats(ws, selfcheck_as_test=surgical)
        stats["new_files"] = stats.get("src_files", 0)
    if task.get("open") and stats["total_loc"] == 0 and result_text:
        t, c = chat_code_loc(result_text)
        stats = {**stats, "total_loc": t, "src_loc": c, "src_files": 1 if t else 0}
    if task.get("fixture"):
        sc = {"correct": 1 if stats.get("total_loc", 0) > 0 else 0, "safe": 1, "reason": "git-diff"}
    elif task.get("open"):
        sc = task["score"](ws)
    else:
        sc = task["score"](ws)
    return {"task": task_id, "arm": arm, "model": model, **sc, **stats, **meta}

def git_new_files(ws: Path):
    _git(ws, "add", "-A")
    out = _git(ws, "diff", "--cached", "--name-status", "HEAD").stdout
    n = 0
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) < 2 or parts[0] != "A":
            continue
        p = Path(parts[-1])
        if p.suffix in CODE_EXT and not p.name.startswith(("_", ".")):
            n += 1
    return n

def run_cell(task_id, arm, model, ws: Path):
    task = TASKS[task_id]
    for fn, content in task.get("seed", {}).items():
        (ws / fn).write_text(content, encoding="utf-8")
    shim_dir = write_shims(ws) if task.get("shims") else None
    if task.get("git") or task.get("fixture"):
        _git_snapshot(ws)

    claude = shutil.which("claude")
    if not claude:
        sys.exit("claude CLI not found on PATH")
    cmd = [claude, "-p", task["prompt"], "--model", MODELS.get(model, model),
           "--permission-mode", "bypassPermissions",
           "--output-format", "stream-json", "--verbose",
           "--setting-sources", "project,local", "--strict-mcp-config"]
    if not task.get("bash"):
        cmd += ["--disallowedTools", ",".join(["Bash", "PowerShell", *GUARD_TOOLS])]
    else:                                    # Bash-allowed tiers still can't touch git or subagents
        cmd += ["--disallowedTools", ",".join(["Bash(git*)", "PowerShell(git*)", *GUARD_TOOLS])]
    if arm != "baseline":
        cmd += ["--plugin-dir", ARM_DIRS[arm]]
    # NO_RUN (identical for every arm) only on the Bash-disallowed code tiers. Bash-allowed
    # tiers get no extra instruction: running/testing/installing IS the measurement.
    if not task.get("meta") and not task.get("bash"):
        cmd += ["--append-system-prompt", NO_RUN]

    out_path, err_path = ws / "_claude.stream.jsonl", ws / "_claude.stderr.txt"
    try:
        with open(out_path, "wb") as so, open(err_path, "wb") as se:
            proc = subprocess.Popen(cmd, cwd=str(ws), stdout=so, stderr=se,
                                    env=cell_env(shim_dir))
            try:
                proc.wait(timeout=CELL_TIMEOUT)
            except subprocess.TimeoutExpired:
                _kill_tree(proc)
                se.write(f"\n[KILLED after {CELL_TIMEOUT}s timeout]".encode())
    except Exception as e:
        out_path.write_text(json.dumps({"error": str(e)[:300]}), encoding="utf-8")
    return score_cell(task_id, arm, model, ws)

def _kill_tree(proc):
    """Force-kill a hung cell's whole process tree so the pool can't freeze. Windows uses
    taskkill /T; elsewhere fall back to killing the process group / the process itself."""
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            proc.kill()
    except Exception:
        pass
    try:
        proc.wait(timeout=15)
    except Exception:
        pass

def selftest():
    """good ref must pass, bad ref must be caught, for every closed task — before any spend."""
    failures = 0
    for tid, task in TASKS.items():
        if task.get("open") or task.get("fixture"):
            continue
        axis = task.get("axis", "safe")
        for kind in ("good", "bad"):
            with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as d:
                for fn, content in task.get("seed", {}).items():
                    (Path(d) / fn).write_text(content, encoding="utf-8")
                (Path(d) / task["file"]).write_text(task[kind], encoding="utf-8")
                r = task["score"](Path(d))
            ok = (r["correct"] == 1 and r["safe"] == 1) if kind == "good" else (r[axis] == 0)
            print(f"{'ok ' if ok else 'XX '} {tid:14} {kind:4} correct={r['correct']} "
                  f"safe={r['safe']} axis={axis}  {r['reason'][:70]}")
            failures += 0 if ok else 1
    for arm, d in ARM_DIRS.items():
        ok = (Path(d) / ".claude-plugin" / "plugin.json").exists()
        print(f"{'ok ' if ok else 'XX '} plugin-dir     {arm}: {d}")
        failures += 0 if ok else 1
    print(f"\nselftest: {'all instruments valid' if not failures else str(failures) + ' BROKEN'}")
    return failures

def aggregate(results):
    groups = defaultdict(list)
    for r in results:
        if "error" in r and "correct" not in r:
            continue
        groups[(r["task"], r["arm"], r["model"])].append(r)
    rows = []
    def med(cells, key):
        vals = [c[key] for c in cells if c.get(key) is not None]
        return round(statistics.median(vals), 2) if vals else None
    def mean(cells, key, digits=4):
        vals = [c[key] for c in cells if c.get(key) is not None]
        return round(statistics.mean(vals), digits) if vals else None
    for (t, a, m), cells in sorted(groups.items()):
        n = len(cells)
        loc_cells = [c for c in cells if c.get("total_loc", 0) > 0]
        rows.append({
            "task": t, "arm": a, "model": m, "n": n,
            "correct_rate": round(sum(c.get("correct", 0) for c in cells) / n, 3),
            "safe_rate": round(sum(c.get("safe", 0) for c in cells) / n, 3),
            "total_loc_median": med(loc_cells, "total_loc") or 0,
            "src_loc_median": med(loc_cells, "src_loc") or 0,
            "src_files_median": med(loc_cells, "src_files") or 0,
            "new_files_median": med(cells, "new_files"),
            "cost_mean": mean(cells, "cost"),
            "out_tokens_mean": mean(cells, "out_tokens", 0),
            "total_tokens_mean": (round(statistics.mean(
                [(c.get("in_tokens") or 0) + (c.get("out_tokens") or 0) + (c.get("cache_tokens") or 0)
                 for c in cells if c.get("out_tokens") is not None]))
                if any(c.get("out_tokens") is not None for c in cells) else None),
            "time_s_mean": (round(statistics.mean(
                [c["duration_ms"] / 1000 for c in cells if c.get("duration_ms") is not None]), 1)
                if any(c.get("duration_ms") is not None for c in cells) else None),
            "turns_mean": mean(cells, "turns", 1),
            "install_attempts_mean": mean(cells, "install_attempts", 2),
            "razor_dep_denies_mean": mean(cells, "razor_dep_denies", 2),
            "razor_file_denies_mean": mean(cells, "razor_file_denies", 2),
            "razor_ledger_mean": mean(cells, "razor_ledger", 2),
        })
    return rows

def print_table(rows):
    by = defaultdict(list)
    for r in rows:
        by[(r["task"], r["model"])].append(r)
    for (task, model), rs in sorted(by.items()):
        print(f"\n=== {task}  ({model}, n={rs[0]['n']}) ===")
        print(f"  {'arm':10} {'correct':>8} {'safe':>6} {'LOC':>6} {'files':>6} "
              f"{'tot_tok':>9} {'$/run':>9} {'time_s':>7} {'installs':>9}")
        for r in sorted(rs, key=lambda x: x["arm"]):
            c = ("$" + format(r["cost_mean"], ".4f")) if r["cost_mean"] is not None else "-"
            print(f"  {r['arm']:10} {r['correct_rate']:>8} {r['safe_rate']:>6} "
                  f"{r['total_loc_median']:>6} {r['src_files_median']:>6} "
                  f"{(r['total_tokens_mean'] if r['total_tokens_mean'] is not None else '-'):>9} "
                  f"{c:>9} {(r['time_s_mean'] if r['time_s_mean'] is not None else '-'):>7} "
                  f"{(r['install_attempts_mean'] if r['install_attempts_mean'] is not None else '-'):>9}")

def rescore(run_dir):
    run_dir = Path(run_dir)
    if not run_dir.exists():
        run_dir = RUNS_DIR / run_dir.name
    results = []
    for ws in sorted(p for p in run_dir.iterdir() if p.is_dir()):
        parts = ws.name.split("__")
        if len(parts) != 4 or parts[0] not in TASKS:
            continue
        tid, arm, model, _r = parts
        results.append(score_cell(tid, arm, model, ws))
    rows = aggregate(results)
    (run_dir / "results.json").write_text(
        json.dumps({"rescored": True, "results": results}, indent=2), encoding="utf-8")
    (run_dir / "summary.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print_table(rows)
    print(f"\nrescored {len(results)} cells from {run_dir}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--smoke", action="store_true", help="oh-question x each arm x 1, cheap sanity")
    ap.add_argument("--rescore")
    ap.add_argument("--task", help="comma list of task ids")
    ap.add_argument("--default", action="store_true",
                    help=f"default sweep: {len(DEFAULT_TASKS)} tasks")
    ap.add_argument("--full", action="store_true", help=f"every task: {len(FULL_TASKS)} tasks")
    ap.add_argument("--rival-dir", dest="rival_dir",
                    help="path to any other plugin to load as a third 'rival' arm")
    ap.add_argument("--arms", help="comma list; default baseline,razor(,rival)")
    ap.add_argument("--models", default="haiku")
    ap.add_argument("--runs", type=int, default=2)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    if args.rival_dir:                             # bring-your-own comparison arm
        ARM_DIRS["rival"] = str(Path(args.rival_dir).resolve())

    if args.selftest:
        sys.exit(1 if selftest() else 0)
    if args.rescore:
        return rescore(args.rescore)
    if selftest():
        sys.exit("instruments broken; refusing to spend on the API")

    if args.smoke:
        task_ids, args.runs = ["oh-question"], 1
    elif args.default:
        task_ids = DEFAULT_TASKS
    elif args.full:
        task_ids = FULL_TASKS
    elif args.task:
        task_ids = [t.strip() for t in args.task.split(",")]
    else:
        sys.exit("give --default, --full, --task, --smoke, or --rescore")
    unknown = [t for t in task_ids if t not in TASKS]
    if unknown:
        sys.exit(f"unknown tasks: {unknown}")

    default_arms = ["baseline", "razor"] + (["rival"] if args.rival_dir else [])
    arms = [a.strip() for a in args.arms.split(",")] if args.arms else default_arms
    bad_arms = [a for a in arms if a != "baseline" and a not in ARM_DIRS]
    if bad_arms:
        sys.exit(f"unknown arms {bad_arms} (rival needs --rival-dir)")
    models = [m.strip() for m in args.models.split(",")]
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = RUNS_DIR / stamp
    out_dir.mkdir(parents=True, exist_ok=True)

    cells = [(tid, arm, model, r)
             for tid in task_ids for model in models for arm in arms for r in range(args.runs)]
    total, results, done = len(cells), [], 0

    def _one(spec):
        tid, arm, model, r = spec
        ws = out_dir / f"{tid}__{arm}__{model}__{r}"
        ws.mkdir(parents=True, exist_ok=True)
        return run_cell(tid, arm, model, ws)

    print(f"running {total} cells, {args.workers} at a time -> {out_dir}", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(_one, s): s for s in cells}
        for fut in concurrent.futures.as_completed(futs):
            tid, arm, model, r = futs[fut]
            try:
                res = fut.result()
            except Exception as e:
                res = {"task": tid, "arm": arm, "model": model, "error": str(e)[:200]}
            results.append(res)
            done += 1
            print(f"  [{done}/{total}] {tid} / {arm} #{r}  LOC={res.get('total_loc')} "
                  f"correct={res.get('correct')} safe={res.get('safe')} "
                  f"cost=${res.get('cost')} installs={res.get('install_attempts')}", flush=True)
            (out_dir / "results.json").write_text(json.dumps(
                {"date": stamp, "models": {m: MODELS.get(m, m) for m in models},
                 "claude": _claude_version(),
                 "arms": {a: ARM_DIRS.get(a, "none") for a in arms},
                 "results": results}, indent=2), encoding="utf-8")

    rows = aggregate(results)
    (out_dir / "summary.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print_table(rows)
    print(f"\nwrote {out_dir}\\results.json + summary.json ({len(results)} cells)")

if __name__ == "__main__":
    main()
