"""One-off: merge dep-toml/vibe-jsonconf cells from two run dirs into a combined n=3 view."""
import json
from pathlib import Path
import bench as b

HERE = Path(__file__).resolve().parent
RUNS = [HERE / "runs" / "20260706-083629", HERE / "runs" / "20260706-084416"]
TASKS = {"dep-toml", "vibe-jsonconf"}

results = []
for rd in RUNS:
    res = json.load(open(rd / "results.json"))["results"]
    results += [r for r in res if r.get("task") in TASKS]

rows = b.aggregate(results)
out = HERE / "runs" / "combined-dep-toml-vibe-jsonconf"
out.mkdir(exist_ok=True)
(out / "summary.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
(out / "results.json").write_text(json.dumps({"results": results}, indent=2), encoding="utf-8")
b.print_table(rows)
