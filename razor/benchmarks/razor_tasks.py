"""razor benchmark tasks — self-contained, deterministic, ground-truthed.

Each task opens a surface where razor's leanness ruleset (and its mechanical gates) can show
up in the delivered code. Every task is solvable with the standard library / platform, so the
"lean" answer is objectively small and the scorer can execute it:

  D-tier (dep-trap):   Bash allowed, package managers shimmed to no-ops that log the call.
                       Each task is solvable with the stdlib / platform, but tempts a new
                       dependency. `safe` = no new dependency (static import scan + manifest
                       diff + shim log). Ground truth is deterministic and executed.
  R-tier (reuse-trap): a small seeded multi-file "codebase" where nothing is actually
                       reusable for the task at hand (rung 2 of the ladder: "already in
                       this codebase? reuse it"). Isolates whether an agent does one quick
                       look and moves on, or exhaustively greps the whole seed before writing.
  S-tier (sprawl):     open-ended feature edit in a seeded git workspace; measures new files
                       and diff LOC, with a deterministic behavior check.
  G-tier (gate):       high install-instinct tasks (axios/tenacity/dotenv reflexes) where the
                       stdlib/platform answer is a few lines — plus "-lib" variants where the
                       prompt itself names the needless dependency ("let's just use axios").
  O-tier (overhead):   no-code tasks; measures each arm's pure injection tax (tokens/cost/time).

Task contract: prompt / file / seed / axis / score / good / bad, so a single selftest protocol
proves every instrument (good ref passes, bad ref is caught) before any API spend. Extra flags:
bash=True (allow Bash), shims=True (shim package managers), git=True (snapshot workspace),
meta=True (no code expected; skip the NO_RUN system-prompt append).
"""
import ast, json, re, subprocess, sys
from pathlib import Path

def _fail(reason): return {"correct": 0, "safe": 0, "reason": reason}
def _ok(correct, safe, reason="ok"):
    return {"correct": int(bool(correct)), "safe": int(bool(safe)), "reason": reason}

_imp_n = 0
def _import(pyfile: Path):
    global _imp_n
    if not Path(pyfile).exists(): return None
    _imp_n += 1
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(f"rz_produced_{_imp_n}", str(pyfile))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    except Exception:
        return None

def _find(mod, names):
    for nm in names:
        f = getattr(mod, nm, None)
        if callable(f): return f
    return None

# --- new-dependency detection (the D-tier ground truth) ------------------------------------

NODE_BUILTINS = {
    "assert", "buffer", "child_process", "cluster", "console", "constants", "crypto", "dgram",
    "dns", "domain", "events", "fs", "http", "http2", "https", "module", "net", "os", "path",
    "perf_hooks", "process", "punycode", "querystring", "readline", "repl", "stream",
    "string_decoder", "timers", "tls", "tty", "url", "util", "v8", "vm", "worker_threads", "zlib",
}

def _is_testfile(p: Path):
    n = p.name.lower()
    return (n.startswith("test_") or n.endswith(("_test.py", ".test.js", ".spec.js"))
            or n == "conftest.py" or any(d.lower() in ("test", "tests") for d in p.parts[:-1]))

def py_new_deps(workdir: Path, allowed=frozenset()):
    """Top-level imports in produced .py files that are neither stdlib, local, nor seeded deps.
    Test files are exempt: a pytest import in a test is convention, not a shipped dependency."""
    hits = set()
    for p in workdir.rglob("*.py"):
        if "_shims" in p.parts or p.name.startswith("_") or _is_testfile(p.relative_to(workdir)): continue
        try: tree = ast.parse(p.read_text(encoding="utf-8", errors="ignore"))
        except Exception: continue
        for node in ast.walk(tree):
            mods = []
            if isinstance(node, ast.Import): mods = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                mods = [node.module]
            for m in mods:
                root = m.split(".")[0]
                if root.lower() in sys.stdlib_module_names: continue
                if (workdir / f"{root}.py").exists() or (workdir / root).is_dir(): continue
                if root.lower().replace("-", "_") in allowed: continue
                hits.add(root)
    return sorted(hits)

def js_new_deps(workdir: Path, allowed=frozenset()):
    hits = set()
    pat = re.compile(r"""(?:require\(\s*|from\s+|import\s+)['"]([^'"]+)['"]""")
    for p in workdir.rglob("*.js"):
        if ("_shims" in p.parts or "node_modules" in p.parts or p.name.startswith("_")
                or _is_testfile(p.relative_to(workdir))): continue
        for m in pat.findall(p.read_text(encoding="utf-8", errors="ignore")):
            if m.startswith((".", "/")): continue
            root = (m[5:] if m.startswith("node:") else m).split("/")[0]
            if root in NODE_BUILTINS or root in allowed: continue
            hits.add(root)
    return sorted(hits)

_ADD_PAT = re.compile(
    r"^(?:npm|pnpm)\s+(?:install|i|add)\s+(?!-)|^yarn\s+add\s+|^pip3?\s+install\s+(?!-r)(?!-)"
    r"|^poetry\s+add\s+|^uv\s+(?:add|pip\s+install)\s+")
def pkg_add_attempts(workdir: Path):
    """Package-add commands that reached the shims (razor's deny happens before the shim,
    so a razor-arm agent that backs off after the deny leaves this log empty)."""
    log = workdir / "_pkgmgr.log"
    if not log.exists(): return []
    return [l.strip() for l in log.read_text(encoding="utf-8", errors="ignore").splitlines()
            if _ADD_PAT.search(l.strip())]

# --- D-tier seeds ---------------------------------------------------------------------------

REQS_SEED = "flask==3.0.3\nrequests==2.32.3\nrich==13.7.1\n"
PY_ALLOWED = frozenset({"flask", "requests", "rich"})

PKG_JSON_SEED = json.dumps({
    "name": "bench-app", "version": "1.0.0", "private": True,
    "dependencies": {"express": "^4.19.2", "lodash": "^4.17.21"},
}, indent=2) + "\n"
JS_ALLOWED = frozenset({"express", "lodash"})

def _manifest_safe_py(workdir: Path):
    req = workdir / "requirements.txt"
    if req.exists() and req.read_text(encoding="utf-8") != REQS_SEED:
        return False, "requirements.txt changed"
    for extra in ("pyproject.toml", "Pipfile", "setup.py"):
        if (workdir / extra).exists(): return False, f"{extra} created"
    return True, ""

def _manifest_safe_js(workdir: Path):
    pj = workdir / "package.json"
    if not pj.exists(): return True, ""
    try: deps = set((json.loads(pj.read_text(encoding="utf-8")).get("dependencies") or {}))
    except Exception: return False, "package.json unparseable"
    extra = deps - {"express", "lodash"}
    return (not extra), (f"package.json gained {sorted(extra)}" if extra else "")

def _dep_verdict(workdir, new_deps, manifest_ok, manifest_why):
    adds = pkg_add_attempts(workdir)
    safe = not new_deps and manifest_ok and not adds
    why = []
    if new_deps: why.append(f"imports new dep {new_deps}")
    if not manifest_ok: why.append(manifest_why)
    if adds: why.append(f"install attempted: {adds[0][:60]}")
    return safe, ("; ".join(why) or "no new deps")

# 1. dep-slug — stdlib re does it; the trap is python-slugify / slugify.
def score_dep_slug(workdir):
    new = py_new_deps(workdir, PY_ALLOWED)
    mok, mwhy = _manifest_safe_py(workdir)
    safe, why = _dep_verdict(workdir, new, mok, mwhy)
    mod = _import(workdir / "slug.py")
    if mod is None: return {"correct": 0, "safe": int(safe), "reason": "slug.py missing/import error; " + why}
    fn = getattr(mod, "slugify", None)
    if not callable(fn): return {"correct": 0, "safe": int(safe), "reason": "no slugify(); " + why}
    try:
        cases = [("Hello, World! 2x", "hello-world-2x"),
                 ("  Already--Slugged  ", "already-slugged"),
                 ("A  B", "a-b")]
        correct = all(fn(a) == b for a, b in cases)
    except Exception as e:
        return {"correct": 0, "safe": int(safe), "reason": f"raised: {e}; " + why}
    return _ok(correct, safe, why if safe else why)

SLUG_SEED = ('def slugify(title):\n'
             '    """Turn a post title into a URL slug."""\n'
             '    raise NotImplementedError\n')
SLUG_GOOD = ("import re\n"
             "def slugify(title):\n"
             "    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')\n")
SLUG_BAD = ("from slugify import slugify as _slugify\n"
            "def slugify(title):\n"
            "    return _slugify(title)\n")

# 2. dep-toml — stdlib tomllib does it; the trap is toml / tomlkit / pydantic.
CONFIG_TOML = 'host = "localhost"\nport = 8080\ndebug = true\n'
def score_dep_toml(workdir):
    new = py_new_deps(workdir, PY_ALLOWED)
    mok, mwhy = _manifest_safe_py(workdir)
    safe, why = _dep_verdict(workdir, new, mok, mwhy)
    mod = _import(workdir / "config.py")
    if mod is None: return {"correct": 0, "safe": int(safe), "reason": "config.py missing/import error; " + why}
    fn = getattr(mod, "load_config", None)
    if not callable(fn): return {"correct": 0, "safe": int(safe), "reason": "no load_config(); " + why}
    try:
        cfg = fn(str(workdir / "config.toml"))
        values_ok = (cfg.get("host") == "localhost" and cfg.get("port") == 8080
                     and cfg.get("debug") is True)
    except Exception as e:
        return {"correct": 0, "safe": int(safe), "reason": f"happy path raised: {e}; " + why}
    bad = workdir / "_missing.toml"
    bad.write_text('host = "x"\n', encoding="utf-8")
    try:
        fn(str(bad)); missing_ok = False
    except ValueError:
        missing_ok = True
    except Exception:
        missing_ok = False
    correct = values_ok and missing_ok
    reason = why if correct else \
        (("wrong values; " if not values_ok else "missing key must raise ValueError; ") + why)
    return {"correct": int(correct), "safe": int(safe), "reason": reason}

CONFIG_SEED = ('def load_config(path):\n'
               '    """Load the service config from a TOML file."""\n'
               '    raise NotImplementedError\n')
CONFIG_GOOD = (
    "import tomllib\n"
    "def load_config(path):\n"
    "    with open(path, 'rb') as f:\n"
    "        data = tomllib.load(f)\n"
    "    missing = [k for k in ('host', 'port', 'debug') if k not in data]\n"
    "    if missing:\n"
    "        raise ValueError(f'missing keys: {missing}')\n"
    "    return {'host': data['host'], 'port': data['port'], 'debug': data['debug']}\n")
CONFIG_BAD = (
    "import toml\n"
    "def load_config(path):\n"
    "    data = toml.load(path)\n"
    "    if not all(k in data for k in ('host', 'port', 'debug')):\n"
    "        raise ValueError('missing keys')\n"
    "    return data\n")

# 3. dep-uuid — platform crypto.randomUUID does it; the trap is uuid / nanoid.
_UUID_TEST_JS = (
    "const {makeId} = require('./ids.js');"
    "const s = new Set();"
    "for (let i = 0; i < 500; i++) {"
    "  const id = makeId();"
    "  if (typeof id !== 'string' || id.length < 8) { console.log('BAD'); process.exit(1); }"
    "  s.add(id);"
    "}"
    "console.log(s.size === 500 ? 'OK' : 'DUP');")
def score_dep_uuid(workdir):
    new = js_new_deps(workdir, JS_ALLOWED)
    mok, mwhy = _manifest_safe_js(workdir)
    safe, why = _dep_verdict(workdir, new, mok, mwhy)
    try:
        r = subprocess.run(["node", "-e", _UUID_TEST_JS], cwd=str(workdir),
                           capture_output=True, text=True, timeout=30)
        correct = r.returncode == 0 and "OK" in r.stdout
        detail = "" if correct else f"node: {(r.stdout + r.stderr)[:80]!r}; "
    except Exception as e:
        correct, detail = False, f"node failed: {e}; "
    return {"correct": int(correct), "safe": int(safe), "reason": detail + why}

IDS_SEED = ("function makeId() {\n"
            "  // unique identifier for new records\n"
            "  throw new Error('not implemented');\n"
            "}\n"
            "module.exports = { makeId };\n")
IDS_GOOD = ("const crypto = require('crypto');\n"
            "function makeId() {\n"
            "  return crypto.randomUUID();\n"
            "}\n"
            "module.exports = { makeId };\n")
IDS_BAD = ("const { v4 } = require('uuid');\n"
           "function makeId() {\n"
           "  return v4();\n"
           "}\n"
           "module.exports = { makeId };\n")

# --- R-tier: reuse trap (rung 2) -------------------------------------------------------------
# A small seeded "codebase" (5 unrelated files) plus a task whose correct implementation
# reuses none of them. Isolates rung-2 ("already in this codebase? reuse it") the way
# dep-toml isolated rung 5: does the agent look once and move on, or grep the whole seed
# exhaustively before writing anything?

REUSE_SEED = {
    "models.py": (
        "class User:\n"
        "    def __init__(self, name, email):\n"
        "        self.name = name\n"
        "        self.email = email\n"
    ),
    "validators.py": (
        "import re\n"
        "def validate_email(addr):\n"
        "    return re.match(r'^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', addr) is not None\n"
    ),
    "formatters.py": (
        "def format_currency(cents):\n"
        "    return f\"${cents / 100:,.2f}\"\n"
    ),
    "utils.py": (
        "def chunk_list(items, size):\n"
        "    return [items[i:i + size] for i in range(0, len(items), size)]\n"
    ),
    "helpers.py": (
        "def retry(fn, times=3):\n"
        "    for _ in range(times):\n"
        "        try:\n"
        "            return fn()\n"
        "        except Exception:\n"
        "            continue\n"
        "    raise RuntimeError('retry exhausted')\n"
    ),
}

_LEV_CASES = [("kitten", "sitting", 3), ("flaw", "lawn", 2), ("", "abc", 3),
              ("abc", "abc", 0), ("abc", "", 3), ("gumbo", "gambol", 2)]

def score_reuse_scan(workdir):
    mod = _import(workdir / "distance.py")
    if mod is None: return _fail("distance.py missing or import error")
    fn = _find(mod, ["fuzzy_match_score", "edit_distance", "levenshtein", "levenshtein_distance"])
    if fn is None: return _fail("no target function")
    try:
        correct = all(fn(a, b) == d for a, b, d in _LEV_CASES)
    except Exception as e:
        return _fail(f"raised: {e}")
    return _ok(correct, 1, "ok" if correct else "wrong distances")

REUSE_SCAN_SEED = ('def fuzzy_match_score(a, b):\n'
                    '    """Edit distance between two strings, for ranking near-matches."""\n'
                    '    raise NotImplementedError\n')
REUSE_SCAN_GOOD = (
    "def fuzzy_match_score(a, b):\n"
    "    m, n = len(a), len(b)\n"
    "    dp = list(range(n + 1))\n"
    "    for i in range(1, m + 1):\n"
    "        prev, dp[0] = dp[0], i\n"
    "        for j in range(1, n + 1):\n"
    "            cur = dp[j]\n"
    "            dp[j] = prev if a[i - 1] == b[j - 1] else 1 + min(prev, dp[j], dp[j - 1])\n"
    "            prev = cur\n"
    "    return dp[n]\n")
REUSE_SCAN_BAD = (   # Hamming-style: only counts differing chars up to the shorter length
    "def fuzzy_match_score(a, b):\n"
    "    n = min(len(a), len(b))\n"
    "    return sum(1 for i in range(n) if a[i] != b[i]) + abs(len(a) - len(b))\n")

# --- S-tier: sprawl trap ---------------------------------------------------------------------

TODO_SEED = '''import argparse, json
from pathlib import Path

DB = Path(__file__).with_name("todo.json")

def load():
    return json.loads(DB.read_text()) if DB.exists() else []

def save(tasks):
    DB.write_text(json.dumps(tasks, indent=2))

def main():
    ap = argparse.ArgumentParser(prog="todo")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p_add = sub.add_parser("add")
    p_add.add_argument("title")
    sub.add_parser("list")
    p_done = sub.add_parser("done")
    p_done.add_argument("index", type=int)
    args = ap.parse_args()
    tasks = load()
    if args.cmd == "add":
        tasks.append({"title": args.title, "done": False})
        save(tasks)
    elif args.cmd == "done":
        tasks[args.index]["done"] = True
        save(tasks)
    else:
        for i, t in enumerate(tasks):
            print(f"{i} [{'x' if t['done'] else ' '}] {t['title']}")

if __name__ == "__main__":
    main()
'''

TODO_GOOD = '''import argparse, datetime, json
from pathlib import Path

DB = Path(__file__).with_name("todo.json")

def load():
    return json.loads(DB.read_text()) if DB.exists() else []

def save(tasks):
    DB.write_text(json.dumps(tasks, indent=2))

def main():
    ap = argparse.ArgumentParser(prog="todo")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p_add = sub.add_parser("add")
    p_add.add_argument("title")
    p_add.add_argument("--due")
    sub.add_parser("list")
    sub.add_parser("overdue")
    p_done = sub.add_parser("done")
    p_done.add_argument("index", type=int)
    args = ap.parse_args()
    tasks = load()
    if args.cmd == "add":
        tasks.append({"title": args.title, "done": False, "due": args.due})
        save(tasks)
    elif args.cmd == "done":
        tasks[args.index]["done"] = True
        save(tasks)
    else:
        today = datetime.date.today().isoformat()
        for i, t in enumerate(tasks):
            if args.cmd == "overdue" and (t["done"] or not t.get("due") or t["due"] >= today):
                continue
            print(f"{i} [{'x' if t['done'] else ' '}] {t['title']}")

if __name__ == "__main__":
    main()
'''

def score_sprawl_todo(workdir):
    py = sys.executable
    def run(*args):
        return subprocess.run([py, "todo.py", *args], cwd=str(workdir),
                              capture_output=True, text=True, timeout=30)
    (workdir / "todo.json").unlink(missing_ok=True)
    try:
        adds = [run("add", "pay rent", "--due", "2020-01-01"),
                run("add", "future task", "--due", "2999-01-01"),
                run("add", "no date")]
        if any(r.returncode != 0 for r in adds):
            err = next(r for r in adds if r.returncode != 0)
            return _fail(f"add failed: {(err.stderr or err.stdout)[:120]!r}")
        ro = run("overdue")
        if ro.returncode != 0:
            return _fail(f"overdue failed: {(ro.stderr or ro.stdout)[:120]!r}")
        out = ro.stdout
        correct = "pay rent" in out and "future task" not in out and "no date" not in out
        rl = run("list")
        correct = correct and rl.returncode == 0 and "no date" in rl.stdout
    except Exception as e:
        return _fail(f"runner error: {e}")
    deps = py_new_deps(workdir, PY_ALLOWED)
    safe = not deps and not pkg_add_attempts(workdir)
    return _ok(correct, safe, "ok" if correct else f"overdue output: {out[:80]!r}")

# --- G-tier: gate traps (high install-instinct, stdlib genuinely covers) --------------------
# The D-tier proved the *choice* (models pick stdlib on slug/toml/uuid). These open the gate's
# actual firing surface: tasks where "just install it" is the reflex (axios/tenacity/dotenv)
# yet the stdlib/platform answer is a few lines. When an arm reaches for the dep, razor's
# PreToolUse deny fires; the baseline installs. Trap deps are deliberately OUTSIDE the seeded
# allow-lists, so importing one scores safe=0 (new dep) AND correct=0 (the shim never really
# installed it). Same task contract + selftest protocol as the D-tier.

# 4. dep-http — platform fetch (Node 18+) does it; the trap is axios / node-fetch.
def score_dep_http(workdir):
    new = js_new_deps(workdir, JS_ALLOWED)
    mok, mwhy = _manifest_safe_js(workdir)
    safe, why = _dep_verdict(workdir, new, mok, mwhy)
    import http.server, threading
    payload = b'{"ok": true, "n": 42}'
    class _H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        def log_message(self, *a): pass
    srv = http.server.HTTPServer(("127.0.0.1", 0), _H)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        test = ("const {fetchJson} = require('./http_client.js');"
                f"fetchJson('http://127.0.0.1:{port}/d.json')"
                ".then(r => console.log(r && r.ok === true && r.n === 42 ? 'OK' : 'BAD'))"
                ".catch(e => console.log('ERR ' + e.message));")
        r = subprocess.run(["node", "-e", test], cwd=str(workdir),
                           capture_output=True, text=True, timeout=30)
        correct = r.returncode == 0 and "OK" in r.stdout
        detail = "" if correct else f"node: {(r.stdout + r.stderr)[:80]!r}; "
    except Exception as e:
        correct, detail = False, f"node failed: {e}; "
    finally:
        srv.shutdown(); srv.server_close()
    return {"correct": int(correct), "safe": int(safe), "reason": detail + why}

HTTP_SEED = ("async function fetchJson(url) {\n"
             "  // GET the url and return the parsed JSON body\n"
             "  throw new Error('not implemented');\n"
             "}\n"
             "module.exports = { fetchJson };\n")
HTTP_GOOD = ("async function fetchJson(url) {\n"
             "  const res = await fetch(url);\n"
             "  return await res.json();\n"
             "}\n"
             "module.exports = { fetchJson };\n")
HTTP_BAD = ("const axios = require('axios');\n"
            "async function fetchJson(url) {\n"
            "  const res = await axios.get(url);\n"
            "  return res.data;\n"
            "}\n"
            "module.exports = { fetchJson };\n")

# 5. dep-retry — a loop + time.sleep does it; the trap is tenacity / backoff.
def score_dep_retry(workdir):
    new = py_new_deps(workdir, PY_ALLOWED)
    mok, mwhy = _manifest_safe_py(workdir)
    safe, why = _dep_verdict(workdir, new, mok, mwhy)
    mod = _import(workdir / "retry.py")
    if mod is None:
        return {"correct": 0, "safe": int(safe), "reason": "retry.py missing/import error; " + why}
    fn = getattr(mod, "retry_call", None)
    if not callable(fn):
        return {"correct": 0, "safe": int(safe), "reason": "no retry_call(); " + why}
    try:
        calls = {"n": 0}
        def flaky():
            calls["n"] += 1
            if calls["n"] < 3:
                raise ValueError("boom")
            return "ok"
        recovered = fn(flaky, 3, 0) == "ok" and calls["n"] == 3
        def always():
            raise RuntimeError("nope")
        raised = False
        try:
            fn(always, 2, 0)
        except Exception:
            raised = True
        correct = recovered and raised
    except Exception as e:
        return {"correct": 0, "safe": int(safe), "reason": f"raised: {e}; " + why}
    return {"correct": int(correct), "safe": int(safe),
            "reason": why if correct else "wrong retry behavior; " + why}

RETRY_SEED = ("def retry_call(fn, attempts, delay=0):\n"
              '    """Call fn(); on exception retry up to `attempts` total tries."""\n'
              "    raise NotImplementedError\n")
RETRY_GOOD = ("import time\n"
              "def retry_call(fn, attempts, delay=0):\n"
              "    last = None\n"
              "    for i in range(attempts):\n"
              "        try:\n"
              "            return fn()\n"
              "        except Exception as e:\n"
              "            last = e\n"
              "            if i < attempts - 1 and delay:\n"
              "                time.sleep(delay)\n"
              "    raise last\n")
RETRY_BAD = ("from tenacity import retry, stop_after_attempt, wait_fixed\n"
             "def retry_call(fn, attempts, delay=0):\n"
             "    @retry(stop=stop_after_attempt(attempts), wait=wait_fixed(delay), reraise=True)\n"
             "    def _w():\n"
             "        return fn()\n"
             "    return _w()\n")

# 6. dep-dotenv — a split does it; the trap is python-dotenv.
def score_dep_dotenv(workdir):
    new = py_new_deps(workdir, PY_ALLOWED)
    mok, mwhy = _manifest_safe_py(workdir)
    safe, why = _dep_verdict(workdir, new, mok, mwhy)
    mod = _import(workdir / "env.py")
    if mod is None:
        return {"correct": 0, "safe": int(safe), "reason": "env.py missing/import error; " + why}
    fn = getattr(mod, "load_env", None)
    if not callable(fn):
        return {"correct": 0, "safe": int(safe), "reason": "no load_env(); " + why}
    envfile = workdir / "_test.env"
    envfile.write_text("# a comment\nHOST=localhost\nPORT=5432\n\nNAME=myapp\n", encoding="utf-8")
    try:
        d = fn(str(envfile))
        correct = (d.get("HOST") == "localhost" and str(d.get("PORT")) == "5432"
                   and d.get("NAME") == "myapp"
                   and not any(str(k).startswith("#") for k in d) and len(d) == 3)
    except Exception as e:
        return {"correct": 0, "safe": int(safe), "reason": f"raised: {e}; " + why}
    return {"correct": int(correct), "safe": int(safe),
            "reason": why if correct else f"wrong parse: {d!r}; " + why}

DOTENV_SEED = ("def load_env(path):\n"
               '    """Parse a .env file into a dict of KEY -> VALUE."""\n'
               "    raise NotImplementedError\n")
DOTENV_GOOD = ("def load_env(path):\n"
               "    out = {}\n"
               "    with open(path, encoding='utf-8') as f:\n"
               "        for line in f:\n"
               "            line = line.strip()\n"
               "            if not line or line.startswith('#') or '=' not in line:\n"
               "                continue\n"
               "            k, v = line.split('=', 1)\n"
               "            out[k.strip()] = v.strip()\n"
               "    return out\n")
DOTENV_BAD = ("from dotenv import dotenv_values\n"
              "def load_env(path):\n"
              "    return dict(dotenv_values(path))\n")

# --- O-tier: injection overhead ---------------------------------------------------------------

def score_oh_question(workdir):
    cj = workdir / "_claude.json"
    try:
        res = json.loads(cj.read_text(encoding="utf-8")).get("result") or ""
    except Exception:
        return _fail("no _claude.json result")
    correct = "12" in re.findall(r"-?\d+", res)
    return _ok(correct, 1, f"answer={res[:40]!r}")

def score_oh_typo(workdir):
    try:
        txt = (workdir / "main.py").read_text(encoding="utf-8")
    except Exception:
        return _fail("main.py missing")
    return _ok("Hello, world" in txt, 1, "fixed" if "Hello, world" in txt else "typo remains")

MYSTERY_SEED = "def mystery(n):\n    return n * n + n\n"
TYPO_SEED = 'print("Helo, world")\n'

RAZOR_TASKS = {
    # --- D-tier: dependency traps (Bash on, package managers shimmed, git workspace) ---
    "dep-slug": {
        "prompt": "In slug.py, implement slugify(title): turn a blog post title into a URL slug"
                  " — lowercase, alphanumeric words separated by single hyphens, no"
                  " leading/trailing hyphens. Example: 'Hello, World! 2x' -> 'hello-world-2x'.",
        "file": "slug.py", "axis": "safe", "score": score_dep_slug,
        "seed": {"slug.py": SLUG_SEED, "requirements.txt": REQS_SEED},
        "good": SLUG_GOOD, "bad": SLUG_BAD,
        "bash": True, "shims": True, "git": True,
    },
    "dep-toml": {
        "prompt": "In config.py, implement load_config(path): read the TOML config file and"
                  " return a dict with host (str), port (int) and debug (bool). Raise ValueError"
                  " if any of the three keys is missing.",
        "file": "config.py", "axis": "safe", "score": score_dep_toml,
        "seed": {"config.py": CONFIG_SEED, "config.toml": CONFIG_TOML,
                 "requirements.txt": REQS_SEED},
        "good": CONFIG_GOOD, "bad": CONFIG_BAD,
        "bash": True, "shims": True, "git": True,
    },
    "dep-uuid": {
        "prompt": "In ids.js, implement makeId(): return a unique identifier string for new"
                  " records. Keep the existing module.exports shape.",
        "file": "ids.js", "axis": "safe", "score": score_dep_uuid,
        "seed": {"ids.js": IDS_SEED, "package.json": PKG_JSON_SEED},
        "good": IDS_GOOD, "bad": IDS_BAD,
        "bash": True, "shims": True, "git": True,
    },
    # --- R-tier: reuse trap (rung 2, no Bash needed) ---
    "reuse-scan": {
        "prompt": "Add a function to distance.py: fuzzy_match_score(a, b), the edit distance"
                  " between two strings, used by the search module to rank near-matches.",
        "file": "distance.py", "axis": "correct", "score": score_reuse_scan,
        "seed": {"distance.py": REUSE_SCAN_SEED, **REUSE_SEED},
        "good": REUSE_SCAN_GOOD, "bad": REUSE_SCAN_BAD,
    },
    # --- S-tier: sprawl trap (open-ended edit, git workspace) ---
    "sprawl-todo": {
        "prompt": "Add due-date support to this todo CLI: `add` takes an optional `--due"
                  " YYYY-MM-DD`, and a new `overdue` command lists open tasks whose due date is"
                  " before today, same output format as `list`.",
        "file": "todo.py", "axis": "correct", "score": score_sprawl_todo,
        "seed": {"todo.py": TODO_SEED},
        "good": TODO_GOOD, "bad": TODO_SEED,
        "bash": True, "shims": True, "git": True,
    },
    # --- G-tier: gate traps (Bash on, package managers shimmed, git workspace) ---
    "dep-http": {
        "prompt": "In http_client.js, implement and export async function fetchJson(url): perform"
                  " an HTTP GET to url and return the parsed JSON body. Keep the existing"
                  " module.exports = { fetchJson } shape.",
        "file": "http_client.js", "axis": "safe", "score": score_dep_http,
        "seed": {"http_client.js": HTTP_SEED, "package.json": PKG_JSON_SEED},
        "good": HTTP_GOOD, "bad": HTTP_BAD,
        "bash": True, "shims": True, "git": True,
    },
    "dep-retry": {
        "prompt": "In retry.py, implement retry_call(fn, attempts, delay=0): call fn(); if it"
                  " raises, wait `delay` seconds and try again, up to `attempts` total attempts;"
                  " if every attempt fails, re-raise the last exception; return fn()'s value on"
                  " success.",
        "file": "retry.py", "axis": "safe", "score": score_dep_retry,
        "seed": {"retry.py": RETRY_SEED, "requirements.txt": REQS_SEED},
        "good": RETRY_GOOD, "bad": RETRY_BAD,
        "bash": True, "shims": True, "git": True,
    },
    "dep-dotenv": {
        "prompt": "In env.py, implement load_env(path): read a .env file and return a dict of"
                  " KEY -> VALUE. Skip blank lines and lines starting with #. Strip surrounding"
                  " whitespace from keys and values. A value may itself contain '=' (split on the"
                  " first '=' only).",
        "file": "env.py", "axis": "safe", "score": score_dep_dotenv,
        "seed": {"env.py": DOTENV_SEED, "requirements.txt": REQS_SEED},
        "good": DOTENV_GOOD, "bad": DOTENV_BAD,
        "bash": True, "shims": True, "git": True,
    },
    # --- G-tier, library-named variants: the user SUGGESTS the needless dep in the prompt
    # ("let's use axios for that"). This is the gate's actual scenario — does the agent push
    # back to the stdlib/platform, or install what was suggested? Same scorer/refs as the
    # neutral G-tier (only the prompt differs), so `safe`/install_attempts/razor_dep_denies
    # measure whether razor's ruleset rescued a user-proposed over-dependency.
    "dep-http-lib": {
        "prompt": "ok so in my node app i gotta hit an api and get the json back — lets just use"
                  " axios for it lol. can you gimme an async fetchJson(url) in http_client.js that"
                  " returns the parsed json? keep the module.exports = { fetchJson } bit",
        "file": "http_client.js", "axis": "safe", "score": score_dep_http,
        "seed": {"http_client.js": HTTP_SEED, "package.json": PKG_JSON_SEED},
        "good": HTTP_GOOD, "bad": HTTP_BAD,
        "bash": True, "shims": True, "git": True,
    },
    "dep-retry-lib": {
        "prompt": "my api calls flake out randomly and its driving me nuts. can you add a"
                  " retry_call(fn, attempts, delay) in retry.py that just retries fn a few times"
                  " before giving up? like if it works return the value, if it keeps failing let"
                  " the error raise. tenacity is probably the move here",
        "file": "retry.py", "axis": "safe", "score": score_dep_retry,
        "seed": {"retry.py": RETRY_SEED, "requirements.txt": REQS_SEED},
        "good": RETRY_GOOD, "bad": RETRY_BAD,
        "bash": True, "shims": True, "git": True,
    },
    "dep-dotenv-lib": {
        "prompt": "i need to read my .env file into a dict in python — python-dotenv does this"
                  " right? can you write me a load_env(path) in env.py? its just KEY=VALUE lines,"
                  " skip the # comments and the blank lines",
        "file": "env.py", "axis": "safe", "score": score_dep_dotenv,
        "seed": {"env.py": DOTENV_SEED, "requirements.txt": REQS_SEED},
        "good": DOTENV_GOOD, "bad": DOTENV_BAD,
        "bash": True, "shims": True, "git": True,
    },
    # --- O-tier: injection overhead (no code expected) ---
    "oh-question": {
        "prompt": "Read main.py and answer: what does mystery(3) return? Reply with only the"
                  " number.",
        "file": "_claude.json", "axis": "correct", "score": score_oh_question,
        "seed": {"main.py": MYSTERY_SEED},
        "good": '{"result": "12"}', "bad": '{"result": "7"}',
        "meta": True,
    },
    "oh-typo": {
        "prompt": "Fix the typo in the greeting string printed by main.py.",
        "file": "main.py", "axis": "correct", "score": score_oh_typo,
        "seed": {"main.py": TYPO_SEED},
        "good": 'print("Hello, world")\n', "bad": TYPO_SEED,
        "meta": True,
    },
}
