"""Tests for compose.py — formula verification, regressions, edge cases.

hestia's compose.py reads a single JSON payload from stdin (unlike rulesense
which used two file args). The payload has {rules, source_files, project_root,
config}. F3/F8 factors must already be in rule["factors"] before calling
compose — hestia's pipeline pipes them in from parse_judgment.

Key differences from rulesense:
- No schema_version mismatch checks (hestia compose doesn't validate that)
- No patch merge step — factors are already in the rules dict
- Conflict detection and enforcement suggestions are the same
"""

import json
import math

import pytest
from conftest import run_script, run_script_raw


def _make_rule(
    rule_id: str = "R001",
    factors: dict | None = None,
    category: str = "mandate",
    file_index: int = 0,
    line_start: int = 5,
    staleness: dict | None = None,
) -> dict:
    """Build a minimal rule with all factors pre-populated."""
    default_factors = {
        "F1": {"value": 0.85, "method": "lookup"},
        "F2": {"value": 0.85, "method": "classify"},
        "F3": {"value": 0.80, "method": "judgment", "level": 3},
        "F4": {"value": 0.95, "method": "glob_match"},
        "F7": {"value": 0.80, "method": "count"},
        "F8": {"value": 0.65, "method": "judgment", "level": 2},
    }
    if factors:
        default_factors.update(factors)
    return {
        "id": rule_id,
        "file_index": file_index,
        "text": "Test rule.",
        "line_start": line_start,
        "line_end": line_start,
        "category": category,
        "staleness": staleness or {"gated": False, "missing_entities": []},
        "factors": default_factors,
    }


def _make_scored(rules: list[dict], source_files: list[dict] | None = None) -> dict:
    """Build a minimal compose input payload."""
    return {
        "project_root": "/test",
        "config": {"load_prob_overrides": {}, "severity_overrides": {}},
        "source_files": source_files or [
            {
                "path": "CLAUDE.md",
                "globs": [],
                "glob_match_count": None,
                "default_category": "mandate",
                "line_count": 50,
                "always_loaded": True,
            }
        ],
        "rules": rules,
    }


def _run_compose(payload: dict) -> dict:
    """Run compose.py with payload on stdin and return parsed output."""
    return run_script("compose.py", stdin_data=payload)


def _run_compose_raw(payload: dict):
    """Run compose.py and return raw CompletedProcess."""
    return run_script_raw("compose.py", stdin_data=payload)


# ---------------------------------------------------------------------------
# Per-rule formula tests
# ---------------------------------------------------------------------------

class TestPerRuleFormula:
    def test_worked_example(self):
        """Worked example: F1=0.85, F2=0.85, F3=0.80, F4=0.95, F7=0.80.
        Expected ≈ 0.840. F8 is parallel signal, not composite.
        """
        rule = _make_rule(factors={
            "F1": {"value": 0.85}, "F2": {"value": 0.85},
            "F3": {"value": 0.80}, "F4": {"value": 0.95},
            "F7": {"value": 0.80}, "F8": {"value": 0.65},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert abs(r["score"] - 0.840) <= 0.02, f"Expected ~0.840, got {r['score']}"
        assert abs(r["pre_floor_score"] - 0.840) <= 0.02
        assert r["floor"] == 1.0
        assert r["f8_value"] == 0.65
        assert r["is_hook_candidate"] is False  # 0.65 > 0.40

    def test_contributions_sum(self):
        """Contributions should sum to approximately pre_floor_score."""
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        contrib_sum = sum(v for v in r["contributions"].values() if v is not None)
        assert abs(contrib_sum - r["pre_floor_score"]) < 0.01

    def test_score_between_zero_and_one(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert 0.0 <= r["score"] <= 1.0


# ---------------------------------------------------------------------------
# Soft floors
# ---------------------------------------------------------------------------

class TestSoftFloors:
    def test_soft_floor_f7(self):
        """F7=0.10 → floor = 0.50 (= 0.10 / 0.2)."""
        rule = _make_rule(factors={"F7": {"value": 0.10}})
        result = _run_compose(_make_scored([rule]))
        assert result["rules"][0]["floor"] == 0.5

    def test_soft_floor_f4(self):
        """F4=0.05 → floor = 0.25 (= 0.05 / 0.2)."""
        rule = _make_rule(factors={"F4": {"value": 0.05}})
        result = _run_compose(_make_scored([rule]))
        assert result["rules"][0]["floor"] == 0.25

    def test_staleness_gate(self):
        """Stale entities → floor multiplied by 0.05."""
        rule = _make_rule(staleness={"gated": True, "missing_entities": ["src/old/"]})
        result = _run_compose(_make_scored([rule]))
        assert result["rules"][0]["floor"] == 0.05

    def test_floor_smooth_zero(self):
        """F7=0.0 → floor = 0.0, no NaN."""
        rule = _make_rule(factors={"F7": {"value": 0.0}})
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["floor"] == 0.0
        assert r["score"] == 0.0
        assert not math.isnan(r["score"])


# ---------------------------------------------------------------------------
# Layer overlay
# ---------------------------------------------------------------------------

class TestLayerOverlay:
    def test_layer_keys_present(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        layers = result["rules"][0]["layers"]
        assert "clarity" in layers
        assert "activation" in layers

    def test_worked_example_clarity_layer(self):
        """clarity = weighted mean of F1/F2/F7."""
        rule = _make_rule(factors={
            "F1": {"value": 0.85}, "F2": {"value": 0.85},
            "F3": {"value": 0.80}, "F4": {"value": 0.95},
            "F7": {"value": 0.80}, "F8": {"value": 0.65},
        })
        result = _run_compose(_make_scored([rule]))
        layers = result["rules"][0]["layers"]
        # clarity = (1.5*0.85 + 1.0*0.85 + 2.0*0.80) / 4.5 ≈ 0.828
        assert abs(layers["clarity"] - 0.828) <= 0.02

    def test_layer_division_safety_all_zero(self):
        """All clarity inputs at 0.0 → clarity = 0.0, no NaN."""
        rule = _make_rule(factors={
            "F1": {"value": 0.0}, "F2": {"value": 0.0},
            "F3": {"value": 0.0}, "F4": {"value": 0.0},
            "F7": {"value": 0.0}, "F8": {"value": 0.0},
        })
        result = _run_compose(_make_scored([rule]))
        layers = result["rules"][0]["layers"]
        assert layers["clarity"] == 0.0
        assert not math.isnan(layers["clarity"])


# ---------------------------------------------------------------------------
# Dominant weakness
# ---------------------------------------------------------------------------

class TestDominantWeakness:
    def test_dominant_weakness_f7(self):
        """F7=0.80 is weakest composite when others are higher."""
        rule = _make_rule(factors={
            "F1": {"value": 0.85}, "F2": {"value": 0.85},
            "F3": {"value": 0.80}, "F4": {"value": 0.95},
            "F7": {"value": 0.80}, "F8": {"value": 0.65},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["dominant_weakness"] == "F7"
        assert r["dominant_weakness_gap"] > 0

    def test_dominant_weakness_perfect_rule(self):
        """All factors at 1.0 → dominant_weakness is None."""
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 1.0}, "F4": {"value": 1.0},
            "F7": {"value": 1.0}, "F8": {"value": 1.0},
        })
        result = _run_compose(_make_scored([rule]))
        assert result["rules"][0]["dominant_weakness"] is None

    def test_dominant_weakness_never_f8(self):
        """F8 is parallel — must never appear as dominant_weakness."""
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 1.0}, "F4": {"value": 1.0},
            "F7": {"value": 0.50},
            "F8": {"value": 0.05},  # drastically lower, but parallel
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["dominant_weakness"] != "F8"
        assert r["dominant_weakness"] == "F7"

    def test_implicit_scope_trust_not_dominant_weakness(self):
        """F4 at 0.85 via implicit_scope_trust cannot dominate other weak factors."""
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 1.0},
            "F4": {"value": 0.85, "method": "keyword_overlap", "loading": "glob-scoped",
                   "trigger_match": "implicit_scope_trust"},
            "F7": {"value": 0.90},
            "F8": {"value": 0.80},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["dominant_weakness"] != "F4"
        assert r["dominant_weakness"] == "F7"

    def test_explicit_f4_mismatch_still_dominates(self):
        """F4 with explicit_mismatch remains eligible as dominant."""
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 1.0},
            "F4": {"value": 0.25, "method": "wrong_scope", "loading": "glob-scoped",
                   "trigger_match": "explicit_mismatch"},
            "F7": {"value": 0.90},
            "F8": {"value": 0.80},
        })
        result = _run_compose(_make_scored([rule]))
        assert result["rules"][0]["dominant_weakness"] == "F4"


# ---------------------------------------------------------------------------
# Failure class
# ---------------------------------------------------------------------------

class TestFailureClass:
    def test_f7_weakness_maps_to_ambiguity(self):
        rule = _make_rule(factors={
            "F1": {"value": 0.85}, "F2": {"value": 0.85},
            "F3": {"value": 0.80}, "F4": {"value": 0.95},
            "F7": {"value": 0.50}, "F8": {"value": 0.65},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["dominant_weakness"] == "F7"
        assert r["failure_class"] == "ambiguity"

    def test_f3_weakness_maps_to_drift(self):
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 0.30}, "F4": {"value": 1.0},
            "F7": {"value": 1.0}, "F8": {"value": 1.0},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["dominant_weakness"] == "F3"
        assert r["failure_class"] == "drift"

    def test_f4_weakness_maps_to_drift(self):
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 1.0}, "F4": {"value": 0.30},
            "F7": {"value": 1.0}, "F8": {"value": 1.0},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["dominant_weakness"] == "F4"
        assert r["failure_class"] == "drift"

    def test_perfect_rule_null_failure_class(self):
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 1.0}, "F4": {"value": 1.0},
            "F7": {"value": 1.0}, "F8": {"value": 1.0},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["dominant_weakness"] is None
        assert r["failure_class"] is None


# ---------------------------------------------------------------------------
# Null factor handling (degraded rules)
# ---------------------------------------------------------------------------

class TestNullFactorHandling:
    def test_null_f3_excluded_from_score(self):
        """Null F3 should give a different score than F3=0.50."""
        rule_with = _make_rule(factors={"F3": {"value": 0.50, "level": 2}})
        rule_null = _make_rule(factors={"F3": {"value": None, "level": None}})
        r_with = _run_compose(_make_scored([rule_with]))["rules"][0]
        r_null = _run_compose(_make_scored([rule_null]))["rules"][0]
        assert r_with["score"] != r_null["score"]

    def test_degraded_flag_set_for_null_factor(self):
        rule = _make_rule(factors={"F3": {"value": None, "level": None}})
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["degraded"] is True
        assert "F3" in r["degraded_factors"]

    def test_non_degraded_rule(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["degraded"] is False
        assert r["degraded_factors"] == []

    def test_null_f3_not_dominant_weakness(self):
        """Null F3 should not appear as dominant weakness."""
        rule = _make_rule(factors={
            "F3": {"value": None, "level": None},
            "F7": {"value": 0.30},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["dominant_weakness"] != "F3"
        assert r["dominant_weakness"] == "F7"

    def test_null_factor_contribution_is_none(self):
        rule = _make_rule(factors={"F3": {"value": None, "level": None}})
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["contributions"]["F3"] is None

    def test_f8_not_in_contributions(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert "F8" not in r["contributions"]
        assert r["f8_value"] is not None

    def test_value_zero_not_treated_as_null(self):
        """value: 0.0 is a legitimate score, NOT null."""
        rule = _make_rule(factors={"F3": {"value": 0.0, "level": 0}})
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["degraded"] is False
        assert r["contributions"]["F3"] == 0.0

    def test_null_f7_skips_soft_floor(self):
        """Null F7 skips the F7 soft floor (no penalty for unmeasured)."""
        rule_low_f7 = _make_rule(factors={"F7": {"value": 0.10}})
        rule_null_f7 = _make_rule(factors={"F7": {"value": None}})
        r_low = _run_compose(_make_scored([rule_low_f7]))["rules"][0]
        r_null = _run_compose(_make_scored([rule_null_f7]))["rules"][0]
        assert r_low["floor"] == 0.5
        assert r_null["floor"] == 1.0
        assert "F7" in r_null.get("skipped_floors", [])

    def test_all_null_edge_case(self):
        """All factors null: score=0.0, no crash, degraded=True."""
        rule = _make_rule(factors={
            "F1": {"value": None}, "F2": {"value": None},
            "F3": {"value": None}, "F4": {"value": None},
            "F7": {"value": None}, "F8": {"value": None},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["score"] == 0.0
        assert r["degraded"] is True
        assert r["scored_count"] == 0

    def test_mechanical_only_score(self):
        """mechanical_score is computed from F1+F2+F4+F7 only."""
        rule = _make_rule(factors={
            "F1": {"value": 0.85}, "F2": {"value": 0.85},
            "F3": {"value": None}, "F4": {"value": 0.95},
            "F7": {"value": 0.80}, "F8": {"value": None},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["mechanical_score"] is not None
        assert r["mechanical_score"] > 0


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_all_factors_perfect(self):
        """All factors 1.0 → score=1.0, floor=1.0, no NaN."""
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 1.0}, "F4": {"value": 1.0},
            "F7": {"value": 1.0}, "F8": {"value": 1.0},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["score"] == 1.0
        assert r["floor"] == 1.0
        assert r["dominant_weakness"] is None

    def test_all_factors_zero(self):
        """All factors 0.0 → score=0.0, floor=0.0, no NaN."""
        rule = _make_rule(factors={
            "F1": {"value": 0.0}, "F2": {"value": 0.0},
            "F3": {"value": 0.0}, "F4": {"value": 0.0},
            "F7": {"value": 0.0}, "F8": {"value": 0.0},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["score"] == 0.0
        assert r["floor"] == 0.0
        assert not math.isnan(r["score"])

    def test_length_penalty_boundary(self, tmp_path):
        """lines=120 → penalty=1.0; lines=121 → penalty=0.995."""
        rule = _make_rule()
        sf_120 = [{"path": "a.md", "globs": [], "glob_match_count": None,
                   "default_category": "mandate", "line_count": 120, "always_loaded": True}]
        sf_121 = [{"path": "a.md", "globs": [], "glob_match_count": None,
                   "default_category": "mandate", "line_count": 121, "always_loaded": True}]
        r120 = _run_compose(_make_scored([rule], sf_120))
        r121 = _run_compose(_make_scored([rule], sf_121))
        f120 = next(f for f in r120["files"] if f["path"] == "a.md")
        f121 = next(f for f in r121["files"] if f["path"] == "a.md")
        assert f120["length_penalty"] == 1.0
        assert f121["length_penalty"] == 0.995

    def test_length_penalty_floor(self):
        """lines=200 → penalty=0.6; lines=1000 → still 0.6 (floor)."""
        rule = _make_rule()
        sf_200 = [{"path": "a.md", "globs": [], "glob_match_count": None,
                   "default_category": "mandate", "line_count": 200, "always_loaded": True}]
        sf_1000 = [{"path": "a.md", "globs": [], "glob_match_count": None,
                    "default_category": "mandate", "line_count": 1000, "always_loaded": True}]
        r200 = _run_compose(_make_scored([rule], sf_200))
        r1000 = _run_compose(_make_scored([rule], sf_1000))
        f200 = next(f for f in r200["files"] if f["path"] == "a.md")
        f1000 = next(f for f in r1000["files"] if f["path"] == "a.md")
        assert f200["length_penalty"] == 0.6
        assert f1000["length_penalty"] == 0.6


# ---------------------------------------------------------------------------
# Position weight
# ---------------------------------------------------------------------------

class TestPositionWeightSmooth:
    def test_smooth_no_cliff(self):
        """Positions 0.19 and 0.21 differ by less than 0.02."""
        rule_19 = _make_rule("R001", line_start=19)
        rule_21 = _make_rule("R002", line_start=21)
        scored = _make_scored(
            [rule_19, rule_21],
            source_files=[{
                "path": "CLAUDE.md", "globs": [], "glob_match_count": None,
                "default_category": "mandate", "line_count": 100, "always_loaded": True,
            }],
        )
        result = _run_compose(scored)
        scores = {r["id"]: r["score"] for r in result["rules"]}
        assert abs(scores["R001"] - scores["R002"]) < 0.02

    def test_symmetry(self):
        """Position 0.10 and 0.90 should produce identical scores."""
        rule_10 = _make_rule("R001", line_start=10)
        rule_90 = _make_rule("R002", line_start=90)
        rule_30 = _make_rule("R003", line_start=30)
        rule_70 = _make_rule("R004", line_start=70)
        scored = _make_scored(
            [rule_10, rule_90, rule_30, rule_70],
            source_files=[{
                "path": "CLAUDE.md", "globs": [], "glob_match_count": None,
                "default_category": "mandate", "line_count": 100, "always_loaded": True,
            }],
        )
        result = _run_compose(scored)
        scores = {r["id"]: r["score"] for r in result["rules"]}
        assert scores["R001"] == scores["R002"]
        assert scores["R003"] == scores["R004"]


# ---------------------------------------------------------------------------
# Corpus scoring
# ---------------------------------------------------------------------------

class TestCorpusScoring:
    def test_effective_corpus_quality_key(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        assert "effective_corpus_quality" in result
        assert "score" in result["effective_corpus_quality"]

    def test_corpus_quality_key(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        assert "corpus_quality" in result
        assert "rule_mean_score" in result["corpus_quality"]
        assert "note" in result["corpus_quality"]

    def test_non_mandate_excluded_from_corpus(self):
        mandate = _make_rule("R001", category="mandate")
        pref = _make_rule("R002", category="preference")
        result = _run_compose(_make_scored([mandate, pref]))
        assert result["corpus_quality"]["rule_count"] == 1
        assert result["guideline_quality"]["rule_count"] == 1

    def test_leverage_sort_monotonic(self):
        """Rules must be sorted by leverage descending."""
        rules = [
            _make_rule("R001", factors={"F1": {"value": 0.85}, "F7": {"value": 0.80}}, line_start=5),
            _make_rule("R002", factors={"F1": {"value": 0.20}, "F7": {"value": 0.30}}, line_start=10),
            _make_rule("R003", factors={"F1": {"value": 0.50}, "F7": {"value": 0.60}}, line_start=15),
        ]
        result = _run_compose(_make_scored(rules))
        mandate_rules = [r for r in result["rules"] if r["category"] == "mandate"]
        leverages = [r["leverage"] for r in mandate_rules]
        assert leverages == sorted(leverages, reverse=True)


# ---------------------------------------------------------------------------
# Conflict detection
# ---------------------------------------------------------------------------

def _make_conflict_rule(
    rule_id: str,
    polarity: str,
    markers: list[str],
    text: str = "Test rule.",
    line_start: int = 5,
) -> dict:
    return _make_rule(
        rule_id=rule_id,
        line_start=line_start,
        factors={
            "F1": {"value": 0.85, "method": "lookup"},
            "F2": {"value": 0.85, "method": "classify", "matched_category": polarity},
            "F3": {"value": 0.80, "method": "judgment"},
            "F4": {"value": 0.95, "method": "glob_match"},
            "F7": {"value": 0.80, "method": "count",
                   "concrete_markers": markers,
                   "concrete_count": len(markers),
                   "abstract_count": 0},
            "F8": {"value": 0.65, "method": "judgment"},
        },
    ) | {"text": text}


class TestConflictDetection:
    def test_prohibit_plus_assert_on_shared_marker_flags_conflict(self):
        rules = [
            _make_conflict_rule("R001", "prohibition", ["src/main/gen/"],
                                text="NEVER edit files in src/main/gen/ directly."),
            _make_conflict_rule("R002", "positive_imperative", ["src/main/gen/"],
                                text="Use src/main/gen/ cached results for speed."),
        ]
        result = _run_compose(_make_scored(rules))
        conflicts = result["conflicts"]
        assert len(conflicts) == 1
        c = conflicts[0]
        assert c["type"] == "polarity_mismatch"
        assert c["rule_a"]["polarity"] == "prohibition"
        assert c["rule_b"]["polarity"] == "positive_imperative"
        assert c["shared_markers"] == ["src/main/gen/"]

    def test_two_positives_do_not_conflict(self):
        rules = [
            _make_conflict_rule("R001", "positive_imperative", ["src/main/gen/"]),
            _make_conflict_rule("R002", "positive_imperative", ["src/main/gen/"]),
        ]
        result = _run_compose(_make_scored(rules))
        assert result["conflicts"] == []

    def test_no_shared_marker_means_no_conflict(self):
        rules = [
            _make_conflict_rule("R001", "prohibition", ["src/main/gen/"]),
            _make_conflict_rule("R002", "positive_imperative", ["src/test/utils/"]),
        ]
        result = _run_compose(_make_scored(rules))
        assert result["conflicts"] == []

    def test_stoplist_markers_do_not_trigger_conflicts(self):
        rules = [
            _make_conflict_rule("R001", "prohibition", ["use", "code"]),
            _make_conflict_rule("R002", "positive_imperative", ["use", "code"]),
        ]
        result = _run_compose(_make_scored(rules))
        assert result["conflicts"] == []

    def test_short_markers_do_not_trigger_conflicts(self):
        rules = [
            _make_conflict_rule("R001", "prohibition", ["x", "io"]),
            _make_conflict_rule("R002", "positive_imperative", ["x", "io"]),
        ]
        result = _run_compose(_make_scored(rules))
        assert result["conflicts"] == []

    def test_non_mandate_excluded_from_conflicts(self):
        rules = [
            _make_conflict_rule("R001", "prohibition", ["src/main/gen/"]),
            _make_conflict_rule("R002", "positive_imperative", ["src/main/gen/"]),
        ]
        rules[1]["category"] = "override"
        result = _run_compose(_make_scored(rules))
        assert result["conflicts"] == []

    def test_conflicts_sorted_by_rule_ids(self):
        rules = [
            _make_conflict_rule("R003", "positive_imperative", ["apiClient"]),
            _make_conflict_rule("R001", "prohibition", ["apiClient"]),
            _make_conflict_rule("R002", "positive_imperative", ["apiClient"]),
        ]
        result = _run_compose(_make_scored(rules))
        conflicts = result["conflicts"]
        assert len(conflicts) == 2
        ids = [(c["rule_a"]["id"], c["rule_b"]["id"]) for c in conflicts]
        assert ids == sorted(ids)

    def test_empty_conflicts_clean_corpus(self):
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0, "matched_category": "positive_imperative"},
            "F3": {"value": 1.0}, "F4": {"value": 1.0},
            "F7": {"value": 1.0, "concrete_markers": ["fooBar"], "concrete_count": 1, "abstract_count": 0},
            "F8": {"value": 1.0},
        })
        result = _run_compose(_make_scored([rule]))
        assert result["conflicts"] == []


# ---------------------------------------------------------------------------
# F8 parallel signal
# ---------------------------------------------------------------------------

class TestF8ParallelSignal:
    def test_composite_score_excludes_f8(self):
        """Score uses F1/F2/F3/F4/F7 only; F8=0.0 does not drag it down."""
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 1.0}, "F4": {"value": 1.0},
            "F7": {"value": 1.0}, "F8": {"value": 0.0},
        })
        result = _run_compose(_make_scored([rule]))
        r = result["rules"][0]
        assert r["score"] >= 0.99

    def test_hook_opportunities_populated_for_low_f8(self):
        """F8 < threshold → rule appears in hook_opportunities."""
        rule = _make_rule(factors={
            "F1": {"value": 1.0}, "F2": {"value": 1.0},
            "F3": {"value": 1.0}, "F4": {"value": 1.0},
            "F7": {"value": 1.0}, "F8": {"value": 0.30},
        })
        result = _run_compose(_make_scored([rule]))
        assert len(result.get("hook_opportunities", [])) == 1
        assert result["hook_opportunities"][0]["id"] == "R001"
        assert result["rules"][0]["is_hook_candidate"] is True

    def test_hook_opportunities_empty_when_all_high_f8(self):
        rule = _make_rule(factors={
            "F1": {"value": 0.80}, "F2": {"value": 0.80},
            "F3": {"value": 0.80}, "F4": {"value": 0.80},
            "F7": {"value": 0.80}, "F8": {"value": 0.90},
        })
        result = _run_compose(_make_scored([rule]))
        assert result.get("hook_opportunities", []) == []
        assert result["rules"][0]["is_hook_candidate"] is False


# ---------------------------------------------------------------------------
# Schema output
# ---------------------------------------------------------------------------

class TestSchemaOutput:
    def test_schema_version_in_output(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        assert result["schema_version"] == "0.1"

    def test_methodology_present(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        assert "methodology" in result
        assert "weights_version" in result["methodology"]

    def test_date_present(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        assert "date" in result

    def test_headline_is_effective_corpus_quality(self):
        rule = _make_rule()
        result = _run_compose(_make_scored([rule]))
        assert "effective_corpus_quality" in result
        assert "score" in result["effective_corpus_quality"]

    def test_empty_stdin_fatal(self):
        proc = run_script_raw("compose.py", stdin_data="")
        assert proc.returncode != 0
