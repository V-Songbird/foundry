"""Tests for injection_ledger.py — the standing-order self-audit ledger.

Covers:
  - confirm / dispute append a well-formed line to .hestia/injection-ledger.jsonl
  - the ledger file + .hestia/ dir are created on first write
  - summary aggregates per-order confirm/dispute counts with a descriptive note
  - graceful first-run: summary on a fresh project says "empty", never crashes
  - bad lines in the ledger are skipped, not fatal
  - the CLI never hard-crashes on missing/empty args
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"
LEDGER = SCRIPTS_DIR / "injection_ledger.py"
PYTHON = sys.executable

# Import the module in-process for the aggregation tests.
sys.path.insert(0, str(SCRIPTS_DIR))
import injection_ledger  # noqa: E402


def run_cli(project: Path, *args: str) -> subprocess.CompletedProcess:
    """Run injection_ledger.py as a subprocess with CLAUDE_PROJECT_DIR set."""
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["CLAUDE_PROJECT_DIR"] = str(project)
    return subprocess.run(
        [PYTHON, str(LEDGER), *args],
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        env=env,
    )


@pytest.fixture
def project(tmp_path, monkeypatch):
    """A fresh project root, exported via CLAUDE_PROJECT_DIR for in-process calls."""
    p = tmp_path / "project"
    p.mkdir()
    monkeypatch.setenv("CLAUDE_PROJECT_DIR", str(p))
    return p


# ---------------------------------------------------------------------------
# File creation + append
# ---------------------------------------------------------------------------

class TestRecord:
    def test_confirm_creates_ledger_in_hestia(self, project):
        path = injection_ledger.record("confirm", "scope")
        assert path == project / ".hestia" / "injection-ledger.jsonl"
        assert path.exists()

    def test_record_appends_one_jsonl_line(self, project):
        injection_ledger.record("confirm", "scope")
        injection_ledger.record("dispute", "phases")
        lines = (project / ".hestia" / "injection-ledger.jsonl").read_text(
            encoding="utf-8"
        ).strip().splitlines()
        assert len(lines) == 2
        first = json.loads(lines[0])
        assert first["order"] == "scope"
        assert first["verdict"] == "confirm"
        assert isinstance(first["ts"], int)

    def test_record_stores_optional_note(self, project):
        injection_ledger.record("confirm", "scope", "caught real scope creep")
        entry = injection_ledger.read_entries()[0]
        assert entry["note"] == "caught real scope creep"

    def test_record_omits_empty_note(self, project):
        injection_ledger.record("confirm", "scope")
        assert "note" not in injection_ledger.read_entries()[0]


# ---------------------------------------------------------------------------
# Summary aggregation
# ---------------------------------------------------------------------------

class TestSummary:
    def test_empty_first_run(self, project):
        """A fresh project with no ledger yields an empty, non-crashing summary."""
        s = injection_ledger.summarize()
        assert s["orders"] == []
        assert s["total_entries"] == 0
        assert "empty" in injection_ledger.render(s).lower()

    def test_aggregates_confirm_and_dispute_counts(self, project):
        for _ in range(3):
            injection_ledger.record("confirm", "scope")
        injection_ledger.record("dispute", "scope")
        injection_ledger.record("dispute", "phases")
        s = injection_ledger.summarize()
        by_order = {o["order"]: o for o in s["orders"]}
        assert by_order["scope"]["confirms"] == 3
        assert by_order["scope"]["disputes"] == 1
        assert by_order["scope"]["sessions"] == 4
        assert by_order["phases"]["confirms"] == 0
        assert by_order["phases"]["disputes"] == 1
        assert s["total_entries"] == 5

    def test_zero_confirm_order_flagged_as_candidate(self, project):
        """An order with disputes but no confirms gets the drop/rescope note."""
        injection_ledger.record("dispute", "memory")
        injection_ledger.record("dispute", "memory")
        note = injection_ledger.summarize()["orders"][0]["note"]
        assert "0 confirms" in note
        assert "candidate to drop or rescope" in note

    def test_note_is_descriptive_not_auto_action(self, project):
        """No threshold/auto-action: even a heavily-disputed order is only a
        'candidate', never auto-dropped (the candidacy is descriptive)."""
        injection_ledger.record("confirm", "scope")
        injection_ledger.record("dispute", "scope")
        injection_ledger.record("dispute", "scope")
        note = next(
            o["note"] for o in injection_ledger.summarize()["orders"]
            if o["order"] == "scope"
        )
        assert "candidate to rescope" in note

    def test_render_lists_every_order(self, project):
        injection_ledger.record("confirm", "scope")
        injection_ledger.record("confirm", "lean")
        out = injection_ledger.render(injection_ledger.summarize())
        assert "scope" in out
        assert "lean" in out

    def test_bad_lines_are_skipped(self, project):
        ledger = project / ".hestia"
        ledger.mkdir(parents=True)
        (ledger / "injection-ledger.jsonl").write_text(
            'not json\n{"order": "scope", "verdict": "confirm", "ts": 1}\n\n'
            '{"no_order": true}\n',
            encoding="utf-8",
        )
        entries = injection_ledger.read_entries()
        assert len(entries) == 1
        assert entries[0]["order"] == "scope"


# ---------------------------------------------------------------------------
# CLI surface
# ---------------------------------------------------------------------------

class TestCLI:
    def test_confirm_via_cli(self, project):
        r = run_cli(project, "confirm", "scope")
        assert r.returncode == 0
        assert "recorded confirm" in r.stdout
        assert (project / ".hestia" / "injection-ledger.jsonl").exists()

    def test_summary_via_cli_empty(self, project):
        r = run_cli(project, "summary")
        assert r.returncode == 0
        assert "empty" in r.stdout.lower()

    def test_summary_via_cli_after_records(self, project):
        run_cli(project, "confirm", "scope")
        run_cli(project, "dispute", "scope")
        r = run_cli(project, "summary")
        assert r.returncode == 0
        assert "scope" in r.stdout

    def test_no_args_is_nonzero_not_crash(self, project):
        r = run_cli(project)
        assert r.returncode == 2

    def test_confirm_without_order_id_is_nonzero(self, project):
        r = run_cli(project, "confirm")
        assert r.returncode == 2

    def test_unknown_command_is_nonzero(self, project):
        r = run_cli(project, "frobnicate")
        assert r.returncode == 2
