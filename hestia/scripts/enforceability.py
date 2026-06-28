"""Enforceability classifier — the "folklore check" (epistemics feature #1).

Grounded in iceberg's Axiom of Enforcement: *an unenforced rule is folklore.*
This module adds a quality dimension orthogonal to the F1–F8 clarity score: it
classifies each rule by HOW a violation could ever be detected.

Three classes:

  - ``enforceable`` — a hook / linter / test / build gate / Hestia probe could
    mechanically detect a violation. The rule names a runnable check, a command,
    a measurable threshold, or a concrete tool/path.
  - ``observable``  — Claude can self-check it at edit/author time. A concrete
    structural or style directive: a named construct + a directive verb, but no
    external check.
  - ``folklore``    — the rule hinges on unverifiable quality words ("clean",
    "maintainable", "properly", "robust", "as needed", …) with no checkable
    referent, and names no concrete construct. Folklore is flagged for
    rewrite-or-delete: an unenforceable rule trains Claude that the ruleset
    contains noise, which discounts the good rules next to it.

Design discipline (Hestia principles):

  - **Evidence-driven.** Every classification records the EVIDENCE token(s) that
    drove it (the matched verb / marker / quality-word). A folklore verdict with
    no quality-word evidence token is not folklore — it cannot be emitted.
  - **No magic numbers.** All lexicons are versioned ``_data/*.json`` files. The
    quality-word lexicon REUSES ``markers.json::abstract_markers`` plus a small
    supplemental list in ``enforceability.json``. Checkable-referent detection
    REUSES the F7 marker helpers in ``score_mechanical.py``. Directive verbs
    REUSE ``verbs.json``.
  - **Conservative.** When ambiguous, classify ``observable``, never folklore.
    Folklore requires the PRESENCE of a quality word AND the ABSENCE of any
    concrete/checkable token. We do not over-flag.

Standard library only. Importable in-process (the report/compose pipeline calls
``classify_rule`` directly) and runnable as a stdin->stdout filter for smoke
tests and the inter-script JSON contract.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8")
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent))
import _lib

# Reuse the F7 marker-detection helpers and the verb table rather than
# re-implementing concreteness/verb detection (DRY + single source of truth).
import score_mechanical as _sm


# ---------------------------------------------------------------------------
# Lexicons (all versioned data — no hardcoded word lists)
# ---------------------------------------------------------------------------

_ENF_DATA = _lib.load_data("enforceability")
_MARKERS_DATA = _lib.load_data("markers")

# Quality words = markers.json::abstract_markers (reused) + the supplemental
# list this feature owns. Lowercased once at module load.
_QUALITY_WORDS: list[str] = sorted(
    {
        *(w.lower() for w in _MARKERS_DATA.get("abstract_markers", [])),
        *(w.lower() for w in _ENF_DATA["quality_words"]["supplemental"]),
    },
    key=len,
    reverse=True,  # longest-first so "best practices" matches before "best"
)

_ENFORCEMENT_PHRASES: list[str] = [
    p.lower() for p in _ENF_DATA["enforcement_command_markers"]["phrases"]
]

# A backtick token that looks like a shell command (e.g. `npm test`,
# `prettier --check`) is a strong "runnable check" signal. Distinguished from a
# backtick identifier (e.g. `CreateUserSchema`) by containing whitespace or a
# leading flag — an identifier is a single token.
_BACKTICK = re.compile(r"`([^`]+)`")
_F8_ENFORCEABLE_CEILING = 0.50  # F8 <= this == mechanically enforceable (rubric_F8.md Levels 0–1)


# ---------------------------------------------------------------------------
# Signal detectors — each returns the matched evidence token(s), never a bool
# ---------------------------------------------------------------------------

def _command_like_backticks(text: str) -> list[str]:
    """Backtick tokens that look like a runnable command (have a space or a
    leading flag), e.g. `npm test`, `tsc --noEmit`. A single-token backtick
    (`Foo`, `src/api.ts`) is an identifier/path, not a command."""
    out: list[str] = []
    for m in _BACKTICK.finditer(text):
        tok = m.group(1).strip()
        if " " in tok or tok.startswith("-"):
            out.append(tok)
    return out


def _enforcement_phrases(text_lower: str) -> list[str]:
    """Phrases naming a runnable check / external gate (run, lint, coverage,
    pre-commit, must pass, …)."""
    return [p.strip() for p in _ENFORCEMENT_PHRASES if p in text_lower]


def _quality_words(text_lower: str) -> list[str]:
    """Unverifiable quality words present in the rule (longest-match-first,
    de-duplicating substrings: 'best practices' suppresses a bare 'best')."""
    found: list[str] = []
    for w in _QUALITY_WORDS:
        if re.search(r"(?:^|\W)" + re.escape(w) + r"(?:\W|$)", text_lower):
            # Skip if already covered by a longer phrase already matched.
            if any(w in longer and w != longer for longer in found):
                continue
            found.append(w)
    return found


def _enforceable_evidence(text: str, rule: dict | None) -> list[str]:
    """All tokens that make a rule mechanically enforceable: a runnable command,
    a numeric threshold, an enforcement phrase, or (when scored) an F8
    enforceability ceiling in the mechanically-enforceable band."""
    text_lower = text.lower()
    evidence: list[str] = []
    evidence.extend(_command_like_backticks(text))
    evidence.extend(_enforcement_phrases(text_lower))
    # Bright-line numeric thresholds (markers.json) — "coverage >= 80%", "< 200 lines".
    evidence.extend(_sm._find_numeric_thresholds(_sm._BACKTICK_PATTERN.sub("", text)))
    # F8 corroboration when the judgment factor is present (rubric_F8.md).
    if rule is not None:
        f8 = rule.get("factors", {}).get("F8", {})
        f8_val = f8.get("value")
        if isinstance(f8_val, (int, float)) and f8_val <= _F8_ENFORCEABLE_CEILING:
            evidence.append(f"F8={round(f8_val, 2)}")
    # De-dupe preserving order.
    seen: set[str] = set()
    out: list[str] = []
    for e in evidence:
        key = e.lower()
        if key not in seen:
            seen.add(key)
            out.append(e)
    return out


def _directive_verb(text: str) -> str | None:
    """The strongest directive verb in the rule (reusing the F1 verb table).
    A directive verb + a concrete construct is what makes a rule self-checkable
    (observable)."""
    f1 = _sm.score_f1(text)
    return f1.get("matched_verb")


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------

def classify_rule(rule: dict) -> dict:
    """Classify one rule's enforceability dimension.

    Returns a dict attached to the rule under ``rule["enforceability"]``:

        {
          "class": "enforceable" | "observable" | "folklore",
          "evidence": [<matched token(s) that drove the decision>],
          "concrete_markers": [...],   # checkable referents, if any
          "quality_words": [...],      # unverifiable words, if any
          "rationale": "<one-line why>",
        }

    Decision order (conservative — ambiguous falls to observable, never folklore):

      1. ENFORCEABLE  if a runnable check is named (command, threshold,
         enforcement phrase, or F8 in the mechanically-enforceable band).
      2. FOLKLORE     only if a quality word is present AND there is NO concrete
         construct (no F7 concrete marker) AND no directive-verb-on-a-construct.
         Requires a quality-word evidence token — never emitted without one.
      3. OBSERVABLE   everything else: a concrete construct and/or a directive
         verb Claude can self-check, OR an ambiguous rule (the safe default).
    """
    text = rule.get("text", "") or ""

    enf_evidence = _enforceable_evidence(text, rule)
    # Concrete checkable referents (F7 lexicon: backtick ids, paths, named
    # frameworks/constructs). Reused, not re-implemented.
    concrete = _sm._find_concrete_markers(text)
    quality = _quality_words(text.lower())
    verb = _directive_verb(text)

    if enf_evidence:
        return {
            "class": "enforceable",
            "evidence": enf_evidence,
            "concrete_markers": concrete,
            "quality_words": quality,
            "rationale": (
                "names a runnable check (command, threshold, gate, or "
                "mechanically-enforceable ceiling) a hook/linter/test could verify"
            ),
        }

    # Folklore requires BOTH a quality word AND no concrete construct. The
    # conservative gate: a single concrete marker is enough to make the rule
    # self-checkable, so it is observable, not folklore.
    if quality and not concrete:
        return {
            "class": "folklore",
            "evidence": list(quality),  # evidence-driven: the quality word(s)
            "concrete_markers": [],
            "quality_words": quality,
            "rationale": (
                "hinges on unverifiable quality word(s) with no concrete "
                "construct, command, or threshold to check against"
            ),
        }

    # Observable — the safe default. A concrete construct and/or a directive
    # verb Claude can self-check at edit time, or an ambiguous rule we decline
    # to flag as folklore.
    drivers: list[str] = []
    if concrete:
        drivers.extend(concrete)
    if verb:
        drivers.append(verb)
    rationale = (
        "names a concrete construct and/or directive verb Claude can self-check "
        "at edit time, but no external mechanical check"
        if drivers
        else "no quality-word/concrete signal — conservatively left self-checkable, not flagged"
    )
    return {
        "class": "observable",
        "evidence": drivers,
        "concrete_markers": concrete,
        "quality_words": quality,
        "rationale": rationale,
    }


def classify_rules(rules: list[dict]) -> list[dict]:
    """Attach an ``enforceability`` classification to every rule in place and
    return the list (for chaining)."""
    for rule in rules:
        rule["enforceability"] = classify_rule(rule)
    return rules


# ---------------------------------------------------------------------------
# CLI — stdin JSON {rules:[...]} -> stdout same JSON with classifications
# ---------------------------------------------------------------------------

def main() -> None:
    data = _lib.read_stdin_json()
    if data is None:
        _lib.fail("empty input")
    rules = data.get("rules", []) if isinstance(data, dict) else data
    classify_rules(rules)
    _lib.emit(data)


if __name__ == "__main__":
    main()
