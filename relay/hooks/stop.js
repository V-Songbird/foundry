#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT
  ? path.resolve(process.env.CLAUDE_PLUGIN_ROOT)
  : path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(PLUGIN_ROOT, 'prompt-template.md');

const SWEEP_INSTRUCTION =
  '[Relay] Before ending: scan this session for any items noted as deferred, ' +
  'out-of-scope, or TODO. For each confirmed, non-trivial item: Read ' +
  `${TEMPLATE_PATH}, fill the template, and call spawn_task. Then end your turn — ` +
  'the session will close after the sweep completes.';

function flagPath(sessionId) {
  const key = sessionId || process.env.CLAUDE_PROJECT_DIR || 'relay-default';
  const h = crypto.createHash('md5').update(key, 'utf-8').digest('hex').slice(0, 12);
  return path.join(os.tmpdir(), `relay_sweep_${h}.flag`);
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function main() {
  let data;
  try {
    data = JSON.parse(readStdin() || '{}');
  } catch {
    data = {};
  }

  const sessionId = data && typeof data === 'object' ? data.session_id : undefined;
  const flag = flagPath(sessionId);

  if (fs.existsSync(flag)) {
    process.exit(0);
  }

  try {
    fs.closeSync(fs.openSync(flag, 'a'));
    process.stdout.write(SWEEP_INSTRUCTION, 'utf-8');
  } catch {
    process.exit(0);
  }

  process.exit(1);
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.exit(0);
  }
}

module.exports = { main, flagPath };
