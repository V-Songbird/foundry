#!/usr/bin/env python3
"""Relay — PostToolUse hook.

Fires after Agent or Workflow completes. Injects a reminder to scan the
agent's output for out-of-scope finds and spawn chips for each confirmed item.

Output contract: hookSpecificOutput JSON (raw stdout ignored for PostToolUse).

Standard library only. Python 3.10+.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

PLUGIN_ROOT = Path(os.environ.get("CLAUDE_PLUGIN_ROOT", Path(__file__).resolve().parent.parent))
TEMPLATE_PATH = PLUGIN_ROOT / "prompt-template.md"

WATCHED = {"Agent", "Workflow"}

HINT = (
    "[Relay] Agent/workflow completed. Scan its output for any out-of-scope finds, "
    "deferred items, or follow-up work. For each confirmed item: Read {template_path}, "
    "fill the template, and call spawn_task with a fully self-contained prompt."
).format(template_path=str(TEMPLATE_PATH))


def main() -> None:
    try:
        data = json.loads(sys.stdin.read() or "{}")
    except (ValueError, OSError):
        return

    if data.get("tool_name") not in WATCHED:
        return

    payload = json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": HINT,
        }
    })
    try:
        sys.stdout.buffer.write(payload.encode("utf-8"))
    except OSError:
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(0)
