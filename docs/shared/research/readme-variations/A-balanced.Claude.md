<!-- foundry:edition Claude -->
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../launch/assets/ember-brand-kit/hush/banner-dark.png" />
    <img src="../../launch/assets/ember-brand-kit/hush/banner-light.png" alt="hush" width="900" />
  </picture>
  <h1>hush</h1>
  <p><strong>Less chatter. A clear answer when the work is done.</strong></p>
</div>

<!-- foundry:platform identity -->
**Edition: Claude Code.** Use this edition’s installation and compatibility notes below.
<!-- /foundry:platform identity -->

[Install](#install) · [Using Hush](#what-you-can-do) · [Evidence](#the-numbers) · [Limits](#good-to-know)

## What is this?

Hush reduces running commentary and long command output, so the result is easier to find. It also lets you choose how the final answer reads.

<p align="center"><img src="../../launch/assets/ember-approved/hush.svg" alt="Ember quiets the speech bubbles and log pile, then returns to calm typing." width="700"></p>

## Why you'd want it

- Follow the outcome without reading every step.
- Open the full command output when you need more detail.
- Choose a writing voice or describe your own.

## How it works

Hush works on three parts of a session: reminders discourage unnecessary narration, output controls shorten large command results, and a writing style shapes the final answer. Changing the voice does not turn off the other controls.

## Install

<!-- foundry:platform install -->
Inside Claude Code:

```text
/plugin marketplace add V-Songbird/foundry
/plugin install hush@foundry
```

Start a new session to load the plugin.
<!-- /foundry:platform install -->

## What you can do

| When you want to… | Hush helps you… |
| --- | --- |
| Check what happened | Find the result and the next action in the final answer |
| Read a large command result | Start with shortened output and follow its full-output reference |
| Change the tone | Pick a voice or describe one of your own |

<!-- foundry:platform commands -->
Use `/hush:pick-style` to choose a voice and `/hush:craft-style` to describe a new one. See the settings guide for disabling the session controls.
<!-- /foundry:platform commands -->

## The numbers

The comparison asks whether jobs were completed correctly, how often the assistant gave at most one update, and how long its final answers were. These observations do not guarantee the same behavior in your sessions.

<!-- foundry:platform benchmarks -->
<!-- foundry:evidence {"platform":"Claude","status":"measured","models":["Claude Opus 5"],"source":"docs/hush/validation/claude-readme-benchmark-source-2026-09-08.md","date":"unknown","revision":"13c24a9bd610a39740eb2816b54cc16b090978ed","dateReason":"The retained source excerpt does not state a run date.","reviewedAt":"2026-09-08"} -->
| Model | Setup | Jobs right | At most one update | Final words |
| --- | --- | --- | --- | --- |
| Claude Opus 5 | No plugin | 36/36 | 14/36 | 367 |
| Claude Opus 5 | caveman | 36/36 | 31/36 | 151 |
| Claude Opus 5 | hush | 36/36 | 36/36 | 69 |

The final answer was shorter, but the next runnable action was retained in 94% of hush sessions versus 100% for the other setups. Three quiet jobs cost 1–10% more. These results describe the recorded Claude run.
The retained source describes nine jobs and 36 sessions per setup. The run date is unknown; the source was reviewed on 2026-09-08. The settings guide states that published measurements used `HUSH_WRAP=1` and the shipped writing voice. [Retained benchmark source](../../../hush/validation/claude-readme-benchmark-source-2026-09-08.md).
<!-- /foundry:platform benchmarks -->

<!-- foundry:hero -->
<p align="center"><img src="../../launch/assets/graphics-ink/hush-hero.svg" alt="Hush original product visualization" width="700"></p>

Original Claude Code benchmark visualization. These measurements describe the recorded Claude sessions, not Codex performance. [Evidence and methodology](https://github.com/V-Songbird/foundry/tree/main/docs/hush).

<details>
<summary>Watch the recorded Claude Code demo</summary>

<p align="center"><img src="../../launch/assets/graphics-ink/hush-demo.svg" alt="Recorded Claude Code demonstration of Hush" width="700"></p>

</details>
<!-- /foundry:hero -->

*Results can vary between runs.*

## Going deeper

<!-- foundry:platform links -->
[How it works](../../../../hush/docs/HOW-IT-WORKS.md) · [Settings](../../../../hush/docs/SETTINGS.md) · [Benchmark details](../../../../hush/docs/BENCHMARKS.md)
<!-- /foundry:platform links -->

[Foundry](https://github.com/V-Songbird/foundry) holds the research, methodology and detailed evidence.

## Good to know

Correctness comes before silence. A short answer can still omit something you need, and quieter sessions do not always cost less. Check the result and next action, especially when trying a different voice.

<!-- foundry:platform compatibility -->
Full-output references point to temporary files. Disabling runtime controls and restoring the writing style are separate actions. See [Settings](../../../../hush/docs/SETTINGS.md) for switches and platform-specific retention behavior.
<!-- /foundry:platform compatibility -->

## License

MIT — see [LICENSE](../../../../hush/LICENSE).
