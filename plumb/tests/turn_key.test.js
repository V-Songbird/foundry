'use strict';

// turnKey(data): the harness carries prompt_id on the happy path, so the key
// should come from there rather than a transcript parse — see roadmap 017 /
// razor's turnKey(data) for the reference pattern.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { turnKey } = require('../hooks/plumb-lib');
const { writeTurn } = require('./helpers');

describe('unit: turnKey', () => {
  test('prefers prompt_id when present, independent of the transcript uuid', () => {
    const transcriptPath = writeTurn({ uuid: 'transcript-uuid' });
    assert.strictEqual(turnKey({ prompt_id: 'prompt-abc', transcript_path: transcriptPath }), 'prompt-abc');
  });

  test('falls back to the transcript-derived key when prompt_id is absent', () => {
    const transcriptPath = writeTurn({ uuid: 'transcript-uuid' });
    assert.strictEqual(turnKey({ transcript_path: transcriptPath }), 'transcript-uuid');
  });

  test('falls back when prompt_id is an empty string', () => {
    const transcriptPath = writeTurn({ uuid: 'transcript-uuid' });
    assert.strictEqual(turnKey({ prompt_id: '', transcript_path: transcriptPath }), 'transcript-uuid');
  });

  test('no transcript and no prompt_id yields the no-transcript sentinel', () => {
    assert.strictEqual(turnKey({}), 'no-transcript');
  });

  test('accepts a precomputed transcript key as the second arg without re-parsing', () => {
    assert.strictEqual(turnKey({}, 'precomputed-key'), 'precomputed-key');
    assert.strictEqual(turnKey({ prompt_id: 'p1' }, 'precomputed-key'), 'p1');
  });
});
