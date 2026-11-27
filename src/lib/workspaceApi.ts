import type { GmailMessageSummary, GoogleCalendarEvent, Reminder } from '../types';
import { formatDaysSummary, formatTimeDisplay, getDateKeyFromDate } from './time';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';

const DAY_TO_RRULE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export class WorkspaceAuthError extends Error {
  constructor(message = 'Google Workspace session expired. Please reconnect Google.') {
    super(message);
    this.name = 'WorkspaceAuthError';
  }
}

async function googleFetch<T>(url: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new WorkspaceAuthError(
      res.status === 401
        ? 'Google session expired. Tap Reconnect Google to refresh access.'
        : 'Permission needed for Google Calendar or Gmail. Reconnect Google and allow access.'
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message || `Google API error (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

// ============ Google Calendar API v3 ============
export async function fetchUpcomingCalendarEvents(
  accessToken: string,
  daysAhead = 14
): Promise<GoogleCalendarEvent[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + daysAhead * 86400000);

  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '40',
  });

  const data = await googleFetch<{
    items?: {
      id?: string;
      summary?: string;
      description?: string;
      location?: string;
      htmlLink?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }[];
  }>(`${CALENDAR_API}/calendars/primary/events?${params.toString()}`, accessToken);

  return (data.items || [])
    .filter((ev) => ev.id && (ev.start?.dateTime || ev.start?.date))
    .map((ev) => {
      const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
      const startIso = ev.start?.dateTime || `${ev.start?.date}T09:00:00`;
      const parsed = new Date(startIso);
      const dateKey = allDay && ev.start?.date ? ev.start.date : getDateKeyFromDate(parsed);
      const timeHm = allDay
        ? '09:00'
        : `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;

      return {
        id: ev.id!,
        summary: ev.summary || 'Untitled event',
        description: ev.description,
        location: ev.location,
        startIso,
        endIso: ev.end?.dateTime || ev.end?.date,
        dateKey,
        timeHm,
        allDay,
        htmlLink: ev.htmlLink,
      };
    });
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  reminder: Reminder
): Promise<{ id: string; htmlLink?: string }> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [hh, mm] = (reminder.time || '09:00').split(':').map((n) => parseInt(n, 10) || 0);
  const startDate = reminder.oneTimeDate
    ? new Date(`${reminder.oneTimeDate}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`)
    : new Date(reminder.dueAt || Date.now());
  startDate.setHours(hh, mm, 0, 0);

  const endDate = new Date(startDate.getTime() + 30 * 60000);

  const checklistText =
    reminder.subtasks && reminder.subtasks.length > 0
      ? `\n\nChecklist:\n${reminder.subtasks.map((s) => `${s.done ? '[x]' : '[ ]'} ${s.title}`).join('\n')}`
      : '';

  const recurrence: string[] = [];
  if (!reminder.oneTimeDate) {
    if (Array.isArray(reminder.days) && reminder.days.length > 0 && reminder.days.length < 7) {
      const byDay = reminder.days
        .filter((d) => d >= 0 && d <= 6)
        .map((d) => DAY_TO_RRULE[d])
        .join(',');
      if (byDay) recurrence.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);
    } else {
      recurrence.push('RRULE:FREQ=DAILY');
    }
  }

  const body: Record<string, unknown> = {
    summary: `${reminder.emoji || '⏰'} ${reminder.title}`,
    description: `${reminder.note || 'Scheduled via reminderme'}${checklistText}`.trim(),
    start: { dateTime: startDate.toISOString(), timeZone: tz },
    end: { dateTime: endDate.toISOString(), timeZone: tz },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: reminder.isAlarm ? 0 : 10 }],
    },
  };

  if (recurrence.length > 0) {
    body.recurrence = recurrence;
  }

  return googleFetch<{ id: string; htmlLink?: string }>(
    `${CALENDAR_API}/calendars/primary/events`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

// ============ Gmail API v1 ============
function decodeHeader(headers: { name?: string; value?: string }[] | undefined, key: string): string {
  const found = headers?.find((h) => h.name?.toLowerCase() === key.toLowerCase());
  return found?.value || '';
}

export async function fetchRecentGmailMessages(
  accessToken: string,
  maxResults = 8
): Promise<GmailMessageSummary[]> {
  const listParams = new URLSearchParams({
    maxResults: String(maxResults),
    q: 'in:inbox -category:promotions -category:social',
  });

  const listData = await googleFetch<{ messages?: { id: string; threadId: string }[] }>(
    `${GMAIL_API}/users/me/messages?${listParams.toString()}`,
    accessToken
  );

  const refs = listData.messages || [];
  if (refs.length === 0) return [];

  const details = await Promise.all(
    refs.slice(0, maxResults).map(async (ref) => {
      try {
        const msg = await googleFetch<{
          id: string;
          threadId: string;
          snippet?: string;
          labelIds?: string[];
          internalDate?: string;
          payload?: { headers?: { name?: string; value?: string }[] };
        }>(
          `${GMAIL_API}/users/me/messages/${encodeURIComponent(ref.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          accessToken
        );

        const subject = decodeHeader(msg.payload?.headers, 'Subject') || '(No subject)';
        const fromRaw = decodeHeader(msg.payload?.headers, 'From') || 'Unknown sender';
        const from = fromRaw.replace(/<[^>]+>/g, '').replace(/"/g, '').trim() || fromRaw;
        const internalMs = msg.internalDate ? Number(msg.internalDate) : Date.now();

        return {
          id: msg.id,
          threadId: msg.threadId,
          subject,
          from,
          snippet: (msg.snippet || '').trim(),
          dateIso: new Date(internalMs).toISOString(),
          isStarred: Boolean(msg.labelIds?.includes('STARRED')),
        } satisfies GmailMessageSummary;
      } catch {
        return null;
      }
    })
  );

  return details.filter((m): m is GmailMessageSummary => m !== null);
}

function encodeBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendGmailMessage(
  accessToken: string,
  payload: { to: string; subject: string; bodyText: string }
): Promise<{ id: string }> {
  const cleanTo = payload.to.replace(/[\r\n]/g, '').trim();
  const cleanSubject = payload.subject.replace(/[\r\n]/g, '').trim();
  const mime = [
    `To: ${cleanTo}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(cleanSubject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    payload.bodyText,
  ].join('\r\n');

  return googleFetch<{ id: string }>(`${GMAIL_API}/users/me/messages/send`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ raw: encodeBase64UrlUtf8(mime) }),
  });
}

export function formatReminderEmail(
  reminder: Reminder,
  timeFormat: '12h' | '24h'
): { subject: string; bodyText: string } {
  const schedule = formatDaysSummary(reminder.days, reminder.oneTimeDate);
  const timeLabel = formatTimeDisplay(reminder.time, timeFormat);
  const checklist =
    reminder.subtasks && reminder.subtasks.length > 0
      ? `\n\nChecklist:\n${reminder.subtasks.map((s) => `${s.done ? '✓' : '○'} ${s.title}`).join('\n')}`
      : '';

  return {
    subject: `Reminder: ${reminder.title} (${timeLabel})`,
    bodyText: [
      `${reminder.emoji || '⏰'} ${reminder.title}`,
      `Time: ${timeLabel} · ${schedule}`,
      `Type: ${reminder.isAlarm ? 'Loud Alarm' : 'Notification'}`,
      reminder.note ? `Notes: ${reminder.note}` : '',
      checklist,
      '',
      'Sent from reminderme',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function formatDailyDigestEmail(
  reminders: Reminder[],
  calendarEvents: GoogleCalendarEvent[],
  timeFormat: '12h' | '24h'
): { subject: string; bodyText: string } {
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const sortedReminders = [...reminders].sort((a, b) => a.time.localeCompare(b.time));
  const reminderLines =
    sortedReminders.length > 0
      ? sortedReminders.map(
          (r) =>
            `• ${formatTimeDisplay(r.time, timeFormat)} — ${r.title} (${
              r.isAlarm ? 'Alarm' : 'Reminder'
            }${r.tag ? `, ${r.tag}` : ''})`
        )
      : ['• No reminders scheduled yet.'];

  const eventLines =
    calendarEvents.length > 0
      ? [
          '',
          'Upcoming Google Calendar Events:',
          ...calendarEvents
            .slice(0, 8)
            .map(
              (ev) =>
                `• ${ev.dateKey} ${ev.allDay ? 'All day' : formatTimeDisplay(ev.timeHm, timeFormat)} — ${ev.summary}`
            ),
        ]
      : [];

  return {
    subject: `Daily Agenda Digest — ${dateLabel}`,
    bodyText: [
      `Good day! Here is your reminderme schedule for ${dateLabel}:`,
      '',
      'Reminders & Alarms:',
      ...reminderLines,
      ...eventLines,
      '',
      'Stay focused — reminderme',
    ].join('\n'),
  };
}

function formatGoogleCalDateUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`
  );
}

/**
 * Builds an official Google Calendar template link that pre-fills the event
 * directly in the user's Google Calendar with ZERO OAuth verification warning.
 */
export function buildDirectGoogleCalendarUrl(reminder: Reminder): string {
  const [hh, mm] = (reminder.time || '09:00').split(':').map((n) => parseInt(n, 10) || 0);
  const startDate = reminder.oneTimeDate
    ? new Date(`${reminder.oneTimeDate}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`)
    : new Date(reminder.dueAt || Date.now());
  startDate.setHours(hh, mm, 0, 0);
  const endDate = new Date(startDate.getTime() + 30 * 60000);

  const checklistText =
    reminder.subtasks && reminder.subtasks.length > 0
      ? `\n\nChecklist:\n${reminder.subtasks.map((s) => `${s.done ? '[x]' : '[ ]'} ${s.title}`).join('\n')}`
      : '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${reminder.emoji || '⏰'} ${reminder.title}`,
    dates: `${formatGoogleCalDateUtc(startDate)}/${formatGoogleCalDateUtc(endDate)}`,
    details: `${reminder.note || 'Scheduled via reminderme'}${checklistText}`.trim(),
  });

  if (!reminder.oneTimeDate) {
    if (Array.isArray(reminder.days) && reminder.days.length > 0 && reminder.days.length < 7) {
      const byDay = reminder.days
        .filter((d) => d >= 0 && d <= 6)
        .map((d) => DAY_TO_RRULE[d])
        .join(',');
      if (byDay) params.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);
    } else {
      params.set('recur', 'RRULE:FREQ=DAILY');
    }
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Builds an official Gmail web compose link pre-filled with recipient, subject,
 * and body — works for any Gmail account with ZERO OAuth verification warning.
 */
export function buildDirectGmailComposeUrl(payload: {
  to?: string;
  subject: string;
  bodyText: string;
}): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    su: payload.subject,
    body: payload.bodyText,
  });
  if (payload.to?.trim()) {
    params.set('to', payload.to.trim());
  }
  return `https://mail.google.com/mail/?${params.toString()}`;
}

