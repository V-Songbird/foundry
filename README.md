<div align="center">
  <img src="assets/logo.svg" alt="V-Songbird" width="120" />
  <h1>claude-plugins</h1>
  <p><strong>Claude Code plugins by Songbird</strong> — skills, hooks, and workflows that extend what Claude can do and keep it honest while it does it.</p>
</div>

---

Each plugin is an independently installable unit with its own version, changelog, and release cadence. They compose — install one or all — and are designed to stay out of each other's way.

---

## Install

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install <plugin-name>
```

> [!TIP]
> New here? Start with **hestia** — one command audits your entire Claude Code setup and is the recommended entry point for this collection.

---

## Plugins

### hestia — Claude Code's session companion

Always-on guardrails and on-demand health checks for your entire Claude Code setup.

| You want to… | Invoke |
| --- | --- |
| Full health check of your Claude Code setup | `/hestia:checkup` |
| Prep Claude for a niche or unfamiliar domain | `/hestia:prepare` |
| Scan for stale instruction files | `/hestia:freshness` |
| Grade your rules and CLAUDE.md quality | `/hestia:assess-rules` |
| Review a diff for over-engineering | `/hestia:lean-review` |
| Author a skill, agent, command, or hook | `/hestia:scribe` |

Standing orders injected automatically into every session enforce minimal code, scope discipline, truth-grounding on unfamiliar tech, and memory hygiene — across Claude and every subagent it spawns.

```
/plugin install hestia
```

---

### forge — Pre-code feature review

Stop discovering architectural problems in code review. Surface them before implementation starts.

```
/forge  ──►  Parallel domain experts  ──►  Master plan  ──►  Adversarial critic  ──►  Approval gate  ──►  Implementation
```

Forge dispatches parallel domain experts against your actual codebase, synthesizes their findings into a grounded implementation plan, and runs an adversarial critic that tries to break that plan against the real code — before you approve a single edit. Every claim cites `file:line`.

```
/plugin install forge
```

---

### kairoi — Session safety

Edit-time guards and cross-session sync for long runs in unfamiliar codebases.

- **Guards** — pre-flight checks fire before Claude edits trigger-matched files; encode known constraints before changes land, not after
- **Sync** — captures tasks, files modified, guards fired, and test results per module after each session
- **Reflection** — updates module purpose, entry points, known patterns, and negative invariants so Claude's understanding stays accurate over time

```
/plugin install kairoi
```

---

### iceberg — Architectural enforcement

Encode structural rules as compiler/lint errors, not PR comments.

| Mode | What it does |
|------|-------------|
| **Author** | Applies the iceberg convention while writing. Keeps public interfaces stable, pushes complexity inward. |
| **Audit** | Reviews a codebase for structural debt. Returns a prioritized finding list with concrete remediation steps. |
| **Bootstrap** | Scaffolds linter config, CI gates, and an ADR template in a fresh project. |

Language-agnostic — rules describe patterns; Claude translates each to the idiomatic enforcer for the detected ecosystem (TypeScript, Python, Rust, JVM, .NET, Go).

```
/plugin install iceberg
```

---

### jetbrains-router — IDE tool routing

Routes Claude Code tools through a connected JetBrains IDE MCP server.

- Live diagnostics from the IDE's in-memory index — replaces local `tsc`/`gradle`/`mypy` runs
- Unsaved-buffer reads reflect editor state not yet flushed to disk
- Fails open: all tool calls pass through to native Claude Code behavior when no IDE is connected

Supported IDEs: WebStorm, Rider, IntelliJ IDEA 2025.2+

```
/plugin install jetbrains-router
```

---

## Repository layout

```
claude-plugins/
├── hestia/            ← flagship — start here
├── forge/
├── iceberg/
├── jetbrains-router/
└── kairoi/
```

Each plugin is an independent git repository mounted as a submodule. Plugin metadata lives in `.claude-plugin/plugin.json`; the marketplace index is at `.claude-plugin/marketplace.json`.

---

## Community

- Bug reports and suggestions: [GitHub Issues](https://github.com/V-Songbird/claude-plugins/issues)
- Security reports: [SECURITY.md](./SECURITY.md)
- Contribution guidelines: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## License

MIT — see [LICENSE](./LICENSE).
