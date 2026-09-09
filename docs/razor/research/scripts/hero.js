'use strict';
// Replot razor's hero poster from a benchmark run's results.json.
//
// The poster's data model, recovered from the shipped SVG and verified against
// run 20260819-003203 (it reproduces "160 lines never shipped" exactly):
//
//   9 dependency jobs, Opus only. One column per no-plugin session (27 of them),
//   sorted ascending inside each job. Column height is that session's total_loc.
//   The green edge sits at razor's MEDIAN loc for the same job; the pale cap on
//   a column is whatever the no-plugin session wrote above that edge. The
//   headline is the sum of those caps.
//
//   node hero.js <run-dir> [out.svg]

const fs = require('node:fs');
const path = require('node:path');

const DEP_JOBS = [
  'dep-slug', 'dep-querystring', 'dep-uuid', 'dep-http', 'dep-retry',
  'dep-dotenv', 'dep-http-lib', 'dep-retry-lib', 'dep-dotenv-lib',
];

const runDir = process.argv[2];
if (!runDir) { console.error('usage: node hero.js <run-dir> [out.svg]'); process.exit(1); }
const rows = JSON.parse(fs.readFileSync(path.join(runDir, 'results.json'), 'utf8')).results;

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const loc = (task, arm) => rows
  .filter((r) => r.task === task && r.arm === arm && r.model === 'opus' && typeof r.total_loc === 'number')
  .map((r) => r.total_loc);

const jobs = DEP_JOBS.map((task) => {
  const base = loc(task, 'baseline').sort((a, b) => a - b);
  const edge = median(loc(task, 'razor'));
  return { task, base, edge, offcut: base.reduce((s, b) => s + Math.max(0, b - edge), 0) };
});

const sessions = jobs.reduce((s, j) => s + j.base.length, 0);
const offcut = jobs.reduce((s, j) => s + j.offcut, 0);
const maxLoc = Math.max(...jobs.flatMap((j) => j.base));

// --- geometry (as shipped) ---------------------------------------------------
const BASE_Y = 228;      // the axis every column stands on
const TALLEST = 162;     // px the biggest column gets; sets the scale
const COL_W = 13;
const COL_GAP = 15;      // left edge to left edge, inside a job
const X0 = 24;
const JOB_GAP = (633 - X0) / (DEP_JOBS.length - 1);
const s = TALLEST / maxLoc;

const n = (v) => Number(v.toFixed(1));
const parts = [];
const edgePts = [];

jobs.forEach((job, i) => {
  const jobX = X0 + i * JOB_GAP;
  job.base.forEach((b, k) => {
    const x = n(jobX + k * COL_GAP);
    const solid = Math.min(b, job.edge);
    const cap = Math.max(0, b - job.edge);
    parts.push(`<rect class="sd" x="${x}" y="${n(BASE_Y - solid * s)}" width="${COL_W}" height="${n(solid * s)}" rx="2"/>`);
    if (cap > 0) {
      // height spans the rounded tops, not the raw product — matches the shipped file
      parts.push(`<rect class="gh" x="${x}" y="${n(BASE_Y - b * s)}" width="${COL_W}" height="${n(n(BASE_Y - solid * s) - n(BASE_Y - b * s))}" rx="2"/>`);
    }
  });
  const y = n(BASE_Y - job.edge * s);
  edgePts.push(`${n(jobX - 3)} ${y}`, `${n(jobX + 46)} ${y}`);
});

const d = 'M' + edgePts.join('L').replace(/ /g, ' ');
const edgePath = 'M' + edgePts.map((p) => p.replace(' ', ' ')).join('L');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 340" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" role="img" aria-label="Columns of code sliced by razor&#8217;s edge; the pale tops never ship"><style>.bg{fill:#f2f1ec;stroke:rgba(20,20,19,.14)}.ink{fill:#161612}.mut{fill:#6d6a60}.sd{fill:#b9b5a8}.gh{fill:rgba(20,20,19,.13)}.ed{stroke:#059669}.gl{stroke:#059669}.el{fill:#059669}.bl{stroke:rgba(20,20,19,.14)}@media(prefers-color-scheme:dark){.bg{fill:#141413;stroke:#30363d}.ink{fill:#ffffff}.mut{fill:#b9b9b1}.sd{fill:#3a3a37}.gh{fill:rgba(255,255,255,.10)}.ed{stroke:#3fb950}.gl{stroke:#3fb950}.el{fill:#3fb950}.bl{stroke:#30363d}}</style><rect class="bg" width="700" height="340" rx="14"/><text class="el" x="24" y="196" font-size="13.5" font-weight="700">&#9472; the razor&#8217;s edge</text>${parts.join('')}<path class="gl" d="${edgePath}" fill="none" stroke-width="8" opacity=".2" stroke-linecap="round" stroke-linejoin="round"/><path class="ed" d="${edgePath}" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><line class="bl" x1="24" x2="676" y1="228" y2="228" stroke-width="1"/><text class="ink" x="24" y="293" font-size="46" font-weight="800" letter-spacing="-1">${offcut} lines never shipped.</text><text class="mut" x="24" y="322" font-size="16.5">${sessions} Opus sessions. The pale part is what plain Claude wrote above the edge.</text></svg>`;

const out = process.argv[3];
if (out) fs.writeFileSync(out, svg);
else process.stdout.write(svg);

console.error(`jobs ${jobs.length}  sessions ${sessions}  offcut ${offcut}  maxLoc ${maxLoc}  scale ${s.toFixed(4)}`);
for (const j of jobs) console.error(`  ${j.task.padEnd(16)} base ${j.base.join('/').padEnd(12)} edge ${String(j.edge).padEnd(4)} cap ${j.offcut}`);
