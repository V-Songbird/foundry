# Final report template

This is the canonical shape `/build-and-report` produces at the end of the forge workflow. The report goes into the conversation as a single markdown block.

The section order is deliberate: outcome and verification first, then the two user-facing sections, then the plan-machinery detail last. The reader is a developer who did not follow the run and will skim — they should be able to stop after "How is this feature useful?" and have everything they need; "Plan adherence" and "What we'd improve next time" are the appendix for whoever wants the audit trail.

```markdown
# Forge run report: <feature>

## What shipped
<one short paragraph: feature name, the steps that landed, the branch / commits the user can find them on. ≤ 5 sentences.>

## Build & verification
- Build: <command> — <pass / fail; output snippet on fail>
- Tests: <command> — <pass / fail; failing test names on fail>
- Done-when criteria: <one row per step — W<N>: pass / fail / manual-smoke-required (steps if applicable)>
- Version bump: <file → version> (or "skipped — workflow did not apply" if project CLAUDE.md says so)

## How to test this feature

Steps a developer who did not follow the implementation can execute cold. Commands, URLs, and entry points are welcome; a tour of the change's internals is not.

1. <Open the application / navigate to the feature entry point.>
2. <Do the action that exercises the new feature.>
3. <Observe the expected result.>
4. <Try the edge cases: <empty input, large input, cancel mid-action, etc. — pick the 2–3 most likely-to-break scenarios>.>
5. <If the feature interacts with another feature, name the interaction and what to check.>

Success looks like: <one-sentence success criterion in plain language>.

If you see <symptom>, that means <interpretation> — <next step or "report to maintainer">.

## How is this feature useful?

The user-visible benefit. Lead with the pain or goal; describe what changes; describe what they can now do. Technical terms are fine — the reader is a dev — but no module/class walkthroughs; if the section needs a map of the implementation to make sense, it has gone too deep.

<2–4 short paragraphs. Read like a good PR description's "why", not like engineering documentation.>

Example shape:
> Before this change, you had to <old painful workflow>. Now you can <new direct path>.
>
> This matters when <real-world scenario>, because <why the new path saves time / catches a class of mistake / unlocks a new use case>.
>
> A typical use is <walked-through example>.

## Plan adherence
<one paragraph: did the implementation match the approved plan? Any deviations escalated and approved? Any deviations that slipped past the contract? Reference plan step W-IDs.>

## What we'd improve next time

<short bulleted list — at most 5 items. The orchestrator's notes from the run: planning gaps, contract overlaps that caused merge conflicts, expert-domain coverage that turned out insufficient, etc. This section feeds future forge runs; it is not user-facing.>
```

## Anti-patterns to avoid

- **Implementation jargon in user-facing sections.** "How to test this feature" describing "open `src/MainWindow.xaml.cs` and trigger the `OnFeatureClick` handler" is a fail — the reader verifies behavior from the outside. `npm run dev` and "open the settings dialog" are fine; a walkthrough of the diff is not.
- **Treating the reader as a non-developer.** The reader is almost always a dev — don't strip every technical term or pad with hand-holding. The failure mode to avoid is depth (internals tours that get skimmed past), not vocabulary.
- **Skipping the success criterion.** "Try the new feature" without defining what working looks like leaves the user unable to evaluate.
- **Marketing in "How is this feature useful?"** Avoid superlatives ("powerful", "robust", "seamless"). Describe the change concretely; the user evaluates the value.
- **Pretending the build passed when it didn't.** If the build failed, the report MUST say so prominently and STOP — do not paper over to "complete" the workflow.
