"""Orchestrator for Hestia's rules-audit pipeline.

Modes:
  --prepare [--project-root PATH]    extract -> score_mechanical -> score_semi -> build_prompt
  --finalize [--verbose] [--json]    merge_batch_patches -> apply_patches -> compose -> report
  --prepare-fix                      select qualifying rules for rewrite
  --score-rewrites                   score rewrites mechanically -> build_prompt
  --finalize-fix [--verbose] [--json]  parse rewrite judgments -> finalize -> report
  --score-draft <draft.json>         score draft rules
  --finalize-draft                   compose draft scores after F3/F8 judgment
  --prepare-placement                run placement detectors
  --write-promotions [--project-root P]  write .hestia/PROMOTIONS.md + remove moved rules
  --cleanup                          remove .hestia-tmp/
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Force UTF-8 on all stdio on Windows.
if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent))
import _lib

SCRIPTS_DIR = Path(__file__).parent
PYTHON = sys.executable
TMP_DIR = ".hestia-tmp"
STATE_DIR = ".hestia"
BATCH_THRESHOLD = 20

_FRIENDLY_FIXES = {
    "F1": "Start with a clear action verb: Use, Always, Never, Run",
    "F2": "Flip from 'don't do X' to 'do Y instead'",
    "F3": "Add a trigger: 'When editing X...' or 'Before committing...'",
    "F4": "Move to a scoped rule file with paths: frontmatter, or broaden the language",
    "F7": "Add a file path, code example, or before/after comparison",
}

_LETTER_GRADES = [(0.80, "A"), (0.65, "B"), (0.50, "C"), (0.35, "D")]

_FRIENDLY_STRENGTHS = {
    "F1": "Strong action verb",
    "F2": "Clear positive framing",
    "F3": "Specific trigger context",
    "F4": "Well-scoped to the right files",
    "F7": "Concrete examples or file paths",
}

_FRIENDLY_PROBLEMS = {
    "F1": "Weak verb",
    "F2": "Phrased as a prohibition",
    "F3": "Unclear trigger",
    "F4": "Loaded in the wrong context",
    "F7": "Too vague",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _subprocess_env() -> dict:
    """Return env dict with PYTHONIOENCODING=utf-8 for subprocess calls."""
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    return env


def _run_subprocess(cmd: list[str], stdin_data: str | None = None,
                    timeout: int = 120) -> subprocess.CompletedProcess:
    """Run a subprocess with error checking. Exits on failure."""
    result = subprocess.run(
        cmd,
        input=stdin_data,
        capture_output=True,
        text=True,
        encoding='utf-8',
        env=_subprocess_env(),
        timeout=timeout,
    )
    if result.returncode != 0:
        script_name = Path(cmd[1]).name if len(cmd) > 1 else cmd[0]
        print(f"{script_name} failed (exit {result.returncode}): {result.stderr}",
              file=sys.stderr)
        sys.exit(1)
    return result


def _run_pipeline(project_root: str) -> str:
    """Run the 3-stage scoring pipeline via Popen chain.

    extract.py -> score_mechanical.py -> score_semi.py

    Returns the raw stdout JSON string from score_semi.py.
    """
    env = _subprocess_env()
    common = dict(stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                  text=True, encoding='utf-8', env=env)

    p1 = subprocess.Popen(
        [PYTHON, str(SCRIPTS_DIR / "extract.py"), "--project-root", project_root],
        stdin=subprocess.DEVNULL, **common)
    p2 = subprocess.Popen(
        [PYTHON, str(SCRIPTS_DIR / "score_mechanical.py")],
        stdin=p1.stdout, **common)
    p1.stdout.close()
    p3 = subprocess.Popen(
        [PYTHON, str(SCRIPTS_DIR / "score_semi.py")],
        stdin=p2.stdout, **common)
    p2.stdout.close()

    stdout, stderr3 = p3.communicate(timeout=120)

    p2.wait()
    p1.wait()

    for name, proc, stderr_val in [
        ("extract.py", p1, None),
        ("score_mechanical.py", p2, None),
        ("score_semi.py", p3, stderr3),
    ]:
        if proc.returncode != 0:
            err = stderr_val if stderr_val is not None else proc.stderr.read()
            print(f"{name} failed (exit {proc.returncode}): {err}",
                  file=sys.stderr)
            sys.exit(1)

    return stdout


def _read_tmp_json(filename: str) -> dict | list:
    """Read a JSON file from the temp directory."""
    path = Path(TMP_DIR) / filename
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def _write_tmp_json(filename: str, data: dict | list) -> None:
    """Write a JSON file to the temp directory."""
    path = Path(TMP_DIR) / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _flatten_judgments(input_path: str, flat_output_path: str) -> str:
    """Flatten batched judgment format to a flat array for parse_judgment.py.

    If input is already a flat array, returns input_path unchanged.
    If input is batched ({"batches": [...]}), flattens batches[*].judgments.
    """
    with open(input_path, encoding='utf-8') as f:
        data = json.load(f)

    if isinstance(data, list):
        return input_path

    if isinstance(data, dict) and "batches" in data:
        flat = []
        for batch in data["batches"]:
            flat.extend(batch.get("judgments", []))
        with open(flat_output_path, 'w', encoding='utf-8') as f:
            json.dump(flat, f, indent=2, ensure_ascii=False)
        return flat_output_path

    return input_path


def _apply_patches(scored: dict, patches_data: dict) -> dict:
    """Apply judgment patches (F3/F8 factors) from patches_data into scored rules."""
    patches = patches_data.get("patches", {})
    for rule in scored.get("rules", []):
        rule_id = rule.get("id")
        if rule_id not in patches:
            continue
        patch = patches[rule_id]
        for factor_name, factor_data in patch.items():
            if factor_name.endswith("_patch"):
                base_name = factor_name.replace("_patch", "")
                if base_name in rule.get("factors", {}):
                    if isinstance(factor_data, dict) and "value" in factor_data:
                        rule["factors"][base_name]["value"] = factor_data["value"]
                        rule["factors"][base_name]["method"] = "judgment_patch"
            elif factor_name in ("F3", "F8"):
                if "factors" not in rule:
                    rule["factors"] = {}
                rule["factors"][factor_name] = factor_data
    return scored


def _run_scoring_pipe(input_json: str) -> str:
    """Run score_mechanical.py -> score_semi.py with JSON string input."""
    result1 = _run_subprocess(
        [PYTHON, str(SCRIPTS_DIR / "score_mechanical.py")],
        stdin_data=input_json,
    )
    result2 = _run_subprocess(
        [PYTHON, str(SCRIPTS_DIR / "score_semi.py")],
        stdin_data=result1.stdout,
    )
    return result2.stdout


def _run_compose_and_save(scored_with_patches: dict, audit_filename: str) -> None:
    """Pipe scored data through compose.py and save output to tmp audit file."""
    input_json = json.dumps(scored_with_patches, ensure_ascii=False)
    result = _run_subprocess(
        [PYTHON, str(SCRIPTS_DIR / "compose.py")],
        stdin_data=input_json,
    )
    _write_tmp_json(audit_filename, json.loads(result.stdout))


def _run_report(audit_filename: str, verbose: bool, use_json: bool) -> None:
    """Run report.py on an audit file and write its output to stdout."""
    audit_path = str(Path(TMP_DIR) / audit_filename)
    report_cmd = [PYTHON, str(SCRIPTS_DIR / "report.py"), "--input", audit_path]
    if verbose:
        report_cmd.append("--verbose")
    if use_json:
        report_cmd.append("--json")

    result = subprocess.run(
        report_cmd,
        capture_output=True, text=True, encoding='utf-8',
        env=_subprocess_env(), timeout=60,
    )
    if result.returncode != 0:
        print(f"report.py failed (exit {result.returncode}): {result.stderr}",
              file=sys.stderr)
        sys.exit(1)

    sys.stdout.write(result.stdout)


def _letter_grade(score: float) -> str:
    """Map a 0.0-1.0 quality score to a letter grade."""
    for threshold, grade in _LETTER_GRADES:
        if score >= threshold:
            return grade
    return "F"


def _friendly_summary(rule: dict) -> str:
    """Build a friendly 1-line summary from the rule's factors."""
    dw = rule.get("dominant_weakness")
    if dw:
        return _FRIENDLY_PROBLEMS.get(dw, "Review and improve")

    factors = rule.get("factors", {})
    scored = []
    for fn in ("F1", "F2", "F3", "F4", "F7"):
        fdata = factors.get(fn, {})
        val = fdata.get("value")
        if val is not None:
            scored.append((val, fn))
    scored.sort(reverse=True)
    top = [_FRIENDLY_STRENGTHS[fn] for _, fn in scored[:3]
           if fn in _FRIENDLY_STRENGTHS]
    return ", ".join(top) if top else "Well-structured rule"


# ---------------------------------------------------------------------------
# Mode implementations
# ---------------------------------------------------------------------------

def cmd_prepare(project_root: str) -> None:
    """--prepare: extract -> score_mechanical -> score_semi -> build_prompt."""
    tmp = Path(TMP_DIR)
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    (tmp / ".gitignore").write_text("*\n", encoding="utf-8")

    stdout = _run_pipeline(project_root)
    scored = json.loads(stdout)
    _write_tmp_json("scored_semi.json", scored)

    rule_count = len(scored.get("rules", []))
    batch_mode = rule_count > BATCH_THRESHOLD

    scored_path = str(tmp / "scored_semi.json")

    if batch_mode:
        batch_dir = str(tmp / "batches")
        _run_subprocess([
            PYTHON, str(SCRIPTS_DIR / "build_prompt.py"),
            "--batch-dir", batch_dir,
            "--input", scored_path,
        ])
        manifest = _read_tmp_json("batches/batch_manifest.json")
        metadata = {
            "rule_count": rule_count,
            "batch_count": manifest["batch_count"],
            "batch_mode": True,
            "prompt_files": [
                str(tmp / "batches" / b["file"])
                for b in manifest["batches"]
            ],
            "single_prompt": None,
            "manifest": str(tmp / "batches" / "batch_manifest.json"),
        }
    else:
        prompt_path = str(tmp / "prompt.md")
        _run_subprocess([
            PYTHON, str(SCRIPTS_DIR / "build_prompt.py"),
            "--input", scored_path,
            "--output", prompt_path,
        ])
        metadata = {
            "rule_count": rule_count,
            "batch_count": 0,
            "batch_mode": False,
            "prompt_files": [],
            "single_prompt": prompt_path,
            "manifest": None,
        }

    _lib.emit(metadata)


def cmd_finalize(verbose: bool = False, use_json: bool = False) -> None:
    """--finalize: apply patches -> compose -> report."""
    tmp = Path(TMP_DIR)
    scored_path = str(tmp / "scored_semi.json")
    judgments_path = str(tmp / "all_judgments.json")
    flat_path = str(tmp / "_flat_judgments.json")
    patches_path = str(tmp / "judgment_patches.json")

    # Flatten batched judgments if needed
    effective_input = _flatten_judgments(judgments_path, flat_path)

    # parse_judgment.py -> patches
    _run_subprocess([
        PYTHON, str(SCRIPTS_DIR / "parse_judgment.py"),
        scored_path,
        "--input", effective_input,
        "--output", patches_path,
    ])

    # Apply patches to scored_semi and feed through compose
    scored = _read_tmp_json("scored_semi.json")
    patches_data = _read_tmp_json("judgment_patches.json")
    scored_patched = _apply_patches(scored, patches_data)
    _run_compose_and_save(scored_patched, "rules-audit.json")

    _run_report("rules-audit.json", verbose, use_json)


def cmd_prepare_fix() -> None:
    """--prepare-fix: select qualifying rules from rules-audit.json."""
    audit = _read_tmp_json("rules-audit.json")
    rules = audit.get("rules", [])
    files = audit.get("files", [])

    qualifying = []
    for r in rules:
        if r.get("category") != "mandate":
            continue
        if r.get("score", 1.0) >= 0.50:
            continue

        file_path = r.get("file", "")
        if not file_path:
            fi = r.get("file_index", 0)
            if fi < len(files):
                file_path = files[fi].get("path", "")

        dw = r.get("dominant_weakness")
        qualifying.append({
            "rule_id": r["id"],
            "file": file_path,
            "line_start": r.get("line_start", 0),
            "text": r.get("text", ""),
            "score": r.get("score", 0),
            "dominant_weakness": dw,
            "action": _FRIENDLY_FIXES.get(dw, "Review and improve"),
        })

    output = {
        "qualifying_count": len(qualifying),
        "rules": qualifying,
    }
    _lib.emit(output)


def cmd_score_rewrites() -> None:
    """--score-rewrites: mechanical scoring + build_prompt for rewrites."""
    tmp = Path(TMP_DIR)
    audit_path = str(tmp / "rules-audit.json")
    rewrites_path = str(tmp / "rewrites_input.json")
    rewrite_semi_path = str(tmp / "rewrite_semi.json")

    _run_subprocess([
        PYTHON, str(SCRIPTS_DIR / "rewrite_scorer.py"),
        "--score-rewrites", audit_path, rewrites_path,
        "--output", rewrite_semi_path,
    ])

    rewrite_semi = _read_tmp_json("rewrite_semi.json")
    rule_count = len(rewrite_semi.get("rules", []))
    batch_mode = rule_count > BATCH_THRESHOLD

    if batch_mode:
        batch_dir = str(tmp / "rewrite_batches")
        _run_subprocess([
            PYTHON, str(SCRIPTS_DIR / "build_prompt.py"),
            "--batch-dir", batch_dir,
            "--input", rewrite_semi_path,
        ])
        manifest = _read_tmp_json("rewrite_batches/batch_manifest.json")
        metadata = {
            "rule_count": rule_count,
            "batch_count": manifest["batch_count"],
            "batch_mode": True,
            "prompt_files": [
                str(tmp / "rewrite_batches" / b["file"])
                for b in manifest["batches"]
            ],
            "single_prompt": None,
            "manifest": str(tmp / "rewrite_batches" / "batch_manifest.json"),
        }
    else:
        prompt_path = str(tmp / "rewrite_prompt.md")
        _run_subprocess([
            PYTHON, str(SCRIPTS_DIR / "build_prompt.py"),
            "--input", rewrite_semi_path,
            "--output", prompt_path,
        ])
        metadata = {
            "rule_count": rule_count,
            "batch_count": 0,
            "batch_mode": False,
            "prompt_files": [],
            "single_prompt": prompt_path,
            "manifest": None,
        }

    _lib.emit(metadata)


def cmd_finalize_fix(verbose: bool = False, use_json: bool = False) -> None:
    """--finalize-fix: parse rewrite judgments -> finalize -> inject -> report."""
    tmp = Path(TMP_DIR)
    rewrite_semi_path = str(tmp / "rewrite_semi.json")
    judgments_path = str(tmp / "rewrite_judgments.json")
    flat_path = str(tmp / "_flat_rewrite_judgments.json")
    patches_path = str(tmp / "rewrite_patches.json")
    audit_path = str(tmp / "rules-audit.json")
    rewrites_path = str(tmp / "rewrites.json")

    effective_input = _flatten_judgments(judgments_path, flat_path)

    _run_subprocess([
        PYTHON, str(SCRIPTS_DIR / "parse_judgment.py"),
        rewrite_semi_path,
        "--input", effective_input,
        "--output", patches_path,
    ])

    _run_subprocess([
        PYTHON, str(SCRIPTS_DIR / "rewrite_scorer.py"),
        "--finalize", rewrite_semi_path, patches_path, audit_path,
        "--output", rewrites_path,
    ])

    audit = _read_tmp_json("rules-audit.json")
    rewrites = _read_tmp_json("rewrites.json")
    audit["rewrites"] = rewrites
    _write_tmp_json("rules-audit.json", audit)

    _run_report("rules-audit.json", verbose, use_json)


def cmd_score_draft(draft_path: str) -> None:
    """--score-draft: mechanically score draft rules for the build skill."""
    with open(draft_path, encoding="utf-8") as f:
        draft = json.load(f)

    rules = draft["rules"]
    target_file = draft.get("file", ".claude/rules/draft.md")
    category = draft.get("category", "mandate")

    import extract as _extract
    fragmenting = []
    for r in rules:
        fragments = _extract.would_fragment(r["text"])
        if len(fragments) > 1:
            fragmenting.append({
                "id": r["id"],
                "text": r["text"],
                "fragment_count": len(fragments),
                "fragments_preview": [f[:120] for f in fragments],
                "reason": (
                    "Rule contains a splitter pattern (`, and` / ` and ` "
                    "between independent imperatives, `;` outside a code "
                    "span, or ` — ` followed by a clause with its own "
                    "verb). On the next audit pass extract.py would "
                    "fragment it into multiple rules that each score F. "
                    "Revise to use `or`, drop semicolons, or collapse to "
                    "a single directive."
                ),
            })

    if fragmenting:
        tmp = Path(TMP_DIR)
        tmp.mkdir(parents=True, exist_ok=True)
        if not (tmp / ".gitignore").exists():
            (tmp / ".gitignore").write_text("*\n", encoding="utf-8")
        _lib.emit({
            "status": "needs_revision",
            "fragmenting_rules": fragmenting,
        })
        return

    source_files = [{
        "path": target_file,
        "globs": [],
        "glob_match_count": None,
        "default_category": category,
        "line_count": len(rules) + 5,
        "always_loaded": True,
    }]

    pipeline_rules = []
    for i, r in enumerate(rules):
        pipeline_rules.append({
            "id": r["id"],
            "file_index": 0,
            "text": r["text"],
            "line_start": 5 + i,
            "line_end": 5 + i,
            "category": category,
            "referenced_entities": [],
            "staleness": {"gated": False, "missing_entities": []},
            "factors": {},
        })

    pipeline_input = {
        "schema_version": "0.1",
        "pipeline_version": "0.1.0",
        "project_context": {"stack": []},
        "config": {},
        "source_files": source_files,
        "rules": pipeline_rules,
    }

    tmp = Path(TMP_DIR)
    tmp.mkdir(parents=True, exist_ok=True)
    if not (tmp / ".gitignore").exists():
        (tmp / ".gitignore").write_text("*\n", encoding="utf-8")

    input_json = json.dumps(pipeline_input, ensure_ascii=False)
    scored_raw = _run_scoring_pipe(input_json)
    scored = json.loads(scored_raw)
    _write_tmp_json("draft_scored_semi.json", scored)

    scored_path = str(tmp / "draft_scored_semi.json")
    prompt_path = str(tmp / "draft_prompt.md")
    _run_subprocess([
        PYTHON, str(SCRIPTS_DIR / "build_prompt.py"),
        "--input", scored_path,
        "--output", prompt_path,
    ])

    output_rules = []
    for rule in scored.get("rules", []):
        output_rules.append({
            "id": rule["id"],
            "text": rule["text"],
            "factors": rule.get("factors", {}),
            "needs_judgment": True,
        })

    _lib.emit({
        "status": "ok",
        "rules": output_rules,
        "judgment_prompt": str(tmp / "draft_prompt.md"),
    })


def cmd_finalize_draft() -> None:
    """--finalize-draft: compose draft scores after F3/F8 judgment."""
    tmp = Path(TMP_DIR)
    scored_path = str(tmp / "draft_scored_semi.json")
    judgments_path = str(tmp / "draft_judgments.json")
    flat_path = str(tmp / "_draft_flat_judgments.json")
    patches_path = str(tmp / "draft_patches.json")

    effective_input = _flatten_judgments(judgments_path, flat_path)

    _run_subprocess([
        PYTHON, str(SCRIPTS_DIR / "parse_judgment.py"),
        scored_path,
        "--input", effective_input,
        "--output", patches_path,
    ])

    scored = _read_tmp_json("draft_scored_semi.json")
    patches_data = _read_tmp_json("draft_patches.json")
    scored_patched = _apply_patches(scored, patches_data)
    _run_compose_and_save(scored_patched, "draft_audit.json")

    audit = _read_tmp_json("draft_audit.json")
    weights = _lib.load_data("weights")
    category_floors = weights["category_floors"]

    output_rules = []
    for rule in audit.get("rules", []):
        score = rule.get("score", 0)
        cat = rule.get("category", "mandate")
        floor = category_floors.get(cat, 0.50)
        grade = _letter_grade(score)
        passed = score >= floor

        output_rules.append({
            "id": rule["id"],
            "text": rule.get("text", ""),
            "score": round(score, 2),
            "grade": grade,
            "dominant_weakness": rule.get("dominant_weakness"),
            "pass": passed,
            "friendly_summary": _friendly_summary(rule),
        })

    all_pass = all(r["pass"] for r in output_rules)

    _lib.emit({
        "rules": output_rules,
        "all_pass": all_pass,
        "floor": category_floors.get("mandate", 0.50),
    })


def cmd_prepare_placement() -> None:
    """--prepare-placement: run placement detectors on rules-audit.json."""
    import placement
    audit = _read_tmp_json("rules-audit.json")
    report = placement.analyze_corpus(audit)
    _lib.emit(report)


def cmd_write_promotions(project_root: str) -> None:
    """--write-promotions: write .hestia/PROMOTIONS.md + atomically remove moved rules."""
    import placement
    payload = _lib.read_stdin_json()
    result = placement.write_promotions(
        payload,
        Path(project_root).resolve(),
        state_dir=STATE_DIR,
    )
    _lib.emit(result)
    if result["status"] != "ok":
        sys.exit(1)


def cmd_cleanup() -> None:
    """--cleanup: remove .hestia-tmp/."""
    tmp = Path(TMP_DIR)
    if tmp.exists():
        shutil.rmtree(tmp)


# ---------------------------------------------------------------------------
# Argument parsing and dispatch
# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: run_audit.py <mode> [options]", file=sys.stderr)
        print("Modes: --prepare, --finalize, --prepare-fix, --score-rewrites, "
              "--finalize-fix, --score-draft, --finalize-draft, "
              "--prepare-placement, --write-promotions, --cleanup",
              file=sys.stderr)
        sys.exit(1)

    mode = args[0]
    rest = args[1:]

    if mode == "--prepare":
        project_root = "."
        i = 0
        while i < len(rest):
            if rest[i] == "--project-root" and i + 1 < len(rest):
                project_root = rest[i + 1]
                i += 2
            else:
                i += 1
        cmd_prepare(project_root)

    elif mode == "--finalize":
        verbose = "--verbose" in rest
        use_json = "--json" in rest
        cmd_finalize(verbose=verbose, use_json=use_json)

    elif mode == "--prepare-fix":
        cmd_prepare_fix()

    elif mode == "--score-rewrites":
        cmd_score_rewrites()

    elif mode == "--finalize-fix":
        verbose = "--verbose" in rest
        use_json = "--json" in rest
        cmd_finalize_fix(verbose=verbose, use_json=use_json)

    elif mode == "--score-draft":
        if not rest:
            print("Usage: run_audit.py --score-draft <draft.json>",
                  file=sys.stderr)
            sys.exit(1)
        cmd_score_draft(rest[0])

    elif mode == "--finalize-draft":
        cmd_finalize_draft()

    elif mode == "--prepare-placement":
        cmd_prepare_placement()

    elif mode == "--write-promotions":
        project_root = "."
        i = 0
        while i < len(rest):
            if rest[i] == "--project-root" and i + 1 < len(rest):
                project_root = rest[i + 1]
                i += 2
            else:
                i += 1
        cmd_write_promotions(project_root)

    elif mode == "--cleanup":
        cmd_cleanup()

    else:
        print(f"Unknown mode: {mode}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
