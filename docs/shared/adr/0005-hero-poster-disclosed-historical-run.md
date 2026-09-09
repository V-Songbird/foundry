---
status: accepted
date: 2026-08-18
---

# A hero poster may plot a retired run, if its caption says so

## Context

ADR 0001 makes the name-as-metaphor hero poster a permanent house rule and ties
it to the records the Benchmarks section cites: "Poster artwork is generated
from the same committed records the Benchmarks section cites; regenerating a
benchmark regenerates the poster." ADR 0004 later moved those records off the
public repos without touching that same-records tie.

hush's `assets/hero.svg` no longer satisfies it. The poster was plotted
2026-08-06 from an 85-session run of a 17-task suite under `HUSH_NUDGE=max`.
The suite was rebuilt to six jobs in 1.5.0 and every table under the poster was
re-measured for 1.6.0, so the poster and the tables cite different records. No
retained batch under `benchmarks/hush/records/` carries a `HUSH_NUDGE=max` arm,
so redrawing the poster on the current suite costs a fresh paid run.

Three ways out were weighed: authorise the paid run, retire the poster, or
disclose the difference. ADR 0001 makes the poster permanent, so retiring it was
not available. The paid run is a real option and stays open — it is simply not a
precondition for the README being honest today.

## Decision

The hero poster is plotted from **real retained records**, which is unchanged
and not negotiable. It need not be plotted from the *same* records the
Benchmarks section cites.

When the poster's records come from a suite, a build, or a setting that the
tables below do not measure, **the caption under the poster names the
difference** — in the same plain voice as the rest of the README, before the
reader reaches the first table.

Every other clause of ADR 0001 stands: the metaphor is the plugin's name, one
image and one phrase and at most one number, no hand-drawn or stand-in shapes,
nothing below ~13px effective, dark-first with a light twin, and the poster
replaces only the hero.

## Consequences

- hush's hero caption names the retired 17-task suite alongside the
  `HUSH_NUDGE=max` setting it already disclosed.
- Redrawing hush's poster on the current six-job suite stays open, gated on an
  authorised max-nudge batch. It is now an improvement, not a defect.
- A poster whose records are current needs no extra caption line — the rule
  costs nothing when nothing diverges.
- The stand-in-shape prohibition is untouched. A poster that does not plot real
  runs is still forbidden, disclosed or not.

Supersedes ADR 0001's same-records clause. Decided 2026-08-18, delegated by the
owner for this consolidation pass.
