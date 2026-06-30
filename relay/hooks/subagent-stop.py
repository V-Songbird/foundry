#!/usr/bin/env python3
"""Relay — SubagentStop hook.

When a subagent finishes, reminds it to surface any out-of-scope finds
clearly in its output so the main session can spawn chips for them.

Output contract: hookSpecificOutput JSON (mirrors SubagentStart convention).

Standard library only. Python 3.10+.
"""
from __future__ import annotations

import json
import sys

HINT = (
    "[Relay] Before stopping, check if you found any issues outside your assigned "
    "task scope — security findings, dead code, stale docs, or bugs in code you "
    "were only reading. If yes, list each one in your output as:\n"
    "  DEFERRED: <one-line description> | Files: <exact paths>\n"
    "The main session will spawn chips for them. If nothing out of scope, omit this section."
)


def main() -> None:
    payload = json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SubagentStop",
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
