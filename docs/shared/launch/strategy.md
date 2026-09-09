# Foundry promotion strategy

Written 2026-09-04 from a research pass over how the two biggest output
plugins actually grew. Local only. Covers hush, razor, foreman, and the
foundry hub.

## What the evidence says

Both big cases grew the same way, and neither author did it alone.

| Repo | Stars | The spark | Then |
| --- | --- | --- | --- |
| caveman | 103.6k | A Reddit post on r/ClaudeAI, about 10k votes, before the repo existed. Someone else put it on HN two days later: 904 points. | GitHub Trending #1, ThePrimeTime video with 638k views, Product Hunt #6, press. |
| i-have-adhd | 27.1k | Nothing for two months. HN got 2 points. Then one Threads post by a stranger: 98k views, 1.9k likes. | GitHub Trending #1 next day, then LinkedIn, Medium, YouTube, Android Authority. |

Four things follow.

1. **The spark is a post other people share, not a post you write.** The
   author's own X account did almost nothing in both cases. The post that
   worked was one line a reader could feel: "I taught Claude to talk like a
   caveman", "whoever shared the i-have-adhd skill with me, thank you".
2. **Trending follows the spike. It does not cause it.** Get one community
   post to land and GitHub Trending, YouTube and press follow within days.
3. **Two months of silence is normal.** i-have-adhd sat dead until one post.
   Do not read a quiet first month as a verdict on the plugin.
4. **Directories and lists are the floor, not the ceiling.** They keep a
   trickle coming after the spike. Do them once, early, then stop thinking
   about them.

## What already happened (2026-09-04)

- GitHub descriptions and topics rewritten on hush, razor, foreman, foundry.
- Side-by-side replays drawn from real records on hush and razor READMEs.
  Generators live in each harness so a new run redraws them.
- Plain one-line pitches on both READMEs. hush names caveman in its numbers.
- Ember, the mascot, opens all three READMEs (approved 2026-09-05). Its
  three scenes are the shareable asset for X and Threads; record the loop as
  a short screen capture, since SVG will not embed there.
- Curated entries for all three in a PR to claudedirectory.org.
- Draft posts for each plugin in this folder.
- `claude plugin validate` passes on all three and on the marketplace.

## The plan

### Week 1: submissions, all at once, then forget them

| Where | How | Who |
| --- | --- | --- |
| Anthropic community marketplace (`claude-plugins-community`) | Sign in to platform.claude.com/plugins/submit with the Console account, paste `https://github.com/V-Songbird/foundry`. Approval pins a commit and syncs nightly. This is the one directory that matters most: it is inside Claude Code. | you |
| awesome-claude-code (53k stars) | Their web form, one resource at a time, no exceptions: the maintainer restricts accounts that use the API. Values ready in `submissions.md`. hush first. | you |
| awesome-claude-code-toolkit (2.6k) | PR adding a row per plugin to the plugins table. | PR open |
| claudepluginhub | hush and razor are already indexed. Submit the foundry URL so foreman joins them. Bot check on the form. | you |
| claudeskills.info | Submit form at claudeskills.info/submit. Not listed yet. | you |
| everydev.ai | everydev.ai/create/tool. Not listed yet. | you |
| Anthropic showcase form | form.typeform.com/to/VIUAjxNi, from claude.com/community. Long shot, free. | you |

Skipped on purpose: ComposioHQ/awesome-claude-plugins vendors plugin code into
its own repo, which fights the marketplace being the one source of versions.
VoltAgent/awesome-agent-skills wants "real community usage" first. Come back
to it after a spike.

### Week 2: the hush spark

hush first. It has the clearest one-line feeling and the best picture.

1. Post on r/ClaudeCode, not r/ClaudeAI first. r/ClaudeCode is smaller
   (404k) but every reader has the exact pain. Use the "I got tired of Claude
   narrating every step" draft. Lead with the replay picture.
2. Same day, one Threads post and one X post. Threads was the spark for
   i-have-adhd. Text in `../../hush/launch/posts.md`.
3. Two days later, Show HN, morning US time, Tuesday to Thursday.
4. Do not post on all three on the same day. One a day. Reply to every
   comment within the hour for the first day. Comments are what moves a
   Reddit post up.

### Week 3: razor

Same shape. The "just use axios" story is the hook. The replay picture is the
proof. Post on r/ClaudeCode, then Threads and X, then Show HN.

### Week 4: foreman

Foreman has no picture yet, and no headline number, but since 2.5.2 its README
shows a real "what's next?" exchange: the menu, the pick, and the opening of
the prompt it wrote. Lead with that in the posts. If it gets traction, buy the
batch below and add the replay.

### Ongoing

- **Pitch two newsletters and two channels, once each.** Skills Weekly and
  AI Coding Daily for newsletters. Chase AI and AI Coding Daily on YouTube.
  Short email, one link, the picture attached. Template in `pitches.md`.
- **Product Hunt only after a spike.** caveman's PH launch was hunted by a
  stranger after HN. A cold PH launch for a plugin does little.
- **Keep the READMEs spike-ready.** A stranger's post sends readers to the
  front page. It needs: the one-line pitch, the picture, the install block
  within one scroll, and an honest loss. All three have that now.
- **Write the one line you want others to repost.** Put it in the GitHub
  description, the README `<strong>`, and the top of every post. Same words
  everywhere. hush: "Claude shuts up until it's done." razor: "Stops Claude
  from adding code nobody needed." foreman: "Your project plan, kept next to
  the code."

## Better ideas than what we did today

- **A skill, not just a plugin.** caveman is a skill. Skill directories
  (skillsmp, VoltAgent's list, claudeskills.info) index skills and already
  scrape ours. hush's voice already ships as plain text in flint. Say so
  louder: "no install, paste one file" is the caveman on-ramp.
- **Name the pain, not the mechanism.** Both winners are named for a feeling
  ("caveman", "i have adhd"). "hush" is close. "razor" and "foreman" name the
  tool. Do not rename, but let every post open with the feeling: "Claude
  narrates every step", "Claude installs a library for a one-liner", "Claude
  forgets your plan every morning".
- **Let strangers share the picture.** The replay SVGs are the shareable
  asset. Export a PNG of the final frame for X and Threads, where an SVG will
  not embed.
- **One number per plugin, said the same way everywhere.** hush: "spoke at
  most once before the answer, 36 of 36 sessions". razor: "39 of 39 clean,
  about half the lines". foreman: none yet. Do not invent one.
- **The foreman batch.** One paid run, vibe ask versus foreman handoff, on the
  existing three fixtures, Sonnet, 4 reps: 3 tasks x 2 arms x 4 reps = 24
  sessions, roughly $3 on Sonnet from the harness README's own estimate. That
  buys foreman a replay and a number. Not bought; your call.

## What not to do

- No astroturfing, no asking friends to star, no comment spam. Both winners
  grew on one honest post that strangers wanted to share.
- Never name a rival outside a README (house rule), and never mock one.
- No ports to Codex or Gemini CLI. Declined 2026-09-04.
- Do not chase Trending directly. It follows.
