"""Generate a JSON overview of the rule corpus with intention map, coverage gaps, and suggestions.

Reads audit.json (or overview_data.json bundling audit + intention analysis),
cross-references examples.json from _data/ for coverage gap suggestions,
and emits a JSON document with {intention_map, coverage_gaps, suggestions}.

Usage:
    python generate_overview.py --input overview_data.json [--output overview.json]
    python generate_overview.py --input overview_data.json  # writes to stdout
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent))
import _lib

# ---------------------------------------------------------------------------
# Grade thresholds
# ---------------------------------------------------------------------------

_LETTER_GRADES = [(0.80, "A"), (0.65, "B"), (0.50, "C"), (0.35, "D")]


def _letter_grade(score: float) -> str:
    """Map a 0.0-1.0 quality score to a letter grade."""
    for threshold, grade in _LETTER_GRADES:
        if score >= threshold:
            return grade
    return "F"


# ---------------------------------------------------------------------------
# Intention map builder
# ---------------------------------------------------------------------------

def _build_intention_map(audit: dict, intentions: list[dict]) -> list[dict]:
    """Merge audit rule data with intention themes from the analysis layer."""
    rules = audit.get("rules", [])
    mandate_rules = [r for r in rules if r.get("category") == "mandate"]

    # Build a rule-id → rule lookup for annotation.
    rules_by_id = {r.get("id"): r for r in rules}

    # If the caller already provided intention data (from an LLM analysis pass),
    # enrich each theme with grade distribution across its member rules.
    if intentions:
        enriched = []
        for item in intentions:
            theme = item.get("theme", "")
            rule_ids = item.get("rule_ids", [])
            theme_rules = [rules_by_id[rid] for rid in rule_ids if rid in rules_by_id]
            scores = [r.get("score", 0) for r in theme_rules if r.get("score") is not None]
            avg_score = (sum(scores) / len(scores)) if scores else 0.0
            grade_dist: dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
            for s in scores:
                grade_dist[_letter_grade(s)] += 1
            enriched.append({
                "theme": theme,
                "count": len(theme_rules),
                "avg_grade": _letter_grade(avg_score),
                "avg_score": round(avg_score, 3),
                "grade_distribution": grade_dist,
                "rule_ids": rule_ids,
            })
        return enriched

    # Fallback: synthesize intent groups from dominant_weakness patterns when
    # no intention analysis was provided. Groups by weakness type.
    weakness_groups: dict[str, list[dict]] = {}
    for r in mandate_rules:
        dw = r.get("dominant_weakness") or "none"
        weakness_groups.setdefault(dw, []).append(r)

    _WEAKNESS_THEME_NAMES = {
        "F1": "Weak verb — unclear enforceability",
        "F2": "Prohibition phrasing — hard to follow",
        "F3": "Missing trigger context",
        "F4": "Scoping mismatch",
        "F7": "Vague — needs examples",
        "none": "Well-formed rules",
    }

    synthesized = []
    for weakness, group in sorted(weakness_groups.items(), key=lambda kv: -len(kv[1])):
        scores = [r.get("score", 0) for r in group if r.get("score") is not None]
        avg_score = (sum(scores) / len(scores)) if scores else 0.0
        grade_dist: dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
        for s in scores:
            grade_dist[_letter_grade(s)] += 1
        synthesized.append({
            "theme": _WEAKNESS_THEME_NAMES.get(weakness, f"Weakness: {weakness}"),
            "count": len(group),
            "avg_grade": _letter_grade(avg_score),
            "avg_score": round(avg_score, 3),
            "grade_distribution": grade_dist,
            "rule_ids": [r.get("id") for r in group],
        })
    return synthesized


# ---------------------------------------------------------------------------
# Coverage gap detection
# ---------------------------------------------------------------------------

_EXAMPLE_DETECTORS: list[dict] | None = None


def _load_example_detectors() -> list[dict]:
    """Load detector patterns from examples.json (compiled once)."""
    global _EXAMPLE_DETECTORS
    if _EXAMPLE_DETECTORS is not None:
        return _EXAMPLE_DETECTORS
    data = _lib.load_data("examples")
    detectors = []
    for d in data.get("detectors", []):
        compiled: dict = {
            "name": d["name"],
            "weight": d.get("weight", 1.0),
            "description": d.get("description", ""),
        }
        if "pattern" in d:
            compiled["pattern"] = re.compile(d["pattern"], re.IGNORECASE | re.DOTALL)
        elif "patterns" in d:
            compiled["patterns"] = [re.compile(p, re.IGNORECASE) for p in d["patterns"]]
        detectors.append(compiled)
    _EXAMPLE_DETECTORS = detectors
    return _EXAMPLE_DETECTORS


def _rule_example_density(text: str) -> float:
    """Score a rule's example density using detectors from examples.json."""
    detectors = _load_example_detectors()
    total_weight = 0.0
    for d in detectors:
        if "pattern" in d:
            if d["pattern"].search(text):
                total_weight += d["weight"]
        elif "patterns" in d:
            if any(p.search(text) for p in d["patterns"]):
                total_weight += d["weight"]
    return total_weight


def _build_coverage_gaps(audit: dict, intention_map: list[dict]) -> list[str]:
    """Identify coverage areas that lack well-formed rules."""
    rules = audit.get("rules", [])
    mandate_rules = [r for r in rules if r.get("category") == "mandate"]
    gaps: list[str] = []

    # Gap 1: themes where all rules grade D or F.
    for entry in intention_map:
        dist = entry.get("grade_distribution", {})
        good = dist.get("A", 0) + dist.get("B", 0) + dist.get("C", 0)
        bad = dist.get("D", 0) + dist.get("F", 0)
        if bad > 0 and good == 0:
            gaps.append(
                f"Theme \"{entry['theme']}\" has {bad} rule(s) grading D or F with none above C — "
                "rewrite or replace these rules."
            )

    # Gap 2: files with zero mandate rules.
    files = audit.get("files", [])
    for f in files:
        if f.get("rule_count", 0) == 0:
            gaps.append(f"File {f.get('path', '?')} has no rules — consider adding at least one mandate.")

    # Gap 3: rules with very low example density (F6 proxy via examples.json detectors).
    low_example_rules = [
        r for r in mandate_rules
        if r.get("score", 0) < 0.65 and _rule_example_density(r.get("text", "")) < 0.5
    ]
    if low_example_rules:
        count = len(low_example_rules)
        gaps.append(
            f"{count} rule(s) score below B and lack concrete examples — "
            "adding an 'e.g.' or inline code sample typically lifts the score."
        )

    # Gap 4: no glob-scoped rules when source files are present.
    source_files = audit.get("source_files", [])
    scoped = [sf for sf in source_files if sf.get("globs") and not sf.get("always_loaded")]
    if not scoped and len(source_files) > 1:
        gaps.append(
            "No glob-scoped rules found — rules that only apply to specific file types "
            "should live in .claude/rules/ with glob matchers so they load only when relevant."
        )

    return gaps


# ---------------------------------------------------------------------------
# Suggestions builder
# ---------------------------------------------------------------------------

def _build_suggestions(audit: dict, coverage_gaps: list[str], intention_map: list[dict]) -> list[dict]:
    """Produce actionable suggestions ranked by expected impact."""
    rules = audit.get("rules", [])
    mandate_rules = [r for r in rules if r.get("category") == "mandate"]
    suggestions: list[dict] = []

    # Suggestion: rewrite the worst-scoring rules.
    f_rules = sorted(
        [r for r in mandate_rules if _letter_grade(r.get("score", 0)) == "F"],
        key=lambda r: r.get("score", 0),
    )
    if f_rules:
        ids = [r.get("id") for r in f_rules[:3]]
        suggestions.append({
            "type": "rewrite",
            "priority": "high",
            "summary": f"Rewrite {len(f_rules)} F-grade rule(s) — start with {', '.join(str(i) for i in ids)}.",
            "rule_ids": [r.get("id") for r in f_rules],
        })

    # Suggestion: add examples to low-density rules.
    low_example = [
        r for r in mandate_rules
        if r.get("score", 0) >= 0.35 and _rule_example_density(r.get("text", "")) < 0.5
    ]
    if low_example:
        suggestions.append({
            "type": "add_examples",
            "priority": "medium",
            "summary": (
                f"Add concrete examples (e.g., inline code or 'e.g.,') to {len(low_example)} "
                "rule(s) — this is the fastest single-edit score improvement."
            ),
            "rule_ids": [r.get("id") for r in low_example[:10]],
        })

    # Suggestion: convert prohibition-phrased rules.
    prohibition_rules = [
        r for r in mandate_rules
        if (r.get("factors", {}).get("F2", {}).get("value") or 0) < 0.40
    ]
    if prohibition_rules:
        suggestions.append({
            "type": "rephrase_prohibition",
            "priority": "medium",
            "summary": (
                f"Rephrase {len(prohibition_rules)} rule(s) from prohibition form "
                "(\"don't X\") to positive form (\"do Y instead\") — Claude follows "
                "positive directives more reliably."
            ),
            "rule_ids": [r.get("id") for r in prohibition_rules[:10]],
        })

    # Suggestion: coverage gaps as informational entries.
    for gap in coverage_gaps:
        suggestions.append({
            "type": "coverage_gap",
            "priority": "low",
            "summary": gap,
            "rule_ids": [],
        })

    return suggestions


# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------

def generate(data: dict) -> dict:
    """Build the overview JSON from overview_data dict."""
    audit = data.get("audit", {})
    intentions_raw = data.get("intentions", [])

    intention_map = _build_intention_map(audit, intentions_raw)
    coverage_gaps = _build_coverage_gaps(audit, intention_map)
    suggestions = _build_suggestions(audit, coverage_gaps, intention_map)

    return {
        "intention_map": intention_map,
        "coverage_gaps": coverage_gaps,
        "suggestions": suggestions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a JSON overview from overview_data.json."
    )
    parser.add_argument(
        "--input", required=True,
        help="Path to overview_data.json",
    )
    parser.add_argument(
        "--output", default=None,
        help="Path for the output JSON file (default: stdout)",
    )
    args = parser.parse_args()

    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    result = generate(data)

    if args.output:
        Path(args.output).write_text(
            json.dumps(result, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    else:
        _lib.emit(result)


if __name__ == "__main__":
    main()
