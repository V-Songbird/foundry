"""Placement analyzer — detect when rules are better fit as hooks, skills, or subagents."""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent))
import _lib

# ---------------------------------------------------------------------------
# Load patterns at module scope — regexes compiled once, not per-rule.
# ---------------------------------------------------------------------------

_PATTERNS = _lib.load_data("placement_patterns")
_CANDIDATE_THRESHOLD = _PATTERNS["candidate_threshold"]
_COMPOUND_THRESHOLD = _PATTERNS["compound_threshold"]


def _compile_flags(flags_str: str | None) -> int:
    if not flags_str:
        return 0
    result = 0
    if "i" in flags_str:
        result |= re.IGNORECASE
    if "m" in flags_str:
        result |= re.MULTILINE
    if "s" in flags_str:
        result |= re.DOTALL
    return result


def _load_signals(primitive: str) -> list[dict]:
    """Load and compile signals for a primitive into plain dicts."""
    signals: list[dict] = []
    for raw in _PATTERNS[primitive]["signals"]:
        criterion = raw["criterion"]
        flags = _compile_flags(raw.get("flags"))
        sig: dict = {
            "name": raw["name"],
            "weight": raw["weight"],
            "criterion": criterion,
        }
        if criterion == "regex":
            sig["pattern"] = re.compile(raw["pattern"], flags)
        elif criterion == "factor_threshold":
            sig["factor"] = raw["factor"]
            sig["operator"] = raw["operator"]
            sig["threshold"] = raw["threshold"]
        elif criterion == "step_chain":
            sig["step_patterns"] = tuple(re.compile(p, flags) for p in raw["patterns"])
            sig["min_steps"] = raw["min_steps"]
        elif criterion == "pointer_shape":
            sig["max_action_verbs"] = raw["max_action_verbs"]
        else:
            raise ValueError(f"Unknown criterion type: {criterion}")
        signals.append(sig)
    return signals


_HOOK_SIGNALS = _load_signals("hook")
_SKILL_SIGNALS = _load_signals("skill")
_SUBAGENT_SIGNALS = _load_signals("subagent")

_SKILL_SUB_TYPE_RULES = _PATTERNS["skill"]["sub_type_rules"]
_SUBAGENT_SUB_TYPE_RULES = _PATTERNS["subagent"]["sub_type_rules"]

_COMPOUND_CONJUNCTION_PATTERN = re.compile(
    _PATTERNS["compound"]["conjunction_pattern"], re.IGNORECASE
)
_COMPOUND_COORDINATION_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in _PATTERNS["compound"]["coordination_phrases_for_glue"]
]

_ACTION_VERB_PATTERN = re.compile(
    r"\b(use|run|add|remove|create|update|delete|write|edit|never|always|"
    r"must|should|do\s+not|don't|follow|check|verify|ensure|prefer|avoid|"
    r"implement|refactor|rename|import|export|declare|return|throw|catch)\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Signal evaluators
# ---------------------------------------------------------------------------

def _eval_regex(signal: dict, text: str) -> bool:
    return bool(signal["pattern"].search(text))


def _eval_factor_threshold(signal: dict, factors: dict) -> bool:
    factor = factors.get(signal.get("factor", ""), {})
    val = factor.get("value")
    if val is None:
        return False
    threshold = signal.get("threshold")
    if threshold is None:
        return False
    op = signal.get("operator")
    if op == "<":
        return val < threshold
    if op == "<=":
        return val <= threshold
    if op == ">":
        return val > threshold
    if op == ">=":
        return val >= threshold
    if op == "==":
        return val == threshold
    return False


def _eval_step_chain(signal: dict, text: str) -> bool:
    """Fires when any step-chain pattern matches."""
    for pattern in signal.get("step_patterns", ()):
        if pattern.search(text):
            return True
    return False


def _eval_pointer_shape(signal: dict, text: str) -> bool:
    """Fires when action-verb count is at or below max_action_verbs."""
    verb_count = len(_ACTION_VERB_PATTERN.findall(text))
    max_verbs = signal.get("max_action_verbs", 1)
    return verb_count <= max_verbs


def _eval_signal(signal: dict, text: str, factors: dict) -> bool:
    criterion = signal["criterion"]
    if criterion == "regex":
        return _eval_regex(signal, text)
    if criterion == "factor_threshold":
        return _eval_factor_threshold(signal, factors)
    if criterion == "step_chain":
        return _eval_step_chain(signal, text)
    if criterion == "pointer_shape":
        return _eval_pointer_shape(signal, text)
    return False


# ---------------------------------------------------------------------------
# Primitive detectors
# ---------------------------------------------------------------------------

def _score_primitive(signals: list[dict], text: str, factors: dict) -> tuple[float, list[str]]:
    """Evaluate all signals for a primitive; return (confidence, evidence)."""
    total = 0.0
    evidence: list[str] = []
    for signal in signals:
        if _eval_signal(signal, text, factors):
            total += signal["weight"]
            evidence.append(signal["name"])
    return (min(total, 1.0), evidence)


def _pick_sub_type(evidence: list[str], rules: list[dict]) -> str | None:
    """Generic sub-type picker using requires_all_groups or requires_any."""
    evidence_set = set(evidence)
    for rule in rules:
        if "requires_all_groups" in rule:
            groups = rule["requires_all_groups"]
            if all(any(s in evidence_set for s in group) for group in groups):
                return rule["name"]
    best: tuple[str, int] | None = None
    for rule in rules:
        if "requires_any" not in rule:
            continue
        any_hits = [s for s in rule["requires_any"] if s in evidence_set]
        if not any_hits:
            continue
        excluded = rule.get("exclude", [])
        if any(s in evidence_set for s in excluded):
            continue
        if best is None or len(any_hits) > best[1]:
            best = (rule["name"], len(any_hits))
    return best[0] if best else None


def _skill_sub_type(evidence: list[str]) -> str | None:
    return _pick_sub_type(evidence, _SKILL_SUB_TYPE_RULES)


def _subagent_sub_type(evidence: list[str]) -> str | None:
    return _pick_sub_type(evidence, _SUBAGENT_SUB_TYPE_RULES)


def _hook_sub_type(text: str, confidence: float, evidence: list[str]) -> str | None:
    """Derive hook sub-type from signal pattern rather than config rules."""
    if "lifecycle-trigger-keyword" in evidence:
        return "lifecycle-event"
    if confidence >= 0.70 and ("mechanical-verb" in evidence or "tool-invocation-match" in evidence):
        return "deterministic-gate"
    if confidence >= _CANDIDATE_THRESHOLD:
        return "deterministic-gate"
    return None


# ---------------------------------------------------------------------------
# Compound detection
# ---------------------------------------------------------------------------

def _has_conjunction(text: str) -> bool:
    return bool(_COMPOUND_CONJUNCTION_PATTERN.search(text))


def _implies_coordination(text: str) -> bool:
    """True when the compound rule's parts imply temporal coordination."""
    return any(p.search(text) for p in _COMPOUND_COORDINATION_PATTERNS)


# ---------------------------------------------------------------------------
# Top-level detection
# ---------------------------------------------------------------------------

def detect_placement(rule: dict) -> dict:
    """Return the placement detection record for a single rule."""
    text = rule.get("text", "") or ""
    factors = rule.get("factors") or {}

    hook_conf, hook_evidence = _score_primitive(_HOOK_SIGNALS, text, factors)
    skill_conf, skill_evidence = _score_primitive(_SKILL_SIGNALS, text, factors)
    sub_conf, sub_evidence = _score_primitive(_SUBAGENT_SIGNALS, text, factors)

    all_scores = [
        ("hook", hook_conf, hook_evidence, lambda: _hook_sub_type(text, hook_conf, hook_evidence)),
        ("skill", skill_conf, skill_evidence, lambda: _skill_sub_type(skill_evidence)),
        ("subagent", sub_conf, sub_evidence, lambda: _subagent_sub_type(sub_evidence)),
    ]

    detections: list[dict] = []
    for primitive, conf, evidence, sub_type_fn in all_scores:
        if conf >= _CANDIDATE_THRESHOLD:
            detections.append({
                "primitive": primitive,
                "confidence": round(conf, 3),
                "evidence": evidence,
                "sub_type": sub_type_fn(),
            })

    above_compound_bar = [
        (primitive, conf) for primitive, conf, _, _ in all_scores
        if conf >= _COMPOUND_THRESHOLD
    ]
    is_compound = len(above_compound_bar) >= 2 and _has_conjunction(text)
    needs_glue = is_compound and _implies_coordination(text)

    if is_compound:
        best_fit: str | None = "compound"
    elif detections:
        best_fit = max(detections, key=lambda d: d["confidence"])["primitive"]
    else:
        best_fit = None

    return {
        "rule_id": rule.get("id"),
        "rule_text": text,
        "file": rule.get("file", ""),
        "line_start": rule.get("line_start"),
        "line_end": rule.get("line_end"),
        "detections": detections,
        "scores": {
            "hook": round(hook_conf, 3),
            "skill": round(skill_conf, 3),
            "subagent": round(sub_conf, 3),
        },
        "compound": is_compound,
        "compound_needs_glue": needs_glue,
        "best_fit": best_fit,
    }


def analyze_corpus(audit: dict) -> dict:
    """Run detection over every rule in an audit; return candidates report."""
    rules = audit.get("rules", [])
    candidates = [detect_placement(r) for r in rules]
    candidates = [c for c in candidates if c["detections"]]

    summary = {
        "total_candidates": len(candidates),
        "hook_candidates": sum(1 for c in candidates if c["best_fit"] == "hook"),
        "skill_candidates": sum(1 for c in candidates if c["best_fit"] == "skill"),
        "subagent_candidates": sum(1 for c in candidates if c["best_fit"] == "subagent"),
        "compound_candidates": sum(1 for c in candidates if c["best_fit"] == "compound"),
    }

    return {
        "schema_version": "0.1",
        "project": audit.get("project", ""),
        "audit_grade": _format_grade(audit),
        "candidates": candidates,
        "summary": summary,
    }


def _format_grade(audit: dict) -> str:
    """Format the audit grade as 'Letter (score)' for the placement report banner."""
    ecq = audit.get("effective_corpus_quality", {})
    score = ecq.get("score")
    if score is None:
        return "unknown"
    if score >= 0.80:
        letter = "A"
    elif score >= 0.65:
        letter = "B"
    elif score >= 0.50:
        letter = "C"
    elif score >= 0.35:
        letter = "D"
    else:
        letter = "F"
    return f"{letter} ({score:.3f})"


# ---------------------------------------------------------------------------
# Source-file surgery — atomic deletion of promoted rules.
# ---------------------------------------------------------------------------

class SourceDriftError(Exception):
    """Raised when a source file's content at the target line range does not match the recorded rule_text."""


def plan_deletions(moves: list[dict], project_root: Path) -> dict[Path, str]:
    """Compute new content for each source file with the named rules removed."""
    by_file: dict[Path, list[dict]] = {}
    for m in moves:
        path = (project_root / m["file"]).resolve()
        by_file.setdefault(path, []).append(m)

    new_contents: dict[Path, str] = {}
    for path, file_moves in by_file.items():
        new_contents[path] = _delete_ranges_from_file(path, file_moves)
    return new_contents


def _delete_ranges_from_file(path: Path, moves: list[dict]) -> str:
    """Read path, delete the line ranges named by moves, return new content."""
    if not path.exists():
        raise SourceDriftError(f"Source file not found: {path}")

    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    for m in moves:
        line_start = m["line_start"]
        line_end = m["line_end"]
        if line_start is None or line_end is None:
            raise SourceDriftError(f"Move for {path} has null line_start/line_end")
        if line_start < 1 or line_end > len(lines):
            raise SourceDriftError(
                f"Move for {path} out of bounds: lines {line_start}..{line_end} (file has {len(lines)} lines)"
            )
        span = "".join(lines[line_start - 1:line_end])
        if not _rule_text_matches(m.get("rule_text", ""), span):
            raise SourceDriftError(
                f"Source file drift at {path}:{line_start}..{line_end}. "
                f"Expected rule text does not match current content. Re-audit."
            )

    sorted_moves = sorted(moves, key=lambda m: m["line_start"], reverse=True)
    for m in sorted_moves:
        start_idx = m["line_start"] - 1
        end_idx = m["line_end"]
        lines = _delete_with_blank_line_cleanup(lines, start_idx, end_idx)

    return "".join(lines)


def _rule_text_matches(expected: str, span: str) -> bool:
    """Drift check: whitespace-tolerant comparison of expected rule_text to span content."""
    def normalize(s: str) -> str:
        s = re.sub(r"^\s*[-*+]\s+", "", s, flags=re.MULTILINE)
        s = re.sub(r"^\s*\d+\.\s+", "", s, flags=re.MULTILINE)
        s = re.sub(r"\s+", " ", s).strip()
        return s

    return normalize(expected) in normalize(span) or normalize(span) in normalize(expected)


def _delete_with_blank_line_cleanup(lines: list[str], start_idx: int, end_idx: int) -> list[str]:
    """Delete lines[start_idx:end_idx] and collapse double blank lines at the seam."""
    before = lines[:start_idx]
    after = lines[end_idx:]

    def _is_blank(line: str) -> bool:
        return line.strip() == ""

    if before and after and _is_blank(before[-1]) and _is_blank(after[0]):
        after = after[1:]

    return before + after


# ---------------------------------------------------------------------------
# PROMOTIONS.md assembly
# ---------------------------------------------------------------------------

_PRIMITIVE_DEFINITIONS = {
    "hook": (
        "Hooks are shell commands, HTTP endpoints, or prompts that fire "
        "automatically at Claude Code lifecycle events (`PreToolUse`, "
        "`PostToolUse`, `UserPromptSubmit`, `Stop`, and others). They run "
        "outside the model's context, cannot be rationalized around, and can "
        "short-circuit the agent loop. Use hooks for deterministic gates you "
        "want mechanically unavoidable."
    ),
    "skill": (
        "Skills are reusable instructions Claude loads on demand. "
        "**Reference skills** hold knowledge Claude consults during a task "
        "(API style guides, vocabulary). **Action skills** run a workflow "
        "you invoke with `/<name>` (e.g. `/deploy`). They don't burn context "
        "when irrelevant."
    ),
    "subagent": (
        "Subagents are isolated workers that run with their own context and "
        "return only a summary. Use them for tasks that read many files, "
        "involve noisy intermediate work, or benefit from bias independence "
        "(a fresh context unmotivated by the caller's assumptions)."
    ),
    "compound": (
        "A compound candidate is a rule whose verb chain mixes enforceability "
        "classes — one half is a deterministic gate (→ hook), the other is a "
        "judgment call (→ subagent), and a small skill may act as connective "
        "tissue that invokes both at the right moment. The mapping principle: "
        "**hooks** for deterministic gates you want mechanically unavoidable, "
        "**skills** for context-triggered procedural guidance the main agent "
        "follows, **subagents** for delimited tasks needing isolated reasoning "
        "or bias independence. If you find yourself encoding a judgment call "
        "in a hook or a mechanical check in a skill, you've misallocated."
    ),
}

_PRIMITIVE_DOCS_LINKS = {
    "hook": [
        ("Hooks overview", "https://code.claude.com/docs/en/features-overview#hooks"),
        ("Hooks in the agent loop", "https://code.claude.com/docs/en/agent-sdk/agent-loop#hooks"),
        ("Hooks reference", "https://code.claude.com/docs/en/hooks#hooks-reference"),
    ],
    "skill": [
        ("Skills overview", "https://code.claude.com/docs/en/features-overview#skills"),
        ("Skills in Claude Code", "https://code.claude.com/docs/en/agent-sdk/claude-code-features#skills"),
        ("Skills reference", "https://code.claude.com/docs/en/plugins-reference#skills"),
    ],
    "subagent": [
        ("Subagents overview", "https://code.claude.com/docs/en/features-overview#subagents"),
        ("Create custom subagents", "https://code.claude.com/docs/en/sub-agents#create-custom-subagents"),
        ("Use subagents for investigation", "https://code.claude.com/docs/en/best-practices#use-subagents-for-investigation"),
    ],
    "compound": [
        ("Claude Code features overview", "https://code.claude.com/docs/en/features-overview"),
    ],
}

_PRIMITIVE_HEADINGS = {
    "hook": "Hooks",
    "skill": "Skills",
    "subagent": "Subagents",
    "compound": "Compound candidates (rules that split across primitives)",
}

_PRIMITIVE_ORDER = ["hook", "skill", "subagent", "compound"]


def assemble_promotions_doc(moves_by_primitive: dict[str, list[dict]], project: str,
                             audit_grade: str, generated_at: str,
                             existing_content: str | None = None) -> str:
    """Render the full PROMOTIONS.md content; append to existing if provided."""
    existing_keys = _extract_existing_entry_keys(existing_content) if existing_content else set()

    lines: list[str] = []
    if existing_content is None:
        lines.append(_render_banner(project, audit_grade, generated_at))
    else:
        lines.append(existing_content.rstrip())
        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append(f"## Appended {generated_at}")
        lines.append("")
        lines.append(f"> Audit grade at append time: `{audit_grade}`")
        lines.append("")

    for primitive in _PRIMITIVE_ORDER:
        entries = moves_by_primitive.get(primitive, [])
        new_entries = [e for e in entries if _entry_key(e) not in existing_keys]
        if not new_entries:
            continue
        lines.append("---")
        lines.append("")
        lines.append(f"## {_PRIMITIVE_HEADINGS[primitive]}")
        lines.append("")
        lines.append(_PRIMITIVE_DEFINITIONS[primitive])
        lines.append("")
        lines.append("**Learn more:**")
        for label, url in _PRIMITIVE_DOCS_LINKS[primitive]:
            lines.append(f"- [{label}]({url})")
        lines.append("")
        lines.append("**Candidates from your rules:**")
        lines.append("")
        for entry in new_entries:
            lines.extend(_render_entry(entry, primitive))
            lines.append("")

    return "\n".join(lines) + "\n"


def _render_banner(project: str, audit_grade: str, generated_at: str) -> str:
    return (
        "# Hestia promotion candidates\n"
        "\n"
        "> ⚠️ **These items are documented, not enforced.** They were flagged "
        "as better-fit for a Claude Code primitive other than a rule. Hestia "
        "does not re-read this file on subsequent audits — nothing here affects "
        "your grade. Promote each item to the recommended primitive when you "
        "have time, and delete it from this file when you do.\n"
        ">\n"
        f"> **Generated:** {generated_at} · **Project:** {project} · "
        f"**From audit:** `{audit_grade}`\n"
    )


def _render_entry(entry: dict, primitive: str) -> list[str]:
    """Render a single candidate entry."""
    location = f"`{entry['file']}:{entry['line_start']}`"
    lines = [f"### {location}"]
    rule_text = _strip_bullet_marker((entry.get("rule_text") or "").rstrip())
    if rule_text:
        lines.append("")
        lines.append(f"> {rule_text}")
    lines.append("")
    if primitive == "compound":
        compound = entry.get("compound", {}) or {}
        split_hint = compound.get("split_hint", "")
        if split_hint:
            lines.append(f"- **Why split**: {split_hint}")
        for part_key in ("part_a", "part_b"):
            part = compound.get(part_key, {}) or {}
            if not part:
                continue
            lines.extend(_render_part(part, part_key.replace("_", " ").title()))
        glue = compound.get("glue")
        if glue:
            lines.extend(_render_part(glue, "Optional glue"))
    else:
        judgment = entry.get("judgment", {}) or {}
        if judgment.get("why"):
            lines.append(f"- **Why a {primitive}**: {judgment['why']}")
        if judgment.get("suggested_shape"):
            lines.append(f"- **Suggested shape**: {judgment['suggested_shape']}")
        if judgment.get("next_step"):
            lines.append(f"- **Next step**: {judgment['next_step']}")
        if judgment.get("tradeoff"):
            lines.append(f"- **Trade-off**: {judgment['tradeoff']}")
    return lines


_BULLET_MARKER_PATTERN = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+")


def _strip_bullet_marker(text: str) -> str:
    """Strip a leading markdown list marker from rule text."""
    return _BULLET_MARKER_PATTERN.sub("", text, count=1)


def _render_part(part: dict, label: str) -> list[str]:
    primitive = part.get("primitive", "").title()
    text = part.get("text", "")
    shape = part.get("suggested_shape", "")
    next_step = part.get("next_step", "")
    tradeoff = part.get("tradeoff")
    out = [f"- **{label}** → **{primitive}**: \"{text}\""]
    if shape:
        out.append(f"  - **Suggested shape**: {shape}")
    if next_step:
        out.append(f"  - **Next step**: {next_step}")
    if tradeoff:
        out.append(f"  - **Trade-off**: {tradeoff}")
    return out


def _entry_key(entry: dict) -> tuple:
    """Dedupe key: file + first 60 chars of normalized text."""
    return (
        entry.get("file"),
        _strip_bullet_marker(entry.get("rule_text") or "")[:60],
    )


_ENTRY_HEADER_NEW_PATTERN = re.compile(r"^###\s+`([^`]+):(\d+)`\s*$")
_ENTRY_HEADER_LEGACY_PATTERN = re.compile(r"^###\s+`([^`]+):(\d+)`\s+—\s+\"(.+)\"\s*$")
_BLOCKQUOTE_LINE_PATTERN = re.compile(r"^>\s+(.+)$")


def _extract_existing_entry_keys(content: str) -> set[tuple]:
    """Scan existing PROMOTIONS.md and return the set of dedupe keys already recorded."""
    keys: set[tuple] = set()
    lines = content.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        legacy = _ENTRY_HEADER_LEGACY_PATTERN.match(line)
        if legacy:
            file_path, _, text = legacy.groups()
            keys.add((file_path, _strip_bullet_marker(text)[:60]))
            i += 1
            continue
        new_header = _ENTRY_HEADER_NEW_PATTERN.match(line)
        if new_header:
            file_path, _ = new_header.groups()
            rule_text = ""
            for j in range(i + 1, min(i + 4, len(lines))):
                bq = _BLOCKQUOTE_LINE_PATTERN.match(lines[j])
                if bq:
                    rule_text = bq.group(1)
                    break
            keys.add((file_path, _strip_bullet_marker(rule_text)[:60]))
            i += 1
            continue
        i += 1
    return keys


# ---------------------------------------------------------------------------
# write_promotions orchestration (atomic)
# ---------------------------------------------------------------------------

def _collect_judgment_warnings(moves: list[dict]) -> list[str]:
    """Flag moves that will render as header-only entries due to missing judgment fields."""
    warnings: list[str] = []
    required_fields = ("why", "suggested_shape", "next_step")
    for move in moves:
        rule_id = move.get("rule_id", "<unknown>")
        primitive = move.get("primitive", "")
        if primitive == "compound":
            compound = move.get("compound") or {}
            if not compound.get("part_a") or not compound.get("part_b"):
                warnings.append(
                    f"{rule_id}: compound move is missing part_a or part_b; "
                    "PROMOTIONS.md entry will be header-only"
                )
            continue
        judgment = move.get("judgment") or {}
        missing = [f for f in required_fields if not judgment.get(f)]
        if missing:
            warnings.append(
                f"{rule_id}: move has no {'/'.join(missing)} in judgment; "
                "PROMOTIONS.md entry will be header-only. Generate the judgment "
                "strings per skills/audit/references/promotion-guide.md before "
                "writing."
            )
    return warnings


def write_promotions(payload: dict, project_root: Path) -> dict:
    """Execute the full write-promotions transaction (atomic, all-or-nothing)."""
    moves = payload.get("moves", [])
    if not moves:
        return {
            "schema_version": "0.1",
            "promotions_file": ".hestia/PROMOTIONS.md",
            "entries_written": 0,
            "files_modified": [],
            "rules_removed": 0,
            "status": "ok",
        }

    judgment_warnings = _collect_judgment_warnings(moves)

    project = payload.get("project", "")
    audit_grade = payload.get("audit_grade", "unknown")
    generated_at = payload.get("generated_at") or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    moves_by_primitive: dict[str, list[dict]] = {}
    for m in moves:
        primitive = m.get("primitive", "hook")
        moves_by_primitive.setdefault(primitive, []).append(m)

    try:
        new_source_contents = plan_deletions(moves, project_root)
    except SourceDriftError as e:
        return {
            "schema_version": "0.1",
            "status": "failed",
            "reason": f"source_file_drift: {e}",
            "promotions_file": ".hestia/PROMOTIONS.md",
            "entries_written": 0,
            "files_modified": [],
            "rules_removed": 0,
        }

    promotions_path = project_root / ".hestia" / "PROMOTIONS.md"
    existing_content: str | None = None
    if promotions_path.exists():
        with open(promotions_path, encoding="utf-8") as f:
            existing_content = f.read()
    new_doc = assemble_promotions_doc(
        moves_by_primitive, project, audit_grade, generated_at, existing_content
    )

    written: list[str] = []
    try:
        promotions_path.parent.mkdir(parents=True, exist_ok=True)
        _atomic_write(promotions_path, new_doc)
        written.append(".hestia/PROMOTIONS.md")

        for path, content in new_source_contents.items():
            _atomic_write(path, content)
            rel = path.relative_to(project_root) if path.is_relative_to(project_root) else path
            written.append(str(rel).replace("\\", "/"))
    except OSError as e:
        return {
            "schema_version": "0.1",
            "status": "failed",
            "reason": f"write_error: {e}",
            "promotions_file": ".hestia/PROMOTIONS.md",
            "entries_written": 0,
            "files_modified": written,
            "rules_removed": 0,
        }

    for w in judgment_warnings:
        print(f"WARNING: {w}", file=sys.stderr)

    result: dict = {
        "schema_version": "0.1",
        "promotions_file": ".hestia/PROMOTIONS.md",
        "entries_written": len(moves),
        "files_modified": [p for p in written if p != ".hestia/PROMOTIONS.md"],
        "rules_removed": len(moves),
        "status": "ok",
    }
    if judgment_warnings:
        result["warnings"] = judgment_warnings
    return result


def _atomic_write(path: Path, content: str) -> None:
    """Write content to path via a sibling temp file + os.replace (atomic)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(
        prefix=path.name + ".hestia-tmp-",
        dir=str(path.parent),
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as f:
            f.write(content)
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print("usage: placement.py [--prepare-placement <audit.json> | --write-promotions <project_root>]", file=sys.stderr)
        sys.exit(2)

    mode = sys.argv[1]

    if mode == "--prepare-placement":
        if len(sys.argv) < 3:
            print("usage: placement.py --prepare-placement <audit.json>", file=sys.stderr)
            sys.exit(2)
        audit_path = sys.argv[2]
        with open(audit_path, encoding="utf-8") as f:
            audit = json.load(f)
        result = analyze_corpus(audit)
        _lib.emit(result)
    elif mode == "--write-promotions":
        if len(sys.argv) < 3:
            print("usage: placement.py --write-promotions <project_root>", file=sys.stderr)
            sys.exit(2)
        project_root = Path(sys.argv[2]).resolve()
        payload = _lib.read_stdin_json()
        result = write_promotions(payload, project_root)
        _lib.emit(result)
        if result["status"] != "ok":
            sys.exit(1)
    else:
        print(f"Unknown mode: {mode}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
