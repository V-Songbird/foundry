# Foreman — prompt template

<!-- foreman:practices lastmod:2026-07-04
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

**Craft-time environment check (do this now, once, while assembling — not
an instruction for the spawned session to act on later):**

0. **Project opt-out gate.** If a project root is in scope, `Read` its
   `.foreman/config.json` and check `inheritOperatorTone` (default `true`
   if the file, or just this field, is missing/unparseable — matches the
   behavior every version before this flag existed). If `false`: skip
   straight to step 2 below with the flag-not-found defaults for both
   `<task_context>` and `<tone>` — the project has explicitly opted out of
   letting the operator's personal caveman/ponytail state shape prompts
   crafted for it, regardless of what's actually active on this machine
   right now. Standalone `craft-prompt` use with no `.foreman/config.json`
   at all (no Foreman-managed roadmap in this project) behaves as `true`.
1. **Flag check** (only if step 0 didn't already decide `false`): both
   `<task_context>` and `<tone>` below depend on whether ponytail/caveman
   are active *for the crafting session right now*. Check both flags in one
   call: `test -f "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.ponytail-active"; test -f
   "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.caveman-active"` (Bash), or the
   `Test-Path` equivalent against `$env:CLAUDE_CONFIG_DIR` (falling back to
   `$HOME/.claude`) joined with each flag name (PowerShell). Both
   plugins' own `SessionStart` hooks fire unconditionally on every session and
   already re-establish persona/tone from that same flag — so whatever this
   prompt bakes in now only needs to *avoid contradicting* that, not carry the
   state forward itself; if the flag changes before this prompt actually runs,
   the destination session's own hook corrects it regardless of what's written
   below.
2. **Custom sections.** If a project root is in scope, run
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/render-sections.js` — it reads
   `.foreman/config.json`'s optional `customSections` array
   (`[{"tag": "...", "content": "..."}]`), validates each entry (tag format,
   not a reserved template tag, not a duplicate, non-empty content), and
   prints `{"sections": [{"tag", "xml"}], "warnings": [...]}`. Inline every
   `sections[].xml` value, in order, verbatim, at the `[CUSTOM SECTIONS]`
   placeholder below — never invent, edit, or reorder its content, that
   defeats the point of it being project-defined. If `sections` is empty,
   remove the placeholder line entirely. Surface any `warnings` briefly to
   the user (a skipped entry — bad tag, reserved tag, duplicate, empty
   content) so a malformed `config.json` doesn't fail silently; a warning
   here never blocks the rest of the assembly. No project root in scope
   (standalone template use) → skip this step, no placeholder in output.

```xml
<task_context>
[If `.ponytail-active` exists: ponytail's own SessionStart hook already
establishes a "lazy senior developer" persona in whatever session runs this
— a second "You are a [role]" sentence reads as a competing identity claim,
not a layered one. Use domain framing instead: "Domain: [specific role/
specialization]." If the flag doesn't exist: "You are [specific role — e.g.
"a senior security engineer", "a TypeScript developer"]."]
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

<scope_discipline>
If a request mid-session asks for something beyond this task's stated goal
above, don't fold it in silently — say so explicitly first. Once it's
actually done, check whether ROADMAP.jsonl exists at the project root: if
it does, log the extra work as its own entry instead of stretching this
task's story to cover it — it already happened, so create it and close it
out in the same breath rather than leaving it "planned":
echo '{"title":"...","why":"...","what":"...","source":"claude-suggested","status":"planned"}' | node ${CLAUDE_PLUGIN_ROOT}/scripts/roadmap.js add
then, using the id just returned:
echo '{"id":"<new-id>","status":"done","commit":"<sha>"}' | node ${CLAUDE_PLUGIN_ROOT}/scripts/roadmap.js update-status
(touches auto-derives from that commit, same as any other completion). If
no ROADMAP.jsonl exists, flagging it to the user is enough — nothing to
log. This doesn't apply to legitimate refinement of this task's own
scope — only to work that's genuinely a separate concern from
`task_context` above.
</scope_discipline>

<tone>
[If Tone was selected as an optional section: the user's custom tone,
full stop — it replaces everything below. Otherwise: if `.caveman-active`
exists, omit this whole `<tone>` block from the assembled prompt — caveman's
own SessionStart hook already sets terse mode on whatever session actually
runs this, restating it here is redundant and one more thing that can go
stale. If `.caveman-active` doesn't exist, include: "Minimal, professional
conversation — silent by default, say only what the user actually needs to
know, simplify technical explanations, avoid unnecessary jargon."]
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

[CUSTOM SECTIONS — inline each `sections[].xml` from `render-sections.js` here,
verbatim, in order; omit this whole line if `sections` was empty]

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

- [ ] `task_context` names a specific role (or, if `.ponytail-active` was
      found at craft time, domain framing instead of a competing "You are a"
      sentence) and a concrete one-sentence "done" state
- [ ] `truth_grounding` block is present, unmodified — every handoff must carry it
- [ ] `scope_discipline` block is present, unmodified — every handoff must carry it
- [ ] `.foreman/config.json`'s `inheritOperatorTone` was checked first (default
      `true`); only if it isn't `false` were `.caveman-active`/`.ponytail-active`
      checked at craft time (not deferred to the spawned session) — `<tone>`
      omitted entirely if caveman is active and no custom Tone was selected
- [ ] `relevant_files` lists every file path with line ranges — no vague
      references (for `craft-prompt`, get this from the user directly; for
      `foreman:roadmap`, pass the entry's `touches` through as-is — do NOT
      explore the codebase to upgrade area-level hints into exact
      file:line ranges, `truth_grounding` covers that gap at handoff time)
- [ ] `task_rules` has numbered steps AND a runnable verification command with expected output
- [ ] custom sections (if `.foreman/config.json` had a `customSections`
      array) were rendered via `render-sections.js` and inlined verbatim
      after `task_rules` — never hand-written or invented here — and any
      `warnings` it returned were surfaced to the user
- [ ] prompt contains no phrases like "as we discussed" or "from earlier" — zero assumed context
- [ ] a short verb-first imperative name (under 60 chars) and a 1–2 sentence
      plain-language summary are ready — `TaskCreate`'s `subject`/`description`
      and a background `Agent`'s `description` both need this
- [ ] the destination (`TaskCreate` / background `Agent` / clipboard) was
      asked and decided *before* assembling this prompt, and the raw XML is
      never pasted into the chat response — it goes straight to whichever
      destination was picked (clipboard's no-tool fallback is the only
      exception)

## When NOT to hand off — do it inline instead

- Vague observations ("this could be cleaner") — not confirmed, skip it
- Trivial fixes doable inline in seconds — do it now
- Anything needing this conversation's context to understand — stay inline
- Low-confidence hunches — skip
