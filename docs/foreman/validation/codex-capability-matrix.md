# Capability matrix

Status is based on the 2026-08-08 source tree rebased to Foreman `1.1.2` (`cdec583`). “Implemented” describes code and focused coverage, not a final release-surface measurement. Final CLI install/trust, installed-cache identity, and desktop results remain pending in [VALIDATION.md](codex-validation.md).

| Capability | Codex status | Current boundary |
| --- | --- | --- |
| Shared active roadmap and archive | Implemented | One `ROADMAP.jsonl` and `.foreman/archive.jsonl` serve both hosts. |
| Roadmap format 2 | Implemented | `planned_touches` predicts scope; append-only `observed_touches` records commit-derived execution. Older files migrate mechanically with backups. |
| Deterministic CRUD and ranking | Implemented | The helper owns ids, transitions, cycles, duplicate checks, collision/ranking, locking, and JSON results. Codex does not re-rank candidates. |
| Five explicit skills | Implemented | `$foreman` routes; init, roadmap, craft-prompt, and survey own their bounded workflows. |
| Correct and doctor | Implemented | `correct` edits active claims under validation; `doctor` reports structural/evidence findings and routes explicit repairs. |
| Archive and restore | Implemented | Only terminal entries archive; restore returns history through the guarded helper. |
| Reconcile-and-pick | Implemented | The roadmap skill scopes a survey, applies only confirmed repairs, reloads the compact menu, then picks mechanically. |
| `awaiting_acceptance` | Implemented | Safe-on verification records evidence before approval; accept closes and decline returns to `in_progress`. |
| Prompt profiles and checker | Implemented | Standard/reinforced Markdown contracts preserve evidence, hypotheses, unknowns, constraints, verification, and outcomes. |
| Commit evidence | Implemented | Recorded SHAs and `Foreman:` trailers resolve consistently across root and declared submodule repositories. |
| Health and attention reports | Implemented | Roadmap health, attention cost, and opt-in trial events provide mechanical evidence, not release certification. |
| Default hook discovery | Implemented | Codex loads `hooks/hooks.json`; the manifest carries no hooks field. |
| Session recovery hook | Implemented | JSON context distinguishes interrupted and awaiting work and includes archive/trial behavior. |
| Native write guard | Implemented with bounded coverage | Native patch/Edit/Write paths are guarded for active and archive files; shell/external writes are not claimed as universally intercepted. |
| Post-commit synchronization | Implemented | Canonical Bash, exit shapes, trailers, planned-file ranking, observed files, follow-ups, discovery, corrupt roadmaps, worktrees, submodules, and unrelated repositories are handled. |
| Current-task execution | Implemented in managed workflow | The active skill owns start, evidence recording, verification policy, and closure. |
| Supervised subagent execution | Implemented in managed workflow | The parent remains active, waits, verifies, and closes. This is not a detached job. |
| Clipboard handoff | Implemented | Copying leaves status unchanged and the cold-start prompt owns later transitions. |
| Generic task-close gate | Deferred | Current native events cannot reliably map every stopping task to one roadmap entry. |
| Exact detached resume | Deferred | Durable notes and a new handoff replace persistence of ephemeral agent identifiers. |
| Decision-anchor hook | Deferred | No current Codex-native event provides sufficiently reliable matcher and path extraction. |
| Anthropic/Fable model mapping | Deferred | Claude model calibration does not translate to Codex. |
| XML or Workflow-schema handoff | Deferred | The Codex contract is checked Markdown; universal schema enforcement is not assumed. |
| Claude benchmark claims | Deferred | Codex-specific measured evidence is required. |

## Surface status

| Surface | Status on 2026-08-08 | Evidence requirement |
| --- | --- | --- |
| Codex CLI | Implementation ready; final evidence pending | Run normal install, hook trust, cache identity, full tests, lifecycle, restart, and uninstall. |
| Codex desktop app | Pending | Run install/trust and one complete init → pick → execute → accept/archive lifecycle. |
| ChatGPT Work mode | Not advertised for full Foreman | Local Node, Git, hooks, and project filesystem semantics require separate proof. |
| Codex IDE extension | Not advertised as this plugin | Validate only if the plugin surface becomes supported there. |
| Codex cloud | Deferred | No measured shared-local-roadmap and hook runtime evidence. |
