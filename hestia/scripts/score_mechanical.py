"""Mechanical factor scoring: F1 (verb strength), F2 (framing polarity), F4 (load-trigger alignment), F7 (concreteness)."""

from __future__ import annotations

import re
import sys
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
# Load data tables
# ---------------------------------------------------------------------------

_VERBS_DATA = _lib.load_data("verbs")
_FRAMING_DATA = _lib.load_data("framing")
_WEIGHTS_DATA = _lib.load_data("weights")
_MARKERS_DATA = _lib.load_data("markers")

# Pre-compile verb patterns sorted by length (longest first for greedy matching).
_VERB_TIERS: list[tuple[str, float, str, "re.Pattern[str]"]] = []
for _tier in _VERBS_DATA["patterns"]:
    for _verb in _tier["verbs"]:
        _verb_lower = _verb.lower()
        _pattern = re.compile(r'(?:^|[\s,;(])(' + re.escape(_verb_lower) + r')(?:[\s,;.)!?]|$)')
        _VERB_TIERS.append((_verb_lower, _tier["score"], _tier["label"], _pattern))
_VERB_TIERS.sort(key=lambda x: len(x[0]), reverse=True)

# Pre-compile F7 patterns at module load to avoid per-rule recompilation.
_BACKTICK_PATTERN = re.compile(r'`([^`]+)`')
_CONCRETE_REGEX_COMPILED: list["re.Pattern[str]"] = []
for _pat_str in _MARKERS_DATA["concrete_regex"]:
    try:
        _CONCRETE_REGEX_COMPILED.append(re.compile(_pat_str))
    except re.error:
        continue

_NUMERIC_THRESHOLD_REGEX_COMPILED: list["re.Pattern[str]"] = []
for _pat_str in _MARKERS_DATA.get("numeric_threshold_regex", []):
    try:
        _NUMERIC_THRESHOLD_REGEX_COMPILED.append(re.compile(_pat_str, flags=re.IGNORECASE))
    except re.error:
        continue

_CONCRETE_TERMS_LOWER: list[tuple[str, str]] = [
    (term, term.lower()) for term in _MARKERS_DATA.get("concrete_terms", [])
]


# ---------------------------------------------------------------------------
# F1: Verb Strength
# ---------------------------------------------------------------------------

def score_f1(rule_text: str) -> dict:
    """Score F1 (verb strength) using the verb lookup table."""
    text_lower = rule_text.lower()

    matches = []
    for verb, score, label, pattern in _VERB_TIERS:
        m = pattern.search(text_lower)
        if m:
            matches.append((verb, score, label, m.start(1)))

    if not matches:
        if _looks_like_statement(text_lower):
            return {
                "value": _VERBS_DATA["implicit_verb_default"],
                "method": "implicit_imperative_default",
                "matched_verb": None,
                "matched_score_tier": None,
                "matched_position": None,
            }
        return {
            "value": None,
            "method": "extraction_failed",
            "matched_verb": None,
            "matched_score_tier": None,
            "matched_position": None,
        }

    best_match_score = max(m[1] for m in matches)
    if _looks_like_statement(text_lower) and best_match_score <= 0.85:
        return {
            "value": _VERBS_DATA["implicit_verb_default"],
            "method": "implicit_imperative_default",
            "matched_verb": None,
            "matched_score_tier": None,
            "matched_position": None,
        }

    hedging_labels = {"hedged", "suggestion", "weak_suggestion", "preference"}
    hedging_matches = [m for m in matches if m[2] in hedging_labels]

    if len(hedging_matches) >= 2:
        best = min(hedging_matches, key=lambda x: x[1])
    else:
        best = max(matches, key=lambda x: x[1])

    if any(m[0] == "always" for m in matches):
        non_always = [m for m in matches if m[0] != "always" and m[2] == "bare_imperative"]
        if non_always:
            return {
                "value": 1.00,
                "method": "lookup",
                "matched_verb": f"always + {non_always[0][0]}",
                "matched_score_tier": 1.00,
                "matched_position": non_always[0][3],
            }

    return {
        "value": best[1],
        "method": "lookup",
        "matched_verb": best[0],
        "matched_score_tier": best[1],
        "matched_position": best[3],
    }


_NOUN_VERB_AMBIGUOUS = {
    "document", "format", "log", "name", "set", "watch",
    "report", "display", "record", "test", "check",
    "cache", "scope", "limit", "batch", "profile",
    "audit", "benchmark", "aggregate", "archive",
    "guard", "pin", "drain",
}

_NOUN_FOLLOWERS = {
    "headers", "files", "strings", "entries", "requests", "messages",
    "logs", "values", "types", "fields", "options",
    "conventions", "names", "rules", "paths", "settings",
    "keys", "items", "objects", "results", "records",
    "operations", "endpoints", "variables", "pages", "data",
    "clauses", "layers", "levels", "lines", "traits",
    "pipes", "pools", "connections", "events", "configs",
}


def _looks_like_statement(text_lower: str) -> bool:
    """Check if text is a statement form where a leading word is a noun, not a verb."""
    words = text_lower.split()
    if not words:
        return False

    statement_starts = [
        r'^(?:all|each|every|the|a|an|this|that|these|those)\s',
        r'^(?:files?|code|modules?|components?|functions?|classes|methods)\s',
        r'^tests?\s+(?!the\s|a\s|an\s)',
    ]
    for pat in statement_starts:
        if re.match(pat, text_lower):
            return True

    if len(words) >= 2 and words[0] in _NOUN_VERB_AMBIGUOUS:
        if words[1] in _NOUN_FOLLOWERS:
            return True

    return False


# ---------------------------------------------------------------------------
# F2: Framing Polarity
# ---------------------------------------------------------------------------

def score_f2(rule_text: str, f1_evidence: dict) -> dict:
    """Score F2 (framing polarity) using classification patterns."""
    text_lower = rule_text.lower()

    prohibition_patterns = _FRAMING_DATA["categories"][3]["patterns"]
    is_prohibition = any(p in text_lower for p in prohibition_patterns)

    hedged_patterns = _FRAMING_DATA["categories"][4]["patterns"]
    is_hedged = any(p in text_lower for p in hedged_patterns)

    alt_patterns = _FRAMING_DATA["categories"][0]["patterns"]
    has_alternative = any(p in text_lower for p in alt_patterns)

    if not has_alternative:
        is_contrast, _ = _has_contrast_not(rule_text)
        if is_contrast:
            has_alternative = True

    if is_prohibition:
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])|[;—–]\s*', rule_text)
        if len(sentences) >= 2:
            follow_up = " ".join(sentences[1:])
            if _has_positive_imperative(follow_up):
                return {"value": 0.70, "method": "classify", "matched_category": "positive_with_negative_clarification"}

        return {"value": 0.50, "method": "classify", "matched_category": "prohibition"}

    if is_hedged:
        return {"value": 0.35, "method": "classify", "matched_category": "hedged_preference"}

    if has_alternative:
        return {"value": 0.95, "method": "classify", "matched_category": "positive_with_alternative"}

    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', rule_text)
    if len(sentences) >= 2:
        first_positive = _has_positive_imperative(sentences[0])
        rest_has_prohibition = any(
            any(p in s.lower() for p in prohibition_patterns) for s in sentences[1:]
        )
        if first_positive and rest_has_prohibition:
            return {"value": 0.70, "method": "classify", "matched_category": "positive_with_negative_clarification"}

    return {"value": 0.85, "method": "classify", "matched_category": "positive_imperative"}


def _has_positive_imperative(text: str) -> bool:
    """Check if text contains a positive imperative (not a prohibition)."""
    text_lower = text.lower().strip()
    prohibition_markers = ["never", "do not", "don't", "avoid", "must not"]
    if any(text_lower.startswith(p) for p in prohibition_markers):
        return False
    for verb, score, label, _pattern in _VERB_TIERS:
        if label in ("bare_imperative", "unconditional_mandate") and re.search(r'(?:^|\s)' + re.escape(verb) + r'(?:\s|$|[,.])', text_lower):
            return True
    return False


def _has_contrast_not(text: str) -> tuple[bool, bool]:
    """Detect contrast-form 'not': 'X, not Y' or '`X` not `Y`'."""
    if re.search(r'`[^`]+`\s*[,;:]?\s+not\s+`[^`]+`', text):
        return (True, True)

    NEGATION_PATTERNS = [
        r'\b(?:is|are|was|were|be|been|being)\s+not\b',
        r',\s+not\s+\w+(?:ing|ed|ly)\b',
        r',\s+not\s+\w+\s+(?:on|to|in|with|from|by|at|of|as|for|after|before)\b',
    ]
    for pat in NEGATION_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return (False, True)

    if re.search(r',\s+not\s+\w+', text, re.IGNORECASE):
        return (True, False)

    return (False, True)


# ---------------------------------------------------------------------------
# F4: Load-Trigger Alignment
# ---------------------------------------------------------------------------

def score_f4(rule: dict, source_file: dict) -> dict:
    """Score F4 (load-trigger alignment); hestia files are always-loaded by default."""
    # Hestia source files have no globs — treat all files as always-loaded.
    # Keep the full F4 logic but globs is always [] and always_loaded is True.
    globs = source_file.get("globs", [])
    always_loaded = source_file.get("always_loaded", True)
    glob_match_count = source_file.get("glob_match_count")
    rule_text = rule["text"].lower()
    staleness = rule.get("staleness", {})

    if staleness.get("gated", False):
        return {"value": 0.05, "method": "stale", "loading": "glob-scoped" if globs else "always-loaded", "trigger_match": None}

    if globs and glob_match_count == 0:
        return {"value": 0.05, "method": "dead_glob", "loading": "glob-scoped", "trigger_match": None}

    if always_loaded and not globs:
        trigger_keywords = _extract_trigger_scope(rule_text)
        if trigger_keywords:
            return {"value": 0.40, "method": "misaligned", "loading": "always-loaded", "trigger_match": "specific_trigger_in_universal_file"}
        return {"value": 0.95, "method": "always_universal", "loading": "always-loaded", "trigger_match": "universal"}

    if globs:
        trigger_keywords = _extract_trigger_scope(rule_text)
        glob_keywords = _extract_glob_keywords(globs)

        if trigger_keywords:
            overlap = trigger_keywords & glob_keywords
            if overlap:
                return {"value": 0.95, "method": "glob_match", "loading": "glob-scoped", "trigger_match": "explicit_match"}
            else:
                return {"value": 0.25, "method": "wrong_scope", "loading": "glob-scoped", "trigger_match": "explicit_mismatch"}

        rule_keywords = _extract_rule_keywords(rule_text)
        overlap = rule_keywords & glob_keywords
        if overlap:
            return {"value": 0.90, "method": "keyword_overlap", "loading": "glob-scoped", "trigger_match": f"overlap:{','.join(sorted(overlap))}"}

        no_overlap_score = _WEIGHTS_DATA.get("F4_no_overlap_score", 0.85)
        return {"value": no_overlap_score, "method": "keyword_overlap", "loading": "glob-scoped", "trigger_match": "implicit_scope_trust"}

    ambiguous_score = _WEIGHTS_DATA.get("F4_ambiguous_score", 0.65)
    return {"value": ambiguous_score, "method": "no_signal", "loading": "ambiguous", "trigger_match": "fallback"}


def _extract_trigger_scope(text: str) -> set[str]:
    """Extract subsystem-specific trigger keywords from rule text."""
    triggers = set()
    patterns = [
        r'\bwhen\s+(?:editing|working\s+(?:on|with)|modifying|creating)\s+(\w+)\s+files?\b',
        r'\bfor\s+(\w+)\s+files?\b',
        r'\bin\s+(?:the\s+)?(\w+)\s+(?:directory|folder|module)\b',
        r'\bduring\s+(\w+)\b',
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            triggers.add(m.group(1).lower())
    return triggers


def _extract_glob_keywords(globs: list[str]) -> set[str]:
    """Extract meaningful keywords from glob patterns."""
    keywords = set()
    for g in globs:
        parts = re.split(r'[/\\*?.\[\]{}]+', g)
        for part in parts:
            part = part.lower().strip()
            if part and len(part) > 1 and part not in ("src", "lib", "test", "tests"):
                keywords.add(part)
    return keywords


def _extract_rule_keywords(text: str) -> set[str]:
    """Extract meaningful keywords from rule text for semantic matching."""
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    stop_words = {
        "the", "and", "for", "all", "new", "with", "not", "use", "when",
        "this", "that", "from", "into", "over", "than", "must", "should",
        "always", "never", "before", "after", "each", "every", "where",
        "only", "also", "just", "about", "more", "most", "some", "any",
    }
    return {w for w in words if w not in stop_words}


# ---------------------------------------------------------------------------
# F7: Concreteness
# ---------------------------------------------------------------------------

def _find_numeric_thresholds(text: str) -> list[str]:
    """Find bright-line numeric thresholds in rule text."""
    markers: list[str] = []
    for pattern in _NUMERIC_THRESHOLD_REGEX_COMPILED:
        for m in pattern.finditer(text):
            phrase = m.group(0).strip()
            if any(phrase in existing or existing in phrase for existing in markers):
                longer = [existing for existing in markers
                          if existing in phrase and existing != phrase]
                for existing in longer:
                    markers.remove(existing)
                if phrase not in markers:
                    markers.append(phrase)
                continue
            markers.append(phrase)
    return markers


def _find_concrete_markers(text: str) -> list[str]:
    """Find concrete markers in rule text."""
    markers = []

    for m in _BACKTICK_PATTERN.finditer(text):
        markers.append(m.group(1))

    text_stripped = _BACKTICK_PATTERN.sub('', text)

    for pattern in _CONCRETE_REGEX_COMPILED:
        for m in pattern.finditer(text_stripped):
            name = m.group(0)
            if name not in markers:
                markers.append(name)

    for phrase in _find_numeric_thresholds(text_stripped):
        if phrase not in markers:
            markers.append(phrase)

    text_lower = text.lower()
    existing_lower = [m.lower() for m in markers]
    for term, term_lower in _CONCRETE_TERMS_LOWER:
        if term_lower in text_lower:
            already_covered = any(
                term_lower in m_lower or m_lower in term_lower
                for m_lower in existing_lower
            )
            if not already_covered:
                markers.append(term)
                existing_lower.append(term_lower)

    return markers


def _find_abstract_markers(text: str) -> list[str]:
    """Find abstract markers in rule text."""
    markers = []
    text_lower = text.lower()
    for abstract in _MARKERS_DATA["abstract_markers"]:
        if abstract.lower() in text_lower:
            markers.append(abstract)
    return markers


def _score_from_ratio(concrete_count: int, abstract_count: int) -> float:
    """Score F7 based on concrete:abstract marker ratio and absolute counts."""
    if concrete_count == 0 and abstract_count == 0:
        return 0.05

    if concrete_count == 0:
        return 0.10

    if abstract_count == 0:
        if concrete_count >= 4:
            return 0.95
        elif concrete_count >= 2:
            return 0.85
        else:
            return 0.80

    ratio = concrete_count / (concrete_count + abstract_count)

    if ratio >= 0.80:
        return 0.75 + 0.10 * min(concrete_count / 4, 1.0)
    elif ratio >= 0.50:
        return 0.45 + 0.20 * ratio
    elif ratio >= 0.25:
        return 0.25 + 0.15 * ratio
    else:
        return 0.10 + 0.10 * ratio


def score_f7(rule_text: str) -> dict:
    """Score F7 (specificity) by counting concrete vs abstract markers."""
    concrete = _find_concrete_markers(rule_text)
    abstract = _find_abstract_markers(rule_text)

    value = _score_from_ratio(len(concrete), len(abstract))

    return {
        "value": round(value, 2),
        "method": "count",
        "concrete_markers": concrete,
        "abstract_markers": abstract,
        "concrete_count": len(concrete),
        "abstract_count": len(abstract),
    }


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    data = _lib.read_stdin_json()
    if data is None:
        _lib.fail("empty input")

    source_files = data.get("source_files", [])
    rules = data.get("rules", [])

    for rule in rules:
        file_idx = rule.get("file_index", 0)
        sf = source_files[file_idx] if file_idx < len(source_files) else {}

        if "factors" not in rule:
            rule["factors"] = {}

        f1 = score_f1(rule["text"])
        rule["factors"]["F1"] = f1

        f2 = score_f2(rule["text"], f1)
        rule["factors"]["F2"] = f2

        f4 = score_f4(rule, sf)
        rule["factors"]["F4"] = f4

        f7 = score_f7(rule["text"])
        rule["factors"]["F7"] = f7

        if f7["concrete_count"] > 0 and f7["abstract_count"] > 0:
            if "factor_confidence_low" not in rule:
                rule["factor_confidence_low"] = []
            if "F7" not in rule["factor_confidence_low"]:
                rule["factor_confidence_low"].append("F7")

        if f1["method"] == "extraction_failed":
            if "factor_confidence_low" not in rule:
                rule["factor_confidence_low"] = []
            if "F1" not in rule["factor_confidence_low"]:
                rule["factor_confidence_low"].append("F1")

    _lib.emit(data)


if __name__ == "__main__":
    main()
