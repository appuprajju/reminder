import assert from 'node:assert/strict';
import test from 'node:test';
import type { Reminder } from '../types';
import {
  applyBulkComplete,
  applyBulkDelete,
  pruneSelectedIds,
  toggleSelectAllVisible,
  toggleSelectedId,
} from './bulkSelection';

function makeReminder(overrides: Partial<Reminder> & { id: string; title: string }): Reminder {
  return {
    note: '',
    time: '09:00',
    dueAt: 1_700_000_000_000,
    days: null,
    emoji: '🔔',
    color: '#0A84FF',
    priority: 'med',
    tag: null,
    isAlarm: false,
    sound: null,
    doneDate: null,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

test('pruneSelectedIds removes IDs no longer in the visible filtered list', () => {
  const selected = new Set(['a', 'b', 'c']);
  const pruned = pruneSelectedIds(selected, ['b', 'd']);
  assert.deepEqual(Array.from(pruned), ['b']);
});

test('toggleSelectedId adds and removes cleanly without mutating original set', () => {
  const initial = new Set(['a']);
  const added = toggleSelectedId(initial, 'b');
  assert.deepEqual(Array.from(initial), ['a']);
  assert.deepEqual(Array.from(added), ['a', 'b']);

  const removed = toggleSelectedId(added, 'a');
  assert.deepEqual(Array.from(removed), ['b']);
});

test('toggleSelectAllVisible selects all visible items or clears when all are already selected', () => {
  const visible = ['a', 'b', 'c'];
  const all = toggleSelectAllVisible(new Set(['a']), visible);
  assert.deepEqual(Array.from(all), ['a', 'b', 'c']);

  const cleared = toggleSelectAllVisible(all, visible);
  assert.equal(cleared.size, 0);
});

test('applyBulkComplete marks only pending selected reminders done and preserves already done items', () => {
  const todayKey = '2026-11-28';
  const now = new Date('2026-11-28T08:00:00Z');
  const reminders: Reminder[] = [
    makeReminder({ id: 'r1', title: 'Pending 1', snoozedUntil: now.getTime() + 60000 }),
    makeReminder({ id: 'r2', title: 'Already Done', doneDate: todayKey }),
    makeReminder({ id: 'r3', title: 'Pending 2' }),
    makeReminder({ id: 'r4', title: 'Unselected' }),
  ];

  const result = applyBulkComplete(reminders, ['r1', 'r2', 'r3'], todayKey, false, now);
  assert.equal(result.completedCount, 2);
  assert.equal(result.clearedCount, 0);
  assert.deepEqual(result.completedIds, ['r1', 'r3']);
  assert.equal(result.next.find((r) => r.id === 'r1')?.doneDate, todayKey);
  assert.equal(result.next.find((r) => r.id === 'r1')?.snoozedUntil, null);
  assert.equal(result.next.find((r) => r.id === 'r2')?.doneDate, todayKey);
  assert.equal(result.next.find((r) => r.id === 'r3')?.doneDate, todayKey);
  assert.equal(result.next.find((r) => r.id === 'r4')?.doneDate, null);
});

test('applyBulkComplete respects autoDeleteCompleted for one-time reminders', () => {
  const todayKey = '2026-11-28';
  const now = new Date('2026-11-28T08:00:00Z');
  const reminders: Reminder[] = [
    makeReminder({ id: 'one-off', title: 'Dentist', oneTimeDate: todayKey }),
    makeReminder({ id: 'daily', title: 'Water', days: null }),
  ];

  const result = applyBulkComplete(reminders, ['one-off', 'daily'], todayKey, true, now);
  assert.equal(result.completedCount, 2);
  assert.equal(result.clearedCount, 1);
  assert.deepEqual(
    result.next.map((r) => r.id),
    ['daily']
  );
  assert.equal(result.next[0].doneDate, todayKey);
});

test('applyBulkDelete removes all selected reminders in one pass', () => {
  const reminders: Reminder[] = [
    makeReminder({ id: 'r1', title: 'First' }),
    makeReminder({ id: 'r2', title: 'Second' }),
    makeReminder({ id: 'r3', title: 'Third' }),
  ];

  const result = applyBulkDelete(reminders, ['r1', 'r3']);
  assert.equal(result.deletedCount, 2);
  assert.deepEqual(result.deletedIds, ['r1', 'r3']);
  assert.deepEqual(
    result.next.map((r) => r.id),
    ['r2']
  );
});
