---
name: craft-prompt
description: Interactive prompt builder. Guides you through assembling a self-contained spawned-session prompt following Foreman's template — asks which optional sections to include, gathers required info via AskUserQuestion, assembles the XML, then hands it off via TaskCreate, a background Agent, or copies it to the clipboard.
when_to_use: Trigger when the user wants to create a task, spawn a background agent, craft a prompt for a spawned session, or says "craft a prompt", "build a prompt", "foreman prompt", "new task prompt", or invokes /foreman:craft-prompt.
argument-hint: "<brief task description — optional seed>"
allowed-tools: AskUserQuestion, TaskCreate, Agent, Write, Bash, PowerShell
---

# foreman:craft-prompt — interactive prompt builder

Assemble a self-contained prompt for a spawned session following Foreman's template. The spawned session has zero memory of this conversation — every field must be filled so it can act cold.

If args were provided, treat them as the task description seed and skip asking for it in Call 1.

---

## Call 1 — task type and optional sections

Ask these two questions together:

**Q1** — "What task should the spawned session perform?"
Options: `Implement a feature`, `Fix a bug`, `Investigate / research`, `Refactor code`, `Write documentation`, `Security audit`

**Q2** — "Which optional sections do you want in the prompt?" (multiSelect: true)
Options:
- `Tone` — override the default (minimal/professional, silent-by-default, caveman-aware — see the template)
- `Example` — a before/after or input→output snippet (good for fixes and transformations)
- `Constraints` — hard limits on files or interfaces the agent must NOT touch
- `Background context` — architectural decisions, patterns, or environment details
- `Custom output format` — wrap the deliverable in a specific XML tag for a downstream parser (skip this unless something actually parses the output — the default is a plain human-readable summary, no tags)

Record which optional sections were selected.

Q2 asks what the user *wants* in the prompt, not what's *true* about the code — no amount of upfront code investigation answers it, so don't skip it even when you've already grounded every fact the prompt will state. Investigation and section selection are orthogonal: being confident about the code is not the same as knowing which sections the user wants included.

---

## Call 2 — required fields (batch all 4)

**Q1** — "What role should the spawned agent play?"
Options: `Senior engineer`, `Security engineer`, `TypeScript developer`, `Python developer`, `Technical writer`, `Code reviewer`

**Q2** — "What does 'done' look like? One sentence."
Options: `Bug is fixed and all tests pass`, `Feature is implemented and tested`, `Report is written with cited findings`, `Refactor complete — no behavior change`

**Q3** — "List the relevant files with line ranges where known."
Options: `I'll list them` (nudge user to use Other and type paths like `src/auth/middleware.ts:42-80 — token refresh logic`)

**Q4** — "Describe the three steps: Step 1 = read/explore, Step 2 = analyze/check, Step 3 = implement/produce."
Options: `I'll describe them`

---

## Call 3 — verification (conditional)

Skip this call only if the task type is pure research/investigation with no code changes.

**Q1** — "What command verifies success?"
Options: `npm test`, `npm run build`, `pytest`, `cargo test`, `go test ./...`

**Q2** — "What's the expected outcome?"
Options: `All tests pass`, `Build succeeds with exit code 0`, `No lint errors`, `Report file produced`

---

## Call 4-N — optional section details

For each section selected in Call 1 Q2, ask its detail question(s). Batch up to 4 questions per call.

**Tone** (if selected):
- "Describe the tone for this session."
  Options: `Cautious and defensive (security-focused)`, `Fast and pragmatic (prototype)`, `Pedagogical — explain each step`, `Formal technical report style`

**Example** (if selected):
- "Provide a before/after snippet or input → output example."
  Options: `I'll type it`

**Constraints** (if selected, batch together):
- "Which files or interfaces must NOT be modified?"
  Options: `I'll list them`
- "Is there a coding style or pattern to follow? Point to an example file."
  Options: `None`, `I'll describe it`

**Background context** (if selected):
- "Describe the architectural decisions, patterns, or constraints the agent needs to know to act without prior context."
  Options: `I'll describe it`

**Custom output format** (if selected):
- "What XML tag should wrap the final deliverable?"
  Options: `<findings>`, `<report>`, `<diff>`, `<summary>`

---

## Call 5 — destination

Ask this now, before the prompt exists, not after assembly. There is
nothing to preview yet; the destination decides how the prompt gets
delivered, not the other way around.

**Q1** — "How do you want to run this?"
Options:
- `Execute with TaskCreate` — track it and work it in this session
- `Execute with a background Agent` — offload it, get notified on completion
- `Copy prompt to clipboard` — just get the text, no execution

**Never call `mcp__ccd_session__spawn_task`** — it has a known bug where
tasks spawned through it don't get MCP tools. Use one of the three options
above instead, regardless of Desktop or CLI.

---

## Assemble the prompt

Build the XML exactly as follows. Omit optional blocks not selected by the
user. **Never paste or print this assembled prompt into your response
text** — it is data for `TaskCreate`'s `description`, `Agent`'s `prompt`,
or a temp file piped to clipboard, not something to show the user. The one
exception is the clipboard-fallback fenced block below, used only when no
clipboard tool exists.

```xml
<task_context>
You are [role].
Your goal is [done-state sentence].
</task_context>

<truth_grounding>
Before acting on anything in this prompt, verify it against the current state
of the codebase — read the cited files, run the cited commands. This prompt
may have been written earlier and executed later (queued via TaskCreate, run
by a background Agent, or pasted into a fresh session); treat every claim
below as a hypothesis to confirm at the start of this session, never as a
fact to assume. If reality contradicts this prompt, trust reality, say so
explicitly, and proceed from what you actually find.
</truth_grounding>

<tone>
[If Tone selected: user's custom tone. Otherwise: "Check for caveman mode:
read `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.caveman-active` (Bash). If it
exists with a non-off mode, communicate tersely for this whole session —
drop articles/filler/hedging, fragments OK, keep full technical substance,
still write code/commits/security notes in normal prose. Otherwise:
minimal, professional conversation — silent by default, say only what the
user actually needs to know, simplify technical explanations, avoid
unnecessary jargon."]
</tone>

<background>
<relevant_files>
[Files and line ranges from Call 2 Q3]
</relevant_files>
[If Background context selected:]
<context>
[Context from optional section detail]
</context>
</background>

<task_rules>
Step 1: [from Call 2 Q4]
Step 2: [from Call 2 Q4]
Step 3: [from Call 2 Q4]

[If Constraints selected:]
Constraints:
- [Files/interfaces NOT to modify]
- [Style pattern or example file, if provided]

[If verification was gathered:]
Verification (REQUIRED):
Run: [command from Call 3 Q1]
Expected: [outcome from Call 3 Q2]
Do NOT report success without running this. If it fails, iterate until it passes.
</task_rules>

[If Example selected:]
<example>
[Before/after or input→output snippet from optional section detail]
</example>

[One-sentence task statement synthesized from everything gathered.]

Think step by step before making changes. Consider edge cases before writing code.

<output_format>
[If Custom output format selected: "Wrap the final deliverable in [chosen
tag] tags — this is for a downstream parser. If a human also reads this
directly in chat, give a short plain-language summary above the tagged
block too; don't make the tags the only content."
Otherwise: "Give a concise, human-readable summary: files changed,
verification result. No XML tags — a human reads this directly in chat."]
</output_format>
```

Before moving to the next phase, verify the assembled prompt against this checklist:
- `task_context` has a specific role and a concrete one-sentence done-state
- `truth_grounding` block is present, unmodified — always included, never optional
- `relevant_files` uses exact paths — no vague references like "the auth module"
- `task_rules` has 3 numbered steps and a runnable verification command (unless pure research)
- Prompt contains no phrases like "as we discussed" or "from earlier"

---

## Deliver

Deliver via whatever Call 5 picked — no further question.

**If TaskCreate:** call `TaskCreate` with `subject` = a verb-first
imperative ≤60 chars derived from the task description, `description` = the
assembled XML prompt, `activeForm` = its present-continuous form. Then work
the task in this session, using `TaskUpdate` to mark it `in_progress` then
`completed` as you go.

**If background Agent:** call `Agent` with `prompt` = the assembled XML
prompt, `description` = a 3-5 word summary, `run_in_background: true`.

**If clipboard:** `Write` the assembled prompt to a temp file first — never
pass it as an inline shell string, a large prompt breaks shell quoting and
the copy silently fails. Then pipe the file's content into the clipboard
command: `Get-Content -Raw <file> | Set-Clipboard` on Windows, `pbcopy <
<file>` on macOS, `xclip -selection clipboard < <file>` (or `wl-copy <
<file>`) on Linux. Mention the file path too, in case the clipboard step
fails. If no clipboard tool is available at all, fall back to showing the
prompt in a fenced `xml` code block instead.
