'use strict';

// Shared fixtures and helpers for relay tests.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS_DIR = path.join(__dirname, '..', 'hooks');

function buildStdin(stdinData) {
  if (stdinData === null || stdinData === undefined) return undefined;
  if (typeof stdinData === 'string') return stdinData;
  return JSON.stringify(stdinData);
}

/** Run a hook script from hooks/ and return the raw spawnSync result. */
function runScriptRaw(name, stdinData, env) {
  return spawnSync('node', [path.join(HOOKS_DIR, name)], {
    input: buildStdin(stdinData),
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env, ...(env || {}) },
  });
}

/** Create a fresh empty temp directory usable as a project root. */
function makeTmpProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-project-'));
  const project = path.join(tmpDir, 'project');
  fs.mkdirSync(project);
  return project;
}

/** Write ROADMAP.jsonl in a project dir from an array of line objects. */
function writeRoadmap(project, entries) {
  const text = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(path.join(project, 'ROADMAP.jsonl'), text, 'utf-8');
}

/** Write .relay/config.json in a project dir. */
function writeConfig(project, config) {
  const dir = path.join(project, '.relay');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config), 'utf-8');
}

module.exports = {
  runScriptRaw,
  makeTmpProject,
  writeRoadmap,
  writeConfig,
  HOOKS_DIR,
};
