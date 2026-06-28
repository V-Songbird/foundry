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


# ---------------------------------------------------------------------------
# Helpers for rule-file fixtures
# ---------------------------------------------------------------------------

def _make_rule_file(project_root: Path, rel_path: str, content: str) -> Path:
    """Write a rule file at project_root/rel_path, creating parent dirs."""
    p = project_root / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


def _source_for(result: dict, path_suffix: str) -> dict:
    """Return the source_files entry whose path ends with path_suffix."""
    for sf in result["source_files"]:
        if sf["path"].endswith(path_suffix):
            return sf
    raise AssertionError(f"no source_file ending in {path_suffix!r}: "
                         f"{[sf['path'] for sf in result['source_files']]}")


# ---------------------------------------------------------------------------
# parse_scoping: paths: (canonical), globs: (legacy alias), value forms
# ---------------------------------------------------------------------------

class TestParseScoping:
    def test_imported_module(self):
        # parse_scoping / find_imports are importable directly (stdlib pipeline).
        import extract  # noqa: F401
        assert hasattr(extract, "parse_scoping")
        assert hasattr(extract, "find_imports")
        assert hasattr(extract, "count_glob_matches")

    def test_paths_block_list(self):
        from extract import parse_scoping
        fm = '---\npaths:\n  - "src/**/*.ts"\n  - "lib/**/*.ts"\n---\n# x\n'
        assert parse_scoping(fm) == ["src/**/*.ts", "lib/**/*.ts"]

    def test_paths_single_string(self):
        from extract import parse_scoping
        assert parse_scoping('---\npaths: "src/api/**/*.ts"\n---\n') == ["src/api/**/*.ts"]

    def test_paths_comma_separated_string(self):
        from extract import parse_scoping
        assert parse_scoping('---\npaths: "src/**, lib/**"\n---\n') == ["src/**", "lib/**"]

    def test_paths_flow_list(self):
        from extract import parse_scoping
        assert parse_scoping('---\npaths: ["a/**", "b/**"]\n---\n') == ["a/**", "b/**"]

    def test_globs_legacy_alias(self):
        from extract import parse_scoping
        assert parse_scoping('---\nglobs: "src/**/*.ts"\n---\n') == ["src/**/*.ts"]

    def test_paths_wins_over_globs_when_both_present(self):
        from extract import parse_scoping
        fm = '---\nglobs: "LEGACY/**"\npaths: "WINNER/**"\n---\n'
        assert parse_scoping(fm) == ["WINNER/**"]

    def test_no_frontmatter_returns_empty(self):
        from extract import parse_scoping
        assert parse_scoping("# heading\n- a rule\n") == []

    def test_unterminated_frontmatter_returns_empty(self):
        from extract import parse_scoping
        assert parse_scoping('---\npaths: "x/**"\n# never closed\n') == []

    def test_unrelated_frontmatter_key_ignored(self):
        from extract import parse_scoping
        assert parse_scoping('---\ndefault-category: mandate\n---\n') == []


# ---------------------------------------------------------------------------
# always_loaded logic: scoped rule vs always-loaded rule vs nested CLAUDE.md
# ---------------------------------------------------------------------------

class TestAlwaysLoaded:
    def test_scoped_rule_not_always_loaded(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        _make_rule_file(tmp_path, ".claude/rules/api.md",
                        '---\npaths: "src/api/**/*.ts"\n---\n- Validate with Zod.\n')
        result = _extract(tmp_path)
        sf = _source_for(result, "rules/api.md")
        assert sf["globs"] == ["src/api/**/*.ts"]
        assert sf["always_loaded"] is False

    def test_unscoped_rule_always_loaded(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        _make_rule_file(tmp_path, ".claude/rules/style.md", "- Use 2-space indent.\n")
        result = _extract(tmp_path)
        sf = _source_for(result, "rules/style.md")
        assert sf["globs"] == []
        assert sf["always_loaded"] is True

    def test_root_claude_md_always_loaded(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        result = _extract(tmp_path)
        sf = _source_for(result, "CLAUDE.md")
        assert sf["scope"] == "project"
        assert sf["always_loaded"] is True

    def test_nested_claude_md_not_always_loaded(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        _make_rule_file(tmp_path, "packages/api/CLAUDE.md", "# api\n- Use Knex.\n")
        result = _extract(tmp_path)
        sf = _source_for(result, "packages/api/CLAUDE.md")
        assert sf["scope"] == "nested"
        assert sf["always_loaded"] is False


# ---------------------------------------------------------------------------
# glob_match_count
# ---------------------------------------------------------------------------

class TestGlobMatchCount:
    def test_counts_matching_files(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        _make_rule_file(tmp_path, "src/api/a.ts", "export const a = 1;\n")
        _make_rule_file(tmp_path, "src/api/b.ts", "export const b = 2;\n")
        _make_rule_file(tmp_path, ".claude/rules/api.md",
                        '---\npaths: "src/api/**/*.ts"\n---\n- Validate with Zod.\n')
        result = _extract(tmp_path)
        sf = _source_for(result, "rules/api.md")
        assert sf["glob_match_count"] == 2

    def test_dead_glob_counts_zero(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        _make_rule_file(tmp_path, ".claude/rules/ghost.md",
                        '---\npaths: "src/nonexistent/**/*.ts"\n---\n- Do something.\n')
        result = _extract(tmp_path)
        sf = _source_for(result, "rules/ghost.md")
        assert sf["glob_match_count"] == 0

    def test_glob_match_prunes_node_modules(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        _make_rule_file(tmp_path, "node_modules/pkg/x.ts", "x\n")
        _make_rule_file(tmp_path, "src/x.ts", "x\n")
        _make_rule_file(tmp_path, ".claude/rules/all.md",
                        '---\npaths: "**/*.ts"\n---\n- Type everything.\n')
        result = _extract(tmp_path)
        sf = _source_for(result, "rules/all.md")
        # node_modules pruned -> only src/x.ts counts.
        assert sf["glob_match_count"] == 1


# ---------------------------------------------------------------------------
# F4 is live: scoped rule takes a glob branch, not the always-loaded fallback
# ---------------------------------------------------------------------------

class TestF4IsLive:
    def test_scoped_rule_drives_glob_branch(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        _make_rule_file(tmp_path, "src/api/handler.ts", "export const x = 1;\n")
        _make_rule_file(tmp_path, ".claude/rules/api.md",
                        '---\npaths: "src/api/**/*.ts"\n---\n'
                        '- Validate all request bodies with Zod at the API boundary.\n')
        extracted = _extract(tmp_path)
        scored = run_script("score_mechanical.py", stdin_data=extracted)
        scoped = next(r for r in scored["rules"] if "Zod" in r["text"])
        f4 = scoped["factors"]["F4"]
        # The glob branch, NOT the always-loaded fallback.
        assert f4["loading"] == "glob-scoped"
        assert f4["method"] != "always_universal"


# ---------------------------------------------------------------------------
# @-import resolution: following, depth cap, cycles, unresolved
# ---------------------------------------------------------------------------

class TestImports:
    def test_relative_import_followed(self, tmp_path):
        _make_project("# root\n- Lint.\nSee @docs/a.md\n", tmp_path)
        _make_rule_file(tmp_path, "docs/a.md", "- Use 2-space indent.\n")
        result = _extract(tmp_path)
        sf = _source_for(result, "docs/a.md")
        assert sf["imported_from"].endswith("CLAUDE.md")
        assert sf["import_depth"] == 1
        assert sf["always_loaded"] is True
        # Its rules are extracted too.
        assert any("2-space indent" in r["text"] for r in result["rules"])

    def test_literal_backtick_import_not_followed(self, tmp_path):
        _make_project("# root\n- Lint.\nMention `@README` literally.\n", tmp_path)
        _make_rule_file(tmp_path, "README", "- Should not be imported.\n")
        result = _extract(tmp_path)
        paths = [sf["path"] for sf in result["source_files"]]
        assert not any(p.endswith("README") for p in paths)
        assert result["unresolved_imports"] == []

    def test_fenced_code_import_not_followed(self, tmp_path):
        content = "# root\n- Lint.\n\n```\n@infence.md\n```\n"
        _make_project(content, tmp_path)
        _make_rule_file(tmp_path, "infence.md", "- Should not be imported.\n")
        result = _extract(tmp_path)
        paths = [sf["path"] for sf in result["source_files"]]
        assert not any(p.endswith("infence.md") for p in paths)

    def test_import_depth_cap_at_four(self, tmp_path):
        _make_project("# root\n@l1.md\n", tmp_path)
        _make_rule_file(tmp_path, "l1.md", "@l2.md\n- r1\n")
        _make_rule_file(tmp_path, "l2.md", "@l3.md\n- r2\n")
        _make_rule_file(tmp_path, "l3.md", "@l4.md\n- r3\n")
        _make_rule_file(tmp_path, "l4.md", "@l5.md\n- r4\n")
        _make_rule_file(tmp_path, "l5.md", "- r5 at depth 5\n")
        result = _extract(tmp_path)
        paths = [sf["path"] for sf in result["source_files"]]
        assert any(p == "l4.md" for p in paths)       # depth 4 loads
        assert not any(p == "l5.md" for p in paths)   # depth 5 does not

    def test_import_cycle_guarded(self, tmp_path):
        _make_project("# root\n@a.md\n", tmp_path)
        _make_rule_file(tmp_path, "a.md", "@b.md\n- ra\n")
        _make_rule_file(tmp_path, "b.md", "@a.md\n- rb\n")
        result = _extract(tmp_path)
        # a.md appears once (cycle does not re-add it), b.md once.
        a_count = sum(1 for sf in result["source_files"] if sf["path"] == "a.md")
        b_count = sum(1 for sf in result["source_files"] if sf["path"] == "b.md")
        assert a_count == 1
        assert b_count == 1

    def test_unresolved_import_surfaced_not_crash(self, tmp_path):
        _make_project("# root\n- Lint.\nSee @docs/missing.md\n", tmp_path)
        result = _extract(tmp_path)
        refs = [u["ref"] for u in result["unresolved_imports"]]
        assert "docs/missing.md" in refs


# ---------------------------------------------------------------------------
# project_context population
# ---------------------------------------------------------------------------

class TestProjectContext:
    def test_project_context_present(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        result = _extract(tmp_path)
        assert "project_context" in result
        ctx = result["project_context"]
        assert set(ctx) >= {"stack", "always_loaded_files", "glob_scoped_files", "tooling"}

    def test_project_context_splits_always_and_glob(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        _make_rule_file(tmp_path, "src/api/h.ts", "x\n")
        _make_rule_file(tmp_path, ".claude/rules/api.md",
                        '---\npaths: "src/api/**/*.ts"\n---\n- Validate.\n')
        _make_rule_file(tmp_path, ".claude/rules/style.md", "- Use 2-space indent.\n")
        ctx = _extract(tmp_path)["project_context"]
        assert "CLAUDE.md" in ctx["always_loaded_files"]
        assert any(p.endswith("rules/style.md") for p in ctx["always_loaded_files"])
        glob_paths = [gf["path"] for gf in ctx["glob_scoped_files"]]
        assert any(p.endswith("rules/api.md") for p in glob_paths)
        assert all("globs" in gf for gf in ctx["glob_scoped_files"])

    def test_project_context_stack_from_discover(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        (tmp_path / "package.json").write_text("{}", encoding="utf-8")
        ctx = _extract(tmp_path)["project_context"]
        assert "node" in ctx["stack"]

    def test_project_context_tooling_empty_when_none(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        ctx = _extract(tmp_path)["project_context"]
        assert ctx["tooling"] == {}

    def test_project_context_tooling_detects_hooks(self, tmp_path):
        _make_project("# root\n- Always lint.\n", tmp_path)
        settings = '{"hooks": {"PreToolUse": [{"matcher": "Bash", "hooks": []}]}}'
        _make_rule_file(tmp_path, ".claude/settings.json", settings)
        ctx = _extract(tmp_path)["project_context"]
        assert ctx["tooling"].get("hooks") is True
