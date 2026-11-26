import type { Reminder } from '../types';

const DAY_MAP = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function formatUtcStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}T` +
    `${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}Z`
  );
}

function formatLocalStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}` +
    `${pad(date.getMonth() + 1)}` +
    `${pad(date.getDate())}T` +
    `${pad(date.getHours())}` +
    `${pad(date.getMinutes())}00`
  );
}

function buildVEventLines(reminder: Reminder, now: Date): string[] {
  const [hh, mm] = (reminder.time || '09:00').split(':').map((n) => parseInt(n, 10) || 0);
  const start = reminder.oneTimeDate
    ? new Date(`${reminder.oneTimeDate}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`)
    : new Date(reminder.dueAt || now.getTime());
  start.setHours(hh, mm, 0, 0);

  const end = new Date(start.getTime() + 30 * 60000);
  const uid = `${reminder.id.replace(/[^a-zA-Z0-9_-]/g, '')}@reminderme.makeuperfect.in`;

  const subtaskBlock =
    reminder.subtasks && reminder.subtasks.length > 0
      ? `\nChecklist:\n${reminder.subtasks.map((s) => `${s.done ? '[x]' : '[ ]'} ${s.title}`).join('\n')}`
      : '';
  const description = `${reminder.note || 'Scheduled with reminderme'}${subtaskBlock}`.trim();

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatUtcStamp(now)}`,
    `DTSTART:${formatLocalStamp(start)}`,
    `DTEND:${formatLocalStamp(end)}`,
    `SUMMARY:${escapeIcsText(`${reminder.emoji ? `${reminder.emoji} ` : ''}${reminder.title}`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
  ];

  if (reminder.tag) {
    lines.push(`CATEGORIES:${escapeIcsText(reminder.tag)}`);
  }

  if (!reminder.oneTimeDate) {
    if (Array.isArray(reminder.days) && reminder.days.length > 0 && reminder.days.length < 7) {
      const byDay = reminder.days
        .filter((d) => d >= 0 && d <= 6)
        .map((d) => DAY_MAP[d])
        .join(',');
      if (byDay) {
        lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);
      }
    } else {
      lines.push('RRULE:FREQ=DAILY');
    }
  }

  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(reminder.title)}`,
    `TRIGGER:${reminder.isAlarm ? '-PT0M' : '-PT5M'}`,
    'END:VALARM',
    'END:VEVENT'
  );

  return lines;
}

export function buildScheduleIcs(reminders: Reminder[], now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//reminderme//Prajwal M yourstudio//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:reminderme Schedule',
  ];

  reminders.forEach((reminder) => {
    lines.push(...buildVEventLines(reminder, now));
  });

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function buildReminderIcs(reminder: Reminder, now = new Date()): string {
  return buildScheduleIcs([reminder], now);
}

export function downloadIcsFile(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
