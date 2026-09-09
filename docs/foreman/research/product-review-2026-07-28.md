# Foreman product review — 2026-07-28

**Reviewer role:** project manager / director / senior product engineer
**Baseline:** published `0.46.0-alpha` (marketplace sha `37a0708`, == `origin/main`)
**Head under review:** `a3dde3f`, **55 unpushed, unreleased commits**
**Suite:** `node --test tests/*.test.js` → **926 pass, 0 fail, 23.5s**
**Method:** doc read (`../../../foreman/docs/adr/SCOPE.md`, `PRODUCT-STRATEGY.md`, `README.md`, `settings.md`,
all six `SKILL.md`), source read (`scripts/`, `hooks/`), and live CLI exercise in
throwaway git repositories (plain repo, submodule repo, format-1 repo).

---

## 1. Executive read

The 55 unreleased commits are, almost exactly, `PRODUCT-STRATEGY.md`'s P0 → P2
programme. That plan was correct and it has been executed with unusual
discipline. Measured against its own release sequence:

| Release | Item | State |
| --- | --- | --- |
| P0 | task-owned staging (`safe-commit.js`) | shipped |
| P0 | block checkpointing on dirty trees | shipped |
| P0 | non-destructive re-init after failed snapshot | shipped |
| P0 | `correct` for title/why/what/kind/planned surface | shipped |
| P0 | structural validation (`doctor`) | shipped |
| P0 | prefix-aware collision in normal picks | shipped — verified live |
| P0 | ids beyond three digits | shipped — verified live (`999` → `1000`, trailer + anchor grammar both accept) |
| P0 | drop planned-title list from post-commit context | shipped |
| P0 | align public claims with fast-pick behavior | **partly** — see §3.1 |
| P1 | `awaiting_acceptance` | shipped |
| P1 | archive / restore | shipped — verified round-trip, ids and duplicate-matching survive |
| P1 | planned vs observed surfaces | shipped |
| P1 | survey persists approved repairs | shipped |
| P1 | schema versioning + migration | shipped, **but the upgrade path is broken — §2.1** |
| P1 | one commit-evidence interpreter | shipped |
| P1 | duplicate-id merge repair | shipped |
| P2 | three-question init | shipped |
| P2 | progressive optional settings | shipped |
| P2 | one conceptual entrance | shipped |
| P2 | standard / reinforced profiles | shipped |
| P2 | craft-prompt demoted to advanced | shipped |
| P3 | evidence-gated expansion | correctly not started (entries 145–148 planned) |

The engineering is sound. Where the product is weak now is **not** in the
mechanics — it is at the two seams the plan did not cover: the **upgrade seam**
(what happens to the people already running 0.46.0-alpha) and the **attention
seam** (what a "cheap" pick actually costs in context). Both are release
blockers for shipping this wave.

---

## 2. Bugs

### 2.1 BLOCKER — every existing install fails on its first write after upgrade

Reproduced in a throwaway repo containing a single pre-split entry:

```
$ echo '{"title":"N","why":"w","what":"d","source":"user"}' | node scripts/roadmap.js add
{"ok":false,"error":"ROADMAP.jsonl is format version 1, and this Foreman writes
format 2 — run \"roadmap.js migrate\" once ..."}
```

Format detection keys on the `{"foreman_roadmap_format":2}` meta line alone.
**Any non-empty roadmap without that line is format 1** — including one whose
entries already carry `planned_touches`/`observed_touches`. Only a genuinely
empty file writes cleanly. Since 0.46.0-alpha never wrote a meta line, this is
100% of existing installs, on their first add / close / correct.

Three compounding problems:

1. **No skill mentions `migrate`.** `grep -rn "migrate" skills/` returns
   nothing. Same for `doctor`. Both are P0/P1 deliverables reachable only by a
   model improvising from an error string, or from post-commit's corrupt-file
   message. That contradicts the product's own rule that natural language is
   the primary interface.
2. **`CHANGELOG.md` contradicts itself** about this, in the same Unreleased
   block. Added: *"Existing roadmaps need nothing: a file with no version
   marker is the current format."* — false, measured. Changed: *"the first
   change Foreman makes to one needs `roadmap.js migrate` first"* — true. The
   first line is stale from the earlier commit and would ship as written.
3. `migrate` itself is good — repeat-safe, takes a timestamped backup, converts
   roadmap and archive. It is only the *routing* that is missing.

**Recommended fix:** auto-migrate inside the write lock on first write. The
operation already backs up and is already idempotent, so the safety argument
for refusing is thin, and the refusal buys the user nothing they can act on.
Failing that: detect format 1 in `session-start.js` and say so before the
failure, and give `migrate` and `doctor` a home in the entrance skill.

### 2.2 HIGH — `filesTouchedByCommit(root, "HEAD")` resolves to the wrong repo in a submodule project

`commit-evidence.js:filesFromGit` walks root, then each submodule, and returns
**the first scope that yields any files**. That is correct for a concrete sha
(a submodule sha simply does not resolve at root). It is wrong for a symbolic
ref: `HEAD` resolves everywhere.

Reproduced with a parent repo + submodule, committing inside the submodule:

```
parent HEAD: 6335ae3 add submodule
sub    HEAD: 992b67b work in submodule
filesTouchedByCommit(root,"HEAD") => [".gitmodules","sub"]
```

The only caller passing `HEAD` is `hooks/post-commit.js:416`, feeding
`touchesTag()`. So in **every submodule project — this monorepo included** — a
commit made inside a submodule tags in-progress entries against the parent's
last unrelated commit, and reliably prints
`[no overlap with its planned files]` on the very task being worked on. The tag
is advertised as a ranking hint, so it degrades the ranking silently rather
than failing loudly.

**Fix:** resolve the commit's own repo before asking for its files, rather than
letting `HEAD` bind to the first repo that answers.

### 2.3 HIGH — post-commit fires on commits made in a different repository

Observed live during this review: a `git commit` run in a scratch directory
outside the project triggered the project's post-commit hook, which read the
project's `ROADMAP.jsonl`, listed its planned entries, and invited attaching
that unrelated SHA to a project task.

`hooks/post-commit.js:22` (`projectDir()`) ignores the hook input's `cwd` —
unlike `session-start.js:50`, which honours it. The hook has no check that the
commit it is reacting to landed in the repo it is about to write about. Same
root cause family as 2.2: **nothing establishes which repository the commit
belongs to.** One shared "where did this commit land" resolver fixes both.

### 2.4 MEDIUM — `awaiting_acceptance` entries fall between both post-commit triggers

`hooks/post-commit.js` surfaces exactly two populations:

- `status === "in_progress"` (line 397)
- `status === "done" && updated_at === today` (line 403)

The new third state is in neither. Sequence that loses data, on the default
configuration (`requireVerification: true`):

1. Commit lands → hook moves the entry to `awaiting_acceptance` with its SHA.
2. Follow-up fix commit lands → **no nudge, no SHA recorded**, because the entry
   is neither in-progress nor done-today.
3. User accepts → close to `done` records nothing further.

The follow-up-fix nudge exists precisely because "a bugfix right after
finishing a task is easy to lose track of" — and the new state reopens exactly
that hole for the default path.

### 2.5 LOW — the roadmap-edit guard points at a command list that omits the fix

`hooks/guard-roadmap-edit.js` denies direct `Edit`/`Write` and names
`add/update-status/annotate/archive/restore/list/next-candidates/check-duplicate`.
Missing: `correct`, `update-deps`, `reassign-id`, `doctor`, `migrate`. A model
blocked while trying to fix a stale description is handed a list without
`correct` — the headline P0 feature — in it.

### 2.6 LOW — `migrate` and the init overwrite path litter the repo

Both leave `ROADMAP.jsonl.backup-<timestamp>` untracked at the project root,
and nothing ever mentions or removes it again. This repo carries one right now
(`ROADMAP.jsonl.backup-20260728-030911`, showing as `??`). It is also exactly
the kind of file a later broad `git add -A` sweeps in.

### 2.7 LOW — `settings.md` contradicts `init/SKILL.md` on `fableEnabled`

`settings.md:38` — *"Asked once during initialization"*. `init/SKILL.md:54-66`
— there is no policy interview at all, and `fableEnabled: false` is a written
default. The init rewrite landed; the settings reference did not follow.

---

## 3. Product gaps

### 3.1 The "fast pick costs next to nothing" claim is not true, and it is the biggest gap

`README.md`: *"It reads no code, so it costs next to nothing."*
`../../../foreman/docs/adr/SCOPE.md`: *"Cheap in attention."*

Measured instruction weight on the plain "what's next" path:

| Loaded | est. tokens |
| --- | --- |
| `skills/foreman/SKILL.md` (the entrance) | ~1.3k |
| `skills/roadmap/SKILL.md` | ~10.7k |
| `prompt-template.md` (step 3 needs its XML structure, Handoff profiles, Mechanical gate, and Delivery mechanics sections) | ~13.4k |
| **before any roadmap work happens** | **~25k** |

`roadmap-schema.md` adds a further ~14.7k whenever the model takes the "skim it
if you need field semantics" invitation, which both `init` and `roadmap` open
with.

Reading no *code* is true. Costing next to nothing is not: a fast pick loads
roughly a quarter of a 100k window in instructions before it ranks a single
entry. This is the one claim in the README that a user can disprove on their
first session.

Note the published benchmark, `R-003-prompt-overhead` (68 vs 567 fixed
guardrail words), measures only the text *inside the produced prompt*. The
instruction files needed to *produce* it — the larger cost by an order of
magnitude — are not measured anywhere, and the README quotes the smaller
number under the heading "what Foreman costs in attention".

**This is the most valuable thing to fix next**, and it is squarely on-scope:
`../../../foreman/docs/adr/SCOPE.md`'s mechanical-first rule says anything computable from the roadmap,
git, or config should be computed. Large parts of `roadmap/SKILL.md` and
`prompt-template.md` are assembly instructions for a structure a script could
emit directly.

### 3.2 Two recurring session banners undercut "install and forget"

- `session-start.js` offers archiving whenever ≥20 terminal entries exist. There
  is **no memory of a decline** — a user who says "not now" is asked again
  every single session, forever. This repo would fire it every session (131
  terminal entries).
- `DISCOVERY_INVITE` re-emits on every commit that produces any other block,
  until the config key is written. A background agent is told to skip it
  silently, which means it never gets written, which means it repeats.

Both are one-shot questions implemented without one-shot state. `post-commit.js`
already has the pattern (`filterUnnudged`, a tmpdir state file); neither of
these uses it.

### 3.3 `doctor` has no route, and it is the trust feature

Covered in 2.1 but it is a product gap in its own right. The entrance skill
enumerates six intents; "my roadmap is broken / check it" is not one of them,
despite roadmap repairability being the stated top priority of the whole
release ("No new coordination feature outranks roadmap repairability").

### 3.4 Sprint is still the largest unvalidated surface

`sprint.js` + `SKILL.md` + `run-batch.js` ≈ 16k of code and instructions, shipped
as experimental, with entry 038 still open and entry 145 ("validate sprint
before normal promotion") planned. `PRODUCT-STRATEGY.md` explicitly declines to
measure partial-sprint recovery because *"measuring it would argue for keeping
it."* That is honest, and it means the decision is being deferred rather than
made. It should be made in this cycle: validate it, or cut it.

### 3.5 Nothing records a single trial metric

`benchmarks/health/` and `attention-cost.js` compute the mechanical metrics, and
`TRIALS.md` defines the usage-dependent ones. No skill or hook writes a single
event to `.foreman/trial-log.jsonl`. Every trial-gated metric therefore reads
zero forever. The measurement design is done; the one-line write is not. Until
one flow records something, P3's "evidence-gated expansion" has no evidence to
gate on.

---

## 4. What is genuinely strong

Worth protecting through any refactor:

- **The CLI is the product's spine and it is excellent.** `--help` is complete
  and honest; every command returns one JSON line; every mutation goes through
  a lock and a full structural revalidation; failures are specific and
  actionable. It works with no dependencies and no `package.json`.
- **Archive/restore, migrate, correct, reassign-id** all behaved correctly under
  live exercise, including the awkward cases (archived titles still block a
  duplicate add and still dedup a replayed add; migrate is repeat-safe;
  `999` → `1000` is clean across ids, trailers, and anchors).
- **Prefix-aware collision is real**: `src/auth/` vs `src/auth/mw.ts` correctly
  reports `collision: true` through `next-candidates`.
- **926 tests, zero failures, 23s.** The contract-test discipline is the reason
  this much change landed without visible regression.
- **The confidence vocabulary** (preflighted / grounded / verified) is a genuine
  product insight, and the skills hold the line on it.

---

## 5. Development strategy

### Wave 0 — Ship the wave (blocking; ~1 day)

55 commits of finished work are sitting unreleased, and the longer they sit the
more the published version diverges from the docs. Nothing else should start
first.

1. **Fix 2.1** — auto-migrate on first write inside the lock (preferred), or
   at minimum route `migrate`/`doctor` through the entrance and warn at session
   start. Add a test: a format-1 file survives an `add` end-to-end.
2. **Fix the CHANGELOG contradiction** (2.1.2). One of those two lines is false.
3. **Fix 2.5 and 2.7** — two string edits.
4. Cut `0.47.0-alpha`: bump root `marketplace.json` version + `source.sha`, run
   the manifest audit, push submodule then parent.

**Exit:** a user on 0.46.0-alpha upgrades, asks for a task, and never sees an
error.

### Wave 1 — One commit-origin resolver (~1 day)

Bugs 2.2 and 2.3 are one missing concept. Add a single function that answers
"which repository did this commit land in, and what did it touch" from the hook
input's `cwd`, and route `post-commit.js` through it. Fix 2.4 in the same pass
by folding `awaiting_acceptance` into the follow-up-fix trigger — the two
populations are already computed side by side.

**Exit:** committing inside a submodule tags the right task; a commit in an
unrelated repo produces silence; a follow-up fix on an awaiting entry records
its SHA.

### Wave 2 — The attention release (the real next milestone; ~1 week)

This is the successor to the trust release, and §3.1 is its thesis. Sequence:

1. **Measure first.** Record the actual per-flow instruction load. This is a
   static count over the files a flow is instructed to read — deterministic,
   free, and it belongs in `benchmarks/records/` as `R-004` under the same rule
   R-003 lives by. Publish it even though it is unflattering; the alternative
   is a README claim that a user disproves on day one.
2. **Move assembly into the script.** `prompt-template.md`'s XML structure,
   profile selection, and gate call are mechanical. A `roadmap.js craft-handoff
   --entry <id> --profile <p>` that emits the assembled prompt would remove the
   largest single read from the pick path and put the structure under test
   instead of under prose. `check-prompt.js` already proves the structure is
   mechanically checkable.
3. **Split `roadmap/SKILL.md`.** 43k in one file, of which a pick loads all of
   it to use one branch. Four branches → four files the entrance routes to
   directly.
4. **Then, and only then, re-word the README** to whatever the new number
   supports.

**Exit:** the plain pick's instruction load is measured, published, and
materially smaller; the README's cost claim points at a record.

### Wave 3 — One-shot questions stay asked once (~half day)

Give the archive offer and the discovery invite the dedup state `filterUnnudged`
already implements. A decline is an answer and must be remembered.

**Exit:** no Foreman banner appears twice for the same unanswered question.

### Wave 4 — Decide sprint, then start recording (~1 week)

1. Run entry 145. Validate sprint against repeated single-task execution on
   real fixtures, or cut it and reclaim ~16k of surface. Do not carry it
   another release as "experimental" — that is a decision being avoided.
2. Land the one-line trial-log write in whichever flows `TRIALS.md` names, so
   the P3 metrics stop reading zero. Recording is not adopting; the plan
   already says so.

**Exit:** sprint is promoted or removed, and at least one trial metric has real
data.

### Explicitly not now

- Ranking changes (147) — still correctly gated on replay evidence that does
  not exist.
- Parallel execution (148) — gated on isolation proof.
- Decision retrieval and model advice (146) — both are optional, both are off
  by default, neither is on the critical path.
- Anything in `../../../foreman/docs/adr/SCOPE.md`'s "Ideas intentionally left outside the plan". That
  list has held up well and should keep holding.

### The one principle to add

`PRODUCT-STRATEGY.md` lists eight product principles. This review argues for a
ninth, which the attention release exists to serve:

> **9. A flow's instruction cost is part of its price.** A pick that reads no
> code but loads 25k of instructions is not cheap. Measure what a flow costs to
> *run*, not only what it costs to *produce*.

---
---

# Pass 2 — deep dive (same day)

**Method:** full read of `roadmap-lock.js`, `safe-commit.js`, `commit-evidence.js`,
the `cmdUpdateStatus`/`cmdCorrect`/`cmdNextCandidates` bodies, the read/write
core, `resolve-symbols.js` containment, `task-completed.js` gate, and sprint's
ledger model — plus adversarial live probes: concurrent writers, dependency
cycles, staged renames, ledger files, path escape, stale corrections.

## 6. New findings — bugs

### 6.1 HIGH — `safe-commit finish` breaks on any staged rename or `git rm`

`finishUnit` derives the changed set from `git diff <baseline>` plus untracked
files, then stages it with `git add -- <paths>` (`scripts/safe-commit.js:202`).
A rename staged with `git mv` (or a `git rm`) leaves the old path in the
changed set but in **neither worktree nor index**, and `git add` hard-fails on
that pathspec. Reproduced:

```
R  a.txt -> b.txt
$ echo '{"id":"002","expected":[...]}' | node safe-commit.js finish --baseline <sha>
{"ok":false,"error":"Command failed: git add -- a.txt b.txt src/auth/mw.ts src/auth/new.ts"}
```

Three violations at once:

1. Models use `git mv`/`git rm` routinely, so ordinary unit work detonates the
   one commit path every Foreman mode is required to share.
2. The USAGE contract says *"a refusal is a successful call reporting
   ok:false"* — this surfaces as a raw exception instead, and `git()` pipes
   stderr to `ignore`, so the actionable message (`fatal: pathspec 'a.txt' did
   not match any files`) is swallowed.
3. Sprint workers use the same primitive, so a sprint unit that renames a file
   fails its boundary too.

**Fix:** stage only paths whose worktree state differs from the index (an
already-staged deletion needs no `add`), and carry git's stderr into the
structured error. Also note `git()` here has **no timeout**, unlike
`commit-evidence.js`'s 30s — a hung git hangs the close path.

### 6.2 HIGH — a project's own root `CHANGELOG.md` is confiscated as a "shared ledger"

`sprint.js:isSharedLedger` claims `ROADMAP.jsonl`, `.foreman/archive.jsonl`,
**and any root-level `CHANGELOG*`** — and `safe-commit.js` enforces that set in
every mode, not just sprints. For the actual target user (a solo dev whose
project has a root changelog, i.e. most of them), reproduced live, both ways:

- **Normal finish:** the user's changelog edit is *silently left out of the
  task's commit* (`ledger_excluded: ["CHANGELOG.md"]`, `ok: true`) and stays
  dirty in the tree. The next `begin` then treats that dirt as Foreman's own
  bookkeeping (`ledgerOnlyDirt`) and proceeds — so the edit can stay
  uncommitted across an arbitrary number of units. "Dirty work is never swept
  in" has become "your changelog is never committed".
- **Close-in-commit finish (`roadmap_close: true`):** the staging rule *accepts*
  a declared `CHANGELOG.md` (`allowed = expected + ROADMAP.jsonl`), commits it,
  and then `attestCommit` flags the same file `shared_ledger_committed` —
  `ok:false, reason: "post_commit_attestation_failed"` **after the commit
  landed**. The primitive's two halves disagree about its own rule.

Foreman's own convention of updating the changelog with every task makes this
near-universal. It goes unnoticed in this monorepo only because plugin
changelogs live at `foreman/CHANGELOG.md` — one directory down, outside the
root-only match.

**Fix:** the ledger set for the shared primitive is Foreman's own files only
(`ROADMAP.jsonl`, `.foreman/archive.jsonl`). Changelog ownership is a sprint
*coordinator* policy and belongs in sprint's `attestUnit`, if anywhere.

### 6.3 MEDIUM — same-day corrections silently overwrite each other (corroborates open entry 183)

`cmdCorrect`'s staleness guard is `updated_at`, which is date-only. Reproduced:
two corrections against the same `expected_updated_at` on one day — the second,
composed against text it never saw, applies cleanly and replaces the first.
Entry 183 already tracks this; the live repro confirms it is real, not
theoretical. The comment in `cmdCorrectUnlocked` claims the mutation lock
covers the same-day case, but the lock only serializes the *writes* — it cannot
see that the second caller's read predates the first caller's write.

### 6.4 LOW — `headTrailerIds` reads only the root repo's HEAD

`hooks/post-commit.js:174` runs `git log -1` at the project root. When the
commit that fired the hook landed in a submodule, the trailer scan reads the
parent's last commit instead — the same missing where-did-this-commit-land
resolution as pass-1 bugs 2.2/2.3. Fold it into the same fix.

### 6.5 LOW — the completion-gate latch never expires

`task-completed.js:shouldGate` latches each `task_id` permanently in a tmpdir
file: a task blocked once is never gated again, even a retry hours later after
the entry was reopened. Documented as best-effort, and probably acceptable —
but worth knowing the gate is strictly once-per-task-id-per-boot, not
per-completion-attempt.

## 7. What pass 2 confirmed clean

Live-probed and held:

- **Concurrency:** 10 parallel `add`s → sequential ids, no duplicates, no lost
  writes. The bakery lock (`roadmap-lock.js`) is genuinely well built: claim
  dirs with random tokens, ticket ordering, PID-reuse defense via process
  start-time identity, stale-claim recovery — all fail toward waiting, never
  toward stealing.
- **Graph integrity:** self-dependency refused; A→B→A cycle refused with the
  path named; depending on an *archived* parent works and an archived `done`
  parent satisfies readiness.
- **Path containment (entry 187's fix):** `../../../…`, `/etc/passwd`, and
  `C:/Windows/…` all come back `outside_project`, unread, with warnings.
- **Write safety:** temp-file + rename, full-contract validation before every
  write (with grandfathering for pre-existing defects so old files stay
  correctable), re-read after write, CRLF-tolerant reader, meta line
  re-stamped on every write.
- **Prefix collision, archive round-trip, migrate idempotence, id 999→1000** —
  all reconfirmed from pass 1.

## 8. Revisions to the strategy

Wave 1 grows by one item and Wave 4 gains a precondition:

- **Wave 1 (commit-origin resolver)** also absorbs 6.4 — it is the same
  missing concept, third instance. Three call sites now justify the shared
  resolver on their own.
- **New Wave 1.5 — safe-commit hardening (before any sprint decision):**
  fix 6.1 and 6.2 together; they are both "the shared primitive carries
  sprint's assumptions". Acceptance: a unit that renames a file, deletes a
  file, and edits the project's root changelog commits cleanly in single-task
  mode, and attestation agrees with staging in the roadmap_close mode.
  **Entry 145 (validate sprint) is meaningless before this lands** — sprint
  would be validated against a primitive that fails on renames.
- 6.3 is entry 183 — already planned; raise it into the next working set,
  since `correct` is the trust release's flagship and the overwrite window is
  its worst failure mode.

The deeper pattern across both passes, stated once: **every remaining defect
family is a missing "who owns this fact" resolution** — which repo owns the
commit (2.2/2.3/6.4), which mode owns the ledger policy (6.1/6.2), which
session owns the entry text (6.3/183). The mechanics underneath are sound; the
ownership seams are where it still leaks.
