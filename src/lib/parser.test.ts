import test from 'node:test';
import assert from 'node:assert/strict';
import { applyVoiceDraftOverrides, parseQuickInput } from './parser';

test('parseQuickInput parses spoken alarm times including space-separated and fractional phrases', () => {
  const now = new Date(2026, 10, 26, 10, 0, 0);

  const wake = parseQuickInput('Wake me up tomorrow at 6 30 am', now);
  assert.equal(wake.title, 'Wake-up alarm');
  assert.equal(wake.time, '06:30');
  assert.equal(wake.isAlarm, true);
  assert.equal(wake.oneTimeDate, '2026-11-27');

  const halfPast = parseQuickInput('Set an alarm for half past 7 pm', now);
  assert.equal(halfPast.time, '19:30');
  assert.equal(halfPast.isAlarm, true);

  const quarterTo = parseQuickInput('Quarter to 9 am standup alarm', now);
  assert.equal(quarterTo.time, '08:45');
  assert.equal(quarterTo.isAlarm, true);
});

test('parseQuickInput distinguishes remind-me gentle notifications from loud alarms and handles spoken relative times', () => {
  const now = new Date(2026, 10, 26, 10, 0, 0);

  const halfHour = parseQuickInput('Remind me to drink water in half an hour', now);
  assert.equal(halfHour.title, 'Drink water');
  assert.equal(halfHour.time, '10:30');
  assert.equal(halfHour.isAlarm, false);
  assert.equal(halfHour.emoji, '💧');

  const afterTen = parseQuickInput('Please remind me to call Mom after ten minutes', now);
  assert.equal(afterTen.title, 'Call Mom');
  assert.equal(afterTen.time, '10:10');
  assert.equal(afterTen.isAlarm, false);
});

test('applyVoiceDraftOverrides updates alarm/reminder mode, custom time, and repeat schedule cleanly', () => {
  const now = new Date(2026, 10, 26, 10, 0, 0);
  const base = parseQuickInput('Wake me up at 7am', now);
  const updated = applyVoiceDraftOverrides(
    base,
    { isAlarm: false, time: '08:15', repeatMode: 'weekdays' },
    now
  );

  assert.equal(updated.isAlarm, false);
  assert.equal(updated.time, '08:15');
  assert.deepEqual(updated.days, [1, 2, 3, 4, 5]);
  assert.equal(updated.oneTimeDate, null);
  assert.match(updated.summary, /08:15.*5d\/wk.*Notification/);
});
