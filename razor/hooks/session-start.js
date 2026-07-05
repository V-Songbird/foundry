#!/usr/bin/env node
'use strict';

// SessionStart — inject the ladder into the main thread.
// SessionStart accepts raw stdout as context, so no JSON envelope needed.

const { RULESET, readInput, readState, isActive } = require('./razor-lib');

function main() {
  const data = readInput();
  if (!isActive(readState(data.session_id))) return;
  process.stdout.write(RULESET);
}

if (require.main === module) main();
