# Anti-patterns for Claude Code instruction artifacts

Scan this list before returning any artifact. Each ❌ / ✅ pair shows a common failure mode and the correct form.

## Category → checklist item map

Use this table to navigate from a category here back to the governing checklist item in `SKILL.md` § Pre-completion checklist (and the proofreader's matching scoring rule). One category may map to multiple items; some categories are uncategorized in the checklist (general hygiene rules).

| Category | Primary checklist item | Notes |
|---|---|---|
| Tool-level omission | 1, 2, 3, 4, 5, 7 | One pair per tool: `AskUserQuestion`→1, `TodoWrite`→2, `Bash`→3, `Agent`→4, `EnterPlanMode`→5, `Read`/`Grep`/etc.→7 (literal naming) |
| Parameter-level omission | 1, 2, 3, 4, 5, 7, 8 | Schema-shape failures for the same tools; supporting-file index pair → 8 |
| Subagent mistakes | 4, 6 | `tools` in frontmatter not prose → 4; `AskUserQuestion` in subagent → 6; nested spawning, cwd inheritance, parent-skill inheritance → general subagent hygiene |
| Weasel verbs | 7 | All four pairs |
| Hook mistakes | (general) | Hooks are not directly in the 13-item checklist; these prevent silent no-ops |
| CLAUDE.md mistakes | 8, (general) | Plugin-root `CLAUDE.md` non-load → decomposition § 9 Q1 (Deploy) |
| Plan-mode mistakes | 5, 11 | `allowedPrompts` caveat → 5; `mode:` vs `permissionMode:` → 11 |
| Frontmatter mistakes | 11 | All fourteen pairs |
| Dynamic injection mistakes | 13 | All four pairs |
| Decomposition mistakes | 12 | All three pairs |
| Stale or deprecated tool usage | (general) | Catches drift between artifact and current tool catalog |
| Permission-rule mistakes | (general) | Affects `settings.json`, not directly checklist-scored |

## Category: Tool-level omission

### ❌ Prose placeholder for clarification
"If the user's intent is ambiguous, ask the user which approach they prefer."

### ✅ Name `AskUserQuestion` with full shape
"Invoke `AskUserQuestion` with `question`, `header` (≤12 chars), `multiSelect: false`, and 2–4 `options` each with `label` + `description`."

**Why:** "Ask the user" fires nothing — Claude paraphrases in chat, so the button-driven UI never appears and the answer enters as free text.

---

### ❌ Prose placeholder for progress
"Track your progress through the workflow as you go."

### ✅ Name `TodoWrite` (or `TaskCreate`/`TaskUpdate`) with paired fields
"Invoke `TodoWrite` with `todos: [{ content: 'Run the test suite', activeForm: 'Running the test suite', status: 'pending' }, ...]`. Use `TaskCreate` + `TaskUpdate` in interactive sessions."

**Why:** "Track progress" is not a tool — without naming the tool, no todo UI renders.

---

### ❌ Prose placeholder for planning
"Plan before coding."

### ✅ Name `EnterPlanMode` and `ExitPlanMode`
"Invoke `EnterPlanMode` (no params). Draft the plan with sections Problem / Approach / Files touched / Risks / Test strategy. Invoke `ExitPlanMode` to present it for approval."

**Why:** "Plan before coding" does not switch the session into the read-only plan permission mode; only `EnterPlanMode` does.

---

### ❌ Prose placeholder for shell work
"Run the tests and the linter."

### ✅ Name `Bash` with `command` and `description`
"Invoke `Bash` with `command: 'npm test'`, `description: 'Running the test suite'`, `timeout: 120000`. Then invoke `Bash` with `command: 'npm run lint'`, `description: 'Linting the project'`."

**Why:** Bare "run X" is ambiguous between Bash, Skill, or background tasks — Claude may pick wrong, omit the description, or skip the timeout.

---

### ❌ Prose placeholder for context-gathering
"Gather context from the docs before answering."

### ✅ Name `Read` / `Grep` / `Glob` / `WebFetch` explicitly
"Invoke `Glob` with `pattern: 'docs/**/*.md'`, then invoke `Read` on each candidate. For external URLs invoke `WebFetch` with `url` and a scoping `prompt`."

**Why:** "Gather context" doesn't pick a tool. The wrong tool wastes context (e.g. `Read` on a 5,000-line file when `Grep` with `output_mode: 'content'` would have sufficed).

---

### ❌ Prose placeholder for delegation
"For large research, hand off to a subagent."

### ✅ Name `Agent` with full shape
"Invoke `Agent` with `subagent_type: 'general-purpose'`, `description: 'Scanning auth subsystem for token-handling sites'`, `prompt: '<focused instructions>'`, `max_turns: 6`."

**Why:** Without naming `Agent` and its required fields (`subagent_type`, `description`, `prompt`), Claude tends to inline the work and bloat main context.

---

## Category: Parameter-level omission

### ❌ `AskUserQuestion` without `header` / `multiSelect`
"Invoke `AskUserQuestion` with options A, B, C."

### ✅ Full schema, every UX-critical field set
```
Invoke AskUserQuestion with:
  questions: [{
    question: "Which migration strategy should I use?",
    header: "Migration",
    multiSelect: false,
    options: [
      { label: "In-place",        description: "Mutate existing tables; faster, no rollback." },
      { label: "Parallel rewrite", description: "Build new schema alongside; safer, slower." },
      { label: "You decide",       description: "Let Claude pick based on codebase fit." }
    ]
  }]
```

**Why:** `header` (≤12 chars) is the UI label — omission causes truncation. `multiSelect: false` selects radio vs checkbox — omitting it silently disables multi-answer.

---

### ❌ `TodoWrite` items without `activeForm`
`{ content: "Run the tests", status: "pending" }`

### ✅ Paired `content` + `activeForm` on every item
`{ content: "Run the tests", activeForm: "Running the tests", status: "pending" }`

**Why:** `activeForm` renders during `in_progress`; `content` renders pending/completed. They are not interchangeable — a missing `activeForm` blanks the status line.

---

### ❌ Supporting files present in the skill directory but never linked from `SKILL.md`
Skill ships with `reference.md`, `examples.md`, `references/tools.md` — but the SKILL.md body never names any of them. Claude won't load what it can't see.

### ✅ Canonical `## Additional resources` index in the SKILL.md
```markdown
## Additional resources

- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)
- For the full tool catalog, see [references/tools.md](references/tools.md)
```

**Why:** supporting files are **not auto-loaded**. Claude reads them with `Read` only when the SKILL.md instructs. An unlinked sibling file is dead weight — it bloats the skill directory without ever reaching context. The `## Additional resources` section is the canonical index pattern from [Anthropic's skill-authoring guide](https://docs.claude.com/en/docs/claude-code/skills); each bullet states *when to load* ("For X, see …"), not what the file contains. Inline pointers at the step that needs the detail (`"See references/plans.md for the full schema"`) are complementary, not a substitute — the index is what Claude sees on a skim.

---

### ❌ Inserting new todos mid-flight when a task expands into sub-steps
"While working on `apply-fixes`, spawn one new todo per fix via `TodoWrite` and mark each `in_progress` as you handle it."

### ✅ Umbrella task with evolving `activeForm`
Keep one `in_progress` todo. Update only its `activeForm` string per sub-step via `TodoWrite` / `TaskUpdate`, preserving the array shape:

```
✓ Detect placement candidates
✓ Offer the fix menu
▸ Apply 3 fix-menu changes              ← single umbrella todo, in_progress
     activeForm evolves:
     "Applying fix 1 of 3 — promoting placement candidates"
     "Applying fix 2 of 3 — rewriting weak rules"
     "Applying fix 3 of 3 — reorganizing rules into scoped files"
☐ Clean up temp files
```

**Why:** `TodoWrite` / `TaskUpdate` re-render the row in place when the todos array shape is unchanged. Inserting new items mid-flight reshuffles the rendered list — observed failure modes include rows mixing, items disappearing, and the user losing track of which work is actually active. The umbrella pattern keeps the list stable while still communicating sub-step progress. Legitimate exceptions: the user expands scope, or entirely new phases emerge that were not part of the original plan — append then, not for every sub-step of planned work.

---

### ❌ Instructing Claude to stack multiple `in_progress` tasks
"Mark all tasks `in_progress` at start, then work through them." / "Leave the parent task `in_progress` while you do the subtask."

### ✅ Enforce single-active, close-before-next
"Mark exactly one task `in_progress` at a time. Transition it to `completed` via `TodoWrite` / `TaskUpdate` before marking the next one `in_progress`. On error or early exit, mark the active task `completed` or `cancelled` — never leave it hanging."

**Why:** the Claude Code system prompt carries a single-active-task invariant ("mark each task completed as soon as it's done; don't batch"). Artifacts that contradict it produce UIs showing multiple concurrent tasks, confusing the user about what is actually running. Silence inherits the default and is fine — only explicit contradictions fail.

---

### ❌ `Bash` with command only
`Invoke Bash with command: "npm run build:all"`

### ✅ `Bash` with `description` (and `timeout` if long)
`Invoke Bash with command: "npm run build:all", description: "Building all packages", timeout: 300000`

**Why:** `description` is the status-line label — omission leaves the user staring at a blank "Bash..." for minutes. Long-running commands without `timeout` may be killed at the default.

---

### ❌ `Agent` without `description` or bounds
`Invoke Agent with prompt: "find all auth code"`

### ✅ `Agent` with all required + sensible bounds
```
Invoke Agent with:
  subagent_type: "general-purpose"
  description: "Locating auth code"
  prompt: "List every file that touches JWT validation; ≤2 lines each."
  max_turns: 6
```

**Why:** `description` and `subagent_type` are required (call fails without them). `max_turns` prevents the subagent from grinding indefinitely on a bounded task.

---

### ❌ `ExitPlanMode` with no plan body
"Invoke `ExitPlanMode`."

### ✅ `ExitPlanMode` with structured plan content
"Invoke `ExitPlanMode`, presenting the plan with sections: Problem · Approach · Files touched · Risks · Test strategy."

**Why:** `ExitPlanMode` presents the plan for approval — an empty or unstructured plan gives the user nothing to evaluate and forces a re-plan.

---

### ❌ `Grep` without `output_mode`
`Invoke Grep with pattern: "TODO"`

### ✅ `Grep` with explicit `output_mode`
`Invoke Grep with pattern: "TODO\\(.*\\)", glob: "**/*.ts", output_mode: "content", "-n": true`

**Why:** Default `output_mode: "files_with_matches"` returns paths only, surprising authors who expected matching lines.

---

### ❌ `Monitor` without required `description`
`Invoke Monitor with command: "tail -F build.log"`

### ✅ `Monitor` with `description`
`Invoke Monitor with command: "tail -F build.log", description: "Watching build.log for errors"`

**Why:** `description` is REQUIRED on `Monitor` (per tools.md) — it is the status-line label.

---

## Category: Subagent mistakes

### ❌ Instruct a subagent to invoke `AskUserQuestion`
"In the subagent prompt: 'If the scope is unclear, ask the user with `AskUserQuestion`.'"

### ✅ Resolve ambiguity in the dispatching session before `Agent` fires
"Before invoking `Agent`, invoke `AskUserQuestion` in the main session to resolve scope. Pass the resolved scope as part of the subagent `prompt`."

**Why:** A foreground subagent may be backgrounded mid-run via Ctrl+B; once backgrounded, `AskUserQuestion` fails silently and the subagent continues with bad assumptions.

---

### ❌ Instruct a subagent to spawn another subagent
"In the subagent: 'For deep research, dispatch a sub-subagent via `Agent`.'"

### ✅ Chain subagents from the main session
"After the first `Agent` returns, invoke `Agent` again from the main session with the next focused prompt."

**Why:** Subagents CANNOT spawn other subagents — hard rule per subagents.md §5. The nested `Agent` call fails.

---

### ❌ Set restricted fields on a plugin-shipped agent
```yaml
---
name: my-plugin-agent
hooks:
  PreToolUse: [...]
mcpServers: [...]
permissionMode: acceptEdits
---
```

### ✅ Plugin agents support only the allowed field set
```yaml
---
name: my-plugin-agent
description: ...
tools: Read, Grep, Glob
maxTurns: 10
model: haiku
---
```

**Why:** Per plugins-reference and sub-agents docs, plugin agents IGNORE `hooks`, `mcpServers`, and `permissionMode`. Authoring them does nothing and misleads the reader.

---

### ❌ Expect the subagent to inherit the dispatcher's cwd
"After `cd packages/api`, the subagent will run in `packages/api`."

### ✅ Pass cwd explicitly in the subagent prompt or via `isolation`
"In the `prompt`, give absolute paths. Or set `isolation: 'worktree'` on the `Agent` call for an isolated repo copy."

**Why:** Subagents NEVER inherit `cd` changes from the parent (subagents.md §5). They start at the main session's original cwd.

---

### ❌ Declare subagent tool restrictions in body prose only

```markdown
---
name: dependency-auditor
description: Read-only auditor.
model: sonnet
maxTurns: 8
---

# Dependency Auditor

This subagent has Read, Grep, Glob — no Edit or Write access. Do NOT modify files.
```

### ✅ Encode tool restrictions in the `tools` frontmatter field

```markdown
---
name: dependency-auditor
description: Read-only auditor.
model: sonnet
maxTurns: 8
tools: Read, Grep, Glob
---

# Dependency Auditor

This subagent has read-only tools per the frontmatter `tools:` allowlist.
```

**Why:** body prose is a polite request to the model; `tools:` frontmatter is a schema-level guarantee. A subagent without `tools:` inherits the dispatcher's full tool set — including `Edit`, `Write`, `Bash`, anything the parent had. The model reading the body claim "no Edit or Write access" still has those tools registered and may use them. Per `references/subagents.md` § 3, plugin agents support `tools` and `disallowedTools` — both are honored at the schema layer. (Same gap for synthesis-shaped subagents missing `model: opus`, and `maxTurns` chosen by feel — the frontmatter is where these constraints live.)

---

### ❌ Expect the subagent to inherit parent skills
"The subagent will already have the api-conventions skill loaded."

### ✅ Preload skills on the subagent
```yaml
skills:
  - api-conventions
  - error-handling-patterns
```

**Why:** Subagents do NOT inherit parent skills. Skills must be listed explicitly via the `skills:` frontmatter.

---

## Category: Weasel verbs

### ❌ Advisory verbs paired with tool names
"You should consider invoking `AskUserQuestion` if appropriate."

### ✅ Strong directive verbs
"When ≥2 valid implementation approaches exist, MUST invoke `AskUserQuestion` with the schema below."

**Why:** `should consider`, `may want to`, `can use`, `if appropriate` are treated as advisory and routinely skipped. `MUST`, `ALWAYS`, `NEVER` fire reliably.

---

### ❌ Vague trigger condition
"When appropriate, plan before editing."

### ✅ Observable trigger condition
"When the change touches ≥3 files OR introduces a new abstraction, invoke `EnterPlanMode` before any `Edit`/`Write` call."

**Why:** "When appropriate" is unenforceable. Anchor triggers to observable conditions Claude can evaluate.

---

### ❌ Negative framing for a primary instruction
"Don't forget to call `TodoWrite` for multi-step work."

### ✅ Positive framing
"For ≥3 sequential steps, invoke `TodoWrite` with one item per step before starting work."

**Why:** Positive "Invoke X when Y" fires more reliably than negative "Don't forget X."

---

### ❌ Tool name far from the trigger
"Multi-file refactors deserve careful thought. (...several paragraphs of context...) Tools like `EnterPlanMode` exist."

### ✅ Tool name in the same sentence as the trigger
"For any multi-file refactor (≥3 files), invoke `EnterPlanMode` immediately, before any `Edit`/`Write`."

**Why:** Distance between trigger phrase and tool name is the single largest predictor of whether the tool fires (SKILL.md §"Phrasing rules").

---

## Category: Hook mistakes

### ❌ Cite the non-existent `Setup` event
```json
{ "hooks": { "Setup": [...] } }
```

### ✅ Use `SessionStart` with matcher `startup`
```json
{ "hooks": { "SessionStart": [{ "matcher": "startup", "hooks": [...] }] } }
```

**Why:** `Setup` is not a documented event; the harness silently ignores unknown event keys, so the hook never fires.

---

### ❌ Describe hook behavior in CLAUDE.md without a config entry
"This project auto-formats files on save."

### ✅ Cite the configured hook explicitly
"This project has a `PostToolUse` hook on `Edit|Write` at `.claude/hooks/format.sh` that runs `prettier --write` on the changed file. If the hook is missing, run `npx prettier --write <path>` manually."

**Why:** Prose claims with no `settings.json` entry mean the hook does not exist. Cite event + path + observable effect + fallback.

---

### ❌ Write hook logic in `skills/*.md` as if Claude executes it
"At session start the skill runs `./scripts/load-env.sh`."

### ✅ Configure the hook in frontmatter (skill-scoped) or settings.json
```yaml
---
name: my-skill
hooks:
  SessionStart:
    - matcher: startup
      hooks:
        - type: command
          command: "${CLAUDE_SKILL_DIR}/scripts/load-env.sh"
---
```

**Why:** Claude reads `SKILL.md` content; only the harness reads `hooks` blocks. Prose without a config entry never executes.

---

### ❌ Omit the matcher on `PreToolUse`
```json
{ "PreToolUse": [{ "hooks": [{ "type": "command", "command": "./gate.sh" }] }] }
```

### ✅ Set `matcher` to the specific tools you mean to gate
```json
{ "PreToolUse": [{ "matcher": "Edit|Write", "hooks": [...] }] }
```

**Why:** Missing matcher = `*` = fires on every tool call (`Read`, `Glob`, `WebFetch`...). Almost never the author's intent.

---

### ❌ Use regex syntax in a `FileChanged` matcher
`"matcher": "\\.(env|envrc)$"`

### ✅ Use literal `|`-separated filenames
`"matcher": ".envrc|.env"`

**Why:** `FileChanged` splits on `|` into literal filenames; regex characters are not interpreted (hooks.md "Anti-patterns").

---

### ❌ Mix exit-2 blocking with stdout JSON in the same code path
```bash
echo '{"hookSpecificOutput":{"permissionDecision":"deny"}}'
exit 2
```

### ✅ Pick one mode per code path
```bash
# Either exit 2 with stderr message:
echo "Blocked: <reason>" >&2
exit 2

# OR exit 0 with stdout JSON:
echo '{"hookSpecificOutput":{"permissionDecision":"deny"}}'
exit 0
```

**Why:** When a hook exits 2, stdout JSON is ignored — the JSON decision is silently dropped.

---

## Category: CLAUDE.md mistakes

### ❌ Put a multi-step procedure in CLAUDE.md
"## Release process\n1. Run npm version...\n2. Push tags...\n3. ..."

### ✅ Put procedures in a skill; keep CLAUDE.md to facts and standing rules
"See the `release` skill for the release procedure."

**Why:** Procedures cost context every turn for work done occasionally. Skills load on demand. CLAUDE.md is for facts Claude must hold every turn.

---

### ❌ CLAUDE.md over ~200 lines
A 600-line CLAUDE.md packed with policies, examples, and procedures.

### ✅ Keep under ~200 lines; split via imports or `.claude/rules/`
"Use `@docs/style.md` and path-scoped rules under `.claude/rules/api.md` to keep the root CLAUDE.md short."

**Why:** Longer files consume more context and reduce adherence (claude-md.md §1).

---

### ❌ Ship `CLAUDE.md` inside a plugin and expect it to auto-load
`<plugin-root>/CLAUDE.md` containing standing rules.

### ✅ Ship a skill, command, or hook instead
"Plugin-bundled CLAUDE.md does NOT auto-load. Ship as a skill (loads on demand by description), a command (user invokes), or a hook in `hooks/hooks.json`."

**Why:** Documented discovery paths are managed / user / project / ancestor-walk. Plugin install paths are not in that list (claude-md.md §6).

---

### ❌ Put hook configuration in CLAUDE.md
"## Hooks\n```json\n{ \"hooks\": {...} }\n```"

### ✅ Put hook config in `settings.json`; cite it from CLAUDE.md
"This project's `settings.json` declares a `PostToolUse` hook at `.claude/hooks/format.sh` for `Edit|Write`."

**Why:** CLAUDE.md is guidance, not enforcement. The harness loads hooks from `settings.json` / `hooks/hooks.json` / frontmatter — never from CLAUDE.md.

---

## Category: Plan-mode mistakes

### ❌ Use `ExitPlanMode.allowedPrompts` without noting the session-wide scope
`Invoke ExitPlanMode with allowedPrompts: [{ tool: "Bash", prompt: "npm test" }]` — stated as if the pre-approval is confined to the plan.

### ✅ Either acknowledge the scope caveat, or use `permissions.allow` for narrower gating
```
Invoke ExitPlanMode with allowedPrompts: [{ tool: "Bash", prompt: "npm test" }]
# Note: pre-approvals persist session-wide, not just for this plan.
```

Or, for per-invocation scope:
```json
{ "permissions": { "allow": ["Bash(npm test)", "Bash(npm run lint)"] } }
```

**Why:** `allowedPrompts` is a real parameter (schema in `references/tools.md`), but per [anthropics/claude-code#27160](https://github.com/anthropics/claude-code/issues/27160) pre-approvals persist for the entire session. Artifact authors who treat it as plan-scoped build a false security model. `permissions.allow` rules offer narrower, explicit scope.

---

### ❌ Skip `ExitPlanMode` for a multi-file architectural change
"For this 8-file refactor, just start editing."

### ✅ Always gate multi-file or architectural work on `ExitPlanMode`
"For changes touching ≥3 files OR introducing new abstractions, invoke `EnterPlanMode`, draft the plan, then invoke `ExitPlanMode` for user approval before any `Edit`."

**Why:** Mid-stream correction on a multi-file refactor is expensive. The plan-approval gate catches wrong directions cheaply.

---

### ❌ Tell Claude to "press Shift+Tab" to enter plan mode
"Press Shift+Tab to enter plan mode, then plan."

### ✅ Tell Claude to invoke the tool
"Invoke `EnterPlanMode` (no parameters)."

**Why:** Shift+Tab is a human keystroke. Claude cannot press keys — only call tools.

---

### ❌ Use `mode:` in subagent frontmatter for plan mode
```yaml
mode: plan
```

### ✅ Use `permissionMode:` (the documented field name)
```yaml
permissionMode: plan
```

**Why:** The frontmatter field is `permissionMode`, not `mode`. Wrong key is silently ignored (plans.md §"Instruction patterns").

---

## Category: Frontmatter mistakes

### ❌ `name:` does not match the directory
Directory: `skills/scribe/` ; frontmatter: `name: hestia-scribe`

### ✅ `name:` matches the directory (or is omitted to default to it)
Directory: `skills/scribe/` ; frontmatter: `name: scribe`

**Why:** `name` becomes the `/slash-command`. Mismatch breaks discovery and plugin namespacing (skill-authoring.md §1).

---

### ❌ Combined `description` + `when_to_use` over 1,536 chars
A 4,000-character preamble describing every nuance of the skill.

### ✅ Front-load the key use case; keep combined ≤1,536 chars
"description: Use when authoring any Claude Code instruction artifact. Ensures tools are named with full UX-critical parameters."

**Why:** The skill listing truncates at 1,536 chars per entry. Anything past that is not visible to the model when picking which skill to invoke.

---

### ❌ Weasel description that front-loads filler
"description: This skill, which is sometimes useful, may help in certain situations where..."

### ✅ Front-load the trigger condition
"description: Use when authoring SKILL.md, CLAUDE.md, plan files, subagents, slash commands, or hook scripts."

**Why:** Truncation cuts the tail. Filler at the front pushes the actual triggering text out of the visible window.

---

### ❌ `allowed-tools` used as a tool restriction
"`allowed-tools: [Read, Grep]` — to prevent the skill from writing files."

### ✅ Use a `deny` rule in settings.json to block tools
"`allowed-tools` GRANTS pre-approval; it does not restrict. To block writes, add `\"deny\": [\"Write\", \"Edit\"]` in settings.json."

**Why:** `allowed-tools` only suppresses prompts for the listed tools — every other tool remains callable (skill-authoring.md §8, permissions.md §7).

---

### ❌ Underscore-vs-hyphen typo on a frontmatter key
```yaml
---
name: my-skill
disable_model_invocation: true
---
```

### ✅ Hyphenated key (the documented spelling)
```yaml
---
name: my-skill
disable-model-invocation: true
---
```

**Why:** Unknown frontmatter keys silently no-op. The skill loads, but the typo'd directive does nothing — `disable_model_invocation: true` does not block auto-invocation; the skill still fires automatically. Always cross-check keys against `references/skill-authoring.md` § 1.

---

### ❌ `agent:` set without `context: fork`
```yaml
---
name: deep-research
agent: Explore
---
```

### ✅ Pair `agent:` with `context: fork`
```yaml
---
name: deep-research
context: fork
agent: Explore
---
```

**Why:** `agent:` is silently ignored without `context: fork` — the skill runs in the main session, not the named subagent type. The author thinks they configured an Explore-agent skill; they actually configured an inline skill.

---

### ❌ `arguments` declared but body never uses `$name`
```yaml
---
arguments: [issue, branch]
---

Fix issue $ARGUMENTS on the current branch.
```

### ✅ Body uses the declared names, OR drop the declaration
```yaml
---
arguments: [issue, branch]
---

Fix issue $issue on branch $branch.
```

**Why:** `arguments: [...]` declares named positional substitutions. If the body never uses `$issue` or `$branch`, the declaration is dead weight (and signals to a reader that the skill expects parameterization it doesn't actually consume). Conversely, if the body uses `$x` without declaring `x` in `arguments`, `$x` renders literally — the user sees `$x` in the rendered prompt instead of their argument value.

---

### ❌ `context: fork` on a reference skill
```yaml
---
name: api-conventions
context: fork
agent: Explore
---

When writing API endpoints, use RESTful naming, return consistent error formats, ...
```

### ✅ `context: fork` only on action skills with explicit task instructions
```yaml
---
name: api-conventions
---

When writing API endpoints, use RESTful naming, return consistent error formats, ...
```

**Why:** `context: fork` runs the skill in an isolated subagent whose prompt IS the skill body. A reference skill (standing instructions, conventions, "use these patterns") has no task — the forked subagent receives the conventions and returns nothing useful. `context: fork` is for task skills (`/deploy`, `/research`, `/summarize`) that have a clear action. See `references/workflow-skill-shapes.md` § 1 for the action-vs-reference distinction.

---

### ❌ Trigger phrases packed into `description` when `when_to_use` exists
`description: Use this skill for GrammarKit / JFlex work. Load before editing any .bnf or .flex file. Concrete triggers include designing grammar rules, wiring psiImplUtilClass, diagnosing "method not found" errors. Also trigger when working under src/main/gen/.`

### ✅ `description` states the what; `when_to_use` holds the trigger list
```yaml
description: Use this skill for all GrammarKit / JFlex grammar and lexer work in IntelliJ plugins.
when_to_use: Load before editing any `.bnf` or `.flex` file, before regenerating parser/lexer output, or before debugging PSI wiring. Concrete triggers include designing BNF grammar rules, wiring `psiImplUtilClass` / `methods=[…]` / PSI mixins, and diagnosing "method not found in psiImplUtilClass" errors. Also trigger when working under `src/main/gen/`.
```

**Why:** `description` and `when_to_use` share the 1,536-char cap — trigger phrases in `description` push the key use-case statement toward truncation and bury the signals the model uses when deciding whether to invoke the skill. `when_to_use` is the documented field for trigger prose (skill-authoring.md §1); keeping each field to its purpose makes both machine-readable and human-scannable.

---

### ❌ Skill body instructs tool calls; `allowed-tools` absent
```yaml
---
name: grammar-kit
description: Use for GrammarKit / JFlex work in IntelliJ plugins.
---

Invoke `Read` on `references/grammar-kit.md` for any BNF grammar task.
```

### ✅ Pre-approve instructed tools in `allowed-tools`
```yaml
---
name: grammar-kit
description: Use for GrammarKit / JFlex work in IntelliJ plugins.
allowed-tools: Read
---

Invoke `Read` on `references/grammar-kit.md` for any BNF grammar task.
```

**Why:** `allowed-tools` suppresses the per-invocation permission prompt for listed tools. If the skill's primary work is a `Read` call (reference routing, file loading), listing `Read` means the skill executes without a prompt on every invocation. The entry is additive — other tools remain callable under normal permission rules. Keep the grant as narrow as the skill's actual instructions: `Read` for a reference skill, `Bash(git status*)` for a status-check skill. Do NOT list tools the body never instructs — that widens the grant beyond intent.

---

### ❌ `effort:` set to an undocumented value
```yaml
---
name: my-skill
effort: ultra
---
```

### ✅ One of the five documented effort levels
```yaml
---
name: my-skill
effort: high
---
```

**Why:** `effort:` accepts exactly `low`, `medium`, `high`, `xhigh`, or `max`; available levels depend on the active model. An unrecognized value silently degrades to the session default — the author believes they've pinned an effort level, but nothing changes. Cross-check against `references/skill-authoring.md` § 1.

---

### ❌ `shell:` set to an unsupported value
```yaml
---
name: my-skill
shell: zsh
---
```

### ✅ `bash` (default) or `powershell`; note the env var requirement for `powershell`
```yaml
---
name: my-skill
shell: powershell
---
```

Add a setup note when using `powershell`:
```markdown
> **Setup:** requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` in the environment.
```

**Why:** `shell:` accepts only `bash` (default) or `powershell`. Any other value silently no-ops and `` !`cmd` `` injections do not execute. `shell: powershell` requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` — without it, PowerShell injections fail silently. Document the env var requirement so users on default setups aren't surprised.

---

### ❌ `arguments:` declared without `argument-hint`
```yaml
---
name: fix-issue
arguments: [issue, branch]
---
```

### ✅ Pair `arguments:` with a matching `argument-hint`
```yaml
---
name: fix-issue
arguments: [issue, branch]
argument-hint: "[issue-number] [branch-name]"
---
```

**Why:** `argument-hint` is what the `/` autocomplete shows next to the skill name. Without it, the user sees `/fix-issue` with no indication of what to type. Declaring `arguments:` without `argument-hint` silently leaves autocomplete blank — the user must already know the argument signature, defeating the UX purpose of the field.

---

### ❌ Side-effect skill missing `disable-model-invocation: true`
```yaml
---
name: deploy
description: Deploy the application to production
---

Invoke `Bash` with `command: 'git push origin main && npm run deploy'`.
```

### ✅ Gate every side-effect skill with `disable-model-invocation: true`
```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---

Invoke `Bash` with `command: 'git push origin main && npm run deploy'`.
```

**Why:** Without `disable-model-invocation: true`, Claude can auto-invoke this skill when it deems the task relevant — including mid-session when the code "looks ready." Side-effect skills (deploys, commits, file writes, PR creation, external API calls, `rm`-style operations) MUST set this flag so only the user can trigger them. Per `references/skill-authoring.md` § 7, setting it also removes the skill description from Claude's active context, eliminating the auto-invocation path entirely.

---

## Category: Dynamic injection mistakes

### ❌ Mutating command in a `` !`<cmd>` `` injection
```markdown
- Latest: !`gh pr create --title "Auto" --body "auto"`
```

### ✅ Read-only injections only; mutating work goes through a `Bash` tool call
```markdown
- Latest PR: !`gh pr view`

## Steps

1. Invoke `Bash` with `command: 'gh pr create --title "..." --body "..."'`, `description: "Creating PR"`.
```

**Why:** Injection commands run **before** Claude sees the skill body and **without per-command approval**. The user has no chance to decline. Mutating injections (`gh pr create`, `git push`, `rm`, `git commit`, `npm install`, etc.) run unconditionally on every invocation. Limit injections to read-only / idempotent commands. See `references/dynamic-context.md` § 3 for the full unsafe-command list.

---

### ❌ Relative path to a bundled script in an injection
```markdown
- Diagnostics: !`bash scripts/probe.sh`
```

### ✅ Absolute via `${CLAUDE_SKILL_DIR}`
```markdown
- Diagnostics: !`bash ${CLAUDE_SKILL_DIR}/scripts/probe.sh`
```

**Why:** Skills can be invoked from any cwd. `scripts/probe.sh` resolves relative to where the user is, not where the skill lives — so the injection fails silently when the user is not at the skill directory. `${CLAUDE_SKILL_DIR}` always resolves to the skill's own directory, regardless of cwd.

---

### ❌ Multi-line command in inline `!`...`` form
```markdown
- Versions: !`node --version && npm --version && git --version`
```

### ✅ Fenced ` ```! ` form for multi-line / chained commands
````markdown
```!
node --version
npm --version
git --version
```
````

**Why:** Inline `!`...`` blocks parse single-line commands cleanly; chained / multi-line commands parse unpredictably. The fenced form handles both consistently and is the documented multi-line shape (`references/dynamic-context.md` § 1).

---

### ❌ Injection without matching `allowed-tools` scope
```yaml
---
name: pr-summary
---

- Diff: !`gh pr diff`
```

### ✅ Scoped `Bash(<cmd> *)` in `allowed-tools`
```yaml
---
name: pr-summary
allowed-tools: Bash(gh *)
---

- Diff: !`gh pr diff`
```

**Why:** Without the scoped allowlist entry, every invocation triggers a permission prompt for the injection command. Use the **narrowest** pattern that covers your injections — `Bash(gh *)` over `Bash(*)`, `Bash(git status*)` over `Bash(git *)`. Wide patterns silently authorize anything the model later decides to run.

---

## Category: Decomposition mistakes

### ❌ Embed full `Agent(...)` prompt bodies in CLAUDE.md
```markdown
# Workflow

## Step 2: Dispatch experts
Agent(
  subagent_type: "general-purpose",
  prompt: """
  You are a senior architect. Analyze the feature requirement ...
  """
)

## Step 3: Critic
Agent(...)
```

### ✅ Skills hold dispatch templates; CLAUDE.md is a switchboard
```markdown
# Workflow

| # | Action | Model | Skill |
|---|--------|-------|-------|
| 2 | Dispatch experts | Sonnet | `/expert-analysis` |
| 3 | Critic review    | Opus   | `/critic-review` |
```

**Why:** CLAUDE.md is auto-loaded into every session and consumes context every turn. Embedding full prompt bodies bloats every conversation, even ones that don't use the workflow. Decomposition routes prompt bodies to skill `SKILL.md` files (loaded on demand) and templates to `references/` (loaded only when consumed). See `references/workflow-skill-shapes.md` § 4 for the CLAUDE.md hub spec and `references/decomposition.md` § 3 for the source-pattern → target-path table.

---

### ❌ Flatten a dispatcher skill into the worker it dispatches to
"This `/critic-review` skill should just BE the critic — make it run the analysis directly."

### ✅ Preserve the Skill+Subagent combination pattern
"`/critic-review` is the dispatcher (skill); `agents/adversarial-critic.md` is the worker (subagent). The skill's body is a `## Dispatch Template` containing `Agent(subagent_type: 'adversarial-critic', ...)`. The worker has its own model, locked tools, bounded `maxTurns`, and returns a structured report."

**Why:** Skill+Subagent is a documented combination pattern (features overview "Combine features"). The skill orchestrates; the subagent isolates. Flattening loses the isolation (worker pollutes main context), the locked tool allowlist (worker can do anything the session can), and the bounded turn count. hestia itself follows this — `scribe` skill dispatches `proofreader` subagent.

---

### ❌ Decompose a non-monolithic artifact
"This 80-line CLAUDE.md has 2 numbered steps — let me split it into 2 slash commands."

### ✅ Apply the trigger threshold first
"Per `references/decomposition.md` § 1, decomposition requires ≥ 2 of 5 signals. An 80-line file with 2 steps and no `Agent(...)` blocks fires only one signal — leave it alone."

**Why:** Decomposition has overhead (more files, more frontmatter, more handoff text). Below the trigger threshold the overhead exceeds the benefit. The trigger checks exist precisely to keep small artifacts small.

---

## Category: Stale or deprecated tool usage

### ❌ Pair `TaskOutput` with `run_in_background`
"After `Bash` with `run_in_background: true`, invoke `TaskOutput` with the task ID."

### ✅ Use `Read` on the task's output file
"After `Bash` with `run_in_background: true`, invoke `Read` on the task's output file path. (`TaskOutput` is DEPRECATED per the canonical reference.)"

**Why:** `TaskOutput` is marked DEPRECATED in tools.md. The canonical replacement is `Read` on the output file path.

---

### ❌ Cite `--add-dir` directories as a source for subagent configs
"Subagents in `<extra-dir>/.claude/agents/` will load when launched with `--add-dir <extra-dir>`."

### ✅ Only skills auto-load from `--add-dir`
"Subagents, commands, output styles, and hooks in `--add-dir` directories do NOT load. Only `.claude/skills/` does. Place subagents under `~/.claude/agents/` or the project root."

**Why:** Per subagents.md §2 and permissions.md §8: `--add-dir` only loads skills (and a narrow settings subset). Other config is ignored.

---

### ❌ Reference `Task` instead of `Agent`
"Invoke `Task` to dispatch a subagent."

### ✅ Use the current name `Agent`
"Invoke `Agent` with `subagent_type`, `description`, `prompt`."

**Why:** In v2.1.63 `Task` was renamed to `Agent`. Old `Task(...)` aliases still work but new artifacts should use the current name (subagents.md §6).

---

### ❌ Rely on experimental `SendMessage` / `TeamCreate` in default-install artifacts
"Invoke `SendMessage` with the agent ID to resume the subagent."

### ✅ Gate experimental tools behind the env flag
"`SendMessage` requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Gate any reference behind an availability check; default-install artifacts must not depend on it."

**Why:** Experimental tools are not present on default installs. Unguarded calls fail.

---

## Category: Permission-rule mistakes

### ❌ Try to block a tool by removing it from `allowed-tools`
"Remove `Write` from `allowed-tools` to block file writes."

### ✅ Add a `deny` rule in settings.json
```json
{ "permissions": { "deny": ["Write", "Edit"] } }
```

**Why:** `allowed-tools` GRANTS permission; it does not restrict. Removing a tool only removes the auto-grant — the tool still fires under baseline rules.

---

### ❌ Forget deny precedence
"My `allow: [Bash(npm test)]` rule isn't taking effect."

### ✅ Find the deny rule (any scope, including managed) — deny always wins
"Precedence is `deny → ask → allow`. Check managed, CLI args, `.claude/settings.local.json`, `.claude/settings.json`, and `~/.claude/settings.json` for a matching deny."

**Why:** Deny at any scope cannot be overridden anywhere (permissions.md §4).

---

### ❌ Write `Skill(name *)` as if it were documented per-skill rule syntax
`"deny": ["Skill(my-skill *)"]`

### ✅ Gate the `Skill` tool name or use a `PreToolUse` hook
"To disable the Skill tool entirely: `\"deny\": [\"Skill\"]`. To gate a specific skill, use a `PreToolUse` hook on `Skill` that inspects the skill name. There is no documented per-skill allow/deny rule (permissions.md §5)."

**Why:** The canonical permissions doc does NOT define a `Skill(name)` rule syntax. Per-subagent control uses `Agent(Name)` instead.

---

### ❌ Pattern too broad on a wrapper command
`"allow": ["Bash(devbox run *)"]`

### ✅ Pin the inner command
`"allow": ["Bash(devbox run npm test)", "Bash(devbox run npm run lint)"]`

**Why:** Wrappers like `devbox run`, `mise exec`, `npx`, `docker exec` are NOT stripped (permissions.md §6). `Bash(devbox run *)` allows `devbox run rm -rf .`.

---

### ❌ Confuse `/path` with absolute filesystem path
`Edit(/src/**)` — intending the filesystem root `/src`.

### ✅ Use double-leading `//` for a true absolute path
`Edit(//src/**)` for the filesystem path; `Edit(/src/**)` is project-root-relative.

**Why:** Single leading `/` is project-root-relative; double leading `//` is the absolute filesystem prefix (permissions.md §4).

---

### ❌ Assume compound commands match through the wrapper
`"allow": ["Bash(npm test *)"]` covers `npm test && rm -rf node_modules`.

### ✅ Each subcommand matches independently
"Compound commands (`&&`, `||`, `;`, `|`, newline) are split — each side must match its own rule. Add `Bash(rm -rf node_modules)` separately or deny `rm`."

**Why:** Compound splitting is documented behavior (permissions.md §6). The wrapper rule does NOT authorize the second command.

---

Cross-referenced against the other scribe reference files (fetched 2026-04-26).

Source: scriptorium/skills/scribe/anti-patterns.md
