# Relay — spawn_task prompt template

<!-- relay:practices lastmod:2026-06-30
     source-a: https://code.claude.com/docs/en/best-practices.md
     source-b: https://code.claude.com/docs/en/sub-agents.md
     source-c: Anthropic Prompting 101 — Code w/ Claude 2025-05-22
     source-d: https://code.claude.com/docs/en/about-claude/models/prompting-fable5 -->

The spawned session has **zero memory** of this conversation. Fill every required
section. A self-contained prompt is not optional — it is the only way the spawned
session can act correctly.

---

## Template

```xml
<task_context>
You are [specific role — e.g. "a senior security engineer", "a TypeScript developer"].
Your goal is [one sentence — what "done" looks like for this specific task].
</task_context>

<tone>
Technical and direct. Ground every conclusion in a file read or command output.
If information is missing or ambiguous, say so explicitly — never guess.
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
[What this session must produce: list of files modified, PR opened, report written.
Wrap the final deliverable in a named XML tag so it is parseable.
Example: wrap the summary in <findings></findings> tags.]
</output_format>
```

---

## Checklist (verify before calling spawn_task)

- [ ] `task_context` names a specific role and a concrete one-sentence "done" state
- [ ] `relevant_files` lists every file path with line ranges — no vague references
- [ ] `task_rules` has numbered steps AND a runnable verification command with expected output
- [ ] prompt contains no phrases like "as we discussed" or "from earlier" — zero assumed context
- [ ] `title` in spawn_task call: verb-first imperative, under 60 chars
- [ ] `tldr` in spawn_task call: 1–2 plain sentences, no file paths, no code

## When NOT to use spawn_task

- Vague observations ("this could be cleaner") — not confirmed, skip it
- Trivial fixes doable inline in seconds — do it now
- Anything needing this conversation's context to understand — stay inline
- Low-confidence hunches — skip
