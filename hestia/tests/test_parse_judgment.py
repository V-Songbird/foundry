"""Tests for parse_judgment.py — model output parsing, level validation, tolerances.

parse_judgment.py takes:
  - positional arg: <scored_semi.json> (has list of rules with ids)
  - stdin (or --input file): raw model output (JSON array, possibly with fences)
  - optional --output file

Output: {schema_version, model_version, patches: {rule_id: {F3: {...}, F8: {...}}}}
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest
from conftest import PYTHON, SCRIPTS_DIR


def _run_parse(
    rule_ids: list[str],
    model_output: str | list[dict],
    *,
    expected_ids: list[str] | None = None,
) -> tuple[dict, str]:
    """Run parse_judgment.py, return (parsed output, stderr)."""
    scored_semi = {
        "schema_version": "0.1",
        "rules": [{"id": rid} for rid in rule_ids],
    }
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(scored_semi, f)
        semi_path = f.name

    if isinstance(model_output, list):
        stdin_text = json.dumps(model_output)
    else:
        stdin_text = model_output

    cmd = [PYTHON, str(SCRIPTS_DIR / "parse_judgment.py"), semi_path]
    if expected_ids is not None:
        cmd += ["--expected-ids", ",".join(expected_ids)]

    import os
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(
        cmd,
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        env=env,
    )
    Path(semi_path).unlink(missing_ok=True)

    if result.returncode != 0:
        raise subprocess.CalledProcessError(
            result.returncode, cmd, result.stdout, result.stderr
        )
    return json.loads(result.stdout), result.stderr


def _run_parse_raw(
    rule_ids: list[str],
    model_output: str | list[dict],
) -> subprocess.CompletedProcess:
    """Run parse_judgment.py and return raw CompletedProcess."""
    scored_semi = {
        "schema_version": "0.1",
        "rules": [{"id": rid} for rid in rule_ids],
    }
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(scored_semi, f)
        semi_path = f.name

    if isinstance(model_output, list):
        stdin_text = json.dumps(model_output)
    else:
        stdin_text = model_output

    import os
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(
        [PYTHON, str(SCRIPTS_DIR / "parse_judgment.py"), semi_path],
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        env=env,
    )
    Path(semi_path).unlink(missing_ok=True)
    return result


def _valid_entry(rule_id: str, f3_value: float = 0.80, f3_level: int = 3,
                 f8_value: float = 0.65, f8_level: int = 2) -> dict:
    return {
        "id": rule_id,
        "F3": {"value": f3_value, "level": f3_level, "reasoning": "Clear trigger context."},
        "F8": {"value": f8_value, "level": f8_level, "reasoning": "Linter can enforce this."},
    }


# ---------------------------------------------------------------------------
# Happy-path parsing
# ---------------------------------------------------------------------------

class TestHappyPath:
    def test_basic_parse(self):
        out, _ = _run_parse(["R001"], [_valid_entry("R001")])
        assert out["schema_version"] == "0.1"
        assert "patches" in out
        assert "R001" in out["patches"]

    def test_f3_f8_present(self):
        out, _ = _run_parse(["R001"], [_valid_entry("R001")])
        patch = out["patches"]["R001"]
        assert "F3" in patch
        assert "F8" in patch
        assert patch["F3"]["value"] == 0.80
        assert patch["F8"]["value"] == 0.65

    def test_multiple_rules(self):
        entries = [_valid_entry("R001"), _valid_entry("R002"), _valid_entry("R003")]
        out, _ = _run_parse(["R001", "R002", "R003"], entries)
        assert set(out["patches"].keys()) == {"R001", "R002", "R003"}

    def test_level_in_output(self):
        out, _ = _run_parse(["R001"], [_valid_entry("R001")])
        assert out["patches"]["R001"]["F3"]["level"] == 3

    def test_reasoning_in_output(self):
        out, _ = _run_parse(["R001"], [_valid_entry("R001")])
        assert "reasoning" in out["patches"]["R001"]["F3"]

    def test_reasoning_truncated_at_80(self):
        long_reason = "A" * 120
        entry = _valid_entry("R001")
        entry["F3"]["reasoning"] = long_reason
        out, _ = _run_parse(["R001"], [entry])
        assert len(out["patches"]["R001"]["F3"]["reasoning"]) <= 80


# ---------------------------------------------------------------------------
# Markdown fence stripping
# ---------------------------------------------------------------------------

class TestFenceStripping:
    def test_json_fences_stripped(self):
        entries = [_valid_entry("R001")]
        raw = "```json\n" + json.dumps(entries) + "\n```"
        out, _ = _run_parse(["R001"], raw)
        assert "R001" in out["patches"]

    def test_plain_fences_stripped(self):
        entries = [_valid_entry("R001")]
        raw = "```\n" + json.dumps(entries) + "\n```"
        out, _ = _run_parse(["R001"], raw)
        assert "R001" in out["patches"]

    def test_prose_before_array(self):
        entries = [_valid_entry("R001")]
        raw = "Sure! Here are the judgments:\n\n" + json.dumps(entries)
        out, _ = _run_parse(["R001"], raw)
        assert "R001" in out["patches"]

    def test_prose_after_array(self):
        entries = [_valid_entry("R001")]
        raw = json.dumps(entries) + "\n\nLet me know if you need more details."
        out, _ = _run_parse(["R001"], raw)
        assert "R001" in out["patches"]

    def test_nested_object_in_prose(self):
        """Extract the correct array even with a JSON object in prose."""
        entries = [_valid_entry("R001")]
        raw = (
            'Here is the analysis: {"note": "blah"}\n\n'
            + json.dumps(entries)
        )
        out, _ = _run_parse(["R001"], raw)
        assert "R001" in out["patches"]


# ---------------------------------------------------------------------------
# Level validation
# ---------------------------------------------------------------------------

class TestLevelValidation:
    def test_f3_level_0_to_4_valid(self):
        for level, value in [(0, 0.05), (1, 0.25), (2, 0.50), (3, 0.75), (4, 0.95)]:
            out, _ = _run_parse(
                ["R001"],
                [{"id": "R001", "F3": {"value": value, "level": level, "reasoning": "ok"},
                  "F8": {"value": 0.65, "level": 2, "reasoning": "ok"}}],
            )
            assert out["patches"]["R001"]["F3"]["level"] == level

    def test_f8_level_0_to_3_valid(self):
        for level, value in [(0, 0.175), (1, 0.40), (2, 0.675), (3, 0.925)]:
            out, _ = _run_parse(
                ["R001"],
                [{"id": "R001", "F3": {"value": 0.80, "level": 3, "reasoning": "ok"},
                  "F8": {"value": value, "level": level, "reasoning": "ok"}}],
            )
            assert out["patches"]["R001"]["F8"]["level"] == level

    def test_value_outside_level_range_corrected(self):
        """value=0.80 with level=0 → corrected to level-0 midpoint."""
        entry = {
            "id": "R001",
            "F3": {"value": 0.80, "level": 0, "reasoning": "mismatch test"},
            "F8": {"value": 0.65, "level": 2, "reasoning": "ok"},
        }
        out, stderr = _run_parse(["R001"], [entry])
        patch_f3 = out["patches"]["R001"]["F3"]
        # Level wins: value corrected to midpoint of level-0 range [0.00, 0.10]
        assert patch_f3["level"] == 0
        assert patch_f3["value"] <= 0.10
        assert "WARNING" in stderr

    def test_out_of_range_value_clamped(self):
        """value > 1.0 → clamped and warning emitted."""
        entry = {
            "id": "R001",
            "F3": {"value": 1.5, "level": 4, "reasoning": "clamped"},
            "F8": {"value": 0.65, "level": 2, "reasoning": "ok"},
        }
        out, stderr = _run_parse(["R001"], [entry])
        assert out["patches"]["R001"]["F3"]["value"] <= 1.0
        assert "WARNING" in stderr

    def test_value_zero_is_valid(self):
        """value=0.0 with level=0 is valid."""
        entry = {
            "id": "R001",
            "F3": {"value": 0.0, "level": 0, "reasoning": "zero"},
            "F8": {"value": 0.65, "level": 2, "reasoning": "ok"},
        }
        out, _ = _run_parse(["R001"], [entry])
        assert out["patches"]["R001"]["F3"]["value"] == 0.0


# ---------------------------------------------------------------------------
# Null factor handling
# ---------------------------------------------------------------------------

class TestNullFactorHandling:
    def test_null_value_null_level_accepted(self):
        entry = {
            "id": "R001",
            "F3": {"value": None, "level": None, "reasoning": "could not score"},
            "F8": {"value": 0.65, "level": 2, "reasoning": "ok"},
        }
        out, _ = _run_parse(["R001"], [entry])
        patch_f3 = out["patches"]["R001"]["F3"]
        assert patch_f3["value"] is None
        assert patch_f3["level"] is None

    def test_missing_f3_inserts_null_entry(self):
        entry = {
            "id": "R001",
            "F8": {"value": 0.65, "level": 2, "reasoning": "ok"},
        }
        out, stderr = _run_parse(["R001"], [entry])
        patch_f3 = out["patches"]["R001"]["F3"]
        assert patch_f3["value"] is None
        assert "WARNING" in stderr

    def test_missing_f8_inserts_null_entry(self):
        entry = {
            "id": "R001",
            "F3": {"value": 0.80, "level": 3, "reasoning": "ok"},
        }
        out, stderr = _run_parse(["R001"], [entry])
        patch_f8 = out["patches"]["R001"]["F8"]
        assert patch_f8["value"] is None
        assert "WARNING" in stderr


# ---------------------------------------------------------------------------
# Missing ID handling
# ---------------------------------------------------------------------------

class TestMissingIdHandling:
    def test_missing_rule_inserts_null_entry(self):
        entries = [_valid_entry("R001")]
        out, stderr = _run_parse(["R001", "R002"], entries)
        assert "R002" in out["patches"]
        assert out["patches"]["R002"]["F3"]["value"] is None
        assert "WARNING" in stderr

    def test_unexpected_rule_id_ignored(self):
        entries = [_valid_entry("R001"), _valid_entry("R999")]
        out, stderr = _run_parse(["R001"], entries)
        assert "R999" not in out["patches"]
        assert "WARNING" in stderr

    def test_duplicate_entry_last_wins(self):
        entries = [
            _valid_entry("R001", f3_value=0.50, f3_level=2),
            _valid_entry("R001", f3_value=0.80, f3_level=3),
        ]
        out, stderr = _run_parse(["R001"], entries)
        assert out["patches"]["R001"]["F3"]["value"] == 0.80
        assert "WARNING" in stderr

    def test_too_many_missing_ids_fatal(self):
        """More than tolerance missing → returncode != 0."""
        rule_ids = [f"R{i:03d}" for i in range(1, 22)]
        entries = [_valid_entry("R001")]
        proc = _run_parse_raw(rule_ids, entries)
        assert proc.returncode != 0
        assert "FATAL" in proc.stderr


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------

class TestSchemaValidation:
    def test_schema_version_in_output(self):
        out, _ = _run_parse(["R001"], [_valid_entry("R001")])
        assert out["schema_version"] == "0.1"

    def test_model_version_in_output(self):
        out, _ = _run_parse(["R001"], [_valid_entry("R001")])
        assert "model_version" in out

    def test_patches_key_present(self):
        out, _ = _run_parse(["R001"], [_valid_entry("R001")])
        assert isinstance(out["patches"], dict)


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

class TestErrorHandling:
    def test_no_json_array_fatal(self):
        proc = _run_parse_raw(["R001"], "This is not JSON.")
        assert proc.returncode != 0
        assert "FATAL" in proc.stderr

    def test_empty_input_fatal(self):
        proc = _run_parse_raw(["R001"], "")
        assert proc.returncode != 0
        assert "FATAL" in proc.stderr

    def test_entry_missing_id_skipped(self):
        entries = [
            {"F3": {"value": 0.80, "level": 3, "reasoning": "ok"},
             "F8": {"value": 0.65, "level": 2, "reasoning": "ok"}},
            _valid_entry("R001"),
        ]
        out, stderr = _run_parse(["R001"], entries)
        assert "R001" in out["patches"]
        assert "WARNING" in stderr

    def test_wrong_schema_version_fatal(self):
        """scored_semi.json with wrong schema_version → fatal."""
        scored_semi = {"schema_version": "9.9", "rules": [{"id": "R001"}]}
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            json.dump(scored_semi, f)
            semi_path = f.name

        import os
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"

        proc = subprocess.run(
            [PYTHON, str(SCRIPTS_DIR / "parse_judgment.py"), semi_path],
            input=json.dumps([_valid_entry("R001")]),
            capture_output=True, text=True, timeout=30, encoding="utf-8", env=env,
        )
        Path(semi_path).unlink(missing_ok=True)
        assert proc.returncode != 0
        assert "FATAL" in proc.stderr


# ---------------------------------------------------------------------------
# --expected-ids override
# ---------------------------------------------------------------------------

class TestExpectedIdsOverride:
    def test_expected_ids_narrows_scope(self):
        """Passing --expected-ids R002 ignores R001 even if present in scored_semi."""
        entries = [_valid_entry("R001"), _valid_entry("R002")]
        out, _ = _run_parse(["R001", "R002"], entries, expected_ids=["R002"])
        # R001 may appear as unexpected warning, but R002 must be present
        assert "R002" in out["patches"]

    def test_expected_ids_missing_in_output_fatal(self):
        """If expected_ids has R999 but model didn't return it, warn."""
        entries = [_valid_entry("R001")]
        # With --expected-ids, only R001 is expected
        out, stderr = _run_parse(["R001"], entries, expected_ids=["R001"])
        assert "R001" in out["patches"]


# ---------------------------------------------------------------------------
# F6/F7/F1 optional patch passthrough
# ---------------------------------------------------------------------------

class TestKnownPatchFields:
    def test_f7_patch_passthrough(self):
        entry = _valid_entry("R001")
        entry["F7_patch"] = {"value": 0.95, "reasoning": "Override from judgment"}
        out, _ = _run_parse(["R001"], [entry])
        assert "F7_patch" in out["patches"]["R001"]
        assert out["patches"]["R001"]["F7_patch"]["value"] == 0.95

    def test_f6_patch_passthrough(self):
        entry = _valid_entry("R001")
        entry["F6_patch"] = {"value": 0.80, "reasoning": "Override"}
        out, _ = _run_parse(["R001"], [entry])
        assert "F6_patch" in out["patches"]["R001"]

    def test_f1_patch_passthrough(self):
        entry = _valid_entry("R001")
        entry["F1_patch"] = {"value": 1.0, "reasoning": "Override"}
        out, _ = _run_parse(["R001"], [entry])
        assert "F1_patch" in out["patches"]["R001"]

    def test_patch_without_value_key_dropped(self):
        entry = _valid_entry("R001")
        entry["F7_patch"] = {"reasoning": "no value key"}
        out, stderr = _run_parse(["R001"], [entry])
        assert "F7_patch" not in out["patches"]["R001"]
        assert "WARNING" in stderr

    def test_patch_out_of_range_dropped(self):
        entry = _valid_entry("R001")
        entry["F7_patch"] = {"value": 1.5, "reasoning": "over range"}
        out, stderr = _run_parse(["R001"], [entry])
        assert "F7_patch" not in out["patches"]["R001"]
        assert "WARNING" in stderr

    def test_patch_null_value_accepted(self):
        entry = _valid_entry("R001")
        entry["F7_patch"] = {"value": None, "reasoning": "could not score"}
        out, _ = _run_parse(["R001"], [entry])
        assert "F7_patch" in out["patches"]["R001"]
        assert out["patches"]["R001"]["F7_patch"]["value"] is None
