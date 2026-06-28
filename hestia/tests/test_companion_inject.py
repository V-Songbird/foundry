"""Tests for companion-inject.py — the SessionStart / SubagentStart injector.

Covers:
  - SessionStart emits the FULL brief (every standing order) as raw stdout.
  - SubagentStart emits only the COMPACT build-governing subset, wrapped in the
    hookSpecificOutput JSON contract — NOT the full brief.
  - The subagent subset is strictly smaller than the full brief.
  - mode "off" emits nothing.
  - The hook never crashes on missing / empty / malformed stdin.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

HOOK = Path(__file__).parent.parent / "hooks" / "companion-inject.py"
PYTHON = sys.executable


def run_hook(project: Path, stdin_data: str | None) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["CLAUDE_PROJECT_DIR"] = str(project)
    return subprocess.run(
        [PYTHON, str(HOOK)],
        input=stdin_data,
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        env=env,
    )


def session_event() -> str:
    return json.dumps({"hook_event_name": "SessionStart"})


def subagent_event() -> str:
    return json.dumps({"hook_event_name": "SubagentStart"})


@pytest.fixture
def project(tmp_path):
    p = tmp_path / "project"
    p.mkdir()
    return p


def set_mode(project: Path, mode: str) -> None:
    d = project / ".hestia"
    d.mkdir(exist_ok=True)
    (d / "lean-mode").write_text(mode, encoding="utf-8")


# ---------------------------------------------------------------------------
# SessionStart — full brief, raw stdout
# ---------------------------------------------------------------------------

class TestSessionStart:
    def test_emits_full_brief_raw(self, project):
        r = run_hook(project, session_event())
        assert r.returncode == 0
        # Raw text, not JSON-wrapped.
        with pytest.raises(json.JSONDecodeError):
            json.loads(r.stdout)
        assert "Companion brief" in r.stdout

    def test_full_brief_includes_every_standing_order(self, project):
        r = run_hook(project, session_event())
        # All five core orders present at SessionStart.
        assert "Lean" in r.stdout
        assert "Phase discipline" in r.stdout
        assert "truth-grounding" in r.stdout.lower()
        assert "Scope control" in r.stdout
        assert "Memory hygiene" in r.stdout

    def test_default_mode_is_lean(self, project):
        """No lean-mode file -> default level injected (the lean block)."""
        r = run_hook(project, session_event())
        assert "lean (default)" in r.stdout


# ---------------------------------------------------------------------------
# SubagentStart — compact subset, JSON-wrapped
# ---------------------------------------------------------------------------

class TestSubagentStart:
    def test_emits_valid_json_contract(self, project):
        r = run_hook(project, subagent_event())
        assert r.returncode == 0
        payload = json.loads(r.stdout)
        hso = payload["hookSpecificOutput"]
        assert hso["hookEventName"] == "SubagentStart"
        assert isinstance(hso["additionalContext"], str)
        assert hso["additionalContext"]

    def test_includes_build_governing_orders(self, project):
        r = run_hook(project, subagent_event())
        ctx = json.loads(r.stdout)["hookSpecificOutput"]["additionalContext"]
        assert "Lean" in ctx
        assert "Scope control" in ctx
        assert "truth-grounding" in ctx.lower()

    def test_excludes_orchestration_orders(self, project):
        """Phase discipline and memory hygiene are NOT injected into subagents."""
        r = run_hook(project, subagent_event())
        ctx = json.loads(r.stdout)["hookSpecificOutput"]["additionalContext"]
        assert "Phase discipline" not in ctx
        assert "Memory hygiene" not in ctx

    def test_subagent_brief_is_smaller_than_full(self, project):
        full = run_hook(project, session_event()).stdout
        sub = json.loads(
            run_hook(project, subagent_event()).stdout
        )["hookSpecificOutput"]["additionalContext"]
        assert len(sub) < len(full)

    def test_subagent_excludes_level_blocks(self, project):
        """The per-level (trim/lean/bare) blocks are not part of the subset."""
        r = run_hook(project, subagent_event())
        ctx = json.loads(r.stdout)["hookSpecificOutput"]["additionalContext"]
        assert "At this level" not in ctx


# ---------------------------------------------------------------------------
# off mode
# ---------------------------------------------------------------------------

class TestOffMode:
    def test_session_off_emits_nothing(self, project):
        set_mode(project, "off")
        r = run_hook(project, session_event())
        assert r.returncode == 0
        assert r.stdout.strip() == ""

    def test_subagent_off_emits_nothing(self, project):
        set_mode(project, "off")
        r = run_hook(project, subagent_event())
        assert r.returncode == 0
        assert r.stdout.strip() == ""


# ---------------------------------------------------------------------------
# Robustness — never crash
# ---------------------------------------------------------------------------

class TestRobustness:
    def test_empty_stdin_defaults_to_session(self, project):
        r = run_hook(project, "")
        assert r.returncode == 0
        # Empty stdin -> treated as SessionStart -> raw full brief.
        assert "Companion brief" in r.stdout

    def test_malformed_stdin_does_not_crash(self, project):
        r = run_hook(project, "not json at all {{{")
        assert r.returncode == 0

    def test_no_stdin_does_not_crash(self, project):
        r = run_hook(project, None)
        assert r.returncode == 0

    def test_garbage_mode_falls_back_to_default(self, project):
        set_mode(project, "wibble")
        r = run_hook(project, session_event())
        assert r.returncode == 0
        assert "lean (default)" in r.stdout
