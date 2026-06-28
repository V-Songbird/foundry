"""Tests for the enforceability classifier — the "folklore check" (feature #1).

The classifier (scripts/enforceability.py) assigns each rule one of three
classes by HOW a violation could be detected:

  - enforceable — a hook / linter / test / build gate could mechanically catch it
  - observable  — Claude can self-check it at edit time (concrete construct + verb)
  - folklore    — an unverifiable quality word with no checkable referent

Contract checks:
  * Known examples classify correctly (enforceable / observable / folklore).
  * Conservative tie-breaking: ambiguous -> observable, never folklore.
  * Folklore requires a quality-word evidence token (evidence-driven).
  * Folklore rules surface as cited triple-shape findings (Phase-1 contract).
"""

import sys
from pathlib import Path

import pytest
from conftest import SCRIPTS_DIR

sys.path.insert(0, str(SCRIPTS_DIR))
import enforceability as enf  # noqa: E402
import compose  # noqa: E402
import _lib  # noqa: E402


def _classify(text: str, **rule_fields) -> dict:
    rule = {"text": text}
    rule.update(rule_fields)
    return enf.classify_rule(rule)


# ---------------------------------------------------------------------------
# Enforceable — names a runnable check / command / threshold / gate
# ---------------------------------------------------------------------------

class TestEnforceable:
    @pytest.mark.parametrize("text", [
        "Run `npm test` before committing.",
        "Coverage must be >= 80%.",
        "Ensure no TypeScript errors exist before pushing.",
        "Run prettier on modified files before committing.",
        "All tests pass in CI before merge.",
        "Run `tsc --noEmit` before pushing.",
    ])
    def test_enforceable(self, text):
        r = _classify(text)
        assert r["class"] == "enforceable", (text, r)

    def test_evidence_recorded(self):
        r = _classify("Coverage must be >= 80%.")
        assert r["evidence"], "enforceable verdict must record its evidence token(s)"

    def test_command_backtick_drives_enforceable(self):
        r = _classify("Run `eslint --max-warnings 0` on staged files.")
        assert r["class"] == "enforceable"
        assert any("eslint" in e for e in r["evidence"])

    def test_f8_low_ceiling_corroborates(self):
        """A rule scored fully-enforceable by F8 (rubric_F8.md Level 0/1) is
        enforceable even without an explicit command phrase in the text."""
        r = _classify(
            "Files in the generated directory stay untouched.",
            factors={"F8": {"value": 0.15}},
        )
        assert r["class"] == "enforceable"
        assert any(e.startswith("F8=") for e in r["evidence"])


# ---------------------------------------------------------------------------
# Observable — concrete construct + directive verb, but no external check
# ---------------------------------------------------------------------------

class TestObservable:
    @pytest.mark.parametrize("text", [
        "Use named exports for top-level modules.",
        "Put tests next to source.",
        "Use functional components for all new React files.",
        "Validate request bodies at the handler boundary using Zod.",
        "Place the migration in `src/db/migrations`.",
    ])
    def test_observable(self, text):
        r = _classify(text)
        assert r["class"] == "observable", (text, r)


# ---------------------------------------------------------------------------
# Folklore — unverifiable quality word, no checkable referent
# ---------------------------------------------------------------------------

class TestFolklore:
    @pytest.mark.parametrize("text", [
        "Always write clean, maintainable code.",
        "Handle errors properly.",
        "Write robust, sensible code.",
        "Keep functions small and readable.",
        "Use appropriate naming.",
        "Write good code.",
    ])
    def test_folklore(self, text):
        r = _classify(text)
        assert r["class"] == "folklore", (text, r)

    def test_folklore_requires_quality_word_evidence(self):
        """Evidence-driven: a folklore verdict always carries the quality
        word(s) that drove it — no folklore without an evidence token."""
        r = _classify("Handle errors properly.")
        assert r["class"] == "folklore"
        assert r["evidence"], "folklore must record the quality-word evidence"
        assert r["quality_words"], "folklore must name the unverifiable word(s)"
        assert "properly" in r["quality_words"]


# ---------------------------------------------------------------------------
# Conservative tie-breaking — ambiguous -> observable, never folklore
# ---------------------------------------------------------------------------

class TestConservative:
    def test_quality_word_plus_concrete_is_observable_not_folklore(self):
        """A quality word AND a concrete construct -> observable. A single
        checkable referent is enough to make the rule self-checkable."""
        r = _classify("Keep `UserService` clean and small.")
        assert r["class"] == "observable", r
        # The quality word is still recorded, but it did not drive a folklore
        # verdict because a concrete construct is present.
        assert "clean" in r["quality_words"]
        assert r["concrete_markers"]

    def test_no_signal_rule_is_observable_not_folklore(self):
        """A rule with neither a quality word nor a concrete construct is left
        observable (the safe default) — we never over-flag as folklore."""
        r = _classify("Prefer composition.")
        assert r["class"] == "observable", r

    def test_folklore_never_emitted_without_quality_word(self):
        """No input without a matched quality word can be classed folklore."""
        for text in ["Use the helper.", "Add the field.", "Prefer composition."]:
            r = _classify(text)
            assert r["class"] != "folklore", (text, r)


# ---------------------------------------------------------------------------
# Folklore findings — cited triple-shape (Phase-1 Finding contract)
# ---------------------------------------------------------------------------

class TestFolkloreFindings:
    def _rules(self) -> list[dict]:
        rules = [
            {"id": "R1", "text": "Always write clean, maintainable code.",
             "file": "CLAUDE.md", "line_start": 3},
            {"id": "R2", "text": "Run `npm test` before committing.",
             "file": "CLAUDE.md", "line_start": 5},
            {"id": "R3", "text": "Use named exports for top-level modules.",
             "file": "CLAUDE.md", "line_start": 7},
        ]
        enf.classify_rules(rules)
        return rules

    def test_only_folklore_rules_become_findings(self):
        findings = compose.build_folklore_findings(self._rules())
        assert len(findings) == 1
        assert findings[0]["rule_id"] == "R1"

    def test_findings_are_cited(self):
        """Cite-or-drop: every folklore finding carries a file:line locator."""
        f = compose.build_folklore_findings(self._rules())[0]
        assert f["file"] == "CLAUDE.md"
        assert f["location"] == "CLAUDE.md:3"
        assert f["advisory"] is False

    def test_findings_are_triple_shaped(self):
        """symptom / why / fix_action all present (no bare 'this is wrong')."""
        f = compose.build_folklore_findings(self._rules())[0]
        assert f["symptom"] == "rule can't be enforced or self-checked"
        assert "noise" in f["why"]
        assert "checkable condition" in f["fix_action"]

    def test_findings_carry_evidence_word(self):
        """The unverifiable word(s) ride along as evidence (in tags + inline)."""
        f = compose.build_folklore_findings(self._rules())[0]
        assert any(t.startswith("quality-word:") for t in f["tags"])
        assert "folklore" in f["tags"]
        assert f["quality_words"]

    def test_locatorless_folklore_rule_is_dropped(self):
        """A folklore rule with no file is dropped, not emitted locator-less."""
        rules = [{"id": "R9", "text": "Write clean code.", "file": "", "line_start": 1}]
        enf.classify_rules(rules)
        assert rules[0]["enforceability"]["class"] == "folklore"
        assert compose.build_folklore_findings(rules) == []
