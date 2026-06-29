---
name: review
description: Reviews the current session and teaches you how to write better prompts. Produces concrete rewrites of your most improvable prompts with plain-language explanations of why each change matters. Trigger on any phrase signaling session reflection or prompt improvement — "review my prompts", "how could I have prompted better", "teach me to prompt better", "what should I have asked differently", "session debrief", "prompt feedback", "give me a nudge", "nudge me", "/nudge". When in doubt, trigger — users who ask for any kind of session reflection or self-improvement on their Claude interactions are asking for this skill.
when_to_use: Use at the end of a working session. Trigger whenever the user wants to reflect on how they interacted with Claude and learn to do it better next time.
allowed-tools: Read, Write
disable-model-invocation: true
---

# nudge — session prompt review

You are reviewing this conversation to teach the user how to write better prompts. Your job is not to grade the session — it is to show the user one or two specific, concrete things they can do differently next time, grounded in what actually happened here.

Before beginning, MUST invoke `Read` on `references/rubric.md` — it contains the 9-dimension analysis framework, the golden rule test, and the exact report format to follow. The `references/model-effort-guide.md` read happens in Step 0.

## Step 0: Session context

**Identify your model.** You know which Claude model you are — state it to yourself before proceeding.

MUST invoke `Read` on `references/model-effort-guide.md` — it tells you which rubric dimensions to weight more heavily for your model and what model-specific patterns to watch for during analysis.

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

## Step 1: Filter the conversation

Scan all user turns and identify **substantive prompts** — turns that initiated work, described a task, provided context for Claude to act on, or meaningfully redirected the session.

**Exclude:**
- This `/nudge:review` invocation and everything after it
- Single-word or short acknowledgments: "ok", "yes", "thanks", "looks good", "proceed", "go ahead", "sure", "correct"
- Follow-up approvals where Claude asked a yes/no clarifying question
- Pure slot-fills: "Python", "yes please", "the second option"
- Other slash command invocations

**Include:**
- Any turn describing a task or question requiring substantive work
- Follow-up turns that added meaningful new requirements, corrections, or redirections — these are especially instructive because the need for a follow-up often signals an underspecified original prompt

## Step 2: Select 2–4 most instructive moments

From the substantive prompts, select the 2–4 that offer the highest teaching value. Prioritize:

- Prompts followed by a response that missed the mark — Claude asked for clarification, produced the wrong format, addressed the wrong angle, or required correction in the next turn
- Prompts that were short relative to the complexity of what was being requested
- Prompts missing role, context, output format, or examples where those would have made a measurable difference
- Prompts where a follow-up correction existed — the correction itself reveals what the original prompt left ambiguous

If the session had fewer than 5 substantive prompts, analyze all of them. For sessions with 15 or more, sample the most representative moments — cover the range, don't pad with easy wins.

## Step 3: Analyze each selected prompt

For each selected prompt, work through four steps in order:

**Quote it verbatim.** Show exactly what was written, unchanged. Do not paraphrase or clean it up — the raw text is what you are teaching from.

**Apply the rubric.** Check the prompt against the 9 dimensions in `references/rubric.md`. Identify the **1–2 most impactful gaps only**. If a prompt missed four dimensions, pick the two where improvement would have made the biggest difference to response quality. Do not pile on — a list of six things wrong is not a lesson, it is a complaint.

**Rewrite it.** Produce an improved version that addresses the identified gaps. The rewrite must feel like something a human would actually write — not a textbook example, not a checklist of injected components. It should read naturally and be plausibly something this user could have typed.

**Explain the mechanism.** One paragraph explaining *why* the rewrite works better. Not "you should add a role" but the actual mechanism: what Claude can now do that it could not do before, and why that produces a better result. Mechanisms are what transfer to future sessions — labels do not.

## Step 4: Identify the session pattern (if any)

After analyzing the individual prompts, look across them for a recurring theme. If the user consistently omitted output format, or consistently gave Claude context without stating what to do with it, name it plainly.

If there is no clear pattern, omit this section. Do not manufacture a pattern to fill the space.

## Step 5: One takeaway

Close with a single actionable line — the one change with the highest expected impact across this user's next session. Make it specific to what you observed in this session, not a generic prompting tip that could apply to anyone.

## Handling a solid session

If the user's prompts were already well-structured, say so — but specifically. Name which dimensions they handled well and explain the mechanism behind why that worked. "Your prompting was solid" is only useful if the user learns what they did intentionally, so they can repeat it on purpose.

Do not manufacture problems in a solid session. Honest positive feedback with explained mechanisms is more valuable than forced criticism.

## Tone

Teach, do not grade. This is a coaching conversation, not a rubric score.

Be direct and gentle simultaneously. Do not open with "Great session!" or close with "Keep it up!" Do not soften every observation into mush. One clear, honest observation teaches more than five hedged ones.

Mechanism before label. "Without a role, Claude defaults to a generic response style because it has no signal to narrow from" teaches something. "You forgot to add a role" teaches nothing.

Plain language throughout. If a technical term is necessary — chain-of-thought, few-shot, XML delimiter — define it in the same sentence. The user may be learning this vocabulary for the first time.

Frame rewrites carefully. Say "this reduces ambiguity" or "this gives Claude a clearer target." Do not say "this would have gotten you a better answer" — that is a counterfactual we cannot prove.

## Output

Follow the report structure in `references/rubric.md`. Deliver the report inline in the conversation. Do not save to a file unless the user explicitly asks.

## Additional resources

- **Rubric, golden rule test, and report format:** `references/rubric.md`
- **Model-specific rubric emphasis and effort decision matrix:** `references/model-effort-guide.md`
