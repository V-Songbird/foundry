---
status: accepted
date: 2026-09-09
---

# Public research and evidence in Foundry

## Decision

Foundry publishes original research, methodology and retained benchmark evidence
under its central `docs/<plugin>/` and `benchmarks/<plugin>/` directories. Shared
decisions stay under `docs/shared/adr/`. Product README files, usage guides and
plugin-specific decisions accompany the corresponding plugin edition.

Source project names and fair attribution are allowed in research, documentation
and commit messages. They are not confidential merely because they describe
another tool. A private-name blocklist is not part of the publication policy.

Preserve the actual model, revision, settings, dates, negative results and
limitations of each measurement. Do not relabel evidence across platforms or
invent missing artifacts. Credentials, copied account homes, personal session
state, dependencies and disposable execution workspaces remain outside the
distributed material. Review third-party text for appropriate attribution and
redistribution rather than treating a copied article as original research.

## Context and scope

The owner explicitly chose public research during the repository reconciliation
and kept extensive research outside installable plugins. This supersedes the
blanket prohibition on publishing run data in ADR 0004. It also supersedes that
prohibition wherever ADRs 0001, 0002 and 0003 refer to it. Requirements for real
data, readable graphics and disclosed historical measurements still apply.

## Consequences

Retain older ADR text as decision history, with an explicit supersession marker.
Maintain one publication policy across both development clients. Legacy hook
entry points may remain inert for older local installations; they must not
enforce the retired name restriction.

Migration of existing ignored result directories requires a content inventory
before distribution. This decision does not claim that every historical result
is already versioned, portable or cleared of copied account/session material.
