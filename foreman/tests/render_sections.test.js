'use strict';

// Tests for scripts/render-sections.js — validates and renders
// .foreman/config.json's optional `customSections` array into inline XML
// for prompt-template.md's craft-time custom-sections step.
//
// Covers:
//   - no config.json / no customSections field -> empty sections, no warnings
//   - corrupt config.json fails soft, same spirit as post-commit.js's readConfig
//   - a valid entry renders as <tag>\ncontent\n</tag>
//   - content is XML-escaped (&, <, >)
//   - a bad tag format, a reserved tag, a duplicate tag, and empty content
//     are each skipped with a warning instead of failing the whole call

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { runRenderSections, makeTmpProject, writeConfig } = require('./helpers');

let project;
let env;

beforeEach(() => {
  project = makeTmpProject();
  env = { CLAUDE_PROJECT_DIR: project };
});

function run() {
  const result = runRenderSections(env);
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new Error(`non-JSON stdout (status ${result.status}): ${result.stdout}\n${result.stderr}`);
  }
  return { status: result.status, json };
}

describe('render-sections', () => {
  test('no config.json -> empty sections, no warnings', () => {
    const { status, json } = run();
    assert.equal(status, 0);
    assert.equal(json.ok, true);
    assert.deepEqual(json.sections, []);
    assert.deepEqual(json.warnings, []);
  });

  test('config.json without customSections -> empty sections', () => {
    writeConfig(project, { discoverySuggestions: true });
    const { json } = run();
    assert.deepEqual(json.sections, []);
  });

  test('corrupt config.json fails soft -> empty sections, no throw', () => {
    fs.mkdirSync(path.join(project, '.foreman'), { recursive: true });
    fs.writeFileSync(path.join(project, '.foreman', 'config.json'), '{not json', 'utf-8');
    const { status, json } = run();
    assert.equal(status, 0);
    assert.deepEqual(json.sections, []);
  });

  test('valid entry renders as <tag>\\ncontent\\n</tag>', () => {
    writeConfig(project, {
      customSections: [{ tag: 'compliance_notice', content: 'Needs sign-off.' }],
    });
    const { json } = run();
    assert.equal(json.sections.length, 1);
    assert.equal(json.sections[0].tag, 'compliance_notice');
    assert.equal(json.sections[0].xml, '<compliance_notice>\nNeeds sign-off.\n</compliance_notice>');
    assert.deepEqual(json.warnings, []);
  });

  test('content is XML-escaped', () => {
    writeConfig(project, {
      customSections: [{ tag: 'note', content: 'A & B <are> "fine" > C' }],
    });
    const { json } = run();
    assert.equal(json.sections[0].xml, '<note>\nA &amp; B &lt;are&gt; "fine" &gt; C\n</note>');
  });

  test('bad tag format is skipped with a warning', () => {
    writeConfig(project, {
      customSections: [{ tag: 'Not Valid', content: 'x' }],
    });
    const { json } = run();
    assert.deepEqual(json.sections, []);
    assert.equal(json.warnings.length, 1);
    assert.match(json.warnings[0], /must match/);
  });

  test('reserved tag is skipped with a warning', () => {
    writeConfig(project, {
      customSections: [{ tag: 'scope_discipline', content: 'override attempt' }],
    });
    const { json } = run();
    assert.deepEqual(json.sections, []);
    assert.match(json.warnings[0], /reserved/);
  });

  test('duplicate tag is skipped with a warning, first one wins', () => {
    writeConfig(project, {
      customSections: [
        { tag: 'note', content: 'first' },
        { tag: 'note', content: 'second' },
      ],
    });
    const { json } = run();
    assert.equal(json.sections.length, 1);
    assert.match(json.sections[0].xml, /first/);
    assert.match(json.warnings[0], /duplicates/);
  });

  test('empty content is skipped with a warning', () => {
    writeConfig(project, {
      customSections: [{ tag: 'note', content: '   ' }],
    });
    const { json } = run();
    assert.deepEqual(json.sections, []);
    assert.match(json.warnings[0], /non-empty/);
  });

  test('one bad entry does not block a good one', () => {
    writeConfig(project, {
      customSections: [
        { tag: 'task_rules', content: 'reserved, skipped' },
        { tag: 'house_style', content: 'Use tabs.' },
      ],
    });
    const { json } = run();
    assert.equal(json.sections.length, 1);
    assert.equal(json.sections[0].tag, 'house_style');
    assert.equal(json.warnings.length, 1);
  });
});
