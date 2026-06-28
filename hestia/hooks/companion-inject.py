#!/usr/bin/env python3
"""Hestia companion brief injection hook.

Runs on SessionStart and SubagentStart. Reads the project's companion verbosity
from `.hestia/lean-mode` (default: lean) and injects the companion brief as
hidden context. Emits nothing when the mode is "off".

  - SessionStart  -> the FULL brief (core + active level): every standing order.
  - SubagentStart -> only the build-governing subset (lean/YAGNI, scope control,
    truth-grounding). A subagent does not orchestrate phases or own memory, so
    injecting the whole doctrine into every subagent (including read-only ones)
    is noise — and an always-on nudge that is frequently irrelevant trains
    Claude to tune out ALL of them.

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

# Build-governing orders — the subset injected into subagents. These affect what
# gets built; the excluded orders (phase discipline, memory hygiene) are
# orchestration concerns the spawning session owns, not a single subagent's task.
# Matched against the core section headings (## <Title> ...) in doctrine.md.
SUBAGENT_ORDERS = ("Lean", "Domain truth-grounding", "Scope control")
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


def _split_core_and_blocks(text: str) -> tuple[str, dict[str, str]]:
    """Split the doctrine into the always-on core and the per-level blocks."""
    parts = re.split(r"<!--\s*LEVEL:(\w+)\s*-->", text)
    core = parts[0].strip()
    blocks = {parts[i].strip().lower(): parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}
    return core, blocks


def build_context(level: str) -> str:
    """Full brief: core (every standing order) plus the active level block."""
    try:
        text = DOCTRINE.read_text(encoding="utf-8")
    except OSError:
        return FALLBACK
    core, blocks = _split_core_and_blocks(_strip_authoring_comment(text))
    block = blocks.get(level, "")
    return f"{core}\n\n{block}".strip() if block else core


def build_subagent_context() -> str:
    """Compact brief for subagents: only the build-governing standing orders.

    Keeps the brief's preamble line (so the subagent knows it is under Hestia),
    then only the core sections whose heading matches SUBAGENT_ORDERS. The
    per-level blocks and the orchestration orders (phases, memory) are dropped.
    """
    try:
        text = DOCTRINE.read_text(encoding="utf-8")
    except OSError:
        return SUBAGENT_FALLBACK
    core, _ = _split_core_and_blocks(_strip_authoring_comment(text))
    # Sections are delimited by level-2 headings (## ...). Keep the preamble
    # (everything before the first ## heading) plus the selected sections.
    chunks = re.split(r"(?m)^(?=## )", core)
    preamble = chunks[0].strip()
    kept = [preamble] if preamble else []
    for chunk in chunks[1:]:
        heading = chunk.lstrip("# ").splitlines()[0] if chunk.strip() else ""
        if any(heading.startswith(name) for name in SUBAGENT_ORDERS):
            kept.append(chunk.strip())
    selected = "\n\n".join(kept).strip()
    return selected or SUBAGENT_FALLBACK


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
