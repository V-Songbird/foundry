#!/usr/bin/env python3
"""Relay — UserPromptSubmit hook.

Lightweight pattern scan on every incoming prompt. Emits a one-line
delegation hint when multi-task or deferred-work signals are detected.
No API calls. No semantic analysis. Shell-speed regex only.

Output contract: raw stdout (UserPromptSubmit convention).

Standard library only. Python 3.10+.
"""
from __future__ import annotations

import json
import re
import sys

# Numbered lists, "also/additionally/and then/furthermore" conjunctions
_MULTI = re.compile(
    r"(?:\b(?:also|additionally|and\s+then|furthermore)\b|\b\d+[\.\)]\s+\w)",
    re.IGNORECASE,
)

# Explicit deferral language
_DEFERRED = re.compile(
    r"\b(?:TODO|later|we\s+should|we\s+need\s+to|should\s+also|eventually|at\s+some\s+point)\b",
    re.IGNORECASE,
)

MULTI_HINT = (
    "[Relay] Multi-part request detected. Before starting, identify which subtasks "
    "are independent and can run in parallel subagents."
)
DEFERRED_HINT = (
    "[Relay] Deferred-work signal detected. If any item is out of current task scope, "
    "flag it for spawn_task rather than deferring silently."
)

MIN_PROMPT_LEN = 20


def main() -> None:
    try:
        data = json.loads(sys.stdin.read() or "{}")
    except (ValueError, OSError):
        return

    prompt = (data.get("prompt") or "").strip()
    if len(prompt) < MIN_PROMPT_LEN:
        return

    hints = []
    if _MULTI.search(prompt):
        hints.append(MULTI_HINT)
    if _DEFERRED.search(prompt):
        hints.append(DEFERRED_HINT)
    if not hints:
        return

    try:
        sys.stdout.buffer.write("\n".join(hints).encode("utf-8"))
    except OSError:
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(0)
