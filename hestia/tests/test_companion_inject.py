"""Tests for companion-inject.py — the SessionStart / SubagentStart injector.

Covers:
  - SessionStart at the default (lean) emits the full body of every order.
  - The verbosity dial is real: trim = terse of every order, lean = full bodies,
    bare = terse of the critical orders only (bare < trim < lean in size).
  - SubagentStart emits the terse build-governing subset (Lean/Truth/Scope),
    wrapped in the hookSpecificOutput JSON contract — not phases/memory, not full.
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
        """No lean-mode file -> default level = lean = full bodies of every order."""
        r = run_hook(project, session_event())
        # "The ladder" appears only in the full Lean body, never in the terse form.
        assert "The ladder" in r.stdout


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
        assert "Scope" in ctx
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

    def test_subagent_uses_terse_not_full(self, project):
        """Subagent gets the terse one-liners, not the full bodies."""
        r = run_hook(project, subagent_event())
        ctx = json.loads(r.stdout)["hookSpecificOutput"]["additionalContext"]
        assert "- **Lean:**" in ctx       # terse bullet form
        assert "The ladder" not in ctx    # full Lean body NOT included


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
        assert "The ladder" in r.stdout  # fell back to lean (full bodies)


# ---------------------------------------------------------------------------
# The verbosity dial — trim / lean / bare genuinely differ
# ---------------------------------------------------------------------------

class TestLevels:
    TERSE_LABELS = ("- **Lean:**", "- **Phases:**", "- **Truth-grounding:**",
                    "- **Scope:**", "- **Memory:**")

    def test_trim_is_all_orders_terse(self, project):
        set_mode(project, "trim")
        out = run_hook(project, session_event()).stdout
        for label in self.TERSE_LABELS:
            assert label in out          # every order present, terse
        assert "The ladder" not in out   # but no full bodies
        assert "## Lean" not in out

    def test_lean_is_all_orders_full(self, project):
        set_mode(project, "lean")
        out = run_hook(project, session_event()).stdout
        assert "The ladder" in out       # full bodies
        assert "## Memory hygiene" in out
        assert "- **Lean:**" not in out  # not the terse bullets

    def test_bare_is_critical_orders_only(self, project):
        set_mode(project, "bare")
        out = run_hook(project, session_event()).stdout
        assert "- **Lean:**" in out
        assert "- **Truth-grounding:**" in out
        # non-critical orders are dropped at bare
        assert "- **Phases:**" not in out
        assert "- **Scope:**" not in out
        assert "- **Memory:**" not in out

    def test_size_ordering_bare_lt_trim_lt_lean(self, project):
        def size(mode):
            set_mode(project, mode)
            return len(run_hook(project, session_event()).stdout)
        assert size("bare") < size("trim") < size("lean")
