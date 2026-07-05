# verity

**Stops Claude from guessing about Claude Code. Makes it look up the real documentation instead.**

---

## What is this?

Claude is trained on a snapshot of the internet, and that snapshot ages. Claude Code, meanwhile, ships new features constantly. So when you ask "does Claude Code support X?" or "what does this setting do?", Claude may answer from memory — and memory can be months out of date, or simply wrong.

Verity fixes that. When a question about Claude Code comes up, Claude fetches the **current official documentation** from code.claude.com, reads it, and answers from what the docs actually say today — with a citation at the end telling you exactly which page it read, so you can check for yourself.

You don't need to know anything about code to benefit: install it once and forget it. From then on, answers about Claude Code come from the source, not from a guess.

## Why you'd want it

- **Answers you can trust.** Every answer ends with a link to the page it came from.
- **Always current.** The docs are fetched live, at the moment you ask — never a stale copy.
- **Covers the hidden stuff too.** Some tools inside Claude Code sessions aren't in the public docs at all (things like `spawn_task` or `show_widget`). Verity bundles a reference for those, so even the undocumented corners get real answers.
- **Zero setup.** No configuration, no accounts, nothing to maintain.

## Install

Inside Claude Code, run these two commands:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install verity
```

That's it. The first command tells Claude Code where our plugins live; the second installs this one.

## How to use it

Mostly, you don't — Claude uses it for you. Ask anything about how Claude Code works and Claude will reach for the docs automatically:

> "What are the valid hook events?"
> "Does Claude Code support scheduled tasks?"
> "What does the `spawn_task` tool do?"

You can also invoke it explicitly:

```
/verity:ground-truth
```

## How it works (for the curious)

The plugin is a single skill, [`skills/ground-truth/SKILL.md`](skills/ground-truth/SKILL.md), with two fetch paths:

- **Path A — official docs, fetched live.** Claude fetches `https://code.claude.com/llms.txt` (an index of every doc page), picks the matching page, and fetches it as raw Markdown straight from the source. No HTML scraping, no cached copies.
- **Path B — undocumented host MCP tools.** Questions about session-injected tools (`spawn_task`, `dismiss_task`, `mark_chapter`, `read_widget_context`, `show_widget`, and the `ccd_session` / `visualize` families) are answered from [`references/host-mcp-tools.md`](references/host-mcp-tools.md), a bundled, version-labeled reference built from direct observation of the tools' parameter schemas.

Both paths end with a mandatory source citation: the live URL for Path A, the reference file plus its observation date for Path B.

[`references/lastmod-snapshot.json`](references/lastmod-snapshot.json) records the doc sitemap's last-modified timestamps at the time the bundled reference was checked, so drift between the bundle and the live docs can be measured.

## Known limits

- Path A needs internet access — no connection, no live fetch.
- The Path B reference is a snapshot; a newer Claude Code version may have tools it doesn't list. When that happens, Claude says so explicitly and cites the observation date instead of guessing.

## License

MIT — see [LICENSE](./LICENSE).
