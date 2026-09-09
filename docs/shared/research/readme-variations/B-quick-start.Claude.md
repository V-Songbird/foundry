<!-- foundry:edition Claude -->
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../../../hush/assets/banner-dark.png" />
    <img src="../../../../hush/assets/banner-light.png" alt="hush" width="900" />
  </picture>
  <h1>hush</h1>
  <p><strong>Keep the result. Cut the running commentary.</strong></p>
</div>

<!-- foundry:platform identity -->
**Edition: Claude Code.** Use this edition’s installation and compatibility notes below.
<!-- /foundry:platform identity -->

[Install](#install) · [Using Hush](#what-you-can-do) · [Evidence](#the-numbers) · [Limits](#good-to-know)

## What is this?

Hush makes coding sessions quieter and final answers easier to scan. It combines narration controls, shorter command output and a writing voice you can change.

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

**Start with the shipped voice.** Try a normal coding task and check that the final answer gives you the result and what to do next.

**Adjust the voice when needed.** Choose a different style or describe your own.

**Follow the output reference for detail.** Full-output files are temporary, so keep a separate copy if you need a lasting record.

<!-- foundry:platform commands -->
Use `/hush:pick-style` to choose a voice and `/hush:craft-style` to describe a new one. See the settings guide for disabling the session controls.
<!-- /foundry:platform commands -->

<p align="center"><img src="../../../../hush/assets/mascot.svg" alt="Ember quiets the speech bubbles and log pile, then returns to calm typing." width="700"></p>

## Why you'd want it

Use Hush if you spend too much time scrolling past progress narration and command output to find what changed. It aims to keep the result and the next useful action easy to find.

## How it works

Narration reminders, command-output controls and the writing style do separate jobs. The voice changes the wording; the other controls manage what appears while work happens. Full-output references let you inspect shortened results where supported.

## Good to know

Correctness comes before silence. A short answer can still omit something you need, and quieter sessions do not always cost less. Check the result and next action, especially when trying a different voice.

<!-- foundry:platform compatibility -->
Full-output references point to temporary files. Disabling runtime controls and restoring the writing style are separate actions. See [Settings](../../../../hush/docs/SETTINGS.md) for switches and platform-specific retention behavior.
<!-- /foundry:platform compatibility -->

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
<p align="center"><img src="../../../../hush/assets/hero.svg" alt="Hush original product visualization" width="700"></p>

Original Claude Code benchmark visualization. These measurements describe the recorded Claude sessions, not Codex performance. [Evidence and methodology](https://github.com/V-Songbird/foundry/tree/main/docs/hush).

<details>
<summary>Watch the recorded Claude Code demo</summary>

<p align="center"><img src="../../../../hush/assets/demo.svg" alt="Recorded Claude Code demonstration of Hush" width="700"></p>

</details>
<!-- /foundry:hero -->

*Results can vary between runs.*

## Going deeper

<!-- foundry:platform links -->
[How it works](../../../../hush/docs/HOW-IT-WORKS.md) · [Settings](../../../../hush/docs/SETTINGS.md) · [Benchmark details](../../../../hush/docs/BENCHMARKS.md)
<!-- /foundry:platform links -->

[Foundry](https://github.com/V-Songbird/foundry) holds the research, methodology and detailed evidence.

## License

MIT — see [LICENSE](../../../../hush/LICENSE).
