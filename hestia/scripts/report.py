"""Report renderer: audit.json -> markdown report or JSON passthrough.

Pure JSON-in -> text-out. Reads audit.json from stdin.
Use --json flag for JSON passthrough.

Renders the quality report with letter grades. Scores measure how clearly
Claude can parse and apply each rule -- a structural-clarity heuristic,
not a compliance predictor.

FINDING CONTRACT — Part D (counted facts, no counterfactual).
This module states COUNTED facts only: tallies actually observed in the corpus
("3 stale refs, 2 trigger-less rules", "12 of 20 rules grade B+"). It MUST
NEVER claim counterfactual impact — e.g. "improved setup health 40%" — because
there is no baseline for the un-fixed alternative, so such a number would be
fabricated. The health SCORE shown (effective corpus quality) is a transparent,
count-derived index whose components (file scores, factor values) are listed
inline and in --verbose; it is not a before/after improvement claim. There is
deliberately NO API here that emits a counterfactual percentage.

Every report also closes with a "Limits — what this run could not check"
section (Part C): out-of-scope surfaces, unverifiable things, and the residual
risk the dev still owns. Empty sub-checks are stated explicitly, never silenced.
"""

from __future__ import annotations

import json
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

_WEIGHTS_DATA = _lib.load_data("weights")

# ---------------------------------------------------------------------------
# Friendly language mappings (factor code -> plain language)
# ---------------------------------------------------------------------------

_FRIENDLY_PROBLEMS = {
    "F1": "Weak verb — Claude isn't sure if this is a command or a suggestion",
    "F2": "Phrased as a prohibition — positive instructions stick better",
    "F3": "Unclear when this applies — Claude won't remember it at the right moment",
    "F4": "Loaded in the wrong context — Claude won't see this rule when it matters",
    "F7": "Too vague — Claude needs specific examples to follow this",
}

_FRIENDLY_FIXES = {
    "F1": "Start with a clear action verb: Use, Always, Never, Run",
    "F2": "Flip from 'don't do X' to 'do Y instead'",
    "F3": "Add a trigger: 'When editing X...' or 'Before committing...'",
    "F4": "Move to a scoped rule file with paths: frontmatter, or broaden the language",
    "F7": "Add a file path, code example, or before/after comparison",
}

_FAILURE_CLASS_LABELS = {
    "drift": "drift (rule may not fire at the right moment)",
    "ambiguity": "ambiguity (rule reads multiple ways)",
    "conflict": "conflict (rule contradicts another rule)",
}

_FRIENDLY_STRENGTHS = {
    "F1": "Strong action verb",
    "F2": "Clear positive framing",
    "F3": "Specific trigger context",
    "F4": "Well-scoped to the right files",
    "F7": "Concrete examples or file paths",
}


def _letter_grade(score: float) -> str:
    """Map a 0.0-1.0 quality score to a letter grade."""
    if score >= 0.80:
        return "A"
    if score >= 0.65:
        return "B"
    if score >= 0.50:
        return "C"
    if score >= 0.35:
        return "D"
    return "F"


def _most_frequent_dominant_weakness(rules: list[dict]) -> str | None:
    """Return the most common dominant_weakness factor across mandate rules."""
    counts: dict[str, int] = {}
    for r in rules:
        if r.get("category") != "mandate":
            continue
        dw = r.get("dominant_weakness")
        if dw:
            counts[dw] = counts.get(dw, 0) + 1
    if not counts:
        return None
    return max(counts.items(), key=lambda kv: kv[1])[0]


def _failure_class_counts(rules: list[dict]) -> dict[str, int]:
    """Count mandate rules per failure class."""
    counts: dict[str, int] = {}
    for r in rules:
        if r.get("category") != "mandate":
            continue
        fc = r.get("failure_class")
        if fc:
            counts[fc] = counts.get(fc, 0) + 1
    return counts


def _render_failure_class_summary(lines: list[str], rules: list[dict]) -> None:
    """Render a one-line corpus summary counting rules by failure class."""
    counts = _failure_class_counts(rules)
    if not counts:
        return
    order = ["drift", "ambiguity", "conflict"]
    parts = []
    for cls in order:
        n = counts.get(cls, 0)
        if n > 0:
            parts.append(f"{n} {cls}")
    if parts:
        lines.append(f"**At-risk rules:** {', '.join(parts)}.\n")


def render_markdown(audit: dict, verbose: bool = False) -> str:
    """Render the quality report in friendly markdown."""
    lines = []
    rules = audit.get("rules", [])

    # 1. Grade headline
    _render_grade_headline(lines, audit)

    # 2. What to fix first (skipped if all mandate rules score B+)
    _render_fix_groups(lines, rules)

    # 3. Your best rules
    _render_best_rules(lines, audit)

    # 4. Potential conflicts (corpus-level; may be empty)
    _render_potential_conflicts(lines, audit)

    # 5. Hook opportunities (F8 parallel signal)
    _render_hook_opportunities(lines, audit)

    # 5. Suggested Rewrites (--fix mode, if present)
    fix_rewrites = audit.get("rewrites", [])
    if fix_rewrites:
        _render_rewrites(lines, fix_rewrites)

    # 5. Verbose detailed section (--verbose only)
    if verbose:
        _render_verbose_section(lines, audit)

    # 6. Limits — what this run could not check (always rendered)
    _render_limits(lines, audit)

    # 7. Disclaimer
    lines.append("---\n")
    lines.append("*This report measures how clearly Claude can parse and apply your rules. "
                 "Actual compliance depends on factors beyond rule text — this audit optimizes "
                 "the structural part authors control. Counts above are observed tallies, not "
                 "before/after impact estimates.*")

    return "\n".join(lines)


def _render_limits(lines: list[str], audit: dict) -> None:
    """Render the closing "Limits — what this run could not check" section.

    Part C of the finding contract: ALWAYS renders. Empty sub-checks are stated
    explicitly ("No potential conflicts surfaced."), never silenced — silence
    would let the dev assume a surface was cleared when it was merely skipped.
    """
    lines.append("---\n")
    lines.append("## Limits — what this run could not check\n")

    # Emitter-contributed notes (each is {scope, detail, residual_risk?}).
    notes = audit.get("limits") or []
    for note in notes:
        detail = note.get("detail", "")
        if not detail:
            continue
        lines.append(f"- {detail}")
        rr = note.get("residual_risk")
        if rr:
            lines.append(f"  - Residual risk: {rr}")

    # Standing limits of the rules engine, stated as explicit facts even when the
    # corresponding result set is empty (never silent).
    lines.append("- Scoring is English-only; non-English rules get inaccurate scores.")
    lines.append("- Structural clarity only — this does NOT predict whether Claude will "
                 "actually comply, nor whether a rule is correct for your project.")

    conflicts = audit.get("conflicts", [])
    if conflicts:
        n = len(conflicts)
        pair_word = "pair" if n == 1 else "pairs"
        lines.append(f"- Conflict scan flagged {n} candidate {pair_word} (vocabulary "
                     "overlap) — confirm each by reading the rules; some are false positives.")
    else:
        lines.append("- No potential conflicts surfaced. (A clean conflict scan is not a "
                     "proof of consistency — it only checks shared concrete markers.)")

    degraded = sum(1 for r in audit.get("rules", [])
                   if r.get("category") == "mandate" and r.get("degraded"))
    if degraded:
        noun = "rule was" if degraded == 1 else "rules were"
        lines.append(f"- {degraded} {noun} scored on fewer than all factors; missing "
                     "factors were excluded, not defaulted.")
    else:
        lines.append("- All scored rules had every factor available — no degraded scores.")

    lines.append("")


# ---------------------------------------------------------------------------
# Section renderers
# ---------------------------------------------------------------------------

def _render_grade_headline(lines: list[str], audit: dict) -> None:
    """Render the grade headline with plain-language summary."""
    rules = audit.get("rules", [])
    mandate_rules = [r for r in rules if r.get("category") == "mandate"]
    ecq = audit.get("effective_corpus_quality", {})
    ecq_score = ecq.get("score", 0)
    ecq_grade = _letter_grade(ecq_score)
    total = len(mandate_rules)
    good = sum(1 for r in mandate_rules if r.get("score", 0) >= 0.65)
    need_work = total - good

    lines.append("# Hestia Rules Audit\n")

    if need_work == 0 and total > 0:
        lines.append(f"**Grade: {ecq_grade}** — all {total} rules are clear enough "
                      f"for Claude to follow well.\n")
    elif total > 0:
        lines.append(f"**Grade: {ecq_grade}** — {good} of your {total} rules are clear enough "
                      f"for Claude to follow well. The other {need_work} need work.\n")
    else:
        lines.append(f"**Grade: {ecq_grade}** — no mandate rules found.\n")

    if need_work > 0:
        corpus_dw = _most_frequent_dominant_weakness(rules)
        if corpus_dw:
            friendly = _FRIENDLY_PROBLEMS.get(corpus_dw, corpus_dw)
            lines.append(f"**Biggest issue:** {friendly}\n")
        _render_failure_class_summary(lines, rules)

    conflicts = audit.get("conflicts", [])
    if conflicts:
        n = len(conflicts)
        pair_word = "pair" if n == 1 else "pairs"
        lines.append(f"**Potential conflicts:** {n} rule {pair_word} — see section below.\n")

    degraded_count = sum(1 for r in mandate_rules if r.get("degraded", False))
    if degraded_count:
        noun = "rule was" if degraded_count == 1 else "rules were"
        lines.append(f"**Note:** {degraded_count} {noun} scored on fewer than all factors "
                      f"(some factors were not scorable). These rules are marked in the detailed view; "
                      f"run with `--verbose` to see which factors were missing.\n")

    lines.append("---\n")


def _render_fix_groups(lines: list[str], rules: list[dict]) -> None:
    """Render 'What to fix first' grouped by dominant weakness."""
    mandate = [r for r in rules if r.get("category") == "mandate"]
    weak = [r for r in mandate if r.get("score", 0) < 0.50]

    if not weak:
        return

    lines.append("## What to fix first\n")

    groups: dict[str, list[dict]] = {}
    no_dw: list[dict] = []
    for r in weak:
        dw = r.get("dominant_weakness")
        if dw:
            groups.setdefault(dw, []).append(r)
        else:
            no_dw.append(r)

    sorted_groups = sorted(groups.items(), key=lambda kv: len(kv[1]), reverse=True)

    group_num = 0
    others: list[dict] = list(no_dw)

    for dw, group_rules in sorted_groups:
        if len(group_rules) < 2:
            others.extend(group_rules)
            continue
        group_num += 1
        friendly_problem = _FRIENDLY_PROBLEMS.get(dw, dw)
        friendly_fix = _FRIENDLY_FIXES.get(dw, "Review and improve")
        short_problem = friendly_problem.split(" — ")[0] if " — " in friendly_problem else friendly_problem

        lines.append(f"### {group_num}. {short_problem} (~{len(group_rules)} rules)\n")
        lines.append("| Rule | File | Problem |")
        lines.append("|------|------|---------|")
        for r in group_rules[:8]:
            text = r.get("text", "")[:80]
            if len(r.get("text", "")) > 80:
                text += "..."
            file_loc = f"{r.get('file', '?')}:{r.get('line_start', '?')}"
            lines.append(f"| \"{text}\" | {file_loc} | {short_problem} |")
        if len(group_rules) > 8:
            lines.append(f"| ...and {len(group_rules) - 8} more | | |")
        lines.append(f"\n**How to fix:** {friendly_fix}\n")

    if others:
        group_num += 1
        lines.append(f"### {group_num}. Other issues ({len(others)} rules)\n")
        lines.append("| Rule | File | Issue |")
        lines.append("|------|------|-------|")
        for r in others:
            text = r.get("text", "")[:80]
            if len(r.get("text", "")) > 80:
                text += "..."
            file_loc = f"{r.get('file', '?')}:{r.get('line_start', '?')}"
            dw = r.get("dominant_weakness", "")
            issue = _FRIENDLY_PROBLEMS.get(dw, "Review").split(" — ")[0] if dw else "Review"
            lines.append(f"| \"{text}\" | {file_loc} | {issue} |")
        lines.append("")


def _render_best_rules(lines: list[str], audit: dict) -> None:
    """Render 'Your best rules' with 'why it works' explanations."""
    positives = audit.get("positive_findings", [])
    rules = audit.get("rules", [])

    if not positives:
        return

    lines.append("## Your best rules (use these as templates)\n")
    lines.append("These rules score A because they have clear verbs, concrete examples, "
                 "and specific triggers. Copy their structure when rewriting weak rules.\n")
    lines.append("| Grade | Rule | Why it works |")
    lines.append("|-------|------|--------------|")

    for p in positives[:5]:
        text = p.get("text", "")[:80]
        if len(p.get("text", "")) > 80:
            text += "..."
        score = p.get("score", 0)
        grade = _letter_grade(score)
        full_rule = next(
            (r for r in rules if r.get("text", "").startswith(p.get("text", "")[:30])),
            None,
        )
        why = _best_strength(full_rule) if full_rule else "Well-structured rule"
        lines.append(f"| {grade} | \"{text}\" | {why} |")

    lines.append("")
    lines.append("---\n")


def _render_potential_conflicts(lines: list[str], audit: dict) -> None:
    """Render 'Potential conflicts' — mandate rule pairs that may contradict."""
    conflicts = audit.get("conflicts", [])
    if not conflicts:
        return

    n = len(conflicts)
    pair_word = "pair" if n == 1 else "pairs"
    lines.append("## Potential conflicts\n")
    lines.append(f"Found {n} rule {pair_word} where one rule prohibits something "
                 "and another prescribes an action involving the same concrete "
                 "thing (file path, API, domain term). Review each pair — it may "
                 "be a real contradiction (fix one of the rules), a legitimate "
                 "scoping difference (add precedence language to one), or a "
                 "false positive (different behaviors that happen to share "
                 "vocabulary).\n")
    for c in conflicts[:10]:
        rule_a = c.get("rule_a", {})
        rule_b = c.get("rule_b", {})
        shared = c.get("shared_markers", [])
        shared_str = ", ".join(f"`{m}`" for m in shared) if shared else "—"
        a_loc = f"{rule_a.get('file', '?')}:{rule_a.get('line_start', '?')}"
        b_loc = f"{rule_b.get('file', '?')}:{rule_b.get('line_start', '?')}"
        a_text = rule_a.get("text", "")
        b_text = rule_b.get("text", "")
        lines.append(f"- **Shared:** {shared_str}")
        lines.append(f"  - Prohibits ({a_loc}): \"{a_text}\"")
        lines.append(f"  - Prescribes ({b_loc}): \"{b_text}\"")
    if n > 10:
        lines.append(f"\n...and {n - 10} more.")
    lines.append("")
    lines.append("---\n")


def _render_hook_opportunities(lines: list[str], audit: dict) -> None:
    """Render 'Hook opportunities' — rules that would be more reliable as hooks."""
    hook_ops = audit.get("hook_opportunities", [])
    if not hook_ops:
        return

    lines.append("## Hook opportunities\n")
    lines.append(f"These {len(hook_ops)} rules would be more reliable enforced by a hook or linter "
                 "than as text Claude reads. Text rules depend on Claude remembering and applying them; "
                 "hooks enforce deterministically. Your comprehension score above is unaffected — "
                 "this is a separate suggestion.\n")
    lines.append("| Rule | File | Suggested enforcement |")
    lines.append("|------|------|----------------------|")
    for op in hook_ops[:10]:
        text = op.get("text", "")[:80]
        if len(op.get("text", "")) > 80:
            text += "..."
        file_loc = f"{op.get('file', '?')}:{op.get('line_start', '?')}"
        suggestion = op.get("suggested_enforcement", "Hook or linter")
        lines.append(f"| \"{text}\" | {file_loc} | {suggestion} |")
    if len(hook_ops) > 10:
        lines.append(f"| ...and {len(hook_ops) - 10} more | | |")
    lines.append("")
    lines.append("---\n")


def _render_verbose_section(lines: list[str], audit: dict) -> None:
    """Render detailed per-rule table and breakdowns (--verbose only)."""
    rules = audit.get("rules", [])
    mandate_rules = [r for r in rules if r.get("category") == "mandate"]
    non_mandate_rules = [r for r in rules if r.get("category") != "mandate"]

    lines.append("---\n")
    lines.append("## Detailed Scores (--verbose)\n")

    lines.append("| File | Rule (truncated) | Grade | Score | Dominant Weakness | Action |")
    lines.append("|------|-------------------|-------|-------|-------------------|--------|")

    degraded_count = 0
    for rule in mandate_rules:
        file_loc = f"{rule.get('file', '?')}:{rule.get('line_start', '?')}"
        text = rule.get("text", "")[:100]
        if len(rule.get("text", "")) > 100:
            text += "..."
        score = rule.get("score", 0)
        grade = _letter_grade(score)
        degraded = rule.get("degraded", False)
        if degraded:
            degraded_count += 1
        score_str = f"{score:.2f}*" if degraded else f"{score:.2f}"
        dw = rule.get("dominant_weakness", "—")
        action = _suggest_action(rule)
        lines.append(f"| {file_loc} | \"{text}\" | {grade} | {score_str} | {dw or '—'} | {action} |")

    if non_mandate_rules:
        lines.append("")
        lines.append("**Guidelines (override + preference):**\n")
        for rule in non_mandate_rules:
            file_loc = f"{rule.get('file', '?')}:{rule.get('line_start', '?')}"
            text = rule.get("text", "")[:100]
            if len(rule.get("text", "")) > 100:
                text += "..."
            score = rule.get("score", 0)
            grade = _letter_grade(score)
            lines.append(f"| {file_loc} | \"{text}\" | {grade} | {score:.2f} | "
                         f"{rule.get('dominant_weakness', '—') or '—'} | — |")

    lines.append("")
    if degraded_count:
        lines.append(f"*\\* scored on N/6 factors — missing factors excluded, not defaulted.*")

    lines.append("\n### Per-rule breakdown\n")
    for rule in mandate_rules:
        _render_rule_detail(lines, rule)

    if non_mandate_rules:
        lines.append("*(Guidelines not shown in detail — use --json for full data)*\n")

    files = audit.get("files", [])
    if files:
        lines.append("### Per-file Scores\n")
        lines.append("| File | Mean Quality | Prohibition Ratio | Concreteness Coverage | Dead-zone Rules | Trigger Coherence |")
        lines.append("|------|-------------|-------------------|----------------------|-----------------|-------------------|")
        for f in files:
            lines.append(
                f"| {f.get('path', '?')} | {f.get('file_score', 0):.2f} | "
                f"{f.get('prohibition_ratio', 0):.2f} | {f.get('concreteness_coverage', 0):.2f} | "
                f"{f.get('dead_zone_count', 0)} | {f.get('trigger_scope_coherence', 0):.2f} |"
            )
        lines.append("")


def _best_strength(rule: dict) -> str:
    """Return a friendly 'why it works' string from the rule's highest factor."""
    factors = rule.get("factors", {})
    best_fn = None
    best_val = -1.0
    for fn in ("F1", "F2", "F3", "F4", "F7"):
        fdata = factors.get(fn, {})
        val = fdata.get("value")
        if val is not None and val > best_val:
            best_val = val
            best_fn = fn
    if best_fn:
        return _FRIENDLY_STRENGTHS.get(best_fn, "Well-structured rule")
    return "Well-structured rule"


def _render_rewrites(lines: list[str], rewrites: list[dict]) -> None:
    """Render the --fix mode Suggested Rewrites section."""
    lines.append("---\n")
    lines.append("## Suggested Rewrites\n")
    lines.append("LLM-generated rewrite suggestions for rules below their category floor. ")
    lines.append("Before/after grades are computed by re-running the scoring pipeline on the rewrite ")
    lines.append("(not projected). Review each suggestion; `--fix` suggests, you apply.\n")

    for rw in rewrites:
        rule_id = rw.get("rule_id", "?")
        file_loc = f"{rw.get('file', '?')}:{rw.get('line_start', '?')}"
        old_grade = rw.get("old_grade", "?")
        new_grade = rw.get("new_grade", "?")
        old_score = rw.get("old_score", 0)
        new_score = rw.get("new_score", 0)
        old_text = rw.get("original_text", "")
        new_text = rw.get("suggested_rewrite", "")
        old_dw = rw.get("old_dominant_weakness", "-") or "-"
        new_dw = rw.get("new_dominant_weakness", "-") or "-"
        improvements = rw.get("factor_improvements") or {}

        lines.append(f"### {rule_id} - {file_loc} ({old_grade} -> {new_grade})\n")
        lines.append(f"**Original:** {old_text}\n")
        lines.append(f"**Suggested rewrite:** {new_text}\n")
        lines.append(f"- Before: {old_score:.2f} (Grade {old_grade}) - dominant weakness: {old_dw}")
        lines.append(f"- After:  {new_score:.2f} (Grade {new_grade}) - dominant weakness: {new_dw}")

        if improvements:
            parts = []
            for fname, pair in improvements.items():
                if isinstance(pair, (list, tuple)) and len(pair) == 2:
                    parts.append(f"{fname}: {pair[0]:.2f} -> {pair[1]:.2f}")
            if parts:
                lines.append(f"- Factor improvements: {', '.join(parts)}")

        jv = rw.get("judgment_volatility") or {}
        if jv.get("flagged"):
            f3_delta = jv.get("f3_delta", 0)
            old_f3 = jv.get("old_f3")
            new_f3 = jv.get("new_f3")
            lines.append("")
            lines.append("  **WARNING - Judgment changed** (F3 moved by >0.20): part of the score change comes")
            lines.append("  from the F3 judgment moving, not from the rewrite targeting F1/F2/F7 directly.")
            if abs(f3_delta) > 0.20 and old_f3 is not None and new_f3 is not None:
                lines.append(f"    F3: {old_f3:.2f} -> {new_f3:.2f} (delta {f3_delta:+.2f})")

        svd = rw.get("self_verification_delta")
        projected = rw.get("projected_score")
        if svd is not None and svd > 0.05 and projected is not None:
            lines.append("")
            if new_score < projected:
                lines.append(
                    f"  **WARNING - Rewrite underdelivered**: projected {projected:.2f}, "
                    f"re-scored {new_score:.2f}. Review before applying."
                )
            else:
                lines.append(
                    f"  Note: Rewrite exceeded projection (projected {projected:.2f}, "
                    f"re-scored {new_score:.2f}). The improvement is real - projection is conservative."
                )

        lines.append("")


def _render_rule_detail(lines: list[str], rule: dict) -> None:
    """Render detailed breakdown for one rule (--verbose per-rule detail block)."""
    lines.append(f"```")
    lines.append(f"File: {rule.get('file', '?')}:{rule.get('line_start', '?')}")
    lines.append(f"Rule: \"{rule.get('text', '')}\"")
    lines.append(f"Category: {rule.get('category', '?')}")
    lines.append(f"Score: {rule.get('score', 0):.2f}")
    lines.append("")

    factors = rule.get("factors", {})
    contributions = rule.get("contributions", {})
    dw = rule.get("dominant_weakness")
    fc = rule.get("failure_class")

    factor_names = {
        "F1": "verb strength", "F2": "framing polarity",
        "F3": "trigger-action dist", "F4": "load-trigger align",
        "F7": "concreteness",
    }

    if fc:
        lines.append(f"At risk of: {_FAILURE_CLASS_LABELS.get(fc, fc)}")
        lines.append("")

    for fn in ("F1", "F2", "F3", "F4", "F7"):
        fdata = factors.get(fn, {})
        val = fdata.get("value")
        contrib = contributions.get(fn)
        label = factor_names.get(fn, fn)
        marker = " <- dominant weakness" if fn == dw else ""

        method = fdata.get("method", "")
        override_note = ""
        if method == "judgment_patch":
            override_note = " (judgment override)"

        if val is None:
            lines.append(f"  {fn} {label:.<22s}    —  (null — excluded){override_note}")
        elif isinstance(val, (int, float)):
            contrib_val = contrib if contrib is not None else 0.0
            lines.append(f"  {fn} {label:.<22s} {val:5.2f}  (contribution: {contrib_val:.3f}){marker}{override_note}")
        else:
            contrib_val = contrib if contrib is not None else 0.0
            lines.append(f"  {fn} {label:.<22s} {val!s:>5s}  (contribution: {contrib_val:.3f}){marker}{override_note}")

    lines.append("")
    layers = rule.get("layers", {})
    clarity = layers.get('clarity')
    activation = layers.get('activation')
    mechanism = layers.get('mechanism')
    lines.append(f"  Clarity: {f'{clarity:.2f}' if clarity is not None else '—'} | "
                 f"Activation: {f'{activation:.2f}' if activation is not None else '—'} | "
                 f"Mechanism: {f'{mechanism:.2f}' if mechanism is not None else '—'}")

    floor = rule.get("floor", 1.0)
    if floor < 1.0:
        lines.append(f"  Floor: {floor:.2f} (applied — reduces score from {rule.get('pre_floor_score', 0):.2f})")

    skipped_floors = rule.get("skipped_floors", [])
    if skipped_floors:
        lines.append(f"  * Soft floor skipped for unmeasured factor(s): {', '.join(skipped_floors)}")

    if rule.get("degraded", False):
        scored_count = rule.get("scored_count", 6)
        lines.append(f"  * scored on {scored_count}/6 factors — missing: {', '.join(rule.get('degraded_factors', []))}")

    lines.append(f"```\n")


def _suggest_action(rule: dict) -> str:
    """Generate a short action suggestion based on dominant weakness."""
    dw = rule.get("dominant_weakness")
    return _FRIENDLY_FIXES.get(dw, "—")


def _count_gap_rules(rules: list[dict]) -> int:
    """Count rules contributing most to the quality gap."""
    mandate = [r for r in rules if r.get("category") == "mandate" and r.get("leverage")]
    mandate.sort(key=lambda r: r.get("leverage", 0), reverse=True)
    total_leverage = sum(r.get("leverage", 0) for r in mandate)
    if total_leverage <= 0:
        return 0
    cumulative = 0.0
    count = 0
    for r in mandate:
        cumulative += r.get("leverage", 0)
        count += 1
        gap_threshold = _WEIGHTS_DATA.get("gap_threshold", 0.63)
        if cumulative >= total_leverage * gap_threshold:
            break
    return count


def render_json(audit: dict) -> str:
    """JSON passthrough for --json mode."""
    return json.dumps(audit, indent=2, ensure_ascii=False)


def main():
    use_json = "--json" in sys.argv
    verbose = "--verbose" in sys.argv

    input_path = None
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg == "--input" and i + 1 < len(args):
            input_path = args[i + 1]
            break

    if input_path:
        with open(input_path, encoding="utf-8") as f:
            audit = json.load(f)
    else:
        audit = _lib.read_stdin_json()

    if use_json:
        output = render_json(audit)
    else:
        output = render_markdown(audit, verbose=verbose)

    sys.stdout.write(output)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
