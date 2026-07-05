# Changelog

All notable changes to Verity are documented here. Verity is a
monorepo-folder plugin — its version is owned by
`.claude-plugin/marketplace.json` at the repo root, not by
`verity/.claude-plugin/plugin.json` (which carries no version field by
convention).

## [0.1.0-alpha] — 2026-06-30

Initial release. Live truth-grounding for Claude Code questions.

- `ground-truth` skill with two fetch paths: Path A discovers the right
  official doc page via `https://code.claude.com/llms.txt` and fetches it as
  raw Markdown; Path B reads the bundled `references/host-mcp-tools.md`
  canonical reference for undocumented host/session MCP tools (`spawn_task`,
  `dismiss_task`, `mark_chapter`, `read_widget_context`, `show_widget`, and
  the `ccd_session` and `visualize` families).
- Mandatory source citation at the end of every answer (live URL or bundled
  reference + observation date).
- `references/lastmod-snapshot.json` records the doc sitemap's lastmod
  timestamps so staleness of the bundled index can be diffed against the
  live sitemap.
