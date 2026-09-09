# Foreman × official prompt library — 2026-07-23

Private notes (gitignored dir). Source: https://code.claude.com/docs/en/prompt-library.md, published 2026-07-23 — ~50 copy-paste prompts tagged by SDLC phase (discover/design/build/ship/operate) and role, each with a "Why this works" teaching note, plus a six-pattern meta-section ("What makes these prompts work"). All foreman facts below verified against `foreman/prompt-template.md` and `foreman/skills/craft-prompt/SKILL.md` this session.

**Provenance matters here:** the library is explicitly a *digest* of sources foreman already mined — its own "Where these come from" section lists best-practices (foreman's source-a), common-workflows, the teams blog, and the scaling ebook. So most of its content is already absorbed into the template (header cites sources a–e, lastmod 2026-07-18). The delta is small and specific, not a new vein.

**Regime mismatch to keep in view:** every library prompt assumes a *warm interactive session* — a human present who can steer, paste, and course-correct. Foreman's product is the opposite regime: a *cold, self-contained handoff* with zero conversation memory. Guidance transfers only where the mechanism survives that flip; two of the six patterns partially don't.

---

## 1. The six meta-patterns vs the template

| Library pattern | Foreman status |
|---|---|
| 1. Describe the outcome, not the steps ("works without naming a single file path") | **Partially adopted, deliberately.** Sonnet/Opus/Fable targets already get outcome-only (micro-step trim, probe-validated); pure-investigation handoffs already "hand over the question, not a prescribed exploration sequence". But the "let Claude find the files" half is for warm sessions — foreman's own Haiku benchmark showed full elaboration *cut* exploration overhead at equal correctness in the cold regime. Foreman's first-party evidence wins; no change. |
| 2. Give it a way to check its own work | **Already foreman's strongest block.** `Verification (REQUIRED)` + `Run:`/`Expected:` + "Do NOT claim success without running this" is this pattern in its maximal form. Nothing to add. |
| 3. Point at a reference ("without one, Claude defaults to general best practices; with one, it matches your conventions") | **Present but buried.** Lives only as a Call-4 Constraints sub-question ("Style or pattern to follow — point to an example file"), so it appears only when the user opts into the Constraints section. The library ranks it a top-6 lever. → Candidate A. |
| 4. State the measurable target (metric + threshold = unambiguous completion) | **Mostly covered.** `Expected:` already demands a literal signal, and Haiku elaboration demands the literal output. Gap: Call 2 Q2's "done" question doesn't nudge metric+threshold phrasing for optimize-type goals. → Candidate C (micro). |
| 5. Give it the artifact ("Claude reads the source instead of your description of it") | **The one real gap.** craft-prompt's `Fix a bug` type gathers a description and an optional before/after Example — it never asks for the observed failing output itself. A cold session is precisely the reader that can't ask "what did the error say". → Candidate B, the strongest item in this pass. |
| 6. Say how you want the answer (format, length, audience) | **Already adopted.** `<output_format>` + `task_context`'s "what this output feeds and who it's for" line cover both halves. |

Also worth noting: the library's "Related resources" close — prompt → save as skill → record in CLAUDE.md → plan mode for risky changes — *is* foreman's product loop described from the outside. The library is upstream seed material; foreman is the "make it stick" endpoint it points at.

---

## 2. ADOPT candidates — ranked

### B. Embed the observed failure artifact for bug-fix handoffs — value **medium**, effort **small**

Library teaching (fix-a-build-error, investigate-a-reported-error, give-it-the-artifact): paste the error/log/stack trace verbatim so Claude reads the source, not a paraphrase. Foreman's cold regime *amplifies* this: the spawned session cannot ask what the error said, and `truth_grounding` already tells it to re-verify, so a stale paste is self-correcting.

**Smallest form:** in craft-prompt, when the task type is `Fix a bug` (and plausibly `Investigate / research`), add one question to Call 2 or the type's detail pass — "Paste the failing output / stack trace / error message verbatim (or `None observed`)" — and land the answer in `<context>` as an `Observed failure:` sub-block. No new template tag, no gate change (content, not structure). `foreman:roadmap` picks could do the same only when the entry's `notes` already carry an error string — never by prompting an extra question mid-dispatch.

### A. Promote the pattern-reference out of the Constraints section — value **low-medium**, effort **small**

Library teaching (follow-an-existing-pattern): a named reference file is what flips output from generic best practice to codebase-native. In foreman it's gated behind selecting the optional Constraints section, so most assembled prompts never carry one.

**Smallest form:** one line added to the `relevant_files` placeholder guidance — alongside files-to-change, list a `Pattern: <path> — imitate this` line when an analogous implementation exists — and mirror it as a parenthetical nudge in Call 2 Q3's wording. Keeps the Constraints question unchanged; wording-lessons compliant (additive, few words, describes the wanted act only).

### C. Metric+threshold nudge on the "done" question — value **low**, effort **trivial**

Add one option or one clause to Call 2 Q2 ("What does 'done' look like?") steering optimize-type goals to "metric from X to under Y" phrasing (library: optimize-against-a-measurable). The template's `Expected:` guidance already implies it; this just moves it to where the goal sentence is authored.

### D. Orchestration follow-up names the missed constraint — value **low**, effort **trivial**

Library teaching (course-correct-a-wrong): "name the constraint Claude missed, not just that it's wrong — a specific reason gives a concrete constraint to satisfy on the retry". The `<orchestration>` block's retry line currently reads "dispatch a corrected follow-up instead of fixing it by hand". Appending "naming the specific gap the work missed" is the same lever applied to worker redispatch. One clause; keep it to a few words.

If any of A–D ship, add the library as `source-f` to the template's practices header.

---

## 3. Corroboration (no new action)

- **capture-what-to-remember + turn-a-correction-into** — session-end lesson capture into durable memory. Third independent source converging on the `outcome_type` + `lesson` roadmap-schema idea (after ergon 2026-07-21 and praxis C1). Still MEASURE FIRST per the praxis report's base-rate check; this weakly raises its priority, changes nothing else.
- **draft-a-spec-by** ("interview me until we've covered everything, then write the spec") — the official docs now teach craft-prompt's own interview model. Validation, not a lever.
- **run-a-security-review** (subagent for context isolation) — foreman's background-Agent destination already is this.

---

## 4. REJECTED / no-change

| Idea | Why not |
|---|---|
| Blanket "describe the outcome, not the steps" / "let Claude find the files" | Warm-session advice. Foreman's own handoff benchmark: fully-elaborated Haiku prompts posted the lowest reads-before-first-edit at equal-or-better correctness. Elaboration stays model-scoped as is. |
| `needs`/`paste` prerequisite metadata per prompt (gh, tracker, browser, MCP) | UI affordance of the library page itself. Foreman handoffs assume the project's environment; `truth_grounding` catches a missing tool at run time. No surface. |
| Work-from-the-ticket ("give the issue number, not a summary") | Anti-self-containment in the cold regime. Foreman's equivalent pointer is the roadmap entry, already embedded in the handoff; an external-tracker ref would reintroduce the assumed-context failure the template exists to prevent. |
| Screenshot-compare verification loop (implement-from-a-screenshot) | Already expressible: any `Run:`/`Expected:` pair can name a screenshot-diff command where the project has one. A dedicated visual-verification flavor is machinery without a demonstrated foreman user. |
| Adding library prompts as new craft-prompt task types (incident, data analysis, copy sweep…) | The six existing types are containers, not a taxonomy to complete; every library prompt maps into one of them plus the template's fields. Type proliferation adds question cost to every Call 1 for no measured gain. |

---

## Addendum 2 (2026-07-23, same session) — best-practices page coverage audit

Same treatment for https://code.claude.com/docs/en/best-practices — but this page is foreman's **source-a**, mined 2026-07-18, so this pass is a re-audit of the current revision, not a first mining. Verdict: **covered** — every foreman-lane practice is in the template or was built earlier today; the rest is interactive-harness surface foreman deliberately doesn't own.

### Section-by-section

| Page section | Foreman status |
|---|---|
| Context-window constraint (the page's organizing principle) | Foreman's organizing principle too: dense capped entries, `next-candidates` over `list`, no-investigation pick path, fresh-session handoffs, background-Agent/survey-Explore isolation. |
| Give Claude a way to verify its work | `Verification (REQUIRED)` + `Run:`/`Expected:` + "Do NOT claim success without running this. If it fails, iterate until it passes." The maximal form. |
| "Show evidence rather than asserting success" | The template's closing paragraph: evidence in its durable home (roadmap notes / commit / artifact), final message states outcome and points there. |
| Reviewer Callout ("a reviewer prompted to find gaps will report some… flag only correctness") | Ported verbatim in 0.31.0 as the review-flavored task constraint ("reporting that the work is sound is a valid outcome"). |
| Explore → plan → code; "if you could describe the diff in one sentence, skip the plan" | Read/analyze/implement bullets for Haiku/inherit targets; the skip-the-plan half IS the probe-validated micro-step trim for Sonnet/Opus/Fable. Plan mode itself is harness surface. |
| Specific context: scope the task | `task_context` + `task_rules` + exact paths with line ranges. |
| Specific context: reference existing patterns | Candidate A — `Pattern:` reference line, **built today**. |
| Specific context: describe the symptom (paste the error) | Candidate B — `Observed failure:` embed, **built today**. |
| Rich content (@, images, pipe) | Interactive affordances; foreman's cold-session equivalent is embedding the artifact in the prompt (B). |
| Let Claude interview you → spec → **fresh session executes it** | This is craft-prompt's exact architecture, including "self-contained: names files and interfaces, states what's out of scope, ends with verification" — `relevant_files` / Constraints / Verification. The page now teaches foreman's thesis. |
| Subagents for investigation / fresh-context review | Background-Agent destination, survey's Explore agent, orchestration block's per-slice review. |
| Checkpoints/rewind ("not a replacement for git") | Foreman's checkpoint-branch protocol is the git-native form on purpose. |
| Resume conversations | `in_progress` resume prompts + the background-agent SendMessage marker. |
| CLAUDE.md hygiene, permissions, auto mode, hooks-for-repeat-behavior, `/clear` discipline, `/btw`, agent teams | Harness/ecosystem surface — assay owns rules hygiene, the harness owns session management. Out of foreman's lane, correctly. |
| Fan-out / parallel sessions / Writer-Reviewer | Fable-orchestrator option (per-slice workers, disjoint-files rule) and the Workflow-stage flavor cover foreman's slice of this. |

### The one residual candidate

**Failing-test-first repro for bug fixes** (micro). The page's symptom row ends "write a failing test that reproduces the issue, then fix it" — foreman gathers steps from the user and doesn't suggest this shape. Smallest form: one suggested-step example in craft-prompt's Call 2 Q4 nudge for the `Fix a bug` type. Held back deliberately: it's prescriptive process foreman normally leaves to the user, and B (the embedded observed failure) already gives the destination the repro signal. Revisit only if bug-fix handoffs measurably patch symptoms.

### Explicitly not adopted

- **Stop-hook verification gates / `/goal`** — harness-level stop-gating; foreman's close gate is TaskCompleted + `requireVerification`, deliberately at the roadmap boundary, not the turn boundary.
- **Adversarial-review step before close** — available via orchestration (per-slice review) and the ecosystem's `/code-review`; baking a mandatory reviewer into every handoff is unmeasured process.
- **"Point to sources" (git-history archaeology)** — a destination-session technique; `truth_grounding` already sends it to primary sources.

User-raised problem: closing an entry needs the commit sha, so the close always lands *after* the commit, leaving ROADMAP.jsonl dirty — either a `chore: roadmap` clutter commit or an uncommitted ride-along. Root cause is mathematical, not a flow bug: a commit's sha is a hash of its content, so a file inside the commit can never contain that commit's own sha. Any fix must drop the self-reference.

**Options surveyed:**
- **Amend after close** — REJECT. `git commit --amend` changes the sha, so every recorded sha would point at an orphaned pre-amend commit; amend-after-push (checkpoints `push:true`) is actively destructive.
- **Dedicated roadmap commit** — the status-quo clutter the user wants gone.
- **Ride into the next commit** — status quo otherwise; mixes concerns and the session's last close stays dirty indefinitely.
- **git notes** — sha-stable metadata, but the roadmap file itself still changes, so it solves nothing; notes don't push by default either.
- **Invert the pointer (RECOMMENDED): staged close + commit trailer.** The entry doesn't need the sha at commit time — the *commit* needs the entry id, and the id is known before committing. Flow: tests pass → `git add -A` → `update-status {id, status:"done", staged:true}` (new mode: touches derive from `git diff --cached --name-only` instead of `git show <sha>`; the script stages ROADMAP.jsonl itself, keeping guard-roadmap-edit's writer monopoly) → one commit whose message carries a `Foreman: <id>` trailer. Code + closed entry land in one commit, tree clean, sha derivable forever via `git log --grep "^Foreman: 042"`.

**Why dropping the stored sha loses nothing:** `commits[]` is already a breadcrumb, not a resolvable contract — nothing reads it after close (touches derivation happens at update time), and the checkpoint squash finish already deletes branches whose recorded shas then dangle. Trading sha-in-file for id-in-commit-message keeps the same provenance, machine-recoverable, minus the dirty file.

**Design wrinkles if built:**
1. Nudge timing inverts: post-commit.js currently prompts the close *after* the commit — the ordering that creates the problem. The staged path wants a pre-commit reminder (task-completed gate already fires at the right moment in tracked runs); post-commit stays as catch-up — when HEAD's trailer names a non-done entry, nudge a sha-less close (the trailer already links them), shrinking the residue to a status flip.
2. `requireVerification` projects can't mark done pre-commit; there the commit records the trailer, the later user-confirmed flip is a tiny sha-less ride-along. Accepted residue.
3. `roadmap-schema.md`: relax "`done` — commits should be non-empty" to "non-empty commits[] or a trailer-linked close".
4. Checkpoint flow: `task <n>/<total>` commits gain the trailer naturally; the template's "commit first, close, then complete" ordering simplifies to "stage, close-staged, commit". The squash finish must carry the branch's `Foreman:` trailers into the squash message so links survive branch deletion.
5. Fallback intact: the existing sha path stays for after-the-fact closes (follow-up fixes, forgot-to-stage).
