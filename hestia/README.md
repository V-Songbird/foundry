<div align="center">
  <img src="logo.svg" alt="Hestia" width="120" />
  <h1>Hestia</h1>
  <p><strong>Claude Code's session companion</strong> — always-on guardrails, on-demand health checks, and truth-grounding before you touch unfamiliar technology.</p>
</div>

Your `CLAUDE.md` starts clean. Then rules turn vague, instruction files reference paths that no longer exist, and Claude confidently writes code from outdated training knowledge. Hestia watches all of it — and keeps Claude honest before and while it builds.

---

## ⚡ Install

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install hestia
```

> [!TIP]
> Hestia starts working at the next session. No configuration required.

---

## 🧩 How it works

Hestia runs on two tracks: **always-on** standing orders injected into every session, and **on-demand** skills you invoke when you need them.

### Always on

> [!NOTE]
> Standing orders are injected automatically into every session and every subagent. You never invoke them — they run.

| Order | What it enforces |
| --- | --- |
| ⚡ **Lean** | Ship the smallest change that fully solves the problem. One line before fifty. Never cut validation, error handling, or security — cut the scaffolding around them. |
| 📋 **Phase discipline** | Work spanning more than ~3 files or 30 minutes gets a phased breakdown proposed first, not started. |
| 🔍 **Truth-grounding** | On niche or unfamiliar tech, flag the knowledge gap, collect authoritative sources, and build from them. Training-based confidence is a trap on unfamiliar ground. |
| 🚧 **Scope control** | Out-of-scope discoveries get parked as `hestia:later <what> — revisit when <trigger>`, not chased inline. |
| 🧠 **Memory hygiene** | Decisions and their reasoning get saved to memory. Code, file contents, and implementation details do not. |

### On demand

<details>
<summary>View all skills</summary>

<br>

| You want to… | Invoke |
| --- | --- |
| Full health check of your Claude Code setup | `/hestia:checkup` |
| Prep Claude for a niche or unfamiliar domain | `/hestia:prepare` |
| Scan for stale setup files | `/hestia:freshness` |
| Grade your rules and CLAUDE.md quality | `/hestia:assess-rules` |
| Write new rules with live quality scoring | `/hestia:author-rules` |
| Fix rule formatting | `/hestia:format-rules` |
| Author a skill, agent, command, or hook | `/hestia:scribe` |
| Validate an instruction file is well-formed | `/hestia:proofread` |
| Dial lean enforcement up or down | `/hestia:lean trim\|lean\|bare\|off` |
| Review a diff for over-engineering | `/hestia:lean-review` |
| Scan the whole codebase for bloat | `/hestia:lean-audit` |
| See all deferred shortcuts | `/hestia:debt` |

</details>

---

## 🚀 Quick start

```
/hestia:checkup
```

Run this in any project. Hestia inventories your entire Claude Code setup — `CLAUDE.md`, `.claude/rules`, agents, skills, commands, hooks — checks every piece, and hands back a ranked, plain-language report with a clear path to fixing each item. Every other skill is reachable from Checkup.

---

## 🗺️ Domain terrain prep

Working with a JetBrains plugin SDK? A game server scripting engine? Any technology where Claude's training knowledge might be incomplete or years out of date?

```
/hestia:prepare
```

Hestia assesses its own knowledge gaps honestly, clones the source repository locally, reads the real API surface, and builds pointer-index skills that point directly to the source — not paraphrased summaries that lose detail in translation.

> [!IMPORTANT]
> Nothing gets built unless the gap is genuine. If no real knowledge gap is found, Hestia says so and stops.

---

## 🔒 Read-only by default

> [!NOTE]
> Hestia's audits, watchers, and analysis tools **never modify your files**. Checkup, Freshness, Proofreader, and every `lean-*` skill only observe and report.

The three skills that do write — `author-rules`, `format-rules`, `scribe` — run only on direct invocation and always show you what they intend to create before touching anything.

---

## 📁 Files Hestia creates

| Path | Purpose |
| --- | --- |
| `.hestia/` | Persistent state: lean intensity setting, freshness-nudge throttle[^1] |
| `.hestia-tmp/` | Transient audit working files, cleaned up automatically |

[^1]: Add both paths to `.gitignore` — they are local-only and should not be committed.

---

## 🏷️ Status

`1.0.2-beta` — feature-complete and dogfooded end-to-end across all pillars, including the interactive human-in-the-loop judgment flows. Beta means validated; stable `1.0.0` follows real-world mileage across diverse projects.

Hestia supersedes the `rulesense` and `scriptorium` plugins. Both remain installable as deprecated stubs that redirect here.

---

## License

MIT — see [LICENSE](LICENSE).
