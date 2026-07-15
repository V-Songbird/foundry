'use strict';

// Tests for .claude/hooks/nudge-manifest-curator.js -- repo-wide dev hook
// that nudges the manifest-curator agent after an Edit/Write to any
// marketplace.json or plugin.json.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK_PATH = path.join(__dirname, 'nudge-manifest-curator.js');
const { isManifestFile } = require('./nudge-manifest-curator');

function runHook(payload) {
  return spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: 'utf-8',
    timeout: 10000,
  });
}

describe('isManifestFile', () => {
  test('matches marketplace.json', () => {
    assert.equal(isManifestFile('.claude-plugin/marketplace.json'), true);
  });

  test('matches plugin.json at any depth', () => {
    assert.equal(isManifestFile('foreman/.claude-plugin/plugin.json'), true);
  });

  test('is case-insensitive', () => {
    assert.equal(isManifestFile('Foreman/.claude-plugin/Plugin.JSON'), true);
  });

  test('normalizes Windows-style backslash paths', () => {
    assert.equal(isManifestFile('foreman\\.claude-plugin\\plugin.json'), true);
  });

  test('ignores unrelated json files', () => {
    assert.equal(isManifestFile('foreman/package.json'), false);
  });

  test('ignores non-json files', () => {
    assert.equal(isManifestFile('foreman/.claude-plugin/plugin.md'), false);
  });

  test('handles missing path', () => {
    assert.equal(isManifestFile(undefined), false);
    assert.equal(isManifestFile(''), false);
  });
});

describe('main (end-to-end)', () => {
  test('emits additionalContext for an Edit to marketplace.json', () => {
    const result = runHook({ tool_name: 'Edit', tool_input: { file_path: '.claude-plugin/marketplace.json' } });
    assert.equal(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.match(output.hookSpecificOutput.additionalContext, /manifest-curator/);
    assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse');
  });

  test('emits additionalContext for a Write to a plugin.json', () => {
    const result = runHook({ tool_name: 'Write', tool_input: { file_path: 'hush/.claude-plugin/plugin.json' } });
    assert.equal(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.match(output.hookSpecificOutput.additionalContext, /manifest-curator/);
  });

  test('stays silent for an unrelated file edit', () => {
    const result = runHook({ tool_name: 'Edit', tool_input: { file_path: 'hush/README.md' } });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  test('stays silent for a non-watched tool', () => {
    const result = runHook({ tool_name: 'Read', tool_input: { file_path: '.claude-plugin/marketplace.json' } });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  test('never crashes on malformed input', () => {
    const result = spawnSync('node', [HOOK_PATH], { input: 'not json', encoding: 'utf-8', timeout: 10000 });
    assert.equal(result.status, 0);
  });
});
