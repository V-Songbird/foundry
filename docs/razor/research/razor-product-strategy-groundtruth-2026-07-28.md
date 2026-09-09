# Razor product strategy — ground-truth review and development plan

> **Status 2026-08-18 — HISTORICAL; half shipped, half deferred.** Entries 149, 151, 152, 155,
> 157 and 159 are done. 150, 153, 154, 156, 158 and 160 were deferred post-v1 by the owner on
> 2026-08-06 and none has been re-decided since. The W1–W4 release ladder in §6 was abandoned —
> v1 shipped as one truth-first pass instead. §7's open question about where to publish
> `razor/PRODUCT-STRATEGY.md` is moot: that file never entered any repo and is not on disk. On
> entry 157 this document's "default-off" resolution lost; the search meter was deleted outright.
> Current standing lives in `razor-consolidation-2026-08-18.md`.

**Date:** 2026-07-28
**Reviewer:** product lead session (no code touched; verification by direct source reading)
**Inputs reviewed:** `razor/PRODUCT-STRATEGY.md` (untracked, 2026-07-27), root `ROADMAP.jsonl` entries 149–160 (planned, 2026-07-27, source: user)
**Baseline:** razor at `fee5c97`, 185/185 tests green, 0.4.7-alpha released + three unreleased docs/CI commits

---

## 1. What the workers delivered

1. `razor/PRODUCT-STRATEGY.md` — a pessimistic product review + scope redefinition: razor moves from "YAGNI enforcement" to "evidence-backed decision checkpoints"; facts may block, policy requires approval, high-confidence expansion gets one retryable checkpoint, heuristics only advise.
2. Twelve roadmap entries (149–160) mapping the doc's P0–P3 release ladder onto concrete tasks with a dependency DAG:
   - no deps: 149 (truth/claims), 150 (authority model), 155 (ledger baseline), 157 (search meter), 159 (benchmark freeze)
   - 151 (dep identity) ← 150; 152 (import analysis) ← 150; 153 (manifest parity) ← 151+152
   - 154 (policy/modes) ← 150+151+153; 156 (change-shape) ← 150+155; 158 (unused audit) ← 152+153
   - 160 (counter-suite + ablations) ← 154+156+157+158+159
3. Unrelated but adjacent: entries 161–176 are the hush twin of this exercise (own owner); entries 184–189 are foreman work in flight in another session (189's "hero chart" is **foreman's** README, not razor's — no collision with this plan).

The entry set covers every actionable claim in the doc. No doc claim lacks an entry; no entry lacks a doc basis.

## 2. Ground-truth verdicts — defect claims

| # | Claim (doc §defects) | Verdict | Evidence |
|---|---|---|---|
| D1 | Already-declared dependency described as new | **CONFIRMED** | `dep-guard.js:366-388` — `check()` never consults the manifest before denying; `installedDeps()` feeds only the message. `npm install axios` with axios already in package.json is denied as "adds a new npm dependency" while listing axios as already installed in the same sentence. |
| D2 | Manifest declaration described as installed | **CONFIRMED** | `dep-guard.js:343` "Already installed (N)" — list built from `package.json`/`pyproject.toml` keys (declared), never from `node_modules`/site-packages. Same wording in `import-guard.js:205` and `manifest-guard.js:68`. |
| D3 | Versioned and unversioned specs don't share one decision | **CONFIRMED** | `depKey` (`dep-guard.js:120-122`) keys on raw tokens: `axios` ≠ `axios@^1.8` ≠ `flask==2.0`. Worse, the cross-gate ledger writes raw tokens too (`dep-guard.js:385`), so `deniedImports["node:axios@^1.8"]` never suppresses the import-guard's `node:axios` — the "one nudge per dependency however it enters" contract breaks whenever a version spec is present. |
| D4 | Python project-local absolute imports mistaken for external | **CONFIRMED** | `import-guard.js:126-144,187-193` — `pyImportRoots` accepts any non-stdlib root; `newImports` filters only manifest-declared names and the file's own prior imports. No filesystem check for a local package (`import myapp` in a src-layout project denies). Same class: `@app/x` tsconfig aliases parse as scoped packages (`import-guard.js:117`). |
| D5 | Comment/docstring examples mistaken for real imports | **CONFIRMED** | `jsImportRoots`/`pyImportRoots` regex raw text; no comment or string stripping (`import-guard.js:98-144`, ceiling admitted at `:25-27`). |
| D6 | Type-only imports disappear from dependency usage | **CONFIRMED** | `import-guard.js:109` strips `import type` before extraction. Correct-ish for the gate (suppressing direction), wrong for the audit which reuses the same extractor: a prod dep used only via `import type` lands in the audit's **"Unused — high confidence"** bucket (`unused-deps.js:14-18,231`). |
| D7 | Pre-existing dirty work attributed to the current task | **CONFIRMED** | `session-start.js:17-27` snapshots only `baseSha` + untracked **count**; `build-ledger.js:34-44` diffs working tree vs `baseSha` at Stop. Dirty-at-start tracked changes are attributed to the session; untracked LOC is invisible to `--shortstat`; untracked identity is lost (count arithmetic only). |
| D8 | Source formats + dist-to-import mappings produce false unused findings | **CONFIRMED** | `walkSourceFiles` scans only `JS_EXT`/`PY_EXT` (`unused-deps.js:44` via `ecosystemOf`) — a dep imported only from `.vue`/`.svelte`/`.astro` is "Unused, high confidence". `declaredNameForms` (`import-guard.js:149-152`) has no metadata mapping: pillow→PIL, beautifulsoup4→bs4, opencv-python→cv2 all miss. `KNOWN_LIMITS` (`unused-deps.js:198-205`) names neither class. |
| D9 | Published benchmark table drifted from shipped corpus | **CONFIRMED** | README table rows "Parse a `.toml` config file" (README:176,191), "Tenacity's the move" (:182,197), "Read a user row from postgres" (:184,199, + prose :203) have **no corresponding task** in `benchmarks/runner/tasks.js` — the corpus replaced TOML with dep-querystring (`tasks.js:107-109`, comment says so), names p-retry not tenacity (`tasks.js:594-598`), and contains no postgres task at all. Hero-chart alt text says "80 sessions" (README:9); the TL;DR says "120 benchmark sessions" (README:20). |
| D10 | Public claims exceed evidence | **CONFIRMED** | `plugin.json:3` "YAGNI enforcement at the harness level"; README:33 "enforced in the tool layer"; README:201 "flawless on the big one" (not traceable to any shipped result artifact — which is itself entry 159's point); README:120-122 supply-chain SVG juxtaposes the industry's 1.2M blocked-malware number with razor's 120 sessions, implying malware protection razor doesn't perform; README:35 "No dials." vs the Settings table of 7 env vars and `plugin.json`'s 6 userConfig options in the same file. |

## 3. Ground-truth verdicts — behavior/choice claims

| # | Claim (doc §choices) | Verdict | Evidence |
|---|---|---|---|
| C1 | One line treated as better | **CONFIRMED** | `razor-lib.js:27` (RULESET rung 6). |
| C2 | One search treated as enough | **PARTIAL** | RULESET says "One check is enough, anywhere in this task" (`razor-lib.js:30`) — confirmed for the reuse check. But pre-edit searching is explicitly unmetered (`search-meter.js:9-13`), so "enough for every codebase" overstates the mechanical side. |
| C3 | Post-edit searching treated as likely waste | **PARTIAL** | The stance is real (`search-meter.js:10-13`, README:57). But the meter is far narrower than the doc implies: it fires only on the **2nd consecutive** post-edit search, and any Read/Edit/Write/Bash resets the count (`search-meter.js:39,51-53`) — ordinary search→read verification loops never trip it. Entry 157's `why` ("misses ordinary search-read loops") is wrong in direction; those loops are already exempt. The retire-by-default call can still stand on weak-signal grounds. |
| C4 | New-file count as sprawl proxy | **CONFIRMED** | `file-meter.js:21,35-42` — 5th `Write`-created file per turn denied once; tests/migrations/config/docs indistinguishable. |
| C5 | Deletion-positive diffs treated as a goal | **CONFIRMED** | `build-ledger.js:69` verbatim: "Deletion-positive diffs are the goal". |
| C6 | User-named library treated as replaceable | **CONFIRMED** | `razor-lib.js:26,30` — "even when the user names the library… ship the rung's version and note the swap". Mitigation exists: "If the user insists on the full version, build it without re-arguing" (`:34`) — the doc's casual-vs-explicit distinction has a seed to build on. |
| C7 | Command-guard ecosystems appear more supported than they are | **CONFIRMED** | `dep-guard.js:21-35` gates 14 managers; import guard covers 2 ecosystems (`import-guard.js:20-22`); manifest guard covers exactly 2 files — **`pyproject.toml` direct edits are entirely ungated** (`manifest-guard.js:53-56`) even though dep-guard reads pyproject as evidence. README's three-moments table (:55) is not scoped per ecosystem. |

**Tally: 15 confirmed, 2 partial, 0 refuted.**

## 4. Additional defects found during verification (not in the doc)

1. **The `import type` strip can swallow real imports.** `import-guard.js:109` — `/\bimport\s+type\b[^;]*;?/g`; `[^;]` matches newlines, so in semicolon-less code the strip runs from an `import type` line to the next `;` anywhere in the file, deleting real imports in between. Consequences: missed gate nudges and missed audit usage (false "Unused"). Belongs to entry 152's fixture list.
2. **The two manifest walks disagree.** `installedDeps` walks up and skips manifests with empty dep lists (`dep-guard.js:311-317`, `found && found.length`); `findManifest` stops at the first manifest **file** (`import-guard.js:168-182`). In a monorepo whose subpackage manifest declares nothing, the import guard gates against the subpackage manifest while the evidence list comes from the root — corroborates entry 151's monorepo item with a concrete mechanism.
3. **`declaredNameForms` overmatch reaches the audit.** The `py`-prefix strip makes `pytest` match an `import test` (`import-guard.js:151`). Deliberate and fine in the suppressing gate direction, but the audit inherits it as "used" evidence (`unused-deps.js:171`), and `skills/razor-unused/SKILL.md:22` claims a false "unused" is "the failure mode the script avoids" — an overclaim given D6/D8.

## 5. Product-lead review of the entries

All twelve entries are **accepted** with these amendments (carry each into the coder's brief):

- **Global constraint — razor ships with zero runtime dependencies.** Plugins install by clone; there is no `npm install` step at load time. Entries 151/152/158 say "resolvers" and "syntax-aware" — implement stdlib-only or vendor code in-repo. A coder proposing a real dependency for razor itself must stop and surface it first.
- **Global constraint — the RULESET ladder text is frozen.** The current ladder is the measured core (validated repeatedly; prior A/B lesson: additions validated against one model regressed on another). The doc's "revised guidance ladder" is unmeasured. No entry 149–159 touches the `RULESET` string in `razor-lib.js` beyond what a deny-message change strictly needs. A ladder rewrite becomes its own entry **after** 160's balanced suite exists to measure it — which is the doc's own evidence-gating principle applied to the doc.
- **149:** include `plugin.json` description rewrite, delete "No dials.", drop "flawless", remove or re-scope the supply-chain SVG to razor-only numbers, scope the three-moments table per ecosystem. Public-docs rule applies: current behavior only, no history, no methodology.
- **150:** keep the decision record a plain object + one thin evaluator module; no new config surface; dep-guard's existing checkpoint behavior must not regress (its tests stay green unmodified except message-shape assertions).
- **151:** headline behavior change: **a declared direct dependency never checkpoints**. Fixtures for D1, D2, D3 (both the `depKey` split and the cross-gate ledger raw-token mismatch), and the walk-disagreement in §4.2.
- **152:** fixtures for D4 (py self-package), D5 (comments/docstrings), §4.1 (multi-line type-strip), tsconfig aliases, and keep name normalization suppressing-only in the gate while making the audit's usage evidence resolver-grade.
- **153:** name the pyproject.toml direct-edit gap explicitly (C7); the published capability matrix is part of the deliverable.
- **154:** add `reset`/`status` to the toggle; coder proposes the policy file location; precedence tests (explicit user constraint vs policy) are the acceptance bar.
- **155:** snapshot the full dirty diff and untracked identities (hashes where useful), not counts; fixtures per the entry's list.
- **156:** classification stays boring path-heuristics; the raw ceiling remains available as explicit opt-in policy only.
- **157:** correct the entry's `why` before work (the meter already exempts search-read loops); the change is default-off + README/Settings truth, telemetry stays opt-in experimental.
- **158:** three buckets as specced; fix `SKILL.md:22`'s "avoids false unused" overclaim; extend `KNOWN_LIMITS` for anything not made resolver-grade (.vue/.svelte/.astro, dist-to-import gaps) rather than silently keeping "high confidence".
- **159:** the three drift instances in D9 are the acceptance fixtures; charts regenerate from frozen result records or come out; wire the mechanical claim-trace check into the existing CI workflow.
- **160:** counter-suite tasks per the doc's list + ablation arms. **Paid batches require an explicit user go with arms×tasks×reps and cost estimate first** (house rule). Cross-model runs mandatory — a change validated on one model has regressed on the other before.

## 6. Development strategy

**Execution model:** I orchestrate and review; every code change is implemented by an **Opus 5 coder** (roadmap-implementer-style brief, `model: opus`), one entry per agent, serial. Serial because all twelve entries share one submodule and eight of them touch `razor-lib.js`, `import-guard.js`, or `README.md` — parallel worktrees would conflict and worktree agents can't see uncommitted sibling work.

**Branch/commit protocol:** branch `product-strategy` inside the razor submodule; one squashed commit per entry (house rule: never report a trail of `task n/N` SHAs); suite green after every entry; I review each diff before the next dispatch. Roadmap statuses move via foreman's `roadmap.js update-status` pipe at dispatch/acceptance.

**Waves and releases:**

| Wave | Entries, in order | Release on completion |
|---|---|---|
| W1 — Truth | 157 → 159 → 149 (149 last so docs describe the post-change product; all three touch README/plugin.json) | 0.5.0-alpha |
| W2 — Decision quality | 150 → 151 → 152 → 153 | 0.6.0-alpha |
| W3 — Policy & lifecycle | 155 → 156 → 154 → 158 | 0.7.0-alpha |
| W4 — Evidence | 160 (build suite free; batches gated on user go) | claims refresh, then exit-criteria check |

**Approval gates (user):** wave-1 start; every release push (version + sha land in root `marketplace.json`, manifest-curator audit before cut); W4 paid batches; any history rewrite. Everything else runs autonomously between gates.

**Exit criteria:** the doc's list maps 1:1 onto the waves — W2 clears the dependency-identity and import-classification criteria, W3 clears ledger/advisory/audit/policy, W4 clears reproducibility and balanced-task evidence. Until W4 lands, razor's public claims (post-149) lead with dependency decision quality and mark broader structural intervention experimental — exactly the doc's closing directive.

## 7. Open items for the user

1. Go/no-go to dispatch W1.
2. Whether `razor/PRODUCT-STRATEGY.md` should ship in the public razor repo or stay local until P0 lands (recommend: stay local; entry 149 lists it as a touch either way).
3. W4 batch spend approval when proposed.
