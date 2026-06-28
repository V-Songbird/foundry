#!/usr/bin/env python3
"""SessionStart nudge when a project's instruction files have gone stale.

Cheap and throttled: emits at most one gentle, read-only note into context, and
only when the set of stale references has changed or it has been a while since
the last note. Never edits the user's files. Never breaks session start.

Standard library only. Python 3.10+.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date
from pathlib import Path

# Resolve scripts/ as an import location so we can reuse drift + its deps.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import drift as drift_mod  # noqa: E402

THROTTLE_DAYS = 14


def project_dir() -> Path:
    return Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())


def main() -> None:
    root = project_dir()
    result = drift_mod.scan(str(root))
    if not result["stale_files"]:
        return

    marker = root / ".hestia" / "freshness-nudge.json"
    prev: dict = {}
    try:
        prev = json.loads(marker.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        prev = {}

    same_sig = bool(prev.get("signature")) and prev.get("signature") == result["signature"]
    recent = False
    if same_sig and prev.get("date"):
        try:
            recent = (date.today() - date.fromisoformat(prev["date"])).days < THROTTLE_DAYS
        except ValueError:
            recent = False
    # Derived staleness (read-time label from the last checkup's cheap signal; no
    # grade is stored). A setup that has aged to "stale" warrants a reminder even
    # when the broken-ref signature itself hasn't changed — so it overrides the
    # throttle. Everything else keeps the existing behavior.
    setup_stale = (result.get("staleness", {}) or {}).get("label") == "stale"
    if same_sig and recent and not setup_stale:
        return  # already nudged for this exact staleness, recently

    try:
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text(
            json.dumps({"signature": result["signature"], "date": date.today().isoformat()}),
            encoding="utf-8",
        )
    except OSError:
        pass

    files = ", ".join(s["path"] for s in result["stale_files"][:5])
    n = result["total_broken"]
    msg = (
        f"Hestia freshness check: {n} reference(s) in this project's instruction files "
        f"point to missing paths (in {files}). At a natural moment, gently let the user know "
        f"and offer to run /hestia:checkup or /hestia:freshness. Mention this once; do not nag."
    )
    try:
        sys.stdout.buffer.write(msg.encode("utf-8"))
    except OSError:
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # A freshness nudge must never break session start.
        sys.exit(0)
