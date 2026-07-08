<div align="center">
  <img src="assets/logo.svg" alt="foundry" width="240" />
  <h1>foundry</h1>
  <p><strong>Claude Code plugins by Victor Villegas</strong> — tools that make Claude plan better, talk less, build leaner, and stop guessing.</p>
</div>

---

## New here?

[Claude Code](https://code.claude.com/docs/en/overview) is Anthropic's AI coding assistant. **Plugins** extend it — they teach Claude new workflows, add guardrails, or change how it behaves, all with a one-line install and no configuration.

This is a small, curated collection. Each plugin does one job well, works on its own, and stays out of the others' way. Install one, install all six — they compose.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/foundry
/plugin install <plugin-name>
```

The first command registers this collection (once); the second installs whichever plugin you want. Uninstalling is just as easy: `/plugin uninstall <plugin-name>`.

---

## The plugins

### [forge](./forge) — Review the plan before writing the code

Big features fail for the same reason: a problem nobody spotted until the code was already written. Forge investigates first. Describe what you want to build, and a team of parallel AI experts examines your actual codebase, drafts a plan, and an adversarial critic tries to poke holes in that plan — all **before** a single line is written. Nothing gets implemented without your explicit sign-off.

```
/plugin install forge
```

### [verity](./verity) — Real documentation instead of guesses

When you ask Claude how Claude Code itself works, it may answer from training memory — which ages badly. Verity makes Claude fetch the current official documentation live and answer from the source, citing the exact page it read. Install and forget; it kicks in whenever a Claude Code question comes up.

```
/plugin install verity
```

### [foreman](./foreman) — A roadmap for your project, and better prompts for free

Foreman keeps a living task list (`ROADMAP.jsonl`) inside your project: why each task exists, what it is, its status, and the commits that shipped it. Ask "what's next?" and it picks the best next task like a software architect would — then writes a complete, professional prompt to hand that task to a fresh Claude session. It also builds standalone prompts on demand with `/foreman:craft-prompt`.

```
/plugin install foreman
```

### [hush](./hush) — Less chatter, lower cost

Claude can be talkative: progress narration, previews of what it's about to do, walls of command output. Hush trims all of it at the harness level — a forced output style (silence while working, one clear summary at the end), automatic compression of noisy command output before it eats your context window, and a meter that catches mid-turn rambling the moment it starts. Sessions get cheaper and easier to read.

```
/plugin install hush
```

### [razor](./razor) — Stops Claude from over-building

AI assistants love to add: a new dependency here, five helper files there, an abstraction "for later". Razor pushes back with a simple ladder — don't build it if it isn't needed, reuse what exists, prefer the standard library — and backs the words with mechanical gates: the first attempt to install a new package is challenged once, with the project's *actual* installed-dependency list right in the message; file sprawl gets questioned before it lands; and a git-grounded ledger asks, once per heavy session, whether all that new code is really needed. Never a hard block; always one forced second thought.

```
/plugin install razor
```

### [jetbrains-router](./jetbrains-router) — Claude works through your JetBrains IDE

If you code in WebStorm, IntelliJ IDEA, Rider, PyCharm, or another JetBrains IDE, your editor already knows things Claude's native tools don't: which files have errors right now (no build needed), what you've typed but not saved, and which paths are worth searching. jetbrains-router redirects Claude's file reads, searches, and edits through the IDE's MCP server whenever the IDE is running — and steps aside completely when it isn't.

```
/plugin install jetbrains-router
```

### Which one first?

| You want to… | Install |
| --- | --- |
| Plan big features safely | **forge** |
| Get trustworthy answers about Claude Code | **verity** |
| Track project tasks and hand them off cleanly | **foreman** |
| Cut token cost and noise | **hush** |
| Keep the codebase lean | **razor** |
| Use your JetBrains IDE's brains | **jetbrains-router** |

hush and razor are natural partners: hush governs how Claude *talks*, razor governs what it *builds*.

---

## Repository layout

```
foundry/
├── foreman/
├── forge/
├── hush/
├── jetbrains-router/
├── razor/
└── verity/
```

Every plugin lives in its own repo, mounted here as a git submodule (see [`.gitmodules`](.gitmodules)). Each ships its metadata in `.claude-plugin/plugin.json` and carries its own `README.md`, `CHANGELOG.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`; the root copies of the community files govern contributions to this marketplace repo itself. The marketplace index is [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) — it is also the single owner of every plugin's version number (plugin.json files carry no version field).

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

- Bug reports and suggestions: [GitHub Issues](https://github.com/V-Songbird/foundry/issues)
- Security reports: [SECURITY.md](./SECURITY.md)
- Contribution guidelines: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## License

MIT — see [LICENSE](./LICENSE).
