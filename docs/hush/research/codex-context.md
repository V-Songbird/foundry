# Hush Codex Port

This bounded context describes the Codex sibling of hush. It separates delivery guarantees from compression work so future implementation and benchmark claims stay precise.

## Language

**Claude hush**:
The existing, calibrated Claude Code plugin under `hush/`. It is read as source evidence and is never changed by the Codex port.
_Avoid_: legacy hush, old hush

**Codex sibling**:
The future independently packaged Codex plugin, tentatively named `hush-codex`. It shares the product goal but has its own manifest, hook adapters, skills, tests, and measurements.
_Avoid_: conversion, replacement

**Report contract**:
Short model-visible guidance that asks for silent work and a concise outcome-first report. It is advisory because Codex has no documented forced output-style slot.
_Avoid_: output style, hard enforcement

**Forced slot**:
A host feature that installs a style at a priority or registration point that normal prompt context cannot displace. Claude hush uses `force-for-plugin`; no Codex equivalent is documented or observed.
_Avoid_: skill, hook context

**Result-replacement adapter**:
A host mechanism that substitutes a completed tool result without turning success into failure. The tested Codex CLI does not currently provide one suitable for hush.
_Avoid_: `updatedToolOutput` adapter

**Source-capture runner**:
A command execution boundary that captures raw shell output before Codex records a tool result, then delivers a bounded digest and a retrievable full-output sidecar.
_Avoid_: post-tool replacement, history truncation

**Execution contract**:
Advisory model-visible guidance that asks Codex to choose the source-capture runner for commands likely to produce noisy output.
_Avoid_: forced routing, approval grant

**Routing fallback**:
A pre-execution refusal that confirms the original command did not run and supplies an exact source-capture retry. It protects correctness when the execution contract is missed, at the cost of another model round trip.
_Avoid_: transparent rewrite, automatic approval

**History cap**:
A host-owned token budget that keeps only a bounded head-and-tail representation of an individual tool result in model history. It reduces context but is not semantic compression because relevant middle content may disappear.
_Avoid_: hush digest, lossless compression

**Safe alternative**:
A narrower behavior that preserves hush's intent without pretending unsupported host behavior exists. It must never hide errors, silently alter tool side effects, or claim a token saving it cannot measure.
_Avoid_: compatibility shim, best effort

**Deferred surface**:
A Codex surface or feature that has no documented support or has not passed the required live acceptance test. It is not advertised as supported.
_Avoid_: supported with caveats
