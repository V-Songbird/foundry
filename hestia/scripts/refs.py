"""Detect path references in instruction files that no longer resolve.

Shared by checkup (the setup audit) and drift (the freshness watch). Deliberately
conservative: a false "broken reference" is worse than a missed one when the
audience is a beginner, so we only flag tokens that clearly look like file paths
(a leading ./ ../ ~/ .claude/, or a slash plus a file extension), plus CLAUDE.md
`@imports` and relative markdown links.

Standard library only. Python 3.10+.
"""

from __future__ import annotations

import re
from pathlib import Path

_BACKTICK = re.compile(r"`([^`\n]+)`")
_AT_IMPORT = re.compile(r"(?<!\w)@([~./][\w./-]+)")          # CLAUDE.md @imports
_MD_LINK = re.compile(r"\]\((\.{0,2}/[^)\s]+)\)")            # [text](./path)
_EXT = re.compile(r"\.[A-Za-z0-9]{1,8}$")
_SKIP = ("http://", "https://", "://", "${", "*", " ", "\t")
_DIR_PREFIXES = ("./", "../", "~/", ".claude/")


def _looks_like_path(tok: str) -> bool:
    t = tok.strip()
    if not t or any(s in t for s in _SKIP):
        return False
    if t.startswith(_DIR_PREFIXES):
        return True
    return "/" in t and bool(_EXT.search(t))


def extract_refs(text: str) -> list[str]:
    """Return the distinct path-like references found in ``text``."""
    refs: set[str] = set()
    for m in _BACKTICK.finditer(text):
        tok = m.group(1).strip()
        if _looks_like_path(tok):
            refs.add(tok)
    for m in _AT_IMPORT.finditer(text):
        refs.add("@" + m.group(1))
    for m in _MD_LINK.finditer(text):
        tok = m.group(1).strip()
        if not any(s in tok for s in ("http://", "https://", "${")):
            refs.add(tok)
    return sorted(refs)


def resolve(ref: str, file_dir: Path, root: Path) -> Path:
    """Resolve a reference to an absolute path for an existence check."""
    r = ref[1:] if ref.startswith("@") else ref
    r = r.split("#", 1)[0]  # drop section anchor
    if r.startswith("~/"):
        return (Path.home() / r[2:])
    if r.startswith(("./", "../")):
        return (file_dir / r).resolve()
    return (root / r).resolve()


def broken_refs(file_path: str | Path, root: str | Path) -> list[str]:
    """Return references in ``file_path`` that do not resolve to an existing path."""
    file_path = Path(file_path)
    root = Path(root)
    try:
        text = file_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    out: list[str] = []
    for ref in extract_refs(text):
        bare = ref.split("#", 1)[0]
        if not bare or bare in (".", "./", "~/"):
            continue
        if not resolve(ref, file_path.parent, root).exists():
            out.append(ref)
    return out
