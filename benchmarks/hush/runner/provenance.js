'use strict';
// What a batch needs to say about itself so a figure can be traced back to the
// exact plugin it measured, and what a session must not learn from its cwd.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

// A session sees its working directory. A name like `<task>__<arm>__r<rep>`
// tells it that it is being benchmarked and which arm it is in, so the
// workspace is named by a hash instead: stable for one batch and run (so
// `--continue` and `--resume` land in the same place), opaque to the session.
function workspaceName(batchId, key) {
  return crypto.createHash('sha256').update(`${batchId}|${key}`).digest('hex').slice(0, 12);
}

// The plugin's commit, whether its tree differs from that commit, and its
// manifest version, read at batch start. Each field is null when it cannot be
// read — a directory that is not its own Git checkout (an uninitialized
// submodule sits inside the parent repository, whose HEAD is not the plugin's)
// gives no commit and no dirty flag rather than a wrong one.
function pluginProvenance(dir) {
  // GIT_DIR and friends outrank -C, so an inherited one would read another repo.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  const git = (...args) => {
    try {
      return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch { return null; }
  };
  let version = null;
  try {
    version = JSON.parse(fs.readFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), 'utf8')).version || null;
  } catch { /* no manifest */ }
  const ownCheckout = git('rev-parse', '--show-prefix') === '';
  const head = ownCheckout ? git('rev-parse', 'HEAD') : null;
  const status = head ? git('status', '--porcelain') : null;
  return { head, dirty: status == null ? null : status !== '', version };
}

module.exports = { workspaceName, pluginProvenance };
