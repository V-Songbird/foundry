'use strict';
// The environment a test hands to a runner it spawns: this process's env without any *_API_KEY, the
// Claude config folders or the node:test child markers, so a spawned runner can neither reach a
// paid provider nor leak a key, and never joins the parent test run. `extra` is applied last, so a
// test that needs a key or a config folder on purpose passes it explicitly.
const STRIPPED = ['BENCH_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'NODE_TEST_CONTEXT', 'NODE_CHANNEL_FD'];

function keylessEnv(extra = {}) {
  const env = { ...process.env };
  // Windows ignores case in a variable name, so a spread copy can hold Typesafe_Api_Key; match without case.
  for (const k of Object.keys(env)) {
    const u = k.toUpperCase();
    if (u.endsWith('_API_KEY') || STRIPPED.includes(u)) delete env[k];
  }
  return Object.assign(env, extra);
}

module.exports = { keylessEnv, STRIPPED };
