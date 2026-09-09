# Foreman × codekeel intel — 2026-07-21

Private notes (gitignored dir). Clone: `D:\Projects\Knowledge\codekeel` (AGPL-3.0-or-later, v0.0.4, 32 test files). Produced by a 42-agent workflow: 24 levers proposed across 7 lenses, adversarially verified, 15 survived / 9 rejected.

---

# Foreman × reference-tool mining — final analysis

*All facts below were verified against source at `D:\Projects\Personal\SoftwareDevelopment\claude-plugins\foreman\`. The reference tool is referred to as "the reference tool" throughout; it is never named in any text destined for docs.*

---

## 1. What the reference tool is (5 lines)

A BYOK Node/TS CLI that keeps a per-project YAML **decision ledger** (prose `decision` + a mechanically-checkable `invariant` + path-glob `scope`), merges it with a per-user global ledger, and enforces it live from a `PreToolUse` hook on `Edit|Write|MultiEdit`. Enforcement is a strict cost ladder — glob intersection → whitespace-only skip → author-declared keyword filter → local pattern check → verdict cache → one batched Haiku call — with everything except a positively-confirmed violation failing open. Entries are never deleted, only superseded, and two deterministic staleness signals (scope matches zero files; aged *and* never once exercised) propose retirement without ever performing it. Around that sit five hooks, a `/decision` slash command that drives the CLI's own `--json` mode, and a background miner that queues candidate rules for human triage.

**Its one real idea:** *classify a rule's enforceability once, at authoring time, and store the classification on the rule* — so the expensive judgment is paid once and every subsequent evaluation of that rule is free, offline, and deterministic. Everything else (the ladder, the cache key, the fail-open posture) is scaffolding around that single write-time/read-time inversion.

---

## 2. Where it genuinely beats foreman

Three places, honestly. All three are narrow.

**2.1 Write-time integrity at the store boundary.** Its every-mutation path validates references against the live set and rejects a reference that isn't there (including one hallucinated by its own classifier). Foreman validates `depends_on` in `update-deps` (`scripts/roadmap.js:251-253`) and **not at all** in `add` (`scripts/roadmap.js:126` — `depends_on: Array.isArray(depends_on) ? depends_on : []`, no id check). That asymmetry is a real, unrecoverable hole: `update-deps` is push-only (`:263-266`), there is no remove subcommand, and `hooks/guard-roadmap-edit.js` denies the hand-edit repair, so a bad id at creation strands the entry from `next-candidates` permanently (`:360` requires every dep in `doneIds`, built at `:322` from `status === "done"` only).

**2.2 Retention as a first-class stage.** It gates bloat at three points — authoring (concreteness), accumulation (contradiction against the merged set), and *retention* (dead-scope + dormancy review). Foreman has the first two in weaker form (`fieldWarnings` at `:91-102`, `check-duplicate` at `:442-457`) and nothing at all for retention: no path anywhere reports that a `planned` entry has become permanently unreachable. Reachability is derivable from data `cmdNextCandidates` already loads and throws away.

**2.3 Updatable injected text.** Its hash-fenced marker block means a corrected rule wording reaches machines that installed months ago; its install-detection checks *every* registration rather than a sentinel. Foreman's `/foreman:init` write phase (`skills/init/SKILL.md:169-172`) writes `.foreman/config.json` as a flat six-key literal with no read step — re-running init replaces the file, destroying `customSections`, the one key no skill can regenerate (only readers exist: `scripts/render-sections.js:147`, `:84-113`; `scripts/check-prompt.js:211-215`).

Note what is *not* on this list: enforcement quality, cost discipline, prompt engineering, evidence standards. The reference tool ships **zero benchmarks, zero eval fixtures, and zero numeric claims** anywhere in its repo. Its efficacy is entirely asserted.

---

## 3. Where foreman already beats it

- **Evidence.** Foreman's claims are benchmarked; the reference tool's are not measured at all. Foreman's memo records refuted levers (XML-vs-prose NULL, `output_format`-omit declined on 0.16.0 evidence) — the reference tool has no mechanism for discovering it was wrong.
- **Cut discipline.** Foreman maintains an explicit deliberate-cuts list with reasons (D1's ~100k-token root cause; B8 no stored `priority`; B9 no stored `blocked`, derived at read time per `roadmap-schema.md:70-75`). The reference tool ships four installers frozen at first-install because the fix for exactly that bug exists in its own repo, unapplied.
- **Single sanctioned access path.** `roadmap-schema.md:12-27` plus `hooks/guard-roadmap-edit.js` gives foreman one mediated writer with atomic write + parse-after-write (`:38-51`), append-only `notes` (`:181-184`, `:214-215`), grow-only `commits`/`touches` (`:177-196`). The reference tool writes `~/.claude/settings.json` with a plain `writeFile` and no read-modify-write protection — a malformed settings file is silently replaced by only its own hooks.
- **Honest documentation.** Foreman's public-docs rule (committed as `.claude/rules/public-docs.md`) keeps methodology out of user-facing text. The reference tool's README contains a table framed as exhaustive ("every file codekeel reads or writes") that omits its own HEAD-commit headline feature, and a commands table missing four shipped subcommands.
- **No uninstall path** exists in the reference tool at all. Foreman is a plugin; removal is the marketplace's job.

---

## 4. ADOPT — ranked by value/effort

### A1. Validate `depends_on` ids at `add` — value **high**, effort **small**

**Mechanism.** A dependency edge is a trust boundary; the graph's meaning requires every referenced id to resolve. One write path validates, the other — the one that creates most edges — does not. Apply the same existence check at both.

**Smallest form.** In `cmdAdd`, after `const entries = readEntries(root);` (`scripts/roadmap.js:116`) and before `nextId` (`:117`), three lines:

```js
const deps = Array.isArray(depends_on) ? depends_on : [];
const knownIds = new Set(entries.map((e) => e.id));
const unknown = deps.filter((dep) => !knownIds.has(dep));
if (unknown.length) throw new Error(`unknown depends_on id(s): ${unknown.join(", ")}`);
```

then use `deps` at `:126`. **No helper extraction, no self-check, no cycle check.** `id` comes from `nextId(entries)` (`:117`) and is never caller-supplied, so the new id is not yet in `entries` — self-reference is subsumed by the existence check — and no entry can reference it, so `reaches()` (`:225-237`) can never fire. The comment at `:255-256` already documents exactly this invariant. Leave `cmdUpdateDeps` untouched; do not share one line between two callers.

Supporting one-liners: a test beside `tests/roadmap.test.js:77-82` (`add` with `depends_on:["099"]` exits 1, matches `/unknown depends_on id/`); `roadmap-schema.md:117` gains "rejects `depends_on` ids that don't exist yet", closing the doc asymmetry with `:120`; `skills/init/SKILL.md:133-135` gains one clause — a drafted task may only depend on a task drafted above it, since entries are written in order (`:161-165`).

**Not scope drift.** Pillar 2, ROADMAP.jsonl integrity, no new concept, no new file, no new question, zero per-session tokens. Direct in-house precedent: memo `project_foreman_state.md:156-158` records the 0.7.x cycle guard shipping for the identical "permanently unblockable, silently" failure. It is validation at a trust boundary with a data-integrity consequence — the never-cut category.

**Explicitly excluded:** no sorting/two-pass add loop in init, no warning-instead-of-throw mode, no `next-candidates` reporting change.

---

### A2. Add `remove_depends_on` to `update-deps` — value **medium**, effort **tiny**

**Mechanism.** An edge that can only be added is a one-way trap. Removal is monotone in the safe direction (it cannot create a cycle) so it needs no new guard.

**Smallest form.** `cmdUpdateDeps` (`scripts/roadmap.js:243-270`): accept `{id, add_depends_on?, remove_depends_on?}`, require at least one non-empty array (relaxing `:245-247`, keeping the existing error text for the both-absent case), apply removals as a filter on `entry.depends_on` before additions, leave the unknown-id/self/cycle guards (`:251-262`) governing additions only. Removing an absent id is a no-op, matching the dedup-on-insert spirit at `:265`. One clause on `roadmap-schema.md:120`, one line at `USAGE:490`, tests beside `tests/roadmap.test.js:256-316`.

**Not scope drift.** No new subcommand, no new field, no schema growth, no skill branch. It is the recovery path A1 makes rare but does not make impossible (an entry whose dependency is later `dropped`). With it, "re-scope an entry" composes from three existing calls — `add`, `update-deps`, `update-status dropped` — which is why the `supersede` subcommand is rejected below.

---

### A3. Fold the picked candidate's own `notes` into the handoff prompt — value **medium**, effort **tiny**

**Mechanism.** The read path already carries the data one step short of the prompt.

**Smallest form.** Two lines in `skills/roadmap/SKILL.md`'s craft field map (~`:187-191`), **no script change**: after the `background`/`context` ← `what` line, add — when the picked candidate's `notes` is non-empty, fold it into `background`/`context` as prior recorded findings on this entry, attributed as such, same as the Resume variant already does at `:242-251`.

**Why it's free.** `cmdNextCandidates` already emits `notes` on every candidate (`scripts/roadmap.js:373`) and every `in_progress` entry (`:399`); `skills/roadmap/SKILL.md:79-80` already declares those fields crafting input. The payload does not grow by one byte. This closes the loop `skills/survey/SKILL.md:134-135` already assumes exists (survey's `annotate` evidence reaching the next handoff) and the defer trigger at `skills/roadmap/SKILL.md:127`.

**Not scope drift.** Prose edit inside an existing field map, no investigation, no write, no schema field.

---

### A4. Merge `.foreman/config.json` on init instead of replacing it — value **medium**, effort **tiny**

**Mechanism.** An installer that writes a file it does not exclusively own must read-modify-write the keys it owns and preserve the rest.

**Smallest form.** Replace `skills/init/SKILL.md` write-phase step 3 (`:169-172`, verified: a flat six-key literal with no read step) with: write the six Call-2 answers; if the file already exists, `Read` it first and set those six keys on the parsed object — **any other key present must survive untouched** (today that means `customSections`, which no skill ever writes); if it exists but won't parse, write the six keys alone and say so in the report-back (`:177-178` already exists as the free surface for that). `Read` is already in `allowed-tools` (`:6`).

**Two things the edit must carry.** (a) The merge applies whenever the file exists, not only on the Overwrite branch — the pre-check is gated on `ROADMAP.jsonl` existing (`:27`), so a project with a config but no roadmap gets **no pre-check question at all** and step 3 replaces the file unguarded. (b) Write "any other key present", not a `customSections` whitelist, so the next config key is covered without a second edit.

**Not scope drift.** Pillar-1 install safety, no new key, no new question, no script. Known weakness: this is prose steering an LLM and there is no `tests/init.test.js` — value is "usually preserved", not "guaranteed". Do not oversell in the CHANGELOG.

---

### A5. Warn when `.foreman/config.json` exists but fails to parse — value **medium**, effort **tiny**

**Mechanism.** Fail-soft is right; fail-silent is not. Route the parse failure into the warnings channel that already exists.

**Smallest form.** `scripts/render-sections.js:28-34` — verified as `try { return JSON.parse(...) || {} } catch { return {} }`, swallowing ENOENT and SyntaxError identically. Change `readConfig` to return `{config, warning}`: `err.code === "ENOENT"` → `{config:{}, warning:null}`; anything else → a warning naming that every setting, including ones foreman's hooks read, fell back to its default. Thread into the existing `warnings` array at `render()` (`:155-159`) beside the `targetModel` warning (`:43-53` — the precedent this extends).

**Why it matters more than stated.** Under a corrupt file `usePersona` reverts to `true` (`:21-23`) **and** `scripts/check-prompt.js:11` imports the same `render()`, so the gate validates against the wrong `usePersona` and passes a persona-opening prompt in a `usePersona:false` project. The one gate that would catch it is the code path that lost the setting.

**Ceiling to mark.** A `razor:` comment: the two hook-side readers (`hooks/post-commit.js:113-124`, `hooks/task-completed.js:62-71`) keep swallowing their own parse errors because those events have no user-visible warning channel; the resolver warning is the detection path, which is why its text names them.

**Explicitly dropped:** the `KNOWN_KEYS` unknown-key allowlist. It hard-codes a copy of a key surface spanning three files with no runtime source of truth — the exact drift `scripts/check-prompt.js:79-93` was built to avoid ("no second copy to drift", pinned by `tests/check_prompt.test.js:291`) — and no typo'd key has ever been observed. Reopen only on a real trace, same standard as parked entries 074/075.

---

### A6. Snapshot the roadmap before init's Overwrite truncation — value **medium**, effort **tiny**

**Mechanism.** Where the artifact is git-tracked, make the destruction recoverable rather than forbidden.

**Smallest form.** `skills/init/SKILL.md` write-phase step 1 (`:158-160`, verified: `> ROADMAP.jsonl` with no guard): before clearing, run `git commit -m "chore: snapshot roadmap before foreman re-init" -- ROADMAP.jsonl`. **Pathspec form, not `git add` + commit** — the Overwrite branch runs in an established project where staged changes are likely, and a bare `git add && git commit` would sweep the user's unrelated staged work into a commit titled "snapshot roadmap". `:175` already states the intent ("Only the files this skill wrote — never a broader `git add`"); the pathspec is the form that guarantees it. A non-zero exit is fine and expected (no repo, nothing to commit, a rejecting pre-commit hook) — but **say which happened in one clause of the report-back**, because it is the difference between "your old roadmap is in git" and "it is gone". Also extend the Overwrite option's description at `:31` to say it discards `done` entries and their accumulated notes.

**Why the loss is real.** `skills/init/SKILL.md:174` is the *only* `git commit` in the entire plugin. Every later write leaves the file dirty by construction: `prompt-template.md:108-123` closes entries with a sha *after* the commit exists, and `hooks/post-commit.js:142-188` drives more writes on PostToolUse of a completed commit. So the roadmap's newest state is never inside the commit it describes, and `git checkout` recovers at best the seed init wrote.

**Not scope drift.** Error handling that prevents data loss, at the one place foreman deletes user data. One markdown line in a branch that already exists. Do **not** fold in the separate finding that `:174` has the same index-sweep shape — flag it separately.

---

### A7. Date-stamp each appended note — value **medium**, effort **small**

**Mechanism.** An append-only field joined by a bare separator collapses N sessions into one run-on string; `updated_at` says the entry moved, never which note moved it.

**Smallest form.** One helper in `scripts/roadmap.js`, called from both existing append sites (verified verbatim-duplicated at `:183` and `:215`):

```js
function appendNote(existing, note) {
  const line = `${today()} ${note}`;
  return existing ? `${existing}\n${line}` : line;
}
```

`today()` already exists at `:66-70`. **Part of the same diff, not a knock-on:** drop the now-duplicated hand-written date from the three skill lines that would double-stamp — `skills/survey/SKILL.md:124`, `:129` (`"survey <date>: <one-line evidence>"`), and `skills/roadmap/SKILL.md:296` (`` (<date>) ``). Docs: `roadmap-schema.md:46`. Tests: `tests/roadmap.test.js:128` and `:224` pin `'first; second'` and must become date-aware; `:234` `'only note'` becomes the stamped single-line form; add one assertion that a newline-containing note round-trips as exactly one JSONL line.

**Verified safe.** `writeEntries` (`:40`) uses `JSON.stringify`, so an embedded `\n` escapes and the one-line-per-entry + parse-after-write invariants (`:51`) both hold. `NOTES_APPEND_WARN_CHARS` (`:88`) measures the *incoming* argument (`:199`, `:218`), never the stored field, so it is unaffected outright. `check-duplicate` scores `title`/`why` only (`:442-457`) — untouched.

**Two corrections to carry into the rationale.** (1) The `hintScore` effect is that `2026` enters every entry's word set — `normalizeWords` (`:417-425`) splits on non-alphanumerics *before* the `length > 2` filter, so `2026-07-21` yields `2026`/`07`/`21` and only `2026` survives — and it is inert because a token present in all candidates is a uniform offset that cannot reorder the sort at `:375-384`. Not "one long numeric token that can't be matched". (2) Existing `; `-joined history is left as-is; no migration.

**Verify list, in priority order:** (a) an AskUserQuestion preview built from a newline-containing notes excerpt still renders (`skills/roadmap/SKILL.md:93`, `:118`); (b) the resume path folding prior notes into `background`/`context` (`:249`) still passes `check-prompt.js`; (c) the background-agent marker parse (`:134-145`) still finds `` a<16 hex> `` across a line break.

**Evidence it's needed, from the user's own file:** live `ROADMAP.jsonl` has 42 of 67 entries carrying a `YYYY-MM-DD` in notes and 25 without — the writer convention exists in three skill lines and demonstrably does not hold. Entry 064's notes run 5060 chars and open `House rules: ...; dispatched to background agent \`a278a79f3ad04f06c\` (2026-07-17); Built /hush:stats: ...` — three sessions welded together with `; ` as the only boundary.

---

### A8. Wire the dead `warnings` channel on `add` — value **medium**, effort **tiny**

**Mechanism.** A warning nobody is told to read is not a warning.

**Smallest form.** `skills/roadmap/SKILL.md:326-327` — extend Add-a-task step 3 to report the new id and title *and* surface any `warnings` the response carries, verbatim, in one line. `skills/init/SKILL.md:163-167` — one clause on the looped `add` step: if calls return `warnings`, mention them once at the end rather than per-entry (init writes 3-8 in a row).

**Why.** `cmdAdd` produces `fieldWarnings` at `:135-139` and `warnings` appears exactly once across all four skills — `skills/roadmap/SKILL.md:64`, which is the Pick branch's `next-candidates` call, not `add`. The channel is already dead on this path; anything else added to it changes no outcome until this lands. Ship independently of A9.

---

### A9. Duplicate check before `add` in the Add-a-task branch — value **medium**, effort **tiny**

**Mechanism.** Pre-ask, not post-write — the same shape the discovery path already uses.

**Smallest form.** `skills/roadmap/SKILL.md`, between step 1 (gather) and step 2 (add): run `check-duplicate` over stdin; on a match, name the existing id/title/status in one line and ask (`Add it anyway` / `Never mind`); a `rejected` match means the user already declined this. No match → add without comment. **No script change.**

**Why pre-ask, not a `cmdAdd` warning.** There is no `remove`/`delete` subcommand — `add` is irreversible, `title`/`why`/`what` are immutable, and the only exit is `update-status dropped`, which leaves the row in the file forever. A post-write duplicate warning hands the user a fact with no available response. `cmdAdd`'s existing length warnings are not a precedent: an over-long `why` is fixable in the same breath (`roadmap-schema.md:103-105`); a duplicate is not.

**Scope fence, all three deliberate.** (a) Do not touch `cmdAdd`. (b) Do not wire it into init's write loop — the draft is a batch of intentional siblings the user already approved at Call 3 (`skills/init/SKILL.md:146-152`), and the shipped constants false-positive on exactly that shape (measured on `normalizeWords`/`jaccard`/`DUPLICATE_THRESHOLD 0.4`: "Add user authentication"/"Add user profile page" = 0.43; "Set up CI pipeline"/"Set up deploy pipeline" = 0.45 — 2 spurious warnings on a plausible 6-entry draft). (c) Do not touch `<scope_discipline>`'s `add` (`prompt-template.md:108-123`) — that path runs in sessions with no user to ask, and `hooks/post-commit.js:223-225` already establishes that rule. Leave `discoveryBlock()` as-is; the two then share a shape rather than one shadowing the other.

---

### A10. Inline the planned titles into the discovery block — value **medium**, effort **tiny**

**Mechanism.** Semantic suppression in the instruction (quality) layered over the existing mechanical check (correctness). Jaccard at 0.4 over `title + why` (`scripts/roadmap.js:435`, `:445-451`, ≤2-char words dropped at `:423`) cannot catch a paraphrase; the negative list can.

**Smallest form.** `hooks/post-commit.js`: pass the already-read `entries` (`:242`) into `discoveryBlock()` (called with no args at `:261`) and interpolate the `planned` entries' `id ("title")` — same formatting `statusSyncBlock` already uses at `:145` — with one sentence: do not propose anything these already cover, even reworded. **Zero CLI calls.** Scope strictly to `status === "planned"` (`in_progress` already rides in the status-sync block; `deferred` is a different signal). Mark the ceiling: `// razor: whole planned list inlined; if a backlog ever makes this block dominate the hook payload, cap it or drop back to check-duplicate alone.` One assertion in `tests/post_commit.test.js`'s discovery describe (`:189`) that a planned title appears and a done/dropped one does not.

**Why not the CLI-call version.** A mandated `node roadmap.js list --status ... --summary` per successful commit contradicts the block's own standing rule 30 words away — "do NOT run extra Read/Grep/Bash calls just to enrich the entry" (`:196-198`) — and runs against the A10 cost-trim precedent. The free-data form has none of that cost.

---

## 5. RESHAPE — worth having only smaller

### R1. Stranded-entry detection → **one line in Review status, zero code**

**Original:** a `stalled`/`unreachable`/`stranded` array computed in `cmdNextCandidates`, surfaced in the Pick branch.

**Why smaller.** The Pick branch is explicitly "one mechanical call, one question, assemble, done" (`skills/roadmap/SKILL.md:46-47`), is told never to surface a blocked or non-`planned` entry (`:73-75`), and already had raw candidate JSON cut out of it (`:77-81`). Meanwhile the **Review-status branch already loads every fact needed**: `list --summary` deliberately keeps `depends_on` on every entry "so blocked-ness stays derivable" (`scripts/roadmap.js:279-282`, comment verbatim), and `skills/roadmap/SKILL.md:337-338` already instructs the model to note "which are blocked and on what". The missing thing is a *distinction*, not data.

**Two proposal claims that are false and must not ship in any doc.** (a) "Can never become `done`" — `cmdUpdateStatus` (`:164-176`) validates only the enum; there is no transition table, so `{"id":"002","status":"planned"}` un-drops the dependency in one command and the dependent is back in `candidates` on the next call. The `depends_on` grow-only invariant is real but irrelevant: the repair is on the dependency, not the edge. (b) "Invisible everywhere" — it is invisible to the *pick* flow; `list --summary` still shows it.

**Smaller form.** One sentence appended to `skills/roadmap/SKILL.md:337-339`: when a `planned` entry's blocker resolves to an entry that is `dropped`/`rejected` — or to an id that does not exist — say so explicitly rather than calling it plain "blocked"; it will not reappear in the pick list until that dependency is moved back via `update-status`, or until the dependent's edge is removed (A2). No script change, no payload change, no new test, no cost in the pick flow.

**Named upgrade path if a real trace shows this being missed:** compute the stalled set in `cmdList` under `--summary`, where the whole graph is already loaded — *not* in `cmdNextCandidates`.

**Measured base rate, which is why it stays prose:** across the flagship 67-entry `ROADMAP.jsonl` (12 entries with deps; statuses `{done:52, rejected:5, deferred:9, planned:1}`), both the dropped/rejected-dep set and the missing-id set are **empty** — zero occurrences over the plugin's entire history.

### R2. `touches` staleness false positives → **fix the contradiction in survey's own six lines**

**Original:** a `touches_missing` field plus a `git ls-files` suffix-match ladder plus a `commits[]` carve-out.

**Why smaller — three defects, two fatal.** (a) The `commits[]` gate is always false: survey only ever surveys `planned` entries (`skills/survey/SKILL.md:31`; `scripts/roadmap.js:359`), `cmdAdd` hard-writes `commits: []` (`:128`), and `CREATE_STATUSES` (`:77`) forbids creating anything else — so the whole check would be an obfuscated deletion. (b) The suffix ladder fails on its own motivating example: `git ls-files` at this repo root returns 36 entries with exactly one "foreman" match — the **gitlink**, not `foreman/hooks/*` — submodule contents are not in the superproject's index. (c) `touches` is project-root-relative *by contract* (`scripts/roadmap.js:146-147` comment, `--relative` at `:152`), so a shorthand path is bad data to correct in the entry, not a resolution problem to paper over.

**Smaller form.** Documentation-only, two edits in `skills/survey/SKILL.md`. Keep the existing `test -e`/`Test-Path` loop (already free, already batched) and change what a miss *means* at `:62-64`: a missing path is a question, not a verdict — `touches` is a forward-looking best guess at `add`/`init` time and routinely names files the task will create (`skills/init/SKILL.md:136-137` says exactly this: "a brand-new project has no files to point at yet — that's fine"). Then amend the agent's check 1 at `:85-86`: a flagged-missing path is `stale-touches` only when the agent can show it once existed and moved (`git log --diff-filter=D -- <path>`, or `--follow` showing a rename); nothing found → not created yet, verdict stays `valid`, no annotate. This preserves the existing "every non-`valid` verdict must cite the file:line or commit that grounds it" rule (`:103-105`) by giving the missing-path case a citable artifact rather than exempting it.

### R3. `supersede` subcommand → **already covered by A2**

The underlying trap is real and confirmed. The proposed operation is ~5× larger than the trap requires and imports two hazards foreman engineered away: it mutates entries the caller never named (the exact class `cmdAnnotate:205-207` exists to prevent — "a breadcrumb write must not re-assert a status … which would silently regress an entry another session has since moved"; returning a `repointed` receipt is not consent), and its mint-and-inherit step breaks the stated premise at `:255-256` that `add` needs no cycle check because nothing can reference a not-yet-existing id. The `superseded_by` field also fails its own justification — "prose is not readable by `next-candidates`" is false (`notes` ships per candidate at `:373`), and a superseded entry is `dropped`, so no ranker consults it (`:359`). Ship A2; "re-scope" then composes from `add` + `update-deps` + `update-status dropped`.

### R4. Dependency-notes join → **defer behind A3**

Carrying a completed dependency's `notes` into the dependent's prompt is genuinely absent (`depends_on` ships as bare ids at `:367`, no `byId` map exists in `cmdNextCandidates`). But every `depends_on` of a surfaced candidate is `done` by construction (`:360`), so the carried text is the oldest in the payload and the likeliest to be stale — the shape the memo already measured as harmful (`project_foreman_state.md:602-610`, anchor1/haikuelab1: hard-repeating a stale path anchors the target on the decoy; "Decision: no template change"). And because `truth_grounding` (`prompt-template.md:95-106`) forces verification of every supplied claim anyway, a carried dep note cannot *save* the rediscovery read — only redirect it, and a wrong redirect costs more. Ship A3 first. If a real trace later shows a session re-deriving something a `done` dependency's `notes` already held, the smallest form is a `byId` lookup in `cmdNextCandidates` gated on a **per-dependency character cap in the script** — not in the skill, since the payload lands in the picking session's context whether or not the prompt uses it.

---

## 6. REJECTED

| Idea | Why not |
|---|---|
| Flag a candidate whose `touches` no longer exist, in the pick flow | Already exists verbatim in its sanctioned home (`skills/survey/SKILL.md:58-64`, shipped 0.10.0-alpha). The delivery surface is banned by name in the same file (`skills/roadmap/SKILL.md:107-110`: "Never fold `what`/`touches`/`notes`/`unblocks` into the description … that's `foreman:survey`'s job"). Two load-bearing code claims are wrong: the map runs over *every* unblocked entry (`:361-374`, slice at `:404`), and `collision` **is** a rank input (`:382`), so the cited "never reorders" precedent doesn't exist. Measured on live data: 0 true positives (the single `planned` entry has `touches: []`), 5 of 7 firing paths are files their entries intend to create. |
| Existence check on `relevant_files` in `check-prompt.js` | The evidence is inverted: foreman's own moved-file fixture's trap is a path that **exists and is wrong** (`benchmarks/fixtures/moved-file/prompts/foreman.md:36` cites `src/parser.js:5-17`; the file is real, the logic is in `tokenizer.js`) — `existsSync` returns true and the check emits nothing. Entry 074's own deferral trigger names the risk as a *wrong* file, not a missing one. The stated harm is contradicted by measurement (memo `:473-481`: foreman-arm sessions were "recovering fine"; the one deficit was fixed in 0.18.1 by rewording `truth_grounding`). Adding a low-precision warning to a channel whose value is precision is a net loss. |
| Free dead-scope flag on candidate `touches` | Premise false for the population it runs on: `next-candidates` returns `planned` only (`:359`), and `touches` for that population is explicitly forward-looking (`roadmap-schema.md:42`). A "create `src/auth/refresh.ts`" entry flags 100% stale on day one. Entry 038 already measured `touches` wrong on 5 of 8 files. It also deletes survey's adjudicator (the Explore agent that must cite file:line) while keeping survey's ambiguous input bit, and changes no outcome — the picker cannot investigate, cannot re-rank (by its own rule), cannot write. |
| A fourth pre-check option: re-run just the settings interview | A silent-overwrite machine — init's step 3 is a literal write, so a settings-only branch destroys `customSections`; it is non-atomic (depends on A4 landing) and A4 doesn't close it, because Call 2 Q2's *unselected* state is load-bearing (`skills/init/SKILL.md:76-78`) so re-running flips `usePersona` back to `true` and drops `"tone"` from `omitSections`. `targetModel` — the cited motivator — is already overridable per-invocation at craft-prompt Call 6 (`skills/craft-prompt/SKILL.md:154-183`, `prompt-template.md:52-56`). A3's original ground (`CHANGELOG.md:431-434`) stands. |
| `passed_over` staleness counter for candidates | The metric is a clock in disguise: `created_at` is date-only (`:66-70`, written `:129`), init writes 3-8 entries with an identical stamp, so the count ties across the founding batch and is otherwise monotone in wall-clock time. Problem statement false: an outranked candidate is sliced away at `:404` and never seen; the *final* tiebreak is oldest-first (`:383`), so the nag would fire preferentially on the entry foreman is simultaneously marking `(Recommended)`. Cannot distinguish "deliberately low priority" from "abandoned" (conceded). Breaks the Q1 description rule on a false `collision` precedent. Brushes B8. |
| Record the Execute branches of discovery | Already exists twice, better: `hooks/post-commit.js:212-220` continues past the quoted line with an inverse scan that logs-and-closes work in the same breath with a real sha and auto-derived `touches`; `prompt-template.md:108-123` `<scope_discipline>` carries the identical pattern in every assembled prompt. The proposal's version mints a `planned` entry with guessed fields and no sha. Its (b) presumes a TaskCreate row the Execute-here branch does not produce (`:207`), and its (c) misreads why `rejected` is stored (`roadmap-schema.md:65-68`: one mechanical purpose, consumed at `:199-204`; there is no learner to skew). |
| Evidence-triggered off-ramp for discovery | Already rejected as cut A3: `foreman:toggle-discovery` shipped 0.7.0-alpha and was deleted 0.9.0-alpha with the recorded reason that the setting is editable directly (`CHANGELOG.md:431-434`). The signal is *inverted*: only Add and Reject call `add` (`:206-211`), so executing every suggestion inline looks identical to rejecting everything. Its "same tmpdir dedup pattern already in the file" is once-per-entry-per-**day**, not once-per-project (`:95-101`), so the one-time latch it relies on doesn't exist. And the premise is backwards — every rejection makes discovery quieter by design. |
| Verify a `done` entry's commit sha from `next-candidates` | `git cat-file -e` tests object presence, not reachability: a rebased/squashed commit survives in the reflog on the machine that recorded it (the same machine), so it reports "fine" exactly where the problem exists — and on a fresh clone of any squash-merge repo it fires on ~100% of PR-landed deps. Nothing on the proposed carrier would consume it (`skills/roadmap/SKILL.md:107-112` bans it from the preview). The prose it pays for isn't deletable: survey's args path resolves ids via `list --ids` (`skills/survey/SKILL.md:30-31`) and never calls `next-candidates`. Collides with D2 (ownership, not cost — the rebuttal answers D1 only). Honest version if it ever matters: `git merge-base --is-ancestor`, one wording change at `skills/survey/SKILL.md:52`. |
| Suffix-match rescue for missing `touches` before survey flags them | Refuted by the repo it cites: `git ls-files` here lists `foreman` as a gitlink, so no tracked path ends with `/hooks/task-created.js` and rung two returns empty on the exact layout offered as justification. Contradicts the field's documented semantics (`roadmap-schema.md:42`: pre-work guess, area-level hints, `commits[]` is ground truth). Introduces a second resolution rule disagreeing with `--relative` (`:146-147`). The harm is already gated three times (cite-or-nothing `:102-105`; confirm-before-write `:109-114`; annotate-only soft signal `:127-139`). No trace, same standing trigger as entry 074. Superseded by R2. |

---

## 7. License note — AGPL-3.0

The reference clone at `D:\Projects\Knowledge\codekeel` is AGPL-3.0-or-later. Foreman is a separately-licensed plugin in a public marketplace; copying, adapting, or closely paraphrasing that source would place foreman's distribution under AGPL's copyleft **and** its §13 network-use clause.

**Forbidden, absolutely:** copying source in whole or part; transliterating a function into JS with renamed identifiers; reproducing its file/module layout or its type shapes as a schema; lifting its prose (prompt text, deny wording, README/comment text) into any foreman file; and "re-deriving" from a file open in front of you, which is adaptation regardless of how many identifiers change.

**Permitted:** ideas, mechanisms, and problem framings stated abstractly and re-derived from foreman's own code. Every ADOPT item above meets that bar with room to spare — A1 is a `Set` membership check, A2 an array filter, A3/A4/A6/A8/A9/R1/R2 are prose edits to foreman's own skills, A5 an error-code branch, A7 a two-line string helper over foreman's existing `today()`, A10 a string interpolation of foreman's own entries. None requires the reference tool to exist.

**Named and dropped for this reason:** its combined ES/CJS/Python import regex (no concrete version is statable without lifting, and foreman has no import-gating use case). Its model-rate table is likewise not lifted — the *practice* of dating a pricing snapshot is the transferable part; the numbers belong to the `claude-api` skill.

**House rule reminder:** the reference tool's name may appear only in a plugin `README.md`. None of the changes above put it anywhere, and none should.

---

## 8. "Do nothing" verdict

**Not "do nothing" — but close to it, and deliberately so.**

One change here is genuinely load-bearing and would be worth making even if this whole exercise had turned up nothing else: **A1**, validating `depends_on` at `add`. It is four lines, it closes an asymmetry between two subcommands in the same file, and the failure it prevents is unrecoverable through the sanctioned surface — no removal path, no edit path, and `guard-roadmap-edit.js` denying the hand-edit repair. Foreman's own history already priced this exact failure shape once (the 0.7.x cycle guard, memo `:156-158`). **A2** is its recovery path and is six lines. Everything after that is prose edits to files foreman already ships.

The reference tool's headline architecture — a decision ledger, a live enforcement gate, a semantic verifier, staleness review, conversation mining — is almost entirely **wrong for foreman**, and the rejected column is the honest evidence: eight substantial proposals died, four of them because the mechanism already exists in foreman in a better-gated form, three because measurement on foreman's own data showed the condition occurs zero times, and one because the reference tool's version answers a question foreman's `truth_grounding` block already answers. Foreman is not a governance product. It has no rules to enforce, no diffs to judge, and no per-edit hot path — so the ladder, the cache, the pattern-spec vocabulary, and the fail-open enforcement posture have no surface to attach to.

Three specific things should **not** be built, and the reasons are worth recording so they aren't re-litigated: nothing goes into the `next-candidates` payload or the Pick branch (that path's cost discipline is the root-caused response to ~100k tokens burned in one invocation, and every proposal that tried landed in RESHAPE or REJECTED for it); no stored `blocked`, `priority`, `superseded_by`, or any other derivable field (B8/B9 hold, and the reference tool's own two-field lifecycle is not an argument against them); and no detector that reads `touches` as if it were a reference contract, because foreman documents it as a pre-work guess and has measured it wrong on 5 of 8 files.

The measured base rates matter more than the mechanisms. Across the 67-entry flagship roadmap: zero stranded entries, zero dangling dep ids, zero dropped-with-dependents. A1 is worth building because the *consequence* is unrecoverable, not because the event is common — that is the correct standard for a trust-boundary check and the wrong standard for a reporting channel. Everything in this report that failed, failed on exactly that distinction.

---

# Completeness critic — what this analysis missed

Coverage is not complete. Concrete gaps below; all paths under `D:\Projects\Knowledge\codekeel`.

## A. Subsystems nobody read

1. **`src/hooks/scopeGate.ts` — the entire file.** Both briefs mention it only as "a hard deny wins and short-circuits" (`entrypoints.ts:204-221`). Nobody read the deny body. `buildFileTableSkeleton` (`scopeGate.ts:40-44`) emits the denial reason as a **pre-filled markdown table with the file rows already populated and the judgment columns left as `?`**, and the doc comment at `:27-38` states the reason: a prose instruction ("present this as a table") is a soft ask an agent skips under pace pressure — observed live in their own session — while a 2/3-built table converts it to fill-in-the-blanks. It also concedes the unclosed gap at `:36-38`: a PreToolUse hook sees tool calls, not chat, so it cannot verify the agent used the skeleton. This is the single most foreman-transferable mechanism in the repo and no lens pointed at it.
2. **`src/projectStateContinuity.ts` — entire file.** A committed, marker-delimited auto-maintained session history (`:13-15`, `:166-184`) that coexists with hand-written content, prunes to 10 entries, and **replaces the same-calendar-day entry rather than appending** (`:171-173`) precisely because it fires per-turn from `Stop`. Read back into `SessionStart` at `:228-232`.
3. **`src/markerBlock.ts`** — content-hash-inside-the-block idempotent upsert (`:8`, `:24-32`). Doc at `:15-23` names the failure it fixes: a plain "does the marker exist" check freezes a generated block forever at first install.
4. **`src/hooks/turnState.ts`** — per-turn state file keyed by `session_id`, with warn-once-per-signal suppression (`:24-27`, `:71-86`) that is per-*signal* and per-*path*, not per-content.
5. **`src/importConventionMining.ts`** — a second, free, deterministic AST candidate source (zero LLM). Zero-tolerance rather than majority-rules (`:91-97`), scoped by monorepo top segment (`:77-82`), and — see B4 — **groups N near-duplicate candidates into one** (`:99-108`).
6. **`src/settingsStore.ts`** — per-tool enable/disable with exactly one opt-in-only tool and the privacy rationale for why (`:32-38`).
7. **The detached periodic-check cadence** — staleness/mining do not run inline; they run on an N-sessions-or-N-days cadence (`learningStore.ts:443-447`) in a background pass that replaces only the suggestion ids it owns (`:449-454`), driven from `entrypoints.ts:440-526`.
8. **Adaptive thresholds** — `learningStore.ts:404-422` keeps a rolling cross-session footprint sample per project and derives the live gate threshold from its median, falling back to a fixed floor until `MIN_SAMPLES_FOR_BASELINE`. Mirrored retrospectively at `stats/scopeCreep.ts:59`.

## B. Ideas nobody proposed (every lens pointed at data hygiene, none at payload shape or self-calibration)

All 15 survivors and 9 rejects concern roadmap *data* — dependencies, staleness, dedup. Missing entirely:

1. **Ship the half-built artifact instead of instructing for it** (`scopeGate.ts:40-44`). Wherever foreman asks the agent to produce structure (survey findings, handoff prompt sections, the execution-mode task split), hand over the skeleton pre-populated with what the script already knows.
2. **Learn a threshold from the project's own history** (`learningStore.ts:418-422`). Every proposal on the list is a fixed rule. Nothing proposed foreman calibrating anything (candidate-count, touch-collision width, staleness age) against its own accumulated roadmap history, with a floor until enough samples exist.
3. **Redact before persisting prompt-derived text** (`projectStateContinuity.ts:25-56`): named-prefix credential patterns plus unconditional email redaction, explicitly because the file gets committed, with an honest "best-effort net, not a guarantee" at `:28-30`.
4. **Collapse N near-duplicate candidates into one grouped proposal** (`importConventionMining.ts:99-108`). The survivor list has pairwise duplicate *warning*; grouping is different and the reference tool documents it as a real dogfooding failure — seven single-symbol candidates read as noise where one grouped candidate read as a decision.
5. **Content-hash idempotent re-render of a generated block inside a user-owned file** (`markerBlock.ts:24-32`) — directly relevant to any foreman block written into a README/CLAUDE.md/PROJECT_STATE.
6. **Warn-once-per-signal within a unit of work** (`turnState.ts:24-27`) — orthogonal to dedup-by-content, and the correct shape for a repeated foreman nudge.

## C. Claims taken at face value that the code refutes

1. **"dead-scope — free, deterministic, always correct" (brief §7 / §10 / M10) is false.** `findDeadScopeEntries` (`driftLedger.ts:114-117`) enumerates the project through `walkTypeScriptFiles` (`stats/functionInventory.ts:56-73`), which yields **only `.ts`/`.tsx`** and **excludes `*.test.ts(x)`** (`:12`, `SKIP_FILE_PATTERN`). Consequences the fan-out missed: any non-TypeScript project has *every* entry flagged dead-scope; and **three of the six shipped starter entries are permanently dead-scope by construction** — `**/migrations/**` (`ledgerStarterPack.ts:67`), `**/.env*` (`:101`), and `**/*.test.*` / `**/tests/**` (`:79`). The tool trips its own staleness detector with its own seed data on the first periodic check.
2. **M12's "the loop closes without a separate cleanup step" is only two-thirds true.** Only `retire` (`index.ts:277`) and `confirm-active` (`:296`) clear a pending stale review. The slash command's third documented choice — *leave it* — has no clearing command anywhere (`grep pendingStaleReviews` returns no other mutator). Combined with `findStaleEntries` skipping already-flagged ids (`stalenessReview.ts:45`), an entry the user deliberately leaves alone becomes a **permanent, unclearable nag** in `review-stale` and in the SessionStart count at `entrypoints.ts:393`.
3. **"Position-derived ids can never be reused because nothing is ever deleted" is necessary but not sufficient.** `nextEntryId` (`driftLedgerCommand.ts:223-226`) is `existing.length + 1` over a **git-tracked** file. Two branches each adding one entry both mint the same `D-00N`, and nothing validates uniqueness — `isDecisionRecord` (`driftLedger.ts:43-54`) checks field presence only. `supersedeEntry`'s `e.id === id` map then hits both rows.
4. **A settings toggle that gates nothing.** `semanticEnforcement` is a declared `ToolId` (`settingsStore.ts:17`) with a user-facing label (`:48`) offered in the interactive multiselect (`index.ts:45`), and `isToolEnabled(settings, "semanticEnforcement")` is **never called** — the full `isToolEnabled` grep shows consumers for all eight other ids and none for this one. Turning off semantic enforcement changes nothing; the PreToolUse path never loads settings. Likewise `driftLedger` gates only slash-command installation (`installLedgerCommand.ts:23`) — disabled, the ledger still injects at SessionStart (`driftLedger.ts:126-132`) and still denies edits.

## D. Risks to foreman nobody named

1. **Language-coupled enumeration.** The survivor "Resolve a `touches` path before calling it stale — a suffix ladder plus a not-yet-created carve-out" inherits C1 exactly if it enumerates the repo with a typed walker. Foreman roadmaps touch `.md`, `.json`, `.jsonl`, `SKILL.md`, hook `.js`. Enumerate via `git ls-files` or an untyped walk; a suffix ladder over a wrong file set is still wrong.
2. **Self-inflicted flagging.** `foreman:init` drafts the initial roadmap entries; those seeded entries will be the first things foreman's own survey/staleness pass flags — the starter-pack failure in C1, reproduced.
3. **No terminal "acknowledged, stop asking" state.** C2 is the failure mode for the survivor "Report permanently-unreachable entries from next-candidates" and for survey persisting findings back into ROADMAP.jsonl: without an explicit dismissed/acknowledged state distinct from resolved, a correct-but-unactioned finding re-surfaces forever and trains the user to skim past the whole report.
4. **Prompt-text leak into a committed file.** Foreman writes conversation-derived entry text and handoff prompts into a git-tracked ROADMAP.jsonl. No redaction exists anywhere in foreman, and nothing on the survivor list proposes any. The reference tool treats this as mandatory for exactly this situation (`projectStateContinuity.ts:25-56`).
5. **Silent id collision on merge — foreman is *more* exposed than the reference tool.** C3's defect requires a git merge; JSONL merges cleanly line-by-line, so git will not raise a conflict at all. If foreman entry ids are count- or position-derived, two branches produce duplicate ids with no conflict marker, and `depends_on` / `supersede` (the proposed new subcommand) then target two rows.
6. **Config keys with no consumer.** C4 applied to `.foreman/config.json`: each init question (accept Claude-suggested entries, persona ownership, confirm-before-done) needs a grep-verifiable reader. The survivor "init must merge into an existing .foreman/config.json" makes this strictly worse — a merged-forward key that nothing reads is invisible and permanent.