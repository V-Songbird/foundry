# Razor product review and decision-quality plan

**Status:** SUPERSEDED by `razor-product-strategy-groundtruth-2026-07-28.md` — its ground-truthed rewrite; read that instead
**Date:** 2026-07-27
**Scope:** Razor as a standalone product. Host-specific mechanics matter only
when they change the product's reliability, safety, cost, or user experience.

## Executive conclusion

Razor has a strong product insight: codebase expansion should be intentional.
A new dependency, subsystem, or unusually broad change deserves a second look
before it becomes maintenance work.

The current product overstates what it can decide. Razor can reliably observe
some expansion events, but it usually cannot determine whether the expansion
is unnecessary. Dependency names, file counts, searches, insertions, and
deletions are signals. They are not judgments about architecture.

Razor should therefore enforce **decision checkpoints**, not enforce
minimality:

- objective facts and explicit project policy may block;
- high-confidence expansion events may require one retryable checkpoint;
- heuristic concerns may advise but never deny;
- explicit requirements, correctness, compatibility, security,
  accessibility, and clarity always outrank smaller diffs.

This preserves Razor's broader ambition without pretending that a counter or
regular expression can recognize YAGNI.

## What the pessimistic review established

### Product defects to fix

The following are correctness or truthfulness problems, not matters of taste:

- an already declared dependency can be described as new;
- a manifest declaration is described as an installed package;
- versioned and unversioned package specifications do not share one decision;
- Python project-local absolute imports can be mistaken for external packages;
- source examples in comments can be mistaken for real imports;
- type-only imports can disappear from dependency usage;
- pre-existing dirty work can be attributed to the current task;
- common source formats and distribution-to-import mappings can produce false
  unused-dependency findings;
- the published benchmark table and the shipped reproduction corpus have
  drifted apart;
- public claims such as enforcement, flawless behavior, and supply-chain
  protection exceed the evidence.

These defects should be repaired before expanding Razor's scope.

### Product choices to revisit

Several current behaviors are internally consistent but rest on weak product
assumptions:

- one line is treated as better than several clear lines;
- one search is treated as enough for every codebase;
- post-edit searching is treated as likely waste;
- new-file count is treated as a proxy for architectural sprawl;
- deletion-positive diffs are treated as a goal;
- a user-named library is treated as a suggestion Razor may replace;
- every ecosystem named by the command guard appears more fully supported than
  it is.

These behaviors need explicit product principles and balanced evidence. More
parser exceptions will not settle them.

### What remains valuable

The implementation is disciplined. State isolation, atomic writes,
retry behavior, cleanup, edit simulation, and test coverage are strong
foundations.

A retryable checkpoint is also real enforcement, but only of the checkpoint
itself. The accurate claim is:

> Razor enforces one reconsideration before selected forms of codebase
> expansion.

It does not enforce that the final implementation is minimal, correct, or
necessary.

## Product objective

Razor should optimize for **long-term change burden**, not visible code size.

The decision order is:

1. explicit user and project requirements;
2. correctness and target compatibility;
3. security, accessibility, and protection from data loss;
4. maintainability and clarity;
5. operational, dependency, and public-API burden;
6. diff and file size.

Minimality selects among otherwise sound solutions. It does not override the
constraints above it.

### Revised product promise

> Razor adds an evidence-backed second look before an agent expands a
> codebase—through new dependencies, new structure, or an unusually broad
> change—without overriding explicit requirements or project policy.

### Revised guidance ladder

1. What outcome and constraints were explicitly requested?
2. Is the proposed change necessary to achieve that outcome?
3. Is there an existing project implementation or convention to reuse?
4. Does a supported built-in satisfy the required behavior on the target
   runtime?
5. Is an approved direct dependency clearer or safer?
6. Would a new dependency reduce total risk or maintenance burden?
7. Implement the smallest clear, verified change.

The ladder should not prescribe one line, one search, or suppressed
deliberation. An established dependency may be the leaner system choice for
cryptography, protocols, Unicode, parsing, validation, and other
edge-case-heavy domains.

## Product authority model

Razor needs one consistent mapping from evidence to authority.

| Input | Example | Allowed action |
| --- | --- | --- |
| Objective fact | A package is not a direct dependency | Report |
| Explicit project policy | A package is blocked | Require approval |
| High-confidence expansion | A new direct dependency is being added | Retryable checkpoint |
| Heuristic signal | A change adds many production files | Advisory |
| Low-confidence inference | Repeated searches might be redundant | Silent or telemetry only |

No heuristic should emit the same kind of denial as an objective policy
violation.

## Feature decisions

### Dependency decisions become the flagship capability

Razor should introduce ecosystem resolvers that produce structured evidence:

```json
{
  "package": "axios",
  "canonicalName": "axios",
  "ecosystem": "node",
  "targetManifest": "packages/api/package.json",
  "declaredDirectly": false,
  "installedResolvable": false,
  "workspaceDeclared": false,
  "policy": "approval-required",
  "requestedSpec": "^1.8"
}
```

The resolver must:

- canonicalize versions, extras, scopes, aliases, and manager-specific specs;
- distinguish declared, locked, resolvable, transitive, and
  workspace-provided packages;
- select the correct manifest in a workspace or monorepo;
- skip the new-dependency checkpoint for an existing direct dependency;
- parse manager-specific flags without treating their values as packages;
- state declared and installed evidence accurately;
- share one decision identity across commands, imports, and manifest edits.

The default checkpoint should explain the fact and the relevant alternative.
It should not claim that every new dependency is needless.

### Import analysis becomes syntax- and resolver-backed

Razor's own implementation may use parsers and resolvers. Internal tooling
does not add a dependency to the target project, so avoiding an accurate
parser on principle is a false economy.

Import analysis should:

- ignore comments, strings, and documentation examples;
- resolve project-local Python packages and JavaScript path aliases;
- recognize workspace packages;
- count type-only imports as build-time dependency usage;
- classify test imports as development usage instead of exempting them;
- derive Python distribution-to-import mappings from metadata when available;
- analyze the resulting file, not only an edit fragment;
- stay silent or advisory when resolution is uncertain.

### Manifest coverage uses the same ecosystem adapters

Command recognition, import analysis, manifest edits, and audits should share
one support model. Razor should publish explicit tiers:

| Ecosystem | Commands | Imports | Manifest edits | Audit |
| --- | --- | --- | --- | --- |
| Node | Full | Full | Full | Full |
| Python | Full | Full | Full | Full |
| Rust | Command-only | Unsupported | Experimental | Unsupported |
| Go | Command-only | Unsupported | Experimental | Unsupported |
| Other recognized managers | Best effort | Unsupported | Unsupported | Unsupported |

Node coverage should include runtime, development, optional, peer, workspace,
and override declarations where they affect the decision. Python coverage
should include `pyproject.toml`, dependency groups, optional dependencies,
Poetry groups, and included requirements files.

### New-file counting becomes change-shape advice

The default product should not deny the fifth file.

Razor should instead summarize the shape of the task delta:

```text
7 production modules
2 tests
1 migration
1 configuration file
```

The advisory should compare this shape with nearby project structure and ask
whether the separation reflects real responsibilities. Tests, migrations,
generated files, documentation, fixtures, configuration, and production
modules must not be treated as equivalent.

A raw file-count ceiling may remain as an opt-in project policy.

### Search counting leaves the default product

Search count is too weakly related to engineering quality to justify a
default gate. Razor should disable the current search meter by default.

Any successor should target exact or near-exact repeated searches that return
no new evidence. Different symbols, scopes, purposes, and post-edit
verification should remain silent. Until that distinction is reliable, the
feature belongs in local telemetry or an experimental mode.

### The build ledger becomes a task-owned scope review

At task start, Razor should capture:

- the commit;
- the complete tracked diff baseline;
- staged state;
- untracked file identities and, where useful, hashes;
- the task or prompt boundary.

The review should calculate only the delta attributable to that task,
including untracked LOC. It should report change shape and ask whether it
matches the request. It should not praise deletion or infer that a large
addition is unnecessary.

### Controls become coherent modes

Lifecycle commands should have distinct meanings:

- `off` pauses checks without deleting decisions;
- `on` resumes the paused state;
- `reset` begins a fresh decision ledger;
- `status` shows the active mode, support level, policy, and decisions.

User-facing modes should be:

- **advisory** — facts and nudges, never denies;
- **guarded** — one retryable checkpoint for high-confidence expansion;
- **policy** — explicit project-policy violations require approval.

Advanced configuration can remain available, but the product should no
longer claim that it has no dials.

### The unused-dependency command reports confidence

Audit results should have three buckets:

- **confirmed unused** — resolver-backed; no source, type, config, script,
  binary, workspace, or peer usage;
- **likely unused** — static evidence suggests removal, with named blind
  spots;
- **unknown** — usage cannot be resolved safely.

The audit should:

- inspect workspace packages independently;
- understand common component and configuration source formats;
- count type-only usage;
- use package metadata for Python import mappings;
- follow requirements includes and dependency groups;
- inspect development dependencies instead of suppressing the whole class;
- respect configured ignores;
- delegate to an available ecosystem resolver or bundle one inside Razor.

The command should remain report-only.

## Decision-engine architecture

Every feature should emit evidence into one decision pipeline:

```text
observed change
  -> ecosystem analyzer
  -> structured evidence and confidence
  -> project policy
  -> silent | advisory | retryable checkpoint | approval required
```

A decision record should carry:

```json
{
  "feature": "new-dependency",
  "subject": "axios",
  "confidence": "high",
  "facts": {
    "directlyDeclared": false,
    "nativeAlternative": "global fetch",
    "targetRuntimeSupportsAlternative": true
  },
  "policy": "approval-required",
  "action": "checkpoint"
}
```

This separates observation from authority and prevents weak signals from
accidentally behaving like policy.

## Project policy

Razor should support a small repository-owned policy file:

```json
{
  "mode": "guarded",
  "dependencies": {
    "allowed": ["pg", "zod"],
    "blocked": ["request"],
    "approvalRequired": ["*"]
  },
  "targetRuntimes": {
    "node": ">=20",
    "python": ">=3.11"
  }
}
```

Policy should remain optional. Defaults must be useful without setup.

Explicit user requirements remain authoritative unless they conflict with a
repository policy that requires approval. A casual suggestion may be
reconsidered; an explicit compatibility or architecture constraint should
not be silently replaced.

## Evidence and public claims

### Freeze every published benchmark

Each published result must identify:

- the Razor commit;
- the benchmark corpus commit or content hash;
- the exact task list;
- comparison-arm revisions;
- model and runtime versions;
- repetition counts;
- scorer version;
- the result artifact supporting the claim.

Public tables should be generated from immutable result files. Validation
should fail when a number cannot be traced to the frozen corpus that
produced it.

### Add a balanced counter-suite

Razor must also be tested where expansion is correct:

- a database client is required;
- a target runtime lacks the proposed built-in;
- a security-sensitive parser should use an established library;
- Unicode or protocol requirements make a one-line implementation wrong;
- multiple explicit implementations justify an abstraction;
- a feature legitimately needs several production files, tests, and a
  migration;
- a safe rename requires broad post-edit searching;
- a repository is dirty before the task starts;
- an approved existing dependency is clearer than bespoke code.

### Measure the right outcomes

Evaluation priority should be:

1. requirement compliance;
2. hidden-test correctness;
3. security and compatibility;
4. maintainability and readability;
5. dependency-policy adherence;
6. cost and latency;
7. diff size.

LOC and file count remain useful diagnostics, not quality scores.

Component ablations should compare:

- guidance only;
- dependency checkpoints only;
- structural heuristics only;
- the complete product.

Features that do not improve outcomes without harming correctness should be
removed.

## Release sequence

### P0 — Truth release

- align public positioning with checkpoint enforcement;
- distinguish declared from installed dependencies;
- remove unsupported absolute correctness and security claims;
- freeze the corpus behind every published benchmark;
- disable the search meter by default;
- mark structural heuristics as advisory or experimental.

### P1 — Decision-quality release

- introduce the shared evidence and authority model;
- canonicalize dependency identity and select the correct workspace manifest;
- replace regular-expression import classification;
- complete Node and Python manifest parity;
- capture a true task-owned build baseline.

### P2 — Policy and lifecycle release

- add optional repository policy;
- add advisory, guarded, and policy modes;
- add clear pause, resume, reset, and status behavior;
- replace the file denial with change-shape review;
- rebuild the unused-dependency audit around confidence tiers.

### P3 — Evidence-gated expansion

- run the balanced counter-suite;
- run feature ablations;
- publish frozen result records;
- keep broader structural intervention only if it improves correctness and
  maintainability without unacceptable friction.

## Product principles going forward

1. **Correctness and explicit intent outrank minimality.**
2. **Automate facts; expose uncertainty; confirm judgment.**
3. **Only policy and high-confidence evidence may interrupt work.**
4. **Heuristics advise; they do not deny.**
5. **Razor may be internally sophisticated to keep target projects simple.**
6. **Support is stated per capability, not inferred from a manager name.**
7. **A smaller diff is evidence, not proof of a better system.**
8. **Every public number maps to a frozen result artifact.**
9. **Project expansion is allowed; accidental expansion is the problem.**

## Exit criteria

Razor is ready to claim a broader anti-overengineering role when:

- an existing direct dependency never triggers a new-dependency checkpoint;
- dependency identity is shared across command, import, and manifest paths;
- local imports, comments, strings, tests, and type-only imports are
  classified correctly in supported ecosystems;
- the support matrix matches actual feature coverage;
- task reviews exclude pre-existing dirty work and include new untracked LOC;
- structural heuristics are advisory by default;
- audit findings carry defensible confidence labels;
- explicit user constraints and repository policy have predictable
  precedence;
- every published benchmark is reproducible from the shipped repository;
- balanced tasks show that Razor accepts justified dependencies,
  abstractions, file growth, and verification;
- evidence demonstrates lower maintenance burden without lower correctness.

Until those conditions hold, Razor should lead with dependency decision
quality and describe broader scope controls as experimental.
