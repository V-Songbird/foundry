'use strict';

// Tests for hooks/post-commit.js — the only hook Relay ships post-redesign.
//
// Covers:
//   - only fires on Bash/PowerShell tool calls that are actually `git commit`
//   - silent when ROADMAP.jsonl doesn't exist (zero-config: never ran /relay:init)
//   - status-sync block appears whenever an in_progress entry exists
//   - discovery block appears only when .relay/config.json has discoverySuggestions:true
//   - malformed/missing config is treated as discoverySuggestions:false
//   - a failed commit (confirmed nonzero exit code) stays silent
//   - a commit with no confirmed exit code fails open (still fires)

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { runScriptRaw, makeTmpProject, writeRoadmap, writeConfig } = require('./helpers');

let project;
let env;

beforeEach(() => {
  project = makeTmpProject();
  env = { CLAUDE_PROJECT_DIR: project };
});

function bashPayload(command, extra) {
  return { tool_name: 'Bash', tool_input: { command }, ...(extra || {}) };
}

function run(payload) {
  const result = runScriptRaw('post-commit.js', payload, env);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

describe('non-matching tool calls', () => {
  test('non-Bash/PowerShell tool stays silent', () => {
    const out = run({ tool_name: 'Read', tool_input: { file_path: 'x' } });
    assert.equal(out, '');
  });

  test('Bash command that is not a git commit stays silent', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    const out = run(bashPayload('git status'));
    assert.equal(out, '');
  });

  test('git commit as a substring of another word stays silent', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    const out = run(bashPayload('echo "not-a-git-commit-invocation"'));
    assert.equal(out, '');
  });
});

describe('no ROADMAP.jsonl', () => {
  test('stays completely silent — never ran /relay:init', () => {
    const out = run(bashPayload('git commit -m "wip"'));
    assert.equal(out, '');
  });
});

describe('status-sync block', () => {
  test('fires when an in_progress entry exists, discovery off', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    const out = run(bashPayload('git commit -m "finish task"'));
    assert.match(out, /status-sync|in-progress ROADMAP/i);
    assert.doesNotMatch(out, /Roadmap discovery is enabled/);
  });

  test('does not fire when nothing is in_progress', () => {
    writeRoadmap(project, [{ id: '001', status: 'planned' }]);
    const out = run(bashPayload('git commit -m "unrelated"'));
    assert.equal(out, '');
  });

  test('git commit --amend still fires', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    const out = run(bashPayload('git commit --amend --no-edit'));
    assert.notEqual(out, '');
  });

  test('git commit inside a && chain still fires', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    const out = run(bashPayload('git add -A && git commit -m "wip"'));
    assert.notEqual(out, '');
  });

  test('PowerShell tool_name also matches', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    const result = runScriptRaw(
      'post-commit.js',
      { tool_name: 'PowerShell', tool_input: { command: 'git commit -m "wip"' } },
      env
    );
    assert.notEqual(result.stdout, '');
  });
});

describe('discovery block', () => {
  test('fires when discoverySuggestions is true', () => {
    writeRoadmap(project, [{ id: '001', status: 'planned' }]);
    writeConfig(project, { discoverySuggestions: true });
    const out = run(bashPayload('git commit -m "add feature"'));
    assert.match(out, /Roadmap discovery is enabled/);
  });

  test('does not fire when config is missing', () => {
    writeRoadmap(project, [{ id: '001', status: 'planned' }]);
    const out = run(bashPayload('git commit -m "add feature"'));
    assert.equal(out, '');
  });

  test('does not fire when config is malformed JSON', () => {
    writeRoadmap(project, [{ id: '001', status: 'planned' }]);
    const fs = require('fs');
    const path = require('path');
    fs.mkdirSync(path.join(project, '.relay'), { recursive: true });
    fs.writeFileSync(path.join(project, '.relay', 'config.json'), '{not json', 'utf-8');
    const out = run(bashPayload('git commit -m "add feature"'));
    assert.equal(out, '');
  });

  test('does not fire when discoverySuggestions is explicitly false', () => {
    writeRoadmap(project, [{ id: '001', status: 'planned' }]);
    writeConfig(project, { discoverySuggestions: false });
    const out = run(bashPayload('git commit -m "add feature"'));
    assert.equal(out, '');
  });

  test('both blocks fire together when applicable', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    writeConfig(project, { discoverySuggestions: true });
    const out = run(bashPayload('git commit -m "wip"'));
    assert.match(out, /Roadmap discovery is enabled/);
    assert.match(out, /in-progress ROADMAP/i);
  });
});

describe('exit-code gating (best-effort)', () => {
  test('confirmed nonzero exit code stays silent', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    const out = run(bashPayload('git commit -m "wip"', { tool_response: { exit_code: 1 } }));
    assert.equal(out, '');
  });

  test('confirmed zero exit code still fires', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    const out = run(bashPayload('git commit -m "wip"', { tool_response: { exit_code: 0 } }));
    assert.notEqual(out, '');
  });

  test('missing exit code field fails open (still fires)', () => {
    writeRoadmap(project, [{ id: '001', status: 'in_progress' }]);
    const out = run(bashPayload('git commit -m "wip"'));
    assert.notEqual(out, '');
  });
});
