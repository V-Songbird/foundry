"""Semi-mechanical factor scoring: F3 (trigger-action distance) and F8 (enforceability).

Pure JSON-in -> JSON-out. Reads scored JSON from stdin (with mechanical factors
already in `factors`), outputs same JSON with F3/F8 confidence flags added.
"""

from __future__ import annotations

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

_CONFIDENCE_DATA = _lib.load_data("semi_confidence")


# ---------------------------------------------------------------------------
# F3: Trigger-action distance confidence gating
# ---------------------------------------------------------------------------

def _evidence_f3(rule: dict) -> dict:
    """Extract F3 evidence from a rule dict as a plain dict."""
    factors = rule.get("factors", {})
    f3 = factors.get("F3", {})
    return {
        "value": f3.get("value"),
        "level": f3.get("level"),
        "method": f3.get("method", ""),
        "rule_id": rule.get("id", ""),
    }


def should_flag_f3(evidence: dict) -> bool:
    """Return True when F3 score is borderline and warrants LLM confirmation."""
    conf = _CONFIDENCE_DATA.get("F3")
    if not conf:
        return False
    value = evidence.get("value")
    if value is None:
        return True
    low, high = conf.get("flag_when_value_between", [0.35, 0.70])
    return low <= value <= high


# ---------------------------------------------------------------------------
# F8: Enforceability confidence gating
# ---------------------------------------------------------------------------

def _evidence_f8(rule: dict) -> dict:
    """Extract F8 evidence from a rule dict as a plain dict."""
    factors = rule.get("factors", {})
    f8 = factors.get("F8", {})
    return {
        "value": f8.get("value"),
        "level": f8.get("level"),
        "method": f8.get("method", ""),
        "rule_id": rule.get("id", ""),
    }


def should_flag_f8(evidence: dict) -> bool:
    """Return True when F8 score is borderline and warrants LLM confirmation."""
    conf = _CONFIDENCE_DATA.get("F8")
    if not conf:
        return False
    value = evidence.get("value")
    if value is None:
        return True
    low, high = conf.get("flag_when_value_between", [0.35, 0.70])
    return low <= value <= high


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    data = _lib.read_stdin_json()
    if not data:
        _lib.fail("empty input")
    rules = data.get("rules", [])

    for rule in rules:
        flags = rule.get("factor_confidence_low", [])

        f3_ev = _evidence_f3(rule)
        if should_flag_f3(f3_ev):
            if "F3" not in flags:
                flags.append("F3")

        f8_ev = _evidence_f8(rule)
        if should_flag_f8(f8_ev):
            if "F8" not in flags:
                flags.append("F8")

        if flags:
            rule["factor_confidence_low"] = flags

    _lib.emit(data)


if __name__ == "__main__":
    main()
