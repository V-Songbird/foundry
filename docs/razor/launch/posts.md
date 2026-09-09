# razor launch posts

Drafts, 2026-09-04. Post them yourself, from your own accounts. Space them a
week after the hush posts so the two do not compete for the same readers.

## Show HN

**Title** (80 chars max):

    Show HN: Razor – a Claude Code plugin that asks "do we need this?" before it adds code

**Text:**

You ask Claude Code for one small feature and get a new library, five helper
files and an abstraction for a future that never arrives. It all works. It is
also now yours to maintain.

razor is a plugin that hands Claude a short checklist to run before it writes
anything: do we need this at all, is it already in the codebase, does the
language do it for free. Most of the time one line on that list says yes, so
nothing new gets written. It also gates package installs: a throwaway "just
use axios" no longer puts axios in your project when fetch is right there.

Measured on Claude Opus 5, 39 real sessions per setup, same jobs, tests run
at the end: plain Claude Code came out clean (right, and no package added) in
35 of 39 sessions, razor in 39 of 39, and razor wrote about half the lines
for the same result (9.6 vs 18.3 on average). Over a five-request session the gap grows:
136 lines in the project without razor, 58 with it, everything passing both
ways.

Where it loses: it does not make code more readable, and the savings are
smaller on Sonnet. The README says so, with the tables.

https://github.com/V-Songbird/razor

## r/ClaudeAI

**Title:**

    I built a plugin that stops Claude Code from adding a library for a one-liner

**Text:**

The thing that made me build it: I typed "just use axios" without thinking,
in a Node project that did not have axios. Claude installed it. Node has had
fetch built in since v18.

razor runs a short "do we need this?" check before Claude writes anything,
and it blocks package installs unless the check says the package earns its
place. In the README there is a replay of that exact ask, side by side: the
file Claude wrote without the plugin, reaching for axios, next to the one it
wrote with the plugin, using fetch.

Install:

    /plugin marketplace add V-Songbird/foundry
    /plugin install razor@foundry

It also has `/razor:unused`, which lists the dependencies in your manifest
that nothing imports any more.

Honest bit: it does not make code prettier, and on Sonnet the savings are
smaller than on Opus. Numbers, wins and losses, are on the page.

https://github.com/V-Songbird/razor

## X

"just use axios" → Claude installs axios. Node has fetch.

razor makes Claude Code ask "do we even need this?" before it adds a
package, a file, or an abstraction. Same job, about half the lines.

Side-by-side replay in the README: https://github.com/V-Songbird/razor

## Reply ammo

If someone says "just write a CLAUDE.md rule": we did, and it slips after a
few turns. razor's check is a hook, so it fires every time, and the install
gate is a permission deny, not a suggestion. The plain-text version of the
rule is at https://github.com/V-Songbird/flint for anyone who wants it anyway.

If someone asks about false positives: it asks, it does not refuse. If the
package really earns its place, say so and it goes in.
