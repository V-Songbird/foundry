---
name: prepare
description: >-
  Grounds Claude in a niche or unfamiliar technology domain before any code is
  written. Guides Claude to assess its own knowledge gaps honestly, gather
  authoritative sources from the user, identify what Skills and Rules would
  prevent domain-specific mistakes, and build them — all before development
  starts. Read-only until the user approves what to build at the terrain-building gate.
when_to_use: >-
  Trigger when the user says "prepare the terrain for [domain]", "I'm building
  a JetBrains plugin", "I'm working with [obscure SDK/framework]", "ground
  yourself in X before we start", "/hestia:prepare", or when Claude detects it
  is about to write code for a niche, version-sensitive, or specialist ecosystem
  where training knowledge may be incomplete or outdated.
allowed-tools: Bash, Read, Write, AskUserQuestion, WebFetch
disable-model-invocation: true
---

# Prepare — Domain Terrain Preparation

Ground Claude in the target domain before any code is written. This skill never
writes files until the user approves the terrain-building plan at Step 5.

**Why this matters.** On niche or unfamiliar tech you have the Curse of
Knowledge in reverse: you are the junior here and literally cannot perceive what
terrain you're missing, so training-based confidence is a trap. This skill
surfaces that hidden terrain — flag the gap honestly, pull authoritative sources
from the user, and convert tacit terrain into explicit Skills and Rules — so the
code that follows rests on ground truth instead of a confident guess.

## `AskUserQuestion` shape constraints — apply to every invocation in this skill

Every enumerable decision point MUST use `AskUserQuestion` — plain-text
questions break the button-driven flow.

- Every invocation MUST pass `{ questions: [{ question, header, multiSelect, options }] }`.
  The `questions: [...]` array wrapper is required.
- `header` MUST be ≤12 characters (tool-enforced; longer values truncate silently).
- `options` MUST contain 2–4 entries.
- Every option MUST have `label` and `description`.
- `multiSelect: false` for every decision in this skill except Step 5's item-picker.
- Every `Bash` invocation MUST include a `description` field.

## Task tracking

MUST invoke `TaskCreate` for each task below before any other work, capturing
each returned `taskId`. In non-interactive / SDK sessions, fall back to
`TodoWrite`. Every task MUST carry paired `content` (imperative) and
`activeForm` (progressive) fields.

Initial tasks (create all up front):

1. `{ content: "Identify the domain", activeForm: "Identifying the domain" }` — Step 1
2. `{ content: "Assess my knowledge", activeForm: "Assessing my knowledge" }` — Step 2
3. `{ content: "Gather authoritative sources", activeForm: "Gathering authoritative sources" }` — Step 3
4. `{ content: "Analyse gaps and propose terrain", activeForm: "Analysing gaps and proposing terrain" }` — Step 4
5. `{ content: "Build approved terrain artifacts", activeForm: "Building terrain artifacts" }` — Step 5
6. `{ content: "Report completion", activeForm: "Reporting completion" }` — Step 6

MUST invoke `TaskUpdate` with the captured `taskId` immediately before
starting each step (`in_progress`) and immediately upon finishing (`completed`).
Never leave multiple tasks `in_progress` simultaneously.

## Step 1 — Identify the domain

MUST invoke `AskUserQuestion`:

- **question**: `"What technology or ecosystem are we preparing for? (e.g. JetBrains Platform SDK, rAthena scripting, a specific game engine, an internal SDK)"`
- **header**: `"Domain"`
- **multiSelect**: `false`
- **options**:
  - `{ label: "Very niche — you probably don't know it", description: "An uncommon SDK, proprietary platform, or technology with little mainstream coverage." }`
  - `{ label: "Mainstream but version-sensitive", description: "A well-known technology where the version matters a lot — e.g. a major API change happened in the last 1–2 years." }`
  - `{ label: "Standard — just want to verify", description: "A widely-used, stable ecosystem. You may know it well, but grounding sources are still welcome." }`

Capture both the user's free-text description of the domain (from their message
or a follow-up) and their confidence-level option choice. If the domain name was
not stated in the user's opening message, ask for it in plain text before or
alongside this question.

Mark task 1 `completed` and proceed to Step 2.

## Step 2 — Self-assessment

State honestly and specifically what you know and don't know about the domain.
Write this as a short paragraph in the chat, not a list. Structure it as:

> "From my training I know [specific things you do know — APIs, patterns,
> concepts]. I'm uncertain about [specific gaps — recent API changes, internal
> conventions, version-specific behaviour]. My knowledge may be outdated for
> [specific area most likely to have changed since training]."

Do NOT say "I don't know this domain." Even partial knowledge is useful and
should be named. Do NOT claim full accuracy — this step exists precisely because
training knowledge has limits.

If the user chose "Very niche" in Step 1, open with: "My training data has
little coverage of this ecosystem, so I'll rely heavily on the sources you
provide."

Mark task 2 `completed` and proceed to Step 3.

## Step 3 — Source gathering

MUST invoke `AskUserQuestion`:

- **question**: `"To ground myself accurately, I need authoritative sources. Which of these can you share?"`
- **header**: `"Sources"`
- **multiSelect**: `true`
- **options**:
  - `{ label: "GitHub repo URL(s)", description: "The official SDK, framework, or plugin repo. Real implementation examples are the highest-value source." }`
  - `{ label: "Documentation URLs", description: "Official docs, DevKit pages, API reference, or changelog pages." }`
  - `{ label: "Working example project", description: "A repo or local path with a real project using this technology." }`
  - `{ label: "Internal docs or spec files", description: "Files on disk — internal architecture docs, spec PDFs, or notes you have locally." }`

After the user responds, collect every URL and file path they provide. Then:

- For each URL: MUST invoke `WebFetch` with the URL and capture the content.
  If the page is large, focus on API reference, changelog, and example sections.
- For each local file path: MUST invoke `Read` with the path.
- After all sources are fetched, write a short summary in the chat (3–6 bullet
  points) covering the concrete facts learned: API shape, key conventions,
  known version differences, common pitfalls mentioned in the source material.

If the user says they have no sources to share, acknowledge it and proceed to
Step 4 with only your self-assessment knowledge. Do NOT halt the skill.

Mark task 3 `completed` and proceed to Step 4.

## Step 4 — Gap analysis and terrain proposal

Based on your self-assessment (Step 2) and the source material (Step 3),
identify what Claude needs to work accurately in this domain. Produce a
numbered proposal list in the chat with two sections:

**Proposed Skills** — each as one line: `Skill: <name> — <one-sentence purpose>`

Examples of what belongs here:
- An API reference skill naming the key classes, methods, and constraints
- A pattern catalogue for the domain's idioms and anti-patterns
- A worked-example skill showing a minimal correct implementation

**Proposed Rules** — each as one line: `Rule file: <name>.md — <one-sentence coverage>`

Examples of what belongs here:
- Rules that prevent the most common mistakes the sources warned about
- Rules encoding version-specific constraints that differ from general knowledge
- Rules for the domain's safety requirements (threading, resource management, etc.)

Keep the list focused. Propose only what would genuinely change how you write
code for this domain. If a skill or rule would duplicate general Claude Code
knowledge, omit it.

Mark task 4 `completed` and proceed to Step 5.

## Step 5 — Terrain building (approval gate)

MUST invoke `AskUserQuestion`:

- **question**: `"Here's what I'd like to build. Shall I create all of it, or do you want to pick?"`
- **header**: `"Build terrain"`
- **multiSelect**: `false`
- **options**:
  - `{ label: "Yes, build everything", description: "Create all proposed Skills and Rules now." }`
  - `{ label: "Let me pick", description: "I'll tell you which items to build and skip the rest." }`
  - `{ label: "Rules only", description: "Write the rule files now; skip the Skills." }`
  - `{ label: "Skills only", description: "Author the Skills now; skip the Rules." }`

If the user picks "Let me pick", ask them in plain text which numbered items
from the Step 4 list to include. Capture the subset before building anything.

**Building Skills**

For each approved Skill, invoke `AskUserQuestion` with `header: "Skill scope"`,
`multiSelect: false`, and two options — "Author it now" (write the SKILL.md
directly in this session using the source material as content) and "Open
/hestia:scribe" (hand off to the scribe skill for a full guided authoring
session). Honour the user's choice.

If authoring directly: write the skill to
`.claude/skills/<domain>/<skill-name>/SKILL.md`. The content MUST be derived
from the actual source material gathered in Step 3 — do not write from training
knowledge alone. Use concrete API names, method signatures, and examples from
the sources.

**Building Rules**

For each approved Rule file: MUST invoke `Bash` with:

- **command**: `mkdir -p .claude/rules`
- **description**: `"Ensure .claude/rules/ directory exists"`

Then MUST invoke `Write` with `file_path: ".claude/rules/<domain-name>.md"`.

Rule file content MUST:
- Derive every rule from the source material, not from general intuition
- Name the specific API, method, or pattern the rule guards
- State the consequence of violating it ("…otherwise the IDE will throw a
  ProcessCanceledException on every read")
- Include at least one concrete example of correct and incorrect usage where
  the source material supports it

Mark task 5 `completed` and proceed to Step 6.

## Step 6 — Completion brief

Deliver a two-layer report.

**Digest (always, in the chat):**

One headline sentence naming the domain and what was built. Then one bullet per
artifact created, naming it and its purpose in plain language. No file paths
unless the user will open them. Example shape:

> Terrain ready for [domain]. Here's what I built:
> - A skill covering the core API surface and its threading constraints
> - A rule file preventing the three most common mistakes the SDK docs warn about

**Details on request:**

Do NOT dump file contents into the chat. If the user asks to review a specific
artifact, read it and show it then.

If nothing was built (user cancelled at Step 5): say so plainly and note that
the self-assessment and source summary from Steps 2–3 are still available in
this conversation for reference.

Mark task 6 `completed`.

## Additional resources

- For authoring Skills from gathered source material, dispatch `/hestia:scribe`.
- For auditing the rules written by this skill, dispatch `/hestia:assess-rules`.
- For a full project setup audit after terrain preparation, dispatch `/hestia:checkup`.
