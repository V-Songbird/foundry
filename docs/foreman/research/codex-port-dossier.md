# Foreman for Codex: port dossier

> Historical Codex port dossier. Dates, versions, verdicts and paths below describe
> the recorded implementation, not a new validation of the current branch.
> Use the [plugin index](../README.md) to find current source documentation
> and the separate validation reports.

This dossier records the Codex sibling's implementation boundary as of 2026-08-08. The host-neutral baseline is Foreman `1.1.2` at `cdec583`; the sibling then lived at `plugins/foreman-codex/`. That workspace path has been retired; the plugin index above identifies the current edition.

## Current verdict

The sibling preserves Foreman's durable product contract without pretending Claude Code and Codex expose the same orchestration runtime. Both editions share one project-root `ROADMAP.jsonl`, format-2 lifecycle semantics, deterministic helpers, commit evidence, and health calculations. Codex supplies its own five explicit skills, Markdown prompt contract, JSON hook envelopes, native tool mapping, and supervised-subagent workflow.

The implemented Codex surface includes:

- `$foreman`, `$foreman-init`, `$foreman-roadmap`, `$foreman-craft-prompt`, and `$foreman-survey`;
- roadmap format 2 with `planned_touches` and `observed_touches`;
- `awaiting_acceptance`, guarded `correct`, `doctor`, `archive`, `restore`, `reassign-id`, and reconcile-and-pick paths;
- standard and reinforced prompt profiles with evidence and uncertainty signals;
- default discovery of `hooks/hooks.json`, with no duplicate manifest hooks field;
- SessionStart, native-write guard, and post-commit adapters;
- commit-evidence, config, lock, safe-commit, trial-log, roadmap-health, and attention-cost helpers.

## Honest boundary

Managed Foreman workflows own their start and close transitions. A generic Codex task-close gate is deferred because no current native event reliably maps an arbitrary stopping task to one roadmap entry. Exact detached subagent resumption is also deferred; recovery comes from durable roadmap evidence and a newly crafted handoff.

The Codex port does not translate Anthropic model names or Fable behavior, carry forward the Claude XML or Workflow schema, or inherit Claude benchmark claims. Decision-anchor hooks remain pending until a native Codex event provides reliable matcher and path extraction.

## Authority

- Repository implementation and tests define Foreman behavior.
- The current Codex manual defines supported plugin, skill, and hook packaging behavior.
- [Headless probes](../validation/codex-headless-probes.md) record historical adapter evidence, not final release evidence.
- [Validation](../validation/codex-validation.md) reserves final CLI install/trust, cache identity, test totals, and desktop lifecycle results for measured insertion by the release owner.

## Read in this order

1. [Capability matrix](../validation/codex-capability-matrix.md)
2. [Porting specification](codex-porting.md)
3. [Validation plan](../validation/codex-validation.md)
4. [Context glossary](codex-context.md)
5. [Headless probe evidence](../validation/codex-headless-probes.md)

## Official Codex basis

- [Plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [Skill packaging](https://developers.openai.com/plugins/build/skills)
- [Codex hooks](https://learn.chatgpt.com/docs/hooks)
- [Codex subagents](https://developers.openai.com/codex/subagents)
