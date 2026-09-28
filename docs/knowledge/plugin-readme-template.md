---
type: knowledge
summary: "The front page, section order and voice that the Foreman, Hush and Razor READMEs share, how their host cards follow what each plugin ships, and where their images come from; read before editing or reviewing a plugin README."
related_files:
  - foreman/README.md
  - hush/README.md
  - razor/README.md
  - .claude/agents/plugin-docs-reviewer.md
---

# Plugin README contract

Foreman, Hush and Razor are one family. Each README lives in its plugin's repository, but all
three share one front page, one section order and one voice. Flint is outside the catalogs and
keeps its own layout. Each plugin's `AGENTS.md` holds its own evidence rules; this contract does
not repeat them.

## Front page

Everything above the first section is centered, in this order:

1. The README banner as a `<picture>`: `assets/banner-dark.png` for dark mode,
   `assets/banner-light.png` otherwise, 900 wide, with the plugin's name as alt text.
2. An `<h1>` with the plugin's name, then its promise as one `<strong>` line.
3. `Available on`, then one 80 × 80 host card per host with its label below. Each available
   host is one link to its install section that holds both the card and the label. The card's
   alt text is empty, so a screen reader reads the host's name once. Codex comes first and
   Claude Code second; a new host follows them.
4. The navigation line: Get started, What is this?, How it works, What you can do, Evidence. Each
   entry links to its section, and the plugin's `check-readme-nav.js` checks every anchor.

The host cards follow what the plugin ships, never the reverse:

| Host | The plugin ships for it when | Card |
| --- | --- | --- |
| Claude Code | Its entry is in `.claude-plugin/marketplace.json` | `assets/edition-claude.svg` |
| Codex | Its entry is in `.agents/plugins/marketplace.json` | `assets/edition-codex.svg` |
| Antigravity | Its repository has a root `plugin.json` | `assets/edition-antigravity.svg` |

A plugin that ships for Antigravity shows its card third, after Codex and Claude Code, linking to
its Antigravity install section. A host the plugin does not ship for may keep its card, struck
through, with no link and a one-line note below the cards, as Hush does for Codex. That card's
alt text says the host is unavailable, for example "Codex (not available)", and its note uses the
Foundry README's sentence for that host, such as "Hush has no Codex package." The Foundry
README's plugin table lists the same hosts.

## Sections

The H2 sections, in order:

1. **What is this?** A concrete situation, then what the plugin does about it. The Ember scene
   follows this text: `assets/mascot.svg`, 700 wide, with alt text that tells the scene.
2. **Why you'd want it.** Short benefits.
3. **How it works.** The mechanism, in plain words.
4. **What you can do.** Practical use, with each host-specific command named for its host.
5. **Install.** One H3 subsection per host, headed with the host's name.
6. **Good to know.** Limits and caveats, before any result.
7. **The numbers.** The evidence, in one H3 subsection per host, headed `<Host> results`. Each
   measured table carries its `foundry:evidence` comment, and `assets/hero.svg` and
   `assets/demo.svg` sit here, beside the results they illustrate. Other kit graphics, such as
   Foreman's `paper-trail.svg`, may illustrate the plugin's own guides.
8. **Going deeper.** Links to the plugin's guides and reference pages.
9. **License.**

Install and The numbers list their hosts in the card order: Codex, Claude Code, then a new host.

A `foundry:evidence` comment's `source` names a public page in the plugin's repository, such as
`docs/knowledge/benchmarks.md`. With no such page, the comment has no `source`.

A measured comment carries two dates, written `YYYY-MM-DD`:

- `date` is the day the measurement ran, or `unknown` when no record states it. It stays the same
  while the table shows that run.
- `reviewedAt` is the day the published figures were last reviewed. Set it to the day of any
  change that reviews, cuts or corrects those figures. A comment gets `reviewedAt` with its first
  such change, and has none before that.

## Voice

- Plain, warm and concrete. Short paragraphs; technical depth goes behind links.
- One promise, stated once. No TL;DR that repeats it.
- Tables only for genuinely parallel facts, such as hosts or settings.
- A callout only when it helps a reader decide something.
- Current limits stay visible. A caveat leaves only with the release that resolves it.
- A fair, sourced comparison may name what it measured. Never belittle a real person or project.
- The README never states which version of the plugin is current. It may name the release that a
  published measurement ran on, linked to that release's entry in the plugin's changelog. That
  name stays true after later releases. A minimum version it names must exist in the changelog.
  The README names no other version.

## Images

Every image on the page is a copy of a file in the brand kit, under the names in the
[brand guide](brand.md#copying-into-a-plugin). A new or changed image starts in `brand/`, never in
a plugin's `assets/`. Alt text describes what the image shows; the scene alt tells its story. A
linked host card is the exception: its label names the host, so its alt text stays empty.

A plugin's `assets/` holds the whole identity set, its banners, icons and logos, even the files
this page does not show. Host cards follow the same rule: every host card in the kit sits there,
even one this page does not show. An Ember scene or evidence graphic there must be referenced by
the README or another page in the plugin; remove one that no page references.

## Review

The `plugin-docs-reviewer` agent checks the three READMEs and the Foundry plugin table against
this contract, the catalogs, the manifests and the kit. It reads only, and reports what it could
not verify.
