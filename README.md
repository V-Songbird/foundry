# claude-plugins

A collection of Claude Code plugins by Songbird. Each plugin is an independently installable unit that extends Claude Code with new skills, hooks, and workflows.

> All plugins are currently in **alpha**. Interfaces may change between minor releases. See each plugin's CHANGELOG for current version and history.

## Flagship

**[hestia](./hestia)** is the recommended starting point. It is the single plugin that covers the whole surface of your Claude Code setup: one `/hestia:checkup` command audits your `CLAUDE.md`, rules, agents, skills, hooks, and commands and returns a plain-language ranked report of what to improve. It also watches those files for staleness over time and ships a built-in minimalism mode.

Hestia supersedes the older `rulesense` and `scriptorium` plugins — those remain installable as deprecated stubs that redirect here.

## All plugins

| Plugin                                 | Description                                                                                                                                                                         |
|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [hestia](./hestia)                     | **Flagship.** One audit for your whole Claude Code setup. Run `/hestia:checkup` to get a ranked plain-language report. Freshness watches your files over time. Lean keeps code minimal. |
| [forge](./forge)                       | Pre-code feature review pipeline. Stress-tests a design through parallel domain experts, an adversarial critic, and a user approval gate before any code is written.                |
| [iceberg](./iceberg)                   | Encode architectural rules as compiler/lint errors. Audits structural debt, applies the asymmetric-complexity convention, or bootstraps enforcement scaffolding in a fresh project. |
| [jetbrains-router](./jetbrains-router) | Routes Claude Code tools through a JetBrains IDE MCP server (WebStorm, Rider, IntelliJ IDEA) for live diagnostics and unsaved-buffer reads. Fails open when no IDE is connected.    |
| [kairoi](./kairoi)                     | Session safety for unfamiliar codebases. Edit-time guards, automatic commit capture, and cross-module reflection so Claude stays in sync across long sessions.                      |
| [rulesense](./rulesense)               | *(Superseded by hestia.)* Audits and authors CLAUDE.md rule files. Rule quality capabilities now live in `/hestia:assess-rules`.                                                    |
| [scriptorium](./scriptorium)           | *(Superseded by hestia.)* Reference guide and proofreader for Claude Code instruction artifacts. Authoring now lives in `/hestia:scribe` and `/hestia:proofread`.                   |

## Installation

Each plugin is installed individually. Clone this repository and register the plugin directory with Claude Code.

See each plugin's README for setup steps and requirements.

## Repository layout

```
claude-plugins/
├── hestia/            ← flagship
├── forge/
├── iceberg/
├── jetbrains-router/
├── kairoi/
├── rulesense/         ← superseded by hestia
└── scriptorium/       ← superseded by hestia
```

## License

MIT — see [LICENSE](./LICENSE).

## Community

- Bug reports and suggestions: [GitHub Issues](https://github.com/V-Songbird/claude-plugins/issues)
- Security reports: [SECURITY.md](./SECURITY.md)
- Contribution guidelines: [CONTRIBUTING.md](./CONTRIBUTING.md)
