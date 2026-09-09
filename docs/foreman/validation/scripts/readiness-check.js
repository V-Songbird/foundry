// Final readiness check for the Foreman consolidation.
// Every assertion here is one a fresh session would be misled by if it failed.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = "D:/Projects/Personal/SoftwareDevelopment/claude-plugins";
const MEM = "C:/Users/Songbird/.claude/projects/D--Projects-Personal-SoftwareDevelopment-claude-plugins/memory";

let fails = 0;
let warns = 0;
function ok(label, detail) { console.log("  PASS  " + label + (detail ? "  — " + detail : "")); }
function bad(label, detail) { fails++; console.log("  FAIL  " + label + (detail ? "  — " + detail : "")); }
function warn(label, detail) { warns++; console.log("  WARN  " + label + (detail ? "  — " + detail : "")); }
function head(t) { console.log("\n== " + t + " =="); }

function sh(cmd, cwd) {
  try { return { out: execSync(cmd, { cwd: cwd || ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }), code: 0 }; }
  catch (e) { return { out: (e.stdout || "") + (e.stderr || ""), code: e.status == null ? 1 : e.status }; }
}

// ---------- 1. roadmap ----------
head("Roadmap");
const roadmapPath = path.join(ROOT, "ROADMAP.jsonl");
const lines = fs.readFileSync(roadmapPath, "utf8").split(/\r?\n/).filter(Boolean);
let entries = [];
let parseErr = 0;
for (const l of lines.slice(1)) { try { entries.push(JSON.parse(l)); } catch { parseErr++; } }
parseErr ? bad("every roadmap line parses", parseErr + " unparseable") : ok("every roadmap line parses", entries.length + " entries");

const OPEN = ["planned", "in_progress", "awaiting_acceptance", "blocked", "deferred"];
const open = entries.filter((e) => OPEN.includes(e.status));
const byStatus = {};
for (const e of entries) byStatus[e.status] = (byStatus[e.status] || 0) + 1;
ok("status spread", JSON.stringify(byStatus));

// Every planned_touches path of an OPEN entry must exist — unless the entry is
// the thing that creates it. Scoped to foreman: hush and razor are reviewed
// independently, per the standing rule.
const isForeman = (e) =>
  (e.planned_touches || []).some((p) => /^(foreman|benchmarks\/foreman)\b/.test(p)) ||
  /foreman/i.test(e.title);
const missing = [];
const otherPlugins = [];
for (const e of open) {
  for (const p of e.planned_touches || []) {
    const rel = String(p).split("\\").join("/");
    if (fs.existsSync(path.join(ROOT, rel))) continue;
    // the entry itself creates it: its `what` names the basename right after new/add
    // the entry itself creates it — match the basename loosely, since prose
    // writes `area-notes tests` for a file called `area_notes.test.js`
    const base = rel.replace(/\/$/, "").split("/").pop();
    const stem = base.replace(/\.(test\.)?\w+$/, "").replace(/[-_]/g, "[-_ ]");
    const what = String(e.what || "") + " " + String(e.why || "");
    if (new RegExp("\\b(new|add|adds|create|creates)\\b[^.]{0,120}" + stem, "i").test(what)) continue;
    (isForeman(e) ? missing : otherPlugins).push(e.id + " -> " + p);
  }
}
missing.length ? bad("open foreman entries name only real paths", missing.join(", ")) : ok("open foreman entries name only real paths", open.filter(isForeman).length + " foreman entries checked");
if (otherPlugins.length) warn("hush/razor entries with paths that do not exist", otherPlugins.join(", ") + "  (out of scope — those plugins are reviewed independently)");

// no open entry depends on a terminal one
const TERMINAL = ["done", "dropped", "rejected"];
const statusOf = Object.fromEntries(entries.map((e) => [e.id, e.status]));
const deadDeps = [];
for (const e of open) for (const d of e.depends_on || []) {
  if (!statusOf[d]) deadDeps.push(e.id + " -> missing " + d);
  else if (["dropped", "rejected"].includes(statusOf[d])) deadDeps.push(e.id + " -> " + statusOf[d] + " " + d);
}
deadDeps.length ? bad("no open entry waits on a dropped or rejected entry", deadDeps.join(", ")) : ok("no open entry waits on a dropped or rejected entry");

// planned_touches root convention
const wrongRoot = [];
for (const e of open) for (const p of e.planned_touches || []) {
  if (/^(scripts|skills|hooks|tests)\//.test(p)) wrongRoot.push(e.id + " -> " + p);
}
wrongRoot.length ? bad("planned_touches are parent-root-relative", wrongRoot.join(", ")) : ok("planned_touches are parent-root-relative");

// ---------- 2. suites and gates ----------
head("Suites, gates, selfcheck");
const suite = sh("node --test foreman/tests/*.test.js");
const m = suite.out.match(/# pass (\d+)[\s\S]*?# fail (\d+)/);
if (m && m[2] === "0") ok("foreman suite", m[1] + " passing, 0 failing");
else bad("foreman suite", m ? m[1] + " pass / " + m[2] + " FAIL" : "could not parse output");
const passCount = m ? m[1] : null;

const gate = sh("node --test scripts/git-hooks/*.test.js");
const gm = gate.out.match(/# pass (\d+)[\s\S]*?# fail (\d+)/);
gm && gm[2] === "0" ? ok("marketplace gate suite", gm[1] + " passing, 0 failing") : bad("marketplace gate suite", gm ? gm[1] + "/" + gm[2] : "unparseable");

const self = sh("node benchmarks/foreman/selfcheck.js");
self.code === 0 && /selfcheck OK/.test(self.out) ? ok("benchmark selfcheck", "truth_grounding current") : bad("benchmark selfcheck", self.out.slice(-200));

const doc = sh("node foreman/scripts/roadmap.js doctor");
try {
  const j = JSON.parse(doc.out.trim().split("\n").pop());
  j.summary.errors === 0 ? ok("roadmap doctor", "0 errors, " + j.summary.warnings + " warnings") : bad("roadmap doctor", j.summary.errors + " errors");
} catch { bad("roadmap doctor", "unparseable"); }

// ---------- 3. mirrors ----------
head("Mirrored files");
const a = path.join(ROOT, "scripts/git-hooks/check-reference-names.js");
for (const plug of ["foreman", "hush", "razor"]) {
  const b = path.join(ROOT, plug, "scripts/git-hooks/check-reference-names.js");
  if (!fs.existsSync(b)) { warn(plug + " has no gate copy"); continue; }
  fs.readFileSync(a, "utf8") === fs.readFileSync(b, "utf8")
    ? ok(plug + " gate copy is byte-identical")
    : bad(plug + " gate copy diverged", "the mirror test in the parent suite asserts identity");
}

// ---------- 4. stale counts ----------
head("Stale test-count claims");
const stale = [];
function scan(dir, skip) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.some((s) => f.name === s)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) scan(p, skip);
    // A file whose NAME carries a past date is a dated record. Every number in
    // it is a claim about that date, not about now.
    else if (/-\d{4}-\d{2}-\d{2}\.\w+$/.test(f.name)) continue;
    else if (/\.(md|js|json|jsonl|txt)$/.test(f.name)) {
      const t = fs.readFileSync(p, "utf8");
      if (!passCount) continue;
      // A dated history line is allowed to name the total that was true on its
      // date. Only a claim presented as CURRENT is a defect.
      t.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*[-*>|]?\s*\*{0,2}\d{4}-\d{2}-\d{2}/.test(line)) return;
        if (/\bRELEASE\b|\bwas\b|\bpreviously\b|\bat the time\b/.test(line)) return;
        for (const b of line.match(/\b(\d{3,5})\s*\/\s*\1\b/g) || []) {
          const n = b.split("/")[0].trim();
          if (n !== passCount && Number(n) > 900) stale.push(path.relative(ROOT, p) + ":" + (i + 1) + " claims " + b);
        }
      });
    }
  }
}
scan(path.join(ROOT, "docs"), [".git"]);
scan(path.join(ROOT, "foreman"), [".git", "node_modules", "assets"]);
scan(MEM, []);
stale.length ? bad("nothing still claims the old suite total", stale.join(", ")) : ok("nothing still claims the old suite total", "current is " + passCount);

// ---------- 5. memory ----------
head("Memory store");
const memFiles = fs.readdirSync(MEM).filter((f) => f.endsWith(".md") && f !== "MEMORY.md");
const slugs = new Set();
for (const f of memFiles) {
  const t = fs.readFileSync(path.join(MEM, f), "utf8");
  const mm = t.match(/^name:\s*(.+)$/m);
  if (mm) slugs.add(mm[1].trim()); else warn("memory file has no name: frontmatter", f);
}
let dangling = [];
for (const f of memFiles.concat(["MEMORY.md"])) {
  const t = fs.readFileSync(path.join(MEM, f), "utf8");
  for (const mm of t.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const s = mm[1].trim();
    if (s.startsWith("hush:")) continue;
    if (!slugs.has(s)) dangling.push(f + " -> " + s);
  }
}
dangling.length ? bad("no dangling wiki-links", dangling.join(", ")) : ok("no dangling wiki-links", memFiles.length + " memory files");

const idx = fs.readFileSync(path.join(MEM, "MEMORY.md"), "utf8");
const targets = [...idx.matchAll(/\]\(([^)]+\.md)\)/g)].map((x) => x[1]);
const missingTargets = targets.filter((t) => !fs.existsSync(path.join(MEM, t)));
missingTargets.length ? bad("every index pointer resolves", missingTargets.join(", ")) : ok("every index pointer resolves", targets.length + " pointers");
const unindexed = memFiles.filter((f) => !targets.includes(f));
unindexed.length ? bad("every memory file is indexed", unindexed.join(", ")) : ok("every memory file is indexed");

// ---------- 6. research index ----------
head("Research index");
const RES = path.join(ROOT, "docs/foreman/research");
const indexText = fs.readFileSync(path.join(RES, "README.md"), "utf8");
const onDisk = fs.readdirSync(RES).filter((f) => f !== "README.md");
const notIndexed = onDisk.filter((f) => {
  if (indexText.includes(f)) return false;
  // one index line can cover a numbered family, e.g. `foo.md`, `-2-`, `-3-`
  const fam = f.match(/^(.*?)-(\d)-(.*)$/);
  if (fam && indexText.includes(fam[1] + "-" + fam[3]) && indexText.includes("`-" + fam[2] + "-`")) return false;
  return true;
});
// A gap in a foreman report is ours; a gap in a hush or razor report belongs to
// whoever is reviewing that plugin.
const mineMissing = notIndexed.filter((f) => /foreman|consolidation|opus5|prompt-wording|reference-names/i.test(f));
const theirsMissing = notIndexed.filter((f) => !mineMissing.includes(f));
mineMissing.length ? bad("every foreman research file is indexed", mineMissing.join(", ")) : ok("every foreman research file is indexed", onDisk.length + " files on disk");
if (theirsMissing.length) warn("hush/razor research files not yet indexed", theirsMissing.join(", ") + "  (out of scope)");

// ---------- 7. AskUserQuestion option bounds ----------
head("AskUserQuestion option bounds");
const skillFiles = [
  "foreman/skills/craft-prompt/SKILL.md",
  "foreman/skills/roadmap/pick.md",
  "foreman/skills/roadmap/SKILL.md",
  "foreman/skills/init/SKILL.md",
  "foreman/skills/foreman/SKILL.md",
  "foreman/skills/survey/SKILL.md",
  "foreman/skills/roadmap/destination-question.md",
];
const offenders = [];
for (const rel of skillFiles) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const txt = fs.readFileSync(p, "utf8").split(/\r?\n/);
  txt.forEach((line, i) => {
    const mo = line.match(/^\s*Options:\s*(.+)$/);
    if (!mo) return;
    // a parenthetical nudge often quotes example paths in backticks — those are
    // not options. Strip every (...) group before counting.
    let body = mo[1];
    let prev;
    do { prev = body; body = body.replace(/\([^()]*\)/g, ""); } while (body !== prev);
    const n = (body.match(/`[^`]+`/g) || []).length;
    if (n && (n < 2 || n > 4)) offenders.push(`${rel}:${i + 1} has ${n}`);
  });
}
offenders.length ? warn("inline Options: lines within 2-4", offenders.join(", ")) : ok("inline Options: lines within 2-4");

// ---------- 8. git ----------
head("Git state");
const ps = sh("git status --porcelain");
const fs2 = sh("git status --porcelain", path.join(ROOT, "foreman"));
console.log("  parent:  " + (ps.out.trim() || "(clean)"));
console.log("  foreman: " + (fs2.out.trim() || "(clean)"));

console.log("\n" + "=".repeat(60));
console.log(fails === 0 ? `READY — 0 failures, ${warns} warnings` : `NOT READY — ${fails} failures, ${warns} warnings`);
process.exit(fails === 0 ? 0 : 1);
