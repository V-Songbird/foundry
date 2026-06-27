"""Tests for build_prompt.py and merge_batch_patches.py.

build_prompt.py: JSON payload → markdown LLM prompt. Optionally batches.
merge_batch_patches.py: batch_dir + scored_semi.json → merged patches.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest
from conftest import PYTHON, SCRIPTS_DIR


# ---------------------------------------------------------------------------
# build_prompt.py helpers
# ---------------------------------------------------------------------------

def _make_payload(rules: list[dict], source_files: list[dict] | None = None,
                  project_context: dict | None = None) -> dict:
    return {
        "schema_version": "0.1",
        "project_root": "/test",
        "project_context": project_context or {
            "stack": ["Python", "pytest"],
            "always_loaded_files": ["CLAUDE.md"],
            "glob_scoped_files": [],
            "tooling": {"pre_commit": False, "ci": False},
        },
        "source_files": source_files or [
            {"path": "CLAUDE.md", "globs": [], "glob_match_count": None,
             "default_category": "mandate", "line_count": 20, "always_loaded": True}
        ],
        "rules": rules,
    }


def _make_rule(rule_id: str, text: str, file_index: int = 0, line_start: int = 5,
               category: str = "mandate") -> dict:
    return {
        "id": rule_id,
        "file_index": file_index,
        "text": text,
        "line_start": line_start,
        "line_end": line_start,
        "category": category,
        "staleness": {"gated": False, "missing_entities": []},
        "factors": {"F1": {"value": 0.85}, "F2": {"value": 0.85}, "F4": {"value": 0.95}},
        "factor_confidence_low": [],
    }


def _run_build_prompt(payload: dict, batch_dir: str | None = None) -> tuple[str, str]:
    """Run build_prompt.py; return (stdout, stderr)."""
    cmd = [PYTHON, str(SCRIPTS_DIR / "build_prompt.py")]
    if batch_dir:
        cmd += ["--batch-dir", batch_dir]

    import os
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(
        cmd,
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        env=env,
    )
    if result.returncode != 0:
        raise subprocess.CalledProcessError(
            result.returncode, cmd, result.stdout, result.stderr
        )
    return result.stdout, result.stderr


# ---------------------------------------------------------------------------
# Single-prompt mode
# ---------------------------------------------------------------------------

class TestSinglePromptMode:
    def test_prompt_contains_rules_table(self):
        rules = [_make_rule("R001", "ALWAYS validate user input")]
        out, _ = _run_build_prompt(_make_payload(rules))
        assert "R001" in out
        assert "ALWAYS validate user input" in out

    def test_prompt_contains_f3_and_f8_rubrics(self):
        rules = [_make_rule("R001", "Use functional components")]
        out, _ = _run_build_prompt(_make_payload(rules))
        assert "F3" in out
        assert "F8" in out

    def test_prompt_contains_response_format(self):
        rules = [_make_rule("R001", "Use strict typing")]
        out, _ = _run_build_prompt(_make_payload(rules))
        assert "Response format" in out
        assert "JSON array" in out.lower() or '["id"' in out or '"F3"' in out

    def test_stack_in_prompt(self):
        rules = [_make_rule("R001", "Use React hooks")]
        payload = _make_payload(rules, project_context={
            "stack": ["TypeScript", "React"],
            "always_loaded_files": ["CLAUDE.md"],
            "glob_scoped_files": [],
            "tooling": {"eslint": True},
        })
        out, _ = _run_build_prompt(payload)
        assert "TypeScript" in out or "React" in out

    def test_glob_scoped_file_noted(self):
        rules = [_make_rule("R001", "Use async/await", file_index=1)]
        source_files = [
            {"path": "CLAUDE.md", "globs": [], "glob_match_count": None,
             "default_category": "mandate", "line_count": 10, "always_loaded": True},
            {"path": ".claude/rules/api.md", "globs": ["src/api/**/*.ts"],
             "glob_match_count": 12, "default_category": "mandate",
             "line_count": 10, "always_loaded": False},
        ]
        payload = _make_payload(rules, source_files=source_files)
        out, _ = _run_build_prompt(payload)
        assert "src/api/**/*.ts" in out

    def test_always_loaded_file_noted(self):
        rules = [_make_rule("R001", "Use strict types")]
        out, _ = _run_build_prompt(_make_payload(rules))
        assert "always-loaded" in out or "CLAUDE.md" in out

    def test_long_rule_text_truncated(self):
        long_text = "A" * 200
        rules = [_make_rule("R001", long_text)]
        out, _ = _run_build_prompt(_make_payload(rules))
        assert "A" * 120 in out
        assert "..." in out

    def test_empty_rules_does_not_crash(self):
        out, _ = _run_build_prompt(_make_payload([]))
        assert "F3" in out
        assert "F8" in out

    def test_multiple_rules_all_appear(self):
        rules = [
            _make_rule("R001", "Never use eval()"),
            _make_rule("R002", "Always use strict mode"),
        ]
        out, _ = _run_build_prompt(_make_payload(rules))
        assert "R001" in out
        assert "R002" in out

    def test_confidence_flag_f3_in_flags(self):
        rule = _make_rule("R001", "Maybe follow guidelines")
        rule["factor_confidence_low"] = ["F3"]
        rule["factors"]["F3"] = {"value": 0.35}
        out, _ = _run_build_prompt(_make_payload([rule]))
        assert "F3: mech=" in out

    def test_confidence_flag_f8_in_flags(self):
        rule = _make_rule("R001", "Use consistent naming")
        rule["factor_confidence_low"] = ["F8"]
        rule["factors"]["F8"] = {"value": 0.65}
        out, _ = _run_build_prompt(_make_payload([rule]))
        assert "F8: mech=" in out

    def test_no_flags_shows_dash(self):
        rule = _make_rule("R001", "Use strict types")
        rule["factor_confidence_low"] = []
        out, _ = _run_build_prompt(_make_payload([rule]))
        assert "—" in out


# ---------------------------------------------------------------------------
# Batch mode
# ---------------------------------------------------------------------------

class TestBatchMode:
    def _make_many_rules(self, count: int) -> list[dict]:
        return [_make_rule(f"R{i:03d}", f"Rule number {i}") for i in range(1, count + 1)]

    def test_single_prompt_below_threshold(self, tmp_path):
        """20 rules → no batching; single prompt to stdout."""
        rules = self._make_many_rules(20)
        batch_dir = str(tmp_path / "batches")
        out, _ = _run_build_prompt(_make_payload(rules), batch_dir=batch_dir)
        # Batch dir should not be created when at threshold
        assert not Path(batch_dir).exists()
        assert "R001" in out

    def test_batch_mode_above_threshold(self, tmp_path):
        """21 rules → batching; prompt files created in batch_dir."""
        rules = self._make_many_rules(21)
        batch_dir = str(tmp_path / "batches")
        _run_build_prompt(_make_payload(rules), batch_dir=batch_dir)
        assert Path(batch_dir).exists()
        prompt_files = sorted(Path(batch_dir).glob("prompt_*.md"))
        assert len(prompt_files) >= 2

    def test_batch_manifest_created(self, tmp_path):
        """Batch mode creates batch_manifest.json."""
        rules = self._make_many_rules(21)
        batch_dir = str(tmp_path / "batches")
        _run_build_prompt(_make_payload(rules), batch_dir=batch_dir)
        manifest_path = Path(batch_dir) / "batch_manifest.json"
        assert manifest_path.exists()
        manifest = json.loads(manifest_path.read_text())
        assert "batches" in manifest
        assert manifest["total_rules"] == 21

    def test_manifest_rule_ids_cover_all(self, tmp_path):
        """All rule IDs appear in manifest batches."""
        rules = self._make_many_rules(25)
        batch_dir = str(tmp_path / "batches")
        _run_build_prompt(_make_payload(rules), batch_dir=batch_dir)
        manifest = json.loads((Path(batch_dir) / "batch_manifest.json").read_text())
        all_ids = {rid for b in manifest["batches"] for rid in b["rule_ids"]}
        expected = {f"R{i:03d}" for i in range(1, 26)}
        assert all_ids == expected

    def test_batch_size_respected(self, tmp_path):
        """No batch exceeds BATCH_SIZE_DEFAULT (12) rules."""
        rules = self._make_many_rules(30)
        batch_dir = str(tmp_path / "batches")
        _run_build_prompt(_make_payload(rules), batch_dir=batch_dir)
        manifest = json.loads((Path(batch_dir) / "batch_manifest.json").read_text())
        batch_size = manifest.get("batch_size_target", 12)
        for b in manifest["batches"]:
            assert len(b["rule_ids"]) <= batch_size

    def test_continuation_note_in_same_file_batches(self, tmp_path):
        """When one file's rules split across batches, continuation note appears."""
        rules = self._make_many_rules(25)
        batch_dir = str(tmp_path / "batches")
        _run_build_prompt(_make_payload(rules), batch_dir=batch_dir)
        prompt_files = sorted(Path(batch_dir).glob("prompt_*.md"))
        texts = [p.read_text(encoding="utf-8") for p in prompt_files]
        has_continuation = any("continuation" in t.lower() or "continue" in t.lower()
                               for t in texts[1:])
        assert has_continuation

    def test_file_cohesion_respected(self, tmp_path):
        """Rules from the same file prefer to stay in the same batch."""
        source_files = [
            {"path": "file_a.md", "globs": [], "glob_match_count": None,
             "default_category": "mandate", "line_count": 40, "always_loaded": True},
            {"path": "file_b.md", "globs": [], "glob_match_count": None,
             "default_category": "mandate", "line_count": 40, "always_loaded": True},
        ]
        rules_a = [_make_rule(f"A{i:03d}", f"Rule A{i}", file_index=0, line_start=i)
                   for i in range(1, 12)]
        rules_b = [_make_rule(f"B{i:03d}", f"Rule B{i}", file_index=1, line_start=i)
                   for i in range(1, 12)]
        rules = rules_a + rules_b
        batch_dir = str(tmp_path / "batches")
        _run_build_prompt(_make_payload(rules, source_files=source_files), batch_dir=batch_dir)
        manifest = json.loads((Path(batch_dir) / "batch_manifest.json").read_text())
        first_batch_ids = set(manifest["batches"][0]["rule_ids"])
        a_in_first = {rid for rid in first_batch_ids if rid.startswith("A")}
        b_in_first = {rid for rid in first_batch_ids if rid.startswith("B")}
        # File A's rules should dominate the first batch, not be mixed with File B
        assert len(a_in_first) > len(b_in_first) or len(b_in_first) == 0


# ---------------------------------------------------------------------------
# merge_batch_patches.py helpers
# ---------------------------------------------------------------------------

def _run_merge_patches(batch_dir: str, scored_semi_path: str,
                       output_path: str | None = None) -> tuple[dict, str]:
    """Run merge_batch_patches.py, return (parsed output, stderr)."""
    cmd = [PYTHON, str(SCRIPTS_DIR / "merge_batch_patches.py"), batch_dir, scored_semi_path]
    if output_path:
        cmd += ["--output", output_path]

    import os
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=30, encoding="utf-8", env=env,
    )
    if result.returncode != 0:
        raise subprocess.CalledProcessError(
            result.returncode, cmd, result.stdout, result.stderr
        )
    if output_path:
        return json.loads(Path(output_path).read_text()), result.stderr
    return json.loads(result.stdout), result.stderr


def _write_patch_file(batch_dir: Path, name: str, patches: dict) -> None:
    p = {
        "schema_version": "0.1",
        "model_version": "test-model-1",
        "patches": patches,
    }
    (batch_dir / name).write_text(json.dumps(p), encoding="utf-8")


def _write_scored_semi(path: Path, rule_ids: list[str]) -> None:
    data = {"schema_version": "0.1", "rules": [{"id": rid} for rid in rule_ids]}
    path.write_text(json.dumps(data), encoding="utf-8")


# ---------------------------------------------------------------------------
# merge_batch_patches tests
# ---------------------------------------------------------------------------

class TestMergeBatchPatches:
    def test_merges_two_batches(self, tmp_path):
        batch_dir = tmp_path / "batches"
        batch_dir.mkdir()
        scored_semi = tmp_path / "scored_semi.json"
        _write_scored_semi(scored_semi, ["R001", "R002"])

        _write_patch_file(batch_dir, "patches_001.json", {
            "R001": {
                "F3": {"value": 0.80, "level": 3, "reasoning": "ok"},
                "F8": {"value": 0.65, "level": 2, "reasoning": "ok"},
            }
        })
        _write_patch_file(batch_dir, "patches_002.json", {
            "R002": {
                "F3": {"value": 0.50, "level": 2, "reasoning": "ok"},
                "F8": {"value": 0.40, "level": 1, "reasoning": "ok"},
            }
        })

        out, _ = _run_merge_patches(str(batch_dir), str(scored_semi))
        assert "R001" in out["patches"]
        assert "R002" in out["patches"]

    def test_schema_version_in_output(self, tmp_path):
        batch_dir = tmp_path / "batches"
        batch_dir.mkdir()
        scored_semi = tmp_path / "scored_semi.json"
        _write_scored_semi(scored_semi, ["R001"])
        _write_patch_file(batch_dir, "patches_001.json", {
            "R001": {"F3": {"value": 0.80, "level": 3}, "F8": {"value": 0.65, "level": 2}}
        })
        out, _ = _run_merge_patches(str(batch_dir), str(scored_semi))
        assert out["schema_version"] == "0.1"

    def test_duplicate_id_last_wins(self, tmp_path):
        batch_dir = tmp_path / "batches"
        batch_dir.mkdir()
        scored_semi = tmp_path / "scored_semi.json"
        _write_scored_semi(scored_semi, ["R001"])
        _write_patch_file(batch_dir, "patches_001.json", {
            "R001": {"F3": {"value": 0.50, "level": 2}, "F8": {"value": 0.40, "level": 1}}
        })
        _write_patch_file(batch_dir, "patches_002.json", {
            "R001": {"F3": {"value": 0.80, "level": 3}, "F8": {"value": 0.65, "level": 2}}
        })
        out, stderr = _run_merge_patches(str(batch_dir), str(scored_semi))
        assert out["patches"]["R001"]["F3"]["value"] == 0.80
        assert "WARNING" in stderr

    def test_missing_rule_warns(self, tmp_path):
        batch_dir = tmp_path / "batches"
        batch_dir.mkdir()
        scored_semi = tmp_path / "scored_semi.json"
        _write_scored_semi(scored_semi, ["R001", "R002"])
        _write_patch_file(batch_dir, "patches_001.json", {
            "R001": {"F3": {"value": 0.80, "level": 3}, "F8": {"value": 0.65, "level": 2}}
        })
        out, stderr = _run_merge_patches(str(batch_dir), str(scored_semi))
        assert "WARNING" in stderr

    def test_extra_rule_in_patches_warns(self, tmp_path):
        batch_dir = tmp_path / "batches"
        batch_dir.mkdir()
        scored_semi = tmp_path / "scored_semi.json"
        _write_scored_semi(scored_semi, ["R001"])
        _write_patch_file(batch_dir, "patches_001.json", {
            "R001": {"F3": {"value": 0.80, "level": 3}, "F8": {"value": 0.65, "level": 2}},
            "R999": {"F3": {"value": 0.50, "level": 2}, "F8": {"value": 0.40, "level": 1}},
        })
        out, stderr = _run_merge_patches(str(batch_dir), str(scored_semi))
        assert "WARNING" in stderr

    def test_no_patch_files_fatal(self, tmp_path):
        batch_dir = tmp_path / "batches"
        batch_dir.mkdir()
        scored_semi = tmp_path / "scored_semi.json"
        _write_scored_semi(scored_semi, ["R001"])

        import os
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"

        proc = subprocess.run(
            [PYTHON, str(SCRIPTS_DIR / "merge_batch_patches.py"), str(batch_dir), str(scored_semi)],
            capture_output=True, text=True, timeout=30, encoding="utf-8", env=env,
        )
        assert proc.returncode != 0
        assert "FATAL" in proc.stderr

    def test_write_to_output_file(self, tmp_path):
        batch_dir = tmp_path / "batches"
        batch_dir.mkdir()
        scored_semi = tmp_path / "scored_semi.json"
        output_path = str(tmp_path / "merged.json")
        _write_scored_semi(scored_semi, ["R001"])
        _write_patch_file(batch_dir, "patches_001.json", {
            "R001": {"F3": {"value": 0.80, "level": 3}, "F8": {"value": 0.65, "level": 2}}
        })
        out, _ = _run_merge_patches(str(batch_dir), str(scored_semi), output_path=output_path)
        assert Path(output_path).exists()
        assert "R001" in out["patches"]

    def test_schema_version_mismatch_warns(self, tmp_path):
        batch_dir = tmp_path / "batches"
        batch_dir.mkdir()
        scored_semi = tmp_path / "scored_semi.json"
        _write_scored_semi(scored_semi, ["R001", "R002"])

        p1 = {"schema_version": "0.1", "model_version": "test-model", "patches": {
            "R001": {"F3": {"value": 0.80, "level": 3}, "F8": {"value": 0.65, "level": 2}}
        }}
        p2 = {"schema_version": "0.2", "model_version": "test-model", "patches": {
            "R002": {"F3": {"value": 0.50, "level": 2}, "F8": {"value": 0.40, "level": 1}}
        }}
        (batch_dir / "patches_001.json").write_text(json.dumps(p1))
        (batch_dir / "patches_002.json").write_text(json.dumps(p2))

        out, stderr = _run_merge_patches(str(batch_dir), str(scored_semi))
        assert "WARNING" in stderr
