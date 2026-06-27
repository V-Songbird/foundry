from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import emit, find_project_root, load_data, read_text
from discover import discover

if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


# ---------------------------------------------------------------------------
# Step 1: Strip metadata
# ---------------------------------------------------------------------------

_BARE_LINK_PATTERN = re.compile(r'^\s*[-*]?\s*\[.*?\]\(.*?\)\s*$')


def strip_metadata(content: str) -> tuple[list[dict], dict]:
    """Strip frontmatter, headings, blank lines, horizontal rules,
    fenced code blocks, markdown tables, and bare reference links.

    Returns (lines_with_metadata, extracted_annotations).
    """
    lines = content.split("\n")
    result = []
    annotations = {}

    in_frontmatter = False
    frontmatter_end = 0
    if lines and lines[0].strip() == "---":
        in_frontmatter = True
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                frontmatter_end = i + 1
                break

    # Pre-scan fenced code block regions
    in_fence = False
    fence_regions: set[int] = set()
    for i in range(frontmatter_end, len(lines)):
        stripped = lines[i].strip()
        if stripped.startswith("```"):
            if not in_fence:
                in_fence = True
                fence_regions.add(i)
            else:
                in_fence = False
                fence_regions.add(i)
        elif in_fence:
            fence_regions.add(i)

    # Pre-scan markdown table regions
    table_regions: set[int] = set()
    i = frontmatter_end
    while i < len(lines):
        stripped = lines[i].strip()
        if stripped.startswith("|") and i not in fence_regions:
            if i + 1 < len(lines) and re.match(r'^\|[\s:]*-', lines[i + 1].strip()):
                j = i
                while j < len(lines) and lines[j].strip().startswith("|"):
                    table_regions.add(j)
                    j += 1
                i = j
                continue
        i += 1

    for i, line in enumerate(lines):
        line_num = i + 1

        if i < frontmatter_end:
            continue
        if i in fence_regions:
            continue
        if i in table_regions:
            continue

        stripped = line.strip()

        cat_match = re.match(r'<!--\s*category:\s*(\w+)\s*-->', stripped)
        if cat_match:
            annotations[line_num] = cat_match.group(1)
            continue

        if re.match(r'^#{1,6}\s', stripped):
            result.append({"line_num": line_num, "text": "", "is_content": False, "is_blank": False, "is_heading": True, "raw": stripped})
            continue

        if re.match(r'^(?:---+|___+|\*\*\*+)\s*$', stripped):
            continue

        if not stripped:
            result.append({"line_num": line_num, "text": "", "is_content": False, "is_blank": True, "is_heading": False, "raw": ""})
            continue

        if _BARE_LINK_PATTERN.match(stripped):
            continue

        result.append({"line_num": line_num, "text": stripped, "is_content": True, "is_blank": False, "is_heading": False, "raw": line})

    return result, annotations


# ---------------------------------------------------------------------------
# Step 2: Identify chunk boundaries
# ---------------------------------------------------------------------------

def identify_chunks(lines: list[dict]) -> list[dict]:
    """Group lines into chunks based on boundary signals."""
    chunks = []
    current_chunk = None
    current_heading = None
    current_heading_line = None

    for line in lines:
        if not line["is_content"]:
            if line.get("is_heading"):
                raw = line.get("raw", "")
                heading_text = re.sub(r'^#{1,6}\s+', '', raw).strip()
                if heading_text:
                    current_heading = heading_text
                    current_heading_line = line["line_num"]
            if line["is_blank"] and current_chunk is not None:
                chunks.append(current_chunk)
                current_chunk = None
            continue

        text = line["text"]
        raw = line["raw"]

        is_bullet = bool(re.match(r'^(?:[-*]|\d+\.)\s', text))
        is_continuation = bool(re.match(r'^(?:\s{2,}|\t)', raw)) and not is_bullet

        if is_bullet:
            if current_chunk is not None:
                chunks.append(current_chunk)
            current_chunk = {
                "lines": [line],
                "line_start": line["line_num"],
                "line_end": line["line_num"],
                "text": re.sub(r'^(?:[-*]|\d+\.)\s+', '', text),
                "is_bullet": True,
                "section_heading": current_heading,
                "section_heading_line": current_heading_line,
            }
        elif is_continuation and current_chunk is not None:
            current_chunk["lines"].append(line)
            current_chunk["line_end"] = line["line_num"]
            current_chunk["text"] += " " + text
        elif current_chunk is None:
            current_chunk = {
                "lines": [line],
                "line_start": line["line_num"],
                "line_end": line["line_num"],
                "text": text,
                "is_bullet": False,
                "section_heading": current_heading,
                "section_heading_line": current_heading_line,
            }
        else:
            current_chunk["lines"].append(line)
            current_chunk["line_end"] = line["line_num"]
            current_chunk["text"] += " " + text

    if current_chunk is not None:
        chunks.append(current_chunk)

    return chunks


# ---------------------------------------------------------------------------
# Step 3: Classify chunks as rule candidates or prose
# ---------------------------------------------------------------------------

_IMPERATIVE_VERBS = load_data("verbs")
_ALL_VERBS: set[str] = set()
for _tier in _IMPERATIVE_VERBS["patterns"]:
    for _v in _tier["verbs"]:
        _ALL_VERBS.add(_v.lower())

_VERB_BOUNDARY_PATTERNS: list[re.Pattern] = [
    re.compile(r'(?:^|\s|,)' + re.escape(v) + r'(?:\s|$|,|\.)')
    for v in _ALL_VERBS
]

_CONSTRAINT_KEYWORDS = {"only", "required", "forbidden", "mandatory"}
_CONSTRAINT_PATTERNS: list[re.Pattern] = [
    re.compile(r'\b' + re.escape(kw) + r'\b') for kw in _CONSTRAINT_KEYWORDS
]
_CONDITIONAL_PATTERN = re.compile(
    r'\b(?:when|if|for)\b.*?,\s*(?:' + '|'.join(re.escape(v) for v in sorted(_ALL_VERBS, key=len, reverse=True)) + r')\b',
    re.IGNORECASE,
)
_PROSE_STARTERS = re.compile(
    r'^(?:this means|this is because|the reason|note that|background:|overview:|for context'
    r'|these rules|this rule|this file|these files|this section|the following'
    r'|detailed conventions|scoped rules)',
    re.IGNORECASE,
)
_MECHANISM_PATTERN = re.compile(
    r'^(?:the\s+\w+\s+(?:pipeline|agent|system|layer|service)\s+(?:runs|handles|manages|processes))',
    re.IGNORECASE,
)
_REFERENCE_PATTERN = re.compile(
    r'^see\s+[`"\[].*?\b(?:for|about)\b',
    re.IGNORECASE,
)
_DESCRIPTION_BULLET_PATTERN = re.compile(
    r'^\*\*[^*]+\*\*\s*(?:—|--|:)\s',
)
_NAVIGATION_POINTER_PATTERN = re.compile(
    r'^`[^`]+\.md`\s*(?:—|--|:|→|→)\s'
    r'|^\*\*[^*]+\*\*\s*(?:→|→|—|--)\s*\[?`?[\w./-]*\.md'
    r'|^\[[^\]]+\]\([^)]*\.md\)\s*(?:—|--|:|→|→)\s',
)


def has_imperative_verb(text: str) -> bool:
    """Check if text contains any imperative verb from the lookup table."""
    text_lower = text.lower()
    for pattern in _VERB_BOUNDARY_PATTERNS:
        if pattern.search(text_lower):
            return True
    return False


def has_constraint_keyword(text: str) -> bool:
    """Check for constraint keywords."""
    text_lower = text.lower()
    for pattern in _CONSTRAINT_PATTERNS:
        if pattern.search(text_lower):
            return True
    return False


def classify_chunk(chunk: dict) -> str:
    """Classify a chunk as 'rule' or 'prose'."""
    text = chunk["text"]
    text_plain = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)

    if _PROSE_STARTERS.match(text):
        return "prose"
    if _MECHANISM_PATTERN.match(text):
        return "prose"
    if _REFERENCE_PATTERN.match(text):
        return "prose"

    if chunk.get("is_bullet", False) and _NAVIGATION_POINTER_PATTERN.match(text):
        return "prose"

    if has_imperative_verb(text_plain):
        return "rule"
    if has_constraint_keyword(text):
        return "rule"
    if _CONDITIONAL_PATTERN.search(text):
        return "rule"

    if chunk.get("is_bullet", False):
        if _DESCRIPTION_BULLET_PATTERN.match(text):
            return "prose"
        return "rule"

    return "prose"


# ---------------------------------------------------------------------------
# Step 4: Merge clarification chunks
# ---------------------------------------------------------------------------

_CLARIFICATION_STARTERS = re.compile(
    r'^(?:this means|for example|i\.e\.|e\.g\.|in other words|specifically|that is)',
    re.IGNORECASE,
)


def _is_verbless_bullet(chunk: dict) -> bool:
    """Check if chunk is a bullet with no imperative verb or constraint keyword."""
    return (chunk.get("is_bullet", False)
            and not has_imperative_verb(chunk["text"])
            and not has_constraint_keyword(chunk["text"]))


def merge_clarifications(chunks: list[dict]) -> list[dict]:
    """Merge clarification prose into preceding rule candidates."""
    classified = [(chunk, classify_chunk(chunk)) for chunk in chunks]
    merged = []

    i = 0
    while i < len(classified):
        chunk, cls = classified[i]

        if cls == "rule":
            if (_is_verbless_bullet(chunk) and chunk.get("section_heading")):
                heading = chunk["section_heading"]
                heading_line = chunk.get("section_heading_line", chunk["line_start"])
                synthetic = {
                    "lines": [],
                    "line_start": heading_line,
                    "line_end": chunk["line_start"],
                    "text": heading + ":",
                    "is_bullet": False,
                    "section_heading": heading,
                }
                merged_chunk = _merge_two_chunks(synthetic, chunk)
                j = i + 1
                while j < len(classified):
                    next_chunk, next_cls = classified[j]
                    if (next_cls == "rule"
                            and _is_verbless_bullet(next_chunk)
                            and next_chunk.get("section_heading") == heading):
                        merged_chunk = _merge_two_chunks(merged_chunk, next_chunk)
                        j += 1
                    else:
                        break
                merged.append((merged_chunk, "rule"))
                i = j
                continue

            j = i + 1
            while j < len(classified):
                next_chunk, next_cls = classified[j]
                if next_cls == "prose" and _is_clarification(next_chunk):
                    chunk = _merge_two_chunks(chunk, next_chunk)
                    j += 1
                elif (next_cls == "rule"
                      and next_chunk.get("is_bullet", False)
                      and not chunk.get("is_bullet", False)
                      and not has_imperative_verb(next_chunk["text"])
                      and not has_constraint_keyword(next_chunk["text"])):
                    chunk = _merge_two_chunks(chunk, next_chunk)
                    j += 1
                else:
                    break
            merged.append((chunk, "rule"))
            i = j
        else:
            merged.append((chunk, cls))
            i += 1

    return merged


def _is_clarification(chunk: dict) -> bool:
    """Check if a chunk is a clarification of a preceding rule."""
    text = chunk["text"]
    if _CLARIFICATION_STARTERS.match(text):
        return True
    if text.startswith("```"):
        return True
    return False


def _merge_two_chunks(rule_chunk: dict, clarification: dict) -> dict:
    """Merge a clarification into a rule chunk."""
    return {
        "lines": rule_chunk["lines"] + clarification["lines"],
        "line_start": rule_chunk["line_start"],
        "line_end": clarification["line_end"],
        "text": rule_chunk["text"] + " " + clarification["text"],
        "is_bullet": rule_chunk.get("is_bullet", False),
        "section_heading": rule_chunk.get("section_heading"),
    }


# ---------------------------------------------------------------------------
# Step 5: Split compound rules
# ---------------------------------------------------------------------------

def split_compound_rules(chunks: list[tuple[dict, str]]) -> list[tuple[dict, str]]:
    """Split compound rules with multiple independent directives."""
    result = []
    for chunk, cls in chunks:
        if cls != "rule":
            result.append((chunk, cls))
            continue
        parts = _try_split(chunk)
        for part in parts:
            result.append((part, "rule"))
    return result


def would_fragment(text: str) -> list[str]:
    """Return the parts this text would be split into if extracted as a rule.

    Returns length-1 list if no split; length >= 2 if it would fragment.
    """
    fake_chunk = {
        "text": text,
        "lines": [],
        "line_start": 0,
        "line_end": 0,
        "is_bullet": False,
    }
    parts = _try_split(fake_chunk)
    return [p["text"] for p in parts]


def _try_split(chunk: dict) -> list[dict]:
    """Try to split a compound rule into independent parts."""
    text = chunk["text"]

    if ";" in text:
        parts = text.split(";")
        if len(parts) >= 2 and all(_has_own_verb(p.strip()) for p in parts if p.strip()):
            return [_make_subchunk(chunk, p.strip()) for p in parts if p.strip()]

    and_parts = re.split(r',\s+and\s+|\s+and\s+', text)
    if len(and_parts) >= 2 and all(_has_own_verb(p.strip()) for p in and_parts):
        if not _is_single_process(text):
            return [_make_subchunk(chunk, p.strip()) for p in and_parts]

    return [chunk]


def _has_own_verb(text: str) -> bool:
    """Check if text fragment has its own imperative verb."""
    return has_imperative_verb(text)


def _is_single_process(text: str) -> bool:
    """Check if compound text describes steps of a single process."""
    text_lower = text.lower()
    single_process_patterns = [
        r'\b(?:edit|modify|change).*\band\b.*\b(?:regenerate|rebuild|recompile|restart)',
        r'\b(?:save|write).*\band\b.*\b(?:commit|push)',
        r'\b(?:create|add).*\band\b.*\b(?:register|configure|setup)',
    ]
    for pat in single_process_patterns:
        if re.search(pat, text_lower):
            return True
    return False


def _make_subchunk(parent: dict, text: str) -> dict:
    """Create a sub-chunk from a parent chunk with new text."""
    return {
        "lines": parent["lines"],
        "line_start": parent["line_start"],
        "line_end": parent["line_end"],
        "text": text,
        "is_bullet": parent.get("is_bullet", False),
    }


# ---------------------------------------------------------------------------
# Steps 6-8: Load files, assign categories, build output
# ---------------------------------------------------------------------------

# Maps discover() artifact kinds to source_file entries
_ARTIFACT_KINDS = ("claude_md", "rules", "agents", "skills", "commands")


def _build_source_files(artifacts: dict, project_root: Path) -> list[dict]:
    """Flatten discover() artifacts into a source_files list."""
    source_files = []
    for kind in _ARTIFACT_KINDS:
        for entry in artifacts.get(kind, []):
            source_files.append({
                "path": entry["path"],
                "kind": kind,
                "default_category": "mandate",
            })
    return source_files


def _should_ignore(file_path: str, rule_text: str, ignore_patterns: list[str]) -> bool:
    """Check if a rule matches any ignore pattern."""
    for pattern in ignore_patterns:
        pattern = pattern.strip()
        if ":" in pattern:
            file_part, _, text_part = pattern.partition(":")
            file_part = file_part.strip()
            text_part = text_part.strip().strip('"').strip("'")
            if file_path == file_part and text_part in rule_text:
                return True
        else:
            if file_path == pattern:
                return True
    return False


def extract_rules(project_root_arg: str | None) -> dict:
    """Full extraction pipeline: discover → read → parse → output dict."""
    inventory = discover(project_root_arg)
    project_root = Path(inventory["project_root"])

    source_files = _build_source_files(inventory["artifacts"], project_root)

    all_rules: list[dict] = []
    rule_counter = 0

    for file_idx, sf in enumerate(source_files):
        abs_path = project_root / sf["path"]
        content = read_text(abs_path)
        if not content:
            continue

        lines, annotations = strip_metadata(content)
        chunks = identify_chunks(lines)
        merged = merge_clarifications(chunks)
        split = split_compound_rules(merged)

        for chunk, cls in split:
            if cls != "rule":
                continue

            rule_counter += 1
            rule_id = f"R{rule_counter:03d}"
            rule_text = chunk["text"]

            category = sf.get("default_category", "mandate")
            for line_num in range(chunk["line_start"] - 2, chunk["line_start"]):
                if line_num in annotations:
                    category = annotations[line_num]
                    break

            if _should_ignore(sf["path"], rule_text, []):
                rule_counter -= 1
                continue

            all_rules.append({
                "id": rule_id,
                "file_index": file_idx,
                "text": rule_text,
                "line_start": chunk["line_start"],
                "line_end": chunk["line_end"],
                "category": category,
                "factors": {},
            })

    return {
        "project_root": str(project_root),
        "source_files": source_files,
        "rules": all_rules,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract rules from instruction files.")
    ap.add_argument("--project-root", default=None)
    args = ap.parse_args()
    emit(extract_rules(args.project_root))


if __name__ == "__main__":
    main()
