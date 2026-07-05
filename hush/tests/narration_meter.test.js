'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook, hookOutput } = require('./helpers');
const { measureLastTurn, wordCount } = require('../hooks/narration-meter');

function userPrompt(text) {
  return JSON.stringify({ type: 'user', message: { role: 'user', content: text } });
}

function assistantText(text, extra) {
  return JSON.stringify({
    type: 'assistant',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
    ...(extra || {}),
  });
}

function toolResult() {
  return JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'ok' }] },
  });
}

// Background Task-tool completion: type:"user", string content, origin.kind
// marks it as harness-injected rather than typed by a person.
function taskNotification(text) {
  return JSON.stringify({
    type: 'user',
    message: { role: 'user', content: `<task-notification>${text}</task-notification>` },
    origin: { kind: 'task-notification' },
  });
}

// ScheduleWakeup firing: type:"user", string content (the wakeup's reason/
// prompt), isMeta:true, no origin field at all.
function wakeupFired(text) {
  return JSON.stringify({
    type: 'user',
    message: { role: 'user', content: text },
    isMeta: true,
  });
}

function writeTranscript(lines) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hush-')), 't.jsonl');
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
}

const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('unit: measureLastTurn', () => {
  test('final block is the deliverable, not narration', () => {
    const { narration, blocks } = measureLastTurn([
      userPrompt('do thing'),
      assistantText(words(50)),
      toolResult(),
      assistantText(words(200)),
    ]);
    assert.strictEqual(narration, 50);
    assert.strictEqual(blocks, 1);
  });

  test('single-block turn counts zero narration', () => {
    const { narration } = measureLastTurn([userPrompt('q'), assistantText(words(500))]);
    assert.strictEqual(narration, 0);
  });

  test('tool_result user lines do not end the turn scan', () => {
    const { narration } = measureLastTurn([
      userPrompt('go'),
      assistantText(words(30)),
      toolResult(),
      assistantText(words(30)),
      toolResult(),
      assistantText(words(5)),
    ]);
    assert.strictEqual(narration, 60);
  });

  test('previous turns are excluded', () => {
    const { narration } = measureLastTurn([
      userPrompt('first'),
      assistantText(words(999)),
      userPrompt('second'),
      assistantText(words(10)),
      assistantText(words(5)),
    ]);
    assert.strictEqual(narration, 10);
  });

  test('sidechain (subagent) entries are ignored', () => {
    const { narration } = measureLastTurn([
      userPrompt('go'),
      assistantText(words(40)),
      assistantText(words(500), { isSidechain: true }),
      assistantText(words(5)),
    ]);
    assert.strictEqual(narration, 40);
  });

  test('wordCount ignores extra whitespace', () => {
    assert.strictEqual(wordCount('  a\n b\tc  '), 3);
  });

  test('task-notification does not reset the turn: pings across it accumulate', () => {
    const { narration, blocks } = measureLastTurn([
      userPrompt('run the four audits'),
      assistantText(words(20)), // status ping after audit 1
      taskNotification('audit 2 done'),
      assistantText(words(20)), // status ping after audit 2
      taskNotification('audit 3 done'),
      assistantText(words(20)), // status ping after audit 3
      taskNotification('audit 4 done'),
      assistantText(words(30)), // final synthesis
    ]);
    assert.strictEqual(narration, 60);
    assert.strictEqual(blocks, 3);
  });

  test('ScheduleWakeup firing (isMeta) does not reset the turn either', () => {
    const { narration } = measureLastTurn([
      userPrompt('go'),
      assistantText(words(15)), // "waiting on it, will report back"
      wakeupFired('check background agent and continue'),
      assistantText(words(10)), // final message
    ]);
    assert.strictEqual(narration, 15);
  });
});

describe('hook: end to end', () => {
  test('under budget stays silent', () => {
    const file = writeTranscript([userPrompt('go'), assistantText(words(10)), assistantText(words(5))]);
    const r = runHook('narration-meter.js', { transcript_path: file });
    assert.strictEqual(hookOutput(r), null);
  });

  test('over budget injects one corrective line', () => {
    const file = writeTranscript([userPrompt('go'), assistantText(words(300)), assistantText(words(5))]);
    const r = runHook('narration-meter.js', { transcript_path: file });
    const out = hookOutput(r);
    assert.strictEqual(out.hookSpecificOutput.hookEventName, 'Stop');
    assert.match(out.hookSpecificOutput.additionalContext, /300 words/);
  });

  test('budget is tunable via HUSH_NARRATION_BUDGET', () => {
    const file = writeTranscript([userPrompt('go'), assistantText(words(30)), assistantText(words(5))]);
    const r = runHook('narration-meter.js', { transcript_path: file }, { HUSH_NARRATION_BUDGET: '10' });
    assert.match(hookOutput(r).hookSpecificOutput.additionalContext, /30 words/);
  });

  test('missing transcript stays silent', () => {
    const r = runHook('narration-meter.js', { transcript_path: 'Z:\\nope\\missing.jsonl' });
    assert.strictEqual(hookOutput(r), null);
  });

  test('HUSH_DISABLE=1 bypasses', () => {
    const file = writeTranscript([userPrompt('go'), assistantText(words(300)), assistantText(words(5))]);
    const r = runHook('narration-meter.js', { transcript_path: file }, { HUSH_DISABLE: '1' });
    assert.strictEqual(hookOutput(r), null);
  });
});
