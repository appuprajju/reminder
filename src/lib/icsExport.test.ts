import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReminderIcs, buildScheduleIcs } from './icsExport';
import type { Reminder } from '../types';

const sampleReminder: Reminder = {
  id: 'rem_test_1',
  title: 'Take vitamins, stretch',
  note: 'With breakfast; stay hydrated',
  time: '08:30',
  dueAt: new Date(2026, 10, 26, 8, 30, 0).getTime(),
  days: [1, 3, 5],
  oneTimeDate: null,
  emoji: '💊',
  color: '#0A84FF',
  priority: 'high',
  tag: 'Health',
  isAlarm: true,
  sound: 'morning',
  doneDate: null,
  subtasks: [
    { id: 's1', title: 'Vitamin D', done: true },
    { id: 's2', title: 'Magnesium', done: false },
  ],
  createdAt: 1700000000000,
};

test('buildReminderIcs generates valid RFC 5545 VCALENDAR with RRULE, VALARM, and escaped text', () => {
  const ics = buildReminderIcs(sampleReminder, new Date('2026-11-25T12:00:00Z'));
  assert.match(ics, /BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /BEGIN:VEVENT\r\n/);
  assert.match(ics, /SUMMARY:💊 Take vitamins\\, stretch\r\n/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\r\n/);
  assert.match(ics, /BEGIN:VALARM\r\nACTION:DISPLAY\r\n/);
  assert.match(ics, /TRIGGER:-PT0M\r\n/);
  assert.match(ics, /\[x\] Vitamin D/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});

test('buildScheduleIcs handles one-time date reminders without RRULE', () => {
  const oneTime: Reminder = {
    ...sampleReminder,
    id: 'rem_once_2',
    days: null,
    oneTimeDate: '2026-12-01',
    isAlarm: false,
  };
  const ics = buildScheduleIcs([oneTime], new Date('2026-11-25T12:00:00Z'));
  assert.match(ics, /DTSTART:20261201T083000\r\n/);
  assert.doesNotMatch(ics, /RRULE:/);
  assert.match(ics, /TRIGGER:-PT5M\r\n/);
});
