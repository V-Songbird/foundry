"""Heuristic audit of a project's Claude Code setup.

Deterministic, cheap, and read-only. Runs the discover inventory, applies a set
of fast heuristics, and emits ranked findings as JSON. Deeper, model-judged
checks (rule-quality scoring, artifact proofreading) are layered on top by the
checkup skill once those engines exist — this script is the always-available
floor.

Usage:
    python checkup.py [--project-root PATH]

Standard library only. Python 3.10+.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import discover as discover_mod
import refs as refs_mod
from _lib import Finding, emit, rank_findings, read_text

CLAUDE_MD_SOFT_MAX = 200   # scriptorium guidance: CLAUDE.md stays small
SKILL_SOFT_MAX = 500       # SKILL.md body soft cap

_FRONTMATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_FM_KEY = re.compile(r"^([A-Za-z0-9_-]+)\s*:\s*(.*)$")


def parse_frontmatter(text: str) -> dict[str, str] | None:
    m = _FRONTMATTER.match(text)
    if not m:
        return None
    keys: dict[str, str] = {}
    for line in m.group(1).splitlines():
        km = _FM_KEY.match(line)
        if km:
            keys[km.group(1)] = km.group(2).strip()
    return keys


def audit(project_root: str | None = None) -> dict:
    inv = discover_mod.discover(project_root)
    root = Path(inv["project_root"])
    art = inv["artifacts"]
    findings: list[Finding] = []

    # 1. No CLAUDE.md at all — Claude has no project memory.
    project_md = [c for c in art["claude_md"] if c.get("scope") in ("project", "project-dot")]
    if not art["claude_md"]:
        findings.append(Finding(
            severity="high", artifact="claude-md",
            title="No CLAUDE.md found",
            detail="Claude has no always-on project memory. A short CLAUDE.md with build/test commands and key conventions makes every session sharper.",
            fix="onboarding", tags=["missing"]))

    # 2. Oversized project-scope CLAUDE.md.
    for c in project_md:
        if c["lines"] > CLAUDE_MD_SOFT_MAX:
            findings.append(Finding(
                severity="medium", artifact="claude-md",
                title=f"CLAUDE.md is long ({c['lines']} lines)",
                detail=f"Aim for under {CLAUDE_MD_SOFT_MAX} lines. Long instruction files dilute attention; move path-scoped detail into .claude/rules/.",
                location=c["path"], fix="assess-rules", tags=["size"]))

    # 3. Broken path references in CLAUDE.md and rules (the classic staleness signal).
    for c in art["claude_md"] + art["rules"]:
        broken = refs_mod.broken_refs(root / c["path"], root)
        if broken:
            shown = ", ".join(broken[:6]) + (" …" if len(broken) > 6 else "")
            findings.append(Finding(
                severity="high", artifact="reference",
                title=f"{len(broken)} reference(s) point to missing files",
                detail=f"In {c['path']}: {shown}. Stale references quietly mislead Claude.",
                location=c["path"], fix="freshness", tags=["stale"]))

    # 4. Agents missing frontmatter name/description.
    for a in art["agents"]:
        fm = parse_frontmatter(read_text(root / a["path"]))
        if fm is None:
            findings.append(Finding(
                severity="high", artifact="agent",
                title="Agent has no frontmatter",
                detail="Without YAML frontmatter (name + description), Claude can't reliably discover or dispatch this agent.",
                location=a["path"], fix="scribe", tags=["frontmatter"]))
        elif not fm.get("name") or not fm.get("description"):
            missing = " and ".join(k for k in ("name", "description") if not fm.get(k))
            findings.append(Finding(
                severity="medium", artifact="agent",
                title=f"Agent frontmatter missing {missing}",
                detail="The description is what makes Claude pick the agent at the right moment.",
                location=a["path"], fix="scribe", tags=["frontmatter"]))

    # 5. Oversized SKILL.md bodies.
    for s in art["skills"]:
        if s["lines"] > SKILL_SOFT_MAX:
            findings.append(Finding(
                severity="medium", artifact="skill",
                title=f"SKILL.md is long ({s['lines']} lines)",
                detail=f"Aim for under {SKILL_SOFT_MAX} lines. Move payloads and references into sibling files so the body stays an orchestrator.",
                location=s["path"], fix="scribe", tags=["size"]))

    # 6. Unparseable settings / mcp config.
    for bad in inv["hooks"].get("parse_errors", []):
        findings.append(Finding(
            severity="medium", artifact="hook",
            title="settings file is not valid JSON",
            detail="Hooks and permissions in this file are being ignored until the JSON parses.",
            location=bad, fix="scribe", tags=["parse"]))
    if inv["mcp"].get("parse_error"):
        findings.append(Finding(
            severity="medium", artifact="mcp",
            title=".mcp.json is not valid JSON",
            detail="MCP servers declared here are being ignored until the JSON parses.",
            location=inv["mcp"].get("path", ".mcp.json"), fix="scribe", tags=["parse"]))

    ranked = rank_findings(findings)
    counts = {sev: 0 for sev in ("high", "medium", "low", "info")}
    for f in ranked:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1

    near_empty = not art["claude_md"] and not art["rules"] and not art["agents"] and not art["skills"]

    return {
        "status": "ok",
        "project_root": str(root),
        "stack": inv["stack"],
        "summary": inv["summary"],
        "near_empty": near_empty,
        "counts": counts,
        "findings": ranked,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Heuristic audit of a project's Claude Code setup.")
    ap.add_argument("--project-root", default=None)
    args = ap.parse_args()
    emit(audit(args.project_root))


if __name__ == "__main__":
    main()
