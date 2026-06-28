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
import os
from pathlib import Path

from _lib import emit, find_project_root, read_text, rel

# Directories we never descend into when looking for nested CLAUDE.md files.
PRUNE_DIRS = {
    ".git", "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache",
    "dist", "build", "target", "out", ".next", ".idea", ".vscode", "vendor",
    ".hestia", ".hestia-tmp", ".rulesense", ".rulesense-tmp", ".kairoi",
    "worktrees",  # .claude/worktrees holds throwaway agent copies; their refs are not the user's
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
    """Root, .claude/, CLAUDE.local.md, and any nested (monorepo) CLAUDE.md files.

    Per the docs, project-root CLAUDE.md / .claude/CLAUDE.md / CLAUDE.local.md are
    loaded in full at launch (always-loaded). CLAUDE.local.md gets scope
    ``project-local`` (gitignored personal preferences). Nested CLAUDE.md in
    subdirectories load *on demand* when Claude reads files there, so they get
    scope ``nested`` and are treated as not-always-loaded downstream.
    """
    found: list[dict] = []
    seen: set[Path] = set()

    for scope, p in (
        ("project", root / "CLAUDE.md"),
        ("project-dot", root / ".claude" / "CLAUDE.md"),
        ("project-local", root / "CLAUDE.local.md"),
    ):
        if p.is_file():
            found.append(_entry(p, root, scope=scope))
            seen.add(p.resolve())

    # Nested CLAUDE.md / CLAUDE.local.md in subtrees (monorepo packages), skipping pruned dirs.
    for name in ("CLAUDE.md", "CLAUDE.local.md"):
        for p in root.rglob(name):
            rp = p.resolve()
            if rp in seen:
                continue
            if any(part in PRUNE_DIRS for part in p.relative_to(root).parts):
                continue
            found.append(_entry(p, root, scope="nested"))
            seen.add(rp)
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


def _rglob_dir(root: Path, base: Path, pattern: str, scope_root: Path | None = None, **extra_per) -> list[dict]:
    """Recursively collect files under ``base`` matching ``pattern``, pruning PRUNE_DIRS.

    Doc: ``.claude/rules`` and ``.claude/commands`` are discovered recursively, so
    e.g. ``.claude/rules/frontend/react.md`` is found. ``scope_root`` controls how
    paths are made relative (project root, or the user-config dir for user scope).
    """
    if not base.is_dir():
        return []
    path_root = scope_root or root
    out: list[dict] = []
    for p in sorted(base.rglob(pattern)):
        if not p.is_file():
            continue
        if any(part in PRUNE_DIRS for part in p.relative_to(base).parts):
            continue
        out.append(_entry(p, path_root, **extra_per))
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


def _user_config_dir() -> Path:
    """Resolve the user-scope Claude config dir, honoring CLAUDE_CONFIG_DIR.

    Falls back to ``~/.claude``. Per the docs, user-scope CLAUDE.md and
    ``~/.claude/rules/**/*.md`` load alongside project context.
    """
    override = os.environ.get("CLAUDE_CONFIG_DIR")
    if override:
        return Path(override).expanduser()
    return Path.home() / ".claude"


def _find_user_scope() -> dict:
    """Discover user-scope CLAUDE.md and rules (~/.claude/...). Never crashes if absent.

    Returns {"claude_md": [...], "rules": [...]} with paths relative to the user
    config dir, each tagged scope="user". Opt-in: only called when requested.
    """
    out: dict[str, list[dict]] = {"claude_md": [], "rules": []}
    try:
        cfg = _user_config_dir()
    except (OSError, RuntimeError):
        return out
    if not cfg.is_dir():
        return out

    user_md = cfg / "CLAUDE.md"
    if user_md.is_file():
        out["claude_md"].append(_entry(user_md, cfg, scope="user"))

    out["rules"] = _rglob_dir(cfg, cfg / "rules", "*.md", scope_root=cfg, scope="user")
    return out


def _detect_stack(root: Path) -> list[str]:
    stack: set[str] = set()
    for marker, label in STACK_MARKERS.items():
        if (root / marker).is_file():
            stack.add(label)
    # .NET project/solution files anywhere near the root.
    if any(root.glob("*.csproj")) or any(root.glob("*.sln")):
        stack.add("dotnet")
    return sorted(stack)


def discover(project_root: str | None = None, *, include_user_scope: bool = False) -> dict:
    root = find_project_root(project_root) if project_root is None else Path(project_root).resolve()

    # .claude/rules and .claude/commands are discovered recursively (nested
    # subdirs like rules/frontend/react.md), pruning the same dirs as skills.
    artifacts = {
        "claude_md": _find_claude_md(root),
        "rules": _rglob_dir(root, root / ".claude" / "rules", "*.md"),
        "agents": _glob_dir(root, ".claude/agents", "*.md"),
        "skills": _find_skills(root),
        "commands": _rglob_dir(root, root / ".claude" / "commands", "*.md"),
    }

    # User scope (~/.claude/): opt-in so default project audits don't silently
    # pull in personal files. Tagged scope="user" so reports can separate them.
    if include_user_scope:
        user = _find_user_scope()
        for md in user["claude_md"]:
            artifacts["claude_md"].append(md)
        for rule in user["rules"]:
            artifacts["rules"].append(rule)

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
    ap.add_argument("--include-user-scope", action="store_true",
                    help="Also discover user-scope CLAUDE.md and ~/.claude/rules/ (honors CLAUDE_CONFIG_DIR).")
    args = ap.parse_args()
    emit(discover(args.project_root, include_user_scope=args.include_user_scope))


if __name__ == "__main__":
    main()
