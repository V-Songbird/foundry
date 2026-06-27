"""Shared helpers for Hestia's audit scripts.

Standard library only — no third-party imports, ever. Every script in this
directory talks to its callers over JSON (stdin in, stdout out) so the plugin
can chain steps without extra dependencies or permission prompts.

Python 3.10+.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Iterable

# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "_data"


# ---------------------------------------------------------------------------
# JSON / text I/O
# ---------------------------------------------------------------------------

def read_json(path: str | Path) -> Any:
    """Load a JSON file. Returns the parsed object."""
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path: str | Path, obj: Any, *, indent: int = 2) -> None:
    """Write an object as JSON, creating parent dirs as needed."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, indent=indent, ensure_ascii=False), encoding="utf-8")


def read_text(path: str | Path) -> str:
    """Read a UTF-8 text file. Returns '' if it does not exist."""
    p = Path(path)
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8", errors="replace")


def load_data(name: str) -> Any:
    """Load a JSON data file from scripts/_data/ by base name (no extension)."""
    return read_json(DATA_DIR / f"{name}.json")


def read_stdin_json() -> Any:
    """Parse JSON from stdin. Returns None on empty input."""
    raw = sys.stdin.read()
    if not raw.strip():
        return None
    return json.loads(raw)


def emit(obj: Any) -> None:
    """Print an object as JSON to stdout — the inter-script contract."""
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))


def fail(reason: str, **extra: Any) -> None:
    """Emit a structured failure payload and exit non-zero."""
    payload = {"status": "failed", "reason": reason}
    payload.update(extra)
    emit(payload)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Project layout
# ---------------------------------------------------------------------------

def find_project_root(start: str | Path | None = None) -> Path:
    """Walk upward from ``start`` (or cwd) to the nearest dir containing a
    ``.git`` folder; fall back to the starting directory if none is found."""
    cur = Path(start or Path.cwd()).resolve()
    for candidate in (cur, *cur.parents):
        if (candidate / ".git").exists():
            return candidate
    return cur


def rel(path: str | Path, root: str | Path) -> str:
    """Best-effort path relative to ``root`` using forward slashes."""
    try:
        return Path(path).resolve().relative_to(Path(root).resolve()).as_posix()
    except ValueError:
        return Path(path).as_posix()


# ---------------------------------------------------------------------------
# Finding model
# ---------------------------------------------------------------------------

# Severity ranks used for ordering the home report (higher = louder).
SEVERITY_RANK = {"info": 0, "low": 1, "medium": 2, "high": 3}


@dataclass
class Finding:
    """One thing worth telling the user about their setup.

    ``severity`` is one of info/low/medium/high. ``artifact`` is the kind of
    file (e.g. "claude-md", "rule", "agent", "skill", "hook", "command").
    ``fix`` names the Hestia skill that addresses it, for the recommendation
    router (e.g. "assess-rules", "scribe", "freshness", "lean").
    """

    severity: str
    artifact: str
    title: str
    detail: str = ""
    location: str = ""
    fix: str = ""
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def rank_findings(findings: Iterable[Finding | dict[str, Any]]) -> list[dict[str, Any]]:
    """Return findings as dicts sorted by severity (loudest first)."""
    dicts = [f.to_dict() if isinstance(f, Finding) else f for f in findings]
    dicts.sort(key=lambda f: SEVERITY_RANK.get(f.get("severity", "info"), 0), reverse=True)
    return dicts
