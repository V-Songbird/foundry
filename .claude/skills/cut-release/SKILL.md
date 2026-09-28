---
name: cut-release
description: Bump a plugin's version and changelog in its own repo, then pin the pushed commit in both Foundry catalogs.
argument-hint: "[plugin] [version]"
disable-model-invocation: true
license: MIT
compatibility: Claude Code only. Requires git, Node 22 or later and the claude CLI. Step 5 also runs the codex CLI for a plugin that ships for Codex and the agy CLI for one that ships for Antigravity.
metadata:
  version: "1.0"
---

# cut-release

Cuts a release for one plugin this marketplace lists. Plugins are submodules, so a release is two
commits that move together: one in the plugin's own repository, pushed to its `main`, then one in
Foundry that pins that commit in every catalog listing the plugin.

Which plugins exist is not written down here. Plugins get added and retired, so read the current
set from the catalogs. Never assume a plugin name — list them.

## Where the version lives, and where the pin lives

| Host | Version | Pin |
| --- | --- | --- |
| Claude Code | `<plugin>/.claude-plugin/plugin.json` | `.claude-plugin/marketplace.json`, the entry's `source.sha` |
| Codex | `<plugin>/.codex-plugin/plugin.json` | `.agents/plugins/marketplace.json`, the entry's `source.sha` |
| Antigravity | `<plugin>/plugin.json` | Foundry's gitlink for the plugin: users install from a Foundry clone, which checks the plugin out at its gitlink |

Every manifest a plugin carries holds the same version. A catalog entry carries no version and
must not gain one: only `source.sha` moves, together with the gitlink. A plugin missing from a
catalog does not ship for that host; a release does not add it.

The gitlink and `source.sha` name the same commit, so the Foundry push in step 4 releases to every
host the plugin ships for at once, and a push to the plugin's `main` reaches nobody until it is
pinned. An Antigravity install is a copy: its user takes the release by pulling the Foundry clone,
running `git submodule update --init` and running `agy plugin install` again.

## Step 0 — which plugin, and is it ready

List what each catalog ships, and ask which plugin if the user did not say:

```bash
node -e "for (const c of ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json']) for (const p of require('./' + c).plugins) console.log(c, p.name, p.source.ref, p.source.sha.slice(0, 7))"
```

Then look at the plugin checkout. A release ships from its `main`, so the branch, the unpushed
commits and the uncommitted edits all matter:

```bash
git -C <plugin> fetch origin
git -C <plugin> status --short --branch
git -C <plugin> log --oneline <pinned-sha>..origin/main
git -C <plugin> log --oneline origin/main..main
```

Report what is unpushed and what is uncommitted. A dirty checkout is not authorization to include
everything in it; say what is coming along rather than sweeping it in silently.

Run the plugin's suite from inside its directory. Stop and report if it is red; do not release
over it without the user's explicit go-ahead:

```bash
node --test "tests/*.test.js"
```

## Step 1 — pick the new version

Read the current version from `<plugin>/.claude-plugin/plugin.json`. Ask the user for the new one,
or propose a semver bump from the Step 0 log: patch for fixes, minor for new user-facing behaviour,
major for breaking changes.

## Step 2 — changelog and manifests, in the plugin

1. `Read` `<plugin>/docs/knowledge/changelog.md`. Entries are `## <version> — <YYYY-MM-DD>` followed by a short
   user-facing paragraph. Add the new entry at the top, or date the existing undated one. State the
   effect, not the journey: no methodology, no counts, no design rationale.
2. `Edit` `version` in `<plugin>/.claude-plugin/plugin.json` and, when they exist,
   `<plugin>/.codex-plugin/plugin.json` and `<plugin>/plugin.json`. Then confirm every hit reads
   the same string:

```bash
grep -n '"version"' <plugin>/.claude-plugin/plugin.json <plugin>/.codex-plugin/plugin.json <plugin>/plugin.json
```

## Step 3 — commit and push the plugin

Stage only the release surface: `docs/knowledge/changelog.md`, `.claude-plugin/plugin.json` and, when they exist,
`.codex-plugin/plugin.json` and `plugin.json`. The plugin's own `pre-commit` hook reruns its suite.

```bash
git -C <plugin> commit -m "Release <plugin> <version>"
git -C <plugin> push origin main
```

Use a pull request instead when the repository requires one. Either way, the pin waits until the
release commit is reachable from `origin/main`:

```bash
git -C <plugin> fetch origin
git -C <plugin> branch -r --contains <release-sha>
```

## Step 4 — pin the commit in Foundry

1. `Edit` `source.sha` in the plugin's entry of `.claude-plugin/marketplace.json` and, when the
   plugin is listed there, `.agents/plugins/marketplace.json`. Both pins name the same full SHA.
2. The plugin checkout already sits on that commit, so stage the gitlink: `git add <plugin>`.
3. Verify that pins, gitlinks and manifests agree and that the plugins' shared copies still
   match, then validate the Claude catalog:

```bash
node -e '
const fs = require("fs"), { execFileSync } = require("child_process");
const git = (args, cwd = ".") => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const manifests = [".claude-plugin/plugin.json", ".codex-plugin/plugin.json", "plugin.json"];
for (const catalog of [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"])
  for (const p of JSON.parse(fs.readFileSync(catalog, "utf8")).plugins) {
    const { sha, ref } = p.source;
    const gitlink = git(["ls-files", "-s", p.name]).split(" ")[1] === sha;
    const pushed = git(["branch", "-r", "--contains", sha], p.name).includes("origin/" + ref);
    const versions = new Set(manifests.flatMap((m) => { try { return [JSON.parse(git(["show", sha + ":" + m], p.name)).version]; } catch { return []; } }));
    console.log(catalog, p.name, [...versions].join("/"), versions.size === 1 ? "manifests agree" : "MANIFEST VERSIONS DIFFER", gitlink ? "gitlink ok" : "GITLINK DIFFERS", pushed ? "on origin/" + ref : "NOT ON origin/" + ref);
  }'
node scripts/check-shared-copies.js
claude plugin validate .
```

The pin check prints a problem instead of failing on it, so read each line: an uppercase word means
stop and fix it before you push. `MANIFEST VERSIONS DIFFER`: bump every manifest together in
step 2, then commit, push and pin the new commit. `GITLINK DIFFERS`: check the plugin out at the
pinned commit and stage its gitlink, as in item 2. `NOT ON origin/<ref>`: push the plugin's `main`
and fetch, as in step 3.

`scripts/check-shared-copies.js` compares the code after the header comment of Hush's and Razor's
`hooks/lib/safe-write.js` and the `FIXTURES` array of their `tests/turn_boundary_conformance.test.js`,
the Node.js and fnm lookup in Foreman's and Razor's `hooks/windows-launcher.ps1`, and the whole
of the README nav check's seven files in Foreman, Hush and Razor:
`scripts/git-hooks/check-readme-nav.js`, `scripts/git-hooks/pre-commit`, the two files under
`scripts/git-hooks/vendor/`, `tests/readme_nav.test.js`, `tests/pre_commit.test.js` and
`tests/fixtures/github-slugger-fixtures.json`.
It reads every file at the commit each plugin's gitlink pins, including the gitlink you just
staged, and names that commit; a checkout's branch and uncommitted edits do not count. A
difference means one plugin ships a fix another lacks: land the missing change in that plugin
before you push the pin. The check skips a plugin with no checkout and names it, fails when it
compared nothing, and fails when a pinned commit is missing from its checkout.

`agy plugin validate <plugin>` checks the Antigravity package of a plugin that ships one, when
the Antigravity CLI is installed; report it as not run otherwise.

4. Commit and push:

```bash
git add .claude-plugin/marketplace.json .agents/plugins/marketplace.json <plugin>
git commit -m "Install <plugin> <version> from main"
git push origin main
```

Nothing here is pre-approved beyond reading and editing: every command in this skill goes through
the usual permission prompt, and the two pushes are the ones you should read before allowing.

## Step 5 — install the release as a user would

The pin is public now. Install from the catalog into a throwaway config home per host, so your own
installs, settings and hook trust stay untouched. Each new home starts without a login: the lines
marked `owner login` need the owner's account, so ask before running them. Keep both homes and a
disposable project in one scratch folder. The project holds one open roadmap entry, so Foreman's
session hook has something to say. It is its own Git repository, because Codex otherwise reads
the `AGENTS.md` of any repository that encloses the scratch folder:

```bash
check="$(mktemp -d)" && mkdir "$check/project" "$check/claude-home" "$check/codex-home"
cd "$check/project" && git init -q
printf '%s\n' '{"id":"001","title":"Release hook check","status":"in_progress"}' > ROADMAP.jsonl
```

**Claude Code.** Install the released plugin, and Foreman too when another plugin is released,
because the Task-event check needs it. Then run one short session with hook events in its output.
A capture hook on the two Task events receives the same input as Foreman's task-created and
task-completed hooks:

```bash
export CLAUDE_CONFIG_DIR="$check/claude-home"
claude --version
claude plugin marketplace add V-Songbird/foundry
claude plugin install <plugin>@foundry
claude plugin install foreman@foundry   # when <plugin> is not foreman
claude plugin list
claude                                  # owner login: sign in, then quit
cat > capture.js <<'EOF'
const fs = require("fs");
fs.appendFileSync("task-events.jsonl", fs.readFileSync(0, "utf8").trim() + "\n");
EOF
claude -p "Use TaskCreate to add one task, then mark it completed with TaskUpdate. Do nothing else." \
  --model haiku --allowedTools TaskCreate,TaskUpdate \
  --settings '{"hooks":{"TaskCreated":[{"hooks":[{"type":"command","command":"node capture.js"}]}],"TaskCompleted":[{"hooks":[{"type":"command","command":"node capture.js"}]}]}}' \
  --output-format stream-json --verbose --include-hook-events < /dev/null > session.jsonl
node -e '
const fs = require("fs");
const read = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const ok = read("session.jsonl").filter((e) => e.subtype === "hook_response" && e.outcome === "success");
const fired = (event, text) => ok.some((e) => e.hook_event === event && e.stdout.includes(text));
console.log("foreman SessionStart:", fired("SessionStart", "[Foreman]"));
console.log("razor SessionStart:", fired("SessionStart", "RAZOR ACTIVE"));
console.log("hush UserPromptSubmit:", fired("UserPromptSubmit", "hush:"));
for (const event of ["TaskCreated", "TaskCompleted"]) console.log(event, "hooks that ran:", ok.filter((e) => e.hook_event === event).length);
for (const e of read("task-events.jsonl"))
  console.log(e.hook_event_name, ["task_id", "task_subject", "task_description"].map((k) => k + (typeof e[k] === "string" ? " ok" : " MISSING")).join(", "));
'
```

`claude plugin list` must show the new version, and every plugin you installed must print `true`.
Each Task event must show two hooks that ran, the capture hook and Foreman's, and all three fields
`ok`. A `MISSING` field means Claude Code changed the Task-event input, which silently turns
Foreman's task hooks off: report it as a Foreman bug with the Claude Code version. A plugin that
prints `false` only in the first session of a new home may have hit its hook timeout on a cold
start; run the session once more before reporting it.

**Codex.** Skip it when the release is Hush, which has no Codex package. When the codex CLI is not
installed, report the Codex check as not run. Otherwise install the released plugin and trust its
hooks the way a user does:

```bash
export CODEX_HOME="$check/codex-home"
codex --version
codex login                             # owner login
codex plugin marketplace add V-Songbird/foundry
codex plugin add <plugin>@foundry
codex plugin list --marketplace foundry --json
```

The listing must show the new version. The owner's sign-in also syncs their account plugins into
the new home; an `AuthRequired` error their MCP servers print on stderr is not a release failure.
Start `codex` in the same project and open `/hooks`.
Record whether Codex asked you to review and trust the plugin's hooks before they ran; in a fresh
home it should. Trust them, quit, and start `codex` again. Ask the new session to quote the first
line of each note it received at session start: Razor's begins `RAZOR ACTIVE`, and Foreman's
`[Foreman] Roadmap entries still open`. A `NODE_OPTIONS` preload that logs which hook ran must
read `process.execArgv`, not `process.argv`: Foreman's hooks start as `node -e "require(...)"`,
so their argv names no script.

Existing Codex users keep their trust unless a hook definition changed. This command compares the
pin step 0 printed with the release; when it prints anything, record that existing users must
review and trust the hooks again:

```bash
git -C <plugin> diff --stat <pinned-sha> <release-sha> -- hooks/codex-hooks.json
```

**Antigravity.** Skip it for a plugin without a root `plugin.json`, such as Hush. Antigravity has
no config-home setting: `agy plugin install` writes into `~/.gemini/config/plugins` of the user
who runs it. So run it in a throwaway user profile, with `HOME`, `USERPROFILE`, `APPDATA` and
`LOCALAPPDATA` relocated into the scratch folder, and install from a Foundry clone at the pin, as
a user would:

```bash
git clone -q --recurse-submodules https://github.com/V-Songbird/foundry.git "$check/foundry"
profile="$(cd "$check" && { pwd -W 2>/dev/null || pwd; })/agy-profile"
mkdir -p "$profile/AppData/Roaming" "$profile/AppData/Local"
in_profile() { HOME="$profile" USERPROFILE="$profile" APPDATA="$profile/AppData/Roaming" LOCALAPPDATA="$profile/AppData/Local" "$@"; }
ls ~/.gemini/config/plugins > "$check/gemini-before.txt" 2>/dev/null
in_profile agy --version
in_profile agy plugin install "$check/foundry/<plugin>"
in_profile agy plugin list
diff -r --exclude=.git "$check/foundry/<plugin>" "$profile/.gemini/config/plugins/<plugin>"
ls ~/.gemini/config/plugins 2>/dev/null | diff "$check/gemini-before.txt" -
```

Record the `agy` version and that `agy plugin list` names the plugin with its skills and hooks.
Both `diff` commands must print nothing: the installed copy equals the clone, and your own
`~/.gemini/config/plugins` did not change. The relocated profile has no Antigravity sign-in, so
it cannot show a hook firing in a live conversation. That check is `owner login`: with the
owner's go-ahead, sign in inside the relocated profile, start a conversation in
`$check/project`, and ask it to quote the first line of each note it received at its first model
call; Razor's begins `RAZOR ACTIVE`. Report it as not run otherwise.

Delete the scratch folder afterwards, which removes both homes, the relocated profile, the clone
and the project:

```bash
cd && rm -rf "$check" && unset CLAUDE_CONFIG_DIR CODEX_HOME
```

## Step 6 — confirm

Report the plugin, the version, the plugin release SHA, the Foundry commit SHA and both push
results. Add step 5's results: the Claude Code and Codex versions, which hook fired for each plugin
on each host, whether Codex asked to trust the hooks and whether existing users must trust them
again, the Task-event fields, and Antigravity's version, listing and live check, each as run or
not run. A local commit, a valid catalog or a green suite is not publication; if a push failed,
surface that rather than retrying silently.

## What this skill does not do

- Write or edit plugin source, skills, agents or hooks.
- Add a `version` to a catalog entry, or a plugin to a catalog that does not list it.
- Pin a commit that is not reachable from the plugin's `origin/main`.
- Decide the bump size without asking, unless the user already stated it.
- Force-push, skip hooks, or release over a red suite without explicit confirmation.
