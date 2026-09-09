# Foreman: the gated pause in a split run (the "nanotask" ask)

Local design doc. Guides roadmap entries **295–299**. Written 2026-09-07 from
an owner conversation; nothing here is public prose. Read
`foreman/HOW-IT-WORKS.md` § "Big tasks get split" and `prompt-template.md`
§ "Checkpointing a task-split run" before touching anything it names.

## 1. The ask, in the owner's words

> Foreman should work in nanotasks. Take one big task, "add a login modal",
> and cut it into the smallest pieces that project allows: the button, the
> modal opening, the fields, the connection, the close. A master session
> runs them in order. Between each piece the user is in the loop: "is this
> validated? can we close it?" Only on yes does it move to the next piece,
> because the next piece depends on this one. And it gives people the thing
> they keep asking for: a way to say *this task is closed*.

Two motives, both real:

1. **The user stays in the loop at the boundary that matters** — before
   dependent work is built on top of a piece nobody has looked at.
2. **A closed-ness signal** that is not "the tests passed".

## 2. What Foreman already does (do not rebuild)

| Piece of the ask | Shipped today | Where |
| --- | --- | --- |
| Cut one entry into ordered pieces | `Execute here, split by check`: one `TaskCreate` per `Run:`/`Expected:` pair, chained with `TaskUpdate addBlockedBy` | `craft-handoff.js buildTaskRows`, `pick.md` delivery, `prompt-template.md` checkpoint section |
| Save each piece so a stop loses nothing | one local commit per task on `foreman/<slug>`, `safe-commit.js finish` stages only that task's files | same section |
| Prove a piece is done | its own `Run:`/`Expected:` check, fix ceiling two attempts | `check-prompt.js` gate |
| Say the whole task is closed | `awaiting_acceptance` → the close asks accept / review / **test**; Test appears only where the closing session recorded an `unverified:` note | 2.3.0, `entryParagraphText` splitStep |
| Ask the user between pieces | **missing** — the chain runs through and asks once, at the end | — |
| One session runs many entries | **never-list**, `../../../foreman/docs/adr/SCOPE.md` § The never-list ("batch or parallel execution of several roadmap tasks"). Major version only | `SCOPE.md:395` |

So the gap is exactly one thing: **a pause inside the split run**. Everything
else the ask names is the split run plus the 2.3.0 close, under a new name.

## 3. The rule that shapes the design

From 2.3.0, owner's framing, recorded in memory:

> An option the model offers by feel would fire on everything and become a
> slower Accept. Gating it on recorded data is the whole design.

A pause after *every* piece is that slower Accept: when a piece's check is a
command and the command passed, the piece is proven, and asking a human to
confirm what a test already confirmed teaches them to click through. The
pause has to fire only where a human is the only instrument — how it renders,
how it feels to use, whether the motion looks right. Those are the words the
2.3.0 splitStep already uses to define an `unverified:` line.

Design consequence: **the pause is triggered by a verification pair recorded
at craft time, never by the running model's judgment.**

## 4. Design

### 4.1 A verification pair can be a human check

Today a pair is `{run, expected}` and `check-prompt.js` requires `Run:` +
`Expected:` in `task_rules`. Add a second shape:

```json
{ "look": "<what the user does>", "expected": "<what they should see>", "goal": "...", "files": [...] }
```

- Exactly one of `run` / `look`, both strings. `validateJudgment` throws on
  neither or both — same trust-boundary treatment `run` gets today
  (`craft-handoff.js` ~1040).
- Renders as `Look: …` / `Expected: …` in the verification block, in running
  order with the `Run:` pairs.
- `check-prompt.js` accepts `Look:` as a verification line wherever it
  accepts `Run:` (the `/\bRun:/` test at ~270). Additive: the three frozen
  `benchmarks/foreman/fixtures/*/prompts/foreman-std.md` arms carry only
  `Run:` and must keep passing — do not touch `CONCISE_TRUTH_SENTENCE`.
- Counts as a check everywhere checks are counted: the split offer
  (destination-question rule 3, "two or more checks"), `checkCount` for the
  clipboard embed, the empty-row warning (276/280 — a `look` row still needs
  `goal`/`subject`/`files` like any other).
- craft-prompt Call 3's Explore resolution (`verification.resolves`) is for
  commands; a `look` pair skips it and is never marked unresolvable.

### 4.2 The pause

In a split run, a task whose pair is `look` does this after its change is
made, **before** its checkpoint commit:

1. Ask once with `AskUserQuestion`: the `Expected:` text as the question.
   Options, in this order: **Holds** — **Not yet** — **Skip this check**.
2. **Holds** → record it on the entry, one call, same channel as `unverified:`:
   `echo '{"id":"<id>","notes":"accepted: <the Look text> (task <n>/<total>)"}' | node …/roadmap.js annotate`
   then mark the task completed, checkpoint-commit as today, continue.
   `accepted:` joins `MACHINE_NOTE_RE` so it never leaks back as recall
   prose. This is the durable per-piece record: which result the user saw
   and said yes to, tied to the `task <n>/<total>` commit, readable by a
   later session with `list --ids` — no second store needed.
3. **Not yet** → the user's note is the failure; fix and re-ask. The existing
   fix ceiling applies: after two failed attempts stop and report, do not
   widen the change. No commit for that task.
4. **Skip this check** → record it on the entry, one call, the existing
   channel:
   `echo '{"id":"<id>","notes":"unverified: <the Look text, and what to look for>"}' | node …/roadmap.js annotate`
   then commit and continue. It resurfaces at the close as the Test option.
5. A `run` task never pauses. Passed command = proven, commit, continue.

Where the words live — three copies, nothing binds them (277/278 lesson):

- `prompt-template.md` § "Checkpointing a task-split run" (the `Execute
  here, split by check` path reads this).
- `checkpointEmbedText` in `craft-handoff.js` (the clipboard path — the
  pasted session cannot read the template, so one bullet rides inline).
- `pick.md` and `skills/craft-prompt/SKILL.md` delivery bullets (they only
  point at the section; one clause each).

Headless / no `AskUserQuestion` (the `-p` trap from the README recording):
if the ask tool is unavailable, treat it as **Skip** — record the
`unverified:` line and continue. Never block a run on a question nobody can
answer.

### 4.3 The close gets more honest, not different

The 2.3.0 splitStep writes `unverified:` for "anything only a human's eyes
or hands can settle". A `look` pair answered **Holds** mid-run *is settled*:
the closing session must not write it again. Only skipped ones are on the
entry. So the Test option at the close shrinks to what genuinely was not
looked at — which is the closed-ness signal the ask wants, built from data
the run recorded, not from a new lifecycle state.

One sentence added to the splitStep text: a check the entry already carries
an `accepted:` line for is settled, do not list it. The closing session
reads that from the entry (`list --ids`), not from its own memory — so a
run that died and was resumed in a fresh session closes correctly too.

### 4.4 Destination question

`destination-question.md` caution table gains one row:

| Option | Carries `(Caution)` when | Say in the description |
| --- | --- | --- |
| `Execute with a background Agent` | any verification pair is `look` | it has nobody to ask, so every human check would be skipped and land on the entry as unverified |

Rule 2 ("≥1 check") counts `run` checks only; the Agent still never leads
with no runnable check. `Execute here` (no split) needs no change: with a
single task there is nothing between pieces to pause on, and the close
already asks.

### 4.5 Gathering the human checks at craft time

`pick.md` step 3 `verification` bullet and craft-prompt Call 3 get one
clause: a check only a human can settle is a `look` pair, not a `run` pair,
under the two bars the splitStep already states — answerable today (not
waiting on unbuilt work) and genuinely past a command's reach (where a
skill, script or harness in the project already drives the thing, it is a
`run`). Reuse that wording verbatim; do not write a third definition.

Two more clauses, taken from the nanotask-store proposal (§10):

- A `look` pair names a **result the user can try**, never a step. "Create
  the component" is a step and gets no pair of its own; "click Log in, the
  modal opens" is a result. Fewer, real pauses beat many small ones.
- Its `expected` states what they should see **and what is not there yet**
  ("the modal opens with both fields; it does not authenticate yet"), so
  the user does not reject a piece for work a later piece owns.

### 4.6 What is deliberately not built

| Idea | Why not |
| --- | --- |
| Pause after every task | §3. Fires on everything, becomes a slower Accept. Re-open only with a live trace showing a passed `run` check that a user then rejected. |
| A `checkpoints.pause` config key | No evidence anyone wants a different setting; the trigger is per-pair data, which is finer than a project-wide knob. `settings.md` stays unchanged. |
| Nanotask rows inside `ROADMAP.jsonl` (children, sub-entries) | Never-list: "persistent acceptance-criteria and execution-record schemas". The harness task list already is the per-run row store; the entry stays the unit of record and its `unverified:` notes are the residue. |
| An `in_review` state | Never-list. `awaiting_acceptance` + recorded notes already carry it. |
| A master session working several entries | Never-list, batch execution. The split run is *one entry* cut into pieces — that is what nanotasks are here. |
| Auto-generating the pieces from the entry's `what` | The crafter already writes the pairs; Foreman relays, never invents scope (`../../../foreman/docs/adr/SCOPE.md` "never silently changes project intent"). |

## 5. Worked example — the owner's login modal

Entry: "Add a login modal for users". The pick gathers, in running order:

```json
[
 {"goal":"Add the Log in button to the header","files":["src/Header.tsx"],
  "run":"npm test -- Header","expected":"Header renders a Log in button"},
 {"goal":"Open LoginModal from the button","files":["src/Header.tsx","src/LoginModal.tsx"],
  "look":"click Log in in the running app","expected":"the modal opens centered, email and password fields, focus on email"},
 {"goal":"Wire submit to POST /auth/login","files":["src/LoginModal.tsx","src/api/auth.ts"],
  "run":"npm test -- auth","expected":"submit calls login() and stores the token"},
 {"goal":"Close on success and on Escape","files":["src/LoginModal.tsx"],
  "look":"log in with a valid user, then reopen and press Escape","expected":"modal closes both times, header shows the user name"}
]
```

Four tasks, two pauses. Tasks 1 and 3 prove themselves and commit. Tasks 2
and 4 stop and ask. A **Not yet** on task 2 is fixed before task 3 is built
on top of it — the dependency the ask cares about. The close carries no
`unverified:` line if both were Holds, so the accept question is just
accept / review.

## 6. Build order and dogfooding

Five entries, built in this repo, through Foreman, on Foreman. The first
lands the data shape; from the second on, **every entry is picked as
`Execute here, split by check` and carries at least one `look` pair**, so the
pause proves itself on its own build. Plan-doc checks (voice, layout,
"does the pasted prompt actually stop") are exactly the checks no command
settles — they are honest `look` pairs, not padding.

| # | Entry | depends_on | Dogfood check (`look`) |
| --- | --- | --- | --- |
| 295 | `look` pair accepted by `craft-handoff.js` + `check-prompt.js`, rendered, counted | — | none — built with today's flow; the first pick of 296 is the first live pause |
| 296 | The split run pauses on a Look task; clipboard embed bullet; splitStep sentence (§4.2, §4.3) | 295 | paste a clipboard handoff carrying one `look` pair into a fresh session: it stops at that task, offers Holds/Not yet/Skip, commits only after Holds |
| 297 | Craft-time gathering: pick.md step 3 + craft-prompt Call 3 clause (§4.5) | 295 | run a real pick on a UI-ish entry in another project: the crafter proposes a `look` pair without being told |
| 298 | Destination caution row + rule 2 counts `run` only (§4.4) | 295 | pick an entry whose pairs are all `look`: the Agent option reads `(Caution)` and the split is recommended |
| 299 | Docs: HOW-IT-WORKS § Big tasks get split (two sentences), CHANGELOG `[Unreleased]` | 296, 297, 298 | read the section in GitHub preview: tired-dev voice, no methodology, no new term the reader has to learn |

Dogfood honesty: what happened goes in the entry's notes as it happens —
the `accepted:` and `unverified:` lines the run writes, plus the closing
note. A **Not yet** that never occurred is not evidence; if no real one
happens across 296–299, say so in 299's notes rather than staging one.

Release: minor, not patch — a user reads a new question. Before and after
every entry: `node docs/foreman/validation/scripts/readiness-check.js`; suite on Windows is
`node --test "tests/*.test.js"` from `foreman/`. The five stale frozen-prompt
benchmark tests stay failing by owner's choice; anything *new* failing in
`benchmarks/foreman/tests` means a `Run:`-only arm broke and 295 is wrong.

## 7. Tests to add (per entry)

- 295: `craft-handoff.test.js` — a `look` pair renders `Look:`/`Expected:` in
  order; both/neither of `run`/`look` throws; a `look` row without
  goal/subject/files trips the empty-row warning; `check_prompt.test.js` —
  a task_rules with only `Look:` + `Expected:` passes the verification gate;
  the frozen `foreman-std.md` arms still pass.
- 296: `craft-handoff.test.js` — `checkpointEmbedText` carries the pause
  bullet only when ≥1 pair is `look`, byte-identical otherwise (the 262
  pattern); `entryParagraphText` splitStep carries the "already
  `accepted:`" sentence; `accepted:` matches `MACHINE_NOTE_RE` and
  `recallExcerpt` drops it (the same test shape `unverified:` got in
  2.3.0); `prompt-template.md` section pinned by the existing template
  tests.
- 297: the skill-string pins in the suite (pick.md / craft-prompt) extended
  by one assertion each.
- 298: `destination-question.md` row pinned the way the other caution rows
  are; `(Not recommended)` still appears exactly once, as the banned phrase.
- 299: `confidence_modes.test.js` reads `HOW-IT-WORKS.md` — keep its pins.

## 8. Evidence bar

No paid batch. The 2.3.0 close ask shipped on one live hand-test in another
project; the same bar applies, and the dogfood column in §6 *is* that test,
run four times on real work. A batch is warranted only if a trace shows the
pause misfiring — a `look` pair the crafter wrote for something a command
could have settled — in which case the fix is in §4.5's wording, measured
against the two bars, not in a new mechanism.

## 9. Housekeeping found on the way

This repo's `ROADMAP.jsonl` is 820 KB, 278 entries, every one terminal
(260 done, 9 dropped, 9 rejected), none archived. The session-start offer
fires at 20 terminal entries and re-nudges weekly; nobody took it. Recall,
anchors and dependency resolution all read `.foreman/archive.jsonl`, so
archiving loses nothing. Run `node foreman/scripts/roadmap.js archive`
before starting 295 so the dogfood picks read a lean file. No code change.

## 10. Reconciliation with the nanotask-store proposal (2026-09-08)

The owner brought a second design for the same ask, written by another
model against a checkout it calls `codex/port`. That checkout is not in this
repo: the files it cites as its base (`skills/roadmap/delivery.md`,
`hooks/codex-task.js`) exist in neither `foreman/` nor
`plugins/foreman-codex/`, and it seeded its own `ROADMAP.jsonl` with
`ids_after: "293"`, so its entries 294–301 collide with this repo's real 294
(done, the ranked-header measurement) and with 295–299 above. Nothing from
that roadmap or its `.foreman/config.json` is imported here. If work ever
happens there, its trailers `Foreman: 29x` mean different entries than the
same trailers in this history — one of the two numberings has to go.

### 10.1 Same ask, two mechanisms

| | This design (gated pause) | The store proposal |
| --- | --- | --- |
| Unit of a piece | a `look`/`expected` pair, one harness task, one commit | a `unit` record in `.foreman/nanotasks/<parent>.json` with its own lifecycle |
| Where "accepted" lives | `accepted:` note on the entry + the `task <n>/<total>` commit | acceptance record with revision, evidence refs, history |
| New state | none | `format`, `revision`, `units[]`, per-unit `planned → in_progress → awaiting_acceptance → done` |
| New surface | one pair shape, one question, one note prefix | ~9 CLI verbs, a store module, doctor checks, lock sharing, hash manifests |
| Version | 2.x minor | 3.0 by Foreman's own rule (below) |

### 10.2 Verdict, section by section

| Their section | Disposition | Why |
| --- | --- | --- |
| §1 one task at a time, no framework | agree | same reading of `SCOPE.md:146`; both designs cut one entry into pieces, neither runs several entries |
| §2 "no durable identity, no per-piece acceptance, no resume of that state" | fair, **adopted in part** | the missing per-piece record is real. Fixed here with the `accepted:` line (§4.2/§4.3), which a later session reads with `list --ids`. The rest of §2 names files this repo does not have |
| §3 accept / request changes / pause per unit | mapped, not built | accept = **Holds**, request changes = **Not yet**. Pause = stop the session: checkpoint commits, the `in_progress` entry and the menu's resume row already exist, so no verb is needed |
| §3 "unit = smallest result the person can test, not a step"; declared limit per unit | **adopted** | §4.5's two new clauses. This is the best idea in the proposal: it is the gate that keeps nanotasks from inflating into a click-through |
| §3 acceptance mandatory even with `requireVerification:false`; plan approval before starting | declined | an unmeasured override of a user setting inside a "mode"; the plan-approval gate is the sprint's dispatch-plan gate, cut with entry 038. Here the trigger is per-pair data, not a mode |
| §4 the store | **declined** | never-list: "persistent acceptance-criteria and execution-record schemas" (`SCOPE.md:405`), and `SCOPE.md:370` "do not add acceptance-criteria, execution-record, or review-state fields without a measured failure". No failure is measured yet — the simpler path has not shipped |
| §5 eight invariants + per-unit lifecycle | mostly already held, rest declined | (1)(2) one active piece in order = `addBlockedBy` chain; (3) the accept names its result = the `Expected:` text is the question and the `accepted:` line quotes it; (4) idempotent writes = `annotate` append + `safe-commit`; (5) Not yet keeps the task open; (6) pause = stop; (8) a done entry is not reopened = existing `update-status` rules. (7) invalidation cascade when an accepted piece changes: declined, no evidence, and the close's Test option already re-checks anything skipped. Per-unit lifecycle states: declined, `in_review` spirit |
| §6 persistence, locks, revisions, hash manifests, recovery | n/a | all of it exists to keep a second store coherent with the roadmap. With no second store there is nothing to reconcile. Shared honest gap: a resumed entry re-crafts the whole prompt today; the `task <n>/<total>` commits plus `accepted:` lines are what a resume would skip on. Not in 295–299; a follow-up only if a real resume trace shows rework |
| §7 "an old Foreman could close the parent" | n/a | self-inflicted by the store. The roadmap status is the only state here, so old and new Foreman agree by construction |
| §8 growth: fixtures of 100 / 1 000 / 10 000 tasks, bounded plan reads | declined | no evidenced problem: 278 entries read in milliseconds, and `archive` exists (§9). Re-open with a trace of a slow read, not a fixture |
| §9–10 entries 294–301 as a strict chain, doc-as-entry, final-evaluation entry | declined as shape, **honesty rules adopted** | eight sequential entries, two of them meta, colliding ids. The "never fabricate a Not yet, label rehearsals" rule is in §6 now |
| §11 coverage list | store-specific except one | the "host cannot ask" demonstration is 296's dogfood check and §4.2's headless fallback |

### 10.3 What would bring the store back

`../../../foreman/docs/adr/SCOPE.md`'s own rule: an item leaves the never-list only in a major
version, with the reason written next to it — repeated solo-developer
evidence that the simpler path could not solve the problem. Concretely, from
296–299's dogfood and later real use: (a) a resumed run rebuilt a piece the
user had already accepted; (b) the user could not tell from `list --ids` and
`git log` which pieces they had accepted; (c) a Holds later proved wrong and
nothing showed what had been on screen. Any of those, twice, is the evidence.
Until then the store is not built, and this doc is where that decision lives.

### 10.4 Amendments applied today

- §4.2: Holds writes `accepted: <Look text> (task <n>/<total>)`; joins
  `MACHINE_NOTE_RE`.
- §4.3: the close reads `accepted:` back from the entry, not from memory.
- §4.5: a `look` pair is a result, not a step; `expected` names what is not
  there yet.
- §6: dogfood honesty paragraph. §7: the `MACHINE_NOTE_RE` test.
- Entries 296 and 297 corrected to match (`roadmap.js correct`, 2026-09-08).
  295, 298, 299 unchanged.
