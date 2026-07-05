# hush

**Makes Claude quieter and your sessions cheaper — less narration, less noise, one clear answer at the end.**

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

The style: no preamble, no play-by-play, speak mid-turn only on a direction change or a blocking finding, everything else in one outcome-first final message. Code, diffs, errors, security warnings, and anything you explicitly asked to have explained stay full-fidelity.

### 2. Tool-output compression — the input sink (the big one)

Tool results are typically 5–10x larger than prose in a long session, and every byte re-enters context on every subsequent model call. A `PostToolUse` hook rewrites Bash/PowerShell results via `updatedToolOutput` before they reach the model:

- strips ANSI color/cursor codes and resolves `\r` progress-bar redraws to their final state
- collapses consecutive duplicate lines into a count marker
- caps passing output at 60 lines (head + tail + `[hush: N lines omitted]`)
- failing output keeps 250 lines and everything kept is verbatim — failure detail is evidence, never summarized

Deterministic text transforms only. No LLM, no heuristics touching error content, no drift. When nothing shrinks, the hook stays silent.

### 3. Narration meter — the feedback loop

Dual-mode, one script registered on two events:

- **PostToolUse (mid-turn)**: after each tool call, tail-reads the transcript (last 1MB) and counts the turn's narration words so far. The moment the budget (default 120 words) is crossed, it injects one corrective line — inside the offending turn, so the first long turn doesn't get a free pass. Fires at most once per turn (state file in the OS temp dir keyed by session).
- **Stop (turn end)**: same measurement with the final message exempt (it's the deliverable), skipped when the mid-turn fire already corrected the turn.

Turn boundaries are real human input only — task notifications, subagent completions, and scheduled wakeups (`origin.kind` / `isMeta` markers) don't reset the counter, so a notification chain measures as one turn. Zero token cost while the agent behaves.

## Configuration

Environment variables, e.g. via `env` in `settings.json`:

| Variable | Default | Effect |
| --- | --- | --- |
| `HUSH_CAP_PASS` | `60` | Line cap for passing Bash/PowerShell output |
| `HUSH_CAP_FAIL` | `250` | Line cap for failing output |
| `HUSH_NARRATION_BUDGET` | `120` | Narration words allowed per turn before the meter fires (both modes) |
| `HUSH_DISABLE` | unset | `1` disables both hooks (the output style stays; disable the plugin to remove it) |

## Relationship to prompt-injection style plugins

hush replaces their core mechanism rather than complementing them. Same terseness goal, but implemented in the system prompt instead of per-turn injected rules — and it also covers the input-token side those plugins never touch. If one is installed alongside hush, hush's forced output style takes precedence anyway; running both just pays the injection tax for nothing. Keep such a plugin only if you want its unrelated extras (skills, agents, and the like).

## Relationship to razor

Complementary, not overlapping: hush governs how the agent *talks*; [razor](../razor) governs what it *builds*. Pair them.

## What a plugin cannot do (known limits)

- No hook event can rewrite or suppress the assistant's generated text — confirmed in the official hooks reference. The output side is therefore prompt-level by necessity; hush just uses the strongest prompt-level mechanism that exists.
- The output style takes effect at session start; changing it mid-session requires `/clear` or a new session.
- Compression targets Bash/PowerShell only. Read/Edit results are never touched — editing needs full file fidelity.
- The narration meter's per-session state files (`hush-meter-<session>.json` in the OS temp dir) are never deleted by the plugin — there is no session-end cleanup hook path worth the complexity. They are a few bytes each; OS temp cleaning handles them.

## Tests

```
node --test hush/tests/*.test.js
```

## License

MIT — see [LICENSE](./LICENSE).
