#!/usr/bin/env python3
"""Turn a run's summary.json into report.md (tables) + charts.svg (grouped bars).

  python report.py runs/<stamp>

Charts are hand-rolled SVG, no dependencies. The headline chart shows each arm as a percent
of the no-plugin baseline (median of per-task ratios) on LOC, total tokens, cost and time —
lower is better, and the dashed 100 line is the baseline itself.
"""
import json, os, statistics, sys, tempfile
from collections import defaultdict
from pathlib import Path

# Same out-of-tree location bench.py writes runs to (kept in sync via RAZOR_BENCH_RUNS).
RUNS_BASE = Path(os.environ.get("RAZOR_BENCH_RUNS") or (Path(tempfile.gettempdir()) / "razor-bench"))

TIERS = {
    "dependency traps (Bash on, shimmed)": ["dep-slug", "dep-toml", "dep-uuid",
                                            "dep-http", "dep-retry", "dep-dotenv"],
    "vibe-coder dep traps (prompt names the lib)": ["dep-http-lib", "dep-retry-lib",
                                                    "dep-dotenv-lib"],
    "reuse trap": ["reuse-scan"],
    "sprawl trap (Bash on, git)": ["sprawl-todo"],
    "injection overhead (no code)": ["oh-question", "oh-typo"],
}
ARM_ORDER = ["baseline", "razor", "rival"]
COLORS = {"baseline": "#9aa0a6", "razor": "#4a7bc9", "rival": "#c96f4a"}

def load(run_dir: Path):
    rows = json.loads((run_dir / "summary.json").read_text(encoding="utf-8"))
    by_task = defaultdict(dict)
    for r in rows:
        by_task[r["task"]][r["arm"]] = r
    return rows, by_task

def ratios_vs_baseline(by_task, arm, metric, tasks):
    """Median over tasks of arm_value / baseline_value (tasks where baseline > 0)."""
    rs = []
    for t in tasks:
        b, a = by_task.get(t, {}).get("baseline"), by_task.get(t, {}).get(arm)
        if not b or not a:
            continue
        bv, av = b.get(metric), a.get(metric)
        if bv and av is not None and bv > 0:
            rs.append(av / bv)
    return statistics.median(rs) if rs else None

def bar_chart(title, groups, series, values, unit="%", width=760):
    """groups: x labels; series: arm names; values[arm][i] -> number or None."""
    n_g, n_s = len(groups), len(series)
    gw = (width - 80) / n_g
    bw = min(34, (gw - 20) / n_s)
    maxv = max((v for arm in series for v in values[arm] if v is not None), default=1) or 1
    top = max(maxv * 1.15, 110 if unit == "%" else maxv * 1.15)
    h, base_y = 300, 250
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {h}" '
           f'font-family="Segoe UI, sans-serif" font-size="12">',
           f'<text x="{width/2}" y="20" text-anchor="middle" font-size="15" '
           f'font-weight="bold">{title}</text>']
    for frac in (0.25, 0.5, 0.75, 1.0):
        y = base_y - 200 * frac
        v = top * frac
        out.append(f'<line x1="60" y1="{y:.0f}" x2="{width-20}" y2="{y:.0f}" '
                   f'stroke="#ddd" stroke-width="1"/>')
        out.append(f'<text x="55" y="{y+4:.0f}" text-anchor="end" fill="#666">'
                   f'{v:.0f}{unit if unit == "%" else ""}</text>')
    if unit == "%":
        y100 = base_y - 200 * (100 / top)
        out.append(f'<line x1="60" y1="{y100:.0f}" x2="{width-20}" y2="{y100:.0f}" '
                   f'stroke="#888" stroke-dasharray="4 3"/>')
        out.append(f'<text x="{width-18}" y="{y100+4:.0f}" fill="#888">100</text>')
    for gi, g in enumerate(groups):
        gx = 70 + gi * gw
        for si, arm in enumerate(series):
            v = values[arm][gi]
            x = gx + si * bw
            if v is None:
                out.append(f'<text x="{x+bw/2:.0f}" y="{base_y-6}" text-anchor="middle" '
                           f'fill="#bbb">n/a</text>')
                continue
            bh = 200 * (v / top)
            out.append(f'<rect x="{x:.0f}" y="{base_y-bh:.0f}" width="{bw-4:.0f}" '
                       f'height="{bh:.0f}" fill="{COLORS.get(arm, "#888")}" rx="2"/>')
            out.append(f'<text x="{x+bw/2-2:.0f}" y="{base_y-bh-5:.0f}" text-anchor="middle" '
                       f'fill="#333">{v:.0f}</text>')
        out.append(f'<text x="{gx + (n_s*bw)/2:.0f}" y="{base_y+18}" text-anchor="middle" '
                   f'font-weight="bold">{g}</text>')
    lx = 70
    for arm in series:
        out.append(f'<rect x="{lx}" y="{h-22}" width="12" height="12" '
                   f'fill="{COLORS.get(arm, "#888")}" rx="2"/>')
        out.append(f'<text x="{lx+16}" y="{h-12}">{arm}</text>')
        lx += 16 + 8 * len(arm) + 30
    out.append("</svg>")
    return "\n".join(out)

def fmt(v, spec=""):
    if v is None:
        return "–"
    return format(v, spec) if spec else str(v)

def main():
    run_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else sorted(RUNS_BASE.iterdir())[-1]
    if not run_dir.exists():                 # accept a bare "<stamp>" as well as a full path
        run_dir = RUNS_BASE / run_dir.name
    rows, by_task = load(run_dir)
    arms = [a for a in ARM_ORDER if any(r["arm"] == a for r in rows)]
    model = rows[0]["model"] if rows else "?"
    n = rows[0]["n"] if rows else 0
    md = [f"# razor benchmark — run `{run_dir.name}`",
          f"\nModel `{model}`, n={n} per cell. Headless Claude Code sessions, one plugin per arm"
          f" via `--plugin-dir`, global plugins excluded. LOC = delivered code (tests excluded),"
          f" tokens/cost/time from the CLI's own usage JSON.\n"]

    # headline: % of baseline on the code-writing tiers
    code_tasks = [t for tier, ts in TIERS.items() if "overhead" not in tier for t in ts
                  if t in by_task]
    metrics = [("total_loc_median", "LOC"), ("total_tokens_mean", "tokens"),
               ("cost_mean", "cost"), ("time_s_mean", "time")]
    values = {arm: [] for arm in arms if arm != "baseline"}
    for metric, _label in metrics:
        for arm in values:
            r = ratios_vs_baseline(by_task, arm, metric, code_tasks)
            values[arm].append(round(r * 100) if r is not None else None)
    md.append("## Headline: % of baseline (median of per-task ratios, code tiers)\n")
    md.append("| arm | " + " | ".join(l for _, l in metrics) + " |")
    md.append("|---|" + "--:|" * len(metrics))
    for arm, vals in values.items():
        md.append(f"| **{arm}** | " + " | ".join(
            (f"{v}%" if v is not None else "–") for v in vals) + " |")
    chart1 = bar_chart(f"% of baseline ({model}, n={n}) — lower is better",
                       [l for _, l in metrics], list(values), values) if values else ""

    # per-tier tables
    for tier, tasks in TIERS.items():
        present = [t for t in tasks if t in by_task]
        if not present:
            continue
        md.append(f"\n## {tier}\n")
        md.append("| task | arm | correct | safe | LOC | files | new files | tokens | $/run "
                  "| time s | turns | installs | razor denies (dep/file) | ledger |")
        md.append("|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|")
        for t in present:
            for arm in arms:
                r = by_task[t].get(arm)
                if not r:
                    continue
                denies = f"{fmt(r.get('razor_dep_denies_mean'))}/{fmt(r.get('razor_file_denies_mean'))}"
                md.append(f"| {t} | {arm} | {fmt(r['correct_rate'])} | {fmt(r['safe_rate'])} "
                          f"| {fmt(r['total_loc_median'])} | {fmt(r['src_files_median'])} "
                          f"| {fmt(r.get('new_files_median'))} | {fmt(r.get('total_tokens_mean'))} "
                          f"| {fmt(r.get('cost_mean'), '.4f')} | {fmt(r.get('time_s_mean'))} "
                          f"| {fmt(r.get('turns_mean'))} | {fmt(r.get('install_attempts_mean'))} "
                          f"| {denies} | {fmt(r.get('razor_ledger_mean'))} |")

    # trap chart: dependency-trap avoidance
    dep_tasks = [t for t in TIERS["dependency traps (Bash on, shimmed)"] if t in by_task]
    if dep_tasks:
        vals = {arm: [] for arm in arms}
        for t in dep_tasks:
            for arm in arms:
                r = by_task[t].get(arm)
                vals[arm].append(round(r["safe_rate"] * 100) if r else None)
        chart2 = bar_chart("Dependency-trap avoidance, % of runs with no new dependency",
                           dep_tasks, arms, vals)
    else:
        chart2 = ""

    # overhead chart: absolute tokens on no-code tasks
    oh_tasks = [t for t in TIERS["injection overhead (no code)"] if t in by_task]
    if oh_tasks:
        vals = {arm: [] for arm in arms}
        for t in oh_tasks:
            for arm in arms:
                r = by_task[t].get(arm)
                vals[arm].append(r.get("total_tokens_mean") if r else None)
        chart3 = bar_chart("Injection overhead: total tokens on no-code tasks",
                           oh_tasks, arms, vals, unit="tok")
    else:
        chart3 = ""

    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 940" '
           'font-family="Segoe UI, sans-serif">'
           + (f'<g transform="translate(0,0)">{chart1}</g>' if chart1 else "")
           + (f'<g transform="translate(0,320)">{chart2}</g>' if chart2 else "")
           + (f'<g transform="translate(0,640)">{chart3}</g>' if chart3 else "")
           + "</svg>")
    # nested <svg> elements render fine; keep each chart standalone too
    (run_dir / "charts.svg").write_text(svg, encoding="utf-8")
    md.insert(2, "\n![charts](charts.svg)\n")
    (run_dir / "report.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    html = ("<!doctype html><meta charset='utf-8'><title>razor benchmark</title>"
            "<style>body{font-family:Segoe UI,sans-serif;max-width:900px;margin:2rem auto;"
            "padding:0 1rem}table{border-collapse:collapse;font-size:13px}td,th{border:1px solid"
            " #ccc;padding:3px 8px;text-align:right}th,td:first-child,td:nth-child(2)"
            "{text-align:left}</style>" + md_to_html("\n".join(md)))
    (run_dir / "report.html").write_text(html, encoding="utf-8")
    print(f"wrote {run_dir}\\report.md, report.html, charts.svg")

def md_to_html(md):
    """Tiny converter: headings, tables, paragraphs, images. Enough for this report."""
    out, table = [], []
    def flush():
        nonlocal table
        if table:
            out.append("<table>")
            for i, row in enumerate(table):
                cells = [c.strip() for c in row.strip("|").split("|")]
                tag = "th" if i == 0 else "td"
                out.append("<tr>" + "".join(f"<{tag}>{c.replace('**', '')}</{tag}>"
                                            for c in cells) + "</tr>")
            out.append("</table>")
            table = []
    for line in md.splitlines():
        s = line.strip()
        if s.startswith("|") and s.count("|") > 2:
            if set(s.replace("|", "").replace("-", "").replace(":", "").strip()) == set():
                continue
            table.append(s)
            continue
        flush()
        if s.startswith("# "):
            out.append(f"<h1>{s[2:]}</h1>")
        elif s.startswith("## "):
            out.append(f"<h2>{s[3:]}</h2>")
        elif s.startswith("!["):
            src = s[s.find("(") + 1:s.find(")")]
            out.append(f'<img src="{src}" style="max-width:100%">')
        elif s:
            out.append(f"<p>{s}</p>")
    flush()
    return "\n".join(out)

if __name__ == "__main__":
    main()
