# Branch: Pick the next task

Fast pick. The script decides each step; this file says what each step means.

## Loop

1. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/roadmap.js step pick`. When the user already named
   an entry, run `node ${CLAUDE_PLUGIN_ROOT}/scripts/roadmap.js step pick --chose <id>` instead.
2. Read `next` in the JSON it returns and do that row of the table below.
3. Each row ends by running the command in `then`, with the placeholders filled in. Repeat from 2.

The output is data for you. Never paste it into chat.

## Codes

| `next` | Do |
| --- | --- |
| `ask_q1` | One `AskUserQuestion` with `question` and one option per `options` row, in order. Label: the row's `label`, exactly. Description: the row's `why` in your own everyday words, one sentence, then its `reason` as a short trailing clause. Then run `then` with the chosen row's `id`, or `other` when the user described something else. |
| `accept` | Read [accept.md](accept.md) (`${CLAUDE_PLUGIN_ROOT}/skills/roadmap/accept.md`) and follow it for `entry`. No prompt is crafted. |
| `resume` | Read [resume.md](resume.md) (`${CLAUDE_PLUGIN_ROOT}/skills/roadmap/resume.md`) and follow it for `entry`. |
| `defer` | Read [defer.md](defer.md) (`${CLAUDE_PLUGIN_ROOT}/skills/roadmap/defer.md`) and follow it. |
| `gather_checks` | From `entry`'s own fields only, write the verification rows (see Checks). Then run `then` with `<n>` the number of rows that have a `run` command, and add `--sliced` when every row after the first names its own slice of the work. |
| `ask_q2` | One `AskUserQuestion` with `question` and the four `options`, in order, label and description exactly as given. Then run `then` with the chosen option's `dest`. |
| `craft` | Call `craft-handoff.js` once (see Craft), then deliver as [delivery.md](delivery.md) (`${CLAUDE_PLUGIN_ROOT}/skills/roadmap/delivery.md`) says for `dest`. |
| `empty` | Tell the user nothing is ready to start, in one line, and stop. |

`ok:false` carries `error` and `fix`. Apply `fix` and run the step again. Ask the user only when
the fix needs their answer.

When the user waves an option off as "not yet" or "later", or names a prerequisite outside the
dependency graph, run `then` with `defer`.

## Rules

- No investigation: no file reads, no searches. The entry's own fields are the only input.
- Never say the pick was checked against the code. Nothing here read the code or ran it.
- Never mark the entry `in_progress`. The session that starts the work opens it.
- Work starts only after the user chose a destination.
- Never mention or route to any other plugin.

## Checks

One row per check, in running order: `{"run":"<exact command>","expected":"<pass signal>"}`.
Add `goal`, and `files` when the entry names them, on a row that verifies its own slice of the
work. Never invent a command. An entry with nothing runnable has no rows and passes `question`
to the craft call instead.

## Craft

Pipe one JSON line to `node ${CLAUDE_PLUGIN_ROOT}/scripts/craft-handoff.js`, through a quoted
heredoc. Type `${CLAUDE_PLUGIN_ROOT}` literally in the JSON.

```
{"entry":"<id>","host":"claude","destination":"task|agent|clipboard","resume":<true only for a resume>,"split":<true only for split>,"request":"<one sentence>","judgment":{"role":"<role>","goal":"<goal>","context":"<entry what>","steps":["<step>"],"constraints":["<limit>"],"verification":[<the rows>],"testFirst":<true only for a silent-failure entry>,"invariants":["<assertion>"]}}
```

- `request`: one specific sentence that keeps the entry's task type. An investigation asks for
  findings, a decision asks for the choice.
- `role`, `goal`: from `title` and `why`.
- `context`: the entry's `what`. The script adds `why`, `notes` and dependency docs itself.
- `steps`, `constraints`: split `what` into work and hard limits. A file or read-only limit the
  user gave goes in `constraints`. An investigation passes `question` instead of `steps`.
- `invariants`: assertions already stated in the entry, as observable checks. Omit when none.
- `testFirst`: only when the breakage would pass the existing checks.
- Leave out `purpose`, `expectedFileSurface` and `relevant_files`; the script fills them.

The reply is `{ok, prompt, tasks?, gate, warnings}`. Show non-empty `warnings` verbatim. On
`ok:false`, each `gate.errors` row is `{error, fix, example}`: repair that field from the entry
and call again. Never deliver a prompt from `ok:false`. Never name `profile` or `signals`.
