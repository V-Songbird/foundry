# Foreman critique #2 evaluation — 2026-07-28

**Context:** second external critique, same day, evaluated against foreman main at `33052b1` (the four critique-1 fix commits included). Verified by targeted code reads; the five "release-blocking" claims each checked against the actual implementation.

**Headline verdict:** this critique is materially stronger than the first. Two of its five release-blockers are real integration defects our 902 unit tests structurally cannot catch — both live in the seams *between* tested components, which is exactly the critique's thesis. Roughly a third of the document repeats critique #1 (scope cut, ranking labels, evidence gap, freeze) — already adjudicated and partly shipped this morning. Its product-model rhetoric overreaches in places, but the concrete findings are the best we've received.

---

## The five release-blocking claims

### RB1 — "Foreman disables its own safe-commit path" — **CONFIRMED, HIGH**

- The handoff paragraph orders: flip to `in_progress` first, **then** `safe-commit.js begin` (skills/roadmap/SKILL.md:461–467).
- `beginUnit` refuses any dirty tree (safe-commit.js:81–87), and `repositoryState` is a bare `git status --porcelain` — **no shared-ledger exclusion** (sprint.js:42–61).
- On a **tracked** roadmap (the normal, promised case — "committed like code"), the `in_progress` write itself dirties the tree, so `begin` returns `dirty:true`, no baseline exists, and the flow's own rule ("make NO commit at all") switches the automation off. Every routine mutation (add/correct/defer) leaves the same poison for the next run.
- Sprint shares the seam: the coordinator's `in_progress` transition precedes the unit's `begin`.
- **Why we never felt it: the foundry roadmap is gitignored, so `git status` never sees it.** Why tests never caught it: `begin` and `update-status` are tested separately; no test runs the sequence (safe_commit.test.js covers generic dirt and the `roadmap_close` staging carve-out, never flip-then-begin).
- Design intent confirms the seam is *unconsidered*, not chosen: entry 121's own notes define dirt as developer changes ("dirty tree now means no automated commits, warn-and-absorb language deleted") and never mention the flow's own `in_progress` write as a dirt source.
- The `roadmap_close` carve-out in `finish`/`attestCommit` (safe-commit.js:122, `isSharedLedger`) shows the design already knows ledger dirt is expected at close time — `begin` just never got the same tolerance.
- **Fix shape:** `begin` (and sprint's clean checks) tolerate dirt that is *exclusively* shared-ledger files (`isSharedLedger`), returning the baseline plus a `ledger_dirty` note; everything else keeps refusing. Plus the end-to-end lifecycle test the critique asks for (clean repo → pick → in_progress → begin → edit → finish → staged close → commit → clean repo), which would have caught this.

### RB2 — "requireVerification doesn't reliably require verification" — **CONFIRMED, HIGH**

- The canonical closing paragraph instructs the executor to close with "the status it actually earned (`done`, `dropped`, `rejected`)" and land it inside the commit (skills/roadmap/SKILL.md:472–488). No `requireVerification` branch, no `awaiting_acceptance` mention.
- `requireVerification` is honored only by the post-commit reconciliation nudge (hooks/post-commit.js:217) — and a staged close's trailer deliberately filters that entry out of post-commit advice (post-commit.js:398–405, to avoid re-dirtying the roadmap).
- Net: with the default `requireVerification: true`, the **primary tracked path closes straight to `done` and the promised acceptance step never fires**. Only the untracked/late-commit path and sprint (sprint/SKILL.md:190 has the conditional) honor the setting.
- Entry 131's notes confirm the design was wired into exactly two surfaces — "post-commit requireVerification now stores the truth (awaiting on record, done on confirm, in_progress on decline); sprint fold-back adopts it" — and sprint's acceptance is mandatory even with `requireVerification: false` (sprint/SKILL.md:185–198). The single-task closing paragraph is the sole outlier; it was never rewired.
- The task-completed latch (task-completed.js:102–113) is as-designed (block once, fail open toward gating again on unreadable state) and the gate defaults off — the critique's "silent second pass" is the documented one-shot design, not a bug.
- **Fix shape:** the closing paragraph becomes config-aware at craft time — `requireVerification` on → close to `awaiting_acceptance` (staged close included), with "ask the user now" (Execute here) / "leave it for the user" (background agent), mirroring post-commit's existing branch.

### RB3 — "Terminal state is not proven state" — **PARTIAL: two small real gaps, one documented trade**

- Real: `update-status` accepts **any truthy string** as `commit` (roadmap.js:994–996) — no sha-shape check. A typo'd or fabricated string becomes permanent "evidence". Cheap fix: shape-validate (7–40 hex) at write time; resolution stays the views' job.
- Real: a staged close writes `done`, then stages the roadmap, and returns `roadmap_staged:false` on staging failure while the close itself succeeds (roadmap.js:1043–1046). Honest output — but the skill never tells the executor to check it, so the close can silently miss its own commit. One skill line fixes it. (The test the critique cites as "blessing" this — staged_close.test.js:108 — actually covers the *no-git-repo* fail-soft case, a deliberate product property. The critique mischaracterizes it.)
- Trade, documented: doctor counts *recorded* commits, not resolved ones (roadmap-doctor.js:264–271 explains why — the write gate runs without git). Resolution lives in `list --ids` / survey `commit_evidence`. The critique's "done means someone wrote done" ignores that second layer; keep as-is.

### RB4 — "Repository data is treated as trusted instructions" — **CONFIRMED IN PART, WORTH HARDENING**

- Confirmed: `invalid_path` on `planned_touches` is a **warning**, and the write gate blocks only errors (roadmap-doctor.js:158–167; roadmap.js:288–289) — so an absolute path or `..` escape persists through `add`/`correct`.
- Confirmed: `resolveFile` does `path.resolve(root, relPath)` and reads with **no containment check** (resolve-symbols.js:94–108) — a hostile roadmap arriving via branch/merge can pull outside-project file contents into a generated handoff.
- **Fix shape:** (1) refuse unsafe paths at input time in `plannedTouchesInput` (add/correct), leaving doctor's warning for grandfathered entries; (2) containment check in `resolveFile` — a resolved path outside the project root returns `outside_project: true`, never read. The prose-injection half is the generic LLM surface; the template's treat-claims-as-hypotheses rule is the mitigation, no mechanical fix filed.

### RB5 — "IDs are labels, not durable identities" — **CONFIRMED, NARROW**

- Overwrite re-init clears the file and "ids start at `001` again" verbatim (skills/init/SKILL.md:151–154), while `Foreman: <id>` trailers, source anchors, and decision docs from the old generation persist in history and can attach to unrelated new entries (commit-evidence scans all history).
- Narrow: the overwrite path is rare, user-confirmed, snapshot-first. The general ULID demand was already declined in critique #1 (human-readable ids are load-bearing).
- **Fix shape:** the overwrite path seeds numbering past the old roadmap's max id (read max before clearing) — kills cross-generation collisions for one line of skill text and no schema change.

---

## Repeats from critique #1 (already ruled, partly shipped)

Scope cut / "PM software minus the dashboard", ranking knows nothing of value/urgency (shipped honesty labels say so themselves), craft-prompt as separate product (demoted to advanced; split declined while it shares the template), sprint premature (frozen, experimental), measurement-before-evidence (endorsed; trial logging is the next milestone), archive accumulation (fixed this morning — session-start offer), charts unbacked (pulled this morning — critique #2 still catches the **hero** `bench-signoff.svg`, which we'd left pending; recommend pulling it now).

## Overreach

- "No transition matrix is enforced" — partial: `expected_status` compare-and-set, `require_ready`, creation-status restrictions, and correctable-status sets all exist; a full matrix is a design choice, and planned→done is deliberate (pure-investigation closes).
- "902 green tests are part of the warning" — rhetoric, but the underlying point (no end-to-end lifecycle test) is fair and becomes an entry.
- Privacy section — the roadmap is repo-owned by design; a README sensitivity NOTE is worth considering, the rest (secret scanning, retention) is out of scope for a solo-dev ledger.
- Tokenizer ASCII-only / reason-selection critiques: plausible, low-stakes; park.

## Recommended actions (in order)

1. **`begin` tolerates ledger-only dirt** + the end-to-end lifecycle test. (RB1 — highest.)
2. **Config-aware closing paragraph** so `requireVerification` binds the primary path. (RB2.)
3. **Commit-shape validation + `roadmap_staged:false` handling line.** (RB3.)
4. **Unsafe-path refusal at input + resolver containment.** (RB4.)
5. **Re-init id continuation past old max.** (RB5.)
6. **Pull the hero `bench-signoff.svg`** — same unbacked runs as the pulled charts.

Declined again: ULIDs, splitting the prompt studio, dropping model/effort fields, keyword risk classification. The freeze stands: these six are trust repairs, not features.
