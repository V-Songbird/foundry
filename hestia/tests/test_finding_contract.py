"""Tests for the FINDING CONTRACT (Phase 1 epistemics upgrade).

Covers the four parts of the contract:
  A. Cite-or-drop — a normal finding requires a `file` locator; a locator-less
     claim must go through the advisory bucket or not be emitted at all.
  B. Triple-shape — every finding carries symptom / why / fix_action.
  C. Honest limits — checkup and drift always emit a `limits` section, and
     empty results are stated explicitly (never silent).
  D. Counted facts, no counterfactual — no API emits a counterfactual % impact.

These exercise the model in _lib.py plus the checkup.py / drift.py emitters.
"""

import json
import sys
from pathlib import Path

import pytest
from conftest import PYTHON, SCRIPTS_DIR, FIXTURES_DIR, run_script

# Import the in-process model directly.
sys.path.insert(0, str(SCRIPTS_DIR))
import _lib  # noqa: E402


SAMPLE_PROJECT = str(FIXTURES_DIR / "sample_project")


# ---------------------------------------------------------------------------
# Part A — Cite-or-drop
# ---------------------------------------------------------------------------

class TestCiteOrDrop:
    def test_cited_requires_file(self):
        """Finding.cited refuses an empty file locator."""
        with pytest.raises(ValueError):
            _lib.Finding.cited(
                severity="high", artifact="rule",
                symptom="s", why="w", fix_action="f", file="",
            )

    def test_bare_constructor_drops_locatorless_finding(self):
        """A non-advisory Finding without a file is rejected by construction."""
        with pytest.raises(ValueError):
            _lib.Finding(severity="low", artifact="rule", symptom="ungrounded")

    def test_cited_with_file_succeeds(self):
        f = _lib.Finding.cited(
            severity="high", artifact="rule",
            symptom="s", why="w", fix_action="f", file="CLAUDE.md", line=12,
        )
        assert f.file == "CLAUDE.md"
        assert f.location == "CLAUDE.md:12"
        assert f.advisory is False

    def test_file_level_finding_has_no_line(self):
        """A whole-file finding has a file but no line — locator still satisfied."""
        f = _lib.Finding.cited(
            severity="medium", artifact="claude-md",
            symptom="too long", why="w", fix_action="f", file="CLAUDE.md",
        )
        assert f.line is None
        assert f.location == "CLAUDE.md"

    def test_advisory_is_the_only_locatorless_path(self):
        """The advisory bucket is the only way to emit something with no file."""
        a = _lib.Finding.advisory_note(
            severity="low", artifact="rule", symptom="unverified hunch",
        )
        assert a.advisory is True
        assert a.file == ""
        assert a.location == ""

    def test_advisory_is_flagged_in_dict(self):
        a = _lib.Finding.advisory_note(severity="low", artifact="rule", symptom="x")
        assert a.to_dict()["advisory"] is True

    def test_checkup_findings_all_carry_a_locator(self):
        """Every finding checkup emits has a non-empty location (cite-or-drop)."""
        out = run_script("checkup.py", args=["--project-root", SAMPLE_PROJECT])
        for f in out["findings"]:
            assert f.get("file"), f"finding has no file locator: {f}"
            assert f.get("location"), f"finding has no location: {f}"
            assert f.get("advisory") is False


# ---------------------------------------------------------------------------
# Part B — Triple-shape
# ---------------------------------------------------------------------------

class TestTripleShape:
    def test_dict_carries_all_three(self):
        f = _lib.Finding.cited(
            severity="high", artifact="rule",
            symptom="weak verb", why="claude can't tell command from suggestion",
            fix_action="start with a clear action verb", file="CLAUDE.md", line=3,
        )
        d = f.to_dict()
        assert d["symptom"] == "weak verb"
        assert d["why"]
        assert d["fix_action"]

    def test_checkup_findings_are_triple_shaped(self):
        """Every emitted finding carries symptom + why + fix_action (no bare wrong)."""
        # Build a project with a guaranteed finding: an agent without frontmatter.
        out = _run_checkup_on_broken_project()
        assert out["findings"], "expected at least one finding"
        for f in out["findings"]:
            assert f.get("symptom"), f"missing symptom: {f}"
            assert f.get("why"), f"missing why (rationale): {f}"
            assert f.get("fix_action"), f"missing fix_action (corrective action): {f}"


def _run_checkup_on_broken_project(tmp=None):
    """Run checkup.py on a project guaranteed to produce findings."""
    import tempfile
    base = Path(tempfile.mkdtemp())
    (base / ".git").mkdir()
    (base / "CLAUDE.md").write_text(
        "# P\n\nSee `./docs/gone.md`.\nRead @./missing.md first.\n", encoding="utf-8"
    )
    agents = base / ".claude" / "agents"
    agents.mkdir(parents=True)
    (agents / "bad.md").write_text("no frontmatter here\njust prose\n", encoding="utf-8")
    return run_script("checkup.py", args=["--project-root", str(base)])


# ---------------------------------------------------------------------------
# Part C — Honest limits
# ---------------------------------------------------------------------------

class TestHonestLimits:
    def test_limit_note_shape(self):
        n = _lib.limit_note("freshness", "no stale refs", "prose not checked")
        assert n["scope"] == "freshness"
        assert n["detail"] == "no stale refs"
        assert n["residual_risk"] == "prose not checked"

    def test_limit_note_omits_empty_residual_risk(self):
        n = _lib.limit_note("scope", "read-only scan")
        assert "residual_risk" not in n

    def test_checkup_always_emits_limits(self):
        out = run_script("checkup.py", args=["--project-root", SAMPLE_PROJECT])
        assert "limits" in out
        assert len(out["limits"]) >= 1
        for n in out["limits"]:
            assert n.get("detail")

    def test_drift_always_emits_limits(self):
        out = run_script("drift.py", args=["--project-root", SAMPLE_PROJECT])
        assert "limits" in out
        assert len(out["limits"]) >= 1

    def test_drift_states_empty_result_explicitly(self):
        """A clean freshness scan must say so out loud — never silence."""
        out = run_script("drift.py", args=["--project-root", SAMPLE_PROJECT])
        assert out["stale_files"] == []
        details = " ".join(n.get("detail", "") for n in out["limits"]).lower()
        assert "no stale references found" in details


# ---------------------------------------------------------------------------
# Part D — Counted facts, no counterfactual
# ---------------------------------------------------------------------------

class TestNoCounterfactual:
    def test_lib_has_no_counterfactual_emitter(self):
        """No public _lib symbol promises a counterfactual impact percentage."""
        names = [n.lower() for n in dir(_lib)]
        for n in names:
            assert "improvement_pct" not in n
            assert "impact_pct" not in n
            assert "counterfactual" not in n

    def test_checkup_counts_are_plain_tallies(self):
        """`counts` is a severity tally — integers only, no percentage fields."""
        out = run_script("checkup.py", args=["--project-root", SAMPLE_PROJECT])
        assert set(out["counts"].keys()) == {"high", "medium", "low", "info"}
        for v in out["counts"].values():
            assert isinstance(v, int)
