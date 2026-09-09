---
name: coordinate-readmes
description: Coordinate a Foundry plugin's Claude and Codex README editions, preserving common product content and verifying platform-specific installation, availability and benchmark evidence. Use for paired README edits, benchmark updates or a README parity review before release.
---

# Coordinate plugin READMEs

This skill coordinates Claude/Codex edition pages. For the separate main selector,
use Foundry's check-main-frontpage.js and its selector-plus-documentation-CI contract instead; do not
copy platform sections into main. Flint is excluded from that selector policy.

Locate both platform checkouts before editing. Use `git worktree list` or inspect
the other branch read-only; preserve uncommitted work and stay off `main`.
This is a Foundry development skill, not a skill shipped inside each plugin.

Use the same product narrative, headings, section order, common outcomes and
decorative branding in both editions. Read the current Foundry README template
and `readme-parity` rule. Preserve only the six named exception blocks:
`identity`, `install`, `commands`, `compatibility`, `benchmarks`, `links`.
Each difference needs a real platform or edition reason. Do not hide a rewrite
of the shared product story inside an exception or remove a supported feature
just because the other edition lacks it; identify that availability difference.

Use the same questions and table columns for benchmarks. Check original evidence
for the actual host, model, comparison, source date and metric. Keep limitations
and negative results. A benchmark's source date is distinct from the day someone
reviewed it. Never relabel another host's measurements or turn functional tests
into performance claims. Keep the table and mark missing values `Not measured`.
Paid runs and installs need their own authorization; an evidence gap is not it.

Run Foundry's `scripts/git-hooks/check-readme-parity.js --pair <Claude-README>
<Codex-README>` and the README navigation check. For a committed pair, use
`--git-pair <plugin-repo> <Claude-ref> <Codex-ref>`. Each plugin also carries the
single-edition checker. Review benchmark sources independently of the parser;
passing a structural check does not establish experimental validity.

Report the common change, the justified exceptions, the exact pair checked and
any missing evidence. Carry shared edits to both working copies. Do not commit,
push or change repository protection settings unless that action is authorized.
For coordinated PRs, follow Foundry's `.github/README_COORDINATION.md` (also
present in each edition). Declare the opposite PR number and full head SHA in
both descriptions; rerun both checks after any head change. Candidate-pair
success is separate from the final integrated-branch comparison. Do not publish
selectors or pins until the integrated pair passes.
