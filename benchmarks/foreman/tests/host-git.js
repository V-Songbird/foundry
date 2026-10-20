'use strict';

// A planted host git config for the sims' tests. Not a test file: the suite
// runs tests/*.test.js.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Runs fn with a temporary HOME and XDG_CONFIG_HOME whose global git config
// logs every git command that reads it to a file (trace2), then restores the
// environment. Returns what git logged during fn (`seen`, empty when no git
// the sim started read the host config) and, as a control, what a plain git
// run logged afterwards (`control`, which proves the planted config works).
function hostGitTrace(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'host-git-'));
  const log = path.join(home, 'trace.log');
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
  fs.writeFileSync(path.join(home, '.gitconfig'), `[trace2]\n\tnormalTarget = ${log.replaceAll('\\', '/')}\n`);
  Object.assign(process.env, { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: home });
  try {
    fn();
    const read = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '');
    const seen = read();
    spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: home, encoding: 'utf8' });
    return { seen, control: read() };
  } finally {
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    fs.rmSync(home, { recursive: true, force: true });
  }
}

module.exports = { hostGitTrace };
