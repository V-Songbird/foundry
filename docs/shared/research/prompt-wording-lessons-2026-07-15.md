# Wording that holds: writing rules an agent doesn't route around

Private notes. 2026-07-15. Evidence is from this monorepo's own A/B campaigns
(hush 0.2.x–0.6.3, razor 0.3.x), all same-batch runs against frozen controls.

---

## The thesis

A prompt rule almost never fails because the agent disobeyed it.

It fails because the rule left a shape the agent can satisfy *while still doing
the thing the rule existed to prevent*. Every failure documented below is a rule
that was **obeyed**. The messages were under the line limit. The bullets were one
sentence each. The agent was not being difficult — it was being literal, and the
rule was literally satisfiable without the behavior changing.

This reframes what "the rule didn't work" means. The instinct on seeing a rule
fail is to make it stronger: more emphasis, more MUST, more qualifying detail
about what it covers. Every one of those moves made things measurably worse in
the runs below. The fixes that worked were, without exception, either **a
different unit** or **fewer words**.

> "You MUST NOT talk between tool calls" is not a strong rule. It is a rule with
> no unit, no named competitor, and no stated scope — three separate ways for a
> literal reader to comply and still talk.

---

## 1. The unit you cap is the only unit that stops growing

**What happened.** hush's final messages were capped at 12 lines, with "one
sentence per bullet". Both rules were obeyed on every single run — messages
consistently landed at 4–7 lines, comfortably under the limit. Final-message
length didn't move (−5.6%, indistinguishable from noise).

Reading the transcripts showed where the mass went. It had migrated *inside* the
bullets:

```
* `routes.js` — flat `TABLE` map of `"METHOD /path"` → handler for `GET /users`,
  `GET /orders`, `POST /orders`; wraps reads in `cached()`, sends writes straight
  to the store; 404 on unknown route, 500 on handler error.
```

That is **one sentence**, and **one line**. It is also 37 words carrying four
distinct facts, joined by semicolons. Both rules pass. The reader still faces a
wall.

**Why the rule couldn't bite.** A limit on lines cannot see a line of arbitrary
length. "One sentence" is trivially evaded by a semicolon, which is precisely a
device for putting more than one statement in one sentence. The cap was
decorative: it constrained a container whose contents were unbounded.

**The fix.** Cap the unit that is actually growing, and ban the joinery that lets
a second fact ride along inside the capped unit:

- **15 words** per bullet. Count them.
- **No semicolons and no parentheses inside a bullet.** Both are how a second
  fact smuggles itself into a line that already made its point.

Result: −9.0%, then −19.0% once the remaining holes closed. Correctness never
moved.

**The general form.** Whenever you cap a container, ask what the contents can do.
If the contents are unbounded, you have not written a limit — you have written a
suggestion about formatting. And name the *joinery* explicitly: a cap on a unit
invites the model to find the punctuation that merges two units into one.

---

## 2. Describing the scenario primes the agent to enact it

**Proven twice, independently, on different plugins and different failure modes.**
This is the single most expensive lesson here — it cost a full A/B round both
times, and both times the intuition pointed the wrong way.

### Instance A — razor/hush interference (0.3.6)

A doubt-loop was burning thinking tokens. The v1 fix described the failure it was
preventing:

> "You keep second-guessing a conclusion you already verified — evidence in hand,
> but a hint keeps re-opening it."

It **cured** the paired arm (9603 → 4808 mean thinking tokens) and **exploded**
the solo arm ~3× (4929 → 16620; individual reps at 21.6k, 30.1k, 31.1k). One run
committed to a wrong hint-shaped theory, edited two wrong files, and reverted.

Describing the doubt scenario *taught the model the doubt scenario*. Reading
"you keep second-guessing a conclusion you already verified" is enough to start
second-guessing. The v2 wording stated only the positive rule and was clean
everywhere.

### Instance B — hush's explain carve-out (0.6.2 → 0.6.3)

Explain turns were too long. The 0.6.2 fix named the request it was aimed at and
spelled out the limits:

> "This lifts the 12-line limit, and nothing else. The 15-word cap and the
> semicolon and parenthesis ban still apply to every bullet you write, because
> depth is more bullets, never longer ones. *'Walk me through it'* asks for the
> steps laid out one per line, not for the same steps in heavier sentences."

Explain turns got **longer**: 178 → 206 words. Three consecutive rounds left that
task flat (+2.9% / +3% / +2%) while every other task improved.

The 0.6.3 fix **deleted** the scenario and the quoted request:

> "Anything the user asked to have explained — requested depth is the deliverable.
> Depth is more bullets. Every limit above applies to each one."

Explain turn: 201 → 147 words (−27%), depth intact.

**The general form.** *State the rule. Never state the failure it prevents.* A
described scenario reads as a script, not as a warning. This is the opposite of
how rules are written for humans, where naming the failure mode is what makes the
rule land — and that instinct is why this keeps happening.

**Diagnostic:** when a clause backfires, suspect priming *before* concluding the
rule was too weak. The urge to add qualifying detail is exactly wrong.

---

## 3. Enumerating what a rule doesn't cover reads as permission

A special case of #2, sharp enough to name separately, because it's what "being
precise about scope" naturally produces.

Look again at the 0.6.2 wording. Its structure is: *here is the one limit I lift,
and here is the list of limits that still apply.* Read as a whole, that isn't a
constraint — it's a **discussion of how much room the rule leaves**. The model
resolved it in the direction the discussion implied there was room.

The 0.6.3 version says only what the exemption *grants*: depth is more bullets.
Nothing about what it doesn't grant. Shorter, and it worked.

**The general form.** Qualifying detail is surface area, and every clause is a
foothold. A rule that lists its own edges has invited a negotiation about where
they are. Precision about scope is good; achieving it by enumeration is not.

---

## 4. A carve-out is a hole, and the agent will find it

**What happened.** hush's `Never compress` section carries a legitimate,
user-mandated carve-out:

> "Anything the user asked to have explained — requested depth is the deliverable."

Explain turns self-exempted from **every** limit in the style — line count, word
cap, punctuation ban, all of it. One benchmark task was a hard null across three
consecutive rounds (+2.9% / +3% / +2%, consistent enough to be a real null rather
than noise) while every other task improved by 20%+. Its middle turn was the
explain turn.

**The subtlety worth keeping.** The carve-out was *correct and had to stay* — an
earlier revision had dropped it, and that was flagged as a regression. The bug was
never that the exemption existed. The bug was that it didn't say **what it lifts**,
so it lifted everything.

**The fix, and its tension with #3.** A carve-out must scope itself as narrowly as
the rule it exempts — but #3 says enumerating scope reads as permission. These
pull against each other, and the resolution is directional:

> **Say what the exemption grants. Never say what it doesn't.**

"Depth is more bullets" grants exactly one thing and implies the rest still binds,
without listing the rest. The 0.6.2 attempt said what it *didn't* grant, in
detail, and lost.

**The general form.** Every exemption is a hole sized by its own wording. An
unscoped carve-out is sized *maximally*, because the reader deciding how big it is
happens to be the one who benefits from it being big.

---

## 5. A prohibition must name the instruction it overrides, or the baseline wins

This is the mechanism behind "the agent self-exempts via the baseline prompt", and
it is the one people are least likely to consider — you cannot see the competing
instruction from inside your own rule file.

**What happened.** hush's output style demands silence between tool calls. The
harness's own base prompt independently instructs:

> "Before your first tool call, say in a sentence what you're about to do."

Two instructions, direct conflict. The agent complied with the **specific** one.
Not out of preference — a specific instruction attached to a concrete moment
("before your first tool call") looks like the one written for exactly this
situation, while a general prohibition looks like background policy. Scope wins
conflicts.

**The dead lever.** `keep-coding-instructions: false` is a plugin setting that
looks like it should strip those baseline instructions. Probe-confirmed: **it does
not** remove that mandate. Do not revisit it. There is no configuration escape
from a competing instruction.

**What worked.** Overriding it *by name*, quoting the competing instruction inside
the rule and declaring who wins:

> "This overrides every harness instruction to preface a tool call, state what you
> are about to do, or post progress updates as you work — **including any rule
> that says to say in a sentence what you're about to do before your first tool
> call**, or to give brief updates when you find something load-bearing. Under
> this style those obligations are discharged by the final message instead."

Mid-turn narration 30.9 → 9.7 words/run. Silent runs 35% → 92%. Ground truth
26/26.

Note what that wording does beyond naming the competitor: it says where the
obligation *goes* ("discharged by the final message instead"). It doesn't delete
the baseline's goal, it re-routes it. See #6.

**The general form.** "You MUST NOT talk between turns" loses to any specific
instruction that says to talk at a specific moment, and both the base prompt and
the harness are full of those. Quote the competitor verbatim, declare the winner,
and say where the overridden obligation is satisfied instead. If you can't name
what you're competing with, you don't yet know why your rule isn't landing.

---

## 6. Prose can't govern a channel the agent overrides — give it an outlet

**What happened.** Forced silence produced a second-order problem: in unhushed
runs, a doubt-loop ended the moment the model wrote a visible "Found it" — the
act of committing out loud closed the loop. Silence removed that outlet, and the
loop ran unchecked (one run: four consecutive spiral blocks, 15.6k thinking
tokens).

**The attempt that failed.** Instruct the thinking channel directly: *"commit once
verified, don't re-litigate a misleading hint."* Same-batch A/B: it made the solo
arm think **~2× more** and didn't help the paired arm. Refuted and reverted. Prose
aimed at a channel the model freely overrides is the weakest lever available — it
gets rationalized past, and there's no mechanical enforcement possible (thinking
isn't tool output, so no hook can touch it).

**The fix.** Give the outlet back, don't constrain the channel. A fourth
speak-exception for settled verdicts:

> "You settle a diagnosis or choose between competing explanations — state the
> verdict in one line, then act on it. A verdict on the record stays settled;
> silence is for narration, never for verdicts."

Paired arm 8058 → 5423 mean thinking tokens, at/below the additive prediction.
Reps above 7k: 67% → 17%. No regression to the solo arm. Even the residual tail
rep showed the mechanism working as a circuit breaker: one spiral block, then a
text verdict closed it.

**The general form.** A rule that removes a behavior also removes whatever that
behavior was *doing*. If the behavior was load-bearing, the pressure resurfaces
somewhere you weren't measuring — usually somewhere more expensive. When a
restriction backfires, find where the pressure went and open a valve. Don't
tighten the restriction.

---

## 7. Register is not a lever; structure is

Worth recording because it's the intuitive move and it is measurably worthless.

**The experiment.** hush's output-style *phrasing* was swapped for an aggressive
fragment register — harder article-dropping, short-synonym rule, telegraphic
`[thing] [action] [reason].` patterns. The actual mechanism (hooks, compression)
stayed byte-identical, diff-verified.

**Result: null.** Cost identical. Output tokens lower by noise. Final-answer word
count dropped slightly but didn't reach tokens or cost. **Correctness dropped**
100% → 92%, same failure mode each time.

Meanwhile the structural caps in #1 delivered −19% read-words with **142/142**
correctness across the whole campaign.

**The general form.** Making it *sound* terser changes nothing and costs accuracy.
Making the units smaller changes everything. Compression of register is cosmetic;
compression of structure is real. If a wording change is fundamentally about
voice, don't bother measuring it — the measured answer has always been null here.

---

## How to test wording (or you will ship the wrong conclusion)

Each of these cost at least one wrong conclusion before it was learned.

- **Same-batch A/B against a frozen control.** Never against a remembered number
  from a previous session — control arms swing ±3–8% on their own, which is the
  size of most real effects here.
- **Read the transcripts.** Every root cause in this document came from reading
  raw output, never from the aggregate. Twice, a metric moved for a reason that
  had nothing to do with the change.
- **The per-task table carries the signal, never the mean.** One round's −9.0%
  average hid one task at −17% and one at **+3%**. Trusting the headline would
  have shipped the explain-turn bug invisibly.
- **Read the per-rep spread, not the mean.** Reinforced three separate times. A
  bimodal distribution (half clean, half blown-up) has a mean that describes
  nothing that ever happened.
- **n≤4 misreads noise as signal.** It did so twice in one session. Even n=6
  misled when the distribution was bimodal. n=8 on the task that matters beats
  n=4 on everything.
- **Check that the ground-truth check doesn't punish the desired behavior.** One
  task's check grepped the chat reply, while its final turn asked for a file to be
  written — so the terser arm scored zero for *correctly* obeying. That's a
  scoring bug that reads exactly like a regression.

---

## The checklist

Before shipping any rule, style clause, or skill instruction:

1. **What unit does it cap, and what can grow inside that unit?** If the contents
   are unbounded, the cap is decorative. Cap the growing unit; ban the joinery.
2. **Does it describe the failure it prevents?** Delete the description. State
   only the rule.
3. **Does it enumerate what still applies, or list its own edges?** Delete the
   enumeration. Scope by what it grants.
4. **Does it carve out an exemption?** Say what the exemption grants, never what
   it doesn't. An unscoped carve-out is sized maximally.
5. **Does a baseline or harness instruction say the opposite?** Name it verbatim,
   declare who wins, and say where the overridden obligation goes instead.
6. **Does it constrain a channel you can't mechanically enforce?** Find the outlet
   the behavior was providing and re-open it elsewhere. Don't tighten.
7. **Is it fundamentally a register change?** It won't work. Don't spend the
   budget.

And the meta-rule the whole document keeps arriving at:

> **When a clause backfires, the answer is almost never more words.**
> Both proven priming failures were fixed by deletion. The structural win came
> from a smaller unit, not a stronger adjective. Reach for "what is this rule
> actually letting the agent do?" before reaching for MUST.
