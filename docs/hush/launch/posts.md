# hush launch posts

Drafted 2026-09-04; copy and evidence reconciled 2026-09-10. Post them yourself, from your own accounts. Each one is
written to be pasted as-is. Order, one per day: r/ClaudeCode first (every
reader has the exact pain), Threads and X the same day with the PNG from
`png/hush-dark.png`, Show HN two days later on a weekday morning US time.
Reply to every comment in the first hours; comments are what lift a post.

## Threads

Claude Code narrates every step. "Let me look at the codebase." "Now I'll
check the config." Then it pastes the whole log.

I made Hush for quieter sessions: less narration, shorter tool output and a
concise answer focused on the result. Same job, with and without, in the picture.

github.com/V-Songbird/hush

## Show HN

**Title** (80 chars max):

    Show HN: Hush – less narration and shorter tool output in Claude Code

**Text:**

Claude Code talks while it works. "Let me look at the codebase." "Now I'll
check the config." Then it pastes 400 lines of test output into the chat, and
the one sentence you needed is at the very bottom.

hush reduces both. Its writing style asks Claude to keep routine work quiet
and finish with a short answer focused on the result. Separately, a hook trims selected long command output before Claude reads it
back, so a giant log does not sit in the conversation being re-sent on every
turn.

I benchmarked it against no plugin and against caveman (the "talk like
caveman" skill) on nine fixture jobs, 36 sessions per setup, on Opus 5 at medium effort. All three
got every job right. hush spoke at most once before the answer in 36 of 36
sessions, and the median final prose was 69 words versus 367 without a plugin.
The readability check detected runnable content in 94% of Hush replies versus
100% for the other setups. Three quiet jobs cost 1–10% more. Caveman is a real
comparison: it had at most one update in 31/36 sessions and a prose median of 151 words.

The [benchmark harness and retained records](https://github.com/V-Songbird/foundry/tree/main/benchmarks/hush) are in Foundry. You can reproduce the analysis from the records or run new sessions; results vary between runs.

https://github.com/V-Songbird/hush

If you only want the voice and not the plugin, the style file on its own is
at https://github.com/V-Songbird/flint

## r/ClaudeAI

**Title:**

    I built Hush to reduce narration and noisy tool output in Claude Code

**Text:**

You know the thing. You ask Claude Code to fix a red test suite and it goes
"I'll start by looking at the project structure", then three more updates,
then a 250-word write-up with headers. The actual answer was "one bug in
pricing.js:39, tax was applied before the discount."

hush is a plugin that does two things:

1. A writing style and session reminders reduce routine narration and ask for
   a short final answer focused on the result and next action.
2. Long command output gets trimmed before Claude reads it back. Errors and
   warnings are kept. A full log gets parked in a file and replaced with a
   summary that names the file.

Install:

    /plugin marketplace add V-Songbird/foundry
    /plugin install hush@foundry

There is a side-by-side replay of a real session in the README, same job with
and without the plugin. Numbers are there too, including where it loses (it
can cost a little more on tiny jobs with nothing to trim).

https://github.com/V-Songbird/hush

## X

Claude Code narrates every step and pastes whole logs into your chat.

Hush reduces the narration, trims selected tool output and asks for a concise
answer focused on the result.

Same job, with and without, side by side in the README:
https://github.com/V-Songbird/hush

## Reply ammo

If someone asks "how is this different from caveman": on the September 1 fixture
comparison, Hush had at most one update in 36/36 sessions versus 31/36 for caveman.
Median final prose was 69 versus 151 words. These are recorded outcomes, not
promises for every session. The README carries the comparison and its limits.

If someone asks about cost: Hush reduces narration and tool-output noise. Costs
depend on the workload; three jobs in the September 1 comparison cost 1–10% more.
The README and detailed evidence preserve the wins and losses.

## External support, 2026-09-08: concise output in Anthropic's cost study

Source: [Anthropic's original article](https://claude.com/blog/reducing-cost-and-improving-performance-with-claude-platform), September 8, 2026. On SWE-bench Verified with Sonnet 5, its cost tool reported approximately 55% lower cost after combining medium effort and concise output. Median steps fell from 29 to 17. The two effects were not isolated; do not attribute the saving to brevity alone.

This is external support for an approach Hush already implements, not a Hush benchmark or endorsement. The previous 11–22% Hush cost range had no linked comparison and is retired. Use the [reconciled Hush evidence](../validation/claude-readme-benchmark-2026-09-10.md), with its losses, instead.

### X / Threads

Anthropic reported approximately 55% lower cost on SWE-bench Verified after combining medium effort and concise output. Hush brings concise answers, fewer interruptions and tool-output trimming to Claude Code. Its README carries its own measurements and limits.
https://github.com/V-Songbird/hush

### r/ClaudeAI

Anthropic's cost study combines concise output with medium effort. Hush already uses concise answers in Claude Code and adds narration controls and tool-output trimming. In Hush's recorded nine-job comparison, median final prose was about 81% shorter; three quiet jobs cost more. The README links both studies and distinguishes their results.

### Reply ammo

Hush packages a writing style, session reminders and tool-output trimming for Claude Code. Anthropic's study supports concise output as one useful control, but it did not test Hush or separate brevity from effort. Hush's own comparison includes all its controls together.
