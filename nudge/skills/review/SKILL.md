---
name: review
description: Reviews the current session and teaches you how to write better prompts. Produces concrete rewrites of your most improvable prompts with plain-language explanations of why each change matters. Trigger on any phrase signaling session reflection or prompt improvement — "review my prompts", "how could I have prompted better", "teach me to prompt better", "what should I have asked differently", "session debrief", "prompt feedback", "give me a nudge", "nudge me", "/nudge". When in doubt, trigger — users who ask for any kind of session reflection or self-improvement on their Claude interactions are asking for this skill.
when_to_use: Use at the end of a working session. Trigger whenever the user wants to reflect on how they interacted with Claude and learn to do it better next time.
allowed-tools: Read, Write
disable-model-invocation: true
---

# nudge — session prompt review

You are reviewing this conversation to show the user how a better first prompt could have made this session more direct. The first prompt is the one that matters — it set everything in motion. The rest of the conversation is evidence: what did you have to ask for, guess at, or get corrected on? That's what the opening prompt didn't contain.

Before beginning, MUST invoke `Read` on `references/rubric.md` — it contains the 9-dimension analysis framework and the report format to follow.

## Step 0: Session context

**Identify your model.** You know which Claude model you are — state it to yourself before proceeding.

MUST invoke `Read` on `references/model-effort-guide.md` — it tells you which rubric dimensions to weight more heavily for your model and what model-specific patterns to watch for.

**Ask the user one optional question** — MUST invoke `AskUserQuestion`:
- **question**: "This session ran on [your model name]. What effort level did you use?"
- **header**: "Effort"
- **multiSelect**: false
- **options** (exactly 4):
  - `low / medium` — Low or medium effort (mention which if you remember)
  - `high / xhigh` — High or extra-high effort (mention which if you remember)
  - `max` — Max effort
  - `Not sure / skip` — Skip this; I'll omit the efficiency section

Wait for the user's response, then proceed to Step 1. If they choose "Not sure / skip", proceed without an effort answer — the Session efficiency section will be omitted from the report.

## Step 1: Orient to the session

Find the **first substantive prompt** — the user turn that opened the actual work. This is almost always the first message. Skip slash command invocations, greetings, and single-word replies.

Then scan the full session to understand:
- What was ultimately accomplished
- What follow-up turns were needed — corrections, redirections, clarifications, "actually do X instead"
- What you had to ask for, guess at, or get wrong before getting it right

Read the session backward from the opening: the follow-up turns reveal what the first prompt didn't contain.

## Step 2: Identify the gap

Apply the rubric from `references/rubric.md` to the first prompt. The question is not "which dimensions are missing" in the abstract — it is: **which missing dimensions caused follow-up turns or required you to guess?**

Identify the 1–2 gaps with the highest impact on session flow.

If the first prompt was already well-formed and the session ran cleanly with no corrections or redirections, say so specifically: name which dimensions it handled well and what that enabled. Then skip to Step 5.

## Step 3: Write the rewrite

Write one complete, professional version of the first prompt that would have gotten to the same outcome with fewer turns.

The rewrite is not a patch of the identified gap — it is a fully-formed prompt that applies all relevant rubric dimensions. Check each one:
- **Role context** (Dimension 1): does this task benefit from telling Claude who it is or what voice to use? Add it.
- **XML structure** (Dimension 7): does the prompt mix instructions with context, data, or a specific question? Separate them with `<context>`, `<task>`, `<document>`, etc.
- **Output format** (Dimension 8): does the shape of the response matter? Specify it.
- **Positive framing** (Dimension 4): state what to do, not what to avoid.
- **Motivation behind rules** (Dimension 2): if there are constraints, explain why.

The gap identified in Step 2 is the focus of your Step 4 explanation — it is the highest-impact teaching point. The rewrite must demonstrate correct application of all dimensions, not just fix the one gap.

It should:
- Apply all relevant rubric dimensions — not just address the identified gap
- Be written for this specific model and effort level — apply what `references/model-effort-guide.md` says about your model
- Read naturally — like something a confident, experienced user of this model would actually type
- Not be a textbook template or enumerated checklist; be a real prompt

## Step 4: Explain it simply

One short paragraph. No technical terms, no rubric labels, no jargon. Explain what the rewrite gives Claude that the original didn't — in terms of what Claude can now do, not in terms of prompting principles. Write as if explaining to someone who has never thought about how prompts work.

## Step 5: Session efficiency

If the user provided an effort level in Step 0: characterize the session's dominant task types, compare to the effort decision matrix in `references/model-effort-guide.md`, and write the Session efficiency section per the report format.

If no effort level was provided, omit this section entirely.

## Tone

Be direct. One concrete rewrite teaches more than a list of observations.

Plain language in the Step 4 explanation. If a technical term appears anywhere in the report, define it in the same sentence.

Frame the rewrite as reducing ambiguity or giving Claude a clearer target — not as guaranteeing a better result.

## Output

Follow the report format in `references/rubric.md`. Deliver the report inline in the conversation. Do not save to a file unless the user explicitly asks.

## Additional resources

- **Rubric, golden rule test, and report format:** `references/rubric.md`
- **Model-specific rubric emphasis and effort decision matrix:** `references/model-effort-guide.md`
