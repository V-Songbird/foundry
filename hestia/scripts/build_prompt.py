"""Assemble the LLM judgment prompt from scored rules and rubric files.

Pure JSON-in -> markdown-out. Reads scored JSON from stdin (or a file via
--input), outputs the assembled prompt to stdout (or a file via --output).
Batch mode (--batch-dir) splits >20 rules into multiple prompt files plus a
manifest.
"""

from __future__ import annotations

import json
import os
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

_DATA_DIR = Path(__file__).parent / "_data"


def _load_rubric(name: str) -> str:
    """Load a rubric markdown file from _data/ by filename."""
    return (_DATA_DIR / name).read_text(encoding="utf-8")


def build_prompt(data: dict) -> str:
    """Build the judgment prompt from scored pipeline data."""
    rules = data.get("rules", [])
    project_context = data.get("project_context", {})

    rubric_f3 = _load_rubric("rubric_F3.md")
    rubric_f8 = _load_rubric("rubric_F8.md")

    sections = []

    # Header
    sections.append("# Quality Factor Scoring\n")
    sections.append("Score F3 and F8 for every rule.\n")

    # Project Context
    sections.append("## Project Context")
    stack = project_context.get("stack", [])
    sections.append(f"Stack: {', '.join(stack) if stack else 'unknown'}")

    always_loaded = project_context.get("always_loaded_files", [])
    sections.append(f"Always-loaded files: {', '.join(always_loaded) if always_loaded else 'none'}")

    glob_scoped = project_context.get("glob_scoped_files", [])
    if glob_scoped:
        globs_summary = ", ".join(
            f"{gf.get('globs', ['?'])[0] if gf.get('globs') else '?'}"
            for gf in glob_scoped[:5]
        )
        sections.append(f"Glob-scoped files: {len(glob_scoped)} files covering {globs_summary}")
    else:
        sections.append("Glob-scoped files: none")

    sections.append("")
    sections.append("Note: glob-scoped rules have their trigger anchored to the glob pattern.")
    sections.append('"I\'m editing a file matching this glob" IS the trigger context for F3.\n')

    # Tooling context (informs F8 scoring)
    tooling = project_context.get("tooling", {})
    configured = [name for name, detected in tooling.items() if detected]
    if configured:
        not_detected = [name for name, detected in tooling.items() if not detected]
        sections.append(f"Configured enforcement: {', '.join(configured)}")
        if not_detected:
            sections.append(f"Not detected: {', '.join(not_detected)}")
    else:
        sections.append("No enforcement tooling detected.")
    sections.append("")

    # F3 rubric
    sections.append("## F3: Trigger-Action Distance")
    sections.append(rubric_f3.strip())
    sections.append("")

    # F8 rubric
    sections.append("## F8: Enforceability Ceiling")
    sections.append(rubric_f8.strip())
    sections.append("Score enforceability against this project's detected stack and tooling, not in the abstract.\n")

    # Rules table
    sections.append("## Rules\n")
    sections.append("| ID | File | Globs | Text | Flags |")
    sections.append("|---|---|---|---|---|")

    source_files = data.get("source_files", [])

    for rule in rules:
        rule_id = rule["id"]
        fi = rule.get("file_index", 0)
        sf = source_files[fi] if fi < len(source_files) else {}

        file_path = sf.get("path", "unknown")
        globs = sf.get("globs", [])
        globs_str = ", ".join(globs) if globs else "always-loaded"

        text = rule["text"][:120]
        if len(rule["text"]) > 120:
            text += "..."

        flags = _build_flags(rule)

        sections.append(f"| {rule_id} | {file_path} | {globs_str} | \"{text}\" | {flags} |")

    sections.append("")

    # Response format
    sections.append("## Response format\n")
    sections.append("Respond with ONLY a JSON array. No prose, no markdown fences.")
    sections.append("One object per rule. Always include F3 and F8.")
    sections.append("Reasoning: one sentence, max 80 characters.\n")
    sections.append('[{"id":"R001","F3":{"value":0.80,"level":3,"reasoning":"..."},')
    sections.append('  "F8":{"value":0.65,"level":2,"reasoning":"..."}}]')

    return "\n".join(sections)


def _build_flags(rule: dict) -> str:
    """Build the flags column for a rule in the prompt table."""
    flags = []
    confidence_low = rule.get("factor_confidence_low", [])

    if "F3" in confidence_low:
        factors = rule.get("factors", {})
        f3 = factors.get("F3", {})
        flags.append(f"F3: mech={f3.get('value', '?')}")

    if "F8" in confidence_low:
        factors = rule.get("factors", {})
        f8 = factors.get("F8", {})
        flags.append(f"F8: mech={f8.get('value', '?')}")

    return "; ".join(flags) if flags else "—"


BATCH_SIZE_DEFAULT = 12
BATCH_THRESHOLD = 20


def partition_rules(rules: list[dict], source_files: list[dict],
                    batch_size: int = BATCH_SIZE_DEFAULT) -> list[list[dict]]:
    """Partition rules into batches for multi-prompt scoring.

    Deterministic: sort by (file_path, line_start), group by file with
    file-cohesion preference. Oversize files split at batch_size boundaries.
    """
    if not rules:
        return []

    def sort_key(rule):
        fi = rule.get("file_index", 0)
        sf = source_files[fi] if fi < len(source_files) else {}
        return (sf.get("path", ""), rule.get("line_start", 0))

    sorted_rules = sorted(rules, key=sort_key)

    # Group consecutive rules by file
    file_groups: list[list[dict]] = []
    current_group: list[dict] = []
    current_fi = None
    for rule in sorted_rules:
        fi = rule.get("file_index", 0)
        if fi != current_fi and current_group:
            file_groups.append(current_group)
            current_group = []
        current_fi = fi
        current_group.append(rule)
    if current_group:
        file_groups.append(current_group)

    # Pack groups into batches with file-cohesion preference
    batches: list[list[dict]] = []
    current_batch: list[dict] = []
    for group in file_groups:
        if len(group) <= batch_size:
            if len(current_batch) + len(group) <= batch_size:
                current_batch.extend(group)
            else:
                if current_batch:
                    batches.append(current_batch)
                current_batch = list(group)
        else:
            if current_batch:
                batches.append(current_batch)
                current_batch = []
            for i in range(0, len(group), batch_size):
                batches.append(group[i:i + batch_size])

    if current_batch:
        batches.append(current_batch)

    return batches


def build_batch_prompt(data: dict, rule_subset: list[dict], batch_num: int,
                       total_batches: int, is_continuation: bool = False) -> str:
    """Build a prompt for a specific batch of rules."""
    batch_data = {**data, "rules": rule_subset}
    prompt = build_prompt(batch_data)

    batch_note = f"\n*Batch {batch_num} of {total_batches}.*"
    if is_continuation:
        fi = rule_subset[0].get("file_index", 0) if rule_subset else 0
        source_files = data.get("source_files", [])
        sf = source_files[fi] if fi < len(source_files) else {}
        file_path = sf.get("path", "unknown")
        batch_note += (
            f"\n*Note: These rules continue from {file_path}. "
            "See previous batch for earlier rules from this file.*"
        )

    lines = prompt.split("\n", 1)
    if len(lines) == 2:
        prompt = lines[0] + batch_note + "\n" + lines[1]

    return prompt


def main():
    batch_dir = None
    input_path = None
    output_path = None
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--batch-dir" and i + 1 < len(args):
            batch_dir = args[i + 1]
            i += 2
        elif args[i] == "--input" and i + 1 < len(args):
            input_path = args[i + 1]
            i += 2
        elif args[i] == "--output" and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        else:
            i += 1

    if input_path:
        with open(input_path, encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = _lib.read_stdin_json()
        if not data:
            _lib.fail("empty input")

    rules = data.get("rules", [])
    source_files = data.get("source_files", [])

    if batch_dir and len(rules) > BATCH_THRESHOLD:
        os.makedirs(batch_dir, exist_ok=True)
        batches = partition_rules(rules, source_files)

        prev_last_fi = None
        manifest_batches = []

        for i, batch in enumerate(batches):
            batch_num = i + 1
            first_fi = batch[0].get("file_index", 0) if batch else None
            is_continuation = (first_fi is not None and first_fi == prev_last_fi)

            prompt = build_batch_prompt(data, batch, batch_num, len(batches), is_continuation)

            prompt_path = os.path.join(batch_dir, f"prompt_{batch_num:03d}.md")
            with open(prompt_path, "w", encoding="utf-8") as f:
                f.write(prompt)

            manifest_batches.append({
                "file": f"prompt_{batch_num:03d}.md",
                "rule_ids": [r["id"] for r in batch],
            })

            prev_last_fi = batch[-1].get("file_index", 0) if batch else None

        manifest = {
            "batch_count": len(batches),
            "batch_size_target": BATCH_SIZE_DEFAULT,
            "total_rules": len(rules),
            "batches": manifest_batches,
        }
        manifest_path = os.path.join(batch_dir, "batch_manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

    else:
        prompt = build_prompt(data)
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(prompt)
                f.write("\n")
        else:
            sys.stdout.write(prompt)
            sys.stdout.write("\n")


if __name__ == "__main__":
    main()
