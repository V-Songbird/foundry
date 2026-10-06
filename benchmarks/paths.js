'use strict';

// Where the benchmarks find the plugins they measure and keep what they produce.
//
// Plugin checkouts default to Foundry's submodules (<root>/foreman, hush,
// razor). BENCH_PLUGINS_DIR names another folder that holds all three, such as
// the primary checkout when this one is a worktree with empty submodules. The
// name avoids FOREMAN_, HUSH_ and CLAUDE prefixes, which the plugins' own test
// helpers clear from the environment.
//
// History and run output (datasets/, records/, records-archive/, experiments/,
// results/, runs/) default to the ignored <root>/.private/benchmarks/<plugin>/.
// BENCH_DATA_DIR names another folder with the same per-plugin layout.

const path = require('node:path');

const FOUNDRY = path.resolve(__dirname, '..');
const PLUGINS = path.resolve(process.env.BENCH_PLUGINS_DIR || FOUNDRY);
const DATA = path.resolve(process.env.BENCH_DATA_DIR || path.join(FOUNDRY, '.private', 'benchmarks'));

module.exports = {
  pluginDir: (name) => path.join(PLUGINS, name),
  dataDir: (name) => path.join(DATA, name),
};
