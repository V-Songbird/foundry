#!/usr/bin/env python3
"""Relay — SessionStart hook.

Injects compact delegation awareness once per session. ~100 tokens.
Full prompt template is in prompt-template.md and read on demand.

Output contract: raw stdout (SessionStart / UserPromptSubmit convention).

Standard library only. Python 3.10+.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

PLUGIN_ROOT = Path(os.environ.get("CLAUDE_PLUGIN_ROOT", Path(__file__).resolve().parent.parent))
TEMPLATE_PATH = PLUGIN_ROOT / "prompt-template.md"

INJECTION = """\
RELAY ACTIVE.

<!-- relay:practices lastmod:2026-06-30
     sources: code.claude.com/docs/en/best-practices.md, sub-agents.md,
              Fable 5 prompting guide, Anthropic Prompting 101 2025-05-22 -->

DETECT: if mcp__ccd_session__spawn_task available in your tools -> Desktop mode.
Else -> CLI mode.

ROUTING:
  Desktop: spawn_task (background chip) | mark_chapter (session nav) | Agent/Workflow (parallel)
  CLI:     Agent + TaskCreate            | TaskCreate milestone        | Agent/Workflow (parallel)

PROACTIVE SPAWN - trigger immediately, without waiting to be asked:
- Confirmed security/bug find outside current task scope
- Dead code or stale docs found while reading unrelated code
- Real follow-up that clearly belongs in its own session

CHAPTERS (Desktop only) - mark at phase transitions, 3-8 per session:
  Exploration | Planning | Implementation | Verification | Commit
  Do not mark for the very first message.

SPAWN QUALITY - before every spawn_task call, Read: {template_path}
Apply it fully. Never skip relevant_files. Never skip verification criteria.\
""".format(template_path=str(TEMPLATE_PATH))


def main() -> None:
    try:
        sys.stdout.buffer.write(INJECTION.encode("utf-8"))
    except OSError:
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(0)
