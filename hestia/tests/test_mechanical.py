"""Tests for score_mechanical.py — F1 (verb strength), F2 (framing polarity),
F4 (load-trigger alignment), F7 (concreteness).

hestia's score_mechanical.py reads a JSON payload from stdin with
{source_files, rules} and emits the same payload with factors populated.
"""

import pytest
from conftest import run_script


def _score_rule(
    text: str,
    globs: list | None = None,
    always_loaded: bool = True,
    glob_match_count: int | None = None,
    staleness: dict | None = None,
) -> dict:
    """Run a single rule through score_mechanical and return the scored rule."""
    rule = {
        "id": "R001",
        "file_index": 0,
        "text": text,
        "line_start": 1,
        "line_end": 1,
        "category": "mandate",
        "staleness": staleness or {"gated": False, "missing_entities": []},
        "factors": {},
    }
    data = {
        "source_files": [
            {
                "path": "test.md",
                "globs": globs or [],
                "glob_match_count": glob_match_count,
                "default_category": "mandate",
                "line_count": 10,
                "always_loaded": always_loaded,
            }
        ],
        "rules": [rule],
    }
    result = run_script("score_mechanical.py", stdin_data=data)
    return result["rules"][0]


# ---------------------------------------------------------------------------
# F1: Verb Strength
# ---------------------------------------------------------------------------

class TestF1WorkedExamples:
    """Test the canonical worked examples from factor-rubrics."""

    @pytest.mark.parametrize("text,expected_score", [
        ("ALWAYS use project-aware methods for command database access", 1.00),
        ("NEVER edit files in src/main/gen/ directly", 0.95),
        ("Use functional components for all new React files", 0.85),
        ("Each test file must import from the module it tests", 1.00),
        ("Prefer named exports over default exports", 0.50),
        ("Use good judgment about error handling", 0.85),
        ("Try to prefer functional components when possible", 0.20),
    ])
    def test_f1_worked_examples(self, text, expected_score):
        rule = _score_rule(text)
        f1 = rule["factors"]["F1"]
        assert f1["value"] == expected_score, (
            f"F1 for '{text[:50]}' expected {expected_score}, got {f1['value']}"
        )

    def test_f1_compound_hedging(self):
        rule = _score_rule("Try to prefer functional components when possible")
        assert rule["factors"]["F1"]["value"] == 0.20
        assert rule["factors"]["F1"]["method"] == "lookup"

    def test_f1_implicit_verb(self):
        rule = _score_rule("Test files mirror source paths")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.70
        assert f1["method"] == "implicit_imperative_default"

    def test_f1_extraction_failure(self):
        rule = _score_rule("Stack: generic, TypeScript")
        f1 = rule["factors"]["F1"]
        assert f1["method"] in ("implicit_imperative_default", "extraction_failed")

    def test_f1_method_field_present(self):
        rule = _score_rule("Use functional components")
        assert "method" in rule["factors"]["F1"]

    def test_f1_matched_verb_field_present(self):
        rule = _score_rule("Use functional components")
        assert "matched_verb" in rule["factors"]["F1"]
        assert rule["factors"]["F1"]["matched_verb"] == "use"


# ---------------------------------------------------------------------------
# F1: 'always' dual-tier
# ---------------------------------------------------------------------------

class TestF1AlwaysRegression:
    def test_always_without_imperative(self):
        rule = _score_rule("Always be careful when refactoring")
        assert rule["factors"]["F1"]["value"] == 0.70
        assert rule["factors"]["F1"]["matched_verb"] == "always"

    def test_always_with_imperative(self):
        rule = _score_rule("Always use consistent naming conventions")
        assert rule["factors"]["F1"]["value"] == 1.00
        assert "always + use" in rule["factors"]["F1"]["matched_verb"]

    def test_always_alone(self):
        rule = _score_rule("Always.")
        assert rule["factors"]["F1"]["value"] == 0.70


# ---------------------------------------------------------------------------
# F1: Noun-verb ambiguity
# ---------------------------------------------------------------------------

class TestF1NounVerbAmbiguity:
    def test_document_noun_not_verb(self):
        rule = _score_rule("Document headers must be at the top")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 1.00
        assert f1["matched_verb"] == "must"

    def test_format_noun_not_verb(self):
        rule = _score_rule("Format strings should use f-strings")
        f1 = rule["factors"]["F1"]
        assert f1["value"] <= 0.70

    def test_log_noun_not_verb(self):
        rule = _score_rule("Log entries for failed requests")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.70
        assert f1["method"] == "implicit_imperative_default"

    def test_name_noun_not_verb(self):
        rule = _score_rule("Name conventions for exported types")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.70
        assert f1["method"] == "implicit_imperative_default"

    def test_set_the_is_imperative(self):
        rule = _score_rule("Set the timeout to 30 seconds")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.85
        assert f1["matched_verb"] == "set"

    def test_document_the_is_imperative(self):
        rule = _score_rule("Document the API endpoints")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.85
        assert f1["matched_verb"] == "document"

    def test_check_the_is_imperative(self):
        rule = _score_rule("Check the logs before deploying")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.85
        assert f1["matched_verb"] == "check"

    def test_test_the_is_imperative(self):
        rule = _score_rule("Test the function with edge cases")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.85
        assert f1["matched_verb"] == "test"

    def test_test_code_is_noun_phrase(self):
        rule = _score_rule("Test code is reviewed regularly")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.70
        assert f1["method"] == "implicit_imperative_default"

    def test_test_coverage_is_noun_phrase(self):
        rule = _score_rule("Test coverage should exceed 80%")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.70

    def test_test_runs_is_noun_phrase(self):
        rule = _score_rule("Test runs trigger CI builds")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.70
        assert f1["method"] == "implicit_imperative_default"

    def test_batch_as_noun(self):
        rule = _score_rule("Batch operations should be atomic.")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.70
        assert f1["method"] == "implicit_imperative_default"

    def test_matched_position_reported(self):
        rule = _score_rule("Use functional components for all new React files")
        f1 = rule["factors"]["F1"]
        assert "matched_position" in f1
        assert isinstance(f1["matched_position"], int)

    def test_matched_position_none_for_implicit(self):
        rule = _score_rule("Test files mirror source paths")
        f1 = rule["factors"]["F1"]
        assert f1["matched_position"] is None

    def test_matched_position_points_at_verb(self):
        rule = _score_rule("ALWAYS use consistent naming conventions")
        f1 = rule["factors"]["F1"]
        text = "always use consistent naming conventions"
        expected_pos = text.index("use")
        assert f1["matched_position"] == expected_pos


# ---------------------------------------------------------------------------
# F1: Verb list expansion
# ---------------------------------------------------------------------------

class TestVerbListExpansion:
    @pytest.mark.parametrize("text,verb", [
        ("Reset all state on 401 responses.", "reset"),
        ("Revert changes if validation fails.", "revert"),
        ("Avoid circular dependencies.", "avoid"),
        ("Enforce strict mode in all modules.", "enforce"),
        ("Sanitize all user input before processing.", "sanitize"),
        ("Normalize paths before comparison.", "normalize"),
        ("Optimize images before deployment.", "optimize"),
        ("Lint all files before committing.", "lint"),
        ("Encrypt sensitive data at rest.", "encrypt"),
        ("Retry failed requests up to 3 times.", "retry"),
        ("Abort requests after 30 seconds.", "abort"),
        ("Throttle API requests to 100/s.", "throttle"),
        ("Debounce search input by 300ms.", "debounce"),
        ("Generate API docs from annotations.", "generate"),
        ("Execute migrations in a transaction.", "execute"),
        ("Invoke callbacks asynchronously.", "invoke"),
        ("Scaffold new services with the template.", "scaffold"),
        ("Bootstrap the app with environment config.", "bootstrap"),
        ("Authenticate users via OAuth2.", "authenticate"),
        ("Authorize access with role-based permissions.", "authorize"),
    ])
    def test_new_verb_recognized(self, text, verb):
        rule = _score_rule(text)
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.85, (
            f"'{verb}' should score 0.85 but got {f1['value']} (method={f1['method']})"
        )
        assert f1["matched_verb"] == verb

    def test_cache_as_verb(self):
        rule = _score_rule("Cache responses for 5 minutes.")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.85
        assert f1["matched_verb"] == "cache"

    def test_cache_as_noun(self):
        rule = _score_rule("Cache entries must be invalidated after writes.")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 1.00
        assert f1["matched_verb"] == "must"

    def test_scope_as_verb(self):
        rule = _score_rule("Scope CSS to component boundaries.")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.85
        assert f1["matched_verb"] == "scope"

    def test_scope_as_noun(self):
        rule = _score_rule("Scope variables should be minimized.")
        f1 = rule["factors"]["F1"]
        assert f1["value"] == 0.70
        assert f1["method"] == "implicit_imperative_default"


# ---------------------------------------------------------------------------
# F2: Framing Polarity
# ---------------------------------------------------------------------------

class TestF2WorkedExamples:
    @pytest.mark.parametrize("text,expected_score", [
        ("ALWAYS use project-aware methods: `getProjectCommands(project)` not `.database.commands`", 0.95),
        ("Use CachedValuesManager for expensive computations", 0.85),
        ("NEVER edit files in src/main/gen/ directly. Edit the .bnf/.flex source and regenerate.", 0.70),
        ("NEVER edit files in src/main/gen/ directly.", 0.50),
        ("Prefer named exports over default exports", 0.35),
        ("Try to prefer functional components when possible", 0.35),
    ])
    def test_f2_worked_examples(self, text, expected_score):
        rule = _score_rule(text)
        assert rule["factors"]["F2"]["value"] == expected_score, (
            f"F2 for '{text[:50]}' expected {expected_score}, got {rule['factors']['F2']['value']}"
        )

    def test_f2_prohibition_with_alternative(self):
        rule = _score_rule("NEVER edit files in src/main/gen/ directly. Edit the .bnf/.flex source and regenerate.")
        assert rule["factors"]["F2"]["value"] == 0.70
        assert rule["factors"]["F2"]["matched_category"] == "positive_with_negative_clarification"

    def test_f2_method_field_present(self):
        rule = _score_rule("Use strict mode")
        assert "method" in rule["factors"]["F2"]

    def test_f2_matched_category_present(self):
        rule = _score_rule("Use strict mode")
        assert "matched_category" in rule["factors"]["F2"]


# ---------------------------------------------------------------------------
# F2: Contrast-not disambiguation
# ---------------------------------------------------------------------------

class TestF2ContrastNotRegression:
    def test_negation_not_gerund(self):
        rule = _score_rule("Functions should be pure, not depending on global state")
        assert rule["factors"]["F2"]["value"] == 0.85
        assert rule["factors"]["F2"]["matched_category"] == "positive_imperative"

    def test_contrast_not_nouns(self):
        rule = _score_rule("Use lists, not tuples")
        assert rule["factors"]["F2"]["value"] == 0.95

    def test_contrast_not_backticks(self):
        rule = _score_rule("Use `getProjectCommands` not `.database`")
        assert rule["factors"]["F2"]["value"] == 0.95

    def test_contrast_not_adjectives(self):
        rule = _score_rule("Functions should be pure, not stateful")
        assert rule["factors"]["F2"]["value"] == 0.95

    def test_instead_of_unchanged(self):
        rule = _score_rule("Use forEach instead of for loops")
        assert rule["factors"]["F2"]["value"] == 0.95

    def test_rather_than_unchanged(self):
        rule = _score_rule("Use async/await rather than raw promises")
        assert rule["factors"]["F2"]["value"] == 0.95


# ---------------------------------------------------------------------------
# F4: Load-Trigger Alignment
# ---------------------------------------------------------------------------

class TestF4WorkedExamples:
    def test_f4_always_loaded_universal(self):
        rule = _score_rule("Use TypeScript strict mode")
        assert rule["factors"]["F4"]["value"] >= 0.90
        assert rule["factors"]["F4"]["method"] == "always_universal"

    def test_f4_always_loaded_specific_trigger(self):
        rule = _score_rule("When editing API files, validate with Zod")
        assert rule["factors"]["F4"]["value"] <= 0.50
        assert rule["factors"]["F4"]["method"] == "misaligned"

    def test_f4_dead_glob(self):
        rule = _score_rule(
            "Use strict mode",
            globs=["src/nonexistent/**"],
            always_loaded=False,
            glob_match_count=0,
        )
        assert rule["factors"]["F4"]["value"] == 0.05

    def test_f4_glob_matches_trigger(self):
        rule = _score_rule(
            "Use Zod for API validation",
            globs=["src/api/**/*.ts"],
            always_loaded=False,
            glob_match_count=5,
        )
        assert rule["factors"]["F4"]["value"] >= 0.85

    def test_f4_keyword_overlap(self):
        rule = _score_rule(
            "Use Zod for API validation",
            globs=["src/api/**/*.ts"],
            always_loaded=False,
            glob_match_count=5,
        )
        assert rule["factors"]["F4"]["value"] >= 0.85

    def test_f4_no_overlap_implicit_scope_trust(self):
        rule = _score_rule(
            "All public functions must be documented with TSDoc",
            globs=["src/api/**/*.ts"],
            always_loaded=False,
            glob_match_count=5,
        )
        f4 = rule["factors"]["F4"]
        assert f4["value"] >= 0.80
        assert f4["method"] == "keyword_overlap"
        assert f4["loading"] == "glob-scoped"
        assert f4["trigger_match"] == "implicit_scope_trust"

    def test_f4_stale(self):
        rule = _score_rule(
            "Run tests for `src/legacy/auth.js`",
            staleness={"gated": True, "missing_entities": ["src/legacy/auth.js"]},
        )
        assert rule["factors"]["F4"]["value"] == 0.05

    def test_f4_fallback_labels(self):
        rule = _score_rule(
            "Some rule text",
            globs=[],
            always_loaded=False,
            glob_match_count=None,
        )
        f4 = rule["factors"]["F4"]
        assert f4["method"] == "no_signal"
        assert f4["loading"] == "ambiguous"
        assert f4["value"] == 0.65

    def test_f4_concise_rule_not_penalized(self):
        source_file_spec = {
            "globs": ["packages/**/*.ts", "packages/**/*.tsx"],
            "always_loaded": False,
            "glob_match_count": 10,
        }
        redundant = _score_rule(
            "When writing TypeScript in packages/ui, add a single-line comment "
            "explaining the business reason when logic cannot be inferred.",
            **source_file_spec,
        )
        concise = _score_rule(
            "When business logic cannot be inferred from identifiers alone, "
            "add a single-line comment explaining the business reason.",
            **source_file_spec,
        )
        assert concise["factors"]["F4"]["value"] >= 0.80
        assert redundant["factors"]["F4"]["value"] >= 0.80
        delta = abs(concise["factors"]["F4"]["value"] - redundant["factors"]["F4"]["value"])
        assert delta <= 0.10


# ---------------------------------------------------------------------------
# F7: Concreteness
# ---------------------------------------------------------------------------

class TestF7WorkedExamples:
    @pytest.mark.parametrize("text,expected_score,tolerance", [
        ("ALWAYS use `getProjectCommands(project)` not `.database.commands`", 0.95, 0.15),
        ("Use functional components for all new React files", 0.85, 0.15),
        ("NEVER edit files in src/main/gen/ directly", 0.85, 0.15),
        ("Use CachedValuesManager for expensive computations over PSI trees", 0.70, 0.15),
        ("Use good judgment about error handling", 0.05, 0.15),
    ])
    def test_f7_worked_examples(self, text, expected_score, tolerance):
        rule = _score_rule(text)
        f7 = rule["factors"]["F7"]
        assert abs(f7["value"] - expected_score) <= tolerance, (
            f"F7 for '{text[:50]}' expected ~{expected_score}, got {f7['value']} "
            f"(C={f7['concrete_count']},A={f7['abstract_count']})"
        )

    def test_f7_concrete_markers_present(self):
        rule = _score_rule("Use `getProjectCommands(project)` not `.database.commands`")
        f7 = rule["factors"]["F7"]
        assert f7["concrete_count"] >= 2
        assert "concrete_markers" in f7

    def test_f7_abstract_markers_present(self):
        rule = _score_rule("Use good judgment about error handling")
        f7 = rule["factors"]["F7"]
        assert f7["abstract_count"] >= 2
        assert "abstract_markers" in f7

    def test_f7_no_markers_scores_low(self):
        rule = _score_rule("Do the right thing here.")
        f7 = rule["factors"]["F7"]
        assert f7["value"] <= 0.20


class TestF7NumericThresholds:
    @pytest.mark.parametrize("text,expected_phrase", [
        ("Keep PR titles under 70 characters.", "under 70 characters"),
        ("Summaries must be fewer than 15 words.", "fewer than 15 words"),
        ("Include at least 3 examples per rule.", "at least 3 examples"),
        ("Allow no more than 20 entries in a list.", "no more than 20 entries"),
        ("Response time budget: 100ms.", "100ms"),
        ("Stall warnings fire after 5 seconds.", "5 seconds"),
        ("Coverage must be at least 80%.", "at least 80%"),
    ])
    def test_numeric_phrases_detected(self, text, expected_phrase):
        rule = _score_rule(text)
        f7 = rule["factors"]["F7"]
        markers_lower = [m.lower() for m in f7["concrete_markers"]]
        assert any(expected_phrase.lower() in m for m in markers_lower), (
            f"Expected '{expected_phrase}' among markers, got {f7['concrete_markers']}"
        )

    def test_numeric_threshold_lifts_f7_over_adjective(self):
        """Bright-line rule scores higher than adjectival equivalent."""
        sharp = _score_rule("Keep PR titles under 70 characters.")
        fuzzy = _score_rule("Keep PR titles short.")
        assert sharp["factors"]["F7"]["value"] > fuzzy["factors"]["F7"]["value"]

    def test_case_insensitive_match(self):
        rule = _score_rule("Keep titles Under 70 Characters.")
        f7 = rule["factors"]["F7"]
        markers_lower = [m.lower() for m in f7["concrete_markers"]]
        assert any("70 characters" in m for m in markers_lower)

    def test_version_number_not_a_threshold(self):
        """'Node 18' has a number but no unit — should not match as threshold."""
        import re
        rule = _score_rule("Use Node 18 for production.")
        f7 = rule["factors"]["F7"]
        markers = f7["concrete_markers"]
        has_threshold = any(
            re.fullmatch(
                r"(?i).*\d+.*(ms|seconds?|minutes?|hours?|days?|"
                r"weeks?|months?|years?|%|kb|mb|gb|bytes?|chars?|"
                r"characters?|words?|lines?|items?|entries|rows?).*",
                m,
            )
            for m in markers
        )
        assert not has_threshold, f"Version number incorrectly matched threshold: {markers}"


class TestF7ConfidenceFlag:
    def test_f7_confidence_flag_mixed(self):
        """Rules with both concrete and abstract markers should be flagged."""
        rule = _score_rule("Try to prefer functional components when possible")
        f7 = rule["factors"]["F7"]
        assert f7["concrete_count"] >= 1
        assert f7["abstract_count"] >= 1
        flags = rule.get("factor_confidence_low", [])
        assert "F7" in flags, "Mixed concrete/abstract should flag F7 for judgment"

    def test_no_flag_for_clearly_concrete(self):
        """Rule with only concrete markers should not be flagged."""
        rule = _score_rule("Use `getProjectCommands(project)` not `.database.commands`")
        f7 = rule["factors"]["F7"]
        if f7["abstract_count"] == 0:
            flags = rule.get("factor_confidence_low", [])
            assert "F7" not in flags
        # If abstract markers also found, flagging is acceptable

    def test_f7_marker_counting_concrete(self):
        """Concrete markers detected in rule with backtick terms."""
        rule = _score_rule("Use `getProjectCommands(project)` not `.database.commands`")
        f7 = rule["factors"]["F7"]
        assert f7["concrete_count"] >= 2

    def test_f7_marker_counting_abstract(self):
        """Abstract markers detected in vague rule."""
        rule = _score_rule("Use good judgment about error handling")
        f7 = rule["factors"]["F7"]
        assert f7["abstract_count"] >= 2
        assert ("good" in f7["abstract_markers"] or
                any("error" in m.lower() for m in f7["abstract_markers"]))

    def test_f7_domain_terms_detected(self):
        """Domain terms like 'functional components' count as concrete."""
        rule = _score_rule("Use functional components for all new React files")
        f7 = rule["factors"]["F7"]
        concrete_names = [m.lower() for m in f7["concrete_markers"]]
        assert any("functional component" in n for n in concrete_names)

    def test_f7_has_all_required_keys(self):
        rule = _score_rule("Use `React.memo` for expensive components")
        f7 = rule["factors"]["F7"]
        assert "value" in f7
        assert "method" in f7
        assert "concrete_markers" in f7
        assert "abstract_markers" in f7
        assert "concrete_count" in f7
        assert "abstract_count" in f7

    def test_f7_value_in_range(self):
        rule = _score_rule("Use strict TypeScript")
        f7 = rule["factors"]["F7"]
        assert 0.0 <= f7["value"] <= 1.0

    def test_no_separate_f6(self):
        """F6 is absorbed into F7; pipeline does not add a separate F6."""
        rule = _score_rule("Use `React.memo` for expensive components")
        assert "F6" not in rule["factors"]


# ---------------------------------------------------------------------------
# Pipeline integration
# ---------------------------------------------------------------------------

class TestPipelineIntegration:
    def test_all_four_factors_added(self):
        rule = _score_rule("Use `React.memo` for expensive components")
        for factor in ("F1", "F2", "F4", "F7"):
            assert factor in rule["factors"], f"Missing {factor}"

    def test_factors_have_value_key(self):
        rule = _score_rule("Always validate input")
        for factor in ("F1", "F2", "F4", "F7"):
            assert "value" in rule["factors"][factor]

    def test_schema_carried_forward(self):
        data = {
            "source_files": [
                {"path": "test.md", "globs": [], "glob_match_count": None,
                 "default_category": "mandate", "line_count": 10, "always_loaded": True}
            ],
            "rules": [{
                "id": "R001", "file_index": 0, "text": "Always test",
                "line_start": 1, "line_end": 1, "category": "mandate",
                "staleness": {"gated": False, "missing_entities": []},
                "factors": {},
            }],
            "custom_field": "should_be_preserved",
        }
        result = run_script("score_mechanical.py", stdin_data=data)
        assert result.get("custom_field") == "should_be_preserved"
