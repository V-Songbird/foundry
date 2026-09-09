// Lesson Ledger probe P0 — free, no model calls.
// Question 1: what fraction of closed entries' notes already carry a
//   path-naming, generalizing line? If that yield is ~0, the write side of
//   the ledger is dead weight and the design collapses to Task 1.
// Question 2 (graft 4): do closed entries cluster by dominant top-level
//   prefix of their touches? That is the design's own admitted weak point.
// Spec: docs/foreman/research/foreman-lesson-ledger-design-2026-08-11.md, "Measurement plan".

const fs = require("fs");
const path = require("path");

const ROOT = "D:/Projects/Personal/SoftwareDevelopment/claude-plugins";

function load(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((e) => e && e.id);
}

const entries = [
  ...load(path.join(ROOT, "ROADMAP.jsonl")),
  ...load(path.join(ROOT, ".foreman", "archive.jsonl")),
];

const closed = entries.filter((e) => e.status === "done");

// A path token: something that looks like a real file or directory reference.
const PATH_RE = /(?:[\w.-]+\/)+[\w.-]+\.\w{1,5}|[\w-]+\.(?:js|md|json|jsonl|yml|yaml|test\.js)\b/;

// A generalizing marker: the line states a rule for next time, not a log of
// what happened. Keyword proxy — deliberately broad, so the yield is an
// upper bound, not an estimate.
const LESSON_RE =
  /\b(never|always|must|do not|don't|beware|careful|remember|note that|gotcha|trap|lesson|the rule|so nobody|so a future|next time|otherwise|instead of|watch out|make sure|ensure that)\b/i;

function noteLines(e) {
  return String(e.notes || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

let withPath = 0;
let withLesson = 0;
let withBoth = 0;
const examples = [];

for (const e of closed) {
  const lines = noteLines(e);
  const p = lines.some((l) => PATH_RE.test(l));
  const g = lines.some((l) => LESSON_RE.test(l));
  const both = lines.find((l) => PATH_RE.test(l) && LESSON_RE.test(l));
  if (p) withPath++;
  if (g) withLesson++;
  if (both) {
    withBoth++;
    if (examples.length < 8) examples.push(`  ${e.id}: ${both.slice(0, 150)}`);
  }
}

const pct = (n) => ((n / closed.length) * 100).toFixed(1) + "%";

console.log("== P0.1 — does the write side already happen by hand? ==");
console.log(`closed entries examined: ${closed.length}`);
console.log(`  notes naming any path:                 ${withPath} (${pct(withPath)})`);
console.log(`  notes with a generalizing marker:      ${withLesson} (${pct(withLesson)})`);
console.log(`  notes with BOTH on the same line:      ${withBoth} (${pct(withBoth)})  <-- the yield`);
console.log("\nsample of the both-on-one-line hits:");
console.log(examples.join("\n") || "  (none)");

// P0.2 — clustering by dominant top-level prefix.
function prefixOf(p) {
  const norm = String(p).split("\\").join("/");
  const seg = norm.split("/");
  if (seg.length === 1) return "<root>";
  // one level deeper inside the plugin, which is where the real areas are
  if (["foreman", "hush", "razor", "benchmarks", "docs", "scripts"].includes(seg[0]) && seg.length > 2) {
    return seg[0] + "/" + seg[1];
  }
  return seg[0];
}

const clusters = {};
let noTouches = 0;
for (const e of closed) {
  const touches = (e.observed_touches && e.observed_touches.length ? e.observed_touches : e.planned_touches) || [];
  if (!touches.length) {
    noTouches++;
    continue;
  }
  const counts = {};
  for (const t of touches) {
    const k = prefixOf(t);
    counts[k] = (counts[k] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [top, n] = sorted[0];
  const share = n / touches.length;
  clusters[top] = clusters[top] || { entries: 0, dominant: 0, shares: [] };
  clusters[top].entries++;
  clusters[top].shares.push(share);
  if (share >= 0.6) clusters[top].dominant++;
}

console.log("\n== P0.2 — do closed entries cluster by area? ==");
console.log(`closed entries with no touches recorded: ${noTouches}`);
const rows = Object.entries(clusters).sort((a, b) => b[1].entries - a[1].entries);
let totalWith = 0;
let totalDominant = 0;
for (const [area, c] of rows) {
  totalWith += c.entries;
  totalDominant += c.dominant;
  const avg = (c.shares.reduce((a, b) => a + b, 0) / c.shares.length) * 100;
  console.log(
    `  ${area.padEnd(24)} entries ${String(c.entries).padStart(3)}   >=60% of touches in this area: ${String(c.dominant).padStart(3)}   mean share ${avg.toFixed(0)}%`
  );
}
console.log(
  `\n  overall: ${totalDominant}/${totalWith} closed entries (${((totalDominant / totalWith) * 100).toFixed(1)}%) have 60%+ of their touches inside one area prefix`
);
console.log(`  distinct areas: ${rows.length}`);
