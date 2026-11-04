---
type: knowledge
summary: "Rules for a Claude Code mod that looks and behaves like a native surface: theme colors, the surface's own elements and props, raw colors only inside an Svg with an approved exception, artifacts' theme tokens, no host branding, and visible text in the conversation's language. Each rule names its source and the check that proves it."
related_files: [scripts/check-mod-colors.js, scripts/check-mod-colors.test.js]
---

# Mods that look native

A mod is a hooks module that draws inside Claude Code: a pane, a band above the prompt or a
block in the transcript. A mod looks native when it draws with the host's own system: the
person's theme, the surface's own elements and no copy of the host's identity. These rules apply
to every mod in this repository.

The engine's types are the contract, and this repository does not keep a copy. Load the
`plugin-authoring` skill and it names the types file for the running build: `types/claude-code.d.ts`
beside the skill before a mod loads, or `<mod>/.claude-plugin/types/claude-code/index.d.ts`
after. The line numbers below are from build 2.1.317. In a newer build, search for the named
symbol instead.

## Color comes from a theme key

**Rule.** Every painting prop (`color`, `backgroundColor`, `borderColor`) takes a `ThemeKey`.

**Source.** In `claude-code.d.ts`, `export type ThemeKey` (lines 13650-13657) says a tree that
names one follows the person's theme. `export type Color` (lines 1712-1719) also admits any other
string as a raw color, which a surface draws as it chooses and no theme follows.

**Correct.** `<Text color="success">` or `<Box borderStyle="round" borderColor="warning">`.

**Violation.** `<Text color="red">`, `<Box backgroundColor="#2a78d61a">`, or a hex value held in a
constant and passed to such a prop.

**Check.** `node scripts/check-mod-colors.js --types <claude-code.d.ts> <mod folder>` reads the
`ThemeKey` union from the types file. It fails on any raw color literal in the mod's source, test
files aside, and on a painting prop given a name that is not a theme key.

## Use the surface's elements and props

**Rule.** Take the elements from `$.ui.resolve(e)` and use their own props for emphasis: `dimColor`
for secondary text, `borderStyle` and `borderDimColor` for a frame, and `plain` and `dimColor` on
a `Button`. Do not rebuild them out of colors and characters.

**Source.** The `plugin-authoring` skill, section "A mod in one paragraph": the elements come from
the drawing surface's own table. In `claude-code.d.ts`, the Box border props (lines 900-905) and
the Button `plain` and `dimColor` props (lines 1135-1147), where a desktop draws its native
button either way.

**Correct.** `<Button dimColor plain label="3 tool calls" />`.

**Violation.** A `Text` painted grey with a hex value to imitate a dim row.

**Check.** Review by a person. The color check catches the hex half of the imitation.

## Raw colors only inside an Svg, with an approved exception

**Rule.** A color that only an `Svg` can paint may be raw. Each one is listed in the mod's
exceptions file with its file, values and reason, plus the owner's approval and its date. An
untyped theme key the owner accepts goes in the same list.

**Source.** In `claude-code.d.ts`, `export type SvgProps` (lines 13278-13287): the markup is drawn
isolated, and the desktop draws it as an image, so it cannot read the theme. A mod that draws an
Svg therefore carries one value per theme and shows each under its own color scheme.

**Correct.** A chart palette with a light set and a dark set, used only inside `Svg source`,
listed in the exceptions file and approved.

**Violation.** The same palette passed to a `Box backgroundColor`, or a listed value with no
approval.

**Check.** The same command with `--exceptions <file>`. An unlisted raw color is a violation. A
listed one without `approvedBy` and `approvedOn` fails as pending. A listed value the source no
longer holds fails as stale.

An exceptions file is a JSON object with one `exceptions` array:

```json
{ "exceptions": [
  { "mod": "my-mod", "file": "hooks/register.tsx", "values": ["#184f95", "#6da7ec"],
    "reason": "Svg icon fill, one value per theme", "approvedBy": "owner", "approvedOn": "2026-11-03" }
] }
```

## Artifact and HTML surfaces use theme tokens

**Rule.** A page published as an Artifact defines every color as a token on bare `:root`. It
redefines the tokens for dark mode under `@media (prefers-color-scheme: dark)`, guarded by
`:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]`. Its `body` gets a
token background.

**Source.** The `artifact-design` skill, section "Design both themes", and the Artifact page
contract.

**Check.** Review against the `artifact-design` skill. No mod in this repository draws HTML today.

## No host branding

**Rule.** A mod never imitates the name, logo or marks of Anthropic or Claude. Native means the
host's system, not its identity. A third-party icon keeps its license file beside it.

**Source.** Project rule. Skill icons follow the `skill-audit` skill's
`references/icon-style.md`.

**Check.** Before sharing a mod, search its source and assets for the host's names and marks.

## Visible text follows the conversation's language

**Rule.** Text the person sees in a mod follows the language of the session's conversation, with
English as the fallback. Code, identifiers and comments stay in English. Every visible string has
a test that shows it in both a non-English language and the English fallback.

**Source.** Project rule. The engine's types have no locale API: build 2.1.317's
`claude-code.d.ts` has no `locale` symbol. A mod therefore gets the language from data its hooks
receive, and falls back to English when that data names none.

**Correct.** A fold label that reads "Ejecutó 3 comandos" in a Spanish session and "Ran 3
commands" when the language is unknown.

**Violation.** A label hard-coded in one language, or a translated string with no test.

**Check.** The mod's own tests, run with `claude plugin test <mod folder>`.
