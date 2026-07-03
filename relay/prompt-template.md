# Relay — prompt template

<!-- relay:practices lastmod:2026-07-03
     source-a: https://code.claude.com/docs/en/best-practices.md
     source-b: https://code.claude.com/docs/en/sub-agents.md
     source-c: Anthropic Prompting 101 — Code w/ Claude 2025-05-22
     source-d: https://code.claude.com/docs/en/about-claude/models/prompting-fable5 -->

The handed-off session — whether run via `TaskCreate` in this session, a
background `Agent`, or copy-pasted elsewhere — has **zero memory** of this
conversation. Fill every required section. A self-contained prompt is not
optional — it is the only way the handed-off work can act correctly.

---

## Template

```xml
<task_context>
You are [specific role — e.g. "a senior security engineer", "a TypeScript developer"].
Your goal is [one sentence — what "done" looks like for this specific task].
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
Check for caveman mode: read `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.caveman-active`
(Bash). If it exists with a non-off mode, communicate tersely for this whole
session — drop articles/filler/hedging, fragments OK, keep full technical
substance, still write code/commits/security notes in normal prose. Otherwise:
minimal, professional conversation — silent by default, say only what the
user actually needs to know, simplify technical explanations, avoid
unnecessary jargon. [If Tone was selected as an optional section: the user's
custom tone replaces this default entirely.]
</tone>

<background>
<relevant_files>
[Exact file paths with line ranges for every file the task touches.
Example: src/auth/middleware.ts:42-80 — token refresh logic
Include every file. No vague references like "the auth module".]
</relevant_files>
<context>
[Architectural decisions, constraints, patterns already in use.
Anything needed to understand the codebase without prior conversation.
Example: "Uses JWT tokens in httpOnly cookies. No third-party auth libs."]
</context>
</background>

<task_rules>
Step 1: [What to read or explore first]
Step 2: [What to analyze or check next]
Step 3: [What to implement, fix, or produce]

Constraints:
- [Hard limits — files NOT to modify, interfaces NOT to break]
- [Style or pattern to follow — point to an example file if one exists]

Verification (REQUIRED):
Run: [exact command — e.g. "npm test -- --testPathPattern=auth"]
Expected: [pass/fail signal — e.g. "all tests pass", "exit code 0"]
Do NOT report success without running this. If it fails, iterate until it passes.
</task_rules>

[OPTIONAL — include only when the task has a clear before/after pattern]
<example>
[Before snippet or input → After snippet or expected output]
</example>

[The immediate, specific request in one sentence.]

Think step by step before making changes. Consider edge cases before writing code.

<output_format>
Give a concise, human-readable summary: what changed, and the verification
result. No XML tags in the visible response — a human reads this directly
in chat by default, and raw `<tag>` markers read as a bug, not structure.
[Only if something downstream actually parses this output — a script, a
following automated step — name a specific XML tag here explicitly and say
who/what consumes it. Otherwise omit this bracket entirely; don't wrap by
default "just in case".]
</output_format>
```

---

## Checklist (verify before handoff)

- [ ] `task_context` names a specific role and a concrete one-sentence "done" state
- [ ] `truth_grounding` block is present, unmodified — every handoff must carry it
- [ ] `relevant_files` lists every file path with line ranges — no vague
      references (for `craft-prompt`, get this from the user directly; for
      `relay:roadmap`, pass the entry's `touches` through as-is — do NOT
      explore the codebase to upgrade area-level hints into exact
      file:line ranges, `truth_grounding` covers that gap at handoff time)
- [ ] `task_rules` has numbered steps AND a runnable verification command with expected output
- [ ] prompt contains no phrases like "as we discussed" or "from earlier" — zero assumed context
- [ ] a short verb-first imperative name (under 60 chars) and a 1–2 sentence
      plain-language summary are ready — `TaskCreate`'s `subject`/`description`
      and a background `Agent`'s `description` both need this

## When NOT to hand off — do it inline instead

- Vague observations ("this could be cleaner") — not confirmed, skip it
- Trivial fixes doable inline in seconds — do it now
- Anything needing this conversation's context to understand — stay inline
- Low-confidence hunches — skip
