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
# Finding model — the FINDING CONTRACT
# ---------------------------------------------------------------------------
#
# Hestia is evidence-driven; it rejects ungrounded prescription. The Finding
# shape turns that principle into a mechanical output contract with four rules
# baked into the type itself:
#
#   A. Cite-or-drop. A normal finding MUST carry a concrete locator — a `file`,
#      and (where applicable) a `line`/line-range. Construct a finding via
#      `Finding.cited(...)`, which REQUIRES a file. A claim that cannot point at
#      a specific construct is not a finding: either drop it, or route it through
#      `Finding.advisory(...)` into the clearly-labeled "advisory (unverified)"
#      bucket. Hestia literally cannot emit an ungrounded "this could be better"
#      as a normal finding — the constructor refuses it.
#
#   B. Triple-shape. Every finding carries `symptom` (what's wrong, short),
#      `why` (one line on why it bites Claude/the dev), and `fix_action` (the
#      concrete corrective action). The digest layer shows symptom + severity +
#      location; the drill-down shows why + fix_action. Never a bare "this is
#      wrong" with no fix.
#
# (Parts C — honest limits — and D — counted-facts-only — live in `limit_note`
# and `report.py` respectively; the contract is the same surface.)
#
# A file-level finding (e.g. "CLAUDE.md is too long", "agent has no
# frontmatter") legitimately has a file but no single line: `line` stays None
# and the `file` alone satisfies the locator requirement. Only a finding with
# NO file is rejected.

# Severity ranks used for ordering the home report (higher = louder).
SEVERITY_RANK = {"info": 0, "low": 1, "medium": 2, "high": 3}


@dataclass
class Finding:
    """One grounded thing worth telling the user about their setup.

    Construct findings via the factories, never the bare constructor:

    - ``Finding.cited(...)`` — a normal finding. Requires ``file`` (the locator);
      ``line`` is optional for file-level findings. Carries the triple-shape
      (``symptom`` / ``why`` / ``fix_action``).
    - ``Finding.advisory(...)`` — an UNVERIFIED hunch with no locator. Sets
      ``advisory=True`` so renderers route it to a separate, clearly-labeled
      bucket. This is the only way to emit something without a file.

    Fields:
      ``severity``    one of info/low/medium/high.
      ``artifact``    the kind of construct (claude-md, rule, agent, skill,
                      hook, command, reference, mcp).
      ``symptom``     what's wrong, short — the digest line.
      ``why``         one line on why it bites Claude/the dev (the rationale).
      ``fix_action``  the concrete corrective action (never empty for a real
                      finding — that's the "no bare wrong" rule).
      ``file``        the locator. REQUIRED for a cited finding; "" only for an
                      advisory.
      ``line``        optional line or line-range string for sub-file findings.
      ``fix``         the Hestia skill that addresses it, for the next-step
                      router (e.g. "assess-rules", "scribe", "freshness",
                      "lean"). This is a routing hint, NOT the corrective text —
                      that's ``fix_action``.
      ``advisory``    True for the unverified bucket; False for cited findings.
      ``tags``        free-form classifier tags.
    """

    severity: str
    artifact: str
    symptom: str
    why: str = ""
    fix_action: str = ""
    file: str = ""
    line: str | None = None
    fix: str = ""
    advisory: bool = False
    tags: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        # Cite-or-drop, enforced by construction: a non-advisory finding without
        # a file is not a finding at all.
        if not self.advisory and not self.file:
            raise ValueError(
                "cite-or-drop: a normal Finding requires a `file` locator. "
                "Use Finding.advisory(...) for an unverified, locator-less hunch."
            )

    @classmethod
    def cited(
        cls,
        *,
        severity: str,
        artifact: str,
        symptom: str,
        why: str,
        fix_action: str,
        file: str,
        line: str | int | None = None,
        fix: str = "",
        tags: list[str] | None = None,
    ) -> "Finding":
        """Build a normal, grounded finding. ``file`` is mandatory (cite-or-drop);
        ``line`` is optional for file-level findings. ``why`` and ``fix_action``
        complete the triple-shape and should never be empty."""
        if not file:
            raise ValueError("cite-or-drop: Finding.cited requires a `file` locator.")
        return cls(
            severity=severity,
            artifact=artifact,
            symptom=symptom,
            why=why,
            fix_action=fix_action,
            file=file,
            line=None if line is None else str(line),
            fix=fix,
            advisory=False,
            tags=list(tags or []),
        )

    @classmethod
    def advisory_note(
        cls,
        *,
        severity: str,
        artifact: str,
        symptom: str,
        why: str = "",
        fix_action: str = "",
        fix: str = "",
        tags: list[str] | None = None,
    ) -> "Finding":
        """Build an UNVERIFIED advisory with no locator. Renderers MUST present
        these in a separate "advisory (unverified)" bucket, never mixed with
        cited findings."""
        return cls(
            severity=severity,
            artifact=artifact,
            symptom=symptom,
            why=why,
            fix_action=fix_action,
            file="",
            line=None,
            fix=fix,
            advisory=True,
            tags=list(tags or []),
        )

    @property
    def location(self) -> str:
        """Human-readable locator: ``file:line`` or just ``file`` for a
        file-level finding. Empty for an advisory."""
        if not self.file:
            return ""
        return f"{self.file}:{self.line}" if self.line else self.file

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["location"] = self.location
        return d


def rank_findings(findings: Iterable[Finding | dict[str, Any]]) -> list[dict[str, Any]]:
    """Return findings as dicts sorted by severity (loudest first)."""
    dicts = [f.to_dict() if isinstance(f, Finding) else f for f in findings]
    dicts.sort(key=lambda f: SEVERITY_RANK.get(f.get("severity", "info"), 0), reverse=True)
    return dicts


# ---------------------------------------------------------------------------
# Part C — Honest limits
# ---------------------------------------------------------------------------

def limit_note(scope: str, detail: str, residual_risk: str = "") -> dict[str, str]:
    """One contribution to a report's closing "Limits" section.

    Every emitter can hand back limit notes so the report can state, plainly,
    what this run could NOT check — out-of-scope surfaces, unverifiable things
    (unresolved ``@``-imports, skipped/pruned dirs, missing external tools), and
    the residual risk the dev still owns.

    Empty results are limits too: state them explicitly ("No stale references
    found."), never silence.

    ``scope`` is a short label (e.g. "freshness", "rule-scoring",
    "external-tools"); ``detail`` is the plain-language note; ``residual_risk``
    optionally names what the dev still has to verify by hand.
    """
    note = {"scope": scope, "detail": detail}
    if residual_risk:
        note["residual_risk"] = residual_risk
    return note
