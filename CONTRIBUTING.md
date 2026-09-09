# Contributing

This is a personal plugin collection maintained by a single author. Contributions are welcome in the form of bug reports, suggestions, and pull requests.

---

## Before opening a PR

- Check existing issues first — the problem may already be tracked or intentionally deferred.
- For substantial changes (new skills, new plugins, significant refactors), open an issue first to align on direction before writing code.
- Keep changes scoped to a single plugin per PR. Cross-plugin concerns go in a separate PR.

---

## Plugin structure

Foundry uses only `main`. Each plugin submodule uses `main` for its front page,
`Claude` for Claude Code, and `Codex` for Codex. Make implementation changes on
the matching platform branch. Hush's Codex branch is an unpublished entry point
until its port is validated.

The Claude branch follows this layout:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json        # name, description, author, keywords — NO version
│                          # field (the version is owned by
│                          # .claude-plugin/marketplace.json at the repo root)
├── CHANGELOG.md           # Keep a Changelog format
├── LICENSE                # MIT
├── README.md              # plain-language intro first, technical depth after
├── CONTRIBUTING.md        # copied from .github/PLUGIN_CONTRIBUTING_TEMPLATE.md
├── SECURITY.md            # copied from .github/PLUGIN_SECURITY_TEMPLATE.md
├── CODE_OF_CONDUCT.md     # copied from .github/PLUGIN_CODE_OF_CONDUCT_TEMPLATE.md
├── skills/                # if the plugin has skills
│   └── skill-name/
│       ├── SKILL.md       # Claude Code skill definition
│       └── references/    # Reference files loaded by the skill
├── hooks/
│   └── hooks.json         # Hook event wiring (PreToolUse, PostToolUse, etc.)
├── scripts/               # if the plugin has helper CLIs
└── tests/                 # required when the plugin has scripted behavior
```

The Codex branch uses `.codex-plugin/plugin.json`, including its own version
and interface metadata. Both platforms retain their own skills and hooks.

Each executable plugin branch lives in its own repo (mounted here as a git submodule) and
carries its own `README.md`, `CHANGELOG.md`, `LICENSE`, `CONTRIBUTING.md`,
`SECURITY.md`, and `CODE_OF_CONDUCT.md` — all required. The community files
are copied from this repo's `.github/` templates
([`PLUGIN_CONTRIBUTING_TEMPLATE.md`](.github/PLUGIN_CONTRIBUTING_TEMPLATE.md),
[`PLUGIN_SECURITY_TEMPLATE.md`](.github/PLUGIN_SECURITY_TEMPLATE.md),
[`PLUGIN_CODE_OF_CONDUCT_TEMPLATE.md`](.github/PLUGIN_CODE_OF_CONDUCT_TEMPLATE.md))
verbatim; don't hand-drift a plugin's copy from the template. The root
copies of these files here in foundry govern contributions to the
marketplace repo itself (manifest curation, templates, this document).

Every plugin README shares one skeleton, tone, and style. Start from
[`.github/PLUGIN_README_TEMPLATE.md`](.github/PLUGIN_README_TEMPLATE.md):
copy it, fill the placeholders, and delete the guidance comments. The
house rules (plain-language-first above the "How it works" divider,
technical depth below it, competitors nameable in the README but generic
framing everywhere else, method-transparent benchmarks with an honest
limit) are documented inline in the template.

---

## What to keep in mind

**Skills instruct the selected coding assistant.** Changes to `SKILL.md` affect how it interprets a skill — be precise, and test manually by invoking the affected skill in that platform's real session before submitting.

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

## Git hooks

Run this once after cloning:

```
git config core.hooksPath scripts/git-hooks
```

This enables a `pre-commit` hook that checks both staged marketplace catalogs.
Each entry must name its platform branch and pin a complete commit SHA from
that branch, with the matching plugin manifest and author. Shared Claude helpers
are compared on the Claude branches even when a developer has Codex checked out.
The submodule pointer selects a development checkout independently of the
release pins. Fetch the platform branches before running these checks.

---

## Cutting a release

Both marketplaces are named `foundry`. Claude Code reads
`.claude-plugin/marketplace.json`; Codex reads `.agents/plugins/marketplace.json`.
Each source uses the plugin repository URL, `ref: "Claude"` or `ref: "Codex"`,
and the full validated `source.sha`.

The Claude catalog owns its release versions. Its two release fields move together:

- `version` — the semver string users see; bump it or `/plugin update` reports nothing changed.
- `source.sha` — the exact commit of the plugin's own repo that `version` maps to; bump it or installers silently keep serving old code under the new label.

Codex's version lives in `.codex-plugin/plugin.json` on its `Codex` branch.
Every changed installable payload needs a fresh effective version.

Update the changelog and run the platform's checks, then commit and publish the
plugin's platform branch first. Update that platform's catalog pin in Foundry
`main`, run `node scripts/git-hooks/check-platform-marketplaces.js`, and publish
the root afterward. Changing the development gitlink alone does not release a
plugin. The checks validate refs, manifests, and ownership; review version bumps
and runtime validation separately. Never add Hush to the Codex catalog before
its port passes validation.

---

## Changelog

Add an entry to `CHANGELOG.md` under `[Unreleased]` for every user-visible change. Follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Version bumps happen at release time, not per-PR.

---

## Code of conduct

This project follows the [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md).
