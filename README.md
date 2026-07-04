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

---

## Plugins

### [forge](https://github.com/V-Songbird/forge) — Pre-code feature review

Stop discovering architectural problems in code review. Surface them before implementation starts.

```
/forge  ──►  Parallel domain experts  ──►  Master plan  ──►  Adversarial critic  ──►  Approval gate  ──►  Implementation
```

Forge dispatches parallel domain experts against your actual codebase, synthesizes their findings into a grounded implementation plan, and runs an adversarial critic that tries to break that plan against the real code — before you approve a single edit. Every claim cites `file:line`.

```
/plugin install forge
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

### [nudge](https://github.com/V-Songbird/claude-plugins/tree/main/nudge) — Prompt coaching

Reviews your session and teaches you how to write better prompts. Run it at the end of any working session — it identifies what your opening prompt missed, rewrites it as a professional prompt calibrated to your Claude model and effort level, and explains why in plain language.

```
/nudge:review
```

```
/plugin install nudge
```

---

### [verity](https://github.com/V-Songbird/claude-plugins/tree/main/verity) — Live documentation grounding

Fetches current official Claude Code documentation on demand — gives Claude truth-grounding from primary sources instead of training memory. Also provides a canonical reference for host MCP tools (`spawn_task`, `mark_chapter`, `show_widget`, and the full `ccd_session` and `visualize` families).

```
/verity:ground-truth
```

```
/plugin install verity
```

---

### [relay](https://github.com/V-Songbird/claude-plugins/tree/main/relay) — Prompt engineering + roadmap

`/relay:craft-prompt` assembles self-contained, Anthropic-grade prompts via `AskUserQuestion`. `/relay:init` bootstraps a project's `ROADMAP.jsonl` and Claude-suggestion policy. `/relay:roadmap` picks the next task like a software architect and crafts its handoff prompt. A commit-triggered hook keeps roadmap status in sync.

```
/plugin install relay
```

---

## Repository layout

```
claude-plugins/
├── forge/
├── jetbrains-router/
├── nudge/
├── relay/
└── verity/
```

Each plugin is an independent git repository mounted as a submodule. Plugin metadata lives in `.claude-plugin/plugin.json`; the marketplace index is at `.claude-plugin/marketplace.json`.

---

## Development

`.claude/settings.json` (committed) registers one repo-wide dev hook:
`.claude/hooks/run-tests-on-edit.js` reruns whichever plugin's own test
suite after an `Edit`/`Write` lands in that plugin's `scripts/` or `hooks/`
dir — detected by walking up to the nearest `.claude-plugin/plugin.json`
marker, so it works for any plugin in this repo, not just one. Silent when
green; surfaces a failure via `additionalContext` when red. Dev-only: it
never fires for anyone who has merely *installed* a plugin from this repo,
only for edits made inside the source tree itself.

---

## Community

- Bug reports and suggestions: [GitHub Issues](https://github.com/V-Songbird/claude-plugins/issues)
- Security reports: [SECURITY.md](./SECURITY.md)
- Contribution guidelines: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## License

MIT — see [LICENSE](./LICENSE).
