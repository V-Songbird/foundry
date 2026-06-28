from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import emit, find_project_root, load_data, read_text
from discover import discover, PRUNE_DIRS

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
# Rule frontmatter scoping (drives F4 load-trigger alignment)
# ---------------------------------------------------------------------------

# paths: is canonical per the docs (Rules and memory.md — "Path-specific rules").
# globs: is a tolerated legacy alias; paths: wins when both are present.
_SCOPE_KEYS = ("paths", "globs")

# Max recursion for @path imports, per the docs ("a maximum depth of four hops").
_IMPORT_MAX_DEPTH = 4

# @path imports inside CLAUDE.md. The docs allow relative (foo/bar.md and
# ./foo.md), home (~/...), and absolute paths. refs._AT_IMPORT only matches
# refs that begin with ~ . or /, so it misses bare relative imports like
# `@docs/git.md`; this pattern is broader on purpose. Code spans / fenced code
# blocks are stripped before this runs (the docs say import parsing skips them).
_AT_IMPORT_PATTERN = re.compile(r"(?<![\w`])@([~\w./\\-]+)")


def _frontmatter_lines(content: str) -> list[str]:
    """Return the raw YAML frontmatter lines (between the leading --- fences)."""
    lines = content.split("\n")
    if not lines or lines[0].strip() != "---":
        return []
    out: list[str] = []
    for line in lines[1:]:
        if line.strip() == "---":
            return out
        out.append(line)
    return []  # unterminated frontmatter -> treat as none


def _normalize_glob_value(raw: str) -> list[str]:
    """Normalize a scalar paths:/globs: value (single or comma-separated) to a list."""
    raw = raw.strip()
    if not raw:
        return []
    # Strip surrounding quotes on the whole scalar, then split on commas.
    out: list[str] = []
    for part in raw.split(","):
        item = part.strip().strip('"').strip("'").strip()
        if item:
            out.append(item)
    return out


def parse_scoping(content: str) -> list[str]:
    """Extract the rule's scoping globs from YAML frontmatter.

    Canonical key is ``paths:`` (per the docs); ``globs:`` is a tolerated legacy
    alias. ``paths:`` wins if both are present. The value may be a single string,
    a comma-separated string, or a YAML block/flow list. Returns a normalized
    list of glob strings (empty when no scoping key is present).
    """
    fm = _frontmatter_lines(content)
    if not fm:
        return []

    results: dict[str, list[str]] = {}
    i = 0
    while i < len(fm):
        line = fm[i]
        # Match a top-level mapping key (no indentation) we care about.
        m = re.match(r"^(\w+)\s*:\s*(.*)$", line)
        if not m or m.group(1) not in _SCOPE_KEYS:
            i += 1
            continue

        key = m.group(1)
        inline = m.group(2).strip()
        globs: list[str] = []

        if inline:
            # Flow list: paths: ["a", "b"] — or a scalar / comma-separated string.
            flow = inline
            if flow.startswith("[") and flow.endswith("]"):
                flow = flow[1:-1]
            globs.extend(_normalize_glob_value(flow))
            i += 1
        else:
            # Block list: subsequent `  - "glob"` lines.
            i += 1
            while i < len(fm):
                item = re.match(r"^\s*-\s*(.+?)\s*$", fm[i])
                if not item:
                    break
                val = item.group(1).strip().strip('"').strip("'").strip()
                if val:
                    globs.append(val)
                i += 1

        if globs:
            results[key] = globs

    # Canonical paths: wins over the legacy globs: alias.
    if results.get("paths"):
        return results["paths"]
    return results.get("globs", [])


def count_glob_matches(globs: list[str], project_root: Path) -> int:
    """Count distinct project files matching any glob, pruning PRUNE_DIRS."""
    if not globs:
        return 0
    matched: set[Path] = set()
    for pattern in globs:
        pat = pattern.replace("\\", "/").lstrip("/")
        if not pat:
            continue
        try:
            candidates = project_root.rglob(pat)
        except (ValueError, OSError):
            continue
        for p in candidates:
            try:
                if not p.is_file():
                    continue
                rel_parts = p.relative_to(project_root).parts
            except (ValueError, OSError):
                continue
            if any(part in PRUNE_DIRS for part in rel_parts):
                continue
            matched.add(p)
    return len(matched)


def _strip_for_imports(content: str) -> str:
    """Blank out fenced code blocks and inline code spans so @imports inside them
    are not followed (the docs: import parsing skips code spans and fenced blocks)."""
    lines = content.split("\n")
    out: list[str] = []
    in_fence = False
    for line in lines:
        if line.strip().startswith("```"):
            in_fence = not in_fence
            out.append("")
            continue
        if in_fence:
            out.append("")
            continue
        # Drop inline code spans (`...`) on this line.
        out.append(re.sub(r"`[^`]*`", "", line))
    return "\n".join(out)


def find_imports(content: str) -> list[str]:
    """Return @path import targets in CLAUDE.md content (code-span/fence safe)."""
    cleaned = _strip_for_imports(content)
    seen: list[str] = []
    for m in _AT_IMPORT_PATTERN.finditer(cleaned):
        ref = m.group(1)
        if ref and ref not in seen:
            seen.append(ref)
    return seen


def _resolve_import(ref: str, file_dir: Path, project_root: Path) -> Path:
    """Resolve an @import target to an absolute path.

    Relative refs resolve against the importing file's directory (per the docs),
    ~/ against home, and absolute paths as-is.
    """
    if ref.startswith("~/") or ref == "~":
        return (Path.home() / ref[2:]).resolve() if len(ref) > 2 else Path.home()
    p = Path(ref)
    if p.is_absolute():
        return p.resolve()
    return (file_dir / ref).resolve()


def resolve_imports(seed_files: list[dict], project_root: Path) -> tuple[list[dict], list[dict]]:
    """Follow @path imports out of CLAUDE.md sources, recursively (max depth 4).

    Returns (imported_source_files, unresolved). Each imported source carries
    ``imported_from`` (the rel path of the file that referenced it) and
    ``import_depth``. Unresolved imports are reported as dicts
    {"ref", "from", "resolved"} so they can surface as a staleness signal —
    never crash on a missing import.
    """
    from _lib import rel

    imported: list[dict] = []
    unresolved: list[dict] = []
    # Track every file already in play (seeds + resolved imports) to guard cycles.
    visited: set[Path] = set()
    for sf in seed_files:
        try:
            visited.add((project_root / sf["path"]).resolve())
        except (ValueError, OSError):
            pass

    # BFS queue of (abs_path, depth, importer_rel).
    queue: list[tuple[Path, int, str]] = []
    for sf in seed_files:
        if sf.get("kind") != "claude_md":
            continue
        abs_path = (project_root / sf["path"]).resolve()
        queue.append((abs_path, 0, sf["path"]))

    while queue:
        abs_path, depth, importer_rel = queue.pop(0)
        if depth >= _IMPORT_MAX_DEPTH:
            continue  # already at max hops; do not expand further
        content = read_text(abs_path)
        if not content:
            continue
        for ref in find_imports(content):
            target = _resolve_import(ref, abs_path.parent, project_root)
            if not target.exists() or not target.is_file():
                unresolved.append({"ref": ref, "from": importer_rel, "resolved": str(target)})
                continue
            if target in visited:
                continue  # cycle / already-included guard
            visited.add(target)
            target_rel = rel(target, project_root)
            imported.append({
                "path": target_rel,
                "kind": "rules",
                "default_category": "mandate",
                "globs": [],
                "always_loaded": True,  # imports expand into context at launch
                "glob_match_count": 0,
                "scope": "imported",
                "imported_from": importer_rel,
                "import_depth": depth + 1,
            })
            queue.append((target, depth + 1, target_rel))

    return imported, unresolved


# ---------------------------------------------------------------------------
# Steps 6-8: Load files, assign categories, build output
# ---------------------------------------------------------------------------

# Maps discover() artifact kinds to source_file entries
_ARTIFACT_KINDS = ("claude_md", "rules", "agents", "skills", "commands")

# CLAUDE.md scopes that load in full at launch (always-loaded). Nested
# (monorepo subpackage) CLAUDE.md load on demand, so they are NOT always-loaded.
_ALWAYS_LOADED_CLAUDE_SCOPES = {"project", "project-dot", "project-local", "user"}


def _build_source_files(artifacts: dict, project_root: Path) -> list[dict]:
    """Flatten discover() artifacts into a source_files list.

    For ``rules`` files this parses the ``paths:`` (canonical) / ``globs:``
    (legacy alias) frontmatter into ``globs``, sets ``always_loaded`` (False when
    a non-empty scoping key is present), and counts matching project files
    (``glob_match_count``). For ``claude_md`` it threads discover's ``scope`` so a
    ``nested`` (monorepo) CLAUDE.md is not-always-loaded (it loads on demand).
    """
    source_files = []
    for kind in _ARTIFACT_KINDS:
        for entry in artifacts.get(kind, []):
            sf = {
                "path": entry["path"],
                "kind": kind,
                "default_category": "mandate",
            }
            if "scope" in entry:
                sf["scope"] = entry["scope"]

            if kind == "rules":
                content = read_text(project_root / entry["path"])
                globs = parse_scoping(content) if content else []
                sf["globs"] = globs
                sf["always_loaded"] = not globs
                sf["glob_match_count"] = count_glob_matches(globs, project_root)
            elif kind == "claude_md":
                scope = entry.get("scope", "project")
                sf["globs"] = []
                sf["always_loaded"] = scope in _ALWAYS_LOADED_CLAUDE_SCOPES

            source_files.append(sf)
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


def _build_tooling(inventory: dict) -> dict:
    """Best-effort enforcement-tooling signals from discover() (empty if none)."""
    tooling: dict[str, bool] = {}
    hooks = inventory.get("hooks", {})
    events = hooks.get("events", {}) if isinstance(hooks, dict) else {}
    if events:
        tooling["hooks"] = True
    mcp = inventory.get("mcp", {})
    if isinstance(mcp, dict) and mcp.get("servers"):
        tooling["mcp"] = True
    return tooling


def _build_project_context(inventory: dict, source_files: list[dict]) -> dict:
    """Populate the project_context build_prompt.py consumes.

    ``stack`` from discover; ``always_loaded_files`` / ``glob_scoped_files`` from
    the always_loaded split computed in _build_source_files; ``tooling`` from
    discover (best-effort, empty dict when nothing detected).
    """
    always_loaded_files: list[str] = []
    glob_scoped_files: list[dict] = []
    for sf in source_files:
        globs = sf.get("globs", [])
        if globs and not sf.get("always_loaded", True):
            glob_scoped_files.append({"path": sf["path"], "globs": globs})
        elif sf.get("always_loaded", True):
            always_loaded_files.append(sf["path"])
    return {
        "stack": inventory.get("stack", []),
        "always_loaded_files": always_loaded_files,
        "glob_scoped_files": glob_scoped_files,
        "tooling": _build_tooling(inventory),
    }


def extract_rules(project_root_arg: str | None) -> dict:
    """Full extraction pipeline: discover → read → parse → output dict."""
    inventory = discover(project_root_arg)
    project_root = Path(inventory["project_root"])

    source_files = _build_source_files(inventory["artifacts"], project_root)

    # Follow @path imports out of CLAUDE.md files (max depth 4, cycle-guarded).
    # Resolved imports become additional rule sources; unresolved ones are a
    # staleness signal surfaced under ``unresolved_imports``.
    imported, unresolved_imports = resolve_imports(source_files, project_root)
    source_files.extend(imported)

    project_context = _build_project_context(inventory, source_files)

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
        "project_context": project_context,
        "unresolved_imports": unresolved_imports,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract rules from instruction files.")
    ap.add_argument("--project-root", default=None)
    args = ap.parse_args()
    emit(extract_rules(args.project_root))


if __name__ == "__main__":
    main()
