<div align="center">
  <img src="assets/logo.svg" alt="hush" width="120" />
  <h1>hush</h1>
  <p><strong>Makes Claude quieter and your sessions cheaper — less narration, less noise, one clear answer at the end.</strong></p>
</div>

---

## What is this?

If you've used Claude Code for a while, you know the pattern: "Let me start by looking at...", "Now I'll check...", a 400-line wall of build output, and finally the thing you actually wanted to know. All of that costs money (every word in a session is billed as tokens) and makes the useful part harder to find.

Hush trims it at the source. While it's installed, Claude works in silence, compresses noisy command output before it piles up, and delivers **one outcome-first summary** when the work is done. Code, error messages, and anything you explicitly ask to have explained stay complete — hush never shortens the parts that matter.

## Why you'd want it

- **Cheaper sessions.** Long sessions carry every previous word forward on every step. Hush shrinks the two biggest sources of bulk: tool output and narration.
- **Easier to read.** The answer is at the top of one final message, not buried in a play-by-play.
- **Nothing important is lost.** Failing command output is kept nearly whole and verbatim — failure detail is evidence. Code, diffs, and security warnings are never compressed.
- **Zero setup.** Install it and it's on. Tune it later only if you want to.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install hush
```

The quiet style takes effect at your next session. There is nothing to invoke — hush works in the background.

---

## How it works (for the curious)

Prompt-injection style plugins fight the default system prompt by re-injecting "be terse" rules every turn. That costs tokens per turn, drifts on long sessions, and only touches the smallest of the three token sinks — the prose you read. Hush attacks all three with the strongest mechanism available for each.

### 1. Forced output style — the prose sink

[`output-styles/hush.md`](output-styles/hush.md) is applied automatically while the plugin is enabled (`force-for-plugin: true`). Output styles modify the system prompt itself, and Claude Code generates its own adherence reminders during the conversation — persistence comes from the harness, not from per-turn injection you pay for.

The style: no preamble, no play-by-play, speak mid-turn only on a direction change or a blocking finding, everything else in one outcome-first final message, written at dev-shorthand density — default to fragments, drop what a reader infers on their own. Code, diffs, errors, security warnings, and anything you explicitly asked to have explained stay full-fidelity; investigation depth is never traded for brevity.

### 2. Tool-output compression — the input sink (the big one)

Tool results are typically 5–10x larger than prose in a long session, and every byte re-enters context on every subsequent model call. A `PostToolUse` hook rewrites Bash/PowerShell results via `updatedToolOutput` before they reach the model:

- strips ANSI color/cursor codes and resolves `\r` progress-bar redraws to their final state (CRLF line endings are left alone — only a bare mid-line `\r` counts as a redraw)
- collapses consecutive duplicate lines into a count marker
- caps passing output at 60 lines (head + tail + `[hush: N lines omitted]`) — but a line matching a warning/error/failure/deprecation pattern survives the cap regardless of position, so a build warning buried in the middle of noisy output is never the thing that gets cut
- failing output keeps 250 lines and everything kept is verbatim — failure detail is evidence, never summarized
- **enumeration carve-out:** when the turn's prompt explicitly asks to enumerate *every / all / each* of something ("report every warning," "list all the errors"), the log passes uncapped — still ANSI-stripped, `\r`-resolved, and dupe-collapsed, but with nothing elided. A capped slice, however faithfully it marks its gaps, still reads as incomplete on a completeness task, so a capable model re-runs the command to recover what it assumes is hidden — the compression backfires exactly where it would save the most. Passing the whole log removes the thing to distrust. Detection needs a completeness word next to a countable noun, so ordinary prose doesn't switch compression off.

Deterministic text transforms only. No LLM, no heuristics touching error content, no drift. When nothing shrinks, the hook stays silent.

### 3. Narration meter — the feedback loop

Dual-mode, one script registered on two events:

- **PostToolUse (mid-turn)**: after each tool call, tail-reads the transcript (last 1MB) and counts the turn's narration words so far. The moment the budget (default 120 words) is crossed, it injects one corrective line — inside the offending turn, so the first long turn doesn't get a free pass. Fires at most once per turn (state file in the OS temp dir keyed by session).
- **Stop (turn end)**: same measurement with the final message exempt (it's the deliverable), skipped when the mid-turn fire already corrected the turn.

Turn boundaries are real human input only — task notifications, subagent completions, and scheduled wakeups (`origin.kind` / `isMeta` markers) don't reset the counter, so a notification chain measures as one turn. Zero token cost while the agent behaves.

## Benchmarks

We put hush up against plain Claude Code and the popular "just be brief" plugin — same real tasks, three setups — and measured the actual bill.

<p align="center"><img src="assets/bench-cost.svg" alt="Session cost vs no plugin: the popular brief plugin costs 3% more, hush costs 9% less" width="540"></p>

**hush came out the cheapest of the three.** Here's the catch with prompt-based "be brief" plugins: they re-send their rules to Claude on every single turn, so they can end up costing *more* than running no plugin at all. hush doesn't work that way — it's baked into the setup once, so you simply pay less.

<p align="center"><img src="assets/bench-chatter.svg" alt="Words of narration before the answer: no plugin 9 words, the brief plugin 2, hush 0" width="540"></p>

**Claude stops narrating and just answers.** No "Let me start by…", no running commentary — the thing you actually asked for sits right at the top of one clean message.

And the part that matters most: **nothing broke.** Every task still came out correct. hush trims the noise, never the substance — your code, error messages, and anything you ask it to explain stay whole.

*How we tested: we ran each setup on the same real tasks several times in a fresh, throwaway workspace and read the real cost straight from the API — no guesswork. Figures are averages on the smaller, cheaper model.*

*One honest note:* when Claude is spelunking through a big, unfamiliar codebase (lots of file reading rather than noisy command output), hush doesn't save you much. It's built to tame noisy output — that's where it earns its keep.

## Configuration

Environment variables, e.g. via `env` in `settings.json`:

| Variable | Default | Effect |
| --- | --- | --- |
| `HUSH_CAP_PASS` | `60` | Line cap for passing Bash/PowerShell output |
| `HUSH_CAP_FAIL` | `250` | Line cap for failing output |
| `HUSH_CAP_ENUMERATE` | `2000` | Line cap when the turn's prompt asks to enumerate every/all/each of something — high enough that a normal noisy log passes whole |
| `HUSH_NARRATION_BUDGET` | `120` | Narration words allowed per turn before the meter fires (both modes) |
| `HUSH_NARRATION` | unset | `off` disables the narration meter only (compression and the output style stay) |
| `HUSH_DISABLE` | unset | `1` disables both hooks (the output style stays; disable the plugin to remove it) |

## Optional: compress a memory file

`/hush:hush-compress <path>` shrinks a CLAUDE.md or other memory file into hush's own dev-shorthand voice (the same word economy the output style already applies to conversation), so every future session that loads it pays fewer input tokens. Say "compress this file" or "shrink my CLAUDE.md" to trigger it too.

**Safety model: it never writes to the original file.** The compressed result goes to a sibling file (`CLAUDE.md` → `CLAUDE.hush.md`) for you to review and swap in yourself — there is no code path in this skill that touches the source file's bytes, so there's nothing to corrupt or lose. A mechanical verifier (`hush/scripts/verify-compression.js`, no LLM involved) checks that every heading, code block, URL, path, and inline-code span in the original still appears in the compressed version, and reports anything missing before you replace the original.

## Relationship to prompt-injection style plugins

hush replaces their core mechanism rather than complementing them. Same terseness goal, but implemented in the system prompt instead of per-turn injected rules — and it also covers the input-token side those plugins never touch. If one is installed alongside hush, hush's forced output style takes precedence anyway; running both just pays the injection tax for nothing. Keep such a plugin only if you want its unrelated extras (skills, agents, and the like).

## Relationship to razor

Complementary, not overlapping: hush governs how the agent *talks*; [razor](../razor) governs what it *builds*. Pair them.

## What a plugin cannot do (known limits)

- No hook event can rewrite or suppress the assistant's generated text — confirmed in the official hooks reference. The output side is therefore prompt-level by necessity; hush just uses the strongest prompt-level mechanism that exists.
- The output style takes effect at session start; changing it mid-session requires `/clear` or a new session.
- Compression targets Bash/PowerShell only. Read/Edit results are never touched — editing needs full file fidelity.
- The enumeration carve-out reads the turn's prompt from the transcript tail; on an enumerate-phrased prompt it passes the log uncapped up to `HUSH_CAP_ENUMERATE` lines. Compression saves the most on exactly those noisy tasks, so this trades some char-reduction for not provoking a re-run — a smaller, more consistent session overall, but a clean uncapped run can cost marginally more than a clean capped one would have.
- The narration meter's per-session state files (`hush-meter-<session>.json` in the OS temp dir) are never deleted by the plugin — there is no session-end cleanup hook path worth the complexity. They are a few bytes each; OS temp cleaning handles them.

## Tests

```
node --test hush/tests/*.test.js
```

## License

MIT — see [LICENSE](./LICENSE).
