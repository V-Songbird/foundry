// Redraw hush's "What hush cuts" bar chart from one batch's records.
// Same geometry as the shipped assets/bench-cuts.svg — only the four pairs of
// numbers move. The baseline bar is always full width; hush's is drawn to
// scale against it.
//
//   node docs/hush/research/scripts/hush-draw-cuts.js <recordsDir/batchId> <out.svg>
const fs = require('fs');
const p = require('path');

const DIR = process.argv[2];
const OUT = process.argv[3];

const runs = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && f !== 'batch.json')
  .map((f) => JSON.parse(fs.readFileSync(p.join(DIR, f), 'utf8')))
  .filter((r) => !r.error);
const reps = JSON.parse(fs.readFileSync(p.join(DIR, 'batch.json'), 'utf8')).reps;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const of = (arm, f) => mean(runs.filter((r) => r.arm === arm).map(f));

const ROWS = [
  { label: 'command output', read: (r) => r.toolResultChars,
    show: (v) => `${(v / 1000).toFixed(1)}k chars`, aria: (v) => `${(v / 1000).toFixed(1)}k chars` },
  { label: 'chatter while working', read: (r) => r.narrationWords,
    show: (v) => `${Math.round(v)} words`, aria: (v) => `${Math.round(v)} words` },
  { label: "Claude's whole-session output", read: (r) => r.usage?.output_tokens || 0,
    show: (v) => `${Math.round(v).toLocaleString('en-US')} tok`, aria: (v) => `${Math.round(v).toLocaleString('en-US')} tok` },
  // No cost row. A suite-wide cost percentage is the one figure this harness
  // cannot hold still — seven Sonnet reads of the same comparison have spanned
  // -14.9% to +4.2%, and one job flipping direction moves it double digits.
  // Per-job costs belong in the benchmarks page, not on a poster.
];

const data = ROWS.map((row) => {
  const b = of('baseline', row.read);
  const h = of('hush', row.read);
  return { ...row, b, h, pct: Math.round(((h - b) / b) * 100) };
});

const sessions = runs.filter((r) => r.arm === 'hush').length;
const aria = `What hush cuts, averaged per session over the same 8 jobs on Opus 5 at medium effort, ${reps} runs each way. `
  + data.map((d) => `${d.label}: no plugin ${d.aria(d.b)}, hush ${d.aria(d.h)}, ${d.pct <= 0 ? 'minus' : 'plus'} ${Math.abs(d.pct)}%.`).join(' ');

const STYLE = ".card{fill:#fcfcfb}.card{stroke:rgba(11,11,11,.07)}.ink{fill:#0b0b0b}.ink2{fill:#52514e}.mut{fill:#898781}.bp{fill:#dcd9d0}.cw{fill:#e3f2e3}.cwt{fill:#0a6b0a}.cf{fill:#f0efeb}.cft{fill:#52514e}.ac{fill:#2a78d6}@media(prefers-color-scheme:dark){.card{fill:#161b22}.card{stroke:#30363d}.ink{fill:#e6edf3}.ink2{fill:#b0b8c0}.mut{fill:#9198a1}.bp{fill:#3d3c37}.cw{fill:#17301f}.cwt{fill:#3fb950}.cf{fill:#2b2b29}.cft{fill:#9198a1}.ac{fill:#4c9be8}}";

let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 284" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" role="img" aria-label="${aria.replace(/"/g, '&quot;')}"><style>${STYLE}</style>`;
s += '<filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#0b0b0b" flood-opacity=".10"/></filter>';
s += '<rect class="card" x="8" y="6" width="684" height="258" rx="18" filter="url(#s)"/>';
s += '<text class="ink" x="36" y="46" font-size="21" font-weight="800">What hush cuts</text>';
s += `<text class="mut" x="36" y="68" font-size="14.5">average per session on the same 8 jobs &#8212; gray is no plugin, blue is hush</text>`;

const FULL = 196;
data.forEach((d, i) => {
  const dy = 46 * i;
  // A gain would run past the reference bar; clamp so the card never overflows.
  const w = Math.max(4, Math.min(FULL * 1.2, (FULL * d.h) / d.b));
  const cls = d.pct <= 0 ? 'cw' : 'cf';
  const txt = d.pct <= 0 ? 'cwt' : 'cft';
  const sign = d.pct <= 0 ? '\u2212' : '+';
  s += `<text class="ink" x="36" y="${111 + dy}" font-size="15" font-weight="600">${d.label.replace(/'/g, '&#39;')}</text>`;
  s += `<rect class="bp" x="252" y="${90 + dy}" width="${FULL.toFixed(1)}" height="14" rx="7"/>`;
  s += `<text class="ink2" x="560" y="${102 + dy}" font-size="13.5" text-anchor="end">${d.show(d.b)}</text>`;
  s += `<rect class="ac" x="252" y="${108 + dy}" width="${w.toFixed(1)}" height="14" rx="7"/>`;
  s += `<text class="ink2" x="560" y="${120 + dy}" font-size="13.5" text-anchor="end">${d.show(d.h)}</text>`;
  s += `<rect class="${cls}" x="602" y="${93 + dy}" width="56" height="26" rx="13"/>`;
  s += `<text class="${txt}" x="630" y="${111 + dy}" font-size="14.5" font-weight="800" text-anchor="middle">${sign}${Math.abs(d.pct)}%</text>`;
});

s += '<circle class="bp" cx="42" cy="242" r="5"/><text class="ink2" x="53" y="247" font-size="14" font-weight="600">no plugin</text>';
s += '<circle class="ac" cx="140" cy="242" r="5"/><text class="ink2" x="151" y="247" font-size="14" font-weight="600">hush</text>';
s += '<text class="mut" x="664" y="247" font-size="13.5" text-anchor="end">numbers move a few percent run to run</text></svg>';

fs.writeFileSync(OUT, s);
console.log(`${OUT}: ${sessions} hush sessions, ${reps} reps`);
for (const d of data) console.log(`  ${d.label.padEnd(30)} ${d.show(d.b)} -> ${d.show(d.h)}  ${d.pct}%`);
