# hush launch posts

Drafts, 2026-09-04. Post them yourself, from your own accounts. Each one is
written to be pasted as-is. Order, one per day: r/ClaudeCode first (every
reader has the exact pain), Threads and X the same day with the PNG from
`png/hush-dark.png`, Show HN two days later on a weekday morning US time.
Reply to every comment in the first hours; comments are what lift a post.

## Threads

Claude Code narrates every step. "Let me look at the codebase." "Now I'll
check the config." Then it pastes the whole log.

I made a plugin that makes it shut up until it's done. One short answer, the
file to open. Same job, with and without, in the picture.

github.com/V-Songbird/hush

## Show HN

**Title** (80 chars max):

    Show HN: Hush – a Claude Code plugin that keeps Claude quiet until it's done

**Text:**

Claude Code talks while it works. "Let me look at the codebase." "Now I'll
check the config." Then it pastes 400 lines of test output into the chat, and
the one sentence you needed is at the very bottom.

hush is a plugin that stops both. Claude stays silent until the job is done,
then sends one short message that leads with the result and names the file to
open. Separately, a hook trims long command output before Claude reads it
back, so a giant log does not sit in the conversation being re-sent on every
turn.

I benchmarked it against no plugin and against caveman (the "talk like
caveman" skill) on nine real jobs, 36 sessions per setup, on Opus 5. All three
got every job right. hush spoke at most once before the answer in 36 of 36
sessions, and the final message averaged 69 words at a reading grade of 2.7.
Caveman is real competition on silence; the difference is that hush's answer
is still plain English you can read at the end of the day.

The benchmark harness ships in the repo, so you can rerun any number.

https://github.com/V-Songbird/hush

If you only want the voice and not the plugin, the style file on its own is
at https://github.com/V-Songbird/flint

## r/ClaudeAI

**Title:**

    I got tired of Claude Code narrating every step, so I built a plugin that makes it shut up until it's done

**Text:**

You know the thing. You ask Claude Code to fix a red test suite and it goes
"I'll start by looking at the project structure", then three more updates,
then a 250-word write-up with headers. The actual answer was "one bug in
pricing.js:39, tax was applied before the discount."

hush is a plugin that does two things:

1. Claude says nothing while it works. One message at the end, answer first,
   short sentences, the file to open as a clickable link.
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

hush makes it shut up until it's done. One short answer, the file to open,
no log dumps.

Same job, with and without, side by side in the README:
https://github.com/V-Songbird/hush

## Reply ammo

If someone asks "how is this different from caveman": caveman compresses the
words. hush removes the messages. On our nine-job run both were silent most of
the time, hush more often, and hush's final message reads at grade 2.7 versus
5.1. The full table with caveman's numbers is in the README.

If someone asks about cost: it is not a cost plugin. On noisy jobs it saves
tokens because the logs get trimmed. On quiet jobs it can cost 1-10% more.
The README says so.

## New hook, 2026-09-08: Anthropic published hush's lever

Source: https://x.com/ClaudeDevs/status/2097369738968195513 (ClaudeDevs, "Reducing cost and
improving performance with Claude Platform"). Their cost tool, run on SWE-bench Verified with
Sonnet 5, cut cost 55% at a flat pass rate from two changes: effort down to medium, and
"constraining the agent's output to just a few concise sentences". Median steps 29 -> 17.

Their number, their benchmark, their model. hush's own read is -11% to -22% per session.
Never quote 55% as hush's.

### X / Threads

Anthropic just published the cost lever hush has shipped since day one: make the agent answer
in a few concise sentences. Their tool got -55% on a coding benchmark with that plus lower
effort. hush does the sentences part for Claude Code, on every job, nothing to configure.
https://github.com/V-Songbird/hush

### r/ClaudeAI

Anthropic's new cost write-up says one of the two biggest savings on a coding benchmark was
"constraining the agent's output to just a few concise sentences". That is the whole idea
behind hush: Claude works in silence, then one short answer that names the file to open. The
README has the numbers from our own nine-job run, wins and losses. Link to their post in the
README.

### Reply ammo

If someone says "so hush is just what Anthropic recommends": yes, and it does it for you. The
post says what to do; the plugin is the doing, plus the log trimming Anthropic's post does not
cover.
