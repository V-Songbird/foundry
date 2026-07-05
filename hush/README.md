# hush

Token-lean Claude Code sessions at the harness level, not the prompt level.

Style plugins (caveman and friends) fight the default system prompt by re-injecting "be terse" rules every turn. That costs tokens per turn, drifts on long sessions, and only touches the smallest of the three token sinks — the prose you read. hush attacks all three with the strongest mechanism available for each.

## What it does

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

A `Stop` hook parses the turn's transcript, counts words in mid-turn assistant text blocks (the final message is the deliverable and doesn't count), and injects a single corrective line only when the budget (default 120 words) is exceeded. Zero token cost while the agent behaves.

## Configuration

Environment variables, e.g. via `env` in `settings.json`:

| Variable | Default | Effect |
| --- | --- | --- |
| `HUSH_CAP_PASS` | `60` | Line cap for passing Bash/PowerShell output |
| `HUSH_CAP_FAIL` | `250` | Line cap for failing output |
| `HUSH_NARRATION_BUDGET` | `120` | Mid-turn narration words allowed per turn before the meter fires |
| `HUSH_DISABLE` | unset | `1` disables both hooks (the output style stays; disable the plugin to remove it) |

## Relationship to caveman

hush replaces caveman's core mechanism rather than complementing it. Same terseness goal, but implemented in the system prompt instead of per-turn injected rules — and it also covers the input-token side caveman never touches. If both are installed, hush's forced output style takes precedence anyway; running both just pays caveman's injection tax for nothing. Keep caveman only if you want its extras (commit/review skills, wenyan levels, cavecrew agents).

## What a plugin cannot do (known limits)

- No hook event can rewrite or suppress the assistant's generated text — confirmed in the official hooks reference. The output side is therefore prompt-level by necessity; hush just uses the strongest prompt-level mechanism that exists.
- The output style takes effect at session start; changing it mid-session requires `/clear` or a new session.
- Compression targets Bash/PowerShell only. Read/Edit results are never touched — editing needs full file fidelity.

## Tests

```
node --test hush/tests/*.test.js
```
