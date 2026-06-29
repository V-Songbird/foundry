# nudge — model and effort guide

Use this file during Step 0 of the review skill. Read it in full before scanning the conversation. It has two parts:

1. **Model-specific rubric emphasis** — which dimensions to weight more heavily and what patterns to watch for, based on the detected model
2. **Effort decision matrix** — how to assess whether the effort level matched the session's actual task complexity

---

## Part 1: Model-specific rubric emphasis

Apply the notes for your model during the prompt analysis in Steps 3–4. These are additions to the standard 9-dimension rubric, not replacements.

---

### Claude Opus 4.8

**Dimensions to emphasize:**

- **Dimension 4 (Positive framing) — scope is especially critical here.** Opus 4.8 interprets instructions literally and does not silently generalize from one instance to another. "Make this paragraph punchier" applies to that paragraph only. If any analyzed prompt gave Claude a scoped instruction where broader application was clearly intended — and a follow-up correction confirmed it — this is a high-impact gap. Teach it explicitly.
- **Dimension 5 (Action vs. suggestion framing).** Opus 4.8 follows framing precisely, especially at lower effort. "Can you improve this function?" produces suggestions. "Improve this function" produces changes. The distinction is more consequential here than on prior models.

**Patterns to flag during analysis:**

- If a prompt relied on Claude inferring broad scope from a narrow instruction, explain scope literalism by name — users upgrading from prior models may not know this behavior changed.
- If the session ran at low or medium effort and any turns required multi-step reasoning or complex work: note that raising effort (not additional prompting) is the primary lever. Prompting cannot compensate for under-effort on this model.

**What not to flag:**

- Do not criticize users for not over-specifying design prompts. Opus 4.8 has stronger aesthetic instincts than prior models and typically needs less visual direction.

---

### Claude Fable 5 / Claude Mythos 5

**Dimensions to emphasize:**

- **Dimension 3 (Context and background) — purpose framing is particularly high-value.** Fable 5 performs better when given the intent behind a request, not just the request itself. The purpose template ("I'm working on [X] for [Y]. They need [Z]. With that in mind: [request]") gives Claude the goal behind the task so it can connect related context rather than treating the request in isolation. This pattern is more consequential on Fable 5 than on earlier models.
- **Dimension 4 (Positive framing) — watch for over-prescription.** Skills and prompts built for earlier models are often too prescriptive for Fable 5 and can degrade output. If a user wrote long, heavily enumerated instructions for something Fable 5 could have handled with a brief directive, flag this. The instruction following here is strong enough that brevity is often more effective than enumeration.

**Patterns to flag during analysis:**

- **Reasoning reproduction — flag this explicitly if observed.** If any user prompt asked Claude to "show your thinking", "explain your reasoning step by step", "think step by step and show your work", "walk me through your thought process", or similar: this is a specific risk on Fable 5. Prompts that ask the model to echo, transcribe, or explain its internal reasoning can trigger a `reasoning_extraction` refusal. The correct pattern is to use adaptive thinking's structured `thinking` blocks for reasoning visibility — not user-facing instructions. Name this explicitly in your analysis if you saw it.
- If prompts were very long and enumerated every constraint, note that Fable 5's instruction following is strong enough that a single clear directive often outperforms a list of twelve rules.

**What not to flag:**

- Do not flag users for omitting chain-of-thought scaffolding. Fable 5 reasons effectively without it on most tasks — adding it is more likely to cause the refusal pattern above than to improve results.

---

### Claude Sonnet 4.6 / Claude Haiku 4.5

All 9 dimensions are equally weighted. No model-specific additions apply. Standard rubric guidance is sufficient.

Note: more explicit guidance is often needed for complex multi-step work on these models than on Fable 5 or Opus 4.8 — prompts that leaned on implicit context to carry Claude through a multi-step task are worth flagging here.

---

## Part 2: Effort decision matrix

Use this section only if the user provided an effort level in Step 0. Characterize the session's task types from the conversation, compare to the matrix, and write the Session efficiency section of the report.

---

### Task type → appropriate effort tier

| Task type | Appropriate model | Appropriate effort |
|---|---|---|
| Simple Q&A, quick lookups, formatting, one-shot tasks | Haiku 4.5 or Sonnet 4.6 | low – medium |
| Standard writing, analysis, research summaries, single-file coding | Sonnet 4.6 or Opus 4.8 | medium – high |
| Complex reasoning, multi-file coding, structured multi-step analysis | Opus 4.8 | high – xhigh |
| Long-horizon agentic work, hard engineering problems, complex multi-turn tasks | Opus 4.8 or Fable 5 | xhigh |
| Multi-day autonomous runs, hardest problems, parallel subagent orchestration | Fable 5 | xhigh – max |

---

### How to assess the session

1. **Characterize the dominant task type.** What did most of the session's work actually involve? Simple, medium-complexity, or complex?
2. **Note the hardest task.** Appropriate effort is set by the ceiling, not the average. A session that was mostly simple Q&A but included one complex agentic turn should be assessed against the harder task.
3. **Compare effort used vs. effort appropriate.** If they match, confirm it. If there's a mismatch, name the direction and what to use instead.

---

### Mismatch language

Use this as a template — adapt to what was actually observed, don't copy verbatim.

**Over-powered (effort higher than needed):**
> "This session was primarily [task type]. [Effort level] adds computation without a corresponding quality return on these task types — [lower effort] would have delivered similar results at lower cost and latency."

**Under-powered (effort lower than needed):**
> "Several turns involved [complex task type]. At [effort level], [model] [specific behavior — e.g., "scopes its work to what was explicitly asked rather than engaging deeper reasoning"] — raising to [appropriate effort] is the primary lever here, not additional prompting."

**Appropriate match:**
> "The effort level matched the session well. [Task type] is squarely in the range where [effort] delivers meaningful returns without over-computation."

---

### Model-specific effort notes

**Opus 4.8:**
- At `low` and `medium`, the model scopes its work strictly and may under-think moderately complex problems. This is by design, not a bug — raising effort is the fix, not prompting around it.
- `xhigh` is the recommended default for coding and agentic tasks.
- `max` can cause overthinking in some cases — it's not always better than `xhigh`. If a user chose `max` for a session that didn't involve intelligence-demanding tasks, note this.

**Fable 5 / Mythos 5:**
- Lower effort settings on Fable 5 often still exceed `xhigh` performance on prior models. `high` is the recommended default for most tasks.
- At `high` and above on routine work, may over-deliberate, over-plan, or take unrequested actions — explicit scope instructions mitigate this.
- Individual requests at higher effort can run for many minutes on hard tasks. This is expected behavior, not a performance issue.

**Sonnet 4.6 / Haiku 4.5:**
- Standard effort/quality tradeoff applies without model-specific caveats.
- `high` for intelligence-sensitive tasks; `medium` or `low` for cost-sensitive, routine work.
