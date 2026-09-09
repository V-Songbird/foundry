# Foreman ledger review — the provenance vision, measured against what ships

**Date:** 2026-09-05. Local research record; `/docs/*` is ignored.
**Status:** assessment. Nothing built, nothing measured with a model. Every
number below came from this repo's own files and git at zero cost.
**Scope:** `foreman/scripts/ledger.js`, `note-staleness.js`, `ledger-config.js`,
the read side of `craft-handoff.js` (prior work, lessons, anchors),
`hooks/ledger-recall.js`, the close path in `roadmap.js`, `ledger.md`, and
this repo's live `.foreman/notes.jsonl` and trial log.
**Read first:** `foreman-lesson-ledger-design-2026-08-11.md` (the design, its
rejected list is binding), `foreman-lesson-benefit-2026-08-18.md`,
`foreman-wrong-lesson-2026-08-19.md`.

---

## 0. The vision, as five claims

The owner's ask, restated so each part can be checked on its own:

1. **Record.** When a task learns something hard, the close can write it down
   and later sessions get it without looking.
2. **Id in git.** The entry id rides into the commit and the code, so the
   work is findable from either side.
3. **What and why.** A later task on the same code is told what earlier tasks
   did there **and why they did it**.
4. **The chain.** Entry 005 creates a function, 030 changes it, 100 touches it
   again: 100 sees both, in order, for the whole life of the project.
5. **Better prompts.** Because of 1 to 4, the handoff prompt carries context a
   plain "refactor this" session would never dig out of git.

The short verdict: **1 and 2 hold. 3 half-holds: the WHAT rides, the WHY does
not. 4 does not hold today, and a free probe shows git can already answer it.
5 is measured true for the one case tested and unmeasured everywhere else.**

---

## 1. What holds today

Verified against the code on 2026-09-05 and against the live store.

| Claim | Mechanism | Evidence |
| --- | --- | --- |
| Record at close | `lesson` field on `update-status`, `ledger.append`: 500 chars hard refuse, bookkeeping paths dropped, case-preserved paths, anchor = commit sha or entry id, provenance line on the entry, `notes.jsonl` staged with a staged close | This repo, since 2026-08-18: **18 records, 18/18 stored, 0 refusals**. Every one names a file or symbol and states a rule, not a log. |
| Asked at the right moment | `entryParagraphText` adds the two-sentence ask to every handoff close paragraph when `ledger.enabled`; `ledger_ask` fires the opt-in question the first time a finished entry overlaps a planned file | The ask rides on all three destinations because the paragraph is baked into the prompt. |
| Served at dispatch | `ledgerText`: path overlap with `planned_touches`, 6 records / 1000 chars, newest first then by match count, three-valued staleness label, graded rule drops a stale record whose prose names a moved file, dead records suppressed | Benefit measured 0% → 100% on `pinned-dup`, both models, n=6. |
| Served on open | `hooks/ledger-recall.js`: exact path, 2 records, 6-call git budget, once per session per file | Fired five times during this review, e.g. on `pick.md`: "The Windows clipboard copy command is written in THREE places … [entry 278, unchanged since]". |
| Explicit pull | `roadmap.js notes --paths` / `--area`, 10-area cap, budgeted staleness | Works; `area` is cosmetic per P0. |
| Correction | `note-supersede` (append-only marker keyed on content), `note-prune` (the one rewrite, dry-run first), survey step 3b retires what its evidence contradicts | Built in 247, released. |
| Id in git | `Foreman: <id>` trailer on every staged close; `[Foreman: 019]` anchors in code served at dispatch (`anchorsText`) and on open; `commits[]` on the entry | **96 trailer commits** in the foreman repo, 10 in the parent. |
| Prior work | `<prior_work>`: 3 leads by `observed_touches` overlap, freshness stamp per lead | Stamps land on every lead; unknown never reads as fresh. |
| Wrong lesson | A false fresh lesson costs tokens, not correctness — where a runnable check refutes it | 12/12 sessions did the work anyway (entry 252). |

The store's concurrency story (append-only, no ids, torn-line skip, content-keyed
supersede) is sound and needs nothing.

---

## 2. Where it falls short of the vision

Each gap carries the number that shows it. G1 to G5 are about claims 3 and 4;
G6 and G7 are what stands between the feature and "out of beta".

### G1. The `why` never rides

A `<prior_work>` line is `id + title (60) + the LONGEST human note line (240) +
stamp`. The entry's `why` field is never served for any entry but the picked
one. Four recent entries, side by side:

| Entry | What the handoff serves (longest note line) | What the entry's `why` says |
| --- | --- | --- |
| 277 | "Shipped in foreman e1f2f2b. Gate is now tasks \|\| wantsClipboardEmbed. Suite 1170/1170." | "Entry 276 warns when a split row would carry no work, but it is gated on `tasks`, which craft-handoff builds only for destination task. The clipboard checkpoint embed tells the pasted session to creat…" |
| 274 | "Shipped in foreman 3abc1df. The carve-out rides on both profiles…" | "craft-handoff.js:237 tells the session a MISSING planned path may be one this task creates; the no-invention line … and CONCISE_TRUTH_SENTENCE …" |
| 269 | "Shipped in foreman 2f325a6, unreleased. Four edits: …" | "A finished task sat awaiting acceptance until the next pick raised it days later, and the closing session handed the user commands it could have run itself." |
| 259 | "Built and verified. relevantFilesText now ranks each file symbols…" | "relevantFilesText … joins every top-level definition … with no ceiling. It is the only uncapped list in the assembler…" |

22 of 130 closed entries with human notes have an excerpt that opens with a
shipping verb ("Shipped", "Built", "Done"…). The rest are better, but none is
the reason the task existed — that is the `why` field, and the design's own
list of what evaporates at close ("what was tried, why a shape was chosen") is
what `why` holds. Median `why` is 188 chars; 44 of 138 run past the 240 cap.

### G2. Hot files are the blind spot

`RECALL_MAX_REACH = 0.2` drops any path more than 20% of closed entries
touched, in `priorWorkText` and, per matched path, in `selectNotes`. On this
repo the corpus is 138 entries, ceiling 27.6:

| Path | Closed entries that touched it | At dispatch |
| --- | --- | --- |
| `foreman/CHANGELOG.md` | 32 | never served |
| `foreman/prompt-template.md` | 31 | never served |
| `foreman/tests/craft-handoff.test.js` | 30 | never served |
| `foreman/scripts/craft-handoff.js` | 30 | never served |
| `foreman/scripts/roadmap.js` | 27 | one close from dropping |
| `foreman/skills/roadmap/pick.md` | 27 | one close from dropping |

Replay over the last 20 handoffs on this repo: **33 lessons served with the
filter, 75 without; 10 handoffs served none with it, 6 without; average block
349 chars vs 575** (both under the 1000-char cap). 3 of 18 records name only
hot paths and can never reach a handoff. The file-open hook has no such
filter, so the same record arrives later, and only if the session opens the
file. The "core function everyone touches" in the owner's example lives in
exactly these files. For entry-level leads the filter's reason holds (a busy
file's history is noise); for a lesson it does not — a lesson is a specific
claim, and the hot file is where claims pile up.

### G3. Archiving erases prior work

`readEntries` is active-only by design ("every caller excludes archived work by
construction"). `priorWorkText`, the lessons corpus in `ledgerText`, and the
titles in `anchorsText` all read it. `hooks/session-start.js` offers the
archive at 20 terminal entries. After the first archive, entry 005 can never be
recalled at 100's handoff. Lessons survive (`notes.jsonl` is its own file), but
their reach ceiling is then computed over the shrunken active corpus. This repo
has never archived (no `.foreman/archive.jsonl`), so nothing here has felt it;
a user's project will, early.

### G4. The chain serves oldest-first and cuts at three

`priorWorkText` sorts by reach ascending, then **id ascending**. For a file
with five earlier entries the three oldest serve and the two newest are
dropped — the latest change, the one that explains the code as it stands, is
the first to go. `selectNotes` sorts newest-first. The two channels disagree.

### G5. Nothing is symbol-level

Every match is a path. The "function" in the vision has no link to an entry
except a hand-typed `[Foreman: 019]` comment. §3 shows git already holds that
link.

### G6. Nobody can say whether the read side pays

The design's `lesson_quoted` event (one per handoff that served a lesson) was
never built — `craft-handoff.js` imports only `recordFirstPick`. `lesson_present`
fires only when a `lesson` field is passed, so an omitted lesson leaves no
event and the 18/18 store rate has no denominator. This repo's trial log: 225
`session_start`, 18 `lesson_present`, nothing else. 69 closes since 2026-08-18
against 18 lessons reads as 26%, but many of those closes carried no ask (bulk
closes of old entries, accept-flow closes). Served rate: unknown. Omit rate:
unknown. Both are the numbers a beta exit has to show.

### G7. The unmeasured half that keeps it off by default

`foreman-wrong-lesson-2026-08-19.md`, "not settled": a false lesson that nothing
in the task can refute. Still unmeasured, still the stated reason the feature
stays opt-in.

### G8. Small

- An anchor id whose entry is archived shows no title (`anchorsText` builds
  titles from `readEntries`).
- The close ask asks for "one durable fact". The owner's "what cost me" is a
  subset of that. No rewording proposed without a batch: the house record says
  a backfiring clause needs fewer words, not more.

---

## 3. The free probe: the chain is already in git

**Question.** For a function an entry's own prose names, can git say which
earlier entries shaped it — the "005 created it, 030 changed it" chain — with
no new store?

**Method.** The 30 most recent closed entries whose `planned_touches` include
a `foreman/scripts/*.js` or `foreman/hooks/*.js` file. Symbols = names the
entry's `title`/`why`/`what` backtick or write in camelCase (the same two
signals `promptedNames` already reads) that are defined at column 0 in one of
those files. For each pair, in the submodule:

```
git log -L :<symbol>:<file> --format=%h%x00%B%x1e -s
```

then `trailerIdsIn` over each message, dropping the entry itself.

**Result.**

| | |
| --- | --- |
| (symbol, file) pairs | 26 |
| pairs resolving to ≥1 other entry | **21** |
| pairs resolving to a chain of 2+ entries | **11** |
| git time | 1.0 s total, 40 ms per pair |

Example: `cmdNextCandidates` in `scripts/roadmap.js` → shaped by entries
130, 131, 132, 125, 128, 120, 097, asked for entry 208.

**What it means.** For four in five named symbols, git already knows which
entries shaped that function. Joined to `ROADMAP.jsonl` plus the archive, that
is the id, the title and the `why` of every earlier task on it, in commit
order. It needs no prose from the model, is untouched by the hot-file ceiling
(a symbol is narrower than its file) and by archiving (git keeps the trailer),
and it costs one bounded git call per symbol.

**Limits.** Only column-0 definitions resolve under git's default funcname
rule (nested methods need the language's diff driver in `.gitattributes`).
Only commits that carry a trailer count — staged closes and split runs always
do; a hand close with `commit:` only if the message had one. `-L` walks
history, so on a large repo it wants the same budget-and-timeout discipline
`note-staleness.js` uses. Submodule paths must be de-prefixed the way
`changedSince` already does.

Probe scripts, kept out of the repo:
`X:/Temp/claude/D--Projects-Personal-SoftwareDevelopment-claude-plugins/4446fc80-b74c-4fd9-94c6-73a3edf92a2f/scratchpad/ledger-probe.js`
and `sym-probe.js`.

---

## 4. Proposals, ranked by evidence per cost

None is built. Each names how it gets proven before it ships; the design's
rejected list (area map, SessionStart digest, per-prompt injection,
next-candidates surfacing, prose seeding, confidence fields, co-change stats)
stays rejected and nothing below re-opens it.

| # | Change | Where | Proof needed | Delivers |
| --- | --- | --- | --- | --- |
| P1 | **Serve the `why`.** A prior-work line becomes `id title — why (≤240) [stamp]`; the note excerpt rides only when `why` is empty | `craft-handoff.js` `priorWorkText`, its test | Free replay over the 20 recent handoffs for chars; it is a field the entry owns, not new wording, so no batch is required to ship it | claim 3 |
| P2 | **Symbol chain in `<prior_work>`.** For ≤4 prompted symbols with a column-0 definition: `- <symbol> (<file>): shaped by 030 <title>, 005 <title>`, newest first, oldest always kept; one budgeted `git log -L` per pair; `RECALL_MAX_CHARS` may need one measured raise | `craft-handoff.js` (reuses `promptedNames`, `gitRead`, `trailerIdsIn`, `readArchive`), `commit-evidence.js`, tests | Probe done (§3). Then one batch on a fixture where the function's reason lives only in an older entry's `why`: control vs chain, 6 reps, Sonnet + Opus = **24 sessions, about $10** | claim 4 |
| P3 | **Recall reads the archive.** Corpus = active ∪ archive for `priorWorkText`, the lessons reach map, and anchor titles | `craft-handoff.js`, one `readArchive` call | Unit test; selection only, no batch | claim 4 |
| P4 | **Drop the reach ceiling for lessons**, keep it for entry leads. Alternative: fall back to the filtered-out records only when the block would otherwise be empty | `selectNotes` | Replay done: +226 chars average, 4 of 20 handoffs gain their first lesson; cost stays under `NOTES_MAX_CHARS`; the open-file hook already serves these records unfiltered | claim 1 on hot files |
| P5 | **Newest-first tie-break** in `priorWorkText`, matching lessons; keep the oldest lead when more than three match | `priorWorkText` | Selection only | claim 4 |
| P6 | **Telemetry.** `lesson_served {count, chars}` per assembled handoff; `lesson_present {stored:false, outcome:"omitted"}` when an enabled close carries no lesson (add `omitted` to `LESSON_OUTCOMES`) | `trial-log.js`, `craft-handoff.js`, `roadmap.js` | No-ops unless `trialLog`; free | §5 |
| P7 | **Measure the uncheckable false lesson.** Control vs a wrong lesson no test can refute, on a `pinned-dup`-shaped fixture, 6 reps, Sonnet + Opus = 24 sessions, about $10 (from the $0.78 six-run pre-check). Bar: correctness and requested work unchanged; output cost reported | `benchmarks/foreman/lessons/` | Ask-before-batches applies | G7 |

Cost estimates are per the standing rule: propose arms × reps × models and a
figure, wait for a go. Nothing in P1, P3, P4, P5, P6 spends money.

**Order.** P6 first (the clock on §5 starts when it lands), then P1 + P3 + P4 +
P5 as one or two roadmap entries, then P2 behind its batch approval, then P7.

---

## 5. What "out of beta" should mean

The word lives in two places: the README note and the `[Beta]` marker in
`pick.md`'s opt-in question. The marker is load-bearing there (the user's only
warning before a file lands in their repo) and stays until the exit.
**Default-off is not a beta symptom** — `ledger.md` gives the reason (it writes
a file into the project) and that reason survives the exit.

Exit bar, all evidence, in order:

1. P6 live for 30 days of dogfood on this repo, so the served rate and the
   omit rate are numbers instead of guesses.
2. P7 run. If a false uncheckable claim costs correctness, that result decides
   what the graded rule needs; if it costs tokens only, the wrong-lesson report
   closes. **MEASURED the same day, `foreman-ledger-batches-2026-09-05.md`: it
   costs correctness on Sonnet (5 of 6 obeyed a false pin over the task's own
   instruction) and nothing on Opus (6 of 6 checked the repo and refused it).
   The ledger stays opt-in; a header clause ranking the instruction above a
   recorded claim is the measure-first candidate.**
3. One external review round of a live handoff that carries a lessons block
   and, once P2 lands, a symbol chain — the channel that found six real bugs in
   two rounds and nothing on the third.
4. Then drop the README note and the `[Beta]` word. The question itself stays.

---

## 6. Traps for whoever builds any of this

- Any new prefixed `notes` line joins `MACHINE_NOTE_RE` or `recallExcerpt`
  quotes it back as human prose (lesson on entry 269, still fresh).
- `RECALL_MAX_CHARS` was raised once to 1200 when the stamps landed; the third
  lead evicts silently below the frame. Raise once, measure, and pin the test.
- `<prior_work>` and the lessons block are never `computeSignals` keys — every
  value there feeds `.some(Boolean)` and would promote every serving handoff to
  reinforced.
- `planned_touches` in this repo are parent-root-relative; a `git log -L` on a
  submodule file needs the de-prefix `changedSince` does.
- On this machine a Bash heredoc collapses `\\` to `\`; the probe scripts use
  bracket classes instead of escapes for that reason.
- Windows: `node --test "foreman/tests/*.test.js"`, not `tests/`.
- Run `node docs/foreman/validation/scripts/readiness-check.js` before and after.

---

## 7. Asked the same day: why not Claude Code's auto memory as the store?

The idea: register events per task in the auto-memory index
(`~/.claude/projects/<project>/memory/MEMORY.md`) so every session starts
with them. **Verdict: no. The plan above stands.** The documented facts are
from `code.claude.com/docs/en/memory`, checked 2026-09-05:

| Auto memory, as documented | What the ledger needs |
| --- | --- |
| Machine-local **by default**. `autoMemoryEnabled` can be off per project or by env. **Corrected in §8:** the documented `autoMemoryDirectory` key can point the folder into the repo, so it CAN ride in git | In the repo, in every clone, in headless and background runs |
| The first 200 lines / 25 KB of `MEMORY.md` load at session start; topic files load on Claude's own judgment | Served on relevance only: path overlap at dispatch, exact file on open, hard caps |
| Written by the model. No plugin or hook write API. Hand-editable | CLI-owned, locked, append-only, content-keyed supersede |
| Dated (`modified` frontmatter), never checked against the code | Every served line carries an age verdict from git |
| A subagent does not load the main session's memory | The close paragraph is baked into the prompt, so agent and clipboard destinations get it anyway |

Two of those are the design's own rejected list in another coat. A per-task
line in `MEMORY.md` is the SessionStart digest: cost scales with project age,
not with work done — this repo's 282 entries would overflow the 200-line load
on their own and evict the rest of the index. "Loaded every session" is
per-prompt injection.

Where memory legitimately fits, there is nothing to build. The user's own
habits and preferences belong in auto memory, and Claude writes those
unprompted (this review's pointer landed there today). Project-wide facts
belong in `CLAUDE.md` / `.claude/rules/`, the documented, committed tier; the
ledger's boundary guidance already routes them there, and Foreman deliberately
writes no rules file (added 0.4.7, reverted 0.4.8). The per-task event
registers already exist: the entry's `notes` (committed) and
`.foreman/trial-log.jsonl` (local, opt-in).

---

## 8. Asked the same day: "colony" — auto memory shared over git

The owner's own draft (`colony.zip` + `colonydesign.md`, 2026-09-04): three
files that point Claude Code's auto memory into the repo so every clone and
teammate shares it through git. Checked 2026-09-05 against the docs
(`code.claude.com/docs/en/memory`), the zip's code, and this machine
(Claude Code 2.1.260, no `autoMemory*` key set anywhere, no `.claude/memory`
in this repo).

**Correction to §7, row 1.** `autoMemoryDirectory` is documented: read from
any settings scope, must be an absolute path or start with `~/`, and in
project or local scope it is gated on workspace trust like hooks. The docs'
"machine-local" is the default, not a ceiling. Rows 2 to 5 stand as written:
the index loads whole at every start (200 lines or 25 KB; past that the write
succeeds and an error tells Claude to rewrite the index), the store is
model-written with no lock and no supersede, nothing is checked against the
code, and subagents do not load it. Undocumented, per the docs: whether a
changed key applies to the running session (join.js says next), a minimum
version, and headless `-p` (the owner's kondo test says it works).

**What colony is.** `join.js` (SessionStart) writes
`autoMemoryDirectory = <repo>/.claude/memory` into `.claude/settings.local.json`
whenever that folder exists; `guard.js` (PreToolUse on Write/Edit) denies a
`type: user` memory written under `/.claude/memory/`; `merge=union` on
`MEMORY.md` keeps both sides' index lines. Exercised here: the guard denies this
house's nested `metadata: type: user` shape, passes `type: project`, and passes
an Edit whose `new_string` carries no type line (by design).

**Verdict: two layers, neither replaces the other.** Build colony if you want
it — three files, zero Foreman code, deletes cleanly if native team memory
ships — but not as the ledger's store, and not on these repos.

| | Colony | The ledger |
| --- | --- | --- |
| Unit | Any fact Claude chooses to save | One sentence a close records about the files it touched |
| Trigger | Claude's memory protocol, every session | The close ask, Foreman flows only |
| Served | Index at session start, topic files on demand | Path overlap at dispatch, exact file on open, hard caps |
| Freshness | `modified` stamp, a consolidate pass | Git verdict per line, graded rule, retire, prune |
| Reach | Every session of the repo, any harness reading memory | Foreman flows, plus any session that opens the file |
| Cost | The index, every session, growing with the store (25 KB ≈ 6k tokens worst case) | Flat per handoff, independent of age |
| Measured | Nothing | Benefit 0% → 100% on `pinned-dup`; a wrong lesson costs tokens, not correctness |

The overlap is free and needs no code: under colony, whatever the closing
session saves to memory on its own already reaches every teammate. Mirroring
ledger lessons into memory is NOT proposed — it duplicates the store, pays the
index every session, and drops the git verdict on the way.

**Three things that matter before building it.**

1. **Never on a public repo.** This repo's own memory directory: 52 files,
   **21 name a blocklisted reference, 3 carry the owner's email**. Committing
   `.claude/memory/` here would publish both, and
   `scripts/git-hooks/check-reference-names.js` would block the commit anyway.
   Colony is for private and team repos (kondo, promptly-dead), never the
   marketplace or a plugin repo.
2. **Consent.** `join.js` rewrites `.claude/settings.local.json` silently at
   SessionStart for anyone who trusted the folder — "bitten on clone" is the
   film's metaphor and this house's anti-pattern (Foreman asks at the first
   relevant moment and remembers a no; a hook that prints a rule is still a
   rule). Same three files, one change: SessionStart prints a one-line offer
   when a colony exists and the key is absent, and a `/colony:join` skill (or
   the user's own `/memory`) writes the key.
3. **The false pheromone is real.** A memory file arriving through a pull
   request steers every session. `CLAUDE.md` has the same exposure but is
   human-written and reviewed; memory files are model-written and land in
   bulk. Only review discipline and the guard stand between; nothing in the
   platform verifies a fact. The ledger's answer to the same risk — the git
   verdict and the survey retire — has no colony equivalent.

Smaller: this repo's `.gitignore` has `**/.claude/*`, so a colony needs
`!/.claude/memory/` (the kondo note generalises); the key is documented but
young, so it belongs on the release canary list beside the task schema; the
"live pheromones" `UserPromptSubmit` variant is per-prompt injection — the
design's own "build it only if you feel the lag" is the right bar.

**Effect on the plan above: none.** P1 to P7 and the beta-exit bar stand.

---

## 9. Build log — the same day, on the owner's go

Owner chose: ledger order only, both batches approved (about $25). Built on
foreman branch `ledger-review-2026-09-05`, one commit per entry, ff-merged
into foreman `main` at `072077d` — eight commits ahead of the 2.5.6 pin
`0457af8`, unreleased, `CHANGELOG.md` carrying five `[Unreleased]` lines.
Suite **1208/1208**, readiness green.

| Entry | Proposal | Commit | Note |
| --- | --- | --- | --- |
| 283 | P6 telemetry | `2082103` | `lesson_served {count, chars}`, `lesson_present` outcome `omitted`, `roadmap-health.js` `lessons` block, TRIALS.md ledger events |
| 284 | P1 + P5 | `5d785b6` | `leadExcerpt` serves the why; tie-break newest first |
| 285 | P3 archive | `fdca990`, `072077d` | `historyEntries` = active + archive for recall, anchors, overlap; corrupt archive now costs the leads, not the handoff |
| 286 | P4 ceiling | `a301ea7` | `selectNotes` has no reach ceiling; absence pinned |
| 287 | P2 chain | `1a50386`, `eb2e54a`, `afee34f`, `072077d` | `symbolShapers` + `symbolChainText`; each shaping entry rides with title (40) and why (120); live assemble for 287 named `computeSignals`/`promptedNames` ← 259 and `changedSince` ← 134 in 1.9 s |

**Adversarial review** (fresh-context agent, refute-by-default): two should-fix,
both landed in `072077d` — a corrupt `archive.jsonl` line failed every entry
handoff, and `parse[^…]` matched inside `reparse` so the chain served the
wrong function's history (now two passes: after a non-identifier, then at
column 0). Three nits landed with them (non-string `why`, a real wall budget,
one history read per assemble). Could not break: the trial rows on every
hook and re-close path, the gate on the bigger background block, `git log -L`
with option-shaped or traversal paths, Windows paths and CRLF, the ellipsis
in served text.

**The batches did not run.** Harness built and committed (parent `5de5a76`,
then folded so no fixture file is copied): `chain-off`/`chain-on` on
`pinned-dup`, and `unpin-off`/`unpin-wrong` as the `unpinned-dup` task on the
same fixture with the opposite truth — its `solutionDir` is pinned-dup's `lazy`
overlay, its lazy path is pinned-dup's `solution`, sentinels inverted via
`absent: true` — selfcheck green on all seven tasks. All 48 sessions failed in
one to two seconds with **"Anthropic profile login expired · Run /login"** —
$0 spent, result directories removed. Not the desktop login: every runner
requires `benchmarks/bench-config-dir.js`, which points bench sessions at
`E:/claude-bench-config`, a scratch state dir seeded once in June with a copy
of the login and never refreshed. A bare `claude -p` from the same shell
passed; the runner failed. The owner chose to log in inside that dir
(`CLAUDE_CONFIG_DIR=E:\claude-bench-config`, `claude`, `/login`) rather than
copy a token — a copied grant can rotate and log the desktop session out.
**Both batches then RAN after that login** (tags `chain288-*`, `unpin289-*`,
48 sessions, $7.68): the chain moves `pinned-dup` 0/6 → 6/6 on both models,
and the false uncheckable pin flips Sonnet 6/6 → 1/6 while Opus stays 6/6.
Full report: `foreman-ledger-batches-2026-09-05.md`. Entries 288 and 289
closed `done`.

**Found, not mine, left alone:** five benchmark tests fail because the frozen
`foreman-std` / `shape-*` / `gaming-*` / `extras-*` prompts drifted when 274
(the MISSING carve-out) and 279 (the `it` false positive) changed what
`craft-handoff.js` emits, and nobody regenerated them. `node defaultarm/gen.js`
and siblings rewrite eleven fixture files; the "exact bytes the batch ran"
test will still complain until those batches are re-run or marked replay-only.
Owner's call.

**Left for the release:** `HOW-IT-WORKS.md` and `ledger.md` do not yet mention
the symbol chain; the `[Beta]` word stays until §5's bar is met.
