# Directory submissions that need your login

Each one is a form behind a sign-in or a bot check, so it is yours to do.
Values are ready to paste. Order: top first.

## 1. Anthropic community marketplace (the one that matters)

Sign in to https://platform.claude.com/plugins/submit with the Console
account (Developer, Admin or Owner role). Paste:

    https://github.com/V-Songbird/foundry

`claude plugin validate` already passes on the marketplace and on all three
plugins (the only note is the intentional missing `version` in each
`plugin.json`; the marketplace owns it). Approval pins a commit and the
catalog syncs nightly. Later pushes are mirrored on their own.

## 2. awesome-claude-code (53k stars)

Rules: web form only, one resource per submission, descriptions are
descriptions, not pitches, no emojis, one line. The maintainer says outright
that getting users first works better than getting listed first. Submit hush
now, razor after its Reddit post, foreman last.

Form: https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml

**hush**

| Field | Value |
| --- | --- |
| Display Name | hush |
| Category | Skills |
| Link | https://github.com/V-Songbird/hush |
| Author Name | Victor Villegas |
| Author Link | https://github.com/V-Songbird |
| Description | A plugin that keeps Claude silent while it works and has it send one short answer at the end, with hooks that trim long command output before it lands in the session. |

**razor**

| Field | Value |
| --- | --- |
| Display Name | razor |
| Category | Linting |
| Link | https://github.com/V-Songbird/razor |
| Author Name | Victor Villegas |
| Author Link | https://github.com/V-Songbird |
| Description | A plugin that runs a short "do we need this?" check before Claude adds a package, a file or an abstraction, and gates package installs behind it. |

**foreman**

| Field | Value |
| --- | --- |
| Display Name | Foreman |
| Category | Memory & Context Persistence |
| Link | https://github.com/V-Songbird/foreman |
| Author Name | Victor Villegas |
| Author Link | https://github.com/V-Songbird |
| Description | A plugin that keeps the project plan in a plain roadmap file next to the code and hands over the next task with a prompt checked against the real files. |

Tick the first five checklist boxes. Leave the last one unchecked; it is a
trap.

## 3. claudepluginhub

hush and razor are already indexed. foreman is not. Submit the marketplace so
all three sit under one author:

https://www.claudepluginhub.com/tools/submit-plugin → `https://github.com/V-Songbird/foundry`

## 4. claudeskills.info

https://claudeskills.info/submit/ → paste each repo URL. None of the three is
listed yet.

## 5. everydev.ai

https://www.everydev.ai/create/tool → one entry per plugin. Use the GitHub
description as the one-liner. None listed yet.

## 6. Anthropic showcase form

https://form.typeform.com/to/VIUAjxNi (from claude.com/community). Free,
long shot. Submit hush with the replay PNG.

## Done without you

- claudedirectory.org: PR #154 open, all three plugins plus the marketplace.
- awesome-claude-code-toolkit: PR open, three rows in the plugins table.
