"""Staleness signals for a project's Claude-context files.

Read-only. The strongest, most reliable signal that an instruction file has gone
stale is a reference that no longer resolves — a path to a file, directory, or
import that has since been renamed, moved, or deleted. That is what this scan
reports. (Time/churn-based signals are deliberately left out: a fresh git clone
resets mtimes, so they produce noise, not signal.)

Reused by both the freshness skill and the SessionStart nudge hook.

Usage:
    python drift.py [--project-root PATH]

Standard library only. Python 3.10+.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import discover as discover_mod
import refs as refs_mod
from _lib import emit, limit_note

INSTRUCTION_KINDS = ("claude_md", "rules", "agents", "skills", "commands")


def scan(project_root: str | None = None) -> dict:
    inv = discover_mod.discover(project_root)
    root = Path(inv["project_root"])
    stale: list[dict] = []
    total = 0
    for kind in INSTRUCTION_KINDS:
        for item in inv["artifacts"][kind]:
            broken = refs_mod.broken_refs(root / item["path"], root)
            if broken:
                stale.append({"path": item["path"], "kind": kind, "broken": broken})
                total += len(broken)

    signature = ""
    if stale:
        basis = "|".join(sorted(f"{s['path']}:{','.join(s['broken'])}" for s in stale))
        signature = hashlib.sha1(basis.encode("utf-8")).hexdigest()[:12]

    # --- Part C: honest limits — empty results are stated explicitly, never
    # silenced. A clean scan means "no broken path-like refs", not "everything
    # is current".
    limits = []
    if not stale:
        limits.append(limit_note(
            "freshness",
            "No stale references found.",
            residual_risk="This only checks resolvable path-like references; "
            "prose that describes outdated behavior is not detected."))
    limits.append(limit_note(
        "freshness-scope",
        "Reference detection is conservative — only path-like tokens (./ ../ ~/ "
        ".claude/ or slash+extension), @imports, and relative markdown links are "
        "verified. Time/churn signals are excluded (a fresh clone resets mtimes).",
        residual_risk="A reference written in prose or pointing outside the "
        "project tree may be stale without showing up here."))

    return {
        "status": "ok",
        "project_root": str(root),
        # Counted facts only — observed tallies, no impact claims.
        "stale_files": stale,
        "total_broken": total,
        "signature": signature,
        "limits": limits,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Scan instruction files for stale references.")
    ap.add_argument("--project-root", default=None)
    emit(scan(ap.parse_args().project_root))


if __name__ == "__main__":
    main()
