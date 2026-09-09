# foreman launch posts

Drafts, 2026-09-04. Post them yourself, from your own accounts. Foreman is the
hardest of the three to show in one picture, so these lean on the morning-after
story rather than a number. Post it last, a week after razor.

## Show HN

**Title** (80 chars max):

    Show HN: Foreman – keeps your Claude Code project plan alive between sessions

**Text:**

Every Claude Code session forgets everything when it ends. Close the laptop
and the plan that lived in your head, and in that conversation, is gone. Next
morning you explain the project again.

Foreman keeps the plan next to the code, in a plain file it calls the roadmap.
Ask "what's next?" and it hands back the task it recommends, why that one
came first, and a prompt you can run straight away. Before handing the prompt
over it opens the files the task names and checks they still exist and still
say what the plan thinks they say, so it cannot point you at a file that got
renamed yesterday.

Nothing moves without you: no task is added, changed or ticked off behind
your back. When a task looks finished it says so and asks.

It is one plugin with one entrance, `/foreman:foreman`, that routes plain
requests: add this, what's next, that entry is wrong, is the roadmap healthy.

https://github.com/V-Songbird/foreman

## r/ClaudeAI

**Title:**

    I got tired of re-explaining my project to Claude Code every morning, so I made it keep the plan in a file

**Text:**

The roadmap is a plain file in your repo. Foreman writes to it, you can read
it and edit it like anything else. The bits that made it stick for me:

1. "What's next?" gives one task, the reason it came first, and a ready
   prompt, not a list to scroll.
2. The prompt is checked against the real code before you see it. If the
   file a task names has moved, Foreman says so instead of sending you there.
3. When a task looks done it asks, and only ticks it off when you say yes.

Install:

    /plugin marketplace add V-Songbird/foundry
    /plugin install foreman@foundry

Then `/foreman:init` once, and `/foreman:foreman` for everything after.

https://github.com/V-Songbird/foreman

## X

Claude Code forgets your whole plan when the session ends.

Foreman keeps it in a file next to the code. Ask "what's next?" and get the
task, the reason, and a prompt checked against your real files.

https://github.com/V-Songbird/foreman

## Reply ammo

If someone says "I just use a TODO.md": that is the roadmap, minus the part
that picks, explains and checks the files before handing over. Foreman reads
a plain file too, and never edits it without asking.

If someone asks whether it plans for you: no. You decide what goes on the
roadmap. Foreman orders it, checks it, and hands it over.
