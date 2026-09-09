# Writing for a reader who cannot sustain reading — evidence behind the `Hush Sightline` style

2026-07-19. Deep-research run (6 angles, 28 sources fetched, 140 claims extracted,
25 adversarially verified, 11 confirmed / 14 refuted). Local-only, gitignored.

Motivating case: a developer with 9 years' experience, non-native English speaker,
who abandons text past a few lines, whose team runs everything through AI (stories,
PR comments, docs). Net effect reported: they stopped reading, started accepting all
changes, and no longer understand their own codebase. The ask was a hush output style
that reduces reading **and** raises understanding.

## The headline finding, and why it cuts against hush's instinct

**Brevity is not the evidenced mechanism.** The multimedia-learning corpus confirms
three separate levers, and two of them ADD text:

| Lever | What it means | Effect | Source |
| --- | --- | --- | --- |
| Coherence | Remove what is not essential to the reader's decision | confirmed positive, no usable per-principle number | Noetel et al. 2022; Mayer & Jackson 2005 |
| Signaling | Mark which parts are load-bearing | d ≈ 0.38–0.44; retention g+ = 0.53, transfer g+ = 0.33 | Alpizar 2020; Schneider 2018; Ponce & Mayer 2022 |
| Segmenting | Chunk into meaningful units | retention d = 0.32, transfer d = 0.36 | Rey et al. 2019 |

If raw volume reduction were the mechanism, adding cues and chunk boundaries would
degrade learning. It does the opposite. Mayer & Jackson sharpen it further: detail
that is **on topic but not essential** also damaged qualitative understanding. So the
rule is "cut by relevance", not "cut by length".

Geoffrey Litt's actual artifact converges from the design side. His `explain-diff`
skill mandates four sections — Background, Intuition, Code, Quiz — and a targeted
search of that prompt for any brevity, length or conciseness instruction returns
**nothing**. Every move it mandates adds text: two layers of background, liberal
diagrams, toy-data examples, five interactive questions. His Code section is an
explicit re-ordering of the diff into comprehension order rather than file order.

## What the style does with each finding

1. **Cut by relevance, not by length.** Stock hush already had the clause test and the
   cut-list. Kept verbatim, plus one added line: judge each line by whether the reader
   needs it to accept, question, or act — not by how long the message is running.
2. **Signaling, bounded.** Bold at most three things, always the same ones. This is the
   one lever with a real number, and it is also the one that goes **negative** when
   mis-aimed: pre-supplied highlighting of the wrong content damaged both comprehension
   and readers' calibration of their own understanding (Gier et al.). Hence the added
   clause: leave a thing unmarked when you are unsure it belongs.
3. **The rule line.** One line, second position, describing the system rather than the
   task — ordering, ownership, what a value means. This is Litt's "intuition before
   details" plus segmenting's explicit boundary between what changed and why. It carries
   a real name or value from the code, per Litt's "concrete examples with toy data".
4. **Structure constant, depth variable.** The expertise-reversal meta-analysis
   (Tetzlaff et al. 2025, 176 effect sizes, N = 5,924) is the one moderator that flips
   sign: low prior knowledge learns better from high assistance (d = +0.505), high prior
   knowledge from low assistance (d = −0.428), and the asymmetry favours explaining when
   expertise is unknown. Structural cueing does **not** show that reversal. So the
   skeleton is fixed for every reader and only depth varies — and when the reader's
   knowledge is unknown, keep the rule line and spell the term out.
5. **The check question.** Layout buys recall far more than application — transfer
   effects run roughly half of retention. Anything requiring the reader to APPLY the
   change needs a different mechanism than formatting. The check line is that mechanism.
   Its shape follows Litt's updated recipe: ask about behaviour, causality, contracts,
   edge cases, or trade-offs, never a phrase lookup.

## What is NOT evidenced — do not claim these

This matters more than the confirmations, because all of it sounds true.

- **No sentence-length, word-count, syllable, or reading-grade threshold survived.**
  The GOV.UK 25-word limit and every readability-formula target went unverified.
  hush's own 15-word cap stands on hush's own A/B evidence, not on this literature.
- **No vocabulary-frequency target for non-native readers survived.** The ESL 95%/98%
  coverage and 4–5K/8K word-family thresholds were all refuted 0-3.
- **No question-dosage evidence survived.** The practice-testing meta-analysis claims,
  including the tempting "one test beats several" (g = 0.70 vs 0.51), were refuted.
  One question per turn is **practitioner consensus, not a measured optimum**. Litt's
  five is a prompt-design choice with no efficacy data attached, and his multiple-choice
  format is recognition, not the free recall the testing-effect literature measures.
- **Nothing on ADHD, attention, skimming, or F-pattern reading returned any claim.**
  Whether shorter text improves a low-attention adult's *comprehension* or merely
  reduces their *effort* is unresolved. Those two goals can pull in opposite directions.
- **Nothing on code-review comprehension or AI-generated PR descriptions returned any
  claim.** The most decision-relevant question — do reviewers who read an LLM summary
  understand the diff better, or only feel they do and approve faster — is open.

## External validity, stated plainly

Every effect size here comes from instructional media with student learners on immediate
post-tests. Not one study measured a professional developer reading assistant output.
Two moderators cut against naive transfer: design benefits are larger in system-paced
settings than self-paced ones, and reading assistant output is self-paced; and Cromley &
Chen (2025, 92 articles, 591 effects) find every one of nine moderators significant with
a per-year decline, so published d values are lab ceilings, not expected returns.

Treat the mechanisms as transferable and the numbers as not.

## Sources

- Noetel et al. (2022), Review of Educational Research 92(3), DOI 10.3102/00346543211052329
- Alpizar, Adesope & Wong (2020), ETR&D 68(5), DOI 10.1007/s11423-020-09748-7
- Schneider, Beege, Nebel & Rey (2018), Educational Research Review 23, DOI 10.1016/j.edurev.2017.11.001
- Ponce, Mayer et al. (2022), Educational Psychology Review, DOI 10.1007/s10648-021-09654-1
- Rey et al. (2019), Educational Psychology Review 31, DOI 10.1007/s10648-018-9456-4
- Tetzlaff, Simonsmeier, Peters & Brod (2025), Learning and Instruction 98, DOI 10.1016/j.learninstruc.2025.102142
- Cromley & Chen (2025), Educational Research Review 49, DOI 10.1016/j.edurev.2025.100730
- Mayer & Jackson (2005), J. Exp. Psychol. Applied 11(1), DOI 10.1037/1076-898X.11.1.13
- ISO 24495-1:2023, Plain language — Part 1
- Litt, "Understanding is the new bottleneck", https://www.geoffreylitt.com/2026/07/02/understanding-is-the-new-bottleneck.html
- Litt, `explain-diff` skill, https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524

Full verified/refuted record with per-claim vote counts:
`X:/Temp/.../092f5590-adf7-4b24-911c-f57e47b89a83/tasks/wxgqakzbb.output` (session-scoped).
