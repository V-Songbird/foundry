# Hestia

**Claude Code's loyal companion — a secretary that keeps the development environment in order so Claude can focus on building.**

Your `CLAUDE.md`, rules, agents, hooks, and skills start strong — then quietly rot: paths drift, rules turn vague, instruction files point at things that no longer exist. Hestia watches all of it for you.

Install it once; it works in the background. Hestia injects standing orders into every session automatically. Run `/hestia:checkup` when you want a full health check.

## What it does

- **Checkup** — One health check of your entire Claude Code setup (`CLAUDE.md`, `.claude/rules`, agents, skills, commands, hooks). You get a ranked, plain-language report of what to fix and a one-tap path to fixing each item.
- **Freshness** — Watches your setup files and gives you a gentle, one-line nudge when something has gone stale. Never edits anything on its own.
- **Lean** — An always-on minimalism doctrine plus on-demand review tools that push for the simplest solution that actually works.

## Install

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install hestia
```

## Quick start

```
/hestia:checkup
```

That's the health-check front door. Run it in any project and Hestia inventories your setup, checks each piece, and hands back a prioritized report. Everything else below is something Checkup can route you to.

## Commands & skills

| You want to… | Use |
| --- | --- |
| Audit your whole setup | `/hestia:checkup` |
| Scan for stale setup files | `hestia:freshness` |
| Grade your rules / CLAUDE.md | `hestia:assess-rules` |
| Write new rules (with live scoring) | `hestia:author-rules` |
| Tidy rule formatting | `hestia:format-rules` |
| Author a skill / agent / command / hook | `hestia:scribe` |
| Check an instruction file is well-formed | `/hestia:proofread` |
| Dial minimalism up or down | `/hestia:lean trim\|lean\|bare\|off` |
| Review a diff for over-engineering | `hestia:lean-review` |
| Scan the whole repo for bloat | `hestia:lean-audit` |
| List deferred shortcuts | `hestia:debt` |

## Read-only by default

Hestia's audits and watchers **never change your files**. Checkup, Freshness, the freshness nudge, the proofreader, and every `lean-*` analysis only look and report. The only skills that write — `author-rules`, `format-rules`, `scribe` — do so when you invoke them directly, and always ask before applying.

## Files Hestia creates

- `.hestia/` — small persistent state (your `lean` intensity, the freshness-nudge throttle marker).
- `.hestia-tmp/` — transient working files during an audit; cleaned up afterward.

Both are local-only and should stay gitignored.

## If you already use ponytail

Hestia's **lean** mode is its own take on the idea ponytail popularized: always push for the simplest solution that works. Both inject guidance at session start, so running them together double-injects overlapping doctrine. If you enable Hestia's lean mode, turn ponytail off (`/ponytail off`, or uninstall it) to avoid the overlap.

## Status

Early alpha (`0.1.0-alpha`) — under active construction. Hestia supersedes the older `rulesense` and `scriptorium` plugins and folds in the planned `virgil` freshness scope. Those plugins remain installable as deprecated stubs that point here.

## License

MIT — see [LICENSE](LICENSE).
