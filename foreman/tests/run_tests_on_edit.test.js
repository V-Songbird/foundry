'use strict';

// Tests for hooks/run-tests-on-edit.js — PostToolUse hook that reruns the
// foreman test suite after an Edit/Write to scripts/*.js or hooks/*.js, and
// surfaces a failure via additionalContext. Silent on green, silent on
// anything outside those two directories.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { targetsWatchedScript, testGlob, PLUGIN_ROOT } = require('../hooks/run-tests-on-edit');
const { runNodeScript, HOOKS_DIR, SCRIPTS_DIR } = require('./helpers');

describe('targetsWatchedScript', () => {
  test('matches a file under scripts/', () => {
    assert.ok(targetsWatchedScript(path.join(PLUGIN_ROOT, 'scripts', 'roadmap.js')));
  });

  test('matches a file under hooks/', () => {
    assert.ok(targetsWatchedScript(path.join(PLUGIN_ROOT, 'hooks', 'guard-roadmap-edit.js')));
  });

  test('is case-insensitive on the resolved path', () => {
    assert.ok(targetsWatchedScript(path.join(PLUGIN_ROOT, 'SCRIPTS', 'roadmap.js')));
  });

  test('ignores non-.js files in a watched dir', () => {
    assert.ok(!targetsWatchedScript(path.join(PLUGIN_ROOT, 'scripts', 'notes.md')));
  });

  test('ignores files outside scripts/ and hooks/', () => {
    assert.ok(!targetsWatchedScript(path.join(PLUGIN_ROOT, 'tests', 'roadmap.test.js')));
    assert.ok(!targetsWatchedScript(path.join(PLUGIN_ROOT, 'skills', 'roadmap', 'SKILL.md')));
  });

  test('ignores a file elsewhere in the project entirely', () => {
    assert.ok(!targetsWatchedScript('D:/project/src/foo.js'));
  });

  test('missing file_path is not a match', () => {
    assert.ok(!targetsWatchedScript(undefined));
  });
});

describe('testGlob', () => {
  // A bare directory path makes node's --test try to require() it instead
  // of recursing (confirmed on node v22.22.2) — must stay a *.test.js glob.
  test('is a *.test.js glob under the tests dir, not a bare directory', () => {
    assert.equal(testGlob(), path.join(PLUGIN_ROOT, 'tests', '*.test.js'));
  });
});

describe('main (end-to-end against a red suite)', () => {
  test('reports a failure via additionalContext when the target plugin copy is broken', () => {
    // Build a throwaway plugin root — never touch this repo's real
    // scripts/roadmap.js — with a deliberately broken copy plus its own test.
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foreman-hook-'));
    const tmpScripts = path.join(tmpRoot, 'scripts');
    const tmpTests = path.join(tmpRoot, 'tests');
    fs.mkdirSync(tmpScripts);
    fs.mkdirSync(tmpTests);

    const roadmapSrc = fs.readFileSync(path.join(SCRIPTS_DIR, 'roadmap.js'), 'utf-8');
    // /g matters: "status must be one of" occurs twice (cmdAdd's and
    // cmdUpdateStatus's messages) — a non-global replace only breaks the
    // first, leaving the other (and its matching test) untouched and green.
    const broken = roadmapSrc.replace(/status must be one of/g, 'status BROKEN must be one of');
    assert.notEqual(broken, roadmapSrc, 'sanity: the replacement must actually apply');
    fs.writeFileSync(path.join(tmpScripts, 'roadmap.js'), broken);
    fs.copyFileSync(path.join(__dirname, 'roadmap.test.js'), path.join(tmpTests, 'roadmap.test.js'));
    fs.copyFileSync(path.join(__dirname, 'helpers.js'), path.join(tmpTests, 'helpers.js'));

    try {
      const payload = { tool_name: 'Edit', tool_input: { file_path: path.join(tmpScripts, 'roadmap.js') } };
      const result = runNodeScript(
        path.join(HOOKS_DIR, 'run-tests-on-edit.js'),
        [],
        payload,
        { CLAUDE_PLUGIN_ROOT: tmpRoot }
      );
      assert.equal(result.status, 0, result.stderr);
      const out = JSON.parse(result.stdout);
      assert.match(out.hookSpecificOutput.additionalContext, /node --test tests\/ failed after this edit to roadmap\.js/);
      assert.match(out.hookSpecificOutput.additionalContext, /# fail \d/);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test('stays silent when the target plugin copy is green', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foreman-hook-'));
    const tmpScripts = path.join(tmpRoot, 'scripts');
    const tmpTests = path.join(tmpRoot, 'tests');
    fs.mkdirSync(tmpScripts);
    fs.mkdirSync(tmpTests);
    fs.copyFileSync(path.join(SCRIPTS_DIR, 'roadmap.js'), path.join(tmpScripts, 'roadmap.js'));
    fs.copyFileSync(path.join(__dirname, 'roadmap.test.js'), path.join(tmpTests, 'roadmap.test.js'));
    fs.copyFileSync(path.join(__dirname, 'helpers.js'), path.join(tmpTests, 'helpers.js'));

    try {
      const payload = { tool_name: 'Edit', tool_input: { file_path: path.join(tmpScripts, 'roadmap.js') } };
      const result = runNodeScript(
        path.join(HOOKS_DIR, 'run-tests-on-edit.js'),
        [],
        payload,
        { CLAUDE_PLUGIN_ROOT: tmpRoot }
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, '');
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
