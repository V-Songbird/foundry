# Contributing

This is a personal plugin collection maintained by a single author. Contributions are welcome in the form of bug reports, suggestions, and pull requests.

---

## Before opening a PR

- Check existing issues first — the problem may already be tracked or intentionally deferred.
- For substantial changes (new skills, new plugins, significant refactors), open an issue first to align on direction before writing code.
- Keep changes scoped to a single plugin per PR. Cross-plugin concerns go in a separate PR.

---

## Plugin structure

Each plugin follows this layout:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json        # name, description, author, keywords — NO version
│                          # field (the version is owned by
│                          # .claude-plugin/marketplace.json at the repo root)
├── CHANGELOG.md           # Keep a Changelog format
├── LICENSE                # MIT
├── README.md              # plain-language intro first, technical depth after
├── skills/                # if the plugin has skills
│   └── skill-name/
│       ├── SKILL.md       # Claude Code skill definition
│       └── references/    # Reference files loaded by the skill
├── hooks/
│   └── hooks.json         # Hook event wiring (PreToolUse, PostToolUse, etc.)
├── scripts/               # if the plugin has helper CLIs
└── tests/                 # required when the plugin has scripted behavior
```

`README.md`, `CHANGELOG.md`, and `LICENSE` are required in every plugin.
Community files (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`)
live once at the repo root and cover all plugins — don't duplicate
them per plugin.

---

## What to keep in mind

**Skills are Claude-facing instruction files.** Changes to `SKILL.md` affect how Claude interprets a skill — be precise, and test manually by invoking the affected skill in a real session before submitting.

**Hooks are scripts that run on every tool call or session event.** Keep them fast (no network, no blocking I/O) and test on both Unix and Windows.

**Each plugin is independently reviewed.** There is no shared runtime between plugins. A change to one plugin has no effect on another.

---

## Tests

All plugins with scripted behavior include a `node:test` suite. Run tests before submitting:

```
node --test <plugin>/tests/*.test.js
```

PRs that change script behavior without updating tests will not be merged.

---

## Changelog

Add an entry to `CHANGELOG.md` under `[Unreleased]` for every user-visible change. Follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Version bumps happen at release time, not per-PR.

---

## Code of conduct

This project follows the [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md).
