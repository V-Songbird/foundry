<div align="center">
  <img src="assets/logo.svg" alt="jetbrains-router" width="120" />
  <h1>jetbrains-router</h1>
  <p><strong>Makes Claude work through your JetBrains IDE — live error detection, reads that see unsaved changes, searches that skip the junk.</strong></p>
</div>

---

## What is this?

Your JetBrains IDE already knows more about your project than Claude does — the changes you haven't saved yet, where the errors are, and which files are just build clutter. jetbrains-router lets Claude tap into all of that. Ask "does this file have errors?" and you get the IDE's answer instantly, instead of waiting on a full build.

## Why you'd want it

- **Instant error checks.** Claude sees the same red squiggles you do — no slow build just to find out what's broken.
- **No stale reads.** Claude looks at what's in your editor right now, including edits you haven't saved.
- **Cleaner searches.** Searches skip `node_modules`, build output, and ignored files — less noise, lower cost.
- **Nothing to set up.** It figures out which IDE you're running and just uses it. When no IDE is open, everything works exactly as before.

## Requirements

You need a JetBrains IDE — WebStorm, IntelliJ IDEA, Rider, PyCharm, and the rest all work — running version 2025.2 or newer, with its MCP Server switched on (Settings → Tools → MCP Server) and connected to Claude Code. That's the one thing this plugin can't do for you.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install jetbrains-router
```

That's it — it starts working the moment a JetBrains IDE is open.

## What you can do

| Command | What it does |
|---------|--------------|
| `/jetbrains-router:status` | Tells you whether it's active and which IDE it's talking to |
| `/jetbrains-router:router` | The behind-the-scenes reference Claude uses to route to your IDE |

## Under the hood

If you're curious, it simply points Claude's reads, searches, and error checks at your running IDE — and steps aside automatically when no IDE is open, so you never have to think about it.

## Good to know

- It works best in the IDE's home language — Kotlin and Java shine in IntelliJ IDEA, C# in Rider. In other IDEs, error checks for those files may come up empty, and Claude simply falls back to a plain text search.
- If your IDE was launched in an unusual way, it might not be detected — in that case routing just stays off and nothing breaks.

## License

MIT — see [LICENSE](./LICENSE).
