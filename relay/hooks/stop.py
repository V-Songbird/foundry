#!/usr/bin/env python3
"""Relay — Stop hook.

One-shot deferred-work sweep before the session ends.

First invocation (no flag for this session): writes flag, emits sweep
instruction to stdout, exits 1 to block the stop. Claude does one more
turn, calls spawn_task for any deferred items, then ends naturally.

Second invocation (flag exists): exits 0, allowing the session to close.

Claude Code caps consecutive non-zero hook exits at 8, so the sweep
completes in one turn and never traps the user in the session.

Flag is session-scoped via a temp file keyed on session_id. On error,
the hook exits 0 (allowing stop) rather than risking an infinite block.

Output contract: raw stdout (Stop hook convention — same as SessionStart).

Standard library only. Python 3.10+.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path

PLUGIN_ROOT = Path(os.environ.get("CLAUDE_PLUGIN_ROOT", Path(__file__).resolve().parent.parent))
TEMPLATE_PATH = PLUGIN_ROOT / "prompt-template.md"

SWEEP_INSTRUCTION = (
    "[Relay] Before ending: scan this session for any items noted as deferred, "
    "out-of-scope, or TODO. For each confirmed, non-trivial item: Read {template_path}, "
    "fill the template, and call spawn_task. Then end your turn — "
    "the session will close after the sweep completes."
).format(template_path=str(TEMPLATE_PATH))


def _flag_path(session_id: str | None) -> Path:
    key = session_id or os.environ.get("CLAUDE_PROJECT_DIR", "relay-default")
    h = hashlib.md5(key.encode("utf-8")).hexdigest()[:12]
    return Path(tempfile.gettempdir()) / f"relay_sweep_{h}.flag"


def main() -> None:
    try:
        data = json.loads(sys.stdin.read() or "{}")
    except (ValueError, OSError):
        data = {}

    session_id = data.get("session_id")
    flag = _flag_path(session_id)

    if flag.exists():
        sys.exit(0)

    try:
        flag.touch()
        sys.stdout.buffer.write(SWEEP_INSTRUCTION.encode("utf-8"))
    except OSError:
        sys.exit(0)

    sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never trap the user — on any error, allow the session to close.
        sys.exit(0)
