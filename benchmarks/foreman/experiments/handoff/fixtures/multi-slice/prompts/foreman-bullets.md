<task_context>
You are a senior Node.js developer.
Your goal is to fix three independent bugs — in src/slug.js, src/duration.js, and src/pluralize.js — so `node --test` passes, without touching anything outside those three files.
</task_context>

<truth_grounding>
Before acting on anything in this prompt, verify it against the current state
of the codebase — read the cited files, run the cited commands. This prompt
may have been written earlier and executed later (queued via TaskCreate, run
by a background Agent, or pasted into a fresh session); treat every claim
below as a hypothesis to confirm at the start of this session, never as a
fact to assume. If reality contradicts this prompt, trust reality and
proceed from what you actually find — and treat the mismatch itself as part
of the outcome: state it in one line of your final message (and in the
roadmap entry's notes, if this task closes one). A minimal register trims
narration, never a found discrepancy.
</truth_grounding>

<scope_discipline>
If a request mid-session asks for something beyond this task's stated goal
above, don't fold it in silently — flag it to the user first. This project
has no ROADMAP.jsonl, so flagging it is enough — nothing to log. This
doesn't apply to legitimate refinement of this task's own scope — only to
work that's genuinely a separate concern from `task_context` above.
</scope_discipline>

<tone>
Minimal, professional conversation — silent by default, say only what the
user actually needs to know, simplify technical explanations, avoid
unnecessary jargon. If an output style already governs this session's voice,
defer to it — this tone applies only in its absence.
</tone>

<background>
<relevant_files>
src/slug.js:5-7 — slugify(), never trims a leading or trailing hyphen left over from punctuation collapsing
src/duration.js:5-9 — formatDuration(), rounds the minute count instead of flooring it
src/pluralize.js:5-8 — pluralize(), always appends a bare 's', missing the consonant-y and sibilant rules
tests/slug.test.js, tests/duration.test.js, tests/pluralize.test.js — the three failing suites, one per module
</relevant_files>
<context>
Three small utility modules, plain Node, no dependencies; tests use node:test.
None of the three modules import each other or share any file — each bug is
fully independent of the other two.
</context>
</background>

<task_rules>
Fix the three independent bugs — in src/slug.js, src/duration.js, and src/pluralize.js — so the full test suite passes.

Constraints:
- Do NOT modify anything outside src/slug.js, src/duration.js, and src/pluralize.js
- Do NOT change test files; make the code satisfy the tests

Verification (REQUIRED):
Run: node --test tests/slug.test.js
Expected: all tests pass, exit code 0
Run: node --test tests/duration.test.js
Expected: all tests pass, exit code 0
Run: node --test tests/pluralize.test.js
Expected: all tests pass, exit code 0
Do NOT claim success without running these. If any fails, iterate until it passes.
</task_rules>

Fix all three bugs so the full test suite passes, and leave everything else alone.

Reason through the approach and edge cases in your thinking before editing — not in prose between tool calls. The steps and commands above are a working plan, not a narration script: whatever output style governs this session decides what you say aloud, so don't announce step transitions or restate command results in chat. The same style governs the register of your final message. Full evidence and findings belong in their durable home — the roadmap entry, the commit message, or the artifact the task names — with the final message stating the outcome and pointing there.

<output_format>
Give a concise, human-readable summary: what changed, and the verification
result. No XML tags in the visible response — a human reads this directly
in chat by default, and raw `<tag>` markers read as a bug, not structure.
</output_format>
