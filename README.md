# Foundry

Foundry is a plugin marketplace for Claude Code and Codex, and the home of two plugins that also run on Antigravity. It lists three plugins that help a coding session continue where the last one stopped, say less while it works, and add less code.

| Plugin | Use it when | Hosts |
| --- | --- | --- |
| [Foreman](https://github.com/V-Songbird/foreman) | The next session needs the plan, the next task and a checked handoff | Claude Code, Codex and Antigravity |
| [Hush](https://github.com/V-Songbird/hush) | Running commentary buries the result you asked for | Claude Code |
| [Razor](https://github.com/V-Songbird/razor) | A small change keeps growing into new packages and files | Claude Code, Codex and Antigravity |

Each plugin works on its own. Its page holds the commands, settings, limits and measurements.
[Flint](https://github.com/V-Songbird/flint) is not a plugin. It is two text files with the same writing voice and coding rules, for a session where you do not want to install anything.

## Requirements

- Claude Code, a Codex host with plugin support, or the Antigravity CLI.
- Node.js 22 or later and Git on the PATH. The plugins run their hooks and tests with Node.js.

## Install

Inside Claude Code, add the marketplace once, then install the plugin you want:

```text
/plugin marketplace add V-Songbird/foundry
/plugin install foreman@foundry
```

Start a new session to load the plugin. Its skills then appear under the plugin's name, for example `/foreman:foreman`. `/plugin uninstall foreman@foundry` removes it again.

In Codex, Foreman and Razor install the same way:

```text
codex plugin marketplace add V-Songbird/foundry
codex plugin add razor@foundry
```

Review and trust the plugin's hooks with `/hooks`, then start a new Codex session. Hush has no Codex package.

Both hosts use the name `foundry` and read their own catalog. Each entry pins one commit of the plugin's repository, so an install stays the same until the catalog moves.

Antigravity has no marketplace for third-party plugins, so it installs Foreman or Razor from a clone of this repository. The clone checks each plugin out at the commit the catalogs pin, so Antigravity gets the same release as Claude Code and Codex. Clone with the submodules, then install a plugin directory:

```shell
git clone --recurse-submodules https://github.com/V-Songbird/foundry.git <path-to-clone>
agy plugin install <path-to-clone>/razor
agy plugin list
```

The list should name the plugin. Start a new conversation to load it. The install is a copy, so it stays at that commit. To take a new release, update the clone, install again and start a new conversation:

```shell
git -C <path-to-clone> pull
git -C <path-to-clone> submodule update --init
agy plugin install <path-to-clone>/razor
```

Foundry has no configuration of its own. Each plugin's page lists its settings.

## Development

The plugins are Git submodules. Clone with them:

```shell
git clone --recurse-submodules https://github.com/V-Songbird/foundry.git
```

Run a plugin's tests from its own directory, with Node.js 22 or later and Git available:

```shell
cd foreman
node --test tests/*.test.js
```

The command reports each test and exits non-zero on failure. From the root, `claude plugin validate .` checks the Claude Code catalog and prints `Validation passed`, and `agy plugin validate foreman` checks a plugin's Antigravity package.

A release moves the plugin's version in its own repository, then the commit pins in both catalogs. The `cut-release` skill under `.claude/skills/` walks through it. Read [AGENTS.md](AGENTS.md) before changing a catalog.

The plugin pages share one layout, described in [the README contract](docs/knowledge/plugin-readme-template.md). Their banners, icons, mascot scenes and charts are built from `brand/`; [the brand guide](docs/knowledge/brand.md) covers the colors, the generators and how an image reaches a plugin.

## Support

- Bugs and questions about the catalogs: the [issue tracker](https://github.com/V-Songbird/foundry/issues), the only listed channel.
- A problem in a plugin: that plugin's own issue tracker, linked from its page.
- Vulnerabilities: each plugin's `SECURITY.md` gives a private address. Do not post details publicly. The catalogs have no separate policy.
- What changed: each plugin's changelog, linked from its README.

## License

MIT. See [LICENSE](LICENSE).
