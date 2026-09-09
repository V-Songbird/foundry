# Foreman Codex context

This glossary defines the current Codex sibling without collapsing host-specific runtime concepts.

**Shared roadmap**  
The single committed project-root `ROADMAP.jsonl` used by both Foreman editions. There is no Codex copy or import.

**Archive ledger**  
The project-owned `.foreman/archive.jsonl` containing terminal entries moved out of active reads. It follows the same format and guarded-helper rules as the active roadmap.

**Roadmap format 2**  
The current format marker and lifecycle semantics that split predicted `planned_touches` from append-only `observed_touches`.

**Planned touches**  
An editable prediction of expected file scope. It informs collisions and commit-ranking hints but is never proof that work occurred.

**Observed touches**  
Append-only paths derived from recorded commit evidence or explicitly supplied when Git cannot provide them. They describe history and do not expand future authorization.

**Awaiting acceptance**  
Work with recorded completion evidence that still needs user verification. It is open, not a candidate, and not archive-eligible.

**Mechanical core**  
The scripts that parse, validate, lock, rank, mutate, diagnose, migrate, archive, restore, and report Foreman state deterministically.

**Explicit skill**  
One of the five user-invoked Codex workflows. No skill activates merely because an unrelated request resembles roadmap work.

**Fast pick**  
A compact, mechanically ranked selection from already-recorded roadmap state. It does not inspect the codebase.

**Reconcile-and-pick**  
An explicit deeper path that surveys a bounded near-term set, applies only confirmed repairs, reruns the compact menu, and then picks.

**Workflow-managed handoff**  
A current-task or supervised-subagent execution whose parent skill owns start, result collection, evidence, verification policy, and closing transition.

**Prompt profile**  
Either the standard or reinforced Codex handoff contract. Reinforced adds task-specific provenance and uncertainty requirements when risk signals are present.

**Commit evidence**  
Recorded SHAs and exact `Foreman:` trailers resolved in the project root or declared submodules through one shared interpreter.

**Close gate**  
A generic guarantee that an arbitrary tracked execution cannot finish while its entry remains open. This remains deferred on Codex; managed workflows still close their own entries.

**Detached resume**  
Reconnecting to the exact prior child after the parent task ends. Foreman does not promise this on Codex; durable state supports a newly crafted continuation instead.

**Deferred surface**  
A behavior omitted because current native evidence cannot support the required guarantee. Examples are the generic close gate, exact detached resume, model mapping, Workflow schema, and decision-anchor attribution.
