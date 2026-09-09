# Blind idea pass: fml.md → razor / hush

**Date:** 2026-08-17

> **Superseded 2026-08-18** by `rival-idea-pass-2026-08-18.md`, which merges this
> pass with four further sources and adds foreman. That document carries the
> current standing of every candidate below. This file remains the long-form
> detail for its own source.

**Status:** IDEA PASS ONLY. Nothing here is approved, specced, or built. No file
outside this document was touched.
**Scope:** read the whole of fml.md, enumerate every distinct mechanism it uses,
and ask of each one: does razor or hush already have it, and if not, is it worth
owning? Candidates only — every one still needs a decision and most need a
measurement.

## 1. Sources read

| URL | What it is |
| --- | --- |
| `https://fml.md/` | Landing page. Before/after answer pairs, install line, a will/won't contract. |
| `https://fml.md/fml/SKILL.md` | The whole product. ~140 lines of persona rules plus 17 calibration pairs. |
| `https://fml.md/fml/fml.md` | The `/fml` slash command. Six lines. Invokes the skill and pins the persona for the response. |
| `https://fml.md/install` | POSIX `sh` installer. Also served as `install.ps1` for Windows. |

Site meta description: "A Claude Code skill for people without time to read
garbage. extremely professional, brutally short. No comments, no explanations,
no preamble."

## 2. What the thing actually is

A single-persona skill, not a plugin. Two files land on disk:

```
~/.claude/skills/fml/SKILL.md      # the persona
~/.claude/commands/fml.md          # /fml, which invokes it
```

No hooks. No settings. No tests. No manifest. Nothing runs at session start,
nothing watches tool calls, nothing is injected unless the user types `/fml`.
The entire mechanism is: a slash command that says "read the skill and stay in
that persona for your entire response."

That shape matters for the comparison. hush is an always-on output style plus
seven hooks. razor is an always-on injected ruleset plus eight hooks and gates
that can deny a tool call. fml is a per-request costume. It has no way to fire
on a code condition, no way to block anything, and no state. So when a rule of
theirs looks attractive, the question is never "copy the file" — it is "which of
our two delivery mechanisms is the honest home for this rule."

### The rules it carries, enumerated

Grouped, deduplicated, source-ordered.

**Shape of the answer**
- Two modes: asked a question → point at the defect and stop. Asked for a change
  → make it and report it. "Never both."
- One sentence. Two if the first cannot stand alone. Three is a failure.
- No preamble, no summary, no follow-up offer, no bullet recap of own work.
- Cite `path/to/file.ts:42`, always. But a bare citation "is a grunt, not an
  answer" — say what it does now.
- If asked "why?", answer it, still in one or two sentences.
- Uncertain → name the one check you would run, not the list of maybes.

**Word choice**
- Register anchor: "like a message to someone at the next desk."
- Write for a second-language reader. Carries a five-row swap table:
  `the server` not `the upstream`; `the browser asks first with an OPTIONS
  request` not `the preflight`; `it pages from the last row you saw` not
  `keyset pagination`.
- Terms that *are* the answer stay verbatim: `argon2id`, `httpOnly`,
  `--force-with-lease`. What is banned is "a word standing in for an
  explanation."
- "Short does not mean cryptic. If they'd have to ask what you meant, that's two
  round trips, not one."

**Disagreement**
- Say so when the ask will break, leak, or cost a weekend. One correct
  alternative at most, never a menu.
- Then it is their call. Build it. No sandbagging, no I-told-you-so.
- "Wrong means it fails, not that you'd have done it differently. Taste is not a
  blocker."
- Object once. Never the same objection twice.
- "Never argue in place of working" — objection and work ship in one response.

**Access changes** (its own section, "Auth is not a preference")
- A change that widens who can see or do what gets the change *and* one sentence
  naming the consequence.
- Trigger list given explicitly: permission classes, filter backends, guards,
  middleware, CORS, row-level security, IAM policy, `AllowAny`, a dropped
  `.filter(owner=...)`, a token check moved behind a feature flag.
- Phrase it the way they would explain it to their boss: "anyone with the URL
  and no login can pull every customer's export now."
- Warning, not veto. Ships anyway. Does not repeat.
- Asymmetric: widening earns the sentence, tightening earns nothing.

**Code**
- Zero comments in code it writes. "If the code needs a comment, the code is
  wrong."
- No explanation after the edit. "The diff is the explanation."

**Persona control**
- Jokes come first and get four words. Never the joke alone.
- Opening beat (`fine.` `whatever.`) only when there is something to
  acknowledge. "Most answers don't need one."
- Dry sarcasm once, sitting on top of a complete answer, never instead of it.
- Annoyed at the situation, never the person. Never insult, never refuse, never
  withhold the real fix to make a point.
- "Do not perform the persona. No `*sighs*`, no theatrical stage directions."

**Calibration**
- Seventeen worked pairs at the end of the file, one line of user input and the
  exact answer expected.

## 3. Candidates, ranked

| # | Idea | Home | Why it is not already ours |
| --- | --- | --- | --- |
| C1 | Access-widening earns one consequence sentence | razor | razor's security line only says *don't cut*. It is silent when the user asks for the cut. |
| C2 | A question is not a work order | razor | Sits above ladder rung 1. Nothing in either plugin distinguishes diagnose from change. |
| C3 | Name the one check, not the list of maybes | hush | hush bans hedging but never says what replaces it. |
| C4 | Taste is not a blocker | razor | A brake on the ladder's own over-firing. razor has no counterweight to itself. |
| C5 | Personality as a budget, not a costume | hush | hush's presets are full dialect swaps. A metered beat is a different lever. |
| C6 | Will/won't contract as a README section | both | Neither README states what the plugin refuses to do. |
| C7 | One-turn persona, not a session-wide style | hush | `/hush:pick-style` swaps the slot for the session. There is no single-response mode. |
| C8 | A dense calibration block of worked pairs | hush | hush has two ✗/✓ pairs. This carries seventeen. |

## 4. Detail

### C1 — Access-widening earns one consequence sentence

**Home:** razor.

**The gap, quoted.** razor's ruleset ends with:

> Never cut: validation at trust boundaries, error handling that prevents data
> loss, security, accessibility, or anything explicitly requested. If the user
> insists on the full version, build it without re-arguing.

That covers razor deleting a guard on its own initiative. It says nothing about
the user asking for the guard to come off — and the second sentence actively
tells the model to go quiet once they insist. fml's version fills exactly that
hole: ship the change, then one sentence naming who can now do what, once.

**Why razor and not hush.** The trigger is a property of the diff, not of the
report. hush fires on report shape and has no view of what the edit did. razor
already reads tool inputs and already owns the security carve-out.

**Cost shape — this is the interesting part.** razor's ruleset is deliberately
~300 tokens and is injected at every SessionStart and every subagent start.
fml's trigger list alone is longer than a ladder rung. Putting it in `RULESET`
taxes every session for a condition most sessions never hit.

The alternative shape is a conditional hook: a PostToolUse matcher on
`Edit|Write` that only speaks when the changed text matches an access pattern.
That is the same shape as hush's `react` nudge, which is the one measured
exception on the cost-vs-coverage curve — an injection that fires on a detected
condition rather than on a clock. Cheap when quiet, present when it matters.

**Risks.**

- *Priming.* The trigger list is a block of prose describing insecure scenarios.
  The prompt-wording lessons say wording that describes a scenario primes it. A
  literal port of that list could make the model narrate access risk on edits
  that have none.
- *Detection quality.* `AllowAny` and `permission_classes` are Django. Half the
  list is framework-specific. A regex gate that only fires on one stack is worse
  than no gate, because silence then reads as an all-clear.
- *False all-clear.* Any conditional warning teaches the user that no warning
  means safe. That is a real product liability and would need saying out loud in
  the README.

**What would settle it.** A fixture set of edits — half genuinely widening,
half tightening, half neither, across at least three stacks — scored on whether
the sentence appears and whether it names the right consequence. Detection
precision first, wording second. No point testing wording on a gate that misses.

### C2 — A question is not a work order

**Home:** razor.

**The idea.** "If they asked 'why is this broken,' they did not ask you to
rewrite it." Diagnostic questions get a diagnosis and stop. Change requests get
the change.

**Why razor.** This is a cut, and the largest one available: zero code. It sits
one step above rung 1 — YAGNI asks whether the feature is needed, this asks
whether the turn called for an edit at all. razor's whole framing is "the best
code is the code never written," so an unasked-for edit is the purest violation
of it, and the ladder currently does not name it.

**Risks.**

- razor already tells the model to act in the same response rather than ask.
  A too-strong "don't edit" clause could make it stop short on genuinely mixed
  requests like "why is this slow, fix it."
- Users who like proactive fixes would read this as the plugin getting lazy.
  The line between the two is the user's verb, which is not always present.

**What would settle it.** Count unrequested edits on a corpus of purely
diagnostic prompts, with and without the clause, and count missed edits on mixed
prompts as the counter-metric. Both numbers or neither.

### C3 — Name the one check, not the list of maybes

**Home:** hush.

**The idea.** `check the network tab for a 304`, not `it could be caching, or
possibly CORS, or...`.

**The gap.** hush's Register step says "skip empty pleasantries, praise, and
hedging" and "if you would drop a point the moment the user pushed back, drop it
now." Both are subtractive. Neither tells the model what a genuinely uncertain
answer looks like, so under pressure to be short the model has two bad options:
guess confidently, or hedge.

**Why it is cheap.** It is one clause in a file already loaded once per session.
No hook, no detection, no new surface. Lowest-cost item on this list by a wide
margin.

**Risk.** hush has already measured that adding short sentences to the style
file made replies *longer*, not shorter — file density is not a lever that
behaves the way it looks. Any new clause has to be checked against overall
length, not assumed free because it is short.

### C4 — Taste is not a blocker

**Home:** razor.

**The idea.** "Wrong means it fails, not that you'd have done it differently."
Object when the thing breaks. Do not object when you would have picked
differently.

**Why it is worth looking at.** razor is a plugin whose entire job is to push
back on the user's chosen approach. It has "boring over clever" and "note the
swap in one line," but nothing that tells it when *not* to swap. That is a
missing brake on its own mechanism, and razor's own recon history is a list of
places where the ladder fired too eagerly.

**Risk.** Adding a brake to a frozen ladder is not a small edit. The ladder was
frozen at 1.1.3 on purpose and the published benchmark numbers are tied to its
current text. Any word added there invalidates the comparison.

### C5 — Personality as a budget, not a costume

**Home:** hush, `craft-style` and the presets.

**The idea.** Three separate meters, not a dialect:

- jokes come first and get four words
- the opening beat is optional, and "most answers don't need one"
- sarcasm once, on top of a complete answer, never instead of it

**Why it is a different lever.** hush ships Glyph, Rock, Pirate, Sensei. Every
one is a full surface swap — the voice replaces the words. fml keeps ordinary
English and rations personality by word count on top of a complete answer. That
is a mechanic hush's frame does not currently express, and it is the mechanic
that lets a persona be strong without eating the answer.

Relevant history: hush measured that a required opening line is not the thing
that carries a voice, and that the slot is indifferent to its content. fml
independently arrived at "most answers don't need one." That is weak external
agreement with a result already in hand, and it is not evidence.

**Risk.** Unmeasured. hush's presets are all unmeasured too, so the bar for
adding one more is low — but the bar for changing the *stock* style's persona
handling is high.

### C6 — The will/won't contract

**Home:** both READMEs. This is the item the owner already flagged as liked.

The site's section, in structure:

```
TERMS OF ENGAGEMENT

It will                                  It won't
  Give you the file and the line           Comment your code. Ever.
  Answer "why?" in plain words, if asked   Recap what it just did
  Make the change when you ask             Ask if you'd like anything else
  Tell you you're wrong, then build it     Make the same argument twice
  Name who can now do what                 Hide behind jargon to sound short
                                           Insult you
```

**Why it works.** Both columns are short verb phrases. The right column is the
load-bearing one — it is a list of things the tool will *not* do, which is
exactly the information a user cannot get from a feature list. hush's README has
"Why you'd want it" and "Good to know"; neither states a refusal. razor's is the
same shape.

**Why it is nearly free.** It is a docs change. No measurement, no hook, no
token cost, no behaviour change. It is the only item on this list that could be
decided on taste alone.

**Constraint.** The README template's voice rules still apply: no profanity, no
joke at a real project's expense. The source's own list clears both.

### C7 — One-turn persona

**Home:** hush.

**The idea.** `/fml <question>` applies the persona to one response and then it
is gone. Nothing is switched, nothing persists.

**The gap.** hush's model is a session-wide slot. `/hush:pick-style` swaps it,
and the swap is the activation mechanism. There is no "answer this one in Rock"
without living in Rock. That is a real ergonomic gap — a user who wants the
terse voice for one diagnostic question has to change their session to get it.

**Risk.** hush's activation story is already the part users get wrong, and the
README needed a fix in 1.6.1 to explain setting the style at all. A second,
differently-scoped activation path could make that worse rather than better.

### C8 — A dense calibration block

**Home:** hush, stock style and `craft-style`.

**The idea.** Seventeen worked pairs, each one line of user input and the exact
expected answer, covering the boring cases as well as the hard ones — including
`thanks, that worked` → `yep.`

**The gap.** hush's style file has two ✗/✓ pairs plus a shape table. Its
`craft-style` skill builds new styles on the frame, and how many exemplars a
crafted style should carry is not currently specified.

**Why it is not obviously good.** hush has already measured that making the
style file denser does not do what it looks like it does — shorter sentences in
the file produced *longer* replies. Seventeen exemplars is a large addition to a
file whose density has an established non-obvious relationship to output length.
This is a measure-first item, not a taste item.

## 5. Rejected

| Idea | Why not |
| --- | --- |
| Zero comments in code, ever | Conflicts with this repo's own instruction to match the surrounding comment density, and with razor's own source, which is commented throughout. It is also a rule about code quality dressed as a rule about output. |
| Profanity aimed at the code | The public-docs rule bans profanity in the README outright. As a crafted style it is already possible today without any change. |
| One-line pipe-to-shell installer | Both plugins install through the marketplace. A second install path is a support surface, not a feature. |
| Publish the source as raw readable markdown | Already true. Both plugins are public repos. |
| "Like a message to someone at the next desk" | hush already has the same device: "a warm, patient friend talking to someone tired at the end of a long day." Two anchors would fight. |
| Simple-words swap table | hush's "swap, don't gloss" plus the Register checklist covers it. The gloss-vs-swap distinction was already measured and the losing alternative deleted. |
| Cite `file:line` always | hush already has the stronger version: "say what a file says instead of pointing at it." |
| Object once, then build it | razor already has it: "If the user insists on the full version, build it without re-arguing." |
| One-or-two-sentence hard cap | hush's caps are 10 words and 12 lines, and they were arrived at by measurement. A tighter cap was tried at 8 and backfired. |

## 6. Constraints any of this inherits

- **Everything on that site is unmeasured.** There are no numbers anywhere on
  it, no benchmark, no test suite. Every rule is a confident assertion. Under
  this repo's own filter that makes all of it a hypothesis, including the ones
  that read as obviously true.
- **razor's ladder is frozen** and its published benchmark numbers are tied to
  the current ruleset text. C2 and C4 both want to touch it. Either they land
  outside the ladder, or the corpus is re-run.
- **razor's injection is a per-session tax.** ~300 tokens, every session, every
  subagent. A conditional hook is the cheaper shape for anything that only
  applies sometimes — C1 especially.
- **hush's style file has a non-obvious density relationship.** Adding text to
  it has measurably produced longer output. C3 and C8 both add text.
- **Priming is the known failure mode.** Wording that describes a scenario
  primes the model toward it. C1's trigger list is the most exposed to this.
- **Naming.** Under the house rule this source may be named in a plugin README
  and nowhere else. This document is under `docs/`, which is gitignored, so the
  name is fine here and must not travel into a CHANGELOG, commit message, test
  fixture, or code comment.

## 7. If only one thing is done

C6, the will/won't contract, is free and was already wanted.

C1 is the only idea here that fills a real hole in a shipped ruleset rather than
polishing one. It is also the most expensive and the most likely to fail on
detection rather than on wording. The cheap first move is not to write the
sentence — it is to find out whether an access-widening edit can be detected
reliably enough to be worth speaking about at all. If a matcher cannot clear
that bar across three stacks, the rest of C1 is moot and the pass ends there.
