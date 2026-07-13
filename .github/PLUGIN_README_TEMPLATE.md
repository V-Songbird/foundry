<!--
  Shared plugin README template for this marketplace.
  Copy this into <plugin>/README.md, fill the placeholders, and DELETE every guidance comment.
  All plugins here share this lean shape, tone, and style.

  THE GOLDEN RULE: short, and it should sound like a person wrote it, not a pitch deck.
  If a reader sees a wall of text or marketing hype, they won't read it.
  Write for a regular user / "vibe coder", not an engineer. Aim for ~60-110 lines total —
  a little longer than the old bar, because personality needs room to land a line.
  razor/ and hush/ are the reference implementations for voice; foreman/ shows how lean to go.

  VOICE: dry, deadpan, a little irreverent — like a sharp friend explaining this over a drink,
  not a marketing brief. Modeled on the TRIP-workflow README's tone (self-aware about how
  AI-coding-tool README hype usually sounds, happy to poke fun at the pattern it's part of,
  short punchy sentences, the occasional rhetorical aside). A couple of house adjustments to
  that model, non-negotiable:
    - NEVER name a competitor plugin/product by name (TRIP's README does this — ours doesn't).
      Contrast with a generic category ("a plugin that just tells the model to be brief") and
      sell on our own merits instead.
    - No profanity. Dry and irreverent, not crude.
    - Self-deprecating humor about the PROBLEM ("AI assistants love to add things") or about
      the genre of README this is ("does it actually work, or is this vibes") is fair game.
      Don't make the joke at a real project's or a real person's expense.
  Still no jargon in the plain-language sections (no "context traffic", "PreToolUse", "n=6",
  "tokens", schema/field names) — a joke about jargon is fine, actual jargon isn't.

  House rules:
  - Keep ONLY what a user actually wants to read. Cut mechanism deep-dives, reference tables
    (schemas, hook internals, exhaustive config), comparison tables, and any "Tests" section
    (testing lives in CONTRIBUTING.md). Deep detail stays in the code / a linked schema doc.
  - Sections marked (optional) may be dropped when they don't apply.
  - Badges: License (static, never goes stale) and a "Works with Claude Code" badge are fine.
    Do NOT hard-code a version number badge — this marketplace's single source of truth for
    version is the root `marketplace.json` (see CONTRIBUTING.md), and a version baked into the
    README would drift the moment it's released. If you want a version badge, it has to read
    the number dynamically (e.g. from a shields.io endpoint) — otherwise leave it out.
  - The logo needs two files: `assets/logo.svg` (dark fill, shown in light mode) and
    `assets/logo-dark.svg` (identical artwork, fill swapped to white, shown in dark mode).
    The `<picture>`/`<source media="prefers-color-scheme">` markup below picks the right one.
  - For a caveat that deserves visual weight (an honest limit, a non-destructive guarantee),
    use a GitHub alert (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`) instead of an italic aside —
    matches how the plain-language sections already read at a skim. Sparingly: 1-2 per README.
    Reserve `[!WARNING]`/`[!CAUTION]` for real risk (data loss, a destructive command) — a cost
    or scope caveat is a `[!NOTE]`, not a warning.

  ---
  VOICE REFERENCE (verbatim, unedited). The VOICE paragraph above is a paraphrase — this is the
  actual source it's modeled on, so a specific line's tone can be checked against the real thing
  instead of a summary. This is the TRIP-workflow README (github.com/PiLastDigit/TRIP-workflow).
  Two house adjustments apply on top of it, non-negotiable, repeated from VOICE above: never name
  a competitor plugin/product by name, and no profanity. Everything else — the self-aware asides,
  the short punchy sentences, the willingness to poke fun at the genre of README this is — is fair
  game to draw from. Delete this whole appendix along with the rest of this comment on copy; it
  is reference material for calibrating tone, never content that ships in a plugin's README.

![TRIP Workflow Banner](assets/trip-workflow-banner2.png)

![Version](https://img.shields.io/badge/version-2.1.0-blue) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/PiLastDigit/TRIP-workflow/blob/master/LICENSE) ![Works with](https://img.shields.io/badge/Works_with-grey) [![Claude Code](https://img.shields.io/badge/Claude_Code-E5582B)](https://docs.anthropic.com/en/docs/claude-code) [![Codex CLI](https://img.shields.io/badge/Codex_CLI-10A37F)](https://developers.openai.com/codex/cli/) [![OpenCode](https://img.shields.io/badge/OpenCode-1a3a5c)](https://github.com/sst/opencode) [![Mistral Vibe](https://img.shields.io/badge/Mistral_Vibe-F7D046)](https://github.com/mistralai/mistral-vibe)

## What is TRIP?

A structured development workflow for AI coding agents that brings **memory**, **consistency**, and **reduced hallucination** (only humans should) to AI-assisted development. TRIP helps you enter flow state and eat features like buttered noodles.
It is also the acronym (reversed) of the historical 4-phases development cycle: **P**lan, **I**mplement, **R**eview, **T**est.  
**Note:** Since v2.0.0 the flow is even simpler **Plan → Implement → Release** — review and test moved *inside* Implement as a testing gate and an automatic Codex review loop, every feature passes through all 4 phases with fewer commands.

TRIP was initially designed for Claude Code using the [Agent Skills](https://agentskills.io/home) open standard (`SKILL.md`). Also compatible with OpenCode, Codex CLI, Mistral Vibe and more.

## Why TRIP?

There are tons of AI coding workflows out there like [Superpowers](https://github.com/obra/superpowers), [BMAD](https://github.com/bmad-code-org/BMAD-METHOD), [Gastown](https://github.com/steveyegge/gastown) and countless others. They might be powerful, but overwhelming for many of us dumb asses.

Even the "simple" ones come with:

- 47 different commands & skills to memorize
- Sub-agents swarm for God-knows-what
- Mutlti-chapters courses (sometimes paid lol)

**TRIP is different.** It's deliberately minimal:

| That's it           | Just these                                             |
| ------------------- | ------------------------------------------------------ |
| `/TRIP-1-plan`      | Think before you code (Codex reviews the plan)         |
| `/TRIP-2-implement` | Codex writes, you review, tests gate, Codex re-reviews |
| `/TRIP-3-release`   | Version, changelogs, docs, commit, tag, merge, push    |

![TRIP Workflow loop](assets/trip-workflow-loop2.png)

Three numbered skills. One architecture file. Zero PhD required.

The onboarding is: copy the folder, run init, start coding. If you can count to 3, you can TRIP.

It was kept stupid simple because **the goal is to ship features, not to master a workflow**. The workflow should disappear into the background, not become a project of its own.

## Getting Started

1. Copy the `skills/` folder contents to your repo's `.claude/skills/` or whatever
2. Run `/TRIP-init [YourProjectName]`
3. Follow the interactive prompts
4. Review and approve the generated ARCHI.md

### Additional For Mistral users (if they exist)

Also copy `AskUserQuestion/` to your agent `/skills/`, it provides the `AskUserQuestion` tool that TRIP workflow rely on.  

Et voila ! Start using the skills like `/TRIP-1-plan auth for this webapp`, `/TRIP-2-implement @auth-plan.md`, etc.

https://github.com/user-attachments/assets/d37bbc60-1868-4fa8-9be6-083b60d6a53d

## The Heart of TRIP: ARCHI.md

The `ARCHI.md` file is the **central nervous system** of this workflow. It serves as the AI agent's **long-term memory** of your codebase.

### Why ARCHI.md Matters

**1. Persistent Context Across Sessions**

AI agents have no memory between sessions. Every new conversation starts from zero. ARCHI.md solves this by providing a comprehensive, always-up-to-date snapshot of your architecture that the agent reads at the start of each task. Unlike tool-specific files like `CLAUDE.md` or `AGENTS.md`, ARCHI.md is purely about architecture. It's tool-agnostic, so it works with any agent. You can still reference it from your `CLAUDE.md` to include it in all conversations.

**2. Token Savings & Reduced Hallucination**

Without ARCHI.md, your agent must glob, grep, and read multiple files to piece together the architecture from scratch for every single session. This wastes tokens and leads to guessing: _"There's probably a utils folder..."_, _"This project likely uses Redux..."_. ARCHI.md eliminates both problems. The agent gets the full picture in one read for minimal exploration & hallucination.

**3. Balanced Detail vs Token Usage**

ARCHI.md is designed to be:

- **Detailed enough** to provide meaningful context, **concise enough** to not waste tokens
- **Structured** for quick navigation
- **Updated** after every architectural change

It's not a dump of your entire codebase, rather a curated architectural guide.

## The Init Process

The `TRIP-init` skill is a **script written in human language** that programmatically bootstraps the TRIP workflow in any repository.

### What Init Does

1. **Creates the docs structure** - Folders for plans, changelogs, reviews, tests, memos
2. **Explores your codebase** - Identifies languages, frameworks, patterns, conventions
3. **Classifies your project** - Web frontend? CLI tool? Embedded firmware? Library?
4. **Generates ARCHI.md** - Tailored to your specific project type
5. **Customizes the skills** - Replaces placeholders with your project's specifics

### The Placeholder System

The generic TRIP skills contain placeholders like:

- `[PROJECT_NAME]` - Your project's name
- `[VERSION_FILE]` - Where your version is stored (package.json, Cargo.toml, etc.)
- `[ADAPT_TO_PROJECT: ...]` - Sections to customize

Init walks you through questions and replaces these placeholders based on your answers, creating a workflow tailored to your project.

## More Skills

### `/codex-implement`

Implementation delegated to Codex CLI in a **workspace-write sandbox**: it reads the approved plan, edits the working tree, runs your lint/build, and reports back with a completion tag. Your main agent then self-reviews the diff and fixes issues directly. Persistent thread per plan, so multi-phase plans resume with full context. Integrated into TRIP-2-implement as the default implementation path.

### `/codex-plan-review` & `/codex-code-review`

Iterative review loops powered by Codex CLI. Plans get a second-opinion review before the user sees them. Code gets reviewed against the plan and a shared checklist after implementation. Both use persistent thread state for multi-round convergence (`start → REQUEST_CHANGES → fix → resume → APPROVED`). Integrated directly into TRIP-1-plan and TRIP-2-implement (after the testing gate).

Per-flow model defaults (implementation vs reviews) live in one file — `codex-plan-review/scripts/_common.sh` — and can be overridden per run via `CODEX_MODEL` / `CODEX_EFFORT` env vars.

### `/TRIP-review` & `/TRIP-test`

The former steps 3 and 4, reborn as on-demand support skills: `/TRIP-review` is the manual fallback/audit review (same checklist as the Codex loop — single source of truth), `/TRIP-test` is the deep test-authoring reference with a seam ladder and a coverage-debt ledger for hard-to-test code.

### `/TRIP-upgrade`

Upgrades an existing project's TRIP skills to a newer version without losing project customizations. Extracts your project-specific content (test commands, checklist sections, technical considerations, version file paths), applies the new workflow skeleton, and re-injects the customizations. Copy the new skills to `new-TRIP/`, run the skill, done.

### `/codex-ask`

A grounded second opinion on **anything** — architecture calls, debugging hypotheses, research conclusions. Codex answers from inside the repo (read-only), threaded per topic for multi-round discussion. Advisory only: no verdict tags, nothing gated. TRIP-research uses it to red-team decision-grade findings before presenting them.

### `/TRIP-hotfix`

Streamlined workflow for production emergencies. Bypasses full TRIP for genuine crises (or lazy debugging).

### `/TRIP-research`

Exploratory investigation with defined compute level. For feasibility studies and technology evaluation. Produces documented findings, not production code.

### `/TRIP-compact`

Run this skill to compact ARCHI.md size while preserving relevance, accuracy, and coverage through summarization and restructuring. Token calculator script included.
As a rule of thumb, ARCHI.md should not exceed ~10% of context window.

## Multi-Agent: Using Different LLMs at Different Steps

![TRIP Workflow multiLLM](assets/trip-workflow-multiLLM4.png)

Just like you wouldn't smell your own fart, an LLM is unlikely to catch bugs in its own implementation. Some people conduct adversarial review with a different session but still the same model, which is..._meh_. The best approach is to introduce a different model in the same reasoning ballpark as the first one, that will most likely catch what the other missed.

As of v2.0.0, this multi-agent approach is **the default workflow**.  
Considering Claude as your main and Codex as the copilot:  
Fable writes the plan, 5.6 Sol reviews it, Luna implements, back to Fable who reviews and fixes the diff, runs the testing gate, then a new Sol thread reviews again the code. All in one claude code session. Writer and reviewer are never the same thread.  
As of mid july 2026, this Fable + GPT5.6 harness combo is absolute peak.

## MCP Servers: Less Is More

Last piece of advise before your new coding quest: Every MCP server you add is extra context, extra latency, and extra confusion. Keep it minimal. The one use case where MCP genuinely shines is **up-to-date documentation**, so your agent stops hallucinating deprecated APIs/whatever. Two servers cover it: [Context7](https://github.com/upstash/context7) for current library & framework docs, and [Exa](https://github.com/exa-labs/exa-mcp-server) for web search when the answer isn't in any doc. No bloat beyond that.

## Contributing

PRs & forks are welcome

Happy tripping ! 🍄
  ---
-->

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg" />
    <img src="assets/logo.svg" alt="<plugin>" width="240" />
  </picture>
  <h1><plugin></h1>
  <p><strong><!-- one-line value prop: a blunt clause + its consequence, plain language --></strong></p>
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE) [![Claude Code](https://img.shields.io/badge/Claude_Code-E5582B)](https://docs.anthropic.com/en/docs/claude-code)

---

## What is this?

<!-- 2-3 short plain sentences. Open with the pain the user already feels, then what the plugin
     does about it. No mechanism, no jargon. -->

## Why you'd want it

<!-- 3-4 bullets, each a **bold lead-in** + one sentence. Benefits the user feels, not features. -->

- **<benefit>.** <one sentence>

## How it works

<!-- (optional — only when the plugin has a real set of distinct triggers/moments worth naming, e.g.
     razor's gates or hush's compression points.) A short 2-row-to-6-row table — "Moment" / "What
     happens" — reads faster than bullets and gives the section its own visual shape. Bullets are
     fine too if a table feels forced for your plugin. Still zero jargon — no hook names, no env
     vars, no schema. Skip this section entirely if "Why you'd want it" is already trigger-framed
     (e.g. "After each commit, it notices X and records it") — don't add a section that just
     restates the bullets above. razor and hush are the reference implementations. -->

| Moment | What happens |
| --- | --- |
| <trigger/moment> | <what happens, one sentence> |

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/foundry
/plugin install <plugin>
```

<!-- one line: when it takes effect; "nothing to configure" if true; any one-time step, stated simply -->

## What you can do

<!-- (optional — only if the plugin has user-facing commands/skills.) A compact table, nothing more.
| You want to… | Command |
| --- | --- |
| <plain outcome> | `/<plugin>:<command>` |
-->

## Benchmarks

<!-- (optional — razor/hush only, or any plugin with REAL head-to-head data; drop it entirely
     rather than inventing numbers.) A MARKETING SHOWCASE in the same friendly voice as the top of
     the README, NOT a lab report. Lead with the HERO: one headline number (an aggregate you can
     defend — e.g. mean cost across the suite), stated up top and shown as the first chart, framed
     against the alternative ("~25%, roughly 5x what 'just be brief' manages"). Then, in order:
       1. Hero chart + the headline sentence.
       2. A "why" chart (what the reader was missing — e.g. reads dwarf the reply), 1-2 sentences.
       3. One or two TASK highlights that show the strongest capability, a chart each.
       4. THE HONEST TABLE: every task, every arm, wins AND ties/losses, cheapest per row in bold,
          an Average row bolded for your plugin. Disclosing the losses is the trust lever — a deck
          that only shows wins reads as cherry-picked. Add ONE `> [!NOTE]` naming where it wins vs
          where it's neutral/loses.
       5. A plain "how we tested" line (real multi-turn sessions, costs from the API, numbers move
          a few percent between runs).
     Charts: committed SVGs a non-technical reader gets at a glance — pill bars on soft tracks, big
     value labels, one accent colour for your plugin, a top-right stat badge, a one-line takeaway
     footer. Make them THEME-AWARE with an internal <style> + `@media (prefers-color-scheme:dark)`
     so they read in GitHub light and dark (see hush/assets/bench-hero.svg as the reference). Keep
     text left-anchored and inside the viewBox; there's no live renderer here, so estimate widths.
     Only claim numbers you can defend; never headline an underpowered (n<~6) result. GitHub renders
     repo SVGs via <img src="assets/..."> (the logo proves it). -->

## Under the hood

<!-- ONE short closing sentence, plain language — a pointer to the code / a schema doc (NOT a
     restatement of "How it works" above), plus the "pairs with" cross-link if there's a sibling
     plugin: "<one-line pointer, e.g. 'Every check above fires as Claude works'> — read the
     plugin's files if you want the exact mechanics. Pairs naturally with
     [<sibling>](https://github.com/V-Songbird/<sibling>): …". If the whole section would just
     repeat "What is this?" or "How it works", drop it. -->

## Settings

<!-- (optional — only if there are user-relevant knobs.) Lead with "Most people never touch these".
     A compact table, <=5 rows, everyday wording — not every env var.
| Variable | What it does |
| --- | --- |
| `<PLUGIN>_<VAR>` | <plain effect> |
-->

## Good to know

<!-- (optional) 1-3 short, user-facing gotchas only — the things a user might actually hit.
     Not developer-only caveats. -->

- <gotcha>

## License

MIT — see [LICENSE](./LICENSE).
