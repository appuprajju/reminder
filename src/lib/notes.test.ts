import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReminderDraftFromNote,
  createVoiceNote,
  deriveNoteTitle,
  sortVoiceNotes,
} from './notes';
import { getAlarmSoundLabel } from './audio';

test('deriveNoteTitle generates a clean concise title when blank and preserves explicit title', () => {
  assert.equal(deriveNoteTitle('Project Standup', 'Discuss release checklist'), 'Project Standup');
  assert.equal(
    deriveNoteTitle('', 'Buy milk eggs bread and coffee beans from the corner market'),
    'Buy milk eggs bread and coffee beans'
  );
  assert.equal(deriveNoteTitle('', ''), 'Voice Note');
});

test('sortVoiceNotes sorts pinned notes ahead of unpinned notes by latest update time', () => {
  const olderPinned = createVoiceNote({ title: 'Pinned', content: 'A', pinned: true, nowMs: 1000 });
  const newerNormal = createVoiceNote({ title: 'Recent', content: 'B', pinned: false, nowMs: 5000 });
  const oldestNormal = createVoiceNote({ title: 'Old', content: 'C', pinned: false, nowMs: 500 });

  const sorted = sortVoiceNotes([oldestNormal, newerNormal, olderPinned]);
  assert.deepEqual(
    sorted.map((n) => n.title),
    ['Pinned', 'Recent', 'Old']
  );
});

test('buildReminderDraftFromNote converts a Voice Note into a Reminder Sheet draft preserving full body', () => {
  const draft = buildReminderDraftFromNote({
    title: 'Call dentist at 4pm',
    content: 'Ask about annual cleaning appointment next Friday',
  });
  assert.equal(draft.time, '16:00');
  assert.ok((draft.note || '').includes('Ask about annual cleaning'));
});

test('getAlarmSoundLabel resolves actual custom ringtone filename instead of Radar Sonar', () => {
  assert.equal(getAlarmSoundLabel('custom', 'morning_melody.mp3'), 'morning_melody.mp3');
  assert.equal(getAlarmSoundLabel('custom', null), 'Custom Ringtone');
  assert.equal(getAlarmSoundLabel('marimba', 'morning_melody.mp3'), 'Marimba Chimes');
  assert.equal(getAlarmSoundLabel('radar', null), 'Radar Sonar');
});
