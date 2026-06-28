#!/usr/bin/env python3
"""Append-only ledger for Hestia's always-on standing orders.

An always-on nudge that is frequently irrelevant trains Claude to tune out ALL
of them. This ledger turns that risk into a measurable signal: each session can
record whether a standing order *mattered* (`confirm`) or *fired but was
irrelevant* (`dispute`). The `summary` mode aggregates the counts so a human can
see which orders carry their weight and which are candidates to drop or rescope.

This is a self-audit signal, not enforcement. There are NO magic-number
thresholds — `summary` reports counts and a descriptive note; the candidacy is
descriptive, never an auto-action.

Storage: `.hestia/injection-ledger.jsonl` (already-gitignored namespace), one
JSON object per line, append-only.

CLI:
    injection_ledger.py confirm <order-id> [note]
    injection_ledger.py dispute <order-id> [note]
    injection_ledger.py summary

Standard library only. Python 3.10+.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

# The standing-order ids match the build-governing subset injected into
# subagents (see hooks/companion-inject.py). Free-form ids are accepted too —
# the ledger never rejects an id — but these are the canonical ones.
KNOWN_ORDERS = ("lean", "phases", "truth-grounding", "scope", "memory")


def project_dir() -> Path:
    import os
    return Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())


def ledger_path() -> Path:
    return project_dir() / ".hestia" / "injection-ledger.jsonl"


def record(verdict: str, order_id: str, note: str = "") -> Path:
    """Append one verdict line. Creates `.hestia/` if needed."""
    path = ledger_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": int(time.time()),
        "order": order_id,
        "verdict": verdict,
    }
    if note:
        entry["note"] = note
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return path


def read_entries() -> list[dict]:
    """Read every well-formed ledger line. Bad lines are skipped, never fatal."""
    path = ledger_path()
    if not path.exists():
        return []
    entries: list[dict] = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except ValueError:
            continue
        if isinstance(obj, dict) and obj.get("order"):
            entries.append(obj)
    return entries


def summarize() -> dict:
    """Aggregate per-order confirm/dispute counts plus a descriptive note.

    `sessions` is the total number of verdicts recorded for an order — the rough
    denominator for "did this order ever earn its place". No thresholds: the
    note just describes what the counts suggest.
    """
    entries = read_entries()
    per: dict[str, dict[str, int]] = {}
    for e in entries:
        order = str(e.get("order"))
        bucket = per.setdefault(order, {"confirm": 0, "dispute": 0})
        verdict = e.get("verdict")
        if verdict in bucket:
            bucket[verdict] += 1

    orders = []
    for order in sorted(per):
        confirms = per[order]["confirm"]
        disputes = per[order]["dispute"]
        sessions = confirms + disputes
        orders.append({
            "order": order,
            "confirms": confirms,
            "disputes": disputes,
            "sessions": sessions,
            "note": _note(order, confirms, disputes, sessions),
        })
    return {"orders": orders, "total_entries": len(entries)}


def _note(order: str, confirms: int, disputes: int, sessions: int) -> str:
    """A descriptive (never prescriptive) read of one order's counts."""
    if sessions == 0:
        return f"order {order}: no verdicts recorded yet"
    if confirms == 0:
        return (
            f"order {order}: 0 confirms / {sessions} sessions "
            f"— candidate to drop or rescope"
        )
    if disputes > confirms:
        return (
            f"order {order}: disputed more than confirmed "
            f"({disputes} vs {confirms}) — candidate to rescope"
        )
    return f"order {order}: {confirms} confirms / {disputes} disputes"


def render(summary: dict) -> str:
    """Plain-text summary for the `lean` skill to surface."""
    if not summary["orders"]:
        return (
            "Injection ledger: empty. No standing order has been confirmed or "
            "disputed yet — record signal with `injection_ledger.py confirm|dispute "
            "<order-id>`."
        )
    lines = ["Standing-order ledger (self-audit signal, not enforcement):"]
    for o in summary["orders"]:
        lines.append(f"  {o['note']}")
    lines.append(f"Total verdicts recorded: {summary['total_entries']}.")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    if not argv:
        sys.stderr.write(__doc__ or "")
        return 2
    cmd = argv[0]
    if cmd in ("confirm", "dispute"):
        if len(argv) < 2 or not argv[1].strip():
            sys.stderr.write(f"usage: injection_ledger.py {cmd} <order-id> [note]\n")
            return 2
        order_id = argv[1].strip()
        note = " ".join(argv[2:]).strip()
        path = record(cmd, order_id, note)
        sys.stdout.write(f"recorded {cmd} for '{order_id}' -> {path}\n")
        return 0
    if cmd == "summary":
        sys.stdout.write(render(summarize()) + "\n")
        return 0
    sys.stderr.write(f"unknown command: {cmd}\n")
    sys.stderr.write("commands: confirm <id> | dispute <id> | summary\n")
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Exception as exc:  # never hard-crash a self-audit tool
        sys.stderr.write(f"injection_ledger error: {exc}\n")
        sys.exit(1)
