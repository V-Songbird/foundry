"""Verify-the-detector discipline (Phase 3 epistemics upgrade).

THE RULE
--------
Every Hestia DETECTOR has a NEGATIVE fixture proving it fires. A detector
tested only on clean input is indistinguishable from a broken one: if it
"passes" by emitting nothing, a silently-broken detector that never fires on
real problems looks exactly the same. (Grounded in iceberg's rule — a detector
you've never seen fire might be silently passing everything.)

So each detector here is exercised as a PAIR:
  * a CLEAN input  -> assert the finding does NOT fire (no false positive), and
  * a KNOWN-BAD input -> assert the finding DOES fire, with the correct
    severity/shape per the Phase-1 finding contract (cited + triple-shape).

Each negative assertion targets the SPECIFIC finding (by tag/artifact/symptom),
not merely "the script ran without error" — so neutering the detector would make
the test fail.

Detectors covered here (those that lacked a paired clean/known-bad firing test):

  checkup.py probes
    - missing CLAUDE.md (near-empty onboarding)        -> test_missing_claude_md_*
    - oversized project CLAUDE.md (> soft max)          -> test_oversized_claude_md_*
    - oversized SKILL.md body (> soft max)              -> test_oversized_skill_*
    - agent with no frontmatter                         -> test_agent_no_frontmatter_*
    - agent frontmatter missing name/description        -> test_agent_missing_description_*
    - broken path references in CLAUDE.md/rules         -> test_checkup_broken_refs_*
    - unparseable settings.json                         -> test_bad_settings_json_*
    - unparseable .mcp.json                             -> test_bad_mcp_json_*

  refs.py (shared broken-reference detector)
    - broken_refs() resolves vs. flags                 -> test_refs_*

  drift.py (freshness / staleness watch)
    - broken-ref staleness scan                         -> test_drift_*

  rules engine (score_mechanical -> score_semi -> compose)
    - low-quality rule scores low + flagged folklore    -> test_weak_rule_*
      (paired with a strong rule that scores high + is not folklore)

Detectors that ALREADY have negative coverage (not duplicated here):
  enforceability.py folklore class .... tests/test_enforceability.py
  freshness_state negative invariants .. tests/test_freshness_state.py
  finding-contract cite/triple-shape ... tests/test_finding_contract.py
  proofreader 13-item checklist ........ tests/proofreader-fixtures/{pass,fail}
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
from conftest import PYTHON, SCRIPTS_DIR, run_script

# Direct import for the in-process refs detector.
sys.path.insert(0, str(SCRIPTS_DIR))
import refs as refs_mod  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _git_project(tmp_path) -> Path:
    """A fresh project root that discover() will accept as a real project."""
    root = tmp_path / "proj"
    root.mkdir()
    (root / ".git").mkdir()
    return root


def _checkup(root: Path) -> dict:
    return run_script("checkup.py", args=["--project-root", str(root)])


def _findings_with_tag(out: dict, tag: str) -> list[dict]:
    return [f for f in out["findings"] if tag in (f.get("tags") or [])]


def _findings_for_artifact(out: dict, artifact: str) -> list[dict]:
    return [f for f in out["findings"] if f.get("artifact") == artifact]


def _assert_contract(f: dict) -> None:
    """Phase-1 finding contract: cited (has a locator) + triple-shape."""
    assert f.get("file"), f"cite-or-drop: finding has no file locator: {f}"
    assert f.get("location"), f"cite-or-drop: finding has no location: {f}"
    assert f.get("advisory") is False, f"detector finding must not be advisory: {f}"
    assert f.get("symptom"), f"triple-shape: missing symptom: {f}"
    assert f.get("why"), f"triple-shape: missing why: {f}"
    assert f.get("fix_action"), f"triple-shape: missing fix_action: {f}"


# ---------------------------------------------------------------------------
# checkup probe: missing CLAUDE.md (near-empty onboarding)
# ---------------------------------------------------------------------------

class TestMissingClaudeMd:
    def test_missing_claude_md_fires(self, tmp_path):
        """A project with no CLAUDE.md must produce the high-severity finding."""
        root = _git_project(tmp_path)  # nothing else: no CLAUDE.md at all
        out = _checkup(root)
        cm = _findings_for_artifact(out, "claude-md")
        missing = [f for f in cm if "No CLAUDE.md" in f["symptom"]]
        assert missing, f"missing-CLAUDE.md detector did not fire: {out['findings']}"
        f = missing[0]
        assert f["severity"] == "high"
        assert out["near_empty"] is True
        _assert_contract(f)

    def test_present_claude_md_does_not_fire(self, tmp_path):
        """A project WITH a CLAUDE.md must NOT raise the missing finding."""
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n\nRun the tests.\n", encoding="utf-8")
        out = _checkup(root)
        missing = [f for f in out["findings"] if "No CLAUDE.md" in f["symptom"]]
        assert missing == [], f"false positive: {missing}"


# ---------------------------------------------------------------------------
# checkup probe: oversized project CLAUDE.md
# ---------------------------------------------------------------------------

class TestOversizedClaudeMd:
    def test_oversized_claude_md_fires(self, tmp_path):
        root = _git_project(tmp_path)
        big = "# Proj\n" + "\n".join(f"line {i}" for i in range(260))
        (root / "CLAUDE.md").write_text(big, encoding="utf-8")
        out = _checkup(root)
        size = [f for f in _findings_for_artifact(out, "claude-md")
                if "size" in (f.get("tags") or [])]
        assert size, f"oversized-CLAUDE.md detector did not fire: {out['findings']}"
        f = size[0]
        assert f["severity"] == "medium"
        assert "long" in f["symptom"]
        _assert_contract(f)

    def test_small_claude_md_does_not_fire(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n\nRun the tests.\n", encoding="utf-8")
        out = _checkup(root)
        size = [f for f in _findings_for_artifact(out, "claude-md")
                if "size" in (f.get("tags") or [])]
        assert size == [], f"false positive: {size}"


# ---------------------------------------------------------------------------
# checkup probe: oversized SKILL.md body
# ---------------------------------------------------------------------------

class TestOversizedSkill:
    def _skill(self, root: Path, body_lines: int) -> None:
        skdir = root / ".claude" / "skills" / "demo"
        skdir.mkdir(parents=True)
        body = "---\nname: demo\ndescription: a demo skill\n---\n" + \
               "\n".join(f"step {i}" for i in range(body_lines))
        (skdir / "SKILL.md").write_text(body, encoding="utf-8")

    def test_oversized_skill_fires(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")  # avoid near-empty
        self._skill(root, 560)
        out = _checkup(root)
        size = [f for f in _findings_for_artifact(out, "skill")
                if "size" in (f.get("tags") or [])]
        assert size, f"oversized-SKILL.md detector did not fire: {out['findings']}"
        f = size[0]
        assert f["severity"] == "medium"
        _assert_contract(f)

    def test_small_skill_does_not_fire(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")
        self._skill(root, 20)
        out = _checkup(root)
        size = [f for f in _findings_for_artifact(out, "skill")
                if "size" in (f.get("tags") or [])]
        assert size == [], f"false positive: {size}"


# ---------------------------------------------------------------------------
# checkup probe: agent without frontmatter
# ---------------------------------------------------------------------------

class TestAgentNoFrontmatter:
    def _agent(self, root: Path, text: str) -> None:
        ag = root / ".claude" / "agents"
        ag.mkdir(parents=True, exist_ok=True)
        (ag / "demo.md").write_text(text, encoding="utf-8")

    def test_agent_no_frontmatter_fires(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")
        self._agent(root, "just prose, no YAML frontmatter at all\n")
        out = _checkup(root)
        hits = [f for f in _findings_for_artifact(out, "agent")
                if f["symptom"] == "Agent has no frontmatter"]
        assert hits, f"no-frontmatter detector did not fire: {out['findings']}"
        f = hits[0]
        assert f["severity"] == "high"
        assert "frontmatter" in (f.get("tags") or [])
        _assert_contract(f)

    def test_agent_with_frontmatter_does_not_fire(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")
        self._agent(root, "---\nname: demo\ndescription: a demo agent\n---\nbody\n")
        out = _checkup(root)
        hits = [f for f in _findings_for_artifact(out, "agent")
                if f["symptom"] == "Agent has no frontmatter"]
        assert hits == [], f"false positive: {hits}"


# ---------------------------------------------------------------------------
# checkup probe: agent frontmatter missing name/description
# ---------------------------------------------------------------------------

class TestAgentMissingDescription:
    def _agent(self, root: Path, fm: str) -> None:
        ag = root / ".claude" / "agents"
        ag.mkdir(parents=True, exist_ok=True)
        (ag / "demo.md").write_text(fm, encoding="utf-8")

    def test_agent_missing_description_fires(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")
        # Has frontmatter and a name, but no description.
        self._agent(root, "---\nname: demo\n---\nbody\n")
        out = _checkup(root)
        hits = [f for f in _findings_for_artifact(out, "agent")
                if "missing" in f["symptom"] and "description" in f["symptom"]]
        assert hits, f"missing-description detector did not fire: {out['findings']}"
        f = hits[0]
        assert f["severity"] == "medium"
        _assert_contract(f)

    def test_agent_complete_frontmatter_does_not_fire(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")
        self._agent(root, "---\nname: demo\ndescription: a complete agent\n---\nbody\n")
        out = _checkup(root)
        hits = [f for f in _findings_for_artifact(out, "agent")
                if "missing" in f["symptom"]]
        assert hits == [], f"false positive: {hits}"


# ---------------------------------------------------------------------------
# checkup probe + shared refs.py: broken path references
# ---------------------------------------------------------------------------

class TestCheckupBrokenRefs:
    def test_checkup_broken_refs_fires(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text(
            "# Proj\n\nSee `./docs/gone.md` for the build steps.\n", encoding="utf-8"
        )
        out = _checkup(root)
        stale = _findings_with_tag(out, "stale")
        assert stale, f"broken-ref detector did not fire: {out['findings']}"
        f = stale[0]
        assert f["severity"] == "high"
        assert f["artifact"] == "reference"
        assert "missing files" in f["symptom"]
        _assert_contract(f)

    def test_checkup_resolvable_refs_do_not_fire(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "real.md").write_text("here\n", encoding="utf-8")
        (root / "CLAUDE.md").write_text(
            "# Proj\n\nSee `./real.md` for details.\n", encoding="utf-8"
        )
        out = _checkup(root)
        stale = _findings_with_tag(out, "stale")
        assert stale == [], f"false positive: {stale}"


class TestRefsDetector:
    """The shared broken-reference primitive (refs.broken_refs)."""

    def test_refs_flags_a_missing_path(self, tmp_path):
        root = tmp_path
        f = root / "CLAUDE.md"
        f.write_text("Read `./missing/file.md` first.\n", encoding="utf-8")
        broken = refs_mod.broken_refs(f, root)
        assert "./missing/file.md" in broken, broken

    def test_refs_does_not_flag_an_existing_path(self, tmp_path):
        root = tmp_path
        (root / "exists.md").write_text("x", encoding="utf-8")
        f = root / "CLAUDE.md"
        f.write_text("Read `./exists.md` first.\n", encoding="utf-8")
        assert refs_mod.broken_refs(f, root) == []

    def test_refs_flags_broken_at_import(self, tmp_path):
        root = tmp_path
        f = root / "CLAUDE.md"
        f.write_text("@./shared/conventions.md\n", encoding="utf-8")
        broken = refs_mod.broken_refs(f, root)
        assert any(b.startswith("@") for b in broken), broken


# ---------------------------------------------------------------------------
# checkup probe: unparseable settings.json
# ---------------------------------------------------------------------------

class TestBadSettingsJson:
    def test_bad_settings_json_fires(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")
        cc = root / ".claude"
        cc.mkdir(exist_ok=True)
        (cc / "settings.json").write_text("{ not valid json", encoding="utf-8")
        out = _checkup(root)
        hits = [f for f in _findings_for_artifact(out, "hook")
                if "parse" in (f.get("tags") or [])]
        assert hits, f"bad-settings-json detector did not fire: {out['findings']}"
        f = hits[0]
        assert f["severity"] == "medium"
        assert "not valid JSON" in f["symptom"]
        _assert_contract(f)

    def test_valid_settings_json_does_not_fire(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")
        cc = root / ".claude"
        cc.mkdir(exist_ok=True)
        (cc / "settings.json").write_text('{"hooks": {}}', encoding="utf-8")
        out = _checkup(root)
        hits = [f for f in _findings_for_artifact(out, "hook")
                if "parse" in (f.get("tags") or [])]
        assert hits == [], f"false positive: {hits}"


# ---------------------------------------------------------------------------
# checkup probe: unparseable .mcp.json
# ---------------------------------------------------------------------------

class TestBadMcpJson:
    def test_bad_mcp_json_fires(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")
        (root / ".mcp.json").write_text("{ not json", encoding="utf-8")
        out = _checkup(root)
        hits = [f for f in _findings_for_artifact(out, "mcp")
                if "parse" in (f.get("tags") or [])]
        assert hits, f"bad-mcp-json detector did not fire: {out['findings']}"
        f = hits[0]
        assert f["severity"] == "medium"
        assert ".mcp.json is not valid JSON" in f["symptom"]
        _assert_contract(f)

    def test_valid_mcp_json_does_not_fire(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text("# Proj\n", encoding="utf-8")
        (root / ".mcp.json").write_text('{"mcpServers": {}}', encoding="utf-8")
        out = _checkup(root)
        hits = [f for f in _findings_for_artifact(out, "mcp")
                if "parse" in (f.get("tags") or [])]
        assert hits == [], f"false positive: {hits}"


# ---------------------------------------------------------------------------
# drift.py: broken-reference staleness scan
# ---------------------------------------------------------------------------

class TestDriftStaleness:
    def test_drift_fires_on_broken_ref(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "CLAUDE.md").write_text(
            "# Proj\n\nFollow `./docs/setup.md`.\n", encoding="utf-8"
        )
        out = run_script("drift.py", args=["--project-root", str(root)])
        assert out["stale_files"], f"drift detector did not fire: {out}"
        assert out["total_broken"] >= 1
        entry = out["stale_files"][0]
        assert entry["path"] == "CLAUDE.md"
        assert "./docs/setup.md" in entry["broken"]
        # A firing scan produces a non-empty change signature.
        assert out["signature"]

    def test_drift_clean_on_resolvable_refs(self, tmp_path):
        root = _git_project(tmp_path)
        (root / "setup.md").write_text("steps\n", encoding="utf-8")
        (root / "CLAUDE.md").write_text(
            "# Proj\n\nFollow `./setup.md`.\n", encoding="utf-8"
        )
        out = run_script("drift.py", args=["--project-root", str(root)])
        assert out["stale_files"] == []
        assert out["total_broken"] == 0
        # Clean result is stated explicitly, never silenced.
        details = " ".join(n.get("detail", "") for n in out["limits"]).lower()
        assert "no stale references found" in details


# ---------------------------------------------------------------------------
# rules engine low-quality path: a weak rule must score low + flag folklore
# ---------------------------------------------------------------------------

def _score_chain(rule_text: str) -> dict:
    """Run a single rule through score_mechanical -> score_semi -> compose and
    return the scored rule + the compose-level enforceability outputs.

    score_semi.py is the no-op-friendly middle stage in hestia's pipeline; it is
    included so the negative test exercises the real chain, not a shortcut."""
    payload = {
        "schema_version": "0.1",
        "pipeline_version": "0.1.0",
        "project_context": {"stack": []},
        "config": {},
        "source_files": [{
            "path": "CLAUDE.md", "globs": [], "glob_match_count": None,
            "default_category": "mandate", "line_count": 10, "always_loaded": True,
        }],
        "rules": [{
            "id": "R1", "file_index": 0, "text": rule_text,
            "line_start": 3, "line_end": 3, "category": "mandate",
            "referenced_entities": [],
            "staleness": {"gated": False, "missing_entities": []},
            "factors": {},
        }],
    }
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    data = json.dumps(payload, ensure_ascii=False)
    for script in ("score_mechanical.py", "score_semi.py", "compose.py"):
        proc = subprocess.run(
            [PYTHON, str(SCRIPTS_DIR / script)],
            input=data, capture_output=True, text=True,
            timeout=60, encoding="utf-8", env=env,
        )
        assert proc.returncode == 0, f"{script} failed: {proc.stderr}"
        data = proc.stdout
    out = json.loads(data)
    return out


# A deliberately weak rule: vague verb ("Try to"), abstract quality words
# ("clean", "maintainable"), no concrete construct/command/threshold.
WEAK_RULE = "Try to keep things clean and maintainable."
# A strong, enforceable counterpart: bare imperative + runnable command + threshold.
STRONG_RULE = "ALWAYS run `npm test` before committing; coverage must be >= 80%."


class TestRulesEngineLowQualityPath:
    def test_weak_rule_scores_low_and_is_flagged(self, tmp_path):
        out = _score_chain(WEAK_RULE)
        rule = out["rules"][0]
        # The scoring DETECTOR must surface this as a low-quality rule.
        assert rule["score"] < 0.50, f"weak rule should score low: {rule['score']}"
        assert rule["grade"] in ("D", "F"), rule["grade"]
        assert rule["dominant_weakness"] is not None, \
            "a weak rule must name a dominant weakness to drive a rewrite"
        # The folklore path must also fire and emit a cited triple-shape finding.
        assert rule["enforceability"]["class"] == "folklore", rule["enforceability"]
        assert out["enforceability_counts"]["folklore"] == 1
        assert len(out["folklore_findings"]) == 1
        ff = out["folklore_findings"][0]
        # Phase-1 contract on the emitted folklore finding.
        assert ff["file"] == "CLAUDE.md"
        assert ff["location"] == "CLAUDE.md:3"
        assert ff["advisory"] is False
        assert ff["symptom"] and ff["why"] and ff["fix_action"]
        assert "folklore" in ff["tags"]

    def test_strong_rule_scores_high_and_is_not_flagged(self, tmp_path):
        out = _score_chain(STRONG_RULE)
        rule = out["rules"][0]
        # The clean counterpart must NOT trip the low-quality / folklore detector.
        assert rule["score"] >= 0.75, f"strong rule should score high: {rule['score']}"
        assert rule["grade"] in ("A", "B"), rule["grade"]
        assert rule["enforceability"]["class"] == "enforceable", rule["enforceability"]
        assert out["enforceability_counts"]["folklore"] == 0
        assert out["folklore_findings"] == []

    def test_weak_and_strong_are_actually_distinguished(self, tmp_path):
        """The detector's value is the SPREAD: a neutered scorer that returned a
        constant would fail this. The weak rule must score materially lower."""
        weak = _score_chain(WEAK_RULE)["rules"][0]["score"]
        strong = _score_chain(STRONG_RULE)["rules"][0]["score"]
        assert strong - weak > 0.30, (weak, strong)
