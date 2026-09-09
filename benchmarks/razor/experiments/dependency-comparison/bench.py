#!/usr/bin/env python3
"""razor vs ponytail: agentic head-to-head benchmark.

Every cell is a real headless Claude Code session in an isolated workspace, one plugin loaded
via --plugin-dir (never both), the user's global plugins excluded via --setting-sources
project,local. Scored on the files the session leaves behind + the CLI's own usage JSON.

Reuses ponytail's benchmark instruments (its benchmarks/agentic/ tasks.py + run.py scorers are
imported directly — same safety tier, same LOC counting, same selftest protocol) and adds the
tiers a razor comparison needs: dependency traps and sprawl traps with Bash ALLOWED (razor's
mechanical gates live on Bash/Write), and pure injection-overhead tasks. See README.md.

  python bench.py --selftest          # prove every instrument, no API spend. Run first.
  python bench.py --smoke             # 1 cheap task x 3 arms, verifies plugin activation
  python bench.py --default --runs 3  # the full default sweep (16 tasks x 3 arms x n)
  python bench.py --task dep-slug,oh-question --arms baseline,razor --runs 2
  python bench.py --rescore runs/<stamp>   # recompute metrics offline, no API
  python report.py runs/<stamp>            # tables + SVG charts -> runs/<stamp>/report.md
"""
import argparse, concurrent.futures, datetime, json, os, shutil, statistics, subprocess, sys, tempfile
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
PONYTAIL_REPO = Path(os.environ.get("PONYTAIL_REPO", r"D:\Projects\Knowledge\ponytail"))
RAZOR_DIR = Path(os.environ.get("RAZOR_DIR", str(HERE.parents[3] / "razor")))
AGENTIC = PONYTAIL_REPO / "benchmarks" / "agentic"
if not AGENTIC.exists():
    sys.exit(f"ponytail checkout not found at {PONYTAIL_REPO}; set PONYTAIL_REPO")
sys.path.insert(0, str(AGENTIC))
sys.path.insert(0, str(HERE))
import run as pt                      # upstream harness: code_stats/git_diff_stats/chat_code_loc reused
from tasks import TASKS as PT_TASKS   # upstream tasks: safety + vibe (+ fixture if cloned)
from razor_tasks import RAZOR_TASKS, pkg_add_attempts

TASKS = {**PT_TASKS, **RAZOR_TASKS}

ARMS = ("baseline", "ponytail", "razor")
# razor2: the wave-2 deny-wording candidate (razor branch wave2-deny-wording,
# exported to arms/razor-wave2). Not in ARMS so default sweeps skip it; select
# explicitly with --arms razor,razor2.
RAZOR2_DIR = Path(os.environ.get("RAZOR2_DIR", str(HERE / "arms" / "razor-wave2")))
ARM_DIRS = {"ponytail": str(PONYTAIL_REPO), "razor": str(RAZOR_DIR), "razor2": str(RAZOR2_DIR),
            # 2026-07-18 /goal close-the-rows variants (arms/ copies of razor 0.4.4 + one Rules edit each):
            # razorv1 = "+ a value used once is written inline, not named"; razorv2 = "- boring over clever"
            "razorv1": str(HERE / "arms" / "razor-v1"), "razorv2": str(HERE / "arms" / "razor-v2"),
            # razorv3 = live razor tree + BOTH winning edits (v1 clause + v2 deletion) — the combo confirm
            "razorv3": str(HERE / "arms" / "razor-v3"),
            # razorv4 = live tree minus "fewest files; " (hunt 2: the clause suppresses file delivery on open-ended asks)
            "razorv4": str(HERE / "arms" / "razor-v4")}
MODELS = {"haiku": "claude-haiku-4-5-20251001", "sonnet": "claude-sonnet-5",
          "opus": "claude-opus-4-8"}

# Stack arms: TWO plugins per cell — the shipped pairing vs the rivals' pairing.
# hush needs its output style pinned via --settings (force-for-plugin doesn't
# apply under --setting-sources in -p mode); caveman needs its mode pinned via env.
HUSH_DIR = Path(os.environ.get("HUSH_DIR", str(HERE.parents[3] / "hush")))
CAVEMAN_REPO = Path(os.environ.get("CAVEMAN_REPO", r"D:\Projects\Knowledge\caveman"))
HUSH_SETTINGS = HERE.parent / "settings-hush.json"
STACK_ARMS = {
    "hushrazor": {"dirs": [str(RAZOR_DIR), str(HUSH_DIR)],
                  "settings": str(HUSH_SETTINGS), "env": {}},
    "caveponytail": {"dirs": [str(CAVEMAN_REPO), str(PONYTAIL_REPO)],
                     "env": {"CAVEMAN_DEFAULT_MODE": "full"}},
}

# karpathy: the prompt-only-rival arm (roadmap 069 / research T5) — not a plugin, a single
# CLAUDE.md fetched at run time and dropped into the workspace as project memory (no
# --plugin-dir). Never committed anywhere: fetched fresh (or read from this gitignored cache)
# so its text never lands in a tracked file — no-competitor-naming covers benchmark fixtures.
# Not in ARMS so default/--default sweeps skip it; select explicitly, e.g.
# --arms baseline,razor,karpathy.
RIVAL_CLAUDE_MD_URL = os.environ.get(
    "RIVAL_CLAUDE_MD_URL",
    "https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md")
RIVAL_CACHE = HERE / "_cache" / "rival_claude_md.txt"
CLAUDE_MD_ARMS = {"karpathy"}

def fetch_rival_claude_md(force=False):
    """Fetch the karpathy arm's CLAUDE.md, caching under the gitignored _cache/ dir so repeat
    cells (and --selftest) don't refetch. force=True bypasses the cache (used to prove the
    fetch path itself still works, not just the cache)."""
    if RIVAL_CACHE.exists() and not force:
        return RIVAL_CACHE.read_text(encoding="utf-8")
    import urllib.request
    req = urllib.request.Request(RIVAL_CLAUDE_MD_URL, headers={"User-Agent": "razor-bench/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        text = resp.read().decode("utf-8")
    if not text.strip():
        raise RuntimeError("fetched rival CLAUDE.md is empty")
    RIVAL_CACHE.parent.mkdir(parents=True, exist_ok=True)
    RIVAL_CACHE.write_text(text, encoding="utf-8")
    return text

PT_SAFETY = ["safe-path", "critic-email", "rate-limit", "sql-user", "auth-token", "csv-sum", "cache"]
PT_VIBE = ["vibe-todo", "vibe-restapi", "vibe-jsonconf"]
D_TIER = ["dep-slug", "dep-toml", "dep-uuid"]
S_TIER = ["sprawl-todo"]
O_TIER = ["oh-question", "oh-typo"]
DEFAULT_TASKS = PT_SAFETY + PT_VIBE + D_TIER + S_TIER + O_TIER

RUNS_DIR = HERE / "runs"
CELL_TIMEOUT = 300

# Deny/inject markers, counted in the raw stream to show gate behavior per cell.
MARKERS = {
    "razor_dep_denies": "adds a new ",           # dep-guard deny reason
    "razor_file_denies": "razor: new file #",    # file-meter deny reason
    "razor_ledger": "razor ledger:",             # build-ledger question
    "razor_search_denies": "another search after",  # search-meter deny reason (both wordings)
}

SHIM_MANAGERS = ("npm", "pnpm", "yarn", "pip", "pip3", "poetry", "uv")

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

def cell_env(shim_dir, arm=None):
    env = os.environ.copy()
    for k in list(env):                      # don't leak this session's plugin config into cells
        if k.startswith(("RAZOR_", "PONYTAIL_", "HUSH_", "CAVEMAN_")):
            del env[k]
    env.pop("CLAUDECODE", None)
    env.pop("CLAUDE_CODE_ENTRYPOINT", None)
    if arm in STACK_ARMS:
        env.update(STACK_ARMS[arm].get("env", {}))
    if shim_dir:
        env["PATH"] = str(shim_dir) + os.pathsep + env.get("PATH", "")
    return env

def extract_result(ws: Path):
    """stream-json -> final result event written as _claude.json (upstream-compatible),
    plus the raw stream text for marker counting."""
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
        stats = pt.git_diff_stats(ws)
        stats["new_files"] = git_new_files(ws)
    else:
        stats = pt.code_stats(ws, selfcheck_as_test=surgical)
        stats["new_files"] = stats.get("src_files", 0)
    if task.get("open") and stats["total_loc"] == 0 and result_text:
        t, c = pt.chat_code_loc(result_text)
        stats = {**stats, "total_loc": t, "src_loc": c, "src_files": 1 if t else 0}
    if task.get("fixture"):
        sc = {"correct": 1 if stats.get("total_loc", 0) > 0 else 0, "safe": 1, "reason": "git-diff"}
    elif task.get("open"):
        sc = task["score"](ws)
    else:
        sc = task["score"](ws)
    return {"task": task_id, "arm": arm, "model": model, **sc, **stats, **meta}

def git_new_files(ws: Path):
    pt._git(ws, "add", "-A")
    out = pt._git(ws, "diff", "--cached", "--name-status", "HEAD").stdout
    n = 0
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) < 2 or parts[0] != "A":
            continue
        p = Path(parts[-1])
        if p.suffix in pt.CODE_EXT and not p.name.startswith(("_", ".")):
            n += 1
    return n

def run_cell(task_id, arm, model, ws: Path):
    task = TASKS[task_id]
    if task.get("fixture"):                    # real-repo tier (needs the template clone)
        fx = Path(task["fixture"])
        shutil.copytree(fx, ws, dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns("node_modules", ".git", "build", "dist",
                                                      "__pycache__", ".venv", "*.log"))
        manifest = sorted(str(p.relative_to(ws)).replace("\\", "/")
                          for p in ws.rglob("*") if p.is_file())
        (ws / "_fixture_files.json").write_text(json.dumps(manifest), encoding="utf-8")
    for fn, content in task.get("seed", {}).items():
        (ws / fn).write_text(content, encoding="utf-8")
    if arm in CLAUDE_MD_ARMS:
        # the rival delivers its ruleset as project memory, not a plugin: drop the fetched
        # CLAUDE.md into the workspace and let --setting-sources project,local pick it up.
        (ws / "CLAUDE.md").write_text(fetch_rival_claude_md(), encoding="utf-8")
    shim_dir = write_shims(ws) if task.get("shims") else None
    if task.get("git") or task.get("fixture"):
        pt._git_snapshot(ws)

    claude = shutil.which("claude")
    if not claude:
        sys.exit("claude CLI not found on PATH")
    cmd = [claude, "-p", task["prompt"], "--model", MODELS.get(model, model),
           "--permission-mode", "bypassPermissions",
           "--output-format", "stream-json", "--verbose",
           "--setting-sources", "project,local", "--strict-mcp-config"]
    if not task.get("bash"):
        cmd += ["--disallowedTools", "Bash"]
    if arm in STACK_ARMS:
        for d in STACK_ARMS[arm]["dirs"]:
            cmd += ["--plugin-dir", d]
        if STACK_ARMS[arm].get("settings"):
            cmd += ["--settings", STACK_ARMS[arm]["settings"]]
    elif arm != "baseline" and arm not in CLAUDE_MD_ARMS:
        cmd += ["--plugin-dir", ARM_DIRS[arm]]
    # NO_RUN (identical for every arm) only on the Bash-disallowed code tiers, as upstream.
    # Bash-allowed tiers get no extra instruction: running/testing/installing IS the measurement.
    if not task.get("meta") and not task.get("bash"):
        cmd += ["--append-system-prompt", pt.NO_RUN]

    out_path, err_path = ws / "_claude.stream.jsonl", ws / "_claude.stderr.txt"
    try:
        with open(out_path, "wb") as so, open(err_path, "wb") as se:
            proc = subprocess.Popen(cmd, cwd=str(ws), stdout=so, stderr=se,
                                    env=cell_env(shim_dir, arm))
            try:
                proc.wait(timeout=CELL_TIMEOUT)
            except subprocess.TimeoutExpired:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                try:
                    proc.wait(timeout=15)
                except Exception:
                    pass
                se.write(f"\n[KILLED after {CELL_TIMEOUT}s timeout]".encode())
    except Exception as e:
        out_path.write_text(json.dumps({"error": str(e)[:300]}), encoding="utf-8")
    return score_cell(task_id, arm, model, ws)

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
    for arm, spec in STACK_ARMS.items():
        for d in spec["dirs"]:
            ok = (Path(d) / ".claude-plugin" / "plugin.json").exists()
            print(f"{'ok ' if ok else 'XX '} plugin-dir     {arm}: {d}")
            failures += 0 if ok else 1
        if spec.get("settings"):
            ok = Path(spec["settings"]).exists()
            print(f"{'ok ' if ok else 'XX '} settings       {arm}: {spec['settings']}")
            failures += 0 if ok else 1
    for arm in CLAUDE_MD_ARMS:               # no plugin dir: prove the fetch/cache path instead
        try:
            content = fetch_rival_claude_md()
            ok = bool(content.strip())
        except Exception as e:
            content, ok = "", False
            print(f"XX  claude-md-arm  {arm}: fetch failed: {e}")
        if ok:
            print(f"ok  claude-md-arm  {arm}: {len(content)} chars cached at {RIVAL_CACHE}")
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
    ap.add_argument("--smoke", action="store_true", help="oh-question x all arms x 1, cheap sanity")
    ap.add_argument("--rescore")
    ap.add_argument("--task", help="comma list of task ids")
    ap.add_argument("--default", action="store_true", help=f"default sweep: {len(DEFAULT_TASKS)} tasks")
    ap.add_argument("--arms", default=",".join(ARMS))
    ap.add_argument("--models", default="haiku")
    ap.add_argument("--runs", type=int, default=1)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

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
    elif args.task:
        task_ids = [t.strip() for t in args.task.split(",")]
    else:
        sys.exit("give --task, --default, --smoke, or --rescore")
    unknown = [t for t in task_ids if t not in TASKS]
    if unknown:
        sys.exit(f"unknown tasks: {unknown}")
    arms = [a.strip() for a in args.arms.split(",")]
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
                 "claude": pt._claude_version(),
                 "arms": {a: (" + ".join(STACK_ARMS[a]["dirs"]) if a in STACK_ARMS
                              else ARM_DIRS.get(a, "none")) for a in arms},
                 "results": results}, indent=2), encoding="utf-8")

    rows = aggregate(results)
    (out_dir / "summary.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print_table(rows)
    print(f"\nwrote {out_dir}\\results.json + summary.json ({len(results)} cells)")

if __name__ == "__main__":
    main()
