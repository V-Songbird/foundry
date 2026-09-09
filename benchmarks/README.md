# Foundry benchmarks

All benchmark tooling for the collection lives here. Plugin repositories contain
their runtime, usage documentation and functional tests; installing a plugin does
not require this research tree.

| Plugin | Maintained tools | Platform scope |
| --- | --- | --- |
| [Foreman](foreman/README.md) | Comparison harness, fixtures, tests and record validation | Claude comparison; additional historical experiments |
| [Hush](hush/README.md) | Comparison harness, fixtures, tests and experiments | Claude; a Codex package and equivalent measurements remain pending |
| [Razor](razor/README.md) | Shared scoring tools, separate Claude/Codex runners and tests | Claude and Codex, each measured against its own baseline |

## Folder meanings

- `runner/`: maintained runners, scorers and report builders.
- `fixtures/` or task definitions: the inputs used to compare runs.
- `tests/`: offline checks of benchmark instruments, separate from plugin tests.
- `validation/`: evidence-schema tools where a suite needs them.
- `experiments/`: retained studies and candidate variants. Read each experiment's
  prerequisites and original scope before attempting to reproduce it.
- `results/` and `records/`: retained outputs and evidence, when present.

Historical results retain their original model, source revision and limitations.
Moving them does not establish new measurements or equivalence between hosts.

## Source checkouts

Foreman and Hush's established comparison harnesses target Claude. Razor's
`runner/run.js` targets Claude, while `runner/codex-run.js` and
`runner/codex-parity.js` target Codex. Select the matching plugin checkout through
the runner's documented project-directory options or environment variables.
Razor's runners accept `RAZOR_DIR`; the default is Foundry's `razor/` checkout.

Read the runner guide before a live run: model sessions can consume paid usage.
The moved instrument tests can be run without model sessions:

```powershell
fnm env --use-on-cd | Out-String | Invoke-Expression
node --test benchmarks/foreman/tests/benchmark_records.test.js benchmarks/razor/tests/*.test.js
```

Razor's instrument tests expect its Codex checkout. Other existing suite tests
remain alongside their respective harnesses.

Long research narratives and decisions about methodology live in
[Foundry documentation](../docs/README.md). Local migration backups, maintenance
logs and validation-tool dependencies live in `.scratch/`, outside this tree.
