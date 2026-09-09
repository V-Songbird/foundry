# Navigation checker correction — 2026-09-09

Current result: the slug calculation uses the pinned upstream Unicode expression
and passes all 78 upstream fixtures. The sections below retain the earlier
progress and staged-content correction; see the final section for the evidence
that supersedes the approximate character filter.

The shared README checker now retains Unicode letters and combining marks,
preserves consecutive spaces when removing punctuation, assigns unique suffixes
to repeated heading anchors, and decodes percent-encoded fragment links.
It recognizes tilde fences and backtick fence lengths, ignores closing heading
markers, and uses the visible label of inline Markdown links.

The archived-entries heading now produces
`archived-entries--foremanarchivejsonl`, matching the GitHub anchor recorded in
the original repository audit. The previous checker incorrectly collapsed the
two spaces left after removing the em dash. Existing document links were not
changed to accommodate that incorrect algorithm.

Nineteen focused tests pass, and the root README plus all six platform edition
READMEs pass the updated checker. The canonical script is synchronized to all
six editions. All 435 protected product files remain unchanged.

This remains a lightweight README checker, not a full Markdown parser. Entity
decoding, setext headings and arbitrary embedded HTML are not comprehensively
covered. A synthetic call to GitHub's Markdown API returned heading HTML without
anchor IDs, so that call did not independently verify every new slug case.
Do not describe it as a complete GitHub rendering equivalence test. The input
and returned HTML are retained under `.scratch/consolidation/anchor-probe.*`.

## Staged-content correction

A subsequent regression test demonstrated that pre-commit selected a staged
README but validated the working file. The checker now reads `:README.md` from
Git's index. A broken staged page fails even if the working copy is fixed; a
valid staged page passes despite unrelated working edits. Staged deletion does
not attempt to read a missing index entry. Twenty navigation tests pass.

This maintenance-only follow-up was synchronized to all six editions after the
independent export and integration-snapshot reports. Those snapshots retain
their earlier checker; use the current file manifest when preparing integration.

## Upstream character and collision coverage

The approximate Unicode filter differed on 13 of 78 upstream cases. It has been
replaced by GitHub Slugger's generated expression from revision
`3461c4350868329c8530904d170358bca1d31448`. The only module adaptation is replacing
its ESM export with a CommonJS export; the expression itself is unchanged.
The ISC license accompanies every distributed copy. The fixture corpus is
retained for Foundry's tests.

All 78 fixtures now pass, including non-Latin categories, boundary spaces and
duplicate collisions. The seven current README pages pass. Twenty-one focused
navigation tests pass; the full maintenance suite has 155 passes, no failures
and one expected standalone-edition skip. The copy guard includes the expression
and license. This closes the recorded slug discrepancies; it does not turn the
lightweight heading reader into a full Markdown/HTML parser.

Source: [GitHub Slugger at the inspected revision](https://github.com/Flet/github-slugger/tree/3461c4350868329c8530904d170358bca1d31448).
Evidence: `.scratch/consolidation/upstream-anchor-tests.log` and the retained
upstream comparison under `github-slugger-reference/` in the same directory.
