# Main documentation CI and ruleset reconciliation — 2026-09-09

The three prepared main selectors now carry four presentation files and two
maintenance files: the identical packaged selector checker and a workflow that
produces `test`. No plugin runtime, skills, host instructions or package manifests
were reintroduced. The allowed file set is recorded in shared ADR 0010.

## Current remote state

A fresh read-only GitHub API inspection confirms active `default` rulesets on
Foundry, Foreman, Hush and Razor. Each targets the default branch only. Foundry
requires `validate`; the plugins require `test`. Main's requirement can therefore
remain in place while its implementation changes to documentation validation.
The new edition branches still need their own rulesets.

The [concrete proposed payloads](github-ruleset-proposal-2026-09-09.json) preserve
the existing PR review, history, deletion and bypass configuration. They are a
reviewable proposal, not a record of applied settings:

| Repository / branch | Required checks in proposal |
| --- | --- |
| Foundry / default | validate; Plugin README parity; Main selectors; Benchmark instruments |
| Foreman, Hush, Razor / main | test — existing requirement retained |
| Foreman and Razor / Claude and Codex | Platform layout; README contract; Runtime tests |
| Hush / Claude | Platform layout; README contract; Runtime tests |
| Hush / Codex | Platform layout; README contract — no product runtime exists |

Each existing runtime workflow now exposes a stable `Runtime tests` gate that
requires its original test job, including every matrix leg, to succeed. Matrix
names no longer need to be guessed in a ruleset. The Razor/Codex test workflow
targets Codex; main uses the separate documentation workflow. No product tests
or their runtime implementation were changed.

## Transition order

1. Preserve the current main protections. Integrate and publish edition branches
   and their workflows through the authorized release process.
2. Verify actual check names/results on those branches. Re-read existing rulesets
   before applying the proposal so concurrent policy changes are not overwritten.
3. Add the platform rulesets after the corresponding checks exist. Use the
   reciprocal candidate protocol for common README changes; verify the final
   integrated pair before publishing selectors or catalog pins.
4. Integrate each prepared main selector through its normal PR. Its own `test`
   check validates the selector commit. A Foundry check is not a substitute.
5. Publish the reviewed Foundry changes and verify its aggregate workflows before
   adding their names to Foundry's required checks.

## Local evidence and limits

All three prepared selectors pass the working-tree check. A committed temporary
repository passes the exact packaged command; adding plugin runtime makes it
fail. Seven selector tests pass. The two maintenance files match their canonical
Foundry sources. All 435 protected product files remain unchanged.

The full maintenance suite reports 146 tests: 145 pass, no failures, one expected
skip for Hush/Codex's absent legacy hook installation. YAML checks confirm all
five runtime gates depend on the original test job and reject any result other
than success. Evidence: `.scratch/consolidation/main-ci-tests.log`.

No GitHub configuration, main ref, plugin runtime, installation or paid benchmark
was changed. Live Actions results and activation of the proposed rulesets remain
pending integration. Raw read-only evidence is retained in
`.scratch/consolidation/github-rules-current.json`.
