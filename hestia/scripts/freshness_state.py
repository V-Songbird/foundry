"""Derive staleness at read-time; record what a checkup CLEARED.

Two linked ideas, both borrowed from kairoi's epistemics:

1. **Derive staleness, never store a grade.** A persisted "health: 7/10" verdict
   rots — a later session over-trusts it long after it stopped being true. So we
   persist only cheap, objective signals (the commit SHA + timestamp of the last
   checkup) and DERIVE a fresh/aging/stale *label* at report time, via one
   formula in one place. The thresholds are labeled DEFAULTS, not truth.

2. **Negative invariants — record what's CLEARED.** When a checkup surface comes
   back clean, we record it together with the cheap input-signature that made it
   clean. On a later run, if that signature is unchanged, the surface can be
   skipped and reported honestly ("clean, verified <when>, inputs unchanged")
   instead of re-doing the scan. Audits shrink to deltas.

State lives under ``.hestia/`` (already gitignored — local, never committed):
  - ``.hestia/checkup-state.json`` — {"sha", "ts"} of the last checkup. Cheap
    signal ONLY; no grade is ever written here.
  - ``.hestia/cleared.json``       — {surface: {"signature", "ts", "sha"}} for
    each surface that scanned clean, keyed by the input-signature that was clean.

Read-only with respect to the user's project; the only writes are to ``.hestia``.
Standard library only. Python 3.10+.
"""

from __future__ import annotations

import hashlib
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from _lib import read_json, write_json

# ---------------------------------------------------------------------------
# Tunable DEFAULTS — these are knobs, NOT truth.
# ---------------------------------------------------------------------------
# The whole point of feature #3 is that we DERIVE a label instead of storing a
# baked verdict. The label still needs *some* boundary, but a boundary is a
# tunable default, not an objective fact about the project. Keeping them in one
# named dict (rather than scattered magic numbers) makes that honest and lets a
# caller override them in one place.
DEFAULTS = {
    # Commits landed since the last checkup. More commits = more chance the
    # setup drifted from the code.
    "fresh_max_commits": 20,    # <= this many commits since last checkup -> still fresh
    "stale_min_commits": 75,    # >= this many commits -> stale regardless of age
    # Calendar age of the last checkup, in days. A repo can sit untouched and
    # still age out of confidence.
    "fresh_max_days": 14,       # <= this many days since last checkup -> still fresh
    "stale_min_days": 60,       # >= this many days -> stale regardless of churn
}

# State file names under .hestia/.
STATE_DIR = ".hestia"
CHECKUP_STATE_FILE = "checkup-state.json"
CLEARED_FILE = "cleared.json"


# ---------------------------------------------------------------------------
# Cheap objective signals
# ---------------------------------------------------------------------------

def _git(args: list[str], root: Path) -> str | None:
    """Run a git command in ``root``; return stdout stripped, or None on any
    failure (not a git repo, git missing, bad SHA). Never raises."""
    try:
        proc = subprocess.run(
            ["git", *args],
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0:
        return None
    return proc.stdout.strip()


def current_head(root: str | Path) -> str | None:
    """The current HEAD commit SHA, or None when this is not a git repo."""
    return _git(["rev-parse", "HEAD"], Path(root))


def commits_since(sha: str | None, root: str | Path) -> int | None:
    """Number of commits on HEAD since ``sha`` (via ``git rev-list --count``).

    Returns None — meaning "this signal is unavailable" — when there is no prior
    SHA, when ``root`` is not a git repo, when git is missing, or when ``sha`` is
    no longer reachable (e.g. history was rewritten). None is a first-class
    "unknown", not zero: callers must degrade gracefully, never pretend it's 0.
    """
    if not sha:
        return None
    out = _git(["rev-list", "--count", f"{sha}..HEAD"], Path(root))
    if out is None:
        return None
    try:
        return int(out)
    except ValueError:
        return None


def _now_ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def days_since(ts: str | None) -> float | None:
    """Whole-ish days elapsed since an ISO timestamp, or None if missing/unparseable."""
    if not ts:
        return None
    try:
        then = datetime.fromisoformat(ts)
    except ValueError:
        return None
    if then.tzinfo is None:
        then = then.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - then
    return max(0.0, delta.total_seconds() / 86400.0)


# ---------------------------------------------------------------------------
# THE derive-staleness formula (one place, only place)
# ---------------------------------------------------------------------------

def derive_staleness(
    commits: int | None,
    days: float | None,
    *,
    defaults: dict | None = None,
) -> dict:
    """Derive a fresh / aging / stale label from cheap signals. ONE formula.

    Rules, in plain language:
      - If BOTH signals are unknown -> label "unknown" (we have no prior
        checkup to compare against; honesty, not a guess).
      - A signal that crosses its ``stale_min_*`` threshold forces "stale".
      - A label is "fresh" only when every *known* signal is within its
        ``fresh_max_*`` bound.
      - Anything in between is "aging".

    The thresholds come from ``defaults`` (DEFAULTS if omitted) — tunable knobs,
    not truth. Returns a dict with the label, the signals it used, and a short
    human ``reason`` so the report can be honest about *why* it derived this.
    """
    d = defaults or DEFAULTS
    have_commits = commits is not None
    have_days = days is not None

    if not have_commits and not have_days:
        return {
            "label": "unknown",
            "commits": None,
            "days": None,
            "reason": "no prior checkup recorded for this project",
        }

    # Stale if any known signal is at/over its stale floor.
    stale_hits: list[str] = []
    if have_commits and commits >= d["stale_min_commits"]:
        stale_hits.append(f"{commits} commits since last checkup (>= {d['stale_min_commits']})")
    if have_days and days >= d["stale_min_days"]:
        stale_hits.append(f"{round(days)} days since last checkup (>= {d['stale_min_days']})")
    if stale_hits:
        return {
            "label": "stale",
            "commits": commits,
            "days": None if days is None else round(days, 1),
            "reason": "; ".join(stale_hits),
        }

    # Fresh only if every KNOWN signal is within its fresh bound.
    commits_fresh = (not have_commits) or commits <= d["fresh_max_commits"]
    days_fresh = (not have_days) or days <= d["fresh_max_days"]
    if commits_fresh and days_fresh:
        parts = []
        if have_commits:
            parts.append(f"{commits} commits since last checkup (<= {d['fresh_max_commits']})")
        if have_days:
            parts.append(f"{round(days)} days ago (<= {d['fresh_max_days']})")
        return {
            "label": "fresh",
            "commits": commits,
            "days": None if days is None else round(days, 1),
            "reason": "; ".join(parts) or "within fresh bounds",
        }

    # Otherwise: aging.
    parts = []
    if have_commits:
        parts.append(f"{commits} commits since last checkup")
    if have_days:
        parts.append(f"{round(days)} days ago")
    return {
        "label": "aging",
        "commits": commits,
        "days": None if days is None else round(days, 1),
        "reason": "; ".join(parts) + " — past fresh, not yet stale",
    }


# ---------------------------------------------------------------------------
# Checkup state — persist the cheap signal, NEVER a grade
# ---------------------------------------------------------------------------

def _state_path(root: str | Path, name: str) -> Path:
    return Path(root) / STATE_DIR / name


def load_checkup_state(root: str | Path) -> dict:
    """Return {"sha": ..., "ts": ...} of the last recorded checkup, or {} if none.

    Tolerant: a missing or corrupt state file degrades to "no prior run".
    """
    p = _state_path(root, CHECKUP_STATE_FILE)
    try:
        data = read_json(p)
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def record_checkup(root: str | Path) -> dict:
    """Persist the current cheap signal (HEAD SHA + timestamp) as 'last checkup'.

    Writes ONLY the objective signal — no derived label, no grade is ever
    stored. Returns the record written. ``sha`` is None when not a git repo.
    """
    record = {"sha": current_head(root), "ts": _now_ts()}
    try:
        write_json(_state_path(root, CHECKUP_STATE_FILE), record)
    except OSError:
        pass
    return record


def staleness_for(root: str | Path, *, defaults: dict | None = None) -> dict:
    """Convenience: load prior checkup state and derive the current staleness.

    Combines the persisted cheap signal with live git/clock signals and runs the
    one formula. Adds ``last_sha`` / ``last_ts`` for the report.
    """
    prev = load_checkup_state(root)
    sha = prev.get("sha")
    ts = prev.get("ts")
    result = derive_staleness(
        commits_since(sha, root),
        days_since(ts),
        defaults=defaults,
    )
    result["last_sha"] = sha
    result["last_ts"] = ts
    return result


# ---------------------------------------------------------------------------
# Cleared surfaces — negative invariants
# ---------------------------------------------------------------------------

def surface_signature(files: Iterable[str | Path]) -> str:
    """Cheap, deterministic input-signature for a checkup surface.

    The signature is a sha1 over each file's project-relative-ish path plus its
    size and mtime (to nanosecond resolution). No file *contents* are read, so
    it stays cheap even on large trees — an edit changes size and/or mtime, a
    rename changes the path, a delete drops the entry. Missing files contribute a
    stable "absent" marker so deleting a watched file also flips the signature.

    Inputs are sorted, so ordering does not affect the result.
    """
    h = hashlib.sha1()
    for f in sorted(str(x) for x in files):
        p = Path(f)
        try:
            st = p.stat()
            token = f"{f}|{st.st_size}|{st.st_mtime_ns}"
        except OSError:
            token = f"{f}|absent"
        h.update(token.encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()[:16]


def load_cleared(root: str | Path) -> dict:
    """Return the cleared-surfaces map {surface: {signature, ts, sha}}, or {}."""
    p = _state_path(root, CLEARED_FILE)
    try:
        data = read_json(p)
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _save_cleared(root: str | Path, data: dict) -> None:
    try:
        write_json(_state_path(root, CLEARED_FILE), data)
    except OSError:
        pass


def is_cleared(root: str | Path, surface: str, current_signature: str) -> bool:
    """True iff ``surface`` was previously recorded clean with the SAME signature.

    A True result is the license to SKIP re-scanning: nothing that feeds this
    surface has changed since it was last verified clean. Any drift in the
    signature (edit, add, rename, delete) returns False, forcing a re-scan.
    """
    rec = load_cleared(root).get(surface)
    if not isinstance(rec, dict):
        return False
    return bool(current_signature) and rec.get("signature") == current_signature


def cleared_record(root: str | Path, surface: str) -> dict | None:
    """The stored {signature, ts, sha} for ``surface``, or None — for honest
    reporting of *when* a skipped surface was last verified."""
    rec = load_cleared(root).get(surface)
    return rec if isinstance(rec, dict) else None


def record_cleared(root: str | Path, surface: str, signature: str) -> dict:
    """Record that ``surface`` scanned clean under ``signature`` (negative invariant).

    Stores the signature plus a timestamp and the current SHA so a later run can
    say *when* (and at which commit) the surface was verified. Returns the
    record written.
    """
    data = load_cleared(root)
    record = {"signature": signature, "ts": _now_ts(), "sha": current_head(root)}
    data[surface] = record
    _save_cleared(root, data)
    return record


def clear_surface(root: str | Path, surface: str) -> None:
    """Drop a surface's cleared record (e.g. when it stops scanning clean), so it
    is never reported as skipped-clean while it actually has findings."""
    data = load_cleared(root)
    if surface in data:
        del data[surface]
        _save_cleared(root, data)
