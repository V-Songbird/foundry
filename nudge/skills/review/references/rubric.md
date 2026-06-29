# nudge — analysis rubric

Use this file when executing the review skill. It contains the 9 dimensions for analyzing user prompts, the golden rule test, and the exact report format.

---

## The 9 Dimensions

For each prompt you analyze, check it against these dimensions. Identify the **1–2 with the highest impact** — not every gap that exists. The goal is to teach the most transferable lesson, not to enumerate every possible improvement.

---

### 1. Role and task context

**What it is:** Did the user tell Claude who it is and what it is trying to accomplish — in a sentence or two before the task begins?

**Why it matters:** Without a role, Claude draws from its entire distribution of possible response styles — formal report, casual summary, expert analysis, general explanation. A single role sentence collapses that distribution. "You are a CFO briefing a board" eliminates a thousand wrong defaults before Claude writes a word.

**Signs it's missing:** The response used a generic tone when a specific voice was needed. Claude gave a balanced, hedged answer when the user needed a decisive one. The output could have been written for any reader, not this one.

**Example:**
- Without: `"Summarize this report."`
- With: `"You are a CFO briefing a board of directors. Summarize this report in 3 executive bullet points — decision-relevant facts only, no background."`

---

### 2. Motivation behind rules

**What it is:** When the user gave Claude a constraint or rule, did they explain why?

**Why it matters:** Claude generalizes from the reason, not just the rule. "Never use ellipses because this output is read aloud by a TTS engine" tells Claude to avoid any punctuation the TTS might mishandle — not just ellipses. The bare rule "never use ellipses" does not generalize. Claude is smart enough to extend from the explanation; it needs the explanation to do so.

**Signs it's missing:** Claude followed the literal instruction but violated its spirit in adjacent cases. The rule was honored but its purpose was not. A follow-up correction was needed to address a related issue the original rule did not cover.

**Example:**
- Without: `"NEVER use bullet points."`
- With: `"Write in flowing prose — this will be pasted directly into a Word document where bullet points break the formatting."`

---

### 3. Context and background

**What it is:** Did the user give Claude enough background to avoid filling gaps with assumptions?

**Why it matters:** Claude fills missing context with plausible defaults, which are usually generic. Without context, Claude assumes a general audience, a standard use case, and a typical starting point — none of which may apply. The more specific the task, the more expensive the defaults are.

**Signs it's missing:** Claude asked clarifying questions. The response assumed the wrong audience or starting conditions. Claude suggested things the user had already ruled out. The output felt written for a stranger rather than someone who knows the situation.

**Example:**
- Without: `"Write talking points for a team meeting about the new process."`
- With: `"Write talking points for a 15-minute team meeting with 8 engineers who are skeptical of the new deployment process. The main objection I'm expecting is that it adds steps to their workflow. Keep the tone collaborative, not defensive."`

**Purpose template:** For longer or more complex requests, frame the full intent upfront: *"I'm working on [larger task] for [who it's for]. They need [what the output enables]. With that in mind: [request]."* This gives Claude the goal behind the task, not just the task — letting it connect related context rather than treating the request in isolation.

---

### 4. Positive framing

**What it is:** Did the user state what they want Claude to do, rather than only what not to do?

**Why it matters:** A negative instruction eliminates one option but leaves the space of alternatives wide open. "Don't use bullet points" still allows numbered lists, headers, tables, and dense markdown — Claude has to guess your actual preference. "Write in flowing prose paragraphs" removes the guessing entirely. Positive instructions define a target; negative instructions only remove one wrong answer.

Scope is a variant of the same problem. Claude applies instructions to what was explicitly mentioned, not to the whole document or conversation unless told to. If you write "make this paragraph punchier," Claude makes that paragraph punchier. If you meant every paragraph, say so explicitly: "Make every paragraph punchier — apply this throughout."

**Signs it's missing:** Claude honored the restriction but picked an equally unwanted alternative. The output technically complied but missed the intent. A follow-up was needed to say what Claude should have done instead. Or: the instruction was applied to the first instance only, and the user had to say "do that for the rest too."

**Example:**
- Without: `"Don't make it too formal."`
- With: `"Write in a conversational tone — like you're explaining this to a smart friend over coffee, not presenting to a committee."`
- Scope example — Without: `"Shorten this section."` (Claude shortens one section) / With: `"Shorten every section by about a third — the whole document is too long."`

---

### 5. Action versus suggestion framing

**What it is:** When the user wanted Claude to do something, did they use imperative language?

**Why it matters:** Modern Claude models are trained for precise instruction following. Phrases like "can you suggest", "what do you think about", or "could you help me" are interpreted literally — they produce analysis, recommendations, or suggestions, not implementations. "Refactor this function" produces code. "Can you suggest how to refactor this function?" produces ideas about how to refactor. The distinction is a single word choice, but the output difference is significant.

**Signs it's missing:** Claude produced a plan or set of recommendations when the user wanted direct execution. The user had to follow up with "just do it" or "go ahead and make the changes." The response analyzed the problem instead of solving it.

**Example:**
- Without: `"Can you suggest some improvements to this function?"`
- With: `"Improve this function for readability and performance. Make the changes directly."`

---

### 6. Examples

**What it is:** Did the user show Claude what "good" looks like, rather than only describing it?

**Why it matters:** Examples are the most reliable way to transfer format, tone, and structure. A description of desired output leaves room for interpretation; a concrete example closes that gap. The threshold for examples that actually help: at least 3, varied enough to cover different cases, wrapped in `<example>` tags so Claude can distinguish them from instructions. One example is better than none, but one example often teaches Claude a pattern that doesn't generalize.

**Signs it's missing:** The output format or tone didn't match what the user had in mind. A follow-up was needed to describe expectations that could have been shown. Claude produced a technically correct but stylistically off response.

**Example:**
- Without: `"Write three product headlines in our brand voice."`
- With: `"Write three product headlines in our brand voice. Here are examples of headlines we've used before: <example>Built for the way teams actually work.</example> <example>Less setup. More momentum.</example> <example>The tool that gets out of your way.</example>"`

---

### 7. Structure via XML

**What it is:** When the prompt mixed multiple types of content — instructions, context, a pasted document, a specific question — did the user use XML tags to label and separate them?

**Why it matters:** Disorganized prompts degrade output quality independently of how clear the instructions are. XML tags tell Claude *what* each section is, not just *where* it starts. `<context>`, `<instructions>`, `<document>`, `<question>` are semantically labeled slots Claude can refer back to precisely. The alternative — prose with line breaks — forces Claude to infer the structure, which introduces error.

**Signs it's missing:** The prompt pasted a large block of text and then asked a question in the same paragraph. Claude summarized the document when asked to analyze it. Claude mixed up which part was instruction and which was data. The response addressed the wrong section of the prompt.

**Example:**
- Without: `"Here's our Q2 report: [paste]. What are the three biggest risks for Q3?"`
- With:
  ```
  <document>
  [Q2 report paste]
  </document>

  <question>
  Based on the Q2 report above, what are the three biggest risks for Q3? One sentence each.
  </question>
  ```

---

### 8. Output format specification

**What it is:** Did the user tell Claude what the response should look like — length, structure, format, or level of detail?

**Why it matters:** Without format guidance, Claude defaults to whatever structure feels natural for the task, which may not match the user's intent. The same request can produce a 10-point bulleted list, a two-paragraph prose summary, a table, or a numbered ranking — all equally valid responses, and Claude will pick one. Specifying format is not pedantic; it eliminates an entire class of "that's not what I wanted" follow-ups.

**Signs it's missing:** The response was the right content but the wrong shape. The user asked Claude to redo it in a different format. The response was much longer or shorter than expected. Claude used markdown when the user needed plain text, or vice versa.

**Example:**
- Without: `"Summarize the key decisions from this meeting transcript."`
- With: `"Summarize the key decisions from this meeting transcript. Format: a numbered list, one sentence per decision, ordered by priority. Maximum 6 items."`

---

### 9. Long-context ordering

**What it is:** When the user pasted a large document alongside a question, did the question come *after* the document, not before it?

**Why it matters:** When a query follows a long document, Claude processes it with full context already loaded — response quality improves measurably compared to leading with the question. Placing the question first means Claude begins generating before it has read everything relevant. For short prompts this does not matter; for prompts containing pasted documents, reports, or transcripts, it does.

**Signs it's missing:** The prompt opened with the question and then pasted the document. Claude's response felt like it was written without fully accounting for the document content. Key details from the document were missing from the response.

**Example:**
- Without: `"What are the main themes in this research? [paste of 3,000-word document]"`
- With: `"[paste of 3,000-word document]\n\nWhat are the three main themes in the research above? Two sentences each."`

---

## The Golden Rule Test

Apply this to every prompt before writing the analysis: *Would a smart colleague with no domain knowledge understand this prompt well enough to execute it accurately?*

If yes, the prompt is solid. Name what it got right and why.

If no, the gap between "what a colleague could execute" and "what the user actually wrote" is the lesson. Start from there.

---

## Report Format

Use this exact structure. Plain markdown, no excessive headers.

```
## nudge

**Session:** [One sentence: what was accomplished — and if the session required corrections or redirections, note that briefly]

---

**Opening prompt:**
> [Verbatim first prompt, unchanged — do not paraphrase or clean it up]

**What the session needed:** [2–3 sentences max. Name the 1–2 gaps that caused extra turns or required guessing. Ground it in what actually happened — no abstract principles, no preamble.]

**What it could have been:**
> [The complete rewrite — natural, confident, written for this model at this effort level. Not a template.]

**Why it works:** [One short paragraph in plain, non-technical language. No rubric labels, no jargon. Explain what Claude can now do that it couldn't do before — in terms the user can immediately understand without knowing anything about prompting.]

---

### Session efficiency  ← omit entirely if the user did not provide an effort level in Step 0

**Model:** [detected model]
**Effort:** [user-provided effort level]

[One paragraph: characterize the dominant task types observed in this session, state the appropriate effort tier from the matrix in `references/model-effort-guide.md`, and compare. If there's a mismatch, name the direction and what to use instead. If the effort matched, confirm it briefly. One short paragraph — a verdict, not an analysis.]

**Model note:** [Include only if a model-specific pattern was observed. Omit this line entirely if not.]
```

**Tone reminders:**
- Do not open with praise or close with encouragement
- One rewrite, one plain-language explanation — not a list of every issue found
- The Step 4 explanation must use no technical terms or rubric labels — explain the mechanism in everyday language
- The rewrite must read naturally — not a textbook example, not a checklist of injected components
- Frame the rewrite as reducing ambiguity or giving Claude a clearer target, not as guaranteeing a better result
