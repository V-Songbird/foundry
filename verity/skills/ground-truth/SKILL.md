---
name: ground-truth
description: >-
  Fetches the current official Claude Code documentation on demand from
  code.claude.com/docs/en/ and returns raw Markdown from primary sources.
  Also reads a bundled canonical reference for undocumented host MCP tools
  (spawn_task, dismiss_task, mark_chapter, read_widget_context, show_widget,
  and the ccd_session and visualize families). Provides live truth-grounding
  instead of relying on Claude's training memory.
when_to_use: >-
  Trigger when: (1) Claude is uncertain about a Claude Code feature, setting,
  hook event name, CLI flag, settings.json key, permission model, or any
  behavioral detail and is about to answer from training memory; (2) the user
  asks a factual question about how Claude Code works — "does Claude Code
  support X?", "what are the valid hook events?", "what does this setting do?",
  "how do I configure Y?"; (3) the user or Claude asks about undocumented
  host/session MCP tools by name — spawn_task, dismiss_task, mark_chapter,
  read_widget_context, show_widget, visualize, ccd_session, scheduled-tasks.
  Do NOT trigger for general coding questions unrelated to Claude Code, questions
  about other AI tools or APIs, or when performing a Claude Code task rather
  than describing how one works.
allowed-tools: WebFetch, Read
---

# Verity — ground-truth

Fetch and return the authoritative source for a Claude Code question. Two fetch paths depending on what is being asked.

## Path A — Official Claude Code docs (live fetch)

Use for any question about Claude Code features, behavior, settings, permissions, hooks, CLI, plugins, agents, skills, MCP, or the Agent SDK.

**Step 1 — discover the right page:**

```
WebFetch https://code.claude.com/llms.txt
```

This returns a Markdown index of all doc pages with titles and one-line descriptions. Scan it to find the slug(s) that match the question. Each entry is formatted as:

```
- [Page Title](https://code.claude.com/docs/en/{slug}.md): Brief description
```

**Step 2 — fetch the page as raw Markdown:**

```
WebFetch https://code.claude.com/docs/en/{slug}.md
```

Returns raw Markdown source — not rendered HTML. Quote the relevant section(s) in your response. Only fetch additional pages if the first does not fully answer the question.

**Fallback:** If no slug in llms.txt clearly matches the question, fetch `https://code.claude.com/docs/en/overview.md` to orient, then try the closest slug from the index.

## Path B — Undocumented host/session MCP tools (bundled reference)

Use for questions about `spawn_task`, `dismiss_task`, `mark_chapter`, `read_widget_context`, `show_widget`, `visualize`, `ccd_session`, `ccd_session_mgmt`, `scheduled-tasks`, `ccd_directory`, or any other session-injected host tool.

```
Read ${CLAUDE_PLUGIN_ROOT}/references/host-mcp-tools.md
```

**This file is canonical truth.** Do not attempt live introspection of the session toolset to answer these questions — the bundled reference is sourced from direct parameter-schema observation, version-labeled, and more reliable than runtime inference. If a tool the user asks about is not listed in the file, say so explicitly and cite the observation date from the file header so the user knows the reference may be incomplete for a newer harness version.

## Source citation (required)

Always end your answer with a citation so the user knows what was fetched and when:

- Path A: `> Source: https://code.claude.com/docs/en/{slug}.md — fetched live`
- Path B: `> Source: verity/references/host-mcp-tools.md — observed {date from file header}`
