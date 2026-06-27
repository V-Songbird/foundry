"""Tests for score_semi.py — F3/F8 confidence gating.

hestia's score_semi.py reads a JSON payload from stdin where F3 and F8 have
already been set (by the LLM judgment step) and adds factor_confidence_low
flags for borderline scores.
"""

import pytest
from conftest import run_script


def _score_rule(text: str, f3_value: float | None = 0.55, f8_value: float | None = 0.55) -> dict:
    """Run a single rule through score_semi and return the scored rule.

    Pre-populates F3 and F8 so that should_flag_f3 / should_flag_f8 can fire.
    """
    data = {
        "source_files": [
            {
                "path": "test.md",
                "globs": [],
                "glob_match_count": None,
                "default_category": "mandate",
                "line_count": 10,
                "always_loaded": True,
            }
        ],
        "rules": [
            {
                "id": "R001",
                "file_index": 0,
                "text": text,
                "line_start": 1,
                "line_end": 1,
                "category": "mandate",
                "staleness": {"gated": False, "missing_entities": []},
                "factors": {
                    "F1": {"value": 0.85, "method": "lookup"},
                    "F2": {"value": 0.85, "method": "classify"},
                    "F4": {"value": 0.95, "method": "glob_match"},
                    "F3": {"value": f3_value, "level": 2, "method": "judgment"},
                    "F8": {"value": f8_value, "level": 2, "method": "judgment"},
                },
            }
        ],
    }
    result = run_script("score_semi.py", stdin_data=data)
    return result["rules"][0]


# ---------------------------------------------------------------------------
# F3: Confidence gating
# ---------------------------------------------------------------------------

class TestF3ConfidenceGating:
    def test_borderline_f3_flagged(self):
        """F3 value in borderline range → flag added."""
        rule = _score_rule("Use strict TypeScript", f3_value=0.55)
        flags = rule.get("factor_confidence_low", [])
        assert "F3" in flags

    def test_clear_f3_not_flagged(self):
        """F3 value clearly above borderline range → no flag."""
        rule = _score_rule("Use strict TypeScript", f3_value=0.90)
        flags = rule.get("factor_confidence_low", [])
        assert "F3" not in flags

    def test_clear_low_f3_not_flagged(self):
        """F3 value clearly below borderline range → no flag."""
        rule = _score_rule("Use strict TypeScript", f3_value=0.10)
        flags = rule.get("factor_confidence_low", [])
        assert "F3" not in flags

    def test_f3_none_flagged(self):
        """F3 value of None → flag added (uncertain)."""
        rule = _score_rule("Use strict TypeScript", f3_value=None)
        flags = rule.get("factor_confidence_low", [])
        assert "F3" in flags


# ---------------------------------------------------------------------------
# F8: Confidence gating
# ---------------------------------------------------------------------------

class TestF8ConfidenceGating:
    def test_borderline_f8_flagged(self):
        """F8 value in borderline range → flag added."""
        rule = _score_rule("Use strict TypeScript", f8_value=0.55)
        flags = rule.get("factor_confidence_low", [])
        assert "F8" in flags

    def test_clear_f8_not_flagged(self):
        """F8 value clearly above borderline range → no flag."""
        rule = _score_rule("Use strict TypeScript", f8_value=0.90)
        flags = rule.get("factor_confidence_low", [])
        assert "F8" not in flags

    def test_f8_none_flagged(self):
        """F8 value of None → flag added (uncertain)."""
        rule = _score_rule("Use strict TypeScript", f8_value=None)
        flags = rule.get("factor_confidence_low", [])
        assert "F8" in flags


# ---------------------------------------------------------------------------
# Pipeline integration
# ---------------------------------------------------------------------------

class TestPipelineIntegration:
    def test_prior_factors_preserved(self):
        """score_semi.py must not drop factors set by prior pipeline steps."""
        rule = _score_rule("ALWAYS validate input")
        assert "F1" in rule["factors"]
        assert "F2" in rule["factors"]
        assert "F4" in rule["factors"]

    def test_schema_carried_forward(self):
        """Top-level extra fields must survive the pass-through."""
        data = {
            "custom_field": "preserved",
            "source_files": [
                {"path": "test.md", "globs": [], "glob_match_count": None,
                 "default_category": "mandate", "line_count": 10, "always_loaded": True}
            ],
            "rules": [{
                "id": "R001", "file_index": 0, "text": "Always test",
                "line_start": 1, "line_end": 1, "category": "mandate",
                "staleness": {"gated": False, "missing_entities": []},
                "factors": {
                    "F1": {"value": 0.85}, "F2": {"value": 0.85}, "F4": {"value": 0.95},
                    "F3": {"value": 0.55, "level": 2, "method": "judgment"},
                    "F8": {"value": 0.55, "level": 2, "method": "judgment"},
                },
            }],
        }
        result = run_script("score_semi.py", stdin_data=data)
        assert result.get("custom_field") == "preserved"

    def test_no_crash_when_no_f3_f8(self):
        """score_semi.py must not crash when F3/F8 are absent from factors."""
        data = {
            "source_files": [
                {"path": "test.md", "globs": [], "glob_match_count": None,
                 "default_category": "mandate", "line_count": 10, "always_loaded": True}
            ],
            "rules": [{
                "id": "R001", "file_index": 0, "text": "Always test",
                "line_start": 1, "line_end": 1, "category": "mandate",
                "staleness": {"gated": False, "missing_entities": []},
                "factors": {"F1": {"value": 0.85}, "F2": {"value": 0.85}, "F4": {"value": 0.95}},
            }],
        }
        result = run_script("score_semi.py", stdin_data=data)
        assert "rules" in result
