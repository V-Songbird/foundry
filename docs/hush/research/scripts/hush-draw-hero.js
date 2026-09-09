// Draft hush hero poster, replotted on the CURRENT eight-job suite.
// Same metaphor as the shipped poster: one spike per session, words of
// play-by-play before the answer, going flat where hush is installed.
//
// Basis: whichever batch ids are passed on the command line. Every bar below
// is one real session's narrationWords.
//
//   node hush-draw-hero.js <recordsDir> <out.svg> <batchId...>
const fs = require('fs');
const p = require('path');

const BASE = process.argv[2];
const OUT = process.argv[3];
// Batch ids come in on the command line now, so one poster can be replotted
// from whichever batch is the published basis.
const BATCHES = process.argv.slice(4);

function arm(name) {
  const rows = [];
  for (const b of BATCHES) {
    const d = p.join(BASE, b);
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.json') || f === 'batch.json') continue;
      const r = JSON.parse(fs.readFileSync(p.join(d, f), 'utf8'));
      if (r.arm !== name) continue;
      // Bars stay on words — that waveform is the picture. The caption is a
      // message count, so each row carries both. The CLI writes its own
      // failures into the assistant stream, so filter them the way the shipped
      // metrics.js does or a dropped connection reads as narration.
      const texts = (r.narrationTexts || []).filter(
        (t) => /\S/.test(t) && !/^(API Error|Execution error|Request timed out)\b/.test(t.trim())
      );
      rows.push({ b, o: r.orderIndex, w: r.narrationWords || 0, m: texts.length });
    }
  }
  rows.sort((a, b) => a.b.localeCompare(b.b) || a.o - b.o);
  return rows;
}

const leftRows = arm('baseline');
const rightRows = arm('hush');
const left = leftRows.map((r) => r.w);
const right = rightRows.map((r) => r.w);
const PEAK = Math.max(...left, ...right); // one scale for both sides
const AMP = 40; // half-height in px at PEAK
const MID = 105;
const L0 = 24, L1 = 346, R0 = 368, R1 = 676;

const half = (w) => (w === 0 ? 0 : Math.max(1.6, (AMP * w) / PEAK));

function bars(vals, x0, x1, cls, sw) {
  const step = (x1 - x0) / (vals.length - 1);
  return vals
    .map((w, i) => {
      const h = half(w);
      if (h === 0) return '';
      const x = (x0 + i * step).toFixed(1);
      return `<line class="${cls}" x1="${x}" x2="${x}" y1="${(MID - h).toFixed(1)}" y2="${(
        MID + h
      ).toFixed(1)}" stroke-width="${sw}" stroke-linecap="round"/>`;
    })
    .join('');
}

// Every model opens a turn with a line about what it is about to do, and no
// wording has ever removed that for good. So the claim is not "never speaks",
// it is "speaks once, then nothing" — and that one is categorical, where the
// zero-word count slides with how long the session runs.
const onceL = leftRows.filter((r) => r.m <= 1).length;
const onceR = rightRows.filter((r) => r.m <= 1).length;
const worstL = Math.max(...leftRows.map((r) => r.m));
const worstR = Math.max(...rightRows.map((r) => r.m));
const caption = `${onceR} of ${right.length} sessions: one message at most before the answer.`;
const alt =
  'A poster of the whole benchmark suite as one waveform, one spike per run — words of play-by-play ' +
  `before the answer. Left of the hush-installed divider, ${left.length} sessions without the plugin spike to ` +
  `${Math.max(...left)} words, and the loudest breaks in ${worstL} separate times. Right of it, the same ` +
  `${right.length} sessions with hush run flat: every one of them speaks at most ${worstR === 1 ? 'once' : `${worstR} times`}, ` +
  `and nothing runs over ${Math.max(...right)} words. It reads: Quiet.`;

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 300" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" role="img" aria-label="${alt}">` +
  `<style>.bg{fill:#f2f1ec}.bg{stroke:rgba(20,20,19,.14)}.ink{fill:#161612}.mut{fill:#6d6a60}.wv{stroke:#8f8b80}.md{stroke:#8f8b80}.dv{stroke:#b5b1a4}.ac{stroke:#2a78d6}` +
  `@media(prefers-color-scheme:dark){.bg{fill:#141413}.bg{stroke:#30363d}.ink{fill:#ffffff}.mut{fill:#b9b9b1}.wv{stroke:#5a5a55}.md{stroke:#5a5a55}.dv{stroke:#3a3a37}.ac{stroke:#4c9be8}}</style>` +
  `<rect class="bg" width="700" height="300" rx="14"/>` +
  `<line class="md" x1="${L0}" x2="${L1}" y1="${MID}" y2="${MID}" stroke-width="1.1" opacity=".55"/>` +
  bars(left, L0, L1, 'wv', 3.4) +
  `<line class="dv" x1="357" x2="357" y1="36" y2="174" stroke-width="1.5" stroke-dasharray="4 5"/>` +
  `<text class="mut" x="357" y="194" font-size="13" text-anchor="middle">hush installed</text>` +
  `<line class="ac" x1="${R0}" x2="${R1}" y1="${MID}" y2="${MID}" stroke-width="3" stroke-linecap="round"/>` +
  bars(right, R0, R1, 'ac', 3.4) +
  `<text class="ink" x="24" y="248" font-size="54" font-weight="800" letter-spacing="-1">Quiet.</text>` +
  `<text class="mut" x="24" y="279" font-size="16.5">${caption}</text>` +
  `</svg>`;

fs.writeFileSync(OUT, svg);
console.log(`peak=${PEAK}  at-most-one baseline=${onceL}/${left.length} hush=${onceR}/${right.length}` +
  `  worst baseline=${worstL}msg hush=${worstR}msg  zero-word hush=${right.filter((w) => w === 0).length}/${right.length}` +
  `  hush loudest=${Math.max(...right)}w  bytes=${svg.length}`);
console.log(`\nalt:\n${alt}`);
