# Hestia

**Claude Code's session companion** — always-on guardrails, on-demand health checks, and truth-grounding before you touch unfamiliar technology.

Your Claude Code setup starts clean. Then `CLAUDE.md` grows stale, rules turn vague, instruction files reference paths that no longer exist, and Claude confidently writes code from outdated training knowledge. Hestia watches all of it — and keeps Claude honest before and while it builds.

## Install

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install hestia
```

Hestia starts working at the next session. No configuration required.

---

## How it works

Hestia runs on two tracks: **always-on** standing orders injected into every session, and **on-demand** skills you invoke when you need them.

### Always on — five standing orders

Every session, every subagent, Hestia injects five standing orders automatically:

| Order | What it enforces |
| --- | --- |
| **Lean** | Ship the smallest change that fully solves the problem. One line before fifty. Never cut validation, error handling, or security — cut the scaffolding around them. |
| **Phase discipline** | Work spanning more than ~3 files or 30 minutes gets a phased breakdown proposed first, not started. |
| **Truth-grounding** | On niche or unfamiliar tech, flag the knowledge gap, collect authoritative sources, and build from them. Training-based confidence is a trap on unfamiliar ground. |
| **Scope control** | Out-of-scope discoveries get parked as `hestia:later <what> — revisit when <trigger>`, not chased inline. |
| **Memory hygiene** | Decisions and their reasoning get saved to memory. Code, file contents, and implementation details do not. |

You don't invoke these. They run.

### On demand — skills

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

---

## Start here

```
/hestia:checkup
```

Run this in any project. Hestia inventories your entire Claude Code setup — `CLAUDE.md`, `.claude/rules`, agents, skills, commands, hooks — checks every piece, and hands back a ranked, plain-language report with a clear path to fixing each item. Every other skill is reachable from Checkup.

---

## Domain terrain prep

Working with a JetBrains plugin SDK? A game server scripting engine? Any technology where Claude's training knowledge might be incomplete or years out of date?

```
/hestia:prepare
```

Hestia assesses its own knowledge gaps honestly, clones the source repository locally, reads the real API surface, and builds pointer-index skills that point directly to the source — not paraphrased summaries that lose detail in translation. If no real gap exists, it says so and stops. Nothing gets built unless the gap is genuine.

---

## Read-only by default

Hestia's audits, watchers, and analysis tools **never modify your files**. Checkup, Freshness, Proofreader, and every `lean-*` skill only observe and report.

The three skills that do write — `author-rules`, `format-rules`, `scribe` — run only on direct invocation and always show you what they intend to create before touching anything.

---

## Files Hestia creates

| Path | Purpose |
| --- | --- |
| `.hestia/` | Persistent state: lean intensity setting, freshness-nudge throttle |
| `.hestia-tmp/` | Transient audit working files, cleaned up automatically |

Add both to `.gitignore`.

---

## Status

`1.0.2-beta` — feature-complete and dogfooded end-to-end across all pillars, including the interactive human-in-the-loop judgment flows. Beta means validated on real projects; stable `1.0.0` follows broader real-world mileage.

Hestia supersedes the `rulesense` and `scriptorium` plugins. Both remain installable as deprecated stubs that redirect here.

---

## License

MIT — see [LICENSE](LICENSE).
