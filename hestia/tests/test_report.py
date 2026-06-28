"""Tests for report.py — markdown rendering and JSON passthrough.

hestia's report.py reads audit.json from stdin. Letter grade thresholds:
  A >= 0.80, B >= 0.65, C >= 0.50, D >= 0.35, F < 0.35
"""

import json
import subprocess
import sys
from pathlib import Path

import pytest
from conftest import PYTHON, SCRIPTS_DIR


def _render_report(audit: dict, json_mode: bool = False, verbose: bool = False) -> str:
    """Run report.py and return output string."""
    cmd = [PYTHON, str(SCRIPTS_DIR / "report.py")]
    if json_mode:
        cmd.append("--json")
    if verbose:
        cmd.append("--verbose")

    import os
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(
        cmd,
        input=json.dumps(audit),
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        env=env,
    )
    assert result.returncode == 0, f"report.py failed: {result.stderr}"
    return result.stdout


def _make_audit() -> dict:
    """Build a minimal audit.json for testing."""
    return {
        "schema_version": "0.1",
        "project": "/test/project",
        "date": "2026-04-07",
        "methodology": {
            "weights_version": "quality-heuristic-0.1",
        },
        "files_scanned": 2,
        "rules_extracted": 3,
        "effective_corpus_quality": {
            "score": 0.65,
            "grade": "B",
            "methodology": "file-score weighted aggregate",
        },
        "corpus_quality": {
            "rule_mean_score": 0.68,
            "rule_count": 2,
            "note": "diagnostic",
        },
        "guideline_quality": {"score": 0.45, "rule_count": 1},
        "rules": [
            {
                "id": "R001", "file": "CLAUDE.md", "line_start": 3, "line_end": 3,
                "text": "ALWAYS validate user input before processing.",
                "category": "mandate", "loading": "always-loaded",
                "score": 0.874, "pre_floor_score": 0.874, "floor": 1.0, "stale": False,
                "leverage": 0.13,
                "factors": {
                    "F1": {"value": 1.0}, "F2": {"value": 0.85}, "F3": {"value": 0.80},
                    "F4": {"value": 0.95}, "F7": {"value": 0.80},
                    "F8": {"value": 0.70},
                },
                "contributions": {"F1": 0.221, "F2": 0.125, "F3": 0.153, "F4": 0.140, "F7": 0.235},
                "layers": {"clarity": 0.83, "activation": 0.87},
                "dominant_weakness": "F7", "dominant_weakness_gap": 0.40,
                "failure_class": "ambiguity",
                "f8_value": 0.70, "is_hook_candidate": False,
                "degraded": False, "degraded_factors": [],
            },
            {
                "id": "R002", "file": "CLAUDE.md", "line_start": 5, "line_end": 5,
                "text": "Try to prefer functional components when possible.",
                "category": "mandate", "loading": "always-loaded",
                "score": 0.386, "pre_floor_score": 0.386, "floor": 1.0, "stale": False,
                "leverage": 0.61,
                "factors": {
                    "F1": {"value": 0.20}, "F2": {"value": 0.35}, "F3": {"value": 0.25},
                    "F4": {"value": 0.95}, "F7": {"value": 0.35},
                    "F8": {"value": 0.70},
                },
                "contributions": {"F1": 0.044, "F2": 0.051, "F3": 0.048, "F4": 0.140, "F7": 0.103},
                "layers": {"clarity": 0.27, "activation": 0.55},
                "dominant_weakness": "F7", "dominant_weakness_gap": 1.30,
                "failure_class": "ambiguity",
                "f8_value": 0.70, "is_hook_candidate": False,
                "degraded": False, "degraded_factors": [],
            },
            {
                "id": "R003", "file": ".claude/rules/api.md", "line_start": 8, "line_end": 8,
                "text": "Prefer transactions for queries spanning multiple tables.",
                "category": "preference", "loading": "glob-scoped",
                "score": 0.490, "pre_floor_score": 0.490, "floor": 1.0, "stale": False,
                "leverage": None,
                "factors": {
                    "F1": {"value": 0.50}, "F2": {"value": 0.35}, "F3": {"value": 0.60},
                    "F4": {"value": 0.65}, "F7": {"value": 0.40},
                    "F8": {"value": 0.70},
                },
                "contributions": {"F1": 0.110, "F2": 0.051, "F3": 0.115, "F4": 0.096, "F7": 0.118},
                "layers": {"clarity": 0.35, "activation": 0.62},
                "dominant_weakness": "F7", "dominant_weakness_gap": 1.20,
                "failure_class": "ambiguity",
                "f8_value": 0.70, "is_hook_candidate": False,
                "degraded": False, "degraded_factors": [],
            },
        ],
        "files": [
            {
                "path": "CLAUDE.md", "file_score": 0.62, "grade": "C",
                "line_count": 20, "rule_count": 2,
                "length_penalty": 1.0, "prohibition_ratio": 0.0,
                "trigger_scope_coherence": 0.0, "concreteness_coverage": 0.50,
                "dead_zone_count": 0,
            },
            {
                "path": ".claude/rules/api.md", "file_score": 0.45, "grade": "D",
                "line_count": 15, "rule_count": 1,
                "length_penalty": 1.0, "prohibition_ratio": 0.0,
                "trigger_scope_coherence": 0.0, "concreteness_coverage": 0.0,
                "dead_zone_count": 0,
            },
        ],
        "positive_findings": [
            {"file": "CLAUDE.md", "line": 3, "text": "ALWAYS validate user input", "score": 0.874}
        ],
        "rewrite_candidates": [
            {"rule_id": "R002", "score": 0.42, "dominant_weakness": "F7"}
        ],
        "conflicts": [],
        "hook_opportunities": [],
    }


# ---------------------------------------------------------------------------
# Letter grade thresholds
# ---------------------------------------------------------------------------

def _make_audit_with_score(ecq_score: float) -> dict:
    audit = _make_audit()
    audit["effective_corpus_quality"]["score"] = ecq_score
    letter = "A" if ecq_score >= 0.80 else "B" if ecq_score >= 0.65 else "C" if ecq_score >= 0.50 else "D" if ecq_score >= 0.35 else "F"
    audit["effective_corpus_quality"]["grade"] = letter
    return audit


class TestLetterGrade:
    """hestia grade thresholds: A≥0.80, B≥0.65, C≥0.50, D≥0.35, F<0.35."""

    def test_grade_a(self):
        report = _render_report(_make_audit_with_score(0.85))
        assert "Grade: A" in report

    def test_grade_b(self):
        report = _render_report(_make_audit_with_score(0.70))
        assert "Grade: B" in report

    def test_grade_c(self):
        report = _render_report(_make_audit_with_score(0.55))
        assert "Grade: C" in report

    def test_grade_d(self):
        report = _render_report(_make_audit_with_score(0.40))
        assert "Grade: D" in report

    def test_grade_f(self):
        report = _render_report(_make_audit_with_score(0.25))
        assert "Grade: F" in report

    def test_grade_boundary_a_b(self):
        """0.80 → A; 0.799 → B."""
        assert "Grade: A" in _render_report(_make_audit_with_score(0.80))
        assert "Grade: B" in _render_report(_make_audit_with_score(0.799))

    def test_grade_boundary_b_c(self):
        """0.65 → B; 0.649 → C."""
        assert "Grade: B" in _render_report(_make_audit_with_score(0.65))
        assert "Grade: C" in _render_report(_make_audit_with_score(0.649))

    def test_grade_boundary_c_d(self):
        """0.50 → C; 0.499 → D."""
        assert "Grade: C" in _render_report(_make_audit_with_score(0.50))
        assert "Grade: D" in _render_report(_make_audit_with_score(0.499))

    def test_grade_boundary_d_f(self):
        """0.35 → D; 0.349 → F."""
        assert "Grade: D" in _render_report(_make_audit_with_score(0.35))
        assert "Grade: F" in _render_report(_make_audit_with_score(0.349))


# ---------------------------------------------------------------------------
# Markdown sections
# ---------------------------------------------------------------------------

class TestMarkdownSections:
    def test_all_sections_present(self):
        report = _render_report(_make_audit())
        assert "# Hestia Rules Audit" in report
        assert "Grade:" in report

    def test_what_to_fix_section(self):
        report = _render_report(_make_audit())
        assert "What to fix first" in report

    def test_best_rules_section(self):
        report = _render_report(_make_audit())
        assert "best rules" in report.lower() or "Your best" in report

    def test_verbose_sections_present(self):
        report = _render_report(_make_audit(), verbose=True)
        assert "Detailed" in report or "Per-rule" in report or "F1" in report or "F7" in report


# ---------------------------------------------------------------------------
# Failure class summary
# ---------------------------------------------------------------------------

class TestFailureClassSummary:
    def test_summary_appears_for_mandate_rules_with_failure_class(self):
        report = _render_report(_make_audit())
        assert "At-risk rules:" in report
        assert "ambiguity" in report

    def test_summary_counts_mandate_only(self):
        """R003 is preference — must not be counted."""
        report = _render_report(_make_audit())
        assert "2 ambiguity" in report

    def test_summary_hidden_when_no_failure_class(self):
        audit = _make_audit()
        for r in audit["rules"]:
            r["failure_class"] = None
        report = _render_report(audit)
        assert "At-risk rules:" not in report

    def test_summary_groups_by_class(self):
        """Mixed failure classes: drift before ambiguity."""
        audit = _make_audit()
        audit["rules"][0]["dominant_weakness"] = "F3"
        audit["rules"][0]["failure_class"] = "drift"
        report = _render_report(audit)
        assert "At-risk rules:" in report
        at_risk_line = next(ln for ln in report.splitlines() if "At-risk rules:" in ln)
        drift_pos = at_risk_line.find("drift")
        ambiguity_pos = at_risk_line.find("ambiguity")
        assert 0 <= drift_pos < ambiguity_pos


# ---------------------------------------------------------------------------
# Conflict section
# ---------------------------------------------------------------------------

def _make_audit_with_conflicts() -> dict:
    audit = _make_audit()
    audit["conflicts"] = [
        {
            "type": "polarity_mismatch",
            "rule_a": {
                "id": "R001",
                "text": "NEVER edit files in src/main/gen/ directly.",
                "file": "CLAUDE.md",
                "line_start": 5,
                "polarity": "prohibition",
            },
            "rule_b": {
                "id": "R002",
                "text": "Use src/main/gen/ cached results for faster access.",
                "file": ".claude/rules/api.md",
                "line_start": 8,
                "polarity": "positive_imperative",
            },
            "shared_markers": ["src/main/gen/"],
        }
    ]
    return audit


class TestPotentialConflicts:
    def test_section_appears_when_conflicts_present(self):
        report = _render_report(_make_audit_with_conflicts())
        assert "## Potential conflicts" in report

    def test_section_lists_both_rules(self):
        report = _render_report(_make_audit_with_conflicts())
        assert "NEVER edit files in src/main/gen/" in report
        assert "Use src/main/gen/ cached results" in report

    def test_section_names_shared_marker(self):
        report = _render_report(_make_audit_with_conflicts())
        assert "`src/main/gen/`" in report

    def test_section_hidden_when_empty(self):
        report = _render_report(_make_audit())
        assert "## Potential conflicts" not in report

    def test_headline_appears_for_conflicts(self):
        report = _render_report(_make_audit_with_conflicts())
        assert "**Potential conflicts:**" in report
        assert "1 rule pair" in report

    def test_headline_plural_for_multiple(self):
        audit = _make_audit_with_conflicts()
        audit["conflicts"].append(audit["conflicts"][0])
        report = _render_report(audit)
        assert "2 rule pairs" in report


# ---------------------------------------------------------------------------
# Positive findings
# ---------------------------------------------------------------------------

class TestPositiveFindings:
    def test_best_rules_shown(self):
        report = _render_report(_make_audit())
        assert "ALWAYS validate" in report

    def test_best_rules_why_section(self):
        report = _render_report(_make_audit())
        assert "Why it works" in report or "why" in report.lower()


# ---------------------------------------------------------------------------
# Friendly output
# ---------------------------------------------------------------------------

class TestFriendlyOutput:
    def test_no_factor_codes_in_default(self):
        report = _render_report(_make_audit())
        for code in ("F1", "F2", "F3", "F4", "F7", "F8"):
            assert code not in report, f"Factor code {code} found in default output"

    def test_factor_codes_in_verbose(self):
        report = _render_report(_make_audit(), verbose=True)
        assert "F1" in report or "F7" in report


# ---------------------------------------------------------------------------
# Floor display
# ---------------------------------------------------------------------------

class TestFloorDisplay:
    def test_floor_not_shown_when_1(self):
        report = _render_report(_make_audit(), verbose=True)
        assert "Floor: 1.00" not in report

    def test_floor_shown_when_active(self):
        audit = _make_audit()
        audit["rules"][1]["floor"] = 0.50
        audit["rules"][1]["pre_floor_score"] = 0.84
        report = _render_report(audit, verbose=True)
        assert "Floor: 0.50" in report


# ---------------------------------------------------------------------------
# JSON passthrough
# ---------------------------------------------------------------------------

class TestJsonPassthrough:
    def test_json_valid(self):
        output = _render_report(_make_audit(), json_mode=True)
        data = json.loads(output)
        assert data["schema_version"] == "0.1"

    def test_json_preserves_all_fields(self):
        audit = _make_audit()
        output = _render_report(audit, json_mode=True)
        data = json.loads(output)
        assert "effective_corpus_quality" in data
        assert "rules" in data
        assert len(data["rules"]) == 3


# ---------------------------------------------------------------------------
# Hook opportunities
# ---------------------------------------------------------------------------

class TestHookOpportunitiesRender:
    def test_hook_section_when_present(self):
        audit = _make_audit()
        audit["hook_opportunities"] = [{
            "id": "R01", "text": "Run prettier before commit",
            "file": "CLAUDE.md", "line_start": 10,
            "f8_value": 0.20,
            "suggested_enforcement": "Pre-commit hook",
        }]
        report = _render_report(audit)
        assert "## Hook opportunities" in report
        assert "Pre-commit hook" in report

    def test_hook_section_skipped_when_empty(self):
        audit = _make_audit()
        audit["hook_opportunities"] = []
        report = _render_report(audit)
        assert "## Hook opportunities" not in report

    def test_hook_section_missing_key_safe(self):
        audit = _make_audit()
        audit.pop("hook_opportunities", None)
        report = _render_report(audit)
        assert "## Hook opportunities" not in report


# ---------------------------------------------------------------------------
# Folklore section (enforceability dimension)
# ---------------------------------------------------------------------------

def _folklore_finding() -> dict:
    return {
        "severity": "medium", "artifact": "rule",
        "symptom": "rule can't be enforced or self-checked",
        "why": ("an unenforceable rule trains Claude the ruleset contains noise, "
                "discounting the rules that do matter"),
        "fix_action": ("rewrite to name a checkable condition — a command, "
                       "threshold, or concrete construct — or delete it"),
        "file": "CLAUDE.md", "line": "3", "location": "CLAUDE.md:3",
        "advisory": False, "fix": "assess-rules",
        "tags": ["folklore", "quality-word:clean"],
        "rule_id": "R001", "text": "Always write clean, maintainable code.",
        "quality_words": ["clean", "maintainable"],
    }


class TestFolkloreRender:
    def test_folklore_section_when_present(self):
        audit = _make_audit()
        audit["folklore_findings"] = [_folklore_finding()]
        audit["enforceability_counts"] = {"enforceable": 1, "observable": 1, "folklore": 1}
        report = _render_report(audit)
        assert "## Folklore rules (rewrite or delete)" in report
        # Triple-shape surfaces: symptom (count), why, fix_action.
        assert "discounting the rules that do matter" in report
        assert "rewrite to name a checkable condition" in report
        # Evidence (the unverifiable word) and the location are cited.
        assert "`clean`" in report
        assert "CLAUDE.md:3" in report

    def test_folklore_section_skipped_when_empty(self):
        audit = _make_audit()
        audit["folklore_findings"] = []
        report = _render_report(audit)
        assert "## Folklore rules" not in report

    def test_folklore_section_missing_key_safe(self):
        audit = _make_audit()
        audit.pop("folklore_findings", None)
        report = _render_report(audit)
        assert "## Folklore rules" not in report

    def test_enforceability_mix_rendered(self):
        audit = _make_audit()
        audit["folklore_findings"] = [_folklore_finding()]
        audit["enforceability_counts"] = {"enforceable": 4, "observable": 2, "folklore": 1}
        report = _render_report(audit)
        assert "4 enforceable" in report
        assert "2 observable" in report


# ---------------------------------------------------------------------------
# Degraded rule notice
# ---------------------------------------------------------------------------

class TestDegradedRuleNotice:
    def test_degraded_notice_shown(self):
        audit = _make_audit()
        audit["rules"][0]["degraded"] = True
        audit["rules"][0]["degraded_factors"] = ["F3"]
        report = _render_report(audit)
        assert "scored on fewer than all factors" in report
        assert "--verbose" in report

    def test_degraded_notice_plural(self):
        audit = _make_audit()
        audit["rules"][0]["degraded"] = True
        audit["rules"][0]["degraded_factors"] = ["F3"]
        audit["rules"][1]["degraded"] = True
        audit["rules"][1]["degraded_factors"] = ["F8"]
        report = _render_report(audit)
        assert "2 rules were scored" in report

    def test_degraded_notice_absent_for_clean_report(self):
        report = _render_report(_make_audit())
        assert "scored on fewer than all factors" not in report


# ---------------------------------------------------------------------------
# Disclaimer
# ---------------------------------------------------------------------------

class TestDisclaimer:
    def test_disclaimer_present(self):
        report = _render_report(_make_audit())
        assert "how clearly Claude can parse and apply" in report
        assert "Actual compliance depends on factors" in report

    def test_disclaimer_at_end(self):
        report = _render_report(_make_audit())
        pos = report.find("how clearly Claude can parse and apply")
        assert pos > len(report) // 2


# ---------------------------------------------------------------------------
# Limits section (finding contract — Part C)
# ---------------------------------------------------------------------------

class TestLimitsSection:
    def test_limits_section_always_renders(self):
        """The Limits section renders even when the audit carries no `limits`."""
        report = _render_report(_make_audit())
        assert "## Limits — what this run could not check" in report

    def test_limits_section_near_end(self):
        report = _render_report(_make_audit())
        limits_pos = report.find("## Limits")
        fix_pos = report.find("What to fix first")
        assert limits_pos > fix_pos > 0

    def test_limits_renders_emitter_notes(self):
        audit = _make_audit()
        audit["limits"] = [
            {"scope": "rule-extraction", "detail": "Scored 3 rules across 2 files.",
             "residual_risk": "Prose instructions are invisible to the audit."}
        ]
        report = _render_report(audit)
        assert "Scored 3 rules across 2 files." in report
        assert "Residual risk: Prose instructions are invisible" in report

    def test_limits_states_no_conflicts_explicitly(self):
        """Empty conflict result is stated, not silenced."""
        report = _render_report(_make_audit())  # no conflicts
        assert "No potential conflicts surfaced" in report

    def test_limits_states_no_degraded_explicitly(self):
        report = _render_report(_make_audit())  # no degraded rules
        assert "no degraded scores" in report.lower()

    def test_limits_counts_conflicts_when_present(self):
        report = _render_report(_make_audit_with_conflicts())
        # The Limits section names the candidate-pair count.
        limits_block = report[report.find("## Limits"):]
        assert "1 candidate pair" in limits_block


# ---------------------------------------------------------------------------
# Counted facts, no counterfactual (finding contract — Part D)
# ---------------------------------------------------------------------------

class TestNoCounterfactual:
    def test_report_makes_no_improvement_pct_claim(self):
        """The report must never claim a counterfactual improvement percentage."""
        report = _render_report(_make_audit()).lower()
        for phrase in ("improved setup health", "improvement of", "% better",
                       "would improve", "increase health by"):
            assert phrase not in report

    def test_disclaimer_states_counted_not_impact(self):
        report = _render_report(_make_audit())
        assert "observed tallies, not before/after impact" in report


# ---------------------------------------------------------------------------
# Emoji / Unicode encoding
# ---------------------------------------------------------------------------

class TestEmojiEncoding:
    def test_emoji_in_rule_text_does_not_crash(self):
        audit = _make_audit()
        audit["rules"][0]["text"] = "Don't use AI-sounding words: ✅ ✨ 🚀 — avoid these."
        audit["rules"][0]["score"] = 0.30
        report = _render_report(audit)
        assert "AI-sounding words" in report
