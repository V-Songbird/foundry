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
import freshness_state as fresh_mod
import refs as refs_mod
from _lib import Finding, emit, limit_note, rank_findings, read_text

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
    limits: list[dict] = []
    skipped_cleared: list[dict] = []  # surfaces skipped because inputs unchanged

    # Derive staleness from the cheap signal of the LAST checkup (commits/age
    # since then). We never stored a grade — the label is computed here, once,
    # via the one formula in freshness_state. Reported as honesty, not a verdict.
    staleness = fresh_mod.staleness_for(root)

    # 1. No CLAUDE.md at all — Claude has no project memory.
    # File-level finding: the locator is the path Hestia would create. cite-or-drop
    # is satisfied by `file` even though there is no line to point at.
    project_md = [c for c in art["claude_md"] if c.get("scope") in ("project", "project-dot")]
    if not art["claude_md"]:
        findings.append(Finding.cited(
            severity="high", artifact="claude-md",
            symptom="No CLAUDE.md found",
            why="Claude has no always-on project memory, so every session starts cold on your build/test commands and conventions.",
            fix_action="Add a short CLAUDE.md at the project root with build/test commands and key conventions.",
            file="CLAUDE.md",
            fix="onboarding", tags=["missing"]))

    # 2. Oversized project-scope CLAUDE.md.
    for c in project_md:
        if c["lines"] > CLAUDE_MD_SOFT_MAX:
            findings.append(Finding.cited(
                severity="medium", artifact="claude-md",
                symptom=f"CLAUDE.md is long ({c['lines']} lines)",
                why="Long instruction files dilute attention — Claude weights every line less when there are too many.",
                fix_action=f"Trim under {CLAUDE_MD_SOFT_MAX} lines; move path-scoped detail into .claude/rules/ so it loads only when relevant.",
                file=c["path"], fix="assess-rules", tags=["size"]))

    # 3. Broken path references in CLAUDE.md and rules (the classic staleness
    # signal). This is the most expensive surface — it reads every instruction
    # file's text. Negative invariant: if this surface was previously cleared
    # under the same input-signature (no instruction file added, edited, renamed,
    # or removed), skip the re-scan and report the honest counted fact instead.
    ref_inputs = [str(root / c["path"]) for c in art["claude_md"] + art["rules"]]
    ref_surface = "broken-refs"
    ref_sig = fresh_mod.surface_signature(ref_inputs)
    if fresh_mod.is_cleared(root, ref_surface, ref_sig):
        rec = fresh_mod.cleared_record(root, ref_surface) or {}
        skipped_cleared.append({
            "surface": ref_surface,
            "verified_ts": rec.get("ts"),
            "verified_sha": rec.get("sha"),
            "inputs": len(ref_inputs),
        })
    else:
        ref_findings_before = len(findings)
        for c in art["claude_md"] + art["rules"]:
            broken = refs_mod.broken_refs(root / c["path"], root)
            if broken:
                shown = ", ".join(broken[:6]) + (" …" if len(broken) > 6 else "")
                findings.append(Finding.cited(
                    severity="high", artifact="reference",
                    symptom=f"{len(broken)} reference(s) point to missing files",
                    why="Stale references quietly mislead Claude — it follows a path that no longer exists.",
                    fix_action=f"Update or remove the broken refs: {shown}",
                    file=c["path"], fix="freshness", tags=["stale"]))
        # Record the negative invariant: clean -> remember the signature so the
        # next run can skip; dirty -> drop any stale cleared record.
        if len(findings) == ref_findings_before:
            fresh_mod.record_cleared(root, ref_surface, ref_sig)
        else:
            fresh_mod.clear_surface(root, ref_surface)

    # 4. Agents missing frontmatter name/description.
    for a in art["agents"]:
        fm = parse_frontmatter(read_text(root / a["path"]))
        if fm is None:
            findings.append(Finding.cited(
                severity="high", artifact="agent",
                symptom="Agent has no frontmatter",
                why="Without YAML frontmatter (name + description), Claude can't reliably discover or dispatch this agent.",
                fix_action="Add a YAML frontmatter block with at least `name` and `description`.",
                file=a["path"], fix="scribe", tags=["frontmatter"]))
        elif not fm.get("name") or not fm.get("description"):
            missing = " and ".join(k for k in ("name", "description") if not fm.get(k))
            findings.append(Finding.cited(
                severity="medium", artifact="agent",
                symptom=f"Agent frontmatter missing {missing}",
                why="The description is what makes Claude pick the agent at the right moment.",
                fix_action=f"Add the missing frontmatter field(s): {missing}.",
                file=a["path"], fix="scribe", tags=["frontmatter"]))

    # 5. Oversized SKILL.md bodies.
    for s in art["skills"]:
        if s["lines"] > SKILL_SOFT_MAX:
            findings.append(Finding.cited(
                severity="medium", artifact="skill",
                symptom=f"SKILL.md is long ({s['lines']} lines)",
                why="A bloated SKILL.md body stops being a clean orchestrator and buries the steps Claude needs.",
                fix_action=f"Trim under {SKILL_SOFT_MAX} lines; move payloads and references into sibling files.",
                file=s["path"], fix="scribe", tags=["size"]))

    # 6. Unparseable settings / mcp config.
    for bad in inv["hooks"].get("parse_errors", []):
        findings.append(Finding.cited(
            severity="medium", artifact="hook",
            symptom="settings file is not valid JSON",
            why="Hooks and permissions in this file are being ignored entirely until the JSON parses.",
            fix_action="Fix the JSON syntax error so the settings file loads.",
            file=bad, fix="scribe", tags=["parse"]))
    if inv["mcp"].get("parse_error"):
        findings.append(Finding.cited(
            severity="medium", artifact="mcp",
            symptom=".mcp.json is not valid JSON",
            why="MCP servers declared here are being ignored until the JSON parses.",
            fix_action="Fix the JSON syntax error in .mcp.json.",
            file=inv["mcp"].get("path", ".mcp.json"), fix="scribe", tags=["parse"]))

    # --- Part C: honest limits — what this heuristic floor could NOT check ---
    limits.append(limit_note(
        "rule-quality",
        "Heuristic scan only — rule clarity/scoring (grades, weak verbs, triggers) "
        "is NOT graded here. Run /hestia:assess-rules for the model-judged pass.",
        residual_risk="A rule can parse fine and still be vague or unenforceable."))
    limits.append(limit_note(
        "references",
        "Reference checks are conservative: only path-like tokens (./ ../ ~/ "
        ".claude/ or slash+extension), @imports, and relative markdown links are "
        "verified. Prose mentions of files and external URLs are not checked.",
        residual_risk="A renamed concept referred to in prose won't be flagged."))
    limits.append(limit_note(
        "scope",
        "Read-only structural scan: file presence, sizes, frontmatter, and JSON "
        "validity. It does not run hooks, execute MCP servers, or evaluate "
        "whether your instructions are correct for this project."))

    # A skipped-because-cleared surface is a COUNTED FACT, not a limit — it was
    # verified clean and its inputs are unchanged. Surface it honestly so the
    # report can say "clean, inputs unchanged since <when>" rather than silently
    # dropping it. (Genuinely unverifiable things stay in `limits` above.)
    for sk in skipped_cleared:
        when = sk.get("verified_ts") or "a previous run"
        limits.append(limit_note(
            "freshness-skip",
            f"Surface '{sk['surface']}' skipped: {sk['inputs']} input file(s) "
            f"unchanged since verified clean at {when}. Re-scanned automatically "
            f"once any of those files changes.",
            residual_risk="Skipped on file size/mtime/path signature, not content "
            "hash; a same-size, same-mtime edit would not be detected."))

    ranked = rank_findings(findings)
    counts = {sev: 0 for sev in ("high", "medium", "low", "info")}
    for f in ranked:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1

    near_empty = not art["claude_md"] and not art["rules"] and not art["agents"] and not art["skills"]

    # Persist ONLY the cheap signal (HEAD SHA + timestamp) so the NEXT run can
    # derive its own staleness. No grade is ever stored. Skipped for near-empty
    # onboarding setups (nothing was really audited).
    if not near_empty:
        fresh_mod.record_checkup(root)

    return {
        "status": "ok",
        "project_root": str(root),
        "stack": inv["stack"],
        "summary": inv["summary"],
        "near_empty": near_empty,
        # Derived at read-time from the LAST checkup's cheap signal — a label,
        # never a stored grade. {label, commits, days, reason, last_sha, last_ts}.
        "staleness": staleness,
        # Surfaces skipped this run because their inputs were unchanged since
        # last verified clean (negative invariants). Counted facts, not limits.
        "skipped_cleared": skipped_cleared,
        # Counted facts only — these are observed tallies, never a counterfactual
        # impact estimate (there is no baseline for the un-fixed alternative).
        "counts": counts,
        "findings": ranked,
        "limits": limits,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Heuristic audit of a project's Claude Code setup.")
    ap.add_argument("--project-root", default=None)
    args = ap.parse_args()
    emit(audit(args.project_root))


if __name__ == "__main__":
    main()
