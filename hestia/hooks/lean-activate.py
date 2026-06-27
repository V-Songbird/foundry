#!/usr/bin/env python3
"""Hestia lean-mode activation hook.

Runs on SessionStart and SubagentStart. Reads the project's lean intensity
from `.hestia/lean-mode` (default: lean) and injects the doctrine — core plus
the active level — as hidden context so every turn defaults to the smallest
change that works. Emits nothing when the mode is "off".

Output contract (native Claude Code):
  - SessionStart  -> raw text on stdout is added to context.
  - SubagentStart -> context must be wrapped in hookSpecificOutput JSON.

Best-effort throughout: a stale or missing file must never break session start.

Standard library only. Python 3.10+.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

VALID_LEVELS = {"trim", "lean", "bare"}
DEFAULT_LEVEL = "lean"
DOCTRINE = Path(__file__).resolve().parent.parent / "skills" / "lean" / "doctrine.md"

FALLBACK = (
    "Lean mode: default to the smallest change that fully solves the problem. "
    "Reuse what exists, then the standard library, then native features, before "
    "writing new code. Never cut validation, error handling, security, or anything "
    "asked for. Mark deliberate shortcuts with a `hestia:later` comment."
)


def project_dir() -> Path:
    return Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())


def read_mode() -> str:
    f = project_dir() / ".hestia" / "lean-mode"
    try:
        mode = f.read_text(encoding="utf-8").strip().lower()
    except OSError:
        return DEFAULT_LEVEL
    if mode == "off":
        return "off"
    return mode if mode in VALID_LEVELS else DEFAULT_LEVEL


def build_context(level: str) -> str:
    try:
        text = DOCTRINE.read_text(encoding="utf-8")
    except OSError:
        return FALLBACK
    # Drop the leading authoring comment block.
    text = re.sub(r"^\s*<!--.*?-->\s*", "", text, count=1, flags=re.DOTALL)
    # Split into the always-on core and the per-level blocks.
    parts = re.split(r"<!--\s*LEVEL:(\w+)\s*-->", text)
    core = parts[0].strip()
    blocks = {parts[i].strip().lower(): parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}
    block = blocks.get(level, "")
    return f"{core}\n\n{block}".strip() if block else core


def hook_event() -> str:
    try:
        data = json.loads(sys.stdin.read() or "{}")
        return data.get("hook_event_name") or "SessionStart"
    except (ValueError, OSError):
        return "SessionStart"


def main() -> None:
    event = hook_event()
    mode = read_mode()
    if mode == "off":
        sys.exit(0)

    context = build_context(mode)
    if event == "SubagentStart":
        payload = json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "SubagentStart",
                "additionalContext": context,
            }
        })
    else:
        payload = context
    try:
        # Force UTF-8 so em dashes etc. survive a non-UTF-8 console locale.
        sys.stdout.buffer.write(payload.encode("utf-8"))
    except OSError:
        # stdout closed/EPIPE at hook exit must not surface as a failure.
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never break session start over the lean hook.
        sys.exit(0)
