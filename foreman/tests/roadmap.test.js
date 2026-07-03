'use strict';

// Tests for scripts/roadmap.js — the mechanical CRUD CLI for ROADMAP.jsonl.
//
// Covers:
//   - add computes sequential zero-padded ids, validates required fields/source
//   - update-status transitions status, appends (not replaces) commits/notes
//   - list filters by status, returns everything with no filter
//   - next-candidates filters unblocked planned tasks, ranks by unblocks
//     count then recency, flags touches collisions against in_progress
//   - add/update-status return a `warnings` field for long why/what/notes
//     without failing the write
//   - check-duplicate finds word-overlap matches against rejected entries only
//   - a corrupt line in the file fails loudly (ok:false, exit 1) instead of
//     silently skipping it

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { runRoadmap, makeTmpProject, writeRoadmap } = require('./helpers');

let project;
let env;

beforeEach(() => {
  project = makeTmpProject();
  env = { CLAUDE_PROJECT_DIR: project };
});

function run(argv, stdinData) {
  const result = runRoadmap(argv, stdinData, env);
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new Error(`non-JSON stdout (status ${result.status}): ${result.stdout}\n${result.stderr}`);
  }
  return { status: result.status, json };
}

describe('add', () => {
  test('creates ROADMAP.jsonl if missing, first id is 001', () => {
    const { status, json } = run(['add'], {
      title: 'Add JWT refresh middleware',
      why: 'Sessions expire mid-request under load.',
      what: 'Refresh the token before its 15-min expiry.',
      source: 'user',
    });
    assert.equal(status, 0);
    assert.equal(json.ok, true);
    assert.equal(json.entry.id, '001');
    assert.equal(json.entry.status, 'planned');
    assert.deepEqual(json.entry.commits, []);
    assert.ok(fs.existsSync(path.join(project, 'ROADMAP.jsonl')));
  });

  test('ids increment sequentially, zero-padded', () => {
    run(['add'], { title: 'a', why: 'a', what: 'a', source: 'user' });
    run(['add'], { title: 'b', why: 'b', what: 'b', source: 'user' });
    const { json } = run(['add'], { title: 'c', why: 'c', what: 'c', source: 'user' });
    assert.equal(json.entry.id, '003');
  });

  test('defaults depends_on/touches/notes when omitted', () => {
    const { json } = run(['add'], { title: 'a', why: 'a', what: 'a', source: 'user' });
    assert.deepEqual(json.entry.depends_on, []);
    assert.deepEqual(json.entry.touches, []);
    assert.equal(json.entry.notes, '');
  });

  test('rejects missing required fields', () => {
    const { status, json } = run(['add'], { title: 'a', source: 'user' });
    assert.equal(status, 1);
    assert.equal(json.ok, false);
    assert.match(json.error, /requires title, why, what/);
  });

  test('rejects invalid source', () => {
    const { status, json } = run(['add'], { title: 'a', why: 'a', what: 'a', source: 'bot' });
    assert.equal(status, 1);
    assert.match(json.error, /source must be one of/);
  });
});

describe('update-status', () => {
  beforeEach(() => {
    writeRoadmap(project, [
      { id: '001', title: 'a', why: 'a', what: 'a', status: 'in_progress', source: 'user', depends_on: [], touches: [], commits: [], created_at: '2026-07-01', updated_at: '2026-07-01', notes: '' },
    ]);
  });

  test('transitions status and appends a commit', () => {
    const { json } = run(['update-status'], { id: '001', status: 'done', commit: 'a1b2c3d' });
    assert.equal(json.entry.status, 'done');
    assert.deepEqual(json.entry.commits, ['a1b2c3d']);
  });

  test('does not duplicate an already-recorded commit', () => {
    run(['update-status'], { id: '001', status: 'in_progress', commit: 'a1b2c3d' });
    const { json } = run(['update-status'], { id: '001', status: 'done', commit: 'a1b2c3d' });
    assert.deepEqual(json.entry.commits, ['a1b2c3d']);
  });

  test('appends notes rather than replacing them', () => {
    run(['update-status'], { id: '001', status: 'in_progress', notes: 'first' });
    const { json } = run(['update-status'], { id: '001', status: 'in_progress', notes: 'second' });
    assert.equal(json.entry.notes, 'first; second');
  });

  test('rejects unknown id', () => {
    const { status, json } = run(['update-status'], { id: '999', status: 'done' });
    assert.equal(status, 1);
    assert.match(json.error, /no entry with id 999/);
  });

  test('rejects invalid status', () => {
    const { status, json } = run(['update-status'], { id: '001', status: 'cancelled' });
    assert.equal(status, 1);
    assert.match(json.error, /status must be one of/);
  });
});

describe('list', () => {
  beforeEach(() => {
    writeRoadmap(project, [
      { id: '001', title: 'a', status: 'planned' },
      { id: '002', title: 'b', status: 'in_progress' },
      { id: '003', title: 'c', status: 'done' },
    ]);
  });

  test('no filter returns everything', () => {
    const { json } = run(['list']);
    assert.equal(json.entries.length, 3);
  });

  test('filters by a single status', () => {
    const { json } = run(['list', '--status', 'planned']);
    assert.deepEqual(json.entries.map((e) => e.id), ['001']);
  });

  test('filters by a comma-separated status list', () => {
    const { json } = run(['list', '--status', 'planned,done']);
    assert.deepEqual(json.entries.map((e) => e.id).sort(), ['001', '003']);
  });

  test('a project with no ROADMAP.jsonl yet returns an empty list, not an error', () => {
    const freshProject = makeTmpProject();
    const result = runRoadmap(['list'], undefined, { CLAUDE_PROJECT_DIR: freshProject });
    const json = JSON.parse(result.stdout);
    assert.equal(result.status, 0);
    assert.deepEqual(json.entries, []);
  });
});

describe('check-duplicate', () => {
  beforeEach(() => {
    writeRoadmap(project, [
      { id: '001', title: 'Extract duplicated retry logic', why: 'Same backoff loop copy-pasted across API clients', status: 'rejected', source: 'claude-suggested' },
      { id: '002', title: 'Unrelated planned task', why: 'Totally different thing', status: 'planned', source: 'user' },
    ]);
  });

  test('finds a word-overlap match against a rejected entry', () => {
    const { json } = run(['check-duplicate'], {
      title: 'Extract duplicated retry logic',
      why: 'Same backoff loop copy-pasted across API clients',
    });
    assert.equal(json.duplicate, true);
    assert.equal(json.matches[0].id, '001');
  });

  test('does not match against non-rejected entries', () => {
    const { json } = run(['check-duplicate'], {
      title: 'Unrelated planned task',
      why: 'Totally different thing',
    });
    assert.equal(json.duplicate, false);
  });

  test('unrelated text finds no match', () => {
    const { json } = run(['check-duplicate'], {
      title: 'Completely different concern about styling',
      why: 'Nothing to do with retries or backoff at all',
    });
    assert.equal(json.duplicate, false);
    assert.deepEqual(json.matches, []);
  });
});

describe('next-candidates', () => {
  test('excludes anything not planned', () => {
    writeRoadmap(project, [
      { id: '001', title: 'done one', status: 'done', depends_on: [], touches: [] },
      { id: '002', title: 'in progress one', status: 'in_progress', depends_on: [], touches: [] },
      { id: '003', title: 'planned one', status: 'planned', depends_on: [], touches: [] },
    ]);
    const { json } = run(['next-candidates']);
    assert.deepEqual(json.candidates.map((c) => c.id), ['003']);
  });

  test('excludes planned tasks with an undone dependency', () => {
    writeRoadmap(project, [
      { id: '001', title: 'prereq', status: 'planned', depends_on: [], touches: [] },
      { id: '002', title: 'blocked', status: 'planned', depends_on: ['001'], touches: [] },
    ]);
    const { json } = run(['next-candidates']);
    assert.deepEqual(json.candidates.map((c) => c.id), ['001']);
  });

  test('includes a planned task once its dependency is done', () => {
    writeRoadmap(project, [
      { id: '001', title: 'prereq', status: 'done', depends_on: [], touches: [] },
      { id: '002', title: 'unblocked now', status: 'planned', depends_on: ['001'], touches: [] },
    ]);
    const { json } = run(['next-candidates']);
    assert.deepEqual(json.candidates.map((c) => c.id), ['002']);
  });

  test('ranks by unblocks-count (most depended-on first)', () => {
    // 003/004 aren't candidates themselves (status dropped) — what matters
    // is 002 being referenced by two other entries' depends_on, computed
    // from the full file regardless of those entries' own status.
    writeRoadmap(project, [
      { id: '001', title: 'unblocks nothing', status: 'planned', depends_on: [], touches: [], created_at: '2026-07-01' },
      { id: '002', title: 'unblocks two others', status: 'planned', depends_on: [], touches: [], created_at: '2026-07-01' },
      { id: '003', title: 'not planned, just a referrer', status: 'dropped', depends_on: ['002'], touches: [] },
      { id: '004', title: 'also a referrer', status: 'dropped', depends_on: ['002'], touches: [] },
    ]);
    const { json } = run(['next-candidates']);
    assert.equal(json.candidates[0].id, '002');
    assert.equal(json.candidates[0].unblocks, 2);
  });

  test('ties in unblocks-count break by oldest created_at first', () => {
    writeRoadmap(project, [
      { id: '001', title: 'newer', status: 'planned', depends_on: [], touches: [], created_at: '2026-07-03' },
      { id: '002', title: 'older', status: 'planned', depends_on: [], touches: [], created_at: '2026-06-01' },
    ]);
    const { json } = run(['next-candidates']);
    assert.deepEqual(json.candidates.map((c) => c.id), ['002', '001']);
  });

  test('flags a touches collision against an in_progress entry', () => {
    writeRoadmap(project, [
      { id: '001', title: 'in progress', status: 'in_progress', depends_on: [], touches: ['src/shared.ts'] },
      { id: '002', title: 'candidate, overlaps', status: 'planned', depends_on: [], touches: ['src/shared.ts'] },
      { id: '003', title: 'candidate, no overlap', status: 'planned', depends_on: [], touches: ['src/other.ts'] },
    ]);
    const { json } = run(['next-candidates']);
    const byId = Object.fromEntries(json.candidates.map((c) => [c.id, c]));
    assert.equal(byId['002'].collision, true);
    assert.equal(byId['003'].collision, false);
  });

  test('respects --limit and reports total_unblocked separately', () => {
    writeRoadmap(
      project,
      Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 1).padStart(3, '0'),
        title: `task ${i + 1}`,
        status: 'planned',
        depends_on: [],
        touches: [],
        created_at: '2026-07-01',
      }))
    );
    const { json } = run(['next-candidates', '--limit', '3']);
    assert.equal(json.candidates.length, 3);
    assert.equal(json.total_unblocked, 8);
  });
});

describe('field length warnings', () => {
  test('add returns a warning for an overlong why, but still writes', () => {
    const { status, json } = run(['add'], {
      title: 'a',
      why: 'x'.repeat(300),
      what: 'a',
      source: 'user',
    });
    assert.equal(status, 0);
    assert.equal(json.ok, true);
    assert.ok(json.warnings && json.warnings.some((w) => w.startsWith('why')));
    assert.equal(json.entry.why.length, 300); // written as given, not truncated
  });

  test('add has no warnings for normal-length fields', () => {
    const { json } = run(['add'], { title: 'a', why: 'short reason', what: 'short scope', source: 'user' });
    assert.equal(json.warnings, undefined);
  });

  test('update-status returns a warning for an overlong notes append', () => {
    writeRoadmap(project, [{ id: '001', title: 'a', why: 'a', what: 'a', status: 'planned', source: 'user', depends_on: [], touches: [], commits: [], created_at: '2026-07-01', updated_at: '2026-07-01', notes: '' }]);
    const { json } = run(['update-status'], { id: '001', status: 'planned', notes: 'y'.repeat(300) });
    assert.ok(json.warnings && json.warnings.some((w) => w.startsWith('notes')));
  });
});

describe('corrupt file handling', () => {
  test('a malformed line fails loudly instead of being skipped', () => {
    fs.writeFileSync(path.join(project, 'ROADMAP.jsonl'), '{"id":"001"\nnot json at all\n', 'utf-8');
    const { status, json } = run(['list']);
    assert.equal(status, 1);
    assert.equal(json.ok, false);
    assert.match(json.error, /not valid JSON/);
  });
});

describe('unknown subcommand', () => {
  test('errors with a helpful message', () => {
    const { status, json } = run(['bogus']);
    assert.equal(status, 1);
    assert.match(json.error, /unknown subcommand/);
  });
});

describe('--help', () => {
  test('--help prints usage, not a JSON error', () => {
    const result = runRoadmap(['--help'], undefined, env);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /add\b/);
    assert.match(result.stdout, /next-candidates/);
    assert.throws(() => JSON.parse(result.stdout));
  });

  test('-h is the same as --help', () => {
    const result = runRoadmap(['-h'], undefined, env);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /update-status/);
  });

  test('no subcommand at all also prints usage', () => {
    const result = runRoadmap([], undefined, env);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check-duplicate/);
  });
});
