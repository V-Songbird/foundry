# Foreman product review and trust plan

**Status:** Historical charter — written 2026-07-26. P0-P2 shipped and released at 1.2.1 (2026-08-13); P3 mostly decided (entries 145/146/148 dropped; sprint and model advice deleted; parallel execution never-listed at SCOPE.md:411); only entry 147 is still planned. Read for rationale, not for open work.  
**Date:** 2026-07-26  
**Scope:** Foreman as a standalone product. Host-specific implementation
details are considered only when they materially affect the product
experience, safety, cost, or reliability.

## Executive conclusion

Foreman has a coherent core:

- repository-owned project memory;
- deterministic roadmap operations;
- dependency-aware task selection;
- grounded task handoffs;
- mechanical safeguards around repeated and concurrent operations;
- no required hosted service.

The current implementation is unusually disciplined for an alpha product.
Its test suite covers roadmap mutations, prompt validation, task lifecycle
hooks, locking, and sprint boundaries. The main risk is not careless code.
It is that Foreman is becoming increasingly sophisticated around a product
model that has not yet proved its basic lifecycle.

The roadmap can accumulate task descriptions, path predictions, notes,
statuses, commit links, and decision references, but it cannot properly
correct or retire much of that information. Foreman can therefore preserve
memory more reliably than it can preserve truth.

The next milestone should be a **trust release**, not another coordination
feature. Before Foreman expands execution, review, decision, or recommendation
capabilities, the roadmap must be safely editable, repairable, mergeable,
archivable, and honest about the confidence of its recommendations.

Sprint was removed at the 1.0 close (skills/sprint/, scripts/sprint.js,
tests/sprint.test.js all deleted; entry 145 dropped). Every sprint passage
below describes the product as it stood on 2026-07-26.

## What the pessimistic review got right

### Foreman protects its mechanics better than its product assumptions

The implementation makes exact task creation idempotent, serializes roadmap
mutations, validates handoff structure, guards direct roadmap writes, and
attests sprint boundaries. These are strong safeguards.

They do not establish that:

- dependency fan-out identifies the most valuable next task;
- an append-only task description remains useful over a long project;
- users want decision documents coupled to task IDs;
- a generic prompt builder belongs in the same product as a project roadmap;
- users accept the setup and commit-time attention costs;
- a deterministic recommendation remains correct as the roadmap ages.

Foreman needs longitudinal product evidence in addition to contract tests.

### The roadmap is insufficiently correctable

Foreman can currently change status, dependencies, notes, task kind, and
decision-document references. It cannot directly correct the fields that
define the task:

- `title`;
- `why`;
- `what`;
- the current predicted file surface.

Stale findings are generally appended to `notes`. Predicted and observed
paths accumulate in `touches`. Git retains the original record, but the
active roadmap does not become a clean statement of the best-known truth.

This conflicts with the product promise that Foreman keeps the roadmap
honest. See the current field contract in
[`roadmap-schema.md`](../../../foreman/roadmap-schema.md) and the available mutations in
[`roadmap.js`](../../../foreman/scripts/roadmap.js).

### “Best next task” overstates the ranking model

Foreman's default ordering uses:

- textual hint overlap, when a hint is supplied;
- transitive open dependents;
- direct open dependents;
- file collision state;
- creation date.

It does not know product value, urgency, risk, effort, deadlines, customer
impact, or whether the developer's priorities changed. Dependency fan-out is
a useful deterministic signal, but it is not an objective importance score.

The product should describe the result as **Foreman's recommended next task**
or **default ordering**, show the reason, and preserve the user's choice.

There is also a concrete consistency bug: normal roadmap picking tests
collisions using exact path membership, while sprint planning already has
prefix-aware area matching. A planned `src/auth/` surface can therefore miss
an in-progress `src/auth/middleware.ts` collision in the main picker.

### Git safety is inconsistent

Sprint execution requires a clean tree and narrowly stages coordinator files.
Other tracked execution paths can detect a dirty tree, warn that existing
changes will ride along, and continue with `git add -A`.

That can absorb unrelated work into checkpoint commits and later squash it
into a combined change. Warning is not isolation.

The initialization overwrite path has a related recovery problem: a failed
snapshot does not stop the old roadmap from being cleared. Reporting the
failure afterward is too late.

### Some public claims exceed the implemented behavior

The normal fast-pick flow deliberately does not investigate the codebase.
It preflights paths and symbols and places truth-grounding instructions in the
handoff. The executing task verifies the substantive claims later.

That is a reasonable cost design. It is not the same as saying the selected
task has already been checked against the actual codebase.

Likewise, post-commit behavior generally surfaces a likely completion and
asks for reconciliation. It does not independently prove that a task is
complete and close it.

The implementation may remain as designed, but the product language must
distinguish:

- **preflighted:** paths, symbols, configuration, and structure were checked;
- **grounded:** the task's substantive claims were investigated;
- **verified:** the completed work passed its checks and was accepted.

### Lifecycle scale has hidden cliffs

Terminal entries stay in the roadmap indefinitely. Discovery is on by
default and its post-commit context currently includes every planned task
title. The active file has no archive or compaction operation.

Separately, task creation can advance beyond `999`, but trailers, decision
anchors, and sprint validation assume exactly three digits. This is a hidden
compatibility boundary rather than a deliberate product limit.

The larger issue is not whether one project reaches one thousand tasks. It is
that Foreman currently has no explicit lifecycle for old state.

## Where the pessimistic review needs qualification

### The roadmap is constrained, not completely immutable

Dependencies, statuses, notes, kinds, and document references can already
change. The product gap is narrower and more actionable: descriptive truth
and planned file surfaces need supported correction.

### Prompt length is not itself a failure

Foreman's benchmark handoffs are substantially longer than equivalent
free-form briefs. That is an upfront context cost, but a longer prompt can
still reduce total cost by preventing rediscovery and failed work.

The unresolved question is where the crossover occurs. Foreman needs
benchmarks for:

- trivial, well-specified changes;
- routine changes with a fresh brief;
- stale or conflicting briefs;
- high-risk changes with meaningful constraints;
- multi-session work where saved context has compounding value.

The correct product response is likely a short default handoff and an
optional reinforced handoff, not indiscriminate prompt reduction.

### The benchmark harness is stronger than the headline marketing

The harness contains equal-information free-form, generic-template, and
Foreman arms in addition to the deliberately thin one-line arm. It also uses
mechanical correctness and file-integrity checks.

The limitation is claim scope. Three adversarial bug-fix fixtures support a
narrow conclusion about truth-grounding guardrails. They do not validate
onboarding, recommendation quality, roadmap maintenance, interruption
recovery, decision notes, or sprint adoption.

### Decision notes are not inherently mis-scoped

A task whose deliverable is one decision can sensibly own one decision
document. Problems arise when an implementation task makes several unrelated
decisions or when one decision spans several tasks.

The feature should either:

- remain limited to explicit `kind: "decision"` entries; or
- use independent decision IDs and allow tasks to reference several of them.

It should not silently assume that every ordinary task maps to exactly one
decision.

## Product conflicts and their resolution

| Conflict | Current tension | Resolution |
| --- | --- | --- |
| Editable truth vs. audit history | Core task descriptions remain stale so history is preserved | Let Git retain history; make the active record editable with guarded revisions |
| Determinism vs. user intent | Mechanical ranking is described as the best task | Present a reasoned default, accept hints, and let the user choose |
| Cheap selection vs. grounding | Fast picks avoid investigation while marketing implies current truth | Offer explicit Fast pick and Reconcile and pick outcomes |
| Automation vs. consent | Some inferred work can be logged or changed through surrounding workflow | Automate facts; confirm judgments and new intent |
| Repository ownership vs. scale | One durable file grows forever | Separate active and archived state and add validation/migration |
| Reliability vs. simplicity | Safety options have become setup questions | Use safe defaults and progressive disclosure |
| Narrow coordination vs. workflow system | Prompt crafting, decisions, checkpoints, and sprint expand the surface | Protect a small core; keep advanced capabilities experimental or separate |

## Proposed product model

Foreman should own four jobs:

1. Maintain a durable and correctable repository-owned roadmap.
2. Present a deterministic, explainable ordering of ready work.
3. Produce a task brief that checks its assumptions before editing.
4. Reconcile completed work back into roadmap and Git evidence.

Everything else must justify itself by strengthening one of those jobs.

### Roadmap correction

Add a guarded `update` operation for:

- `title`;
- `why`;
- `what`;
- `kind`;
- the planned file surface.

Every update should accept `expected_updated_at` or a numeric revision so a
stale session cannot overwrite a newer correction. The update result should
return the changed fields and immediate graph facts.

Git is the audit trail. Foreman does not need to preserve obsolete prose in
the active entry merely to prove it once existed.

Split the overloaded path record:

- `planned_touches`: mutable prediction used for pre-work collision checks;
- `observed_touches`: mechanically derived from linked commits.

An alternative is to keep only the planned surface and derive observed files
from Git when needed. The important rule is that forecast and history must no
longer share one append-only array.

### Roadmap validation and repair

Add a `doctor` command that validates:

- required fields and field types;
- unique valid IDs;
- known status, source, and kind values;
- valid dates and paths;
- dependency existence;
- dependency cycles;
- duplicate or suspiciously similar entries;
- stranded dependencies;
- terminal tasks with missing evidence;
- unsupported configuration values;
- schema-version compatibility.

Safe corrections should be available as explicit repair operations.
Ambiguous repairs should be presented for approval.

Every mutation should validate the entire structural contract, not merely
that each line is valid JSON.

### Active and archived state

Add `archive` and `restore`. Terminal entries should remain available for
history and duplicate detection without dominating normal operations.

Possible storage shapes:

1. `ROADMAP.jsonl` for active work and `.foreman/archive.jsonl` for terminal
   history.
2. One file with an archive index that normal commands exclude mechanically.

The first option is easier to inspect and bounds the active file. Moving an
entry must be atomic and preserve its ID.

### Lifecycle state

Foreman currently uses `in_progress` for several meanings:

- actively executing;
- blocked after partial work;
- verification failed;
- implementation and verification completed but awaiting acceptance.

A clearer minimal lifecycle is:

```text
planned -> active -> awaiting_acceptance -> done
    |         |                |
    +-> deferred               +-> active
    +-> dropped
```

`awaiting_acceptance` is not an `in_review` platform. It is the explicit
human checkpoint Foreman already implements implicitly, especially in sprint
runs.

If a new status is rejected to preserve schema simplicity, the same
distinction needs a mechanically derived field rather than free-text notes.

### Explainable recommendation

Keep the deterministic sorter, but change the presentation:

- “Recommended because it unblocks four open tasks.”
- “Recommended because it matches your authentication hint.”
- “Recommended because it is the oldest ready task after an otherwise exact
  tie.”

Fix collision matching by sharing one normalized, prefix-aware implementation
between normal picks and sprints.

Do not add estimates, deadlines, categories, or numeric priorities without
evidence. If recommendation overrides are frequent, test one minimal user
signal such as a temporary `focus` marker before adopting a full priority
system.

### Two confidence modes

Expose two user outcomes without requiring workflow vocabulary:

- **Fast pick:** deterministic ordering, compact candidate choice, selected
  task preflight, and a handoff that verifies its hypotheses during work.
- **Reconcile and pick:** investigate near-term candidates, propose concrete
  roadmap repairs, apply approved changes, then recommend.

Fast pick remains the default. Reconciliation remains explicit because its
cost is materially different.

### Safe commit primitive

All Foreman execution modes should share one commit implementation:

1. Snapshot HEAD, index, worktree, and untracked files.
2. Refuse automated checkpointing on a dirty tree unless the user first
   resolves it.
3. Determine the task-owned delta.
4. Stage only task-owned files and the roadmap close.
5. Compare the staged set with the expected set.
6. Stop on unrelated files.
7. Commit with the canonical task link.
8. Attest the post-commit boundary.

If the user wants to work in a dirty tree, Foreman may execute without
automated commits. It must not turn unrelated changes into checkpoint
content after a warning.

### Recoverable initialization

Reinitialization must not clear an existing roadmap after a failed snapshot.
Offer:

- retry after fixing Git;
- write a timestamped backup;
- continue without a snapshot after explicit confirmation;
- cancel.

Initialization should stage only the files it owns and preserve unknown
configuration keys.

## Simpler onboarding

The normal initialization path should ask:

1. What is this project?
2. What are its next few goals?
3. Does this draft look right?

Use safe defaults for everything else:

- verification confirmation on;
- completion gate off;
- discovery off;
- decision notes off;
- execution recommendations off;
- default prompt profile;
- no custom checkpoint policy.

Ask about optional behavior when it first becomes relevant, then remember the
choice:

- discovery after Foreman finds the first plausible opportunity;
- decision notes when the first explicit decision task is created;
- checkpoint policy when the first split run is requested;
- execution recommendation only when the user asks for it.

The product may keep specialized commands internally, but normal interaction
should have one conceptual entrance: add work, show status, correct work, pick
work, or run a short batch.

## Handoff profiles

Use two prompt profiles:

### Standard

For fresh, ordinary, low-risk work:

- goal;
- relevant files and symbols;
- known constraints;
- verification;
- concise truth-grounding rule;
- closure evidence.

### Reinforced

For stale, conflicting, risky, multi-session, or highly constrained work:

- full truth-grounding block;
- scope-discipline block;
- invariants;
- expected file surface;
- decision context;
- bounded recovery and verification rules.

Foreman can recommend reinforced mode from mechanical signals such as missing
paths, recently changed files, conflicting references, or a resumed task.
The user should not be interviewed about XML sections, tone, or output
schemas during ordinary roadmap work.

Generic prompt construction should become an advanced surface or a separate
product capability.

## Feature disposition

| Feature | Disposition | Condition |
| --- | --- | --- |
| Repository-owned roadmap | Keep as core | Add correction, validation, archive, and migration |
| Deterministic recommendation | Keep as core | Soften claim and explain reasons |
| Task handoff | Keep as core | Standard and reinforced profiles |
| Commit/status reconciliation | Keep as core | Automate facts and confirm completion |
| Survey | Convert | Must propose and apply approved repairs |
| Sprint | Removed at the 1.0 close | Reuse the shared safe commit primitive |
| Discovery | Default off | Remove whole-backlog context injection |
| Decision notes | Optional extension | Prefer explicit decision tasks or independent decision IDs |
| Generic prompt builder | Advanced or separate | Do not burden normal roadmap use |
| Model/effort advice | Removed at 1.0 | Do not persist telemetry without a consumer |
| Checkpoint branches | Keep conditionally | Never absorb dirty-tree work |
| Rejected-task retention | Archive | Keep out of the active roadmap |

## Release sequence

### P0 — Trust release (SHIPPED, verified at 1.2.1)

All nine landed; kept as the record of what the trust release covered.

- replace broad staging with task-owned staging;
- block automated checkpointing on dirty trees;
- stop destructive reinitialization after failed snapshots;
- add task-description and planned-surface correction;
- add structural roadmap validation;
- add prefix-aware collision detection to normal picks;
- support IDs beyond three digits;
- remove the full planned-title list from post-commit context;
- align public claims with fast-pick and post-commit behavior.

### P1 — Lifecycle release (SHIPPED)

- add `awaiting_acceptance` or an equivalent structured distinction;
- add archive and restore;
- separate planned and observed file surfaces;
- make survey persist approved corrections;
- add schema versioning and migrations;
- make every status view resolve commit evidence consistently;
- add branch-safe duplicate-ID detection and merge repair.

### P2 — Simplicity release (SHIPPED)

- quick initialization;
- progressive optional settings;
- one conceptual product entrance;
- standard and reinforced handoff profiles;
- advanced placement for generic prompt construction;
- first-use configuration for optional decision and checkpoint behavior.

### P3 — Evidence-gated expansion

Use real product evidence to decide whether to expand:

- sprint execution — surface deleted at the 1.0 close; entry 145 dropped;
- decision retrieval;
- model recommendations — surface deleted (CHANGELOG.md:137); entry 146 dropped;
- richer prioritization — still planned as entry 147;
- parallel execution — superseded: never-listed at SCOPE.md:411 (no 1.x release, major version + written reason only); entry 148 dropped.

Decided since: 145 dropped and sprint deleted at the 1.0 close; 146 dropped
(model advice removed); 148 dropped (never-listed in SCOPE.md:411); only 147
(richer prioritization) is still planned.

## Product evidence required

The next evaluation program should measure Foreman, not only the tasks it
hands off.

### Where these are measured

`scripts/health/` is the measurement home. `roadmap-health.js` computes the
mechanical metrics from a roadmap and its archive alone — deterministic, free,
no model call, and no default pointing at a live roadmap. `TRIALS.md` defines
the usage-dependent ones as opt-in project trials: counts, booleans, and menu
ranks only, never titles, rationales, paths, or ids, logged locally to
`.foreman/trial-log.jsonl` and deletable at any moment. Half of this records
today — see TRIALS.md, which is the canonical status; only the model-side
events remain unwired. The health tool already computes their rates from a log.

| Metric | Status |
| --- | --- |
| Recommendation acceptance | Trial-gated |
| Override rate | Trial-gated |
| Hint success rate | Trial-gated |
| Stale entries (>30 days) | Derivable now |
| Corrections | Derivable now — survey breadcrumbs and `correct`'s own applied-correction stamp are both counted; the applied half is a floor on any roadmap corrected before that stamp shipped |
| Stranded dependencies | Derivable now |
| Duplicate tasks | Derivable now |
| Archive growth | Derivable now |
| Merge repair | Derivable now |

`attention-cost.js` covers the "Attention and cost" and "Execution and
recovery" lists below, on the same terms and from the same trial log. Three of
its seven metrics fall out of the split between a task's predicted and observed
file surfaces and out of the two handoff profiles' own fixed text; the other
four are facts about a person being set up, questioned, interrupted, or
recovering, and no file records them.

| Metric | Status |
| --- | --- |
| Task-to-commit accuracy | Derivable now — precision and recall of `planned_touches` against `observed_touches` on every closed entry, matched with the CLI's own prefix-aware rule |
| Dirty-file capture | Derivable now — observed minus predicted, corroborated against the scope-drift note the close already stamps |
| Prompt overhead | Derivable now — the fixed guardrail text each handoff profile is required to carry, as a standard-versus-reinforced ratio |
| Setup to first useful task | Trial-gated — one sample per project, so a single trial reports a number, not a median |
| Questions per task | Trial-gated — per task *taken*; nothing marks a task completed in the log, and the report says so |
| Commit-time interruptions | Trial-gated — broken down by refusal reason, since a dirty-tree refusal is the design working and an unexpected-file stop is a wrong prediction |
| Interrupted or failed-run recovery | Trial-gated — with a labeled proxy counting interrupted runs, which is not the same number and is never reported as one |

Three items on those lists are deliberately not in that table. Context cost
across the project lifecycle and reinforced-handoff savings on risky work stay
with the benchmark harness in the marketplace repo's `benchmarks/foreman/runner/`, where a real session's
tokens are already measured — they are prompt questions, not roadmap ones.
Partial sprint recovery is not defined at all while sprint remains
experimental: measuring it would argue for keeping it.

Defining a measurement is not adopting it. No skill or hook records anything,
and no recommendation changes because of these numbers until the evidence
exists to justify it.

### Recommendation quality

- first recommendation acceptance rate;
- override rate and stated reason;
- hint success rate;
- frequency of choosing a task outside the top three;
- recommendation changes after reconciliation.

### Roadmap health

- corrections per active task;
- stale-entry rate after 30 and 90 days;
- stranded dependency count;
- archive growth versus active growth;
- duplicate-task rate;
- merge and repair success.

### Attention and cost

- time from initialization to first useful task;
- questions per completed task;
- commit-time interruptions;
- context cost across the full project lifecycle;
- simple-task prompt overhead;
- reinforced-handoff savings on stale or risky work.

### Execution and recovery

- correct task-to-commit association rate;
- unrelated-file capture rate;
- interrupted-run recovery success;
- failed-verification recovery success;
- partial sprint recovery success;
- percentage of tasks left in ambiguous active state.

### Reproducibility

Published benchmark claims should include:

- exact fixtures and prompts;
- model and configuration;
- repetition count;
- aggregate and per-repetition results;
- date and environment notes;
- claim-specific limitations.

Raw private transcripts need not be published. The result records supporting
public claims should be.

## Product principles going forward

1. **Current truth is editable.** Git preserves history; the roadmap reflects
   the best-known present.
2. **Automate facts, confirm judgments.**
3. **A recommendation explains itself and remains overridable.**
4. **Dirty work is never swept into a Foreman commit.**
5. **Optional sophistication appears only when needed.**
6. **Fast and grounded are distinct confidence levels, not interchangeable
   marketing terms.**
7. **Active state stays small enough to understand.**
8. **No new coordination feature outranks roadmap repairability.**

## Exit criteria for renewed expansion

Foreman is ready to expand beyond the trust and lifecycle work when:

- any active task can be safely corrected without direct file editing;
- roadmap validation detects structural and lifecycle corruption;
- normal commits cannot absorb unrelated pre-existing work;
- reinitialization has a confirmed recovery path;
- active and historical tasks have a deliberate lifecycle;
- recommendation reasons are visible and override behavior is measured;
- public claims match the actual confidence stage;
- interrupted work has a tested, understandable recovery path;
- product metrics show that users benefit from the core without learning the
  internal coordination system.

Until those conditions hold, further workflow sophistication increases the
cost of correcting the foundation.
