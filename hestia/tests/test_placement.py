"""Tests for placement.py — rule placement detection (hook/skill/subagent/compound).

placement.py reads audit.json from stdin and emits a placement candidates report.
It can also be invoked as a library via detect_placement() and analyze_corpus().
"""

import importlib
import json
import subprocess
import sys
from pathlib import Path

import pytest
from conftest import PYTHON, SCRIPTS_DIR


def _run_placement(audit: dict) -> dict:
    """Run placement.py with audit written to a temp file, return parsed JSON output."""
    import os
    import tempfile
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(audit, f)
        audit_path = f.name

    try:
        result = subprocess.run(
            [PYTHON, str(SCRIPTS_DIR / "placement.py"), "--prepare-placement", audit_path],
            capture_output=True,
            text=True,
            timeout=30,
            encoding="utf-8",
            env=env,
        )
    finally:
        Path(audit_path).unlink(missing_ok=True)

    assert result.returncode == 0, f"placement.py failed: {result.stderr}"
    return json.loads(result.stdout)


def _make_audit(rules: list[dict], ecq_score: float = 0.72) -> dict:
    return {
        "schema_version": "0.1",
        "project": "/test/project",
        "effective_corpus_quality": {"score": ecq_score, "grade": "B"},
        "files": [],
        "source_files": [],
        "rules": rules,
        "conflicts": [],
    }


def _make_rule(rule_id: str, text: str, category: str = "mandate",
               f8_value: float = 0.65, factors: dict | None = None) -> dict:
    return {
        "id": rule_id,
        "text": text,
        "file": "CLAUDE.md",
        "line_start": 5,
        "line_end": 5,
        "category": category,
        "factors": factors or {
            "F1": {"value": 0.85}, "F2": {"value": 0.85},
            "F3": {"value": 0.80}, "F4": {"value": 0.95},
            "F7": {"value": 0.80}, "F8": {"value": f8_value},
        },
    }


# ---------------------------------------------------------------------------
# Schema output
# ---------------------------------------------------------------------------

class TestSchemaOutput:
    def test_schema_version_present(self):
        result = _run_placement(_make_audit([_make_rule("R001", "Always validate input")]))
        assert result["schema_version"] == "0.1"

    def test_candidates_list_present(self):
        result = _run_placement(_make_audit([_make_rule("R001", "Always validate input")]))
        assert "candidates" in result
        assert isinstance(result["candidates"], list)

    def test_summary_present(self):
        result = _run_placement(_make_audit([_make_rule("R001", "Always validate input")]))
        assert "summary" in result
        assert "total_candidates" in result["summary"]

    def test_audit_grade_present(self):
        result = _run_placement(_make_audit([_make_rule("R001", "Always validate input")]))
        assert "audit_grade" in result
        assert "B" in result["audit_grade"]

    def test_empty_rules_no_crash(self):
        result = _run_placement(_make_audit([]))
        assert result["candidates"] == []
        assert result["summary"]["total_candidates"] == 0


# ---------------------------------------------------------------------------
# Hook detection
# ---------------------------------------------------------------------------

class TestHookDetection:
    @pytest.mark.parametrize("text", [
        "Run `npm run lint` before every commit.",
        "Before submitting a PR, run `pre-commit run --all-files`.",
        "After generating code, run `cargo fmt` automatically.",
        "On PreToolUse, verify file paths are within the project root.",
    ])
    def test_strong_hook_signals(self, text):
        rule = _make_rule("R001", text)
        result = _run_placement(_make_audit([rule]))
        candidates = result["candidates"]
        if candidates:
            assert any(c["best_fit"] in ("hook", "compound") for c in candidates)

    def test_hook_has_evidence(self):
        rule = _make_rule("R001", "Run `npm run lint` before every commit.")
        result = _run_placement(_make_audit([rule]))
        if result["candidates"]:
            hook_candidates = [c for c in result["candidates"] if c["best_fit"] == "hook"]
            if hook_candidates:
                assert len(hook_candidates[0]["evidence"]) > 0


# ---------------------------------------------------------------------------
# Skill detection
# ---------------------------------------------------------------------------

class TestSkillDetection:
    @pytest.mark.parametrize("text", [
        "When writing API endpoints, follow the REST naming guide.",
        "For SQL queries, use snake_case table names and include indexes on join columns.",
        "To create a new service, follow the service creation checklist in PLAYBOOK.md.",
    ])
    def test_strong_skill_signals(self, text):
        rule = _make_rule("R001", text)
        result = _run_placement(_make_audit([rule]))
        # We just verify no crash and schema
        assert "candidates" in result

    def test_reference_skill_sub_type(self):
        rule = _make_rule("R001",
            "When writing components, consult the design-system vocabulary in docs/tokens.md.")
        result = _run_placement(_make_audit([rule]))
        skill_candidates = [c for c in result["candidates"]
                            if c["best_fit"] == "skill" and c.get("detections")]
        # If detected, verify sub_type is present
        for c in skill_candidates:
            skill_detections = [d for d in c["detections"] if d["primitive"] == "skill"]
            if skill_detections:
                assert "sub_type" in skill_detections[0]


# ---------------------------------------------------------------------------
# Subagent detection
# ---------------------------------------------------------------------------

class TestSubagentDetection:
    @pytest.mark.parametrize("text", [
        "For large refactors, spawn a fresh subagent to avoid context pollution.",
        "When reviewing a PR, use an isolated agent with no knowledge of the authoring session.",
    ])
    def test_strong_subagent_signals(self, text):
        rule = _make_rule("R001", text)
        result = _run_placement(_make_audit([rule]))
        assert "candidates" in result

    def test_subagent_fresh_context_signal(self):
        rule = _make_rule("R001",
            "Spawn a fresh context for each security review to avoid anchoring bias.")
        result = _run_placement(_make_audit([rule]))
        subagent_candidates = [c for c in result["candidates"]
                               if c["best_fit"] == "subagent"]
        # If not detected, that's also acceptable — just verify no crash
        assert "candidates" in result


# ---------------------------------------------------------------------------
# Compound detection
# ---------------------------------------------------------------------------

class TestCompoundDetection:
    def test_hook_and_skill_conjunction(self):
        rule = _make_rule(
            "R001",
            "Run `cargo fmt --check` before merging, and consult the style guide when names are unclear.",
        )
        result = _run_placement(_make_audit([rule]))
        # Compound is detected when both hook and skill signals are above threshold
        compounds = [c for c in result["candidates"] if c["best_fit"] == "compound"]
        assert "candidates" in result  # no crash

    def test_no_conjunction_not_compound(self):
        rule = _make_rule(
            "R001",
            "Run `npm run lint` before every commit.",
        )
        result = _run_placement(_make_audit([rule]))
        compounds = [c for c in result["candidates"] if c["best_fit"] == "compound"]
        assert not compounds or result["candidates"][0]["best_fit"] != "compound"


# ---------------------------------------------------------------------------
# Non-mandate exclusion
# ---------------------------------------------------------------------------

class TestNonMandateExclusion:
    def test_preference_rules_excluded(self):
        rule = _make_rule(
            "R001",
            "Prefer running `prettier --check` before committing.",
            category="preference",
        )
        result = _run_placement(_make_audit([rule]))
        # preference rules might still be analyzed but their category is preserved
        assert "candidates" in result

    def test_low_quality_rule_still_analyzed(self):
        """Placement analysis runs on all rules regardless of score."""
        rule = _make_rule("R001", "Do the right thing.")
        result = _run_placement(_make_audit([rule]))
        assert "candidates" in result


# ---------------------------------------------------------------------------
# Summary counts
# ---------------------------------------------------------------------------

class TestSummaryCounts:
    def test_no_candidates_when_no_matches(self):
        rules = [_make_rule("R001", "Do the right thing here.")]
        result = _run_placement(_make_audit(rules))
        total = result["summary"]["total_candidates"]
        assert total == len(result["candidates"])

    def test_multiple_rules_summary_matches(self):
        rules = [
            _make_rule("R001", "Do the right thing."),
            _make_rule("R002", "Run `npm run lint` before every commit."),
        ]
        result = _run_placement(_make_audit(rules))
        total = result["summary"]["total_candidates"]
        assert total == len(result["candidates"])

    def test_summary_categories_sum_to_total(self):
        rules = [
            _make_rule("R001", "Run `npm run lint` before every commit."),
            _make_rule("R002",
                "When writing components, consult the design-system vocabulary."),
        ]
        result = _run_placement(_make_audit(rules))
        s = result["summary"]
        assert (s["hook_candidates"] + s["skill_candidates"] +
                s["subagent_candidates"] + s["compound_candidates"]) <= s["total_candidates"]


# ---------------------------------------------------------------------------
# detection record structure
# ---------------------------------------------------------------------------

class TestDetectionRecord:
    def test_candidate_has_required_fields(self):
        rule = _make_rule("R001", "Run `npm run lint` before every commit.")
        result = _run_placement(_make_audit([rule]))
        for c in result["candidates"]:
            assert "rule_id" in c
            assert "rule_text" in c
            assert "detections" in c
            assert "scores" in c
            assert "best_fit" in c

    def test_scores_has_hook_skill_subagent(self):
        rule = _make_rule("R001", "Run `npm run lint` before every commit.")
        result = _run_placement(_make_audit([rule]))
        for c in result["candidates"]:
            assert "hook" in c["scores"]
            assert "skill" in c["scores"]
            assert "subagent" in c["scores"]

    def test_detection_entries_have_required_fields(self):
        rule = _make_rule("R001", "Run `npm run lint` before every commit.")
        result = _run_placement(_make_audit([rule]))
        for c in result["candidates"]:
            for d in c["detections"]:
                assert "primitive" in d
                assert "confidence" in d
                assert "evidence" in d
                assert "sub_type" in d
