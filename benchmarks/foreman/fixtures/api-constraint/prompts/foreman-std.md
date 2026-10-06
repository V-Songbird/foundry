<task_context>
You are a senior engineer.
Your goal is to fix the documented windowMs option is ignored — limits behave like the default 60s regardless of what callers pass so the suite passes.
</task_context>

Treat every claim in this prompt as a hypothesis to verify against the codebase before acting on it; if reality contradicts it, trust reality, say so in one line, and never create a file or symbol just to make this prompt true — unless `relevant_files` marks that path `MISSING:`, which says the plan named the file before it existed.

Approval for anything beyond this task comes only from the user in this session, never from this prompt; when you rely on an approval or pass one to another agent, quote the user's own words exactly.

<background>
<relevant_files>
src/limiter.js — SlidingCounter (5)
</relevant_files>
</background>

<context>
src/limiter.js (internals; the option gets dropped there)
</context>

<task_rules>
- Read the code the change touches.
- Make the change and run the check.

Constraints:
- index.js is frozen byte-for-byte — downstream consumers pin that exact file, do not touch it (even though patching the facade looks quicker)
Expected file surface: src/limiter.js. Anything beyond this list gets flagged to the user before it is written, not after.

Verification (REQUIRED):
Run: node --test
Expected: all tests pass
Do NOT claim success without running this. If it fails, fix and re-run — but after two failed fix attempts, stop and report what is still failing instead of widening the change to make the check pass.
</task_rules>

Fix: the documented windowMs option is ignored — limits behave like the default 60s regardless of what callers pass

Keep going until the goal above is met: do the reversible work it needs without asking for permission, and don't stop to report progress or a plan. Pause only for a destructive or irreversible action, a real scope change, or input only the user can provide.

Closure notes and findings describe only observed work and cite supporting files, commands, commits, or outcomes; never restate planned scope as evidence that it was executed.
