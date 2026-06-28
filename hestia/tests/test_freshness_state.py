"""Tests for freshness_state.py — feature #3, "staleness-as-honesty".

Two linked behaviors:

  1. Derive-staleness: a fresh/aging/stale label is DERIVED from cheap signals
     (commits since last checkup, days since last checkup) via one formula using
     the labeled DEFAULTS. No grade is ever stored.

  2. Negative invariants: when a surface scans clean it is recorded with the
     input-signature that made it clean; an unchanged signature lets a later run
     SKIP the surface, a changed signature forces a re-scan.

Also exercises graceful degradation: not a git repo, and no prior state.
"""

import subprocess
import sys
from pathlib import Path

import pytest
from conftest import SCRIPTS_DIR

sys.path.insert(0, str(SCRIPTS_DIR))
import freshness_state as fs  # noqa: E402

D = fs.DEFAULTS


# ---------------------------------------------------------------------------
# derive_staleness — the one formula, exercised at representative signal values
# ---------------------------------------------------------------------------

class TestDeriveStaleness:
    def test_fresh_when_both_signals_within_bounds(self):
        out = fs.derive_staleness(commits=0, days=0.0)
        assert out["label"] == "fresh"
        out = fs.derive_staleness(commits=D["fresh_max_commits"], days=D["fresh_max_days"])
        assert out["label"] == "fresh"

    def test_aging_between_fresh_and_stale(self):
        commits = D["fresh_max_commits"] + 1  # just past fresh
        days = D["fresh_max_days"] + 1
        out = fs.derive_staleness(commits=commits, days=days)
        assert out["label"] == "aging"

    def test_stale_when_commits_over_floor(self):
        out = fs.derive_staleness(commits=D["stale_min_commits"], days=0.0)
        assert out["label"] == "stale"
        assert str(D["stale_min_commits"]) in out["reason"]

    def test_stale_when_days_over_floor(self):
        out = fs.derive_staleness(commits=0, days=float(D["stale_min_days"]))
        assert out["label"] == "stale"

    def test_stale_floor_overrides_otherwise_fresh_signal(self):
        # commits says fresh, days says stale -> stale wins.
        out = fs.derive_staleness(commits=0, days=float(D["stale_min_days"] + 10))
        assert out["label"] == "stale"

    def test_fresh_requires_every_known_signal_fresh(self):
        # commits fresh, days aging -> not fresh.
        out = fs.derive_staleness(commits=0, days=float(D["fresh_max_days"] + 5))
        assert out["label"] == "aging"

    def test_unknown_when_both_signals_missing(self):
        out = fs.derive_staleness(commits=None, days=None)
        assert out["label"] == "unknown"
        assert out["commits"] is None and out["days"] is None

    def test_one_signal_known_still_classifies(self):
        # Only commits known, within fresh bound -> fresh.
        assert fs.derive_staleness(commits=1, days=None)["label"] == "fresh"
        # Only days known, over stale floor -> stale.
        assert fs.derive_staleness(commits=None, days=float(D["stale_min_days"]))["label"] == "stale"

    def test_custom_defaults_override(self):
        tight = dict(D, fresh_max_commits=1, stale_min_commits=2)
        assert fs.derive_staleness(commits=2, days=None, defaults=tight)["label"] == "stale"
        assert fs.derive_staleness(commits=1, days=None, defaults=tight)["label"] == "fresh"

    def test_reason_is_present_and_human(self):
        for out in (
            fs.derive_staleness(0, 0.0),
            fs.derive_staleness(D["stale_min_commits"], 0.0),
            fs.derive_staleness(None, None),
        ):
            assert out["reason"] and isinstance(out["reason"], str)


# ---------------------------------------------------------------------------
# days_since / commits_since — signal helpers degrade to None, not 0
# ---------------------------------------------------------------------------

class TestSignals:
    def test_days_since_none_and_bad_input(self):
        assert fs.days_since(None) is None
        assert fs.days_since("not-a-date") is None

    def test_days_since_recent_is_small(self):
        from datetime import datetime, timezone
        ts = datetime.now(timezone.utc).isoformat()
        assert fs.days_since(ts) < 1.0

    def test_commits_since_no_sha_is_none(self, tmp_project):
        assert fs.commits_since(None, tmp_project) is None

    def test_commits_since_not_a_git_repo_is_none(self, tmp_project):
        # tmp_project has no .git -> unavailable signal, not zero.
        assert fs.commits_since("deadbeef", tmp_project) is None


# ---------------------------------------------------------------------------
# Cleared surfaces — negative invariants
# ---------------------------------------------------------------------------

class TestClearedSurfaces:
    def test_unrecorded_surface_is_not_cleared(self, tmp_project):
        assert fs.is_cleared(tmp_project, "broken-refs", "abc123") is False

    def test_record_then_skip_on_unchanged_signature(self, tmp_project):
        f = tmp_project / "CLAUDE.md"
        f.write_text("hello", encoding="utf-8")
        sig = fs.surface_signature([f])
        fs.record_cleared(tmp_project, "broken-refs", sig)
        # Same signature -> cleared -> skip.
        assert fs.is_cleared(tmp_project, "broken-refs", sig) is True

    def test_recheck_on_changed_signature(self, tmp_project):
        f = tmp_project / "CLAUDE.md"
        f.write_text("hello", encoding="utf-8")
        sig1 = fs.surface_signature([f])
        fs.record_cleared(tmp_project, "broken-refs", sig1)
        # Mutate the file so size/mtime change -> new signature -> not cleared.
        f.write_text("hello world, now longer", encoding="utf-8")
        sig2 = fs.surface_signature([f])
        assert sig2 != sig1
        assert fs.is_cleared(tmp_project, "broken-refs", sig2) is False

    def test_signature_changes_when_file_deleted(self, tmp_project):
        f = tmp_project / "CLAUDE.md"
        f.write_text("hi", encoding="utf-8")
        sig1 = fs.surface_signature([f])
        f.unlink()
        sig2 = fs.surface_signature([f])
        assert sig2 != sig1

    def test_signature_order_independent(self, tmp_project):
        a = tmp_project / "a.md"
        b = tmp_project / "b.md"
        a.write_text("a", encoding="utf-8")
        b.write_text("b", encoding="utf-8")
        assert fs.surface_signature([a, b]) == fs.surface_signature([b, a])

    def test_clear_surface_removes_record(self, tmp_project):
        f = tmp_project / "CLAUDE.md"
        f.write_text("hi", encoding="utf-8")
        sig = fs.surface_signature([f])
        fs.record_cleared(tmp_project, "broken-refs", sig)
        fs.clear_surface(tmp_project, "broken-refs")
        assert fs.is_cleared(tmp_project, "broken-refs", sig) is False

    def test_cleared_record_carries_ts_and_sha(self, tmp_project):
        f = tmp_project / "CLAUDE.md"
        f.write_text("hi", encoding="utf-8")
        sig = fs.surface_signature([f])
        fs.record_cleared(tmp_project, "broken-refs", sig)
        rec = fs.cleared_record(tmp_project, "broken-refs")
        assert rec["signature"] == sig
        assert "ts" in rec  # sha may be None when not a git repo


# ---------------------------------------------------------------------------
# Checkup state — cheap signal only, graceful degrade
# ---------------------------------------------------------------------------

class TestCheckupState:
    def test_no_prior_state_is_unknown(self, tmp_project):
        assert fs.load_checkup_state(tmp_project) == {}
        out = fs.staleness_for(tmp_project)
        assert out["label"] == "unknown"
        assert out["last_sha"] is None

    def test_record_checkup_persists_only_cheap_signal(self, tmp_project):
        rec = fs.record_checkup(tmp_project)
        assert set(rec.keys()) == {"sha", "ts"}  # NO "grade", NO "label", NO "score"
        # Round-trips from disk.
        loaded = fs.load_checkup_state(tmp_project)
        assert loaded["ts"] == rec["ts"]

    def test_state_written_under_dot_hestia(self, tmp_project):
        fs.record_checkup(tmp_project)
        assert (tmp_project / ".hestia" / "checkup-state.json").is_file()

    def test_corrupt_state_degrades_to_empty(self, tmp_project):
        p = tmp_project / ".hestia" / "checkup-state.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("{not json", encoding="utf-8")
        assert fs.load_checkup_state(tmp_project) == {}

    def test_no_grade_ever_stored_on_disk(self, tmp_project):
        fs.record_checkup(tmp_project)
        raw = (tmp_project / ".hestia" / "checkup-state.json").read_text(encoding="utf-8")
        for forbidden in ("grade", "label", "score", "health", "/10"):
            assert forbidden not in raw


# ---------------------------------------------------------------------------
# git-backed path — only when git is available
# ---------------------------------------------------------------------------

def _git_available() -> bool:
    try:
        subprocess.run(["git", "--version"], capture_output=True, timeout=10)
        return True
    except (OSError, subprocess.SubprocessError):
        return False


@pytest.mark.skipif(not _git_available(), reason="git not on PATH")
class TestGitBackedSignals:
    def _init_repo(self, root: Path) -> None:
        run = lambda *a: subprocess.run(["git", *a], cwd=str(root), capture_output=True, text=True)
        run("init")
        run("config", "user.email", "t@t.t")
        run("config", "user.name", "t")
        run("commit", "--allow-empty", "-m", "first")

    def test_commits_since_counts_new_commits(self, tmp_project):
        self._init_repo(tmp_project)
        sha = fs.current_head(tmp_project)
        assert sha
        assert fs.commits_since(sha, tmp_project) == 0
        run = lambda *a: subprocess.run(["git", *a], cwd=str(tmp_project), capture_output=True, text=True)
        run("commit", "--allow-empty", "-m", "second")
        run("commit", "--allow-empty", "-m", "third")
        assert fs.commits_since(sha, tmp_project) == 2

    def test_staleness_fresh_after_recent_checkup(self, tmp_project):
        self._init_repo(tmp_project)
        fs.record_checkup(tmp_project)  # 0 commits, ~0 days -> fresh
        out = fs.staleness_for(tmp_project)
        assert out["label"] == "fresh"
        assert out["last_sha"] == fs.current_head(tmp_project)

    def test_staleness_aging_after_many_commits(self, tmp_project):
        self._init_repo(tmp_project)
        fs.record_checkup(tmp_project)
        run = lambda *a: subprocess.run(["git", *a], cwd=str(tmp_project), capture_output=True, text=True)
        for i in range(D["fresh_max_commits"] + 2):
            run("commit", "--allow-empty", "-m", f"c{i}")
        out = fs.staleness_for(tmp_project)
        assert out["label"] in ("aging", "stale")

    def test_unreachable_sha_degrades_to_none(self, tmp_project):
        self._init_repo(tmp_project)
        # A SHA that isn't in this repo -> rev-list fails -> None (graceful).
        assert fs.commits_since("0" * 40, tmp_project) is None
