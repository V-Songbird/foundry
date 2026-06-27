"""Parse and validate raw model judgment output into judgment_patches.json."""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# ---------------------------------------------------------------------------
# Level-range tables (canonical from rubric docs)
# ---------------------------------------------------------------------------

# Each entry: (level, lower_bound, upper_bound)
# Sorted highest-level-first for scan resolution
F3_LEVELS: list[tuple[int, float, float]] = [
    (4, 0.90, 1.00),
    (3, 0.65, 0.85),
    (2, 0.40, 0.60),
    (1, 0.15, 0.35),
    (0, 0.00, 0.10),
]

F8_LEVELS: list[tuple[int, float, float]] = [
    (3, 0.85, 1.00),
    (2, 0.55, 0.80),
    (1, 0.30, 0.50),
    (0, 0.10, 0.25),
]

REASONING_MAX_LEN = 80
KNOWN_PATCH_FIELDS = {"F6_patch", "F7_patch", "F1_patch"}
JUDGMENT_FACTORS = {"F3", "F8"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _warn(msg: str) -> None:
    print(f"WARNING: {msg}", file=sys.stderr)


def _fatal(msg: str) -> None:
    print(f"FATAL: {msg}", file=sys.stderr)
    sys.exit(1)


_OPENING_FENCE_PATTERN = re.compile(r'^```\w*\s*\n')
_CLOSING_FENCE_PATTERN = re.compile(r'\n```\s*$')


def strip_fences(text: str) -> str:
    """Remove markdown code fences wrapping the JSON."""
    text = text.strip()
    text = _OPENING_FENCE_PATTERN.sub('', text)
    text = _CLOSING_FENCE_PATTERN.sub('', text)
    return text


def _find_balanced_array(text: str, start: int) -> int | None:
    """Find the matching ']' for text[start]=='[' respecting string literals."""
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if escape:
            escape = False
            continue
        if ch == '\\' and in_string:
            escape = True
            continue
        if ch == '"' and not escape:
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                return i
    return None


def extract_json_array(text: str) -> list[dict]:
    """Find the outermost JSON array in text using bracket-balance counting."""
    pos = 0
    while True:
        start = text.find('[', pos)
        if start == -1:
            break

        end = _find_balanced_array(text, start)
        if end is None:
            pos = start + 1
            continue

        substr = text[start:end + 1]
        try:
            parsed = json.loads(substr)
        except json.JSONDecodeError:
            pos = start + 1
            continue

        if isinstance(parsed, list):
            return parsed

        pos = start + 1

    raise ValueError("No valid JSON array found in input")


def resolve_level(value: float, level_table: list[tuple[int, float, float]]) -> int:
    """Resolve a value to the highest level where value >= lower_bound."""
    for level, lower, upper in level_table:
        if value >= lower:
            return level
    return level_table[-1][0]


def level_midpoint(level: int, level_table: list[tuple[int, float, float]]) -> float:
    """Return the midpoint of a level's range."""
    for lev, lower, upper in level_table:
        if lev == level:
            return round((lower + upper) / 2, 2)
    return 0.50


def validate_value_range(
    rule_id: str,
    factor_name: str,
    value: float | None,
    stated_level: int | None,
    level_table: list[tuple[int, float, float]],
) -> tuple[float | None, int | None]:
    """Validate that value falls within the stated level's range; level wins on mismatch."""
    if value is None or stated_level is None:
        return (None, None)

    stated_range = None
    for lev, lower, upper in level_table:
        if lev == stated_level:
            stated_range = (lower, upper)
            break

    if stated_range is None:
        _warn(f"{rule_id} {factor_name}: unknown level {stated_level}, keeping value {value}")
        return (value, stated_level)

    lower, upper = stated_range
    if lower <= value <= upper:
        return (value, stated_level)

    resolved_level = resolve_level(value, level_table)
    if resolved_level == stated_level:
        return (value, stated_level)

    corrected_value = level_midpoint(stated_level, level_table)
    _warn(
        f"{rule_id} {factor_name}: value {value} outside level {stated_level} "
        f"range [{lower}, {upper}]. Corrected to {corrected_value} (level midpoint)."
    )
    return (corrected_value, stated_level)


def truncate_reasoning(reasoning: str) -> str:
    """Truncate reasoning to REASONING_MAX_LEN characters."""
    if len(reasoning) <= REASONING_MAX_LEN:
        return reasoning
    return reasoning[:REASONING_MAX_LEN - 3] + "..."


def validate_factor(rule_id: str, factor_name: str, factor_data: dict, level_table: list[tuple[int, float, float]]) -> dict | None:
    """Validate and normalize a single factor entry; returns None if entirely malformed."""
    if not isinstance(factor_data, dict):
        _warn(f"{rule_id} {factor_name}: expected dict, got {type(factor_data).__name__}")
        return None

    value = factor_data.get("value")
    level = factor_data.get("level")
    reasoning = factor_data.get("reasoning", "")

    if value is None and level is None:
        return {
            "value": None,
            "level": None,
            "reasoning": truncate_reasoning(str(reasoning)) if reasoning else "model_could_not_score",
        }

    if not isinstance(value, (int, float)):
        _warn(f"{rule_id} {factor_name}: value must be a number, got {type(value).__name__}")
        return None
    if not isinstance(level, int):
        _warn(f"{rule_id} {factor_name}: level must be an integer, got {type(level).__name__}")
        return None

    value = float(value)

    if value < 0.0 or value > 1.0:
        _warn(f"{rule_id} {factor_name}: value {value} outside [0, 1], clamping")
        value = max(0.0, min(1.0, value))

    value, level = validate_value_range(rule_id, factor_name, value, level, level_table)

    return {
        "value": value,
        "level": level,
        "reasoning": truncate_reasoning(str(reasoning)),
    }


def validate_entry(entry: dict, idx: int) -> tuple[str | None, dict]:
    """Validate a single array entry; returns (rule_id, patches) or (None, {}) on failure."""
    if not isinstance(entry, dict):
        _warn(f"Entry {idx}: expected dict, got {type(entry).__name__}, skipping")
        return (None, {})

    rule_id = entry.get("id")
    if not rule_id or not isinstance(rule_id, str):
        _warn(f"Entry {idx}: missing or invalid 'id' field, skipping")
        return (None, {})

    patches = {}

    f3_data = entry.get("F3")
    if f3_data is not None:
        validated = validate_factor(rule_id, "F3", f3_data, F3_LEVELS)
        if validated is not None:
            patches["F3"] = validated
        else:
            patches["F3"] = {"value": None, "level": None, "reasoning": "parse_validation_failed"}
    else:
        patches["F3"] = {"value": None, "level": None, "reasoning": "model_omitted"}
        _warn(f"{rule_id}: F3 missing from entry")

    f8_data = entry.get("F8")
    if f8_data is not None:
        validated = validate_factor(rule_id, "F8", f8_data, F8_LEVELS)
        if validated is not None:
            patches["F8"] = validated
        else:
            patches["F8"] = {"value": None, "level": None, "reasoning": "parse_validation_failed"}
    else:
        patches["F8"] = {"value": None, "level": None, "reasoning": "model_omitted"}
        _warn(f"{rule_id}: F8 missing from entry")

    for field_name in KNOWN_PATCH_FIELDS:
        if field_name in entry:
            patch_data = entry[field_name]
            if not isinstance(patch_data, dict):
                _warn(f"{rule_id}: {field_name} must be an object with a 'value' key, got {type(patch_data).__name__}; dropping")
                continue
            if "value" not in patch_data:
                _warn(f"{rule_id}: {field_name} is missing required 'value' key; dropping (keys present: {sorted(patch_data.keys())})")
                continue
            val = patch_data["value"]
            if val is not None and not isinstance(val, (int, float)):
                _warn(f"{rule_id}: {field_name}.value must be a number or null, got {type(val).__name__}; dropping")
                continue
            if isinstance(val, (int, float)) and not (0.0 <= float(val) <= 1.0):
                _warn(f"{rule_id}: {field_name}.value must be in [0, 1], got {val}; dropping")
                continue
            if "reasoning" in patch_data:
                patch_data["reasoning"] = truncate_reasoning(str(patch_data["reasoning"]))
            patches[field_name] = patch_data

    return (rule_id, patches)


def build_patches(entries: list[dict], expected_ids: set[str]) -> dict:
    """Transform validated array entries into patches map; handle missing IDs."""
    patches = {}
    seen_ids = set()

    for idx, entry in enumerate(entries):
        rule_id, rule_patches = validate_entry(entry, idx)
        if rule_id is None:
            continue
        if rule_id in seen_ids:
            _warn(f"{rule_id}: duplicate entry, last one wins")
        seen_ids.add(rule_id)
        patches[rule_id] = rule_patches

    missing_ids = expected_ids - seen_ids
    if missing_ids:
        total = len(expected_ids)
        tolerance = max(2, math.ceil(0.05 * total))

        for mid in sorted(missing_ids):
            _warn(f"{mid}: not found in model output, inserting null entry")
            patches[mid] = {
                "F3": {"value": None, "level": None, "reasoning": "model_omitted"},
                "F8": {"value": None, "level": None, "reasoning": "model_omitted"},
            }

        if len(missing_ids) > tolerance:
            _fatal(
                f"{len(missing_ids)} of {total} rule IDs missing from model output "
                f"(tolerance: {tolerance}). Model may have truncated. "
                f"Missing: {', '.join(sorted(missing_ids)[:10])}{'...' if len(missing_ids) > 10 else ''}"
            )

    unexpected = seen_ids - expected_ids
    for uid in sorted(unexpected):
        _warn(f"{uid}: in model output but not in scored_semi.json, ignoring")
        patches.pop(uid, None)

    return patches


def load_expected_rule_ids(scored_semi_path: str) -> set[str]:
    """Load expected rule IDs from scored_semi.json; validates schema_version."""
    with open(scored_semi_path, encoding="utf-8") as f:
        data = json.load(f)

    schema_version = data.get("schema_version")
    if schema_version is None:
        _warn("scored_semi.json has no schema_version field; assuming 0.1")
    elif schema_version != "0.1":
        _fatal(f"scored_semi.json schema_version is '{schema_version}', expected '0.1'. "
               f"Pipeline version skew — regenerate scored_semi.json with the current scripts.")

    rules = data.get("rules", [])
    return {r["id"] for r in rules if "id" in r}


def main() -> None:
    if len(sys.argv) < 2:
        _fatal("Usage: parse_judgment.py <scored_semi.json> [--expected-ids R001,...] "
               "[--input file] [--output file]")

    input_path = None
    output_path = None
    expected_ids_override = None
    positional = []
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--input" and i + 1 < len(args):
            input_path = args[i + 1]
            i += 2
        elif args[i] == "--output" and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        elif args[i] == "--expected-ids" and i + 1 < len(args):
            expected_ids_override = set(args[i + 1].split(","))
            i += 2
        else:
            positional.append(args[i])
            i += 1

    if not positional:
        _fatal("Missing scored_semi.json argument")
    scored_semi_path = positional[0]

    try:
        all_ids = load_expected_rule_ids(scored_semi_path)
    except (FileNotFoundError, json.JSONDecodeError, KeyError) as e:
        _fatal(f"Cannot read scored_semi.json: {e}")

    if not all_ids:
        _fatal("scored_semi.json contains no rules")

    expected_ids = expected_ids_override if expected_ids_override else all_ids

    if input_path:
        with open(input_path, encoding="utf-8") as f:
            raw_input = f.read()
    else:
        raw_input = sys.stdin.read()
    if not raw_input.strip():
        _fatal("Empty input" + (f" from {input_path}" if input_path else " on stdin"))

    cleaned = strip_fences(raw_input)

    try:
        entries = extract_json_array(cleaned)
    except ValueError as e:
        _fatal(str(e))

    patches = build_patches(entries, expected_ids)

    output = {
        "schema_version": "0.1",
        "model_version": "unknown",
        "patches": patches,
    }
    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
    else:
        json.dump(output, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")


if __name__ == "__main__":
    main()
