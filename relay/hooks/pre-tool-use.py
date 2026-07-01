#!/usr/bin/env python3
"""Relay — PreToolUse hook.

Blocks spawn_task unless prompt-template.md was Read since the last
spawn_task call (or session start). Soft instruction alone proved
insufficient — see feedback_relay_spawn_task_gate memory: two separate
sessions skipped the mandatory template read before calling spawn_task.

Output contract: hookSpecificOutput JSON. Standard library only. Python 3.10+.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

PLUGIN_ROOT = Path(os.environ.get("CLAUDE_PLUGIN_ROOT", Path(__file__).resolve().parent.parent))
TEMPLATE_PATH = PLUGIN_ROOT / "prompt-template.md"

WATCHED_TOOL = "mcp__ccd_session__spawn_task"


def template_read_since_last_spawn(transcript_path: str) -> bool:
    last_read_idx = None
    last_spawn_idx = None
    idx = 0

    try:
        with open(transcript_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except ValueError:
                    continue

                content = entry.get("message", {}).get("content")
                if not isinstance(content, list):
                    continue

                for block in content:
                    if not isinstance(block, dict) or block.get("type") != "tool_use":
                        continue
                    name = block.get("name")
                    if name == "Read":
                        file_path = str(block.get("input", {}).get("file_path", ""))
                        if file_path.replace("\\", "/").lower().endswith("prompt-template.md"):
                            last_read_idx = idx
                    elif name == WATCHED_TOOL:
                        last_spawn_idx = idx
                    idx += 1
    except OSError:
        return True  # fail open — don't block on unreadable transcript

    if last_read_idx is None:
        return False
    if last_spawn_idx is None:
        return True
    return last_read_idx > last_spawn_idx


def main() -> None:
    try:
        data = json.loads(sys.stdin.read() or "{}")
    except (ValueError, OSError):
        return

    if data.get("tool_name") != WATCHED_TOOL:
        return

    transcript_path = data.get("transcript_path", "")
    if not transcript_path or template_read_since_last_spawn(transcript_path):
        return

    payload = json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                "Relay: spawn_task blocked. Read {template_path} first, then retry "
                "spawn_task following its structure (relevant_files, verification "
                "criteria, etc.)."
            ).format(template_path=str(TEMPLATE_PATH)),
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
