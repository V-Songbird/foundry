# ADR 0008: coordinated README editions

Accepted for local implementation by the owner, 2026-09-08. Superseded for
Foreman by [ADR 0011](0011-foreman-single-package.md): Foreman has one README
for both hosts, and the evidence rules below still apply inside it. Superseded
for Hush by [ADR 0012](0012-hush-single-package.md) on the same terms: Hush has
one README, for Claude Code. Superseded for Razor by
[ADR 0013](0013-razor-single-package.md) on Foreman's terms. The paired
README contract and Foundry's pair check remain in force for plugins with Claude
and Codex editions.

Each plugin has one shared README narrative across Claude and Codex. Product
purpose, common scope, outcomes, headings, order and decorative branding stay
identical. Native differences are explicit, bounded and reviewable.

The six exceptions are identity, installation, commands, compatibility and
actual availability, benchmark evidence, and edition-specific links. A genuine
feature gap is disclosed; it is not hidden by claiming parity or removing a
supported feature from the other edition's documentation.

Benchmarks use the same questions and metric columns. Models, setup rows,
values and empirical artwork depend on each edition's actual evidence. Missing
measurements retain the table with Not measured values. Functional tests are
not performance comparisons. A source date may be explicitly unknown; the date
of a review cannot substitute for the experiment's date.

Native rules and the coordinate-readmes skill express the same requirements in
Claude and Codex. The two documentation-review agents use identical criteria.
The release skills require the README-pair check before release edits.

Each plugin's README workflow checks its edition and compares its shared text
and benchmark columns against the opposite branch on every platform push or PR.
Foundry also checks all three committed pairs. A one-sided common edit fails
until its counterpart is updated; common changes must be delivered as a pair.
After publishing both sides, rerun an earlier failed check if it compared the
first update against the old counterpart. Existing branch-protection settings
were not changed as part of this local work.

The mechanical checker verifies structure, declarations and exact shared text.
Review still verifies sources and whether each exception has a real native
reason. README equality does not establish runtime or experimental parity.
