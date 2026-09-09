# Foreman × praxis-workflow-os mining — 2026-07-22

Private notes (gitignored dir). Clone: `D:\Projects\Knowledge\foreman-knowledge\praxis-workflow-os` (MIT, v1.0.0, 105 files, 7 skills, stdlib-only Python). Produced by a 2-agent catalog pass (88 concept entries + ~50 script/schema entries) ground-truthed against foreman source at `D:\Projects\Personal\SoftwareDevelopment\claude-plugins\foreman\`.

All foreman facts below were verified against source this session. The reference tool is "praxis" in this private note; it is never named in any committed foreman artifact (house rule [[no-competitor-naming]]).

---

## 1. What the reference tool is (5 lines)

An "AI operating-model architect" that interviews a knowledge worker, compiles their answers into a validated `profile.json` (a 15-field persona/work-model schema), then compiles that profile through a **7-stage lifecycle** — interview → blueprint (7 governance artifacts) → human approval → setup (scaffolds Obsidian skills + note templates) → real use → distillation → retrospective → skill evolution. A thin `praxis` router maps intent to the smallest sub-skill. Every stage transition has a typed input/output contract and a human-approval gate; nothing auto-continues past a gate. Deterministic Python scripts do all the mechanics (scaffold, validate, hash, aggregate); the SKILL prose only teaches judgment. Ships MIT, cross-published to Claude + Codex + a third manifest from one source.

**Its one real idea:** *pair every consequential prose rule with a deterministic script that makes violating it impossible or loud* — "never overwrite" ↔ a create/skip/replace planner with rollback; "human approved exactly this" ↔ a SHA-256 gate over the approved bytes; "balanced trigger corpus" ↔ a validator that errors when positives ≠ negatives; "confirmed vs inferred" ↔ a `VALID_STATES` enum where only `confirmed` counts. Foreman already runs on this exact spine (`check-prompt.js`, `guard-roadmap-edit.js`, `roadmap.js` invariants) — so the headline idea is convergent validation, not a new lever.

---

## 2. Where praxis genuinely differs from foreman

Two places, both narrow, both a consequence of praxis being a *persona-authoring* tool and foreman a *task-tracking + prompt-handoff* tool.

**2.1 A measurable skill-selection test harness.** Every praxis skill ships two committed fixtures: `evals/evals.json` (assertion-based task cases, including deliberate must-NOT-trigger ids) and `evals/trigger_queries.json` (16–24 labeled queries, machine-validated to require **equal positive and near-miss-negative counts**, no duplicates). The clever part is cross-wiring: one skill's negative queries are its siblings' positive queries, so each skill proves it won't poach an adjacent skill's intent (`skills/praxis-blueprint/evals/trigger_queries.json` negatives = setup/distill/retrospective positives). Foreman has **no** skill-firing test at all — its 11 test files test scripts/hooks, and `benchmarks/` measures handoff cost/quality, not which skill fires. Foreman's trigger phrases were probe-validated *manually* (memo) and nothing locks that investment against regression.

**2.2 A structured outcome/metrics loop.** praxis defines an optional `events.jsonl` (per-run: skill, outcome, duration, corrections, quality_failures, friction_tags) and a robust aggregator (`aggregate_metrics.py`: bool-safe numeric coercion, null-safe stats, DoS ceilings on bytes/lines/keys, malformed-line tolerance) that emits per-skill/per-group rollups. On top sits a **failure→intervention diagnosis table** (11 rows: "skill loads for adjacent tasks → narrow trigger + near-miss tests"; "knows the rule but skips it → hard gate + rationalization tests") and a **7-level evidence hierarchy** that forbids a permanent change from the weakest evidence — thin evidence yields a bounded experiment, not a rule. Foreman captures per-task outcome only as free-text `notes` + coarse `status`; it has no aggregation and no outcome/lesson structure.

Note what is *not* on this list: prompt-assembly quality, cost discipline, safe writes, never-auto-execute, companion-plugin boundaries. praxis does all of those, but foreman already does each in an equal-or-better, benchmark-backed form (§3).

---

## 3. Where foreman already beats it (or already has it)

- **Companion-handoff boundary (praxis ADR-0001 "Prompt Polish integration", concept #81).** praxis's headline architectural doc — own the intent, hand a *stable approved contract* to a separately-versioned prompt optimizer, forbid it from redefining scope — is **exactly foreman's razor/hush deferral**, except foreman's is config-declared (`usePersona`, `omitSections`), benchmarked (the trio "add no overhead to each other"), and needs no runtime handshake. Foreman's is the stronger form.
- **Thin skills + never-auto-execute (concepts #1–4).** Foreman already ships 4 separate intent-triggered skills with no mega-skill, and "picking a task is not starting it — Foreman never marks an entry `in_progress` itself" is core doctrine (`skills/roadmap/SKILL.md:272-277`). praxis's router table exists to tame a 7-skill system; foreman's 4 don't need a dispatcher.
- **Prose-mirrored-in-code (concept #88).** praxis's "one real idea" is foreman's spine: `check-prompt.js` mechanically verifies the template's checklist ("the checklist items a script can verify, verified by a script"), `guard-roadmap-edit.js` denies hand-edits, `roadmap.js` enforces id/parse/append-only invariants.
- **Safe writes = git-native (concepts #43–46).** praxis needs a dry-run planner + `--backup-dir` + transactional rollback because an Obsidian vault has no VCS. Foreman assumes git: init snapshots the roadmap with a pathspec commit before Overwrite (shipped 0.33.x), every write is atomic with parse-after-write, and the draft-as-text-before-Call-3-approval *is* the dry-run.
- **Distillation threshold (concepts #49, #51, #54).** "Only persist if it changes a future decision; nothing-worth-preserving is valid" = foreman's `doc:"none"` forced choice. "Changing facts need freshness / update don't proliferate / preserve superseded history" = foreman's dated ADRs that are never rewritten backward and name their predecessor in `supersedes`.
- **Recommend-a-default (concept #7-8).** Foreman already tags the top candidate `(Recommended)`. praxis's one-question-per-turn is the opposite of foreman's deliberate AskUserQuestion batching — and the "one question at a time" belief is folklore per foreman's own Aligned research; the real lever (recommend an answer) foreman already pulls.
- **Evidence standard.** praxis's efficacy rests on a cited research report; foreman's rests on its own reproducible cost/quality benchmarks. Where they'd conflict (self-scored quality rubric vs measured outcome), foreman's measurement wins.

---

## 4. ADOPT — ranked by value/effort

**None at high value.** This is close to a "do nothing" verdict and the rejected/already-have columns are the honest evidence. The two items below are worth *considering*, both gated on a measurement rather than built on spec — foreman's evidence-driven ethos, not praxis's assert-and-ship one.

### C1. Structured outcome capture (`outcome_type` + `lesson`) — value **conditional**, effort **small (schema only)** → MEASURE FIRST

**Mechanism.** praxis proves the pattern (a per-run event carrying an outcome class + a durable lesson, later aggregated to find where work repeatedly stalls). Foreman's own memory independently mapped the same idea three days earlier from a different reference ([[foreman-ergon-opportunities]], 2026-07-21: `outcome_type` + `lesson` fields, survey stats grouped by outcome/area, add-task dedup surfacing past-dropped work in the same area). Two independent sources converging on structured-failure-capture is real signal.

**Smallest form.** Two *optional* fields set only on the `update-status` close call: `outcome_type` (a small closed enum — e.g. `shipped` / `reworked` / `abandoned-blocked` / `wrong-approach` / `superseded`) and `lesson` (one sentence, or omitted). No new command, no read-path cost (they're absent from `next-candidates`/`list --summary` payloads by default), no new file. This is tier-1 of the ergon plan.

**Why MEASURE FIRST, not ship.** Three honest counter-pressures, all in foreman's own doctrine:
1. `status` already carries the coarse outcome (`done`/`dropped`/`rejected`/`deferred`), and `notes` already holds lessons as free text. The only thing structure adds is *machine grouping*.
2. Machine grouping pays off only through an aggregation/survey command — which is tier-2 and deferred — so the fields sit inert until that lands.
3. codekeel's lesson applies verbatim: *measured base rates matter more than mechanisms.* Before adding two fields to every close call, run a one-time read of the live `ROADMAP.jsonl` and check whether foreman's own `dropped`/`rejected`/reworked entries actually cluster by area in a way a `lesson` field would have surfaced. If the history shows real rework patterns → add the two fields. If not → the `notes` field already suffices and this is schema for schema's sake.

**Reference impl for the eventual aggregator:** `aggregate_metrics.py:57-124` (bool-safe `numeric()`, null-safe `stats()`, resource ceilings, lenient/`--strict` split) is a clean model *re-derivable from scratch* — do not lift; MIT or not, foreman writes its own.

### C2. Cross-wired trigger-boundary fixture for the 4 skills — value **low-medium**, effort **small** → DEFER

**Mechanism.** A committed set of `{query, should_trigger}` cases per skill where each skill's negatives are its siblings' positives (roadmap-pick vs craft-prompt vs survey vs init), so a future skill-description edit that makes `roadmap` start poaching `craft-prompt`'s intent fails a check instead of shipping. This is the one praxis QA idea with no foreman equivalent — the benchmark suite measures handoff *cost*, never skill *selection*.

**Why DEFER, not adopt.**
- Foreman has only **4** skills, all with stable, already-probe-validated triggers; the regression surface a corpus would guard is small and quiet.
- The user already runs **assay** (external plugin): `assay:audit` grades skill-description trigger quality and `assay:craft` writes descriptions to a measured trigger recipe with quoted phrases + exclusion clauses. Trigger-quality tooling already exists in the ecosystem — a full eval framework inside foreman would duplicate it.
- praxis's own validator (`positives != negatives` is an error, 16–24 items) is right-sized for a *generated*-skill factory with an unbounded skill count; foreman's 4 hand-authored skills don't need the machinery, only the fixture.

**If built anyway:** a single `tests/skill-triggers.test.js`-style fixture (~6–8 cases/skill, hand-written, no generator, no validator), asserted by eye or by a thin harness — not a `trigger_queries.json` contract per skill. Build it the first time a real mis-fire is observed, not before.

---

## 5. REJECTED — ideas that are anti-foreman or out of its lane

| Idea (praxis concept #) | Why not |
|---|---|
| Rich work-stream schema: 8-primitive entry {trigger, inputs, decisions, deliverables, quality_gates, approvals, handoff, residue} (#18, #19) | Directly anti-foreman. `why`/`what` are capped at 1–2 sentences *because they're re-read on every `list`/`next-candidates` call — a wall of text multiplies cost across every future call* (`roadmap-schema.md:37-38`). Quality-gates/verification/handoff are assembled into the *prompt at dispatch time*, never stored per entry (B8/B9: no stored derivable field). |
| Evidence tagging: confirmed/inferred/deferred/disputed + confidence per field (#9, A3) | Foreman solves the same problem more cheaply at the other end: the `<truth_grounding>` block forces the *receiving* session to verify every supplied claim at handoff, so there's no need to track confidence per stored field (which is schema bloat). Same reasoning that killed codekeel's `relevant_files` existence check. |
| Content-hashed approval gate binding approved bytes (#41, D1/D2) | Over-engineered for foreman. praxis needs it because *setup runs long after blueprint approval* — a drift window. Foreman assembles each prompt fresh at pick time and sends it straight to the destination through a structural gate; there is no approve-now-execute-later gap for a hash to protect. |
| Blueprint quality rubric: 10 dims × 0-2 with veto gates (#30) | Foreman's `check-prompt.js` is deliberately **binary** ("it can't judge content quality"). A self-scored rubric by the crafting model is the exact "wording sounds clearer ≠ better outcome" trap praxis *itself* warns about (#61), and foreman validates content quality by benchmark, not self-score. A rubric would be unmeasured process dressed as rigor. |
| Skill-forge: TDD-for-skills, security review, static-safety scan, skill validator (#63-80, F-series) | Out of foreman's domain entirely — foreman does not generate or ingest skills. Skill authoring/auditing is assay's lane. The security-review + `validate_skill.py` safety-scan patterns are good but have no foreman surface (foreman executes no third-party prompt content). |
| One-consequential-question-per-turn interview (#7) | Foreman deliberately **batches** AskUserQuestion (init Call 2 asks 5 policy toggles at once) to stay fast. One-per-turn would slow every foreman flow; the belief that it improves answers is folklore per foreman's Aligned research. |
| Router-as-a-skill + lifecycle-stage lookup table (#1, #6) | A dispatcher earns its place at 7 skills; at 4 it's overhead. Foreman's skills self-trigger on their own `when_to_use` — adding a router would be scaffolding for a scale foreman doesn't have. |
| Multi-harness manifests (Claude + Codex + `agents/openai.yaml`) from one source (#83) | Cross-platform publishing is a large scope expansion out of foreman's (and foundry's) current lane. Foreman is a Claude Code plugin; the marketplace is Claude-only by design. |
| Git-index-canonical manifest + deterministic archives + release-identity chain (D4-D6, H1-H3, I1-I4) | Repo/CI hygiene, not foreman plugin behavior. Foundry's root marketplace already enforces version+`source.sha` via pre-commit/CI. *See §6 — one narrow technique here is worth a separate note to the foundry maintainer, but it is not a foreman change.* |
| Symlink-component rejection / safe-filename / `paths_overlap` guards (C2, G1, K1) | Foreman writes to **fixed relative paths** (`ROADMAP.jsonl`, `.foreman/config.json`) not user-arbitrary output dirs, so the symlink-swap surface is tiny. The one user-supplied path — `doc` / `decisionLog.dir` — already rejects absolute/drive/`..` segments (`roadmap-schema.md:47`). Marginal hardening at best. |

---

## 6. One note for foundry (not foreman)

praxis's `build_manifest.py` hashes **git's canonical index bytes** (`git show :<path>`) rather than working-tree bytes, so a checkout's line-ending policy (CRLF on Windows) can never change a checksum, and it enumerates untracked-but-distributable files to **fail closed** (`git_index_bytes` at `:80-90`, `reject_untracked` at `:27-51`). If foundry's own manifest audit has ever seen a spurious cross-platform sha mismatch, that's the technique that removes it. Re-derivable from the one-line description; nothing to lift. This is a *foundry-CI* idea, logged here only because the mining pass surfaced it — it is not in scope for "improve foreman."

---

## 7. License

praxis is **MIT** (same as foreman) — no copyleft constraint, unlike the AGPL codekeel pass. Ideas and even implementations are freely adaptable. Standard discipline still applies: every C-item above is re-derived from foreman's own code (two optional schema fields; a hand-written test fixture), none requires praxis to exist, and the name never touches a committed foreman file.

---

## 8. "Do nothing" verdict

**Honestly close to do-nothing, and for a good reason: foreman and praxis share a spine but not a domain.** Both run on "prose teaches judgment, scripts enforce mechanics," both refuse to auto-execute past a gate, both defer wording to a bounded companion, both treat "nothing worth saving is a valid outcome." Foreman arrived at every one of those independently and holds each in a benchmark-backed form. So praxis is mostly a *confirmation* that foreman's architecture is sound, not a source of missing parts.

Where they diverge, praxis diverges *toward* things foreman deliberately refuses: a rich per-entry schema (foreman caps entry prose for per-call cost), self-scored quality rubrics (foreman measures instead), an interview that authors a persona (foreman defers persona to razor), a skill-generation factory (assay's lane). Those aren't gaps in foreman; they're a different product.

Exactly **one** idea is both genuinely absent from foreman and genuinely foreman-shaped: **structured outcome capture** (C1), and it arrives with independent corroboration from the ergon pass. But the right next move is to *measure* — read the live roadmap's own `dropped`/`rejected`/reworked history and see if a `lesson` field would have caught a real rework pattern the `notes` field didn't — not to add two fields on faith. If the base rate is zero, the honest answer is that `notes` already does the job. The trigger-boundary fixture (C2) is a real but low-urgency gap, and the user already owns adjacent tooling for it.

The measured base rate decides C1. Everything else here is already in foreman, better.
