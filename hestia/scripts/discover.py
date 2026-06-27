"""Inventory a project's Claude Code setup surface.

Walks the files that steer Claude in a project — CLAUDE.md (every scope),
.claude/rules, .claude/agents, .claude/skills, .claude/commands, the hooks
declared in settings.json, and .mcp.json — and emits a single JSON inventory
on stdout. Also detects the project's tech stack from marker files.

This is the shared entry point for checkup, freshness, and the rules engine;
none of them should re-walk the filesystem themselves.

Usage:
    python discover.py [--project-root PATH]

Standard library only. Python 3.10+.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from _lib import emit, find_project_root, read_text, rel

# Directories we never descend into when looking for nested CLAUDE.md files.
PRUNE_DIRS = {
    ".git", "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache",
    "dist", "build", "target", "out", ".next", ".idea", ".vscode", "vendor",
    ".hestia", ".hestia-tmp", ".rulesense", ".rulesense-tmp", ".kairoi",
}

# Marker file -> stack label.
STACK_MARKERS = {
    "package.json": "node",
    "tsconfig.json": "typescript",
    "deno.json": "deno",
    "pyproject.toml": "python",
    "requirements.txt": "python",
    "setup.py": "python",
    "Cargo.toml": "rust",
    "go.mod": "go",
    "pom.xml": "jvm",
    "build.gradle": "jvm",
    "build.gradle.kts": "jvm",
    "Gemfile": "ruby",
    "composer.json": "php",
}


def _count_lines(path: Path) -> int:
    text = read_text(path)
    if not text:
        return 0
    return text.count("\n") + (0 if text.endswith("\n") else 1)


def _entry(path: Path, root: Path, **extra) -> dict:
    info = {"path": rel(path, root), "lines": _count_lines(path)}
    info.update(extra)
    return info


def _find_claude_md(root: Path) -> list[dict]:
    """Root, .claude/, and any nested (monorepo) CLAUDE.md files."""
    found: list[dict] = []
    seen: set[Path] = set()

    for scope, p in (("project", root / "CLAUDE.md"), ("project-dot", root / ".claude" / "CLAUDE.md")):
        if p.is_file():
            found.append(_entry(p, root, scope=scope))
            seen.add(p.resolve())

    # Nested CLAUDE.md in subtrees (monorepo packages), skipping pruned dirs.
    for p in root.rglob("CLAUDE.md"):
        rp = p.resolve()
        if rp in seen:
            continue
        if any(part in PRUNE_DIRS for part in p.relative_to(root).parts):
            continue
        found.append(_entry(p, root, scope="nested"))
    return found


def _glob_dir(root: Path, rel_dir: str, pattern: str, **extra_per) -> list[dict]:
    base = root / rel_dir
    if not base.is_dir():
        return []
    out: list[dict] = []
    for p in sorted(base.glob(pattern)):
        if p.is_file():
            out.append(_entry(p, root))
    return out


def _find_skills(root: Path) -> list[dict]:
    base = root / ".claude" / "skills"
    if not base.is_dir():
        return []
    out: list[dict] = []
    for p in sorted(base.rglob("SKILL.md")):
        if p.is_file():
            out.append(_entry(p, root, dir=rel(p.parent, root)))
    return out


def _read_hooks(root: Path) -> dict:
    """Summarize hook wiring from settings.json / settings.local.json."""
    result = {"settings_files": [], "events": {}, "parse_errors": []}
    for name in ("settings.json", "settings.local.json"):
        p = root / ".claude" / name
        if not p.is_file():
            continue
        result["settings_files"].append(rel(p, root))
        try:
            import json
            data = json.loads(read_text(p) or "{}")
        except (ValueError, ImportError):
            result["parse_errors"].append(rel(p, root))
            continue
        hooks = data.get("hooks") or {}
        if isinstance(hooks, dict):
            for event, handlers in hooks.items():
                count = len(handlers) if isinstance(handlers, list) else 1
                result["events"][event] = result["events"].get(event, 0) + count
    return result


def _read_mcp(root: Path) -> dict:
    p = root / ".mcp.json"
    if not p.is_file():
        return {"present": False, "servers": []}
    try:
        import json
        data = json.loads(read_text(p) or "{}")
        servers = sorted((data.get("mcpServers") or {}).keys())
        return {"present": True, "path": rel(p, root), "servers": servers}
    except ValueError:
        return {"present": True, "path": rel(p, root), "servers": [], "parse_error": True}


def _detect_stack(root: Path) -> list[str]:
    stack: set[str] = set()
    for marker, label in STACK_MARKERS.items():
        if (root / marker).is_file():
            stack.add(label)
    # .NET project/solution files anywhere near the root.
    if any(root.glob("*.csproj")) or any(root.glob("*.sln")):
        stack.add("dotnet")
    return sorted(stack)


def discover(project_root: str | None = None) -> dict:
    root = find_project_root(project_root) if project_root is None else Path(project_root).resolve()

    artifacts = {
        "claude_md": _find_claude_md(root),
        "rules": _glob_dir(root, ".claude/rules", "*.md"),
        "agents": _glob_dir(root, ".claude/agents", "*.md"),
        "skills": _find_skills(root),
        "commands": _glob_dir(root, ".claude/commands", "*.md"),
    }
    hooks = _read_hooks(root)
    mcp = _read_mcp(root)
    stack = _detect_stack(root)

    summary = {kind: len(items) for kind, items in artifacts.items()}
    summary["hook_events"] = sum(hooks["events"].values())
    summary["mcp_servers"] = len(mcp.get("servers", []))

    return {
        "status": "ok",
        "project_root": str(root),
        "artifacts": artifacts,
        "hooks": hooks,
        "mcp": mcp,
        "stack": stack,
        "summary": summary,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Inventory a project's Claude Code setup.")
    ap.add_argument("--project-root", default=None, help="Project root (defaults to nearest .git ancestor of cwd).")
    args = ap.parse_args()
    emit(discover(args.project_root))


if __name__ == "__main__":
    main()
