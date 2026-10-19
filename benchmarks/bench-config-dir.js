/* bench-config-dir.js — point benchmark runs at a scratch Claude state dir.
 *
 * CLAUDE_CONFIG_DIR relocates Claude Code's WHOLE state directory: the project
 * registry, session transcripts, plugins and settings. Without it every bench
 * cell's temp cwd becomes a permanent entry in ~/.claude.json, and its
 * transcript a permanent folder under ~/.claude/projects. Neither is ever
 * reconciled against disk, so both grow monotonically.
 *
 * The scratch dir is seeded once, when it has no <dir>/.claude.json yet, and
 * reused — a fresh one has no plugins and no settings. Copy, never symlink: a
 * junction would let a plugin update during a run mutate the real install
 * mid-benchmark. BENCH_CONFIG_DIR names the dir.
 *
 * A runner calls the exported function once it is about to start a Claude
 * session, before it copies process.env for that session. Without
 * BENCH_CONFIG_DIR the call refuses the run, so the login copy never lands in a
 * folder nobody chose. A dry run, a plan-only run or a step that starts no
 * session never calls it and needs no dir. The call sets CLAUDE_CONFIG_DIR, so
 * every cleanEnv() / {...process.env} copy made after it inherits the value.
 * Note the scratch registry lives INSIDE the dir as <dir>/.claude.json, not
 * beside it the way ~/.claude.json is.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REAL = path.join(os.homedir(), '.claude');

function benchConfigDir() {
  if (!process.env.BENCH_CONFIG_DIR) {
    console.error('Set BENCH_CONFIG_DIR to the scratch Claude state dir benchmark sessions use.'
      + ' It is seeded once from ~/.claude, stored login included; keep it outside any repository.');
    process.exit(2);
  }
  const dir = path.resolve(process.env.BENCH_CONFIG_DIR);
  // The registry is written last, so its absence means the dir was never seeded,
  // or a seed stopped partway, and the seed runs (again).
  if (!fs.existsSync(path.join(dir, '.claude.json'))) {
    // Read the registry first: a missing ~/.claude.json stops the run before any
    // copy. An --sdk run needs it too, because its sessions read this dir.
    const home = path.join(os.homedir(), '.claude.json');
    if (!fs.existsSync(home)) {
      console.error(`BENCH_CONFIG_DIR ${dir} is seeded from ${home}, which does not exist.`
        + ' Run claude once so it writes that file, then rerun.');
      process.exit(2);
    }
    const reg = JSON.parse(fs.readFileSync(home, 'utf8'));
    fs.mkdirSync(dir, { recursive: true });
    // The stored login is copied too: without it every cell returns a zero-cost
    // non-answer in ~3s, which the runner rejects as an unusable data point.
    // CLAUDE.md is left out on purpose: the owner's user instructions must not
    // be able to reach a bench session, whatever the runner's flags are.
    for (const name of ['settings.json', 'plugins', '.credentials.json']) {
      const from = path.join(REAL, name);
      if (fs.existsSync(from)) fs.cpSync(from, path.join(dir, name), { recursive: true });
    }
    // Seed the registry MINUS its project entries. A registry built from scratch
    // has no onboarding or account state, so claude never gets past first run.
    reg.projects = {};
    fs.writeFileSync(path.join(dir, '.claude.json'), JSON.stringify(reg, null, 2));
  }
  process.env.CLAUDE_CONFIG_DIR = dir;
  return dir;
}

module.exports = benchConfigDir;
