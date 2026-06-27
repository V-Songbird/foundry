"""Shared fixtures and helpers for hestia tests."""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"
FIXTURES_DIR = Path(__file__).parent / "fixtures"
PYTHON = sys.executable


def run_script(name: str, stdin_data: dict | str | None = None, args: list[str] | None = None) -> dict | str:
    """Run a script from the scripts/ directory and return parsed JSON output.

    Args:
        name: Script filename (e.g., "extract.py")
        stdin_data: Dict (JSON-serialized) or string to pipe to stdin
        args: Command-line arguments

    Returns:
        Parsed JSON dict/list from stdout

    Raises:
        subprocess.CalledProcessError: If script exits non-zero
        json.JSONDecodeError: If output is not valid JSON
    """
    cmd = [PYTHON, str(SCRIPTS_DIR / name)]
    if args:
        cmd.extend(args)

    stdin_str = None
    if stdin_data is not None:
        if isinstance(stdin_data, (dict, list)):
            stdin_str = json.dumps(stdin_data)
        else:
            stdin_str = stdin_data

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(
        cmd,
        input=stdin_str,
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        env=env,
    )

    if result.returncode != 0:
        raise subprocess.CalledProcessError(
            result.returncode, cmd, result.stdout, result.stderr
        )

    return json.loads(result.stdout)


def run_script_raw(
    name: str, stdin_data: dict | str | None = None, args: list[str] | None = None
) -> subprocess.CompletedProcess:
    """Run a script and return the raw CompletedProcess (for testing failures)."""
    cmd = [PYTHON, str(SCRIPTS_DIR / name)]
    if args:
        cmd.extend(args)

    stdin_str = None
    if stdin_data is not None:
        if isinstance(stdin_data, (dict, list)):
            stdin_str = json.dumps(stdin_data)
        else:
            stdin_str = stdin_data

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    return subprocess.run(
        cmd,
        input=stdin_str,
        capture_output=True,
        text=True,
        timeout=30,
        encoding="utf-8",
        env=env,
    )


def load_fixture(name: str) -> dict | list | str:
    """Load a fixture file. JSON files are parsed; others returned as string."""
    path = FIXTURES_DIR / name
    with open(path, encoding="utf-8") as f:
        if name.endswith(".json"):
            return json.load(f)
        return f.read()


@pytest.fixture
def sample_project(tmp_path):
    """Create a temporary copy of the sample_project fixture tree.

    Returns the path to the temp project root.
    """
    src = FIXTURES_DIR / "sample_project"
    dst = tmp_path / "sample_project"
    shutil.copytree(src, dst)
    return dst


@pytest.fixture
def tmp_project(tmp_path):
    """Return a fresh empty temp directory usable as a project root."""
    project = tmp_path / "project"
    project.mkdir()
    return project
