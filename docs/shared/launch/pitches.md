# Pitches to newsletters and channels

One email each, once. Attach the PNG of the replay's last frame
(`docs/launch/png/<plugin>-demo.png`). Send from your own address. Do not
follow up more than once.

## Newsletters

Targets: Skills Weekly (skillsweekly.com), AI Coding Daily (Povilas Korop,
Wednesdays). Anthropic's developer newsletter takes no submissions.

**Subject:** A Claude Code plugin that keeps Claude quiet until it's done

Hi <name>,

I made a small Claude Code plugin called hush. Claude stays silent while it
works, then sends one short answer that leads with the result and names the
file to open. A hook trims long command output before Claude reads it back,
so logs stop getting re-sent every turn.

It is measured, not vibes: nine real jobs, 36 sessions per setup on Opus 5,
against no plugin and against caveman. All three got every job right. hush
spoke at most once before the answer in 36 of 36 sessions, and its final
message averaged 69 words at a reading grade of 2.7. Where it loses is on the
page too.

Repo, with a side-by-side replay of a real session at the top:
https://github.com/V-Songbird/hush

If it fits an issue, great. If not, no reply needed.

Victor

## YouTube

Targets: Chase AI (@Chase-H-AI), AI Coding Daily (@AICodingDaily). Prime
does not take pitches; he finds things on HN and Trending.

**Subject:** Same job, with and without the plugin, side by side

Hi <name>,

You covered caveman. hush is the other answer to the same complaint: instead
of compressing Claude's words, it removes the messages. Claude says nothing
until the work is done, then one short answer.

The README opens with a replay of one real session both ways, which might
make a good on-screen moment. Same job, no plugin on the left, hush on the
right, 5 messages versus 1.

https://github.com/V-Songbird/hush

There is a sibling plugin, razor, that stops Claude from installing a library
for a one-liner. Its replay shows Claude reaching for axios when fetch was
right there. https://github.com/V-Songbird/razor

Happy to answer anything. No reply needed otherwise.

Victor

## Swap-ins for razor and foreman

razor subject: A Claude Code plugin that asks "do we need this?" before it adds
code. Number: 39 of 39 sessions clean on Opus 5, about half the lines for the
same job.

foreman subject: Keeps your Claude Code project plan alive between sessions.
No number yet. Lead with the morning-after story.
