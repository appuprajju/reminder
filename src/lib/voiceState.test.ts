import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHORT_TAP_THRESHOLD_MS,
  buildReminderDraftFromVoice,
  combineTranscript,
  mapSpeechError,
  resolveReleasePhase,
} from './voiceState';

test('combineTranscript cleanly joins finalized and interim speech chunks', () => {
  assert.equal(combineTranscript('Take vitamins', 'at 8:30am'), 'Take vitamins at 8:30am');
  assert.equal(combineTranscript('  ', '  call mom  '), 'call mom');
  assert.equal(combineTranscript('', ''), '');
});

test('resolveReleasePhase transitions to review on speech, ready on short tap, and error on error', () => {
  assert.equal(resolveReleasePhase(900, 'Take vitamins at 8am', false), 'review');
  assert.equal(resolveReleasePhase(SHORT_TAP_THRESHOLD_MS - 50, '', false), 'ready');
  assert.equal(resolveReleasePhase(1200, '', false), 'ready');
  assert.equal(resolveReleasePhase(800, '', true), 'error');
  assert.equal(resolveReleasePhase(800, 'Still captured text', true), 'review');
});

test('mapSpeechError produces actionable plain-language copy for each error code', () => {
  assert.match(mapSpeechError('not-allowed'), /Microphone access was blocked/i);
  assert.match(mapSpeechError('unsupported'), /not available/i);
  assert.match(mapSpeechError('no-speech'), /No speech/i);
  assert.equal(mapSpeechError('aborted'), '');
});

test('buildReminderDraftFromVoice reuses parseQuickInput accurately', () => {
  const fixedNow = new Date(2026, 10, 25, 10, 0, 0);
  const draft = buildReminderDraftFromVoice('Take vitamins daily at 8:30am urgent #health', fixedNow);
  assert.ok(draft);
  assert.equal(draft.title, 'Take vitamins');
  assert.equal(draft.time, '08:30');
  assert.equal(draft.priority, 'high');
  assert.equal(draft.tag, 'health');
  assert.equal(draft.days, null);
  assert.equal(draft.isAlarm, true);
  assert.equal(draft.emoji, '💊');

  assert.equal(buildReminderDraftFromVoice('   ', fixedNow), null);
});
