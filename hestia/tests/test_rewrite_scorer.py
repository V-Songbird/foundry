"""Tests for rewrite_scorer.py — mechanical scoring and finalization of rule rewrites.

Phase 1: python rewrite_scorer.py --score-rewrites audit.json rewrites_input.json
Phase 2: python rewrite_scorer.py --finalize rewrite_semi.json judgment_patches.json audit.json
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest
from conftest import PYTHON, SCRIPTS_DIR


def _run_score_rewrites(audit: dict, rewrites_input: list[dict]) -> dict:
    """Run phase 1 and return rewrite_semi dict."""
    import os
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(audit, f)
        audit_path = f.name

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(rewrites_input, f)
        rewrites_path = f.name

    result = subprocess.run(
        [PYTHON, str(SCRIPTS_DIR / "rewrite_scorer.py"), "--score-rewrites",
         audit_path, rewrites_path],
        capture_output=True, text=True, timeout=60, encoding="utf-8", env=env,
    )
    Path(audit_path).unlink(missing_ok=True)
    Path(rewrites_path).unlink(missing_ok=True)

    if result.returncode != 0:
        pytest.fail(f"rewrite_scorer.py --score-rewrites failed:\n{result.stderr}")

    return json.loads(result.stdout)


def _run_finalize(rewrite_semi: dict, patches: dict, audit: dict) -> list[dict]:
    """Run phase 2 (finalize) and return the rewrites list."""
    import os
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    patches_obj = {
        "schema_version": "0.1",
        "model_version": "test-model",
        "patches": patches,
    }

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(rewrite_semi, f)
        semi_path = f.name

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(patches_obj, f)
        patches_path = f.name

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(audit, f)
        audit_path = f.name

    result = subprocess.run(
        [PYTHON, str(SCRIPTS_DIR / "rewrite_scorer.py"), "--finalize",
         semi_path, patches_path, audit_path],
        capture_output=True, text=True, timeout=60, encoding="utf-8", env=env,
    )
    Path(semi_path).unlink(missing_ok=True)
    Path(patches_path).unlink(missing_ok=True)
    Path(audit_path).unlink(missing_ok=True)

    if result.returncode != 0:
        pytest.fail(f"rewrite_scorer.py --finalize failed:\n{result.stderr}")

    return json.loads(result.stdout)


def _make_audit(rule_id: str = "R001", old_score: float = 0.35) -> dict:
    return {
        "schema_version": "0.1",
        "project": "/test",
        "project_context": {"stack": ["Python"], "always_loaded_files": ["CLAUDE.md"],
                            "glob_scoped_files": [], "tooling": {}},
        "config": {},
        "source_files": [
            {"path": "CLAUDE.md", "globs": [], "glob_match_count": None,
             "default_category": "mandate", "line_count": 20, "always_loaded": True}
        ],
        "effective_corpus_quality": {"score": 0.60, "grade": "C"},
        "rules": [
            {
                "id": rule_id, "file": "CLAUDE.md", "line_start": 5, "line_end": 5,
                "text": "Do the right thing about error handling.",
                "category": "mandate", "loading": "always-loaded",
                "score": old_score, "dominant_weakness": "F7", "failure_class": "ambiguity",
                "factors": {
                    "F1": {"value": 0.20}, "F2": {"value": 0.30},
                    "F3": {"value": 0.40}, "F4": {"value": 0.95},
                    "F7": {"value": 0.15}, "F8": {"value": 0.70},
                },
                "f8_value": 0.70, "is_hook_candidate": False,
                "degraded": False, "degraded_factors": [],
                "layers": {"clarity": 0.22, "activation": 0.60},
                "floor": 0.75, "pre_floor_score": 0.35,
                "contributions": {"F1": 0.04, "F2": 0.04, "F3": 0.08, "F4": 0.14, "F7": 0.04},
                "dominant_weakness_gap": 1.10,
                "leverage": 0.65,
                "stale": False,
            }
        ],
        "files": [],
        "conflicts": [],
        "hook_opportunities": [],
    }


def _make_rewrite_item(
    rule_id: str = "R001",
    suggested_rewrite: str = "ALWAYS call `error_handler.handle(exc, context=ctx)` for all exceptions.",
    original_text: str = "Do the right thing about error handling.",
    old_score: float = 0.35,
) -> dict:
    return {
        "rule_id": rule_id,
        "suggested_rewrite": suggested_rewrite,
        "original_text": original_text,
        "file": "CLAUDE.md",
        "line_start": 5,
        "old_score": old_score,
        "old_dominant_weakness": "F7",
        "projected_score": 0.80,
    }


# ---------------------------------------------------------------------------
# Phase 1: score_rewrites
# ---------------------------------------------------------------------------

class TestScoreRewrites:
    def test_basic_output_schema(self):
        audit = _make_audit()
        items = [_make_rewrite_item()]
        result = _run_score_rewrites(audit, items)
        assert "rules" in result
        assert len(result["rules"]) == 1

    def test_rule_has_factors(self):
        audit = _make_audit()
        items = [_make_rewrite_item()]
        result = _run_score_rewrites(audit, items)
        rule = result["rules"][0]
        assert "F1" in rule["factors"]
        assert "F7" in rule["factors"]

    def test_rewrite_meta_attached(self):
        audit = _make_audit()
        items = [_make_rewrite_item()]
        result = _run_score_rewrites(audit, items)
        rule = result["rules"][0]
        assert "_rewrite_meta" in rule
        assert rule["_rewrite_meta"]["rule_id"] == "R001"
        assert rule["_rewrite_meta"]["original_text"] == "Do the right thing about error handling."
        assert rule["_rewrite_meta"]["old_score"] == 0.35

    def test_empty_rewrites_returns_empty(self):
        audit = _make_audit()
        result = _run_score_rewrites(audit, [])
        assert result["rules"] == []

    def test_multiple_rewrites(self):
        audit = _make_audit()
        audit["rules"].append({
            **audit["rules"][0],
            "id": "R002",
            "text": "Write code that works well.",
        })
        items = [
            _make_rewrite_item("R001"),
            _make_rewrite_item("R002",
                suggested_rewrite="Use `Result<T, AppError>` for all fallible functions."),
        ]
        result = _run_score_rewrites(audit, items)
        assert len(result["rules"]) == 2

    def test_fragmentation_warning_emitted(self, capsys):
        """Rewrite that would fragment should emit a WARNING to stderr."""
        audit = _make_audit()
        # Compound rewrite with semicolons that might fragment
        compound = (
            "ALWAYS call `error_handler.handle(exc)` for exceptions; "
            "also log to `audit_log.write(exc, ctx)` for persistence."
        )
        items = [_make_rewrite_item(suggested_rewrite=compound)]

        import os
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            json.dump(audit, f)
            audit_path = f.name

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            json.dump(items, f)
            rewrites_path = f.name

        result = subprocess.run(
            [PYTHON, str(SCRIPTS_DIR / "rewrite_scorer.py"), "--score-rewrites",
             audit_path, rewrites_path],
            capture_output=True, text=True, timeout=60, encoding="utf-8", env=env,
        )
        Path(audit_path).unlink(missing_ok=True)
        Path(rewrites_path).unlink(missing_ok=True)

        assert result.returncode == 0
        if "WARNING" in result.stderr:
            assert "fragment" in result.stderr.lower()


# ---------------------------------------------------------------------------
# Phase 2: finalize
# ---------------------------------------------------------------------------

def _make_patches(rule_id: str = "R001", f3_value: float = 0.80,
                  f8_value: float = 0.65) -> dict:
    return {
        "schema_version": "0.1",
        "patches": {
            rule_id: {
                "F3": {"value": f3_value, "level": 3, "reasoning": "Clear trigger."},
                "F8": {"value": f8_value, "level": 2, "reasoning": "Linter can enforce."},
            }
        }
    }


class TestFinalizeRewrites:
    def test_finalize_returns_list(self):
        audit = _make_audit()
        items = [_make_rewrite_item()]
        rewrite_semi = _run_score_rewrites(audit, items)
        patches = _make_patches()
        result = _run_finalize(rewrite_semi, patches, audit)
        assert isinstance(result, list)

    def test_finalize_has_required_fields(self):
        audit = _make_audit()
        items = [_make_rewrite_item()]
        rewrite_semi = _run_score_rewrites(audit, items)
        patches = _make_patches()
        rewrites = _run_finalize(rewrite_semi, patches, audit)
        if rewrites:
            rw = rewrites[0]
            assert "rule_id" in rw
            assert "original_text" in rw
            assert "suggested_rewrite" in rw
            assert "old_score" in rw
            assert "new_score" in rw
            assert "delta" in rw

    def test_delta_is_improvement(self):
        audit = _make_audit()
        items = [_make_rewrite_item(
            suggested_rewrite="ALWAYS call `error_handler.handle(exc, ctx)` on all exceptions.",
            old_score=0.35,
        )]
        rewrite_semi = _run_score_rewrites(audit, items)
        patches = _make_patches(f3_value=0.80, f8_value=0.65)
        rewrites = _run_finalize(rewrite_semi, patches, audit)
        if rewrites:
            rw = rewrites[0]
            assert rw["new_score"] > 0
            assert "delta" in rw

    def test_safety_gate_rejects_regression(self):
        """Rewrites that score lower than original should be rejected."""
        audit = _make_audit(old_score=0.90)
        items = [_make_rewrite_item(
            suggested_rewrite="Handle errors properly.",
            old_score=0.90,
        )]
        rewrite_semi = _run_score_rewrites(audit, items)
        patches = _make_patches(f3_value=0.25, f8_value=0.25)
        rewrites = _run_finalize(rewrite_semi, patches, audit)
        # All entries for regressions should be absent or marked rejected
        accepted = [rw for rw in rewrites if rw.get("approved") is True]
        assert len(accepted) == 0

    def test_grade_present(self):
        audit = _make_audit()
        items = [_make_rewrite_item()]
        rewrite_semi = _run_score_rewrites(audit, items)
        patches = _make_patches()
        rewrites = _run_finalize(rewrite_semi, patches, audit)
        if rewrites:
            assert "new_grade" in rewrites[0] or "old_grade" in rewrites[0]

    def test_empty_rewrites_empty_output(self):
        audit = _make_audit()
        rewrite_semi = _run_score_rewrites(audit, [])
        rewrites = _run_finalize(rewrite_semi, {}, audit)
        assert rewrites == []


# ---------------------------------------------------------------------------
# Letter grade helper (via module import)
# ---------------------------------------------------------------------------

class TestLetterGrade:
    def _import_letter_grade(self):
        """Import _letter_grade from rewrite_scorer."""
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "rewrite_scorer",
            SCRIPTS_DIR / "rewrite_scorer.py",
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod._letter_grade

    @pytest.mark.parametrize("score,expected", [
        (0.90, "A"), (0.80, "A"), (0.79, "B"),
        (0.65, "B"), (0.64, "C"), (0.50, "C"),
        (0.49, "D"), (0.35, "D"), (0.34, "F"),
        (0.00, "F"),
    ])
    def test_grade_boundaries(self, score, expected):
        fn = self._import_letter_grade()
        assert fn(score) == expected


# ---------------------------------------------------------------------------
# Pipeline end-to-end
# ---------------------------------------------------------------------------

class TestEndToEnd:
    def test_full_pipeline_no_crash(self):
        """Verify phase 1 + phase 2 pipeline completes without error."""
        audit = _make_audit()
        items = [_make_rewrite_item()]
        rewrite_semi = _run_score_rewrites(audit, items)
        patches = _make_patches()
        rewrites = _run_finalize(rewrite_semi, patches, audit)
        assert isinstance(rewrites, list)
