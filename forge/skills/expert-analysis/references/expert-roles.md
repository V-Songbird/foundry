# Expert role catalog

The `/expert-analysis` skill dispatches one `forge-expert` subagent per chosen domain (Fable, read-only, bounded `maxTurns`). This file is the orchestrator's selection catalog: which domains apply to which features, and the stack-specific addendum to pass when the orchestrator knows the consuming project's stack.

The role archetype itself ("you are a senior X engineer who finds the integration points first…"), the citation discipline, the return-format template, and the read-only constraints all live in `forge/agents/forge-expert.md`. The orchestrator only passes the **domain key** (e.g. `performance`) and an optional **stack-experience addendum** in the dispatch prompt — see the `/expert-analysis` Dispatch Template. Expert-selection guidance (the three questions, cap, merge rule, user-override) lives in the `/expert-analysis` Dispatch Template's "Picking experts" section.

## Domain catalog

### Architecture (almost always)

When to pick: any feature that adds new modules, integrations, or cross-cutting concerns. Skip only for trivial localized changes (single-method bug fix).

### Performance

When to pick: feature touches a hot path (UI render loop, request handler, batch processor, large-dataset operation), introduces background work, or changes data volumes.

### Data / State

When to pick: feature changes persistence shape, introduces migrations, alters state machines, or affects shared mutable state.

### UI / UX

When to pick: feature is visible to end-users — new dialog, new control, new gesture, new keyboard binding, layout change, accessibility-relevant change.

### Security

When to pick: feature crosses a trust boundary (user input → execution, external network → parser, untrusted file → memory), handles credentials / tokens / PII, or changes permission checks.

### Testing

When to pick: feature is behavior-changing AND the area has existing tests (so a testing expert can recommend additions). Skip when adding tests is part of a separate step or the area is untested by design.

### Build / Tooling

When to pick: feature changes the build pipeline, packaging, dependencies, or CI/CD. Rare; usually only for plumbing-level changes.

## Stack-specific role tuning

When the orchestrator knows the stack, sharpen the role with a one-line addendum:

| Stack | Architecture line addendum |
|---|---|
| .NET / WPF | "with deep experience integrating new tools into mature WPF applications" |
| JetBrains plugin | "with deep experience extending IntelliJ Platform plugins" |
| React / TypeScript | "with deep experience evolving large React codebases" |
| Node.js backend | "with deep experience operating large Node.js services" |
| Python / FastAPI | "with deep experience scaling Python service codebases" |

The orchestrator splices the addendum into the `<STACK / DOMAIN-SPECIFIC EXPERIENCE>` slot in `/expert-analysis`'s template. If the stack is unknown, leave the slot empty rather than guessing.
