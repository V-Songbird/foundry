'use strict';

// Retained records (runner/records.js): the batch manifest keeps the hush
// commit it measured, while the token rule still redacts long secrets. Local
// temporary files only.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeRecord, readRecords } = require('../runner/records.js');

const NOBODY = { username: '', hosts: [] };
const SHA = '0123456789abcdef0123456789abcdef01234567';
const TOKEN = 'Zq9xW2vB7nM4kL1pR8tY3uI6oA5sD0fG2hJ4kL6z';

test('a retained batch.json keeps the 40-character hush commit and still redacts a 40-character token', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'records-'));
  const file = path.join(dir, 'batch.json');
  try {
    writeRecord(dir, 'batch', {
      batchId: 'b-1', tag: 't',
      hush: { head: SHA, dirty: false, version: '2.0.0' },
      note: `copied ${TOKEN} and ${SHA} into prose`,
      other: { head: TOKEN },
    }, NOBODY);
    const { batches } = readRecords(dir);
    assert.strictEqual(batches.length, 1);
    const [batch] = batches;
    assert.strictEqual(batch.hush.head, SHA);
    assert.strictEqual(batch.note, 'copied <redacted-secret> and <redacted-secret> into prose');
    assert.strictEqual(batch.other.head, '<redacted-secret>');
  } finally {
    try { fs.chmodSync(file, 0o644); } catch { /* never written */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
