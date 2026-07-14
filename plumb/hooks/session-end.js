#!/usr/bin/env node
'use strict';

// SessionEnd — drop this session's per-turn state file, and sweep any plumb
// state left behind by sessions that crashed before reaching SessionEnd. The
// observation log is intentionally NOT touched: it accumulates across sessions
// as the dataset the gate is calibrated against.

const { readInput, clearSessionState, gcStateFiles } = require('./plumb-lib');

function main() {
  const data = readInput();
  clearSessionState(data.session_id);
  gcStateFiles();
}

if (require.main === module) main();
