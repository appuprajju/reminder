import type { Reminder } from '../types';
import { computeNextDueAt, isReminderDoneToday } from './time';

/**
 * Keep only selected IDs that exist in the currently visible list so users never
 * act on hidden reminders after changing status or tag filters.
 */
export function pruneSelectedIds(
  selected: ReadonlySet<string>,
  visibleIds: readonly string[]
): Set<string> {
  if (selected.size === 0) return new Set();
  const visibleSet = new Set(visibleIds);
  const next = new Set<string>();
  for (const id of selected) {
    if (visibleSet.has(id)) next.add(id);
  }
  return next;
}

export function toggleSelectedId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function toggleSelectAllVisible(
  selected: ReadonlySet<string>,
  visibleIds: readonly string[]
): Set<string> {
  if (visibleIds.length === 0) return new Set();
  const allSelected = visibleIds.every((id) => selected.has(id));
  return allSelected ? new Set() : new Set(visibleIds);
}

export interface BulkCompleteResult {
  next: Reminder[];
  completedCount: number;
  clearedCount: number;
  completedIds: string[];
}

/**
 * Mark all pending reminders in `ids` as completed for `todayKey`.
 * Already-completed reminders are preserved untouched. One-day reminders respect
 * `autoDeleteCompleted` identically to single-item completion.
 */
export function applyBulkComplete(
  reminders: readonly Reminder[],
  ids: readonly string[],
  todayKey: string,
  autoDeleteCompleted: boolean,
  now: Date = new Date()
): BulkCompleteResult {
  const targetIds = new Set(ids);
  if (targetIds.size === 0) {
    return { next: [...reminders], completedCount: 0, clearedCount: 0, completedIds: [] };
  }

  const nextDueRef = new Date(now.getTime() + 12 * 3600000);
  const completedIds: string[] = [];
  let clearedCount = 0;
  const next: Reminder[] = [];

  for (const r of reminders) {
    if (!targetIds.has(r.id) || isReminderDoneToday(r, todayKey)) {
      next.push(r);
      continue;
    }

    completedIds.push(r.id);
    const isOneDay = !!r.oneTimeDate || (Array.isArray(r.days) && r.days.length === 1);
    if (autoDeleteCompleted && isOneDay) {
      clearedCount += 1;
      continue;
    }

    const nextDue = computeNextDueAt(r.time, r.days, nextDueRef);
    next.push({
      ...r,
      doneDate: todayKey,
      snoozedUntil: null,
      dueAt: nextDue,
      sent: false,
    });
  }

  return {
    next,
    completedCount: completedIds.length,
    clearedCount,
    completedIds,
  };
}

export interface BulkDeleteResult {
  next: Reminder[];
  deletedCount: number;
  deletedIds: string[];
}

export function applyBulkDelete(
  reminders: readonly Reminder[],
  ids: readonly string[]
): BulkDeleteResult {
  const targetIds = new Set(ids);
  if (targetIds.size === 0) {
    return { next: [...reminders], deletedCount: 0, deletedIds: [] };
  }

  const deletedIds: string[] = [];
  const next: Reminder[] = [];
  for (const r of reminders) {
    if (targetIds.has(r.id)) {
      deletedIds.push(r.id);
    } else {
      next.push(r);
    }
  }

  return {
    next,
    deletedCount: deletedIds.length,
    deletedIds,
  };
}
