# hush silence campaign — 2026-07-19

**Status:** HISTORICAL — banner added 2026-08-18. The campaign's durable finding
(delivery beats wording) still holds and is the reason `silence-nudge.js` exists,
but the mechanism it measured is not what ships: since 1.5.0 the default is one
turn-top reminder plus a leak-triggered corrective, and the doubling this campaign
tuned survives only under `HUSH_NUDGE=max`. Read for the finding, not for the
cadence. The current account of hush's open work is
`hush-consolidation-2026-08-18.md`.

Goal: drive mid-turn narration to zero for hush alone and hush + razor, on Haiku
and Sonnet. Nine headless batches, 1,536 runs, every one ground-truth correct.

Harness: `benchmarks/hush/experiments/voice-comparison/runner/run.js` (gitignored). Tags `sil1`–`sil9h`, plus
`verdictfix` from the roadmap-077 attempt that opened the campaign. Variants are
full plugin-dir copies under the session scratchpad; each arm force-delivers its
style via `force-for-plugin` and, where named `r*`, also loads razor.

## What the leak actually is

Not a style-compliance failure in general — one specific behavior. After the
tool results that reveal a bug, the model writes a standalone assistant message
containing the diagnosis, then a separate message with the edit:

```
assistant: tool:Read
  user: tool_result
assistant: TEXT[Bug: `isExpired` uses `<` instead of `<=`, so a token expiri…]
assistant: tool:Edit
```

Every leak in the campaign is that shape or a near cousin — `Root cause is…`,
`Confirmed:…`, `Found it:…`. Two consequences:

- The text is its own message, not a preamble bundled with a tool call. The last
  hook that can reach the model before it writes is the **PostToolUse of the
  preceding read**. That is why the winning mechanism lives there.
- Debug-shaped tasks provoke it; explain/build-shaped tasks do not. `bugfix-expiry`
  and `checkout-bug` carry the whole signal, which is why later rounds use only
  those two.

## Baseline (shipped 0.10.0-alpha style, no hook)

Leak rate = share of runs with any mid-turn text.

| Model | hush alone | hush + razor |
|---|---|---|
| Sonnet | 13/32 (41%) | 21/32 (66%) |
| Haiku | 3/32 (9%) | 2/32 (6%) |

razor roughly doubles the Sonnet rate. It does not cause it — hush alone leaks
heavily on Sonnet too. razor's contribution is its own instruction to "say so in
one line" / "note the swap in one line", which adds a second leak flavor:
short design asides on top of the diagnosis lines.

## Result (shipped config)

| Model | hush alone | hush + razor |
|---|---|---|
| Sonnet | 7/128 (5.5%) | 8/128 (6.3%) |
| Haiku | 0/32 (0%) | 1/32 (3%) |

Cost, output tokens, and correctness are unchanged throughout. Haiku alone is
fully silent. Sonnet is down roughly 90% but has a floor of a few percent.

## Levers, in the order they were tested

### 1. Style wording alone — NULL (tag sil1, 128 runs)

Three independent edits to `output-styles/hush.md`, each measured solo and with
razor:

| Lever | Sonnet solo | Sonnet + razor |
|---|---|---|
| control | 6/16 | 10/16 |
| delete the ✗ example list | 7/16 | 12/16 |
| reframe "break silence at most once" as stop-and-ask | 6/16 | 11/16 |
| both | 5/16 | 11/16 |

All inside noise. This is the third independent refutation of style-wording as
the lever for this behavior (see also roadmap 077, and the `tablewhy`/`bulletwhy`
whole-register findings). **Do not open another round of clause edits.**

### 2. Hook-delivered directive — THE LEVER (tag sil2, 128 runs)

Same rule, delivered as `hookSpecificOutput.additionalContext` instead of style
prose:

| Placement | Sonnet solo | Sonnet + razor |
|---|---|---|
| control | 7/16 | 11/16 |
| UserPromptSubmit only | 8/16 | 11/16 |
| PostToolUse only | 6/16 | 7/16 |
| both | 5/16 | 4/16 |

UserPromptSubmit alone does nothing; it is too far from the moment. PostToolUse
carries the effect, and the pair beats either. Both placements shipped.

### 3. Wording and delivery COMPOUND (tag sil3, 128 runs)

The style edits that measured flat on their own became real once the hook was
also present — same style bodies, 2/16 → 1/16 solo and 2/16 → 1/16 paired. The
composed style body shipped for this reason, not on its own evidence.

Interpretation: the style sets what the model considers normal; the hook decides
what it does at the moment of writing. Neither substitutes for the other.

### 4. Nudge wording (tags sil3–sil6)

Best to worst, pooled across rounds:

1. `your next output is a tool call. The final message is the only place you explain anything.` — **shipped**
2. `your next output is a tool call. Everything you have learned goes in the final message.`
3. `not finished — your next output is a tool call. …`
4. `your next output is a tool call. The final message is the only place you explain, confirm, or comment on anything.`
5. `not done yet — next output is a tool call.`
6. `nothing else reaches the user until the work is done.`

Naming the concrete next action (a tool call) beats describing the state. Adding
verbs for the residual leak classes ("confirm, or comment") measured *worse*,
consistent with the standing rule that naming a behavior primes it.

### 5. Repetition — real, and non-monotonic (tags sil6, sil7)

Stating the same sentence twice in one injection, Sonnet:

| Repetitions | solo | + razor |
|---|---|---|
| 1× | 1/32 | 5/32 |
| 2× | 0/32 | 1/32 |
| 3× | 2/32 | 5/32 |

Two is the optimum and is locked by a test. Three is measurably worse than two —
do not assume more emphasis is more binding.

### 6. Levers that measured flat — do not re-run

| Lever | Tag | Result |
|---|---|---|
| PreToolUse as a third channel | sil4 | no change |
| directive embedded in the tool result body via `updatedToolOutput` | sil8 | no better than adjacent context; compression survived intact |
| doubling the UserPromptSubmit injection | sil8 | no change |
| style opening line reworded to mirror the nudge sentence | sil9 | no change |
| deleting the ✗ example list | sil1 | no change |

## Crafted styles keep the silence

A deliberately different voice (flat machine register, every non-verbatim section
rewritten, `verify-style.js` clean) measured 0/32 solo and 2/32 paired — level
with stock in the same batch. The silence lives in the hook, which is plugin-side,
so it cannot be edited away by a user's voice.

## Voice does not transfer; structure does (tag styles1, 56 runs)

Seven arms — stock, two crafted machine-voice styles, and all four shipped
presets — force-delivered with the silence hook, sonnet n=4 on both debug tasks.
All 56 runs correct. Silence held everywhere: 0/8 for stock, `robo2`, `rock` and
`sightline`, 1/8 for `chalkline`, `pirate` and `robo1` — no preset weakens it.

Voice transfer is a different story. Marker present in the final message:

| Style | Directive | Marker | Hit |
|---|---|---|---|
| `sightline` | end every report with a `**Check:**` question | `**Check:**` | **8/8** |
| `pirate` | "write in the voice of a ship's log", listing course/heading/haul/deck/log | any of those words | 0/8 |
| `robo2` | "every word that is not an identifier in uppercase" | any ALLCAPS run | 0/8 |
| `robo1` | none — voice only imitated in the prose | any ALLCAPS run | 0/8 |

So the roadmap-079 fix — name the voice outright — **does not achieve voice
transfer**. Two styles named their voice as explicitly as language allows, one
even enumerating the vocabulary, and neither reached the reply. It is kept
because it costs nothing and is a precondition, not because it works alone.

What does survive is a **concrete element the model can check it produced**: a
required closing line, a fixed opening form, a named section. `sightline`'s
`Check:` line landed in every single run. This is the same lesson as the rest of
the campaign — descriptive wording in the style body barely binds, and a
structural requirement does. `craft-style` now says to turn the voice into at
least one requirement of that kind.

Not covered: `chalkline`'s ask-before-committing behavior. Both fixtures are
fully specified, so it had nothing to ask, and `AskUserQuestion` is not reachable
in a headless run.

## Methodology notes worth keeping

- **Multi-turn tasks over-report narration** in any per-file parse. `run.js`
  parses each call separately and is correct; a script that parses the joined
  transcript counts turn 1 and 2 deliverables as narration. `repo-onboarding`
  looked catastrophic under the wrong parse and is fine under the right one.
- **`cat` through a hush-enabled session elides lines.** A partial read of
  `tests/verify_style.test.js` hid the shipped-preset tests and produced a broken
  commit-in-progress. Use Read for files.
- **Presets are part of the invariant surface.** `styles/*.md` must carry the
  canonical Mid-turn silence verbatim; changing that section means updating all
  four presets in the same change. The test suite catches it.
- n=8 per cell resolves a 40% rate; it cannot distinguish 0% from 3%. The low-end
  claims here pool 4 batches at n=16–32.

## The MessageDisplay channel — checked and ruled out

`claude.exe` 2.1.215 exposes a `MessageDisplay` hook that accepts
`hookSpecificOutput.displayContent`, described in the binary as "Text displayed
in place of the delta" and "Display-only: replaces the delta on screen without
changing the stored message… the stored message and what the model sees are
untouched." It looked like the one channel that could force absolute silence.

It cannot. Two independent reasons, both established:

- **It never fires headlessly.** A throwaway probe plugin registering only
  `MessageDisplay`, logging every invocation, loaded correctly in a live
  `claude -p` run (init reported `mdprobe@inline`, the session made 5 tool calls
  and 6 assistant text blocks and fixed the fixture) and the hook was never
  invoked — the log file was never created. No display, no event.
- **It could not change a measurement even where it does fire.** Every metric in
  this campaign, and hush's own narration meter, reads the stored assistant
  message. `displayContent` by design does not touch it.

So the channel can only hide mid-turn text from the interactive screen. It saves
no tokens, changes no transcript, and cannot move any number reported here. If
hush ever adopts it, treat it as a presentation feature and a deliberate choice
to let the screen and the transcript disagree — not as silence.

## Where to look next

1. **The Sonnet floor is the floor.** Residual leaks are single diagnosis
   sentences on `bugfix-expiry`. No prompt- or context-level channel closed them,
   no hook can unsay emitted text, and the one display-level channel is ruled out
   above. The remaining lever would have to change what the model wants to write,
   not what it is told.
2. **razor's own wording.** Its "say so in one line" instructions are the source
   of the non-diagnosis residual. Changing them would help the pair and would
   affect razor used alone — measure both before touching it.
3. ~~**Roadmap 079**~~ — settled. Entry 079 is `done` and
   `hush-voice-transfer-2026-07-20.md` answered the question directly: openers are
   opt-in across the board, and a crafted voice does reach the output.
