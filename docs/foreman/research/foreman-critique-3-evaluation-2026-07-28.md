# Foreman critique #3 evaluation — 2026-07-28

**Context:** third external critique ("revised verdict"), same day, evaluated against foreman
main at `a3dde3f` — the six critique-#2 trust-fix commits (`0b545b2`, `8d2ff44`, `96e0ef0`,
`87d5416`, `a4d8991`, `a3dde3f`) are all in. Suite 926/926 across 188 suites. Every claim below
was ground-truthed by five parallel read-only code-reading agents against the actual code, with
line evidence and (for the reproducible ones) working repros in a scratch fixture. No code was
touched.

**Headline verdict:** the critique's central thesis is correct and important — *the critique-#2
fixes each solved the reported example without closing the failure class, and two of them opened
a new hole.* Of the ten release-blocking findings: **five are real, fixable defects (two of them
regressions the last wave introduced)**, **two are legitimate security hardening**, **one is a
real-but-instruction-level gap**, and **two are re-litigation of documented deliberate trade-offs
already adjudicated in critiques #1/#2**. The document's "re-architect around a single transaction
and trust model" conclusion overreaches for a solo-dev ledger and is declined; we fix the concrete
defects instead.

---

## Ground-truth verdicts (all against `a3dde3f`)

| # | Finding | Verdict | Class |
|---|---|---|---|
| 1 | `begin` now tolerates unrelated ledger dirt; whole-file staging sweeps it in | **CONFIRMED (reproduced)** | Real — widened by the last wave |
| 2 | Routine roadmap mutations (accept/add/correct/defer/archive/survey) have no commit boundary | **CONFIRMED** | Real |
| 3 | `requireVerification` is instruction-level, not an engine invariant | **CONFIRMED (core); primary paragraph now honors it)** | Real, instruction-level |
| 4 | Overwrite re-init breaks dependencies between drafted tasks | **CONFIRMED (code-exact)** | Real — **regression from `a4d8991`** |
| 5 | "Start fresh" doesn't clear/snapshot the archive | **CONFIRMED** | Real |
| 6 | Repo content is an executable trust boundary (prompt + shell injection) | **CONFIRMED (nuanced)** | Real hardening |
| 7 | Filesystem containment is lexical (no `realpath`) | **CONFIRMED** | Real hardening |
| 8 | Terminal evidence is self-reported (shape-only SHA, doctor, no transition matrix) | **CONFIRMED as fact / DELIBERATE TRADE** | Re-litigation |
| 9 | Completion "block" is intentionally bypassable | **CONFIRMED as fact / DELIBERATE fail-open** | Re-litigation + 1 doc fix |
| 10 | Safe-commit can discover failure after committing; staged close never attests | **CONFIRMED (both halves)** | Real |

Fix-matrix spot-check: the critique's matrix is largely fair. `lifecycle.test.js:43` does set
`requireVerification:false` — true, but a narrow test-isolation observation, not proof the default
path is untested (it's covered by `post_commit.test.js` + `roadmap.test.js`). The benchmark-hero
"Fixed" row is correct (`bench-signoff.svg` pulled at `a3dde3f`).

---

## The real defects (evidence)

### Finding #1 — ledger-dirt tolerance is too broad, and staging is whole-file — CONFIRMED, reproduced

- `beginUnit` tolerates a dirty tree iff **every** dirty path is a "shared ledger"
  (`safe-commit.js:91-96` → `ledgerOnlyDirt` `sprint.js:183-186`, a pure filename `.every(isSharedLedger)`
  with no diff inspection). `isSharedLedger` = exactly `ROADMAP.jsonl`, `.foreman/archive.jsonl`,
  root `CHANGELOG*` (`sprint.js:153-161`).
- The baseline it returns is a whole-tree fingerprint (`repositorySnapshot`), never a per-entry
  pre-image — nothing records *which* entry the roadmap delta belongs to.
- Staged close runs a bare `git add ROADMAP.jsonl` (`roadmap.js:835-845`, called `roadmap.js:1083`) —
  the whole file, no pathspec/patch narrowing.
- **Repro:** a simulated other-session `annotate` on entry 002 + a `update-status 001 in_progress`
  both dirty only `ROADMAP.jsonl`; `begin` returns `{ok:true,dirty:false,ledger_dirty:["ROADMAP.jsonl"]}`,
  and the foreign 002 note rides into the next commit's index alongside `src/thing.js`.
- **Precise scope (skeptical note):** only `ROADMAP.jsonl` actually rides the commit. `begin` also
  tolerates dirty archive/`CHANGELOG`, but non-close `finish` excludes all ledgers from the task's
  own staging (`safe-commit.js:182`) and only `ROADMAP.jsonl` is re-staged. The critique's scoping to
  `git add ROADMAP.jsonl` is accurate as written; its "archive or root changelog can ride" is not.

### Finding #2 — routine mutations have no transaction boundary — CONFIRMED

- Accept writes `done` and stops: `SKILL.md:163-168` is a single `update-status` with no `staged`/`commit`;
  the handler writes to disk (`roadmap.js:1074`) and only stages under `if (staged)` (`:1081-1084`).
  There is **no `git commit` anywhere in roadmap.js**.
- add / correct / defer / archive / survey-repair all route through `writeEntries` and terminate at a
  user-facing confirmation with no stage/commit (`SKILL.md:625/654/217/46-48`, `survey/SKILL.md:194-205`).
- Combined with #1: an accepted `done` sits dirty until the next task's `begin` tolerates it and the
  next staged close sweeps it whole-file into an unrelated commit.

### Finding #4 — overwrite re-init breaks drafted dependencies — CONFIRMED, **regression from `a4d8991`**

- Overwrite draft is numbered `001..N` (the "continue past max" renumber applies only to the *append*
  branch, `init/SKILL.md:35-37`, **not** overwrite); drafted deps are drawn against those draft ids
  (`init/SKILL.md:89-90`).
- At write time the first `add` carries `ids_after:"<old max>"`, so the floor bumps id `001`→`043`
  (`roadmap.js:710-716`; proved by `id_boundary.test.js:99-100`) — but nothing renumbers the drafted
  `depends_on` from draft ids to allocated ids.
- `add` validates `depends_on` **before** allocating the id (`roadmap.js:699-702` precedes `:705`),
  and `known` spans the archive (`:691`). So a second drafted task with `depends_on:["001"]` either
  **hard-throws mid-rebuild** (archive has no `001`) or **silently binds to the archived historical
  `001`** (archive still has it — the likely case, since the archive is never cleared).
- **The regression:** on a *normal* init draft-id `001` == allocated `001`, so passing draft ids works.
  The `ids_after` floor from the last wave silently breaks that coincidence for overwrite only. No test
  exercises a dependent drafted task across the floor (`id_boundary.test.js`'s two-add case has no deps).

### Finding #5 — "start fresh" leaves the archive intact and load-bearing — CONFIRMED

- The overwrite write phase touches only `ROADMAP.jsonl` (`init/SKILL.md:117-190`: `git commit -- ROADMAP.jsonl`
  snapshot, `> ROADMAP.jsonl` clear). `.foreman/archive.jsonl` is never mentioned; there is no
  `clear`/`reset` command and `writeArchive` is unreachable from this flow.
- The archive still participates in **id allocation** (`roadmap.js:691,705`), **exact-title dedup**
  (`:686-690` returns the archived entry with `deduped:true`), and **dependency resolution** (`:699-702`,
  `archiveResolver` `:198-200`, `graphState` `:859-884`).
- Bite: a re-drafted same-titled task ("Set up CI") gets **no new entry** and silently inherits the
  archived one; a drafted dep can resolve to a dead archived task.

### Finding #10 — commit-before-attest (no rollback) + staged close never attests — CONFIRMED

- Direct `finish` path: `git commit` (`safe-commit.js:236`) **precedes** `attestCommit` (`:238`); on
  attestation failure it still returns `committed:true` + the sha (`:239-248`) — the bad commit exists,
  no reset/amend after.
- Staged-close path (the documented normal close): `finish --no-commit` returns early (`:222-231`),
  then `update-status staged:true` stages and hands back a `trailer` string, then SKILL.md tells the
  executor to run a **raw `git commit`** (`SKILL.md:487-495`). `attestCommit` is never reached on this
  path, and the TaskCompleted hook ignores an already-`done`/`awaiting_acceptance` build. A mangled or
  missing `Foreman: <id>` trailer silently severs the entry↔commit link with nothing blocking.

### Finding #3 — `requireVerification` is instruction-level, not an invariant — CONFIRMED (core)

- `roadmap.js` contains **zero** references to `requireVerification`; `update-status` accepts `done`
  unconditionally (`:941-943` STATUSES check, `:1022` assign). Reproduced: `done` closes under
  `requireVerification:true`, exit 0, no warning.
- **The critique's "primary paragraph corrected" is right:** the primary handoff close now branches on
  the setting at craft time (`SKILL.md:474-479` + `:515-518`, fed by `render-sections.js:109-117`, default
  `true`). This is instruction-level, not a mechanical gate.
- Still hardcoding a direct `done`: `task-completed.js:133-138` (fires only under non-default
  `taskCloseGate:"block"`) and `session-start.js:76` (informational banner). `check-prompt.js` never
  validates that the acceptance sentence is present when the setting is on. "suggestAcceptanceHold" is a
  fair name for the enforcement level.

### Finding #6 — repo content as executable trust boundary — CONFIRMED (nuanced)

- **XML injection (fully reachable):** entry fields inline verbatim into plain XML with no CDATA/boundary
  (`SKILL.md:335-352`, `prompt-template.md:265-311`); the only defense is the semantic `<truth_grounding>`
  instruction, not a parser. `check-prompt.js:122-125` is a non-greedy first-match regex that never asserts
  a tag appears once and never rejects unexpected tags — a duplicate `<task_context>` or injected structure
  passes.
- **Shell breakout (real fragility, Claude-mediated):** every mutating recipe is a hand-built
  `echo '<json>' | node roadmap.js …` with free-text slots (`SKILL.md:167/217/491/503/507/614/625/654`;
  `prompt-template.md:303` ships into every handoff). A value bearing `'`, `;`, `|`, `&`, `$(...)` breaks
  out on **both** PowerShell and bash. **Nuance:** stored roadmap fields (title/why/what/notes arriving via
  branch/merge) flow into the *XML prompt*, not these shell recipes — the pure remote-field→shell path is
  not mechanically wired; the breakout needs Claude to run a recipe with a hostile/stray value.
- A safe boundary already exists and is simply unused here: the scripts read JSON from stdin
  (`roadmap.js:2013-2022`) and shell out only via arg-arrays (`execFileSync("git",[…])`); and
  `prompt-template.md:734-741` already prescribes a temp-file pattern for the clipboard path.

### Finding #7 — lexical containment, no `realpath` — CONFIRMED

- `resolveFile` checks `path.relative` for `..`/absolute escapes then `statSync`/`readFileSync` the target
  with **no `realpath`** (`resolve-symbols.js:94-120`) — an in-project symlink/junction pointing outside the
  repo is followed and its contents cited into `<relevant_files>`.
- Same lexical-only assumption in the reference scan: `walkCodeFiles` follows dir-junctions
  (`resolve-symbols.js:256-282`); `localImports` has **no containment check at all** (`:236-252`).
- Decision-dir reads are LLM-mediated and the mechanical `statSync` there is on a validated id+config-dir
  (low risk). `fs.realpathSync` appears in the repo only in `roadmap-lock.js:18`.

---

## Re-litigation of deliberate trade-offs (decline)

### Finding #8 — terminal evidence self-reported — factually true, deliberate by design

All four points are accurate and each carries an in-code rationale: commit is shape-validated because
the write gate runs git-less (`roadmap.js:963-968`, `[Foreman:186]`); the unknown-SHA soft-fail is the
intended contract (`roadmap.test.js:485-491`); doctor counts *recorded* commits/notes on purpose
(`roadmap-doctor.js:266-275`, `[Foreman:134]`, schema `:180-183`); and "no transition matrix" is explicit
design (`roadmap-schema.md:201-206`). Already declined as the ULID/resolution demand in critiques #1/#2.
**Keep as-is.**

### Finding #9 — completion "block" bypassable — deliberate fail-open, one real doc oversell

The latch is written before the block (`task-completed.js:124-130`, call site `:271-275`) and a second
attempt passes silently — test-enforced (`task_completed.test.js:154-162`), decision gate identical with a
`:dl` key (`:292-297`). This is a **deliberate fail-open anti-loop latch** (`:102-108`; the block reason
itself frames the retry as the correct next step, `:144-146`) — re-blocking every attempt would trap the
agent in a block→retry loop. **Not a bug.** The **one** actionable item: `settings.md:33` says block
"holds the completion **until you close the entry**", which oversells a one-shot nudge as a stateful hold —
a wording fix.

### Declined architecture asks (per critiques #1/#2 and the freeze)

UUID/generation-qualified identity, a transactional/2-phase-commit layer over JSONL, splitting the prompt
studio out, and full "assemble prompts in code with escaped text nodes" are all **declined/deferred**. The
critique's "git + JSONL + prose + hooks as a substitute for a transaction and trust model" is a rhetorical
overreach for a solo-dev, single-writer ledger that already has a cross-process bakery lock
(`roadmap-lock.js`). We close the concrete defects; we do not re-platform.

---

## Development strategy — five waves, Opus 5 coders

Execution model (per house rules): each wave is one tracked task; an **Opus 5** coder implements it
end-to-end — reads the cited files, makes the change, adds the missing test, runs the 926-suite — on a
branch **inside the foreman submodule**, one squash-merged commit per task, reported before the next.
This session owns all roadmap writes and touches no code.

**Collision-aware ordering.** Wave A owns the core (`safe-commit.js`, `sprint.js`, `roadmap.js` write path,
`SKILL.md` close paragraphs), so it runs **first and alone**. Wave D's two halves touch disjoint files
(`resolve-symbols.js`; `check-prompt.js`) and can run **in parallel with A**. Waves B, C, E re-touch
`roadmap.js`/`SKILL.md` and **serialize after A**.

### Wave A — Make the roadmap write a transaction (findings #1 + #2) — highest
- Scope `begin`/staging to the current entry's own status delta instead of tolerating arbitrary
  ledger dirt then staging the whole file. Options: capture a per-entry pre-image at `begin` and stage
  only that entry's line-delta at close; or refuse ledger dirt that isn't the current entry's own
  transition. Preserve the git-less fail-soft.
- Give every mutation a commit boundary — at minimum `accept` should stage+commit its own `done`
  transition (opt-in policy) rather than leave it dirty for a later task to absorb.
- Files: `safe-commit.js`, `sprint.js` (`ledgerOnlyDirt`/`isSharedLedger`), `roadmap.js`
  (`stageRoadmapFile`, `cmdUpdateStatusUnlocked`), `skills/roadmap/SKILL.md`.
- Test: the end-to-end lifecycle test **with pre-existing unrelated roadmap dirt** proving it does NOT
  ride into the commit.

### Wave B — Overwrite re-init integrity (findings #4 + #5)
- Renumber drafted `depends_on` to allocated ids at write time (or seed draft numbering with the floor so
  draft-id == allocated-id again). Add the missing overwrite-with-dependent-tasks test.
- On "start fresh", clear or snapshot `.foreman/archive.jsonl` (or scope dedup/dep-resolution to exclude
  the archive for a fresh generation) so archived work can't suppress a same-titled task or satisfy a
  drafted dep.
- Files: `roadmap.js` (`cmdAddUnlocked`, `ids_after`, archive resolution), `skills/init/SKILL.md`,
  `tests/id_boundary.test.js`, `tests/init.test.js`.

### Wave C — Close-path attestation (finding #10)
- Staged-close path verifies the `Foreman: <id>` trailer landed (post-commit reconciliation of the
  entry↔commit link) instead of trusting a raw `git commit`.
- Direct `finish` path: on attestation failure, either don't leave a bad commit or surface a clear
  recovery instruction — don't return `committed:true` silently on a failed attest.
- Files: `safe-commit.js` (`finishUnit`/`attestCommit`), `skills/roadmap/SKILL.md` close recipe.
- Test: commit-hook rejection and staging-failure cases.

### Wave D — Untrusted-roadmap containment (findings #6 + #7) — parallelizable with A
- `realpath`-based containment in `resolveFile`, `walkCodeFiles`, and `localImports` (add a containment
  check to `localImports`, which has none). A resolved path outside the project root is not read.
- `check-prompt.js` rejects duplicate/unexpected top-level tags (a shallow structural check, not a full
  parser) so injected/duplicate `<task_context>` fails the gate; add the acceptance-paragraph check while
  here.
- Apply the existing temp-file/stdin pattern (already used for the clipboard path) to the roadmap
  `echo '<json>'` recipes so free text never rides a shell.
- Files: `resolve-symbols.js`, `check-prompt.js`, `skills/roadmap/SKILL.md` + `prompt-template.md` recipes.
- Tests: symlink/junction traversal; malicious roadmap prose + shell characters.

### Wave E — Doc & fallback truth (finding #3-partial + #9-doc)
- `settings.md:33` — reword `taskCloseGate` block mode to describe a one-shot flag, not a stateful hold.
- Align the fallback surfaces to the acceptance hold: `task-completed.js:133` and `session-start.js:76`
  stop advertising a direct `done` close when `requireVerification` is on (offer `awaiting_acceptance`).
- Files: `settings.md`, `hooks/task-completed.js`, `hooks/session-start.js`.

### Declined this round
Finding #8 wholesale; finding #9's code change (keep fail-open); UUIDs; transactional JSONL / 2PC;
splitting the prompt studio; full prompt-assembly-in-code. Recorded here so future sessions don't re-open
them.

**Release:** the `Unreleased` fixes should not ship until Waves A–C (the real defects, two of them
regressions) land with their end-to-end tests. D and E are cheap and close real gaps; recommend bundling
them into the same release.
