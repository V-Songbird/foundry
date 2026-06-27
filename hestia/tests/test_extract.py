"""Tests for extract.py — instruction parser.

hestia's extract.py takes --project-root and runs discover() internally,
so tests create real temp dirs with CLAUDE.md files instead of piping
project_context.json on stdin.
"""

import shutil
import sys
import tempfile
from pathlib import Path

import pytest

# Allow direct import of hestia scripts
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from conftest import FIXTURES_DIR, run_script, run_script_raw


# ---------------------------------------------------------------------------
# Helper: create a temp project with CLAUDE.md content
# ---------------------------------------------------------------------------

def _make_project(content: str, tmp_path: Path | None = None) -> Path:
    """Write content to CLAUDE.md in a fresh temp directory and return it."""
    if tmp_path is None:
        tmp_path = Path(tempfile.mkdtemp())
    claude_md = tmp_path / "CLAUDE.md"
    claude_md.write_text(content, encoding="utf-8")
    return tmp_path


def _extract(project_root: Path) -> dict:
    """Run extract.py on a project root and return the parsed output."""
    return run_script("extract.py", args=["--project-root", str(project_root)])


# ---------------------------------------------------------------------------
# Basic extraction from a real temp directory
# ---------------------------------------------------------------------------

class TestBasicExtraction:
    def test_extracts_rules_from_claude_md(self, tmp_path):
        root = _make_project("- ALWAYS validate user input.\n- Use strict mode.\n", tmp_path)
        result = _extract(root)
        assert "rules" in result
        assert len(result["rules"]) >= 2

    def test_output_has_source_files(self, tmp_path):
        root = _make_project("- Always test.\n", tmp_path)
        result = _extract(root)
        assert "source_files" in result
        assert len(result["source_files"]) >= 1

    def test_output_has_project_root(self, tmp_path):
        root = _make_project("- Always test.\n", tmp_path)
        result = _extract(root)
        assert "project_root" in result

    def test_rules_have_required_fields(self, tmp_path):
        root = _make_project("- Always test.\n", tmp_path)
        result = _extract(root)
        rule = result["rules"][0]
        assert "id" in rule
        assert "text" in rule
        assert "line_start" in rule
        assert "line_end" in rule
        assert "category" in rule
        assert "file_index" in rule
        assert "factors" in rule

    def test_rule_ids_are_sequential(self, tmp_path):
        root = _make_project("- Always validate.\n- Use strict mode.\n- Run tests.\n", tmp_path)
        result = _extract(root)
        ids = [r["id"] for r in result["rules"]]
        assert ids[0] == "R001"
        assert ids[1] == "R002"

    def test_empty_file_no_rules(self, tmp_path):
        root = _make_project("", tmp_path)
        result = _extract(root)
        assert result["rules"] == []

    def test_only_prose_no_rules(self, tmp_path):
        content = "This file provides guidance for the project.\nNote that background information follows.\n"
        root = _make_project(content, tmp_path)
        result = _extract(root)
        # No actionable rules — only prose
        assert all("This file provides" not in r["text"] for r in result["rules"])


# ---------------------------------------------------------------------------
# Sample project fixture (matches rulesense's worked example)
# ---------------------------------------------------------------------------

WORKED_EXAMPLE = (
    "---\n"
    'globs: "src/api/**/*.ts"\n'
    "default-category: mandate\n"
    "---\n"
    "\n"
    "# API Rules\n"
    "\n"
    "- Validate all request bodies at the handler boundary.\n"
    "- Return consistent error shapes: `{ error: string, code: number }`.\n"
    "  This ensures clients can parse errors uniformly.\n"
    "- Use middleware for cross-cutting concerns (auth, logging) — not inline checks.\n"
    "\n"
    "## Database Access\n"
    "\n"
    "<!-- category: preference -->\n"
    "- Prefer transactions for queries spanning multiple tables.\n"
    "- Consider using read replicas for heavy read operations where latency is acceptable.\n"
    "\n"
    "The API layer uses Express with TypeScript strict mode enabled.\n"
)


class TestWorkedExample:
    """Mirror the rulesense worked-example tests; hestia extracts the same content."""

    def test_worked_example_rule_count(self, tmp_path):
        root = _make_project(WORKED_EXAMPLE, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) == 5

    def test_worked_example_rule_texts(self, tmp_path):
        root = _make_project(WORKED_EXAMPLE, tmp_path)
        result = _extract(root)
        texts = [r["text"] for r in result["rules"]]
        assert any("Validate all request bodies" in t for t in texts)
        # Rule 2 should merge with clarification
        assert any("Return consistent error shapes" in t and "clients can parse" in t for t in texts)
        assert any("Use middleware" in t for t in texts)
        assert any("Prefer transactions" in t for t in texts)
        assert any("Consider using read replicas" in t for t in texts)

    def test_worked_example_prose_excluded(self, tmp_path):
        root = _make_project(WORKED_EXAMPLE, tmp_path)
        result = _extract(root)
        texts = [r["text"] for r in result["rules"]]
        assert not any("The API layer uses Express" in t for t in texts)


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------

class TestExtractionDeterminism:
    def test_extraction_determinism(self, tmp_path):
        root = _make_project("- ALWAYS use strict mode.\n- Prefer named exports.\n", tmp_path)
        result1 = _extract(root)
        result2 = _extract(root)
        assert result1["rules"] == result2["rules"]


# ---------------------------------------------------------------------------
# Metadata stripping
# ---------------------------------------------------------------------------

class TestMetadataStripping:
    def test_frontmatter_stripped(self, tmp_path):
        content = "---\nglobs: \"src/**\"\n---\n\n- Use strict mode.\n"
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) == 1
        assert "globs" not in result["rules"][0]["text"]

    def test_headings_stripped(self, tmp_path):
        content = "# Rules\n\n- Use strict mode.\n\n## More\n\n- Always test.\n"
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert not any("# Rules" in r["text"] for r in result["rules"])
        assert not any("## More" in r["text"] for r in result["rules"])

    def test_fenced_code_block_excluded(self, tmp_path):
        content = (
            "- Use this RTK Query pattern:\n\n"
            "```typescript\n"
            "export const userApi = createApi({\n"
            "  reducerPath: 'userApi',\n"
            "});\n"
            "```\n\n"
            "- Always validate input.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        texts = [r["text"] for r in result["rules"]]
        assert any("validate input" in t for t in texts)
        assert not any("createApi" in t for t in texts)
        assert not any("reducerPath" in t for t in texts)

    def test_markdown_table_rows_excluded(self, tmp_path):
        content = (
            "## File naming\n\n"
            "| Type | Convention |\n"
            "|------|------------|\n"
            "| Components | PascalCase.tsx |\n"
            "| Hooks | useCamelCase.ts |\n\n"
            "- Always validate user input.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        texts = [r["text"] for r in result["rules"]]
        assert any("validate user input" in t for t in texts)
        assert not any("PascalCase" in t for t in texts)
        assert not any("useCamelCase" in t for t in texts)

    def test_bare_reference_link_excluded(self, tmp_path):
        content = (
            "## References\n\n"
            "- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)\n"
            "- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/)\n"
            "- Always check [the docs](./docs.md) before modifying the API.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        texts = [r["text"] for r in result["rules"]]
        assert not any("DESIGN_SYSTEM.md](./" in t for t in texts)
        assert not any("WCAG 2.2](" in t for t in texts)
        assert any("check" in t and "docs" in t for t in texts)

    def test_horizontal_rule_excluded(self, tmp_path):
        content = "- Always test.\n\n---\n\n- Use strict mode.\n"
        root = _make_project(content, tmp_path)
        result = _extract(root)
        texts = [r["text"] for r in result["rules"]]
        assert not any("---" in t for t in texts)
        assert any("Always test" in t for t in texts)
        assert any("strict mode" in t for t in texts)


# ---------------------------------------------------------------------------
# Compound split
# ---------------------------------------------------------------------------

class TestCompoundSplit:
    def test_compound_split(self, tmp_path):
        content = "- Run tests before committing and ensure no warnings remain.\n"
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) == 2

    def test_compound_nosplit(self, tmp_path):
        content = "- Edit the .bnf source and regenerate.\n"
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) == 1


# ---------------------------------------------------------------------------
# Clarification merge
# ---------------------------------------------------------------------------

class TestClarificationMerge:
    def test_clarification_merge(self, tmp_path):
        content = (
            "- Use TypeScript strict mode for all new files.\n"
            "  This ensures type safety across the codebase.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) == 1
        assert "type safety" in result["rules"][0]["text"]


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

class TestCategories:
    def test_category_annotation(self, tmp_path):
        content = (
            "<!-- category: preference -->\n"
            "- Prefer named exports over default exports.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert result["rules"][0]["category"] == "preference"

    def test_default_category_is_mandate(self, tmp_path):
        content = "- Always validate input.\n"
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert result["rules"][0]["category"] == "mandate"


# ---------------------------------------------------------------------------
# Architecture description bullets (prose filter)
# ---------------------------------------------------------------------------

class TestDescriptionBulletFilter:
    def test_architecture_description_bullets_not_extracted(self, tmp_path):
        content = (
            "## Architecture\n"
            "\n"
            "- **src/primitives/** — Headless behavior hooks and state management\n"
            "- **src/components/** — Visual components with Radix UI integration\n"
            "- **src/tokens/** — Design tokens and theming\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        rule_texts = [r["text"] for r in result["rules"]]
        assert not any("primitives" in t for t in rule_texts)
        assert not any("tokens" in t for t in rule_texts)
        assert len(result["rules"]) == 0

    def test_directive_bullets_still_extracted(self, tmp_path):
        content = (
            "## Architecture\n"
            "\n"
            "- **src/primitives/** — Headless behavior hooks\n"
            "\n"
            "## Rules\n"
            "\n"
            "- Use early returns over nested ifs.\n"
            "- Never mutate props directly.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        rule_texts = [r["text"] for r in result["rules"]]
        assert any("early returns" in t for t in rule_texts)
        assert any("mutate props" in t for t in rule_texts)
        assert not any("primitives" in t for t in rule_texts)

    def test_bold_description_with_verb_stays_rule(self, tmp_path):
        content = "- **Auth**: Always use `getAccessToken()` for silent refresh. Reset all state on 401.\n"
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) >= 1
        assert any("Auth" in r["text"] for r in result["rules"])


# ---------------------------------------------------------------------------
# Reader-addressing prose / navigation pointers
# ---------------------------------------------------------------------------

class TestNavigationPointerAndReaderProse:
    def test_reader_addressing_paragraphs_not_extracted(self, tmp_path):
        content = (
            "# Game-logic rules\n"
            "\n"
            "These rules load when you're editing pure game logic.\n"
            "\n"
            "This file provides guidance to Claude Code when working with code in this repository.\n"
            "\n"
            "The following rules apply to every test file in tests/.\n"
            "\n"
            "- Always run `npm test` before committing.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        rule_texts = [r["text"] for r in result["rules"]]
        assert not any("These rules load when" in t for t in rule_texts)
        assert not any("This file provides guidance" in t for t in rule_texts)
        assert not any("The following rules apply" in t for t in rule_texts)
        assert any("npm test" in t for t in rule_texts)

    def test_navigation_pointer_backtick_md_not_extracted(self, tmp_path):
        content = (
            "## Scoped rules\n"
            "\n"
            "- `.claude/rules/comments.md` — when to write comments\n"
            "- `.claude/rules/naming.md` — naming conventions\n"
            "- Always run `npm test` before committing.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        rule_texts = [r["text"] for r in result["rules"]]
        assert not any("comments.md" in t for t in rule_texts)
        assert not any("naming.md" in t for t in rule_texts)
        assert any("npm test" in t for t in rule_texts)


# ---------------------------------------------------------------------------
# Heading-context propagation for orphaned bullets
# ---------------------------------------------------------------------------

class TestHeadingBulletMerge:
    def test_heading_bullet_list_merged(self, tmp_path):
        content = (
            "## When comments are NOT allowed\n"
            "\n"
            "- Restating the code\n"
            "- Narrating sections\n"
            "- Decorative banners\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) <= 1

    def test_merged_text_includes_heading_context(self, tmp_path):
        content = (
            "## When comments are NOT allowed\n"
            "\n"
            "- Restating the code\n"
            "- Narrating sections\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) == 1
        assert "When comments are NOT allowed" in result["rules"][0]["text"]
        assert "Restating the code" in result["rules"][0]["text"]

    def test_heading_with_verb_bullets_stay_standalone(self, tmp_path):
        content = (
            "## Code style\n"
            "\n"
            "- Use early returns over nested ifs.\n"
            "- Match the file's existing style.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) >= 2

    def test_different_headings_stay_separate(self, tmp_path):
        content = (
            "## Section A\n"
            "\n"
            "- Alpha item\n"
            "- Beta item\n"
            "\n"
            "## Section B\n"
            "\n"
            "- Gamma item\n"
            "- Delta item\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) == 2
        texts = [r["text"] for r in result["rules"]]
        assert any("Section A" in t and "Alpha" in t for t in texts)
        assert any("Section B" in t and "Gamma" in t for t in texts)

    def test_mixed_verb_and_verbless_under_heading(self, tmp_path):
        content = (
            "## Error handling\n"
            "\n"
            "- Error messages sound like a person wrote them\n"
            "- No catch-rethrow unless adding context\n"
            "- Always log the original error before wrapping.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        verb_rules = [r for r in result["rules"] if "Always log" in r["text"]]
        assert len(verb_rules) == 1
        assert len(result["rules"]) == 2


# ---------------------------------------------------------------------------
# Directive bullet merge (Phase H pattern)
# ---------------------------------------------------------------------------

class TestDirectiveBulletMerge:
    def test_verbless_bullets_merged_into_parent_directive(self, tmp_path):
        content = (
            "These scream AI. Don't use them anywhere:\n"
            "- Synergy\n"
            "- Leverage\n"
            "- Innovative\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        rules = result["rules"]
        assert len(rules) == 1, (
            f"Expected 1 merged rule, got {len(rules)}: "
            f"{[r['text'][:50] for r in rules]}"
        )
        assert "Don't use" in rules[0]["text"]
        assert "Synergy" in rules[0]["text"]

    def test_verb_bearing_bullets_stay_standalone(self, tmp_path):
        content = (
            "Write clean, readable code.\n"
            "- Use early returns over nested ifs.\n"
            "- Prefer flat objects over deep nesting.\n"
        )
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) >= 3


# ---------------------------------------------------------------------------
# Sample project fixture (end-to-end from disk)
# ---------------------------------------------------------------------------

class TestSampleProjectFixture:
    def test_sample_project_extracts_rules(self, sample_project):
        result = _extract(sample_project)
        assert len(result["rules"]) >= 4

    def test_sample_project_has_source_files(self, sample_project):
        result = _extract(sample_project)
        paths = [sf["path"] for sf in result["source_files"]]
        assert any("CLAUDE.md" in p for p in paths)

    def test_sample_project_has_validate_rule(self, sample_project):
        result = _extract(sample_project)
        texts = [r["text"] for r in result["rules"]]
        assert any("validate user input" in t for t in texts)


# ---------------------------------------------------------------------------
# Non-BMP / Unicode content
# ---------------------------------------------------------------------------

class TestNonBMPContent:
    def test_non_bmp_content_extracted(self, tmp_path):
        src = FIXTURES_DIR / "non_bmp_content" / "CLAUDE.md"
        dst = tmp_path / "CLAUDE.md"
        dst.write_bytes(src.read_bytes())
        result = _extract(tmp_path)
        assert len(result["rules"]) >= 1

    def test_unicode_arrows_in_text(self, tmp_path):
        content = "- Use → for flow arrows in documentation.\n"
        root = _make_project(content, tmp_path)
        result = _extract(root)
        assert len(result["rules"]) >= 1
        assert "→" in result["rules"][0]["text"]
