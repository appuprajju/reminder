import type { Reminder } from '../types';

export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function getTodayDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDateKeyFromDate(d: Date): string {
  return getTodayDateKey(d);
}

export function formatTimeDisplay(time24: string, format: '12h' | '24h'): string {
  const [hRaw, mRaw] = (time24 || '09:00').split(':').map(Number);
  const h = Number.isFinite(hRaw) ? hRaw : 9;
  const m = Number.isFinite(mRaw) ? mRaw : 0;
  const mm = String(m).padStart(2, '0');
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${mm}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mm} ${period}`;
}

export function formatClockParts(now: Date, format: '12h' | '24h') {
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  if (format === '24h') {
    return { hm: `${String(h).padStart(2, '0')}:${m}`, sec: s, period: '' };
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = String(h % 12 || 12).padStart(2, '0');
  return { hm: `${h12}:${m}`, sec: s, period };
}

export function formatDaysSummary(days: number[] | null, oneTimeDate?: string | null): string {
  if (oneTimeDate) {
    const today = getTodayDateKey();
    if (oneTimeDate === today) return 'Today';
    const d = new Date(`${oneTimeDate}T12:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (!days || days.length === 0 || days.length === 7) return 'Daily';
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') return 'Weekdays';
  if (sorted.length === 2 && sorted.join(',') === '0,6') return 'Weekends';
  return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

export function computeNextDueAt(timeStr: string, days: number[] | null, from = new Date()): number {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const targetH = Number.isFinite(h) ? h : 9;
  const targetM = Number.isFinite(m) ? m : 0;

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + offset);
    candidate.setHours(targetH, targetM, 0, 0);
    if (days && days.length > 0 && !days.includes(candidate.getDay())) {
      continue;
    }
    if (candidate.getTime() > from.getTime() - 15000) {
      return candidate.getTime();
    }
  }
  const fallback = new Date(from);
  fallback.setDate(from.getDate() + 1);
  fallback.setHours(targetH, targetM, 0, 0);
  return fallback.getTime();
}

export function isReminderDoneToday(r: Reminder, todayKey = getTodayDateKey()): boolean {
  return r.doneDate === todayKey;
}

export function isReminderScheduledForDate(r: Reminder, date: Date): boolean {
  const key = getDateKeyFromDate(date);
  if (r.oneTimeDate) {
    return r.oneTimeDate === key;
  }
  if (!r.days || r.days.length === 0) return true;
  return r.days.includes(date.getDay());
}

export function formatCountdown(targetMs: number, nowMs = Date.now()): string {
  const diff = targetMs - nowMs;
  if (diff <= 0) return 'Due now';
  const totalMin = Math.ceil(diff / 60000);
  if (totalMin < 60) return `In ${totalMin}m`;
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs < 24) return mins > 0 ? `In ${hrs}h ${mins}m` : `In ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `In ${days}d ${hrs % 24}h`;
}

export function getGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Quiet night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
}

export function hashToInt32(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 2147480000) + 100;
}

export function getMonthCalendarDays(year: number, monthIndex: number): Date[] {
  const firstDay = new Date(year, monthIndex, 1);
  const startDow = firstDay.getDay();
  const days: Date[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, monthIndex, -i));
  }
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, monthIndex, d));
  }
  while (days.length % 7 !== 0) {
    const nextIdx = days.length - startDow - daysInMonth + 1;
    days.push(new Date(year, monthIndex + 1, nextIdx));
  }
  return days;
}

export function getWeekStripDates(anchor = new Date()): Date[] {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
