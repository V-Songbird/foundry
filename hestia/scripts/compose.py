"""Score composition: compute per-rule/file/corpus scores from factor data."""

from __future__ import annotations

import json
import math
import sys
from datetime import date
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
# Configuration
# ---------------------------------------------------------------------------

_WEIGHTS = _lib.load_data("weights")
_FACTOR_WEIGHTS = _WEIGHTS["weights"]          # {"F1": 1.5, "F2": 1.0, ...}
_TOTAL_WEIGHT = _WEIGHTS["total"]              # 6.8
_SOFT_FLOOR_THRESHOLD = _WEIGHTS["soft_floor_threshold"]  # 0.2
_SOFT_FLOOR_FACTORS = _WEIGHTS["soft_floor_factors"]      # ["F4", "F7"]
_STALENESS_MULTIPLIER = _WEIGHTS["staleness_multiplier"]  # 0.05
_CATEGORY_FLOORS = _WEIGHTS["category_floors"]
_POSITION_WEIGHTS = _WEIGHTS["position_weights"]
_LENGTH_PENALTY = _WEIGHTS["length_penalty"]
_LOAD_PROB_DEFAULTS = _WEIGHTS["load_prob_defaults"]
_PARALLEL_FACTORS = _WEIGHTS.get("parallel_factors", {})
_F8_HOOK_THRESHOLD = _PARALLEL_FACTORS.get("F8", {}).get("threshold", 0.40)

_KNOWN_FACTORS = set(_FACTOR_WEIGHTS.keys()) | set(_PARALLEL_FACTORS.keys())

_CLARITY_FACTORS = ["F1", "F2", "F7"]
_ACTIVATION_FACTORS = ["F3", "F4"]

_FACTOR_TO_FAILURE_CLASS = {
    "F1": "ambiguity",
    "F2": "ambiguity",
    "F3": "drift",
    "F4": "drift",
    "F7": "ambiguity",
}

_PROHIBIT_POLARITIES = {"prohibition", "positive_with_negative_clarification"}
_ASSERT_POLARITIES = {"positive_imperative", "positive_with_alternative"}

_CONFLICT_MARKER_STOPLIST = {
    "use", "new", "old", "file", "files", "code", "rule", "rules",
    "test", "tests", "data", "line", "error", "name",
}
_CONFLICT_MARKER_MIN_LEN = 3


# ---------------------------------------------------------------------------
# Conflict detection
# ---------------------------------------------------------------------------

def _rule_markers(rule: dict) -> set[str]:
    """Extract concrete markers from a rule's F7 evidence."""
    f7 = rule.get("factors", {}).get("F7", {})
    raw = f7.get("concrete_markers") or []
    out: set[str] = set()
    for m in raw:
        if not isinstance(m, str):
            continue
        lower = m.strip().lower()
        if len(lower) < _CONFLICT_MARKER_MIN_LEN:
            continue
        if lower in _CONFLICT_MARKER_STOPLIST:
            continue
        out.add(lower)
    return out


def _rule_polarity(rule: dict) -> str | None:
    """Return the F2 matched_category for a rule, or None if unavailable."""
    f2 = rule.get("factors", {}).get("F2", {})
    cat = f2.get("matched_category")
    return cat if isinstance(cat, str) else None


def detect_conflicts(rules: list[dict]) -> list[dict]:
    """Detect polarity-mismatch conflict pairs across mandate rules."""
    mandate = [r for r in rules if r.get("category") == "mandate"]
    prepared: list[tuple[dict, set[str], str | None]] = [
        (r, _rule_markers(r), _rule_polarity(r)) for r in mandate
    ]
    conflicts: list[dict] = []
    for i in range(len(prepared)):
        r_a, markers_a, pol_a = prepared[i]
        if pol_a is None or not markers_a:
            continue
        for j in range(i + 1, len(prepared)):
            r_b, markers_b, pol_b = prepared[j]
            if pol_b is None or not markers_b:
                continue
            if pol_a in _PROHIBIT_POLARITIES and pol_b in _ASSERT_POLARITIES:
                prohibit, assert_ = r_a, r_b
                prohibit_pol, assert_pol = pol_a, pol_b
                prohibit_markers, assert_markers = markers_a, markers_b
            elif pol_b in _PROHIBIT_POLARITIES and pol_a in _ASSERT_POLARITIES:
                prohibit, assert_ = r_b, r_a
                prohibit_pol, assert_pol = pol_b, pol_a
                prohibit_markers, assert_markers = markers_b, markers_a
            else:
                continue
            shared = prohibit_markers & assert_markers
            if not shared:
                continue
            conflicts.append({
                "type": "polarity_mismatch",
                "rule_a": {
                    "id": prohibit["id"],
                    "text": prohibit.get("text", ""),
                    "file": prohibit.get("file", ""),
                    "line_start": prohibit.get("line_start", 0),
                    "polarity": prohibit_pol,
                },
                "rule_b": {
                    "id": assert_["id"],
                    "text": assert_.get("text", ""),
                    "file": assert_.get("file", ""),
                    "line_start": assert_.get("line_start", 0),
                    "polarity": assert_pol,
                },
                "shared_markers": sorted(shared),
            })
    conflicts.sort(key=lambda c: (c["rule_a"]["id"], c["rule_b"]["id"]))
    return conflicts


# ---------------------------------------------------------------------------
# Enforcement suggestion
# ---------------------------------------------------------------------------

def _suggest_enforcement_layer(rule: dict) -> str:
    """Return a short enforcement suggestion based on rule text keywords."""
    text = rule.get("text", "").lower()
    if any(kw in text for kw in ("commit", "push", "force-push", "pre-commit")):
        return "Git hook (pre-commit / pre-push)"
    if any(kw in text for kw in ("prettier", "eslint", "format", "lint", "tsc")):
        return "Linter or formatter config"
    if any(kw in text for kw in ("import", "export", "barrel", "directive")):
        return "ESLint rule"
    if any(kw in text for kw in ("edit", "write", "delete", "src/")):
        return "Claude Code hook (PreToolUse on Edit/Write)"
    return "Mechanical enforcement (hook or linter)"


# ---------------------------------------------------------------------------
# Formulas
# ---------------------------------------------------------------------------

def smooth_floor(x: float, threshold: float) -> float:
    """Soft floor: min(1.0, x / threshold)."""
    if threshold <= 0:
        return 1.0
    return min(1.0, x / threshold)


def _compute_layer(factor_names: list[str], factor_values: dict) -> float | None:
    """Weighted mean over a layer's factors; None if all null."""
    numerator = 0.0
    denominator = 0.0
    for f in factor_names:
        val = factor_values.get(f)
        if val is not None:
            numerator += _FACTOR_WEIGHTS[f] * val
            denominator += _FACTOR_WEIGHTS[f]
    if denominator == 0:
        return None
    return numerator / denominator


def compute_per_rule_score(factors: dict, staleness: dict, category: str) -> dict:
    """Compute composite quality score for a single rule from its factor values."""
    factor_values: dict[str, float | None] = {}
    degraded_factors: list[str] = []
    for f_name in _FACTOR_WEIGHTS:
        f_data = factors.get(f_name, {})
        val = f_data.get("value")
        if val is None:
            degraded_factors.append(f_name)
        factor_values[f_name] = val

    f8_data = factors.get("F8", {})
    f8_value = f8_data.get("value")
    is_hook_candidate = (f8_value is not None and f8_value < _F8_HOOK_THRESHOLD)

    # Weighted linear combination — null factors excluded from both sides
    numerator = 0.0
    active_weight = 0.0
    for f in _FACTOR_WEIGHTS:
        if factor_values[f] is not None:
            numerator += _FACTOR_WEIGHTS[f] * factor_values[f]
            active_weight += _FACTOR_WEIGHTS[f]

    pre_floor_score = numerator / active_weight if active_weight > 0 else 0.0

    # Soft floors
    floor_values: list[float] = []
    skipped_floors: list[str] = []
    for f in _SOFT_FLOOR_FACTORS:
        if factor_values.get(f) is not None:
            floor_values.append(smooth_floor(factor_values[f], _SOFT_FLOOR_THRESHOLD))
        else:
            skipped_floors.append(f)

    # Staleness gate
    floor_values.append(_STALENESS_MULTIPLIER if staleness.get("gated", False) else 1.0)

    floor = min(floor_values) if floor_values else 1.0
    score = pre_floor_score * floor

    # Per-factor contributions
    contributions: dict[str, float | None] = {}
    for f in _FACTOR_WEIGHTS:
        if factor_values[f] is not None:
            contributions[f] = round(_FACTOR_WEIGHTS[f] * factor_values[f] / active_weight, 3) if active_weight > 0 else 0.0
        else:
            contributions[f] = None

    # Layer overlays
    clarity = _compute_layer(_CLARITY_FACTORS, factor_values)
    activation = _compute_layer(_ACTIVATION_FACTORS, factor_values)
    layers = {
        "clarity": round(clarity, 3) if clarity is not None else None,
        "activation": round(activation, 3) if activation is not None else None,
    }

    # Dominant weakness
    def _factor_is_structurally_correct(factor_name: str) -> bool:
        if factor_name != "F4":
            return False
        return factors.get("F4", {}).get("trigger_match") == "implicit_scope_trust"

    dom_weakness = None
    dom_gap = 0.0
    non_null = {f: v for f, v in factor_values.items() if v is not None}
    all_perfect = all(v >= 1.0 for v in non_null.values()) if non_null else True
    if not all_perfect:
        for f, v in non_null.items():
            if _factor_is_structurally_correct(f):
                continue
            gap = _FACTOR_WEIGHTS[f] * (1.0 - v)
            if gap > dom_gap:
                dom_gap = gap
                dom_weakness = f

    # Mechanical-only score (F1+F2+F4+F7)
    mech_factors = {"F1", "F2", "F4", "F7"}
    mech_num = 0.0
    mech_weight = 0.0
    for f in mech_factors:
        if factor_values.get(f) is not None:
            mech_num += _FACTOR_WEIGHTS[f] * factor_values[f]
            mech_weight += _FACTOR_WEIGHTS[f]
    mechanical_score = round(mech_num / mech_weight, 3) if mech_weight > 0 else None

    degraded = bool(degraded_factors)
    scored_count = len(_FACTOR_WEIGHTS) - len(degraded_factors)

    return {
        "score": round(score, 3),
        "pre_floor_score": round(pre_floor_score, 3),
        "floor": round(floor, 3),
        "contributions": contributions,
        "layers": layers,
        "dominant_weakness": dom_weakness,
        "dominant_weakness_gap": round(dom_gap, 3),
        "failure_class": _FACTOR_TO_FAILURE_CLASS.get(dom_weakness) if dom_weakness else None,
        "degraded": degraded,
        "degraded_factors": degraded_factors,
        "scored_count": scored_count,
        "skipped_floors": skipped_floors,
        "mechanical_score": mechanical_score,
        "f8_value": round(f8_value, 3) if f8_value is not None else None,
        "is_hook_candidate": is_hook_candidate,
    }


def _stddev(values: list[float]) -> float:
    """Population standard deviation."""
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return math.sqrt(variance)


def compute_per_file_score(rules: list[dict], file_info: dict) -> dict:
    """Per-file quality score with position weighting and length penalty."""
    if not rules:
        return {
            "file_score": 0.0,
            "length_penalty": 1.0,
            "prohibition_ratio": 0.0,
            "trigger_scope_coherence": 0.0,
            "concreteness_coverage": 0.0,
            "dead_zone_count": 0,
        }

    line_count = file_info.get("line_count", 0)
    total_rules = len(rules)

    max_w = _POSITION_WEIGHTS["edge"]
    min_w = _POSITION_WEIGHTS["middle"]
    weighted_sum = 0.0
    weight_sum = 0.0
    for rule in rules:
        position_pct = rule["line_start"] / max(line_count, 1)
        triangular = 1.0 - abs(2.0 * position_pct - 1.0)
        pos_weight = max_w - (max_w - min_w) * triangular
        weighted_sum += pos_weight * rule.get("score", 0.0)
        weight_sum += pos_weight

    position_weighted_mean = weighted_sum / weight_sum if weight_sum > 0 else 0.0

    threshold = _LENGTH_PENALTY["threshold_lines"]
    if line_count <= threshold:
        length_penalty = 1.0
    else:
        penalty = 1.0 - _LENGTH_PENALTY["penalty_per_line"] * (line_count - threshold)
        length_penalty = max(_LENGTH_PENALTY["minimum_penalty"], penalty)

    file_score = position_weighted_mean * length_penalty

    def _fval(rule: dict, factor: str) -> float | None:
        return rule.get("factors", {}).get(factor, {}).get("value")

    prohibition_count = sum(
        1 for r in rules if (_fval(r, "F2") is not None and _fval(r, "F2") < 0.60)
    )
    prohibition_ratio = prohibition_count / total_rules if total_rules > 0 else 0.0

    f4_values = [_fval(r, "F4") for r in rules if _fval(r, "F4") is not None]
    trigger_scope_coherence = _stddev(f4_values) if len(f4_values) > 1 else 0.0

    concreteness_count = sum(
        1 for r in rules if (_fval(r, "F7") is not None and _fval(r, "F7") >= 0.60)
    )
    concreteness_coverage = concreteness_count / total_rules if total_rules > 0 else 0.0

    dead_zone_count = 0
    for rule in rules:
        pos_pct = rule["line_start"] / max(line_count, 1)
        if 0.20 < pos_pct < 0.80 and rule.get("score", 0) > 0.70:
            dead_zone_count += 1

    return {
        "file_score": round(file_score, 3),
        "length_penalty": round(length_penalty, 3),
        "prohibition_ratio": round(prohibition_ratio, 3),
        "trigger_scope_coherence": round(trigger_scope_coherence, 3),
        "concreteness_coverage": round(concreteness_coverage, 3),
        "dead_zone_count": dead_zone_count,
    }


def _get_load_prob(source_file: dict, overrides: dict) -> float:
    """Load probability for a source file."""
    path = source_file.get("path", "")
    if path in overrides:
        return overrides[path]
    if source_file.get("always_loaded", True):
        return _LOAD_PROB_DEFAULTS["always_loaded"]
    return _LOAD_PROB_DEFAULTS["glob_scoped"]


def compute_corpus_scores(
    rules: list[dict], source_files: list[dict], config: dict
) -> tuple[dict, dict, dict, dict]:
    """Compute effective corpus quality, diagnostic rule-mean, guideline score, and file scores."""
    load_prob_overrides = config.get("load_prob_overrides", {})
    severity_overrides = config.get("severity_overrides", {})

    file_rules: dict[int, list[dict]] = {}
    for rule in rules:
        fi = rule.get("file_index", 0)
        file_rules.setdefault(fi, []).append(rule)

    file_scores: dict[int, dict] = {}
    for fi, fi_rules in file_rules.items():
        sf = source_files[fi] if fi < len(source_files) else {}
        file_scores[fi] = compute_per_file_score(fi_rules, sf)

    mandate_rules = [r for r in rules if r.get("category") == "mandate"]
    non_mandate_rules = [r for r in rules if r.get("category") != "mandate"]

    effective_num = 0.0
    effective_den = 0.0
    for fi, metrics in file_scores.items():
        sf = source_files[fi] if fi < len(source_files) else {}
        sf_path = sf.get("path", "")
        fi_mandates = [r for r in file_rules.get(fi, []) if r.get("category") == "mandate"]
        if not fi_mandates:
            continue
        load_prob = _get_load_prob(sf, load_prob_overrides)
        severity = severity_overrides.get(sf_path, 1.0)
        effective_num += load_prob * severity * metrics["file_score"]
        effective_den += load_prob * severity

    effective_score = effective_num / effective_den if effective_den > 0 else 0.0

    rule_num = 0.0
    rule_den = 0.0
    for rule in mandate_rules:
        fi = rule.get("file_index", 0)
        sf = source_files[fi] if fi < len(source_files) else {}
        load_prob = _get_load_prob(sf, load_prob_overrides)
        severity = severity_overrides.get(sf.get("path", ""), 1.0)
        rule_num += load_prob * severity * rule.get("score", 0.0)
        rule_den += load_prob * severity

    rule_mean = rule_num / rule_den if rule_den > 0 else 0.0

    guideline_scores = [r.get("score", 0.0) for r in non_mandate_rules]
    guideline_score = sum(guideline_scores) / len(guideline_scores) if guideline_scores else 0.0

    effective_corpus = {
        "score": round(effective_score, 3),
        "methodology": "file-score weighted aggregate over mandate-rule-bearing files",
    }
    corpus = {
        "rule_mean_score": round(rule_mean, 3),
        "rule_count": len(mandate_rules),
        "note": "diagnostic: rule-average ignoring file length penalty",
    }
    guideline = {
        "score": round(guideline_score, 3),
        "rule_count": len(non_mandate_rules),
    }

    return effective_corpus, corpus, guideline, file_scores


# ---------------------------------------------------------------------------
# Grade
# ---------------------------------------------------------------------------

_GRADE_THRESHOLDS = [
    (0.85, "A"),
    (0.75, "B"),
    (0.65, "C"),
    (0.50, "D"),
    (0.0,  "F"),
]


def score_to_grade(score: float) -> str:
    """Map a 0–1 score to a letter grade."""
    for threshold, letter in _GRADE_THRESHOLDS:
        if score >= threshold:
            return letter
    return "F"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    payload = _lib.read_stdin_json()
    if payload is None:
        print("FATAL: no input on stdin", file=sys.stderr)
        sys.exit(1)

    rules: list[dict] = payload.get("rules", [])
    source_files: list[dict] = payload.get("source_files", [])
    project_root: str = payload.get("project_root", "")
    config: dict = payload.get("config", {})

    # Per-rule scoring
    for rule in rules:
        result = compute_per_rule_score(
            rule.get("factors", {}),
            rule.get("staleness", {}),
            rule.get("category", "mandate"),
        )
        rule.update(result)
        rule["grade"] = score_to_grade(result["score"])

        # Leverage for mandate rules
        fi = rule.get("file_index", 0)
        sf = source_files[fi] if fi < len(source_files) else {}
        if rule.get("category") == "mandate":
            load_prob = _get_load_prob(sf, config.get("load_prob_overrides", {}))
            severity = config.get("severity_overrides", {}).get(sf.get("path", ""), 1.0)
            rule["leverage"] = round(load_prob * severity * (1.0 - rule["score"]), 3)
        else:
            rule["leverage"] = None

        rule["stale"] = rule.get("staleness", {}).get("gated", False)

        if fi < len(source_files):
            rule["file"] = source_files[fi]["path"]
            rule["loading"] = "always-loaded" if source_files[fi].get("always_loaded") else "glob-scoped"

    # Sort mandate rules by leverage descending, non-mandate appended
    mandate_rules = sorted(
        [r for r in rules if r.get("category") == "mandate"],
        key=lambda r: r.get("leverage") or 0,
        reverse=True,
    )
    non_mandate_rules = [r for r in rules if r.get("category") != "mandate"]
    rules = mandate_rules + non_mandate_rules

    # Corpus-level aggregation
    effective_corpus, corpus, guideline, file_score_map = compute_corpus_scores(
        rules, source_files, config
    )

    # Per-file output
    files_output: list[dict] = []
    for fi, sf in enumerate(source_files):
        fi_rules = [r for r in rules if r.get("file_index") == fi]
        metrics = file_score_map.get(fi) or compute_per_file_score(fi_rules, sf)
        files_output.append({
            "path": sf.get("path", ""),
            "file_score": metrics["file_score"],
            "grade": score_to_grade(metrics["file_score"]),
            "line_count": sf.get("line_count", 0),
            "rule_count": len(fi_rules),
            "length_penalty": metrics["length_penalty"],
            "prohibition_ratio": metrics["prohibition_ratio"],
            "trigger_scope_coherence": metrics["trigger_scope_coherence"],
            "concreteness_coverage": metrics["concreteness_coverage"],
            "dead_zone_count": metrics["dead_zone_count"],
        })

    positive = [r for r in rules if r.get("score", 0) > 0.80 and not r.get("degraded", False)]

    rewrite_candidates = [
        {
            "rule_id": r["id"],
            "score": r["score"],
            "dominant_weakness": r.get("dominant_weakness"),
        }
        for r in mandate_rules[:3]
        if r.get("leverage") and r.get("leverage", 0) > 0
    ]

    corpus_grade = score_to_grade(effective_corpus["score"])

    # --- Part C: honest limits the rules engine itself owns ---
    # These are stated as counted facts; report.py adds the standing engine
    # limits (English-only, structural-only) and the empty-result explicit-None
    # cases (no conflicts, no degraded rules).
    limits = [
        _lib.limit_note(
            "rule-extraction",
            f"Scored {len(rules)} extracted rule(s) across {len(source_files)} "
            "instruction file(s). Rules the extractor could not isolate (e.g. "
            "prose paragraphs without an imperative) are not scored.",
            residual_risk="An instruction buried in prose may carry weight Claude "
            "feels but this audit never saw."),
    ]

    output = {
        "schema_version": "0.1",
        "project": project_root,
        "date": str(date.today()),
        "methodology": {
            "weights_version": _WEIGHTS["version"],
        },
        # Counted facts only — observed tallies, never counterfactual impact.
        "files_scanned": len(source_files),
        "rules_extracted": len(rules),
        "limits": limits,
        "effective_corpus_quality": {**effective_corpus, "grade": corpus_grade},
        "corpus_quality": corpus,
        "guideline_quality": guideline,
        "rules": rules,
        "files": files_output,
        "positive_findings": [
            {
                "file": r.get("file", ""),
                "line": r.get("line_start"),
                "text": r.get("text", "")[:100],
                "score": r["score"],
            }
            for r in positive
        ],
        "rewrite_candidates": rewrite_candidates,
        "hook_opportunities": [
            {
                "id": r["id"],
                "text": r.get("text", ""),
                "file": r.get("file", ""),
                "line_start": r.get("line_start", 0),
                "f8_value": r.get("f8_value"),
                "suggested_enforcement": _suggest_enforcement_layer(r),
            }
            for r in rules
            if r.get("is_hook_candidate")
        ],
        "conflicts": detect_conflicts(rules),
    }

    _lib.emit(output)


if __name__ == "__main__":
    main()
