#!/usr/bin/env python3
"""Hestia companion brief injection hook.

Runs on SessionStart and SubagentStart. Reads the project's companion verbosity
from `.hestia/lean-mode` (default: lean) and injects the companion brief as
hidden context. Emits nothing when the mode is "off".

  - SessionStart  -> the brief at the active verbosity level:
      trim -> the terse one-line form of every standing order
      lean -> the full body of every standing order (default)
      bare -> the terse form of the critical orders only
  - SubagentStart -> the terse form of only the build-governing orders
    (lean/YAGNI, truth-grounding, scope control), regardless of level. A
    subagent does not orchestrate phases or own memory, so injecting the whole
    doctrine into every subagent is noise — and an always-on nudge that is
    frequently irrelevant trains Claude to tune out ALL of them.

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

SUBAGENT_FALLBACK = FALLBACK


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


def _strip_authoring_comment(text: str) -> str:
    """Drop the leading authoring comment block."""
    return re.sub(r"^\s*<!--.*?-->\s*", "", text, count=1, flags=re.DOTALL)


def parse_doctrine(text: str) -> tuple[str, list[dict]]:
    """Parse the doctrine into (preamble, orders).

    Each order is {id, critical, build, terse, full}: `terse` is the one-line
    bullet form, `full` is the detailed body. The preamble (everything before
    the first ORDER marker) prefixes the brief at every non-off level.
    """
    text = _strip_authoring_comment(text)
    parts = re.split(r"<!--\s*ORDER\s+(.*?)\s*-->", text, flags=re.DOTALL)
    preamble = parts[0].strip()
    orders: list[dict] = []
    for i in range(1, len(parts) - 1, 2):
        attrs = dict(kv.split("=", 1) for kv in parts[i].split() if "=" in kv)
        terse, full_lines = "", []
        for line in parts[i + 1].strip().splitlines():
            s = line.strip()
            if not terse and not full_lines and s.startswith("- "):
                terse = s
            elif s.startswith("## ") or full_lines:
                full_lines.append(line)
        orders.append({
            "id": attrs.get("id", ""),
            "critical": attrs.get("critical") == "yes",
            "build": attrs.get("build") == "yes",
            "terse": terse,
            "full": "\n".join(full_lines).strip(),
        })
    return preamble, orders


def _assemble(preamble: str, pieces: list[str]) -> str:
    body = "\n\n".join(p for p in pieces if p).strip()
    return f"{preamble}\n\n{body}".strip() if body else preamble


def build_context(level: str) -> str:
    """Session brief, varying by level: trim = terse of every order, lean =
    full body of every order (default), bare = terse of the critical orders."""
    try:
        text = DOCTRINE.read_text(encoding="utf-8")
    except OSError:
        return FALLBACK
    preamble, orders = parse_doctrine(text)
    if not orders:
        return preamble or FALLBACK
    if level == "trim":
        pieces = [o["terse"] for o in orders]
    elif level == "bare":
        pieces = [o["terse"] for o in orders if o["critical"]]
    else:  # lean (default), and any unexpected value -> full
        pieces = [o["full"] for o in orders]
    return _assemble(preamble, pieces)


def build_subagent_context() -> str:
    """Compact brief for subagents: the terse form of the build-governing orders
    only, regardless of session level. They affect what gets built; the others
    (phases, memory) are orchestration the spawning session owns."""
    try:
        text = DOCTRINE.read_text(encoding="utf-8")
    except OSError:
        return SUBAGENT_FALLBACK
    preamble, orders = parse_doctrine(text)
    pieces = [o["terse"] for o in orders if o["build"]]
    return _assemble(preamble, pieces) if pieces else SUBAGENT_FALLBACK


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

    if event == "SubagentStart":
        # Subagents get only the build-governing subset, wrapped in JSON.
        payload = json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "SubagentStart",
                "additionalContext": build_subagent_context(),
            }
        })
    else:
        # SessionStart gets the full brief as raw stdout.
        payload = build_context(mode)
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
        # Never break session start over the companion hook.
        sys.exit(0)
