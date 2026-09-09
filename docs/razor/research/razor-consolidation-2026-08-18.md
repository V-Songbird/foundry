# razor consolidation — state, dispositions, and what is left

**Date:** 2026-08-18 (audit), revised 2026-08-18 after the dispositions were
applied and 1.2.0 shipped
**Status:** ACTIVE CONTRACT. This supersedes every other document's account of what
razor has left to do. Read it before proposing, picking, or building razor work.
**Short version:** razor is at 1.3.0, in sync, pushed, CI green, suite 287. Every
free item in every tier below is built. What is left is four measurements, now
priced from a real calibration run — see §6. The port family is closed: the owner
ruled on 2026-08-20 that razor is Claude Code only, and 060 and 061 are both
dropped for good.
**Scope:** the `razor/` submodule plus the parent-repo surfaces that describe or
govern it — `ROADMAP.jsonl`, `docs/research/`, `docs/adr/`, `.claude/rules/`,
`.claude-plugin/marketplace.json`, and the session memory store.
**Method:** a 15-agent audit swept seven surfaces — shipped behaviour, the test
suite, public documents, manifests and CI, roadmap entries, local research
documents and ADRs, and the memory store — each finding re-checked by an
adversarial verifier whose default was to refute, then a completeness critic
swept for missed surfaces. 99 candidate findings, 9 refuted, 90 confirmed, 5
added by the critic. Fixes were applied and verified inline against the suite.

---

## 1. Where razor actually stands

| | |
| --- | --- |
| Version | 1.3.0, released and pushed 2026-08-18 |
| Marketplace pin | `f179555`, matching razor's HEAD — in sync, both repos pushed |
| Parent commit | `a792bcf` |
| Hooks | five events wired in `hooks.json`, eleven JS files under `razor/hooks/` — the eleventh is `lib/harness.js`, the host boundary |
| Skills | exactly one — `unused` |
| Roadmap entries | 52 mention razor: 46 done, 4 dropped, 1 rejected, 1 deferred. The one deferred entry is 160, and it is razor's only open entry |
| Test suite | 287 passing, 50 suites, ~9s. It was 183 |
| Benchmark harness | `--selftest` reports all 13 task instruments valid, free, no API spend |
| Health | `roadmap.js doctor` reports zero errors; no razor entry appears in its warnings |

The product is sound. The audit found no architectural defect and no gate that
fails open. What it found was **a broken command name, a handful of false denies,
and rot in the descriptions** — documents that finished their job and still read
as live plans, and a memory store describing a product three releases old.

Four things are deleted and are not coming back. Every document that still
describes them is now banner-marked, but if you meet them again in an older file,
they are gone: the **search meter** and its `RAZOR_SEARCH_BUDGET` setting, the
**`session-end.js`** cleanup hook (it was erasing `/razor off` on resume), the
**`razor:` deliberate-ceiling marker comment**, and **committed benchmark
records**, which ADR 0004 reversed on 2026-08-11.

---

## 2. What is left to build

**One thing: Tier 2.** Every other tier is built and released. Tier 1 shipped in
1.2.0; Tier 5 shipped with it; Tier 3's six entries were decided on 2026-08-18
and the two that survived (156, 158) shipped in 1.3.0; Tier 4's target-agnostic
half (056, 058) shipped there too. Tier 2 is four measurements, priced in §6,
each waiting on an explicit go.

### Tier 1 — defects, all fixed and released

Recorded so nobody re-reports them. Every one is in razor `4b57580` or
`b9ddafa`, released as 1.2.0.

| What was wrong | Where |
| --- | --- |
| The skill registered as `razor-unused`, so the documented `/razor:unused` resolved to nothing | `skills/unused/SKILL.md` |
| `SessionStart` never matched the `fork` source, so a forked session ran with no ladder and no ledger baseline | `hooks/hooks.json` |
| The ladder was written after four git calls that could outlast the hook's own timeout | `hooks/session-start.js` |
| `RAZOR_DISABLE=1` left the toggle alone, so `/razor on` printed a ruleset no gate would enforce | `hooks/mode-toggle.js` |
| Local paths, `file:`/`https:` specs, `go get ./...`, flag values, and `pip install --upgrade pip` all parsed as new dependencies | `hooks/dep-guard.js` |
| The test-file exemption covered `.test.js` and `.test.ts` but not `.test.tsx`, `.spec.mjs`, `_test.ts` | `hooks/import-guard.js` |
| `pyproject.toml` edits were ungated, so a modern Python project had no manifest gate at all | `hooks/manifest-guard.js` |
| A scoped `@scope/name` could never match outside an import, so it landed in the high-confidence unused bucket | `scripts/unused-deps.js` |
| The benchmark queue put every rep of one arm ahead of the other's first, biasing the published cost claim | `benchmarks/runner/run.js` |

### Tier 2 — held behind a measured batch

Each needs a batch proposed with its arms × tasks × reps and cost estimate, and
an explicit go. The standing rule is that no benchmark number reaches a README
without one.

- **Re-confirm the arm-order fix.** The queue now shuffles, and the cheapest
  honest check is the cheap subset twice in one sitting, `--arms baseline,razor`
  then `--arms razor,baseline`, comparing the per-arm gap. Roughly $1–3 on the
  small model. Until it runs, the published cost row rests on a run whose queue
  carried the bias — the direction the row points.
- **`../../shared/research/rival-idea-pass-2026-08-18.md` §5 R2 — a ladder keyed on reasoning effort.**
  Hook input carries no `model` but `effort` is readable, and a conditional
  injection on a readable signal is the only injection shape this house has
  measured as beating the cost-vs-coverage curve. Blocked by design: any
  variation in the payload is a variation on the frozen ladder, and the published
  numbers assume one payload. Costs a corpus re-run to move.
- **§8(a) — razor and foreman give opposed instructions on the same axis.**
  razor's ladder says one check is enough and do not re-verify; foreman's
  `<truth_grounding>` block says treat every claim as a hypothesis to confirm.
  Both land in the same context window, and razor injects at `SubagentStart`,
  which is exactly where foreman's background dispatch lands. Every published
  number in both harnesses is blind to it, because both run one plugin at a time
  by design. One interleaved arm on foreman's own fixtures settles it.
- **§8(c) — the subagent multiplier is unpriced.** razor injects at every
  subagent spawn and every published per-session number comes from a single-agent
  run. Nobody has measured what a fan-out actually costs.

### Tier 3 — the six post-v1 entries, all decided 2026-08-18

Their "post-v1" trigger fired the day v1 shipped, and a trigger that has already
fired is not a trigger. Each is now decided, and the decision is written into the
entry's own notes.

| Entry | Disposition |
| --- | --- |
| 150 | **Dropped.** It waited for a third authority level, and the only feature needing one was 156, which waited on 150. A deadlock, not a plan. Every shipped gate denies once and passes on retry; nothing has asked for a second behaviour. |
| 153 | **Shrunk and closed done.** Its concrete residue — the `pyproject.toml` gap and the scoped-name false positive — shipped in `4b57580`. The published capability matrix was cut from its scope: documentation, not parity. |
| 154 | **Dropped.** It proposed advisory/guarded/policy operating modes against a toggle the code and the README both call boolean by design. |
| 156 | **Built and closed** in razor `26f96f3`. The owner reversed the deferral the same day. The file budget now counts production files only and classifies the rest, so a feature shipping with its tests, a migration and a config file is never denied. The spec's "raw ceilings only as explicit repository policy" clause was rewritten to mean an explicitly set `RAZOR_FILE_BUDGET`, because 154 was dropped hours earlier. |
| 158 | **Built and closed** in razor `26f96f3`. Three tiers now, and the resolver is the project's own installed tree: a package's manifest for a command, every other manifest for a peer requirement. Also landed: type-only imports, `.vue`/`.svelte`/`.astro`/`.mdx` sources, per-workspace auditing, the project's own ignore list, `-r` requirements includes, and PEP 735 dependency groups. |
| 160 | **Still deferred**, and genuinely valuable. It is a paid batch behind its own approval. The dropped 154 was removed from its dependencies, and 156 and 158 are now done — so nothing blocks it but the money. |

### Tier 4 — the port family, half built

The owner split it: build the two halves that pay off with or without a port,
leave the two that need a target CLI named.

- **056, harness adapter — built**, razor `26f96f3`. `hooks/lib/harness.js` owns
  every piece of host I/O: payload reading, the per-event output shapes, settings
  resolution, the state directory, turn and subagent identity. `razor-lib.js`
  re-exports it, so no gate imports it directly and nothing outside the boundary
  touches stdout or fd 0. Zero behaviour change; the suite passed unmoved.
- **058, contract goldens — built**, razor `26f96f3`. `tests/contract/` holds
  thirteen fixture payloads and thirteen golden stdouts, compared byte for byte,
  plus per-scenario literals so a regenerated golden that lost its meaning still
  fails. Worth having on its own: nothing else in the suite could see a renamed
  envelope key or a lost raw-stdout channel.
- **060 (capture rig) and 061 (pilot port) — both dropped for good.** 060 went on
  2026-08-20 with hush's board; 061 followed the same day on the owner's ruling
  that **razor is Claude Code only** — no port to Gemini CLI or any other agent
  CLI, now or later. Neither is a live trigger any more: a named target CLI does
  not revive them. Re-filing needs a fresh entry with a fresh decision behind it.
  056 and 058 keep their own value and stay.

### Tier 5 — shipped in 1.2.0

**The will/won't section in razor's README.** Built as entry 249 and closed in
razor `16ba2fd`: a `## Scope` section between "Under the hood" and "Settings",
matching foreman's shape — a lead line plus a `> [!NOTE]` naming the refusals.
The same commit corrected two settings descriptions that still listed only
`package.json` and `requirements.txt` after `pyproject.toml` gating shipped.

---

## 3. What is cut, and must not be re-proposed

| Idea | Disposition |
| --- | --- |
| The search meter, in any form | **Deleted** in v1, entry 157. Zero fires across 96 validation cells, and read-side restraint fights the endorsed explore loop |
| `session-end.js` state cleanup | **Deleted** in v1. It erased `/razor off` so a resume silently re-armed razor. The 7-day sweep covers the cleanup |
| The `razor:` deliberate-ceiling marker comment | **Dropped** in 1.1.0. Any proposal resting on it is dead as written |
| Committing benchmark records | **Reversed** by ADR 0004. Run data of any kind stays on the operator's machine |
| Rewriting the ladder text | **Frozen** by owner decision. The published numbers are tied to its exact bytes; a rewrite is its own entry, after a suite that can measure it |
| Adding a real parser to police dependencies | **Refused**, by razor's own rung 5. Line-scan extraction stays until it actually misleads |
| A single-manifest-walk restructure in the import guard | **Declined** by rung 1 at v1. Elegance, not need; the failure is rare-monorepo-only and the fix risks the suppressing direction |
| Deleting the exotic-ecosystem evidence readers | **Declined** at v1. Working, tested, harmless |
| Deleting the transcript-tail turn fallback | **Declined** at v1. Still serves harnesses without `prompt_id`, and the conformance fixture is a cross-plugin contract |
| `permissionDecision: "ask"` | **Rejected.** It interrupts the user; deny-once-then-pass is the "never blocks you" promise |
| `updatedInput`, `systemMessage`, `suppressOutput`, `continue: false`, `decision: "approve"` | **Rejected**, each on its own grounds. razor never alters a call, never speaks to the user directly, never hard-stops, and never grants permission |
| `PostToolUse`, `PreCompact`, `Notification` hooks | **Rejected.** After-the-fact, redundant with the `compact` matcher, and off-mission respectively |
| A shared decision-authority model behind every gate | **Dropped** 2026-08-18, entry 150. It waited for a third authority level nothing has asked for; deny-once-then-pass is the whole contract |
| Repository policy files and advisory/guarded/policy modes | **Dropped** 2026-08-18, entry 154. Three operating modes against a toggle the code and the README both call boolean by design |
| A published capability matrix for other ecosystems | **Cut** 2026-08-18 from entry 153. Documentation, not parity, and nobody has asked for it |

---

## 4. What this pass changed

**razor, two commits, `4b57580` and `b9ddafa`.** Nine shipped defects closed, each
with a test. The suite went from 183 to 235. Full detail in the two commit
messages; the table in §2 Tier 1 is the index.

Three of those deserve a second line. The **skill rename** is the only change a
user notices immediately: `/razor:unused` is what every document has always said,
and it now resolves. The **frozen ladder is pinned by its own literals** — the
only assertion on it compared the hook's output to the production constant, which
proves delivery and nothing about content; a mutation of the rung text passed the
whole suite. And **`runHook` now fails on a non-zero exit**: every razor hook
exits 0 and says "nothing to do" by staying silent, so a crash produced exactly
the output a silence assertion wanted.

**Roadmap.** 056's `planned_touches` no longer names a file deleted in 1.0.0.
Dated annotations on 056, 058, 061, 068, 072, 149 and 159 record what has drifted
under them: deleted files, a satisfied precondition, a README section that no
longer exists, and a promise of published records that ADR 0004 forbids. No
status was changed — those are the owner's calls, and they are in §6.

**Research documents.** Seven razor-bearing documents carry a dated status banner
naming what in them is now false. Two of them read as briefs for work that had
not happened and had in fact happened; one carried an open question about where
to publish a file that never existed in any repo.

**Memory.** Rewritten — see §5 and the store itself.

**The second pass, same day — dispositions applied and 1.2.0 released.**
Everything §6 left open as the owner's call was decided under a standing "use
your own judgement" instruction, and the results are in the tiers above. Beyond
those: razor `16ba2fd` adds the README's `## Scope` section and the two
`pyproject.toml` settings descriptions; the parent's `.claude/rules/public-docs.md`
now says outright that a third-party tool a plugin recommends, detects, or
invokes is not a competitor name and is out of the reference-name rule; and the
stale `plugins/razor-codex/` fork was backed up to
`D:\Projects\Personal\Backups\claude-plugins\2026-08-18-consolidation\plugins-razor-codex\`
(39 files, verified byte-identical) then deleted, with its entry removed from
`.agents/plugins/marketplace.json`. razor 1.2.0 is pinned at `16ba2fd` in the
marketplace and both repos are pushed; CI green.

**The third pass, same day — the free half of the backlog built, 1.3.0 out.**
The owner asked for every pending razor task, with money escalated rather than
spent. Built and released: 056 and 058 (see Tier 4), 156 and 158 (see Tier 3),
and entry 251 — the benchmark harness now defaults to the mid model and its
large-model id no longer names the previous generation, so that arm resolves for
the first time. Suite 235 → 287. One calibration run was approved and spent:
eight cells, two tasks across both models, **$1.68 total**, giving the real
per-session prices the measurement quotes in §6 rest on.

**Now changed after all.** `scripts/git-hooks/check-reference-names.js` carried
its records-exemption comment with the superseded committed-records rationale.
`check-reference-names.test.js` asserts the parent copy is byte-identical to all
three plugins' copies, so it could never land in razor alone — it was corrected
in all four copies on 2026-08-18 and they are identical again.

---

## 5. Traps a new session must know

1. **The ladder in `razor-lib.js` is frozen.** Its exact bytes back the published
   benchmark numbers. `tests/injection.test.js` now pins the seven rungs by their
   own literals, so a drift fails the suite rather than shipping.
2. **`benchmarks/razor/records/` does not exist and must not be created.** ADR
   0004: run data stays local. A run writes `results.json` and `summary.json`
   into the run directory it prints, under the system temp dir.
3. **The published numbers can no longer be re-derived from the repo.** 1.1.3
   deleted the frozen records. `108` is the nine dependency tasks × twelve reps;
   the hero's `72` is those same nine on the small model only. Regenerating any
   figure is a paid re-run.
4. **`ROADMAP.jsonl` is written only through `foreman/scripts/roadmap.js`.** A
   guard hook blocks `Edit` and `Write`, and direct writes corrupt id computation.
5. **`planned_touches` paths are parent-root-relative** — `razor/hooks/x.js`, not
   `hooks/x.js`. The submodule-relative form resolves as missing and silently
   disables the collision check.
6. **Any commit inside `razor/` moves it off its pinned `source.sha`.** The
   parent's pre-commit blocks bumping the pointer without a matching `version`
   bump. Working ahead of the pin is the normal state between releases.
7. **`tests/evidence.test.js` pins shipped prose.** Deny-message wording is
   asserted literally. Any edit to user-visible hook text must run the suite.
8. **A hook that crashes exits non-zero and now fails its test.** Do not "fix" a
   new failure by loosening `runHook` — that check is the reason a silence
   assertion means anything.
9. **Every hook's exact stdout is pinned by a golden.** `tests/contract/golden/`
   is compared byte for byte. Change any user-visible hook text and that suite
   fails first — which is the point. Regenerate with
   `node tests/contract.test.js --update` and read the diff; a golden that moved
   for a reason you cannot name is the bug.
10. **The contract suite builds its fixture projects inside the plugin root**,
    under `contract-ws-*/` (gitignored, cleaned up after). Not in the system temp
    dir, because the file meter deliberately exempts temp paths as scratch — a
    fixture project built there can never exercise the new-file budget at all.
    That cost an hour once; do not "tidy" it back into `os.tmpdir()`.
11. **Host I/O lives in `hooks/lib/harness.js` and nowhere else.** No gate reads
    fd 0 or writes stdout. Adding a hook means calling `emitContext`/`emitDeny`,
    not writing an envelope by hand — the raw-stdout-versus-envelope asymmetry
    is encoded there once.
12. **`plugins/razor-codex/` is gone.** It was a stale local fork predating 1.0.0
   that still shipped `search-meter.js` and `session-end.js`, and it misled any
   agent that grepped the tree. Backed up on 2026-08-18 to
   `D:\Projects\Personal\Backups\claude-plugins\2026-08-18-consolidation\plugins-razor-codex\`
   and deleted; its `.agents/plugins/marketplace.json` entry is removed.
   `plugins/foreman-codex/` is untouched — different plugin, not this audit's
   scope. The port notes under `docs/codex/razor/` are also July-vintage and
   drifted; treat them the same way as Tier 4's specs.

---

## 6. What is still open — four priced measurements

Everything free was built on 2026-08-18. What remains costs money, and it is
priced now rather than guessed: the calibration run in §4 measured **$0.165 per
session on the mid model and $0.255 on the large one**, over two tasks, both
arms, both models, in one interleaved batch.

The default subset is six tasks × two arms × two reps = 24 cells per pass, and
its coding tasks run longer than the two calibrated ones, so the working figure
below is ~$0.25 per mid-model session and ~$0.38 per large-model one.

| Measurement | Shape | Estimate |
| --- | --- | --- |
| Arm-order recheck | The default subset twice in one sitting, `--arms baseline,razor` then reversed, mid model. 48 cells | **~$12** |
| ~~razor vs foreman clash~~ **RUN 2026-08-21, $2.00 — no clash. See §7.** | One interleaved arm on foreman's own three fixtures, both arms, two reps, mid model. 12 cells | **~$4** |
| Subagent fan-out price | Needs a fan-out task added to the harness first (free). One task, two arms, three reps, both models, and a fan-out session costs several times a single-agent one. 12 cells | **~$12** |
| Effort-keyed ladder | Only meaningful bundled with a full corpus re-run: 13 tasks × 2 arms × 3 reps × 2 models = 156 cells, and twice over for before-and-after | **~$96** |

**All four: roughly $125. The first three: roughly $28.** Two of the four are now
spent and closed — the arm-order recheck on 2026-08-19 and the razor-vs-foreman
clash on 2026-08-21. What is left is the subagent fan-out price and the
effort-keyed ladder, and §7 records why the second one just got harder to justify.

The arm-order recheck is still the one with a live consequence — until it runs,
the README's cost row rests on a run whose queue carried the bias, in the
direction the row points. Note that a full corpus re-run also buys the gen-5
relabel: the published tables are Haiku and Sonnet, and one corpus pass (~$48)
would make them the mid and large models instead. **Since 2026-08-18 that pass is
sonnet + opus, not haiku** — the owner retired Haiku as a test model across all
three plugins, and `benchmarks/runner/run.js`'s `MODELS` map no longer lists it.

**Nothing else is open.** The port entries that used to sit here — 060 and 061 —
are both dropped for good as of 2026-08-20: razor is Claude Code only. See Tier 4.

**FIXED 2026-08-21 at razor `acea219`, pushed.** The marketplace template on
`main` already carried the corrected header, so razor's copy was taken from it
verbatim: `razor/scripts/git-hooks/pre-commit` and
`scripts/git-hooks/plugin-pre-commit-template.js` are byte-identical again, and
the header now reads true from either end of the copy. Comment only, no
behaviour change; suite 287/287 before and after. The history below is kept
because two earlier revisions of this section claimed a fix that had not landed:
`852ba63` was never an object in razor's repository, and `0743ed1` still sits on
the unmerged `worktree-hush-final` branch. Neither was the file that mattered.

`razor/scripts/git-hooks/pre-commit` opened by calling itself the *canonical
source* for the hook every plugin installs. It was not. The canonical file is
`scripts/git-hooks/plugin-pre-commit-template.js` in the marketplace repo, and
razor's was an installed copy like every other — so anyone who read that
docstring and edited razor's copy edited the wrong file, and the edit would be
overwritten the next time the template was copied out.

**The cause was not a missed edit in razor.** razor's copy was byte-identical to
the template, header included, and the template's own header was written from the
template's point of view, so every faithful copy carried a false first sentence.
hush's copy was hand-corrected at hush `f86fa04` and **foreman's was re-checked on
2026-08-20 and already said the right thing** — which fixed the symptom twice and
left the cause once.

**The fix, when it lands.** Write the header from neither end of the copy, so it
reads true as the template and true as an installed copy, and keep razor's copy
byte-identical to the template. Comment only, no behaviour change. The wording is
already drafted on `worktree-hush-final` — take it from `0743ed1` rather than
re-inventing it, apply it to `scripts/git-hooks/plugin-pre-commit-template.js` on
`main` and to `razor/scripts/git-hooks/pre-commit`, and commit razor's half in
razor. foreman's and hush's headers are already accurate and stay alone rather
than being churned — aligning all three would make a byte-identity test possible,
which is a separate tidy nobody has asked for.

State when last checked (2026-08-21): razor suite **287/287**; `scripts/git-hooks`
58 passing, 1 skipped. **razor 1.3.1 is released and pushed** — razor `2ba955b`,
marketplace `1c2c222`, pin and version bumped together, both CIs green.

### The parent's CI is red, and razor is not the cause

`check-reference-names.js` is mirrored byte-for-byte into all four repos and a
test asserts it. The corrected records-exemption comment landed in the parent
and in all three submodule **working trees** — but CI checks out each submodule
at its **pinned** commit, and foreman and hush are both unreleased, so their
pinned copies still carry the superseded text. razor's pin has the correction;
theirs do not. Locally all four are identical and the parent's 59 gate tests
pass; on `main` the mirrored-copies test fails for foreman and hush.

Two ways out, and only one of them is honest:

- **Release foreman and hush.** hush's two unreleased commits are housekeeping.
  foreman's five include the lesson-ledger build, whose own entry 246 is
  `awaiting_acceptance` on batch spend — so this is the owner's call, not a
  mechanical bump.
- **Back the comment out of the parent and razor.** Tried and reverted: it
  turns CI green by reinstating a comment that contradicts ADR 0004, and it
  makes the local four-copy check fail instead. Not worth it for a comment.

Left red on purpose. The red is telling the truth about an incomplete
cross-plugin change, and the fix is a release decision.

---

## 7. Two measurements, 2026-08-21 — $6.54 spent against $12 approved

Both were approved by the owner as named line items, at ~$8 and ~$4. Both came
in under. Run data stays local per ADR 0004; nothing here reached a README.

### 7.1 The rung-4 defect no longer reproduces — $4.54

Run `20260820-231500`: 3 tasks × 2 arms × 3 reps × sonnet + opus = 36 cells,
$4.54, zero errored cells, CLI **2.1.238**.

The arms were chosen so the answer could be attributed. `razor` carried the
ladder with rung 4 rewritten to read *"Native platform feature does it? Use the
platform — name the built-in that covers it before hand-writing a parser,
encoder, formatter, or id."* `oldladder` was a detached worktree at `acea219` —
the released ladder, byte for byte. Both arms were confirmed loaded: every
transcript carries `RAZOR ACTIVE`, and only the razor arm's carries the new
clause.

**The released ladder writes the one-liner by itself now.** Median LOC, and the
same figure from the published run for comparison:

| task | model | oldladder | rewritten rung 4 | published 2026-08-19 |
| --- | --- | --- | --- | --- |
| dep-querystring | sonnet | 3 (1,3,3) | **1** (1,1,1) | 15 |
| dep-querystring | opus | 1 (1,1,1) | 1 (1,1,1) | 25 |
| dep-http | sonnet | 2 (2,2,2) | 2 (2,2,2) | 16 |
| dep-http | opus | 3 (3,3,3) | 3 (3,3,3) | 5 |
| dep-slug | sonnet | 4 (5,4,4) | 4 (4,4,4) | 4 |
| dep-slug | opus | 1 (1,1,1) | 1 (1,1,1) | 4 |

`dep-querystring` and `dep-http` now produce
`Object.fromEntries(new URLSearchParams(qs))` and `await fetch(url)` under the
**released** ladder, on both models. The 15/25-line hand-rolled parser that the
2026-08-19 run recorded is gone from the environment, not from the ruleset:
nothing in razor changed between the two runs, and the CLI moved 2.1.235 →
2.1.238 with the same two model ids. `dep-slug` was carried as a regression
guard — no built-in exists for it — and neither arm moved.

**Disposition: the rung-4 rewrite was reverted, and razor's tree is clean.**
The only cell that favoured it is `dep-querystring` on sonnet, 1,1,1 against
1,3,3, which is a two-line difference at n=3. The ladder is frozen and the
published numbers are tied to its bytes; that is not enough to unfreeze it.
Buying certainty means reps, not wording: the same three tasks at 8+ reps per
cell would cost roughly $15 and would settle whether the wording holds the
sonnet cell at 1.

**The implication nobody asked for but should know.** The README's LOC table
was measured on 2026-08-19 and its absolute numbers no longer reproduce — the
gap the README honestly reports as a loss has narrowed on the razor side
without any change to razor. The published claims about correctness, safety and
installs are unaffected. Re-measuring is a paid corpus run and an owner
decision, not a correction to make quietly.

### 7.2 razor and foreman do not clash — $2.00

§8(a) of the rival-idea pass claimed a live risk: razor's ladder says *one check
is enough … don't re-verify*, foreman's handoff prompt mandates a verification
command, and both land in the same context window. No published number in
either harness could see it, because both harnesses run one plugin at a time.

A `pair` arm was added to the private foreman-handoff harness — the same
`foreman.md` prompt with razor alone in the destination, i.e. the existing
`trio` arm minus its hush half, so any delta is attributable to razor. Run
`pair1`: 3 fixtures × 2 arms × 2 reps × sonnet = 12 cells, $2.00.

| arm | pass | verification ran | scope violations | reads before first edit | output tokens | $/run |
| --- | --- | --- | --- | --- | --- | --- |
| foreman | 6/6 | **6/6** | 0 | 3.5 | 968 | $0.1796 |
| pair (+ razor) | 6/6 | **6/6** | 0 | 3.3 | 839 | $0.1545 |

**No clash.** razor's ladder did not suppress the mandated verification in a
single run, correctness and scope discipline are identical, and the razor-plugged
arm was cheaper by 14% and shorter by 13% in output tokens. Read alongside the
earlier `trio1` batch — foreman + hush + razor, 12/12 pass, 12/12 verified — that
is 18 of 18 razor-plugged sessions running the check. n is small, but the claim
under test predicted a visible drop, and the drop is absent in every cell.

§8(a) is closed. §8(c), the subagent fan-out price, is untouched and still needs
a fan-out task in the harness before it can be priced.

### 7.3 The corpus was re-measured and razor 1.3.1 shipped — $32.52

Run `20260820-235147`: 13 jobs × 3 setups × 3 reps × sonnet + opus = 234 cells,
**$32.52**, zero errored cells, CLI 2.1.238. Approved by the owner as the ~$36
corpus re-run, on the reasoning in §7.1 — the published LOC table no longer
described what the plugin does.

**The 2026-08-19 verdict is reversed.** Mean lines per code session:

| Setup | Sonnet | Opus |
| --- | --- | --- |
| no plugin | 15.6 | 16.8 |
| rival | 10.2 | 11.9 |
| razor | **10.1** | **9.2** |

razor is bold in all 22 job rows — it writes the fewest lines or ties for
fewest, on every job, on both models. Its per-cell spread is also the tightest
of the three (opus `dep-slug` 1/1/1 and `sprawl-todo` 14/13/12, against the
rival's 2/8/5 and 38/16/16).

Cost moved the same way: razor is now the cheapest arm on BOTH models —
$0.0993/session vs $0.1095 on Sonnet (9% under), $0.1335 vs $0.1807 on Opus
(26% under). Per-session prices for future quoting: **Sonnet ~$0.11, Opus
~$0.17**, averaged over all three arms.

Cleanliness: razor 0 wrong, 0 unsafe, 0 installs across all 78 sessions. **The
rival was clean too this time**, so "the only setup that can say both" is dead
and the README no longer claims it. Plain Claude Code failed `dep-http-lib` 3/3
on Sonnet and 1/3 on Opus (it requires `axios`, which is not installed) and
attempted `npm install p-retry` twice on Opus.

**Shipped as 1.3.1** — razor `2ba955b`, marketplace `1c2c222`, both pushed, both
CIs green. The release carries the two re-derived tables, the replotted hero
(`160 lines never shipped` → `176`), the reworded claims, and a CHANGELOG entry
in plain user-facing language. The footer's "numbers move a few percent between
runs" became "numbers move between runs, sometimes by a lot", which is what two
runs 48 hours apart actually showed.

**Two instruments were built to do this and are worth keeping.** Both sit beside
this file in `docs/research/` (gitignored, like everything here), and both were validated by
reproducing the SHIPPED artefact byte-for-byte from the old run before being
pointed at the new one: `scripts/hero.js` replots the hero poster from any run's
`results.json`, and `scripts/tables.js` regenerates both README tables including bolds
and daggers. Recovering the hero's data model took the longest part of the
work — 9 dependency jobs, Opus only, one column per no-plugin session sorted
ascending, the green edge at razor's median for that job, the headline being
the summed offcut. If either is needed again, rebuild from that description
rather than re-deriving it from the SVG.

### 7.4 Entry 160, half one: the counter-suite says razor blocks nothing — $7.92

Run `20260821-004223`: 4 jobs × 2 arms × 3 reps × sonnet + opus = 48 cells,
**$7.92**, zero errored cells. Approved as session one of a two-way split of
entry 160 (the counter-suite now; the ablations later, ~$20).

**Why it existed.** Every job in the published corpus is a trap in one
direction — the correct result adds nothing — so no run could ever catch razor
talking Claude out of something the job needed. The four new jobs go the other
way, and each one names a specific thing the ladder could plausibly cut:

| Job | The required addition | The ladder clause it tests |
| --- | --- | --- |
| `need-installed-dep` | Call `slugmaster`, already in the manifest and in the workspace's `node_modules` | "never add a new one for what a few lines cover" |
| `need-old-node` | Ship `http`, because the stated target is Node 16 without global `fetch` | rung 4, "use the platform" |
| `need-abstraction` | Two storage backends behind one shape, asked for in the prompt | "no abstractions nobody asked for" |
| `need-validation` | Full validation of untrusted JSON at a public endpoint | "never cut: validation at trust boundaries" |

Each job scores compliance separately from correctness, so cutting the required
thing fails the job even when the produced code runs.

**Result: razor is 24/24 correct and 24/24 compliant**, both models, every job.
It called the installed library rather than hand-rolling a slug, used `http`
rather than `fetch` on the Node 16 target, built both backends, and kept every
validation branch. Plain Claude Code also passed 24/24 — the traps discriminate
on nothing here, which is the honest reading: **neither arm cut what was
needed, so the finding is that razor does no harm, not that it helps.** What
razor did do is write less code to reach the same passing result, most visibly
on Opus:

| Job | Opus, no plugin | Opus, razor |
| --- | --- | --- |
| `need-old-node` | 63 / 60 / 75 | 30 / 32 / 31 |
| `need-abstraction` | 65 / 64 / 61 | 34 / 30 / 34 |
| `need-validation` | 59 / 57 / 78 | 19 / 19 / 19 |

**Shipped** at razor `86c439c`, pushed, suite 287/287, `--selftest` green on all
17 instruments. The four jobs live behind `--counter` and are excluded from
`--full` on purpose, so the published corpus cannot move under the tables that
quote it. One harness limit was lifted to make them possible: a task's seed may
now name a nested path, which is how `need-installed-dep` ships a real
dependency inside its own `node_modules`.

**Entry 160 stays open for its second half** — the ablations. Build three
cut-down copies of razor (guidance only, dependency gates only, structural
gates only), run them against the full product on the six-job default subset,
and keep only the parts that earn their place. ~$20, and it needs one free
harness change first: `--rival-dir` takes a single extra arm today, so a
four-way ablation cannot be expressed.

### 7.5 Entry 160, half two: the ladder is the product, and the gates are unpriceable here — $20.19

Two runs, both approved inside the ~$20 session-two envelope.

**Run `20260821-005922`** — the six-job default subset × 5 arms × 2 reps ×
sonnet + opus = 120 cells, **$14.94**, zero errored cells. Arms: `baseline`,
`guidance` (the ladder only), `deps` (the three package gates only),
`structure` (the file meter plus the Stop ledger), `razor` (the full product).
Each cut-down build is a copy of the plugin with `hooks/hooks.json` trimmed and,
where two mechanisms share the `PreToolUse` entry point, that file's `GATES`
array trimmed with it. The builder is `docs/razor/research/scripts/razor-build-ablation-arms.js`.

Mean lines per code session (the four coding jobs of the subset):

| Arm | Sonnet | Opus |
| --- | --- | --- |
| baseline | 20.0 | 26.6 |
| guidance (ladder only) | **15.6** | **14.6** |
| deps (package gates only) | 19.4 | 29.4 |
| structure (file meter + ledger) | 19.0 | 24.6 |
| razor (everything) | **15.6** | **14.9** |

**The ladder is the entire measurable effect.** Guidance-only lands on the full
product to within a rounding error on both models, and both gate-only arms land
on baseline. Correctness was 12/12 in every arm; no arm attempted an install.

**Run `20260821-010845`** — the same question aimed at the jobs that actually
bait a package, because the default subset contains none of them: the three
"the user names the library" jobs × baseline/deps/razor × 2 reps × both models
= 36 cells, **$5.25**.

| Model | Arm | LOC | correct | safe | installs |
| --- | --- | --- | --- | --- | --- |
| Sonnet | baseline | 13.3 | 4/6 | 4/6 | 1 |
| Sonnet | deps | 12.3 | 5/6 | 6/6 | 0 |
| Sonnet | razor | **8.5** | **6/6** | **6/6** | 0 |
| Opus | baseline | 15.0 | 6/6 | 5/6 | 1 |
| Opus | deps | 11.0 | 6/6 | 6/6 | 0 |
| Opus | razor | **6.3** | **6/6** | **6/6** | 0 |

**Not one gate fired — in any cell, in any run, ever.** Across all four runs on
record (672 cells) `razor_dep_denies` and `razor_file_denies` are zero. That is
a real zero, not a broken counter: both gates were probed directly this session
and both deny correctly, and both deny reasons contain `adds a new `, which is
exactly the string the harness counts. The dep guard was probed with
`npm install left-pad`; the import guard with a `Write` of
`require("axios")` into a workspace carrying the benchmark's own manifest.

**So the benchmark cannot price the gates, and this run is not grounds for
cutting them.** They are insurance against a situation this corpus never
produces, because the ladder settles it upstream — the same reason the
consolidation doc has always said post-gate fires are benchmark-rare. Entry
160's rule ("retain broad interventions only when they improve outcomes without
correctness loss") is satisfied for the ladder outright; for the gates the
honest disposition is **unmeasured, not unhelpful**, and a live multi-turn
session is the only testbed that could settle it.

**The sharpest single cell is qualitative.** In `dep-http-lib` under the
deps-only arm on Sonnet, the session left the stub unimplemented and ended with
a question: whether to use native `fetch` or install `axios` after all. Headless,
nobody answers, so the job fails. The full product never does this — the ladder
tells the model to act in the same response and note the swap in one line. The
gates without the ladder produce a question; the ladder produces a decision.
That is the mechanism behind the "It never asks *you* anything either" line in
the README, seen failing when the ladder is removed.

One caveat sized honestly: 2 reps per cell, 12 cells per arm per model in the
first run and 6 in the second. The deps-vs-baseline differences in the second
table come from arms that had NO mechanism acting on them, so they measure
run-to-run noise, not an effect — a useful calibration for how much of a gap on
these jobs is worth believing.

**Shipped**: `--arm-dir <name>=<path>` is repeatable, razor `0bb4b08`, pushed,
suite 287/287. **Entry 160 is now complete** — the counter-suite in §7.4, the
ablations here.

### 7.6 The gate probe: both gates fire, nothing breaks, and the bench could never have seen one — $3.49

§7.5 left one thing unresolved: not one gate had fired in 672 benchmark cells,
and nothing had ever measured what a fire costs a real session. The benchmark
cannot answer it — it is single-turn, and the ladder settles the question before
a gate is reachable. So the fire had to be forced.

**The instrument.** `docs/razor/research/scripts/razor-gate-probe.js` (local, gitignored) runs
two-turn headless sessions: turn 1 is an ordinary job, turn 2 is the user coming
back and asking for exactly what a gate guards, in terms that leave no room to
talk them out of it. `--resume` puts turn 2 in the same session with the same
plugin loaded. Two scenarios:

- **import-guard** — a real vendored package sits in `node_modules/tinyfmt` but
  is deliberately absent from `package.json`. Turn 2 says use it.
- **file-meter** — turn 2 asks for a five-file split against a budget of four.

Both a razor arm and a no-plugin arm, both models, two reps: 16 sessions,
32 turns, **$3.49**.

| Scenario | Arm | Model | fired | did the job | ran | asked the user | $/session |
| --- | --- | --- | --- | --- | --- | --- | --- |
| import-guard | no plugin | Sonnet | 0/2 | 2/2 | 2/2 | 0/2 | $0.1851 |
| import-guard | razor | Sonnet | **2/2** | 2/2 | 2/2 | 0/2 | $0.2138 |
| import-guard | no plugin | Opus | 0/2 | 2/2 | 2/2 | 0/2 | $0.2607 |
| import-guard | razor | Opus | **2/2** | 2/2 | 2/2 | 0/2 | $0.2405 |
| file-meter | no plugin | Sonnet | 0/2 | 2/2 | 2/2 | 0/2 | $0.1485 |
| file-meter | razor | Sonnet | **2/2** | 2/2 | 2/2 | 0/2 | $0.1680 |
| file-meter | no plugin | Opus | 0/2 | 2/2 | 2/2 | 0/2 | $0.2760 |
| file-meter | razor | Opus | **2/2** | 2/2 | 2/2 | 0/2 | $0.2509 |

**The deny-once promise holds end to end.** Every razor session was denied,
retried, and finished the user's instruction correctly. Not one session stopped
to ask the user what to do, which is the failure mode §7.5 caught when the gates
run without the ladder. The price of a fire is about one extra assistant turn:
roughly +13% to +15% on Sonnet, and cost-NEUTRAL to slightly cheaper on Opus
(−8%, −9%), where the shorter path back appears to pay for the deny.

**The finding that matters most is methodological.** `hooks/file-meter.js:50`
exempts any path under `os.tmpdir()` (and any path containing `/scratchpad/`) as
scratch. **Every benchmark cell runs under `os.tmpdir()/razor-bench`.** So
`razor_file_denies` could never have been anything but zero in any run on
record — that half of the 672-cell zero is guaranteed by construction, not by
the ladder working upstream. The first probe run reproduced it exactly: run it
in the temp dir and the meter is silent; move the workspace to
`D:\Projects\Personal\_razor-probe` and it fires 8/8. The dep and import guards
carry no such exemption; their zero really is the ladder settling it first.

Anyone using the harness to exercise the file meter must point
`RAZOR_BENCH_RUNS` outside the system temp dir. That is now written into
`benchmarks/README.md`.

**Nothing here changes the product** — no razor behaviour was modified, and the
published numbers are untouched. What changed is that half the plugin is no
longer unmeasured.
