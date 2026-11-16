<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.png" />
    <img src="assets/banner-light.png" alt="Foundry" width="900" />
  </picture>
  <h1>Foundry</h1>
  <p><strong>Five plugins that keep a coding session on its task.</strong></p>
</div>

<p align="center"><a href="#install"><strong>Get started</strong></a> · <a href="#what-is-this">What is this?</a> · <a href="#the-plugins">The plugins</a> · <a href="#good-to-know">Good to know</a> · <a href="#support">Support</a></p>

## What is this?

Foundry is a marketplace of plugins for Claude Code, an AI coding assistant. A plugin adds commands and habits to the assistant. A marketplace is a list the assistant installs plugins from.

Foundry lists five plugins. Each one works on its own, so install only the one you need.

Four of the five also run on Codex and Antigravity, two other coding assistants. Claude Code is the primary host: every plugin is designed for it first. A host is the assistant a plugin runs in.

## The plugins

| Plugin | Use it when | Hosts |
| --- | --- | --- |
| [Foreman](https://github.com/V-Songbird/foreman) | The next session needs the plan, the next task and a checked handoff | Claude Code, Codex and Antigravity |
| [Hush](https://github.com/V-Songbird/hush) | Answers arrive in a different shape each time, with the result under the steps | Claude Code |
| [Razor](https://github.com/V-Songbird/razor) | A small change keeps growing into new packages and files | Claude Code, Codex and Antigravity |
| [Anneal](https://github.com/V-Songbird/anneal) | The assistant searches, rereads or guesses its way around the repository, or the docs no longer match the code | Claude Code, Codex and Antigravity |
| [Collet](https://github.com/V-Songbird/collet) | A session edits files its task never named, or calls the work done before its check passes | Claude Code, Codex and Antigravity |

Each plugin's page holds its commands, settings, limits and measurements.

[Flint](https://github.com/V-Songbird/flint) is not a plugin. It is two text files with the same writing voice and coding rules, for a session where you do not want to install anything.

## Install

Every host needs Node.js 22 or later, and Git. Foreman needs Git 2.25 or later. The plugins run their own programs with Node.js.

The examples install Foreman or Razor. Replace the name with the plugin you want.

### Claude Code

You need Claude Code 2.1.323 or later.

Inside Claude Code, run:

```text
/plugin marketplace add V-Songbird/foundry
/plugin install foreman@foundry
```

Then start a new session.

To check that it worked, run `claude plugin list` in a terminal. The list names `foreman`. The plugin's commands then appear under its name, for example `/foreman:foreman`.

To remove it, run `/plugin uninstall foreman@foundry`.

### Codex

You need a Codex host with plugin support. Hush has no Codex package.

In a terminal, run:

```text
codex plugin marketplace add V-Songbird/foundry
codex plugin add razor@foundry
```

Review and trust the plugin's hooks with `/hooks`. A hook is a small program the host runs at a set moment. Then start a new session.

### Antigravity

You need the Antigravity CLI. It has no marketplace for third-party plugins, so you install from a copy of this repository. Hush has no Antigravity package. Replace `<path-to-clone>` with a folder of your choice.

In a terminal, run:

```shell
git clone --recurse-submodules https://github.com/V-Songbird/foundry.git <path-to-clone>
agy plugin install <path-to-clone>/razor
agy plugin list
```

Then start a new conversation. The list names `razor` when it worked.

### Update

An install stays at the release it was made from.

In Claude Code, run these. Then start a new session:

```text
/plugin marketplace update foundry
/plugin update foreman@foundry
```

In Codex, run these. Then start a new session:

```text
codex plugin marketplace upgrade
codex plugin remove razor@foundry
codex plugin add razor@foundry
```

In Antigravity, run these. Then start a new conversation:

```shell
git -C <path-to-clone> pull
git -C <path-to-clone> submodule update --init
agy plugin install <path-to-clone>/razor
```

## Good to know

| Limit | What it means for you |
| --- | --- |
| Foundry has no settings | Each plugin's page lists its own. |
| An install does not update itself | It stays the same until you run the update commands above. |
| An Antigravity install is a copy | It changes only when you install again. |
| Claude Code and Codex read separate lists | Both use the name `foundry`. Both install the same release of a plugin. |
| The history was rewritten on 2026-11-14 | A copy or a marketplace added before that date cannot update. See below. |

### If an update fails

| What fails | What to do |
| --- | --- |
| `git pull` in a copy made before 2026-11-14 | Delete the copy, clone again as above and install again |
| `/plugin marketplace update foundry`, for a marketplace added before that date | Remove the marketplace and add it again |
| `codex plugin marketplace upgrade`, for a marketplace added before that date | Remove the marketplace and add it again |

## Development

This repository holds two catalogs, one for Claude Code and one for Codex. Each entry names one commit of a plugin's repository. It also holds the check that validates the catalogs, and this page's banner.

Each plugin is developed and tested in its own repository, linked in the table above. The plugins are mounted here as Git submodules, so a clone can check each one out at its named commit. Antigravity installs from that checkout, so it gets the same release as the other two hosts.

To clone with the plugins, run:

```shell
git clone --recurse-submodules https://github.com/V-Songbird/foundry.git
```

To run a plugin's tests, you need Node.js 22 or later and Git. Run them from the plugin's own folder:

```shell
cd foreman
node --test tests/*.test.js
```

The command reports each test and exits non-zero on failure.

From the root, two commands check the packages:

| Command | What it checks | What you see |
| --- | --- | --- |
| `claude plugin validate .` | The Claude Code catalog | `Validation passed` |
| `agy plugin validate foreman` | A plugin's Antigravity package | The validator's result for that plugin |

A release moves the plugin's version in its own repository, then the commit both catalogs name. The Claude Code catalog repeats that version in the plugin's entry, and the Codex catalog carries none. A plugin listed in both catalogs names the same commit in both.

## Support

| You want to | Go to |
| --- | --- |
| Report a bug or ask about the catalogs | The [Foundry issue tracker](https://github.com/V-Songbird/foundry/issues), the only listed channel |
| Report a problem in a plugin | That plugin's own issue tracker, linked from its page |
| Report a vulnerability | The private address in that plugin's `SECURITY.md`. Do not post details publicly. The catalogs have no separate policy. |
| See what changed | Each plugin's releases page on GitHub |

## License

MIT. See [LICENSE](LICENSE).
