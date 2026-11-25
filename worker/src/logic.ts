/**
 * Pure, edge-safe utilities for the Cloudflare Worker backend.
 * Uses only Web Crypto & standard ECMAScript APIs so it runs identically
 * in Cloudflare Workers and Node.js unit tests.
 */

export interface CleanReminder {
  id: string;
  title: string;
  note: string;
  time: string;
  dueAt: number;
  dueAtUtc: string;
  sent: boolean;
  days: number[] | null;
  oneTimeDate: string | null;
  emoji: string;
  color: string;
  priority: 'high' | 'med' | 'low';
  tag: string | null;
  isAlarm: boolean;
  sound: string | null;
  doneDate: string | null;
  snoozedUntil: number | null;
  createdAt: number;
}

export interface AnalyticsEventRow {
  type: string;
  ts: number;
}

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://reminder.makeuperfect.in',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
]);

export function str(v: unknown, max: number): string {
  return String(v == null ? '' : v).slice(0, max);
}

export function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    out += buf[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ bb[i];
  }
  return diff === 0;
}

/**
 * PBKDF2-SHA256 (100,000 iterations) using standard Web Crypto API.
 * Fast on Cloudflare Edge Workers and supported natively without Node polyfills.
 */
export async function hashPassword(password: string, existingSalt?: string): Promise<{ salt: string; hash: string }> {
  const salt = existingSalt || randomHex(16);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const bytes = new Uint8Array(derivedBits);
  let hash = '';
  for (let i = 0; i < bytes.length; i++) {
    hash += bytes[i].toString(16).padStart(2, '0');
  }
  return { salt, hash };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  if (!password || !salt || !expectedHash) return false;
  const { hash } = await hashPassword(password, salt);
  return timingSafeEqualStr(hash, expectedHash);
}

export function isOriginAllowed(origin: string, extraAllowedCsv = ''): boolean {
  if (!origin) return false;
  if (DEFAULT_ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.makeuperfect\.in$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (extraAllowedCsv) {
    const extras = extraAllowedCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (extras.includes(origin)) return true;
  }
  return false;
}

export function buildCorsHeaders(origin: string, extraAllowedCsv = ''): Record<string, string> {
  const allowed = isOriginAllowed(origin, extraAllowedCsv);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Cron-Secret',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export function validTz(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function localParts(tz: string, d = new Date()): { date: string; time: string } {
  const safeTz = validTz(tz) ? tz : 'UTC';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`,
  };
}

export function computeNextDueAtUtc(
  timeStr: string,
  days: number[] | null,
  tz = 'UTC',
  fromDate = new Date()
): number {
  const [targetH, targetM] = (timeStr || '09:00').split(':').map(Number);
  const userTz = validTz(tz) ? tz : 'UTC';

  for (let offsetDays = 0; offsetDays <= 7; offsetDays++) {
    const candidateBase = new Date(fromDate.getTime() + offsetDays * 86400000);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: userTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(candidateBase)
        .map((p) => [p.type, p.value])
    );

    const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();

    if (days && days.length && !days.includes(dayOfWeek)) continue;

    const utcEstimate = new Date(Date.UTC(y, m - 1, d, targetH, targetM, 0));
    const pEst = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: userTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(utcEstimate)
        .map((p) => [p.type, p.value])
    );

    const estH = pEst.hour === '24' ? 0 : Number(pEst.hour);
    const estM = Number(pEst.minute);

    let diffMinutes = targetH * 60 + targetM - (estH * 60 + estM);
    if (diffMinutes > 720) diffMinutes -= 1440;
    if (diffMinutes < -720) diffMinutes += 1440;

    const exactUtcMs = utcEstimate.getTime() + diffMinutes * 60000;
    if (exactUtcMs >= fromDate.getTime() - 45000) {
      return exactUtcMs;
    }
  }

  return fromDate.getTime() + 86400000;
}

export function cleanReminder(raw: Record<string, unknown>, userTz = 'UTC', now = Date.now()): CleanReminder {
  const rawTime = typeof raw.time === 'string' ? raw.time : '09:00';
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(rawTime) ? rawTime : '09:00';
  const days = Array.isArray(raw.days)
    ? raw.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)
    : null;
  const cleanDays = days && days.length ? days : null;
  const isAlarm = raw.isAlarm !== false;
  const nextDue = computeNextDueAtUtc(time, cleanDays, userTz, new Date(now));
  const numDue = Number(raw.dueAt);
  const dueAt = Number.isFinite(numDue) && numDue > now - 3600000 ? Math.round(numDue) : nextDue;
  const rawColor = typeof raw.color === 'string' ? raw.color : '';
  const rawPrio = raw.priority;
  const priority: 'high' | 'med' | 'low' =
    rawPrio === 'high' || rawPrio === 'med' || rawPrio === 'low' ? rawPrio : 'med';

  const snoozedUntil =
    raw.snoozedUntil != null && Number.isFinite(Number(raw.snoozedUntil)) ? Math.round(Number(raw.snoozedUntil)) : null;

  return {
    id: str(raw.id || `r_${randomHex(6)}`, 40),
    title: str(raw.title, 80).trim() || 'Reminder',
    note: str(raw.note, 140),
    time,
    dueAt,
    dueAtUtc: new Date(dueAt).toISOString(),
    sent: !!raw.sent,
    days: cleanDays,
    oneTimeDate: typeof raw.oneTimeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.oneTimeDate) ? raw.oneTimeDate : null,
    emoji: str(raw.emoji, 8) || (isAlarm ? '⏰' : '🔔'),
    color: /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor : '#2F80FF',
    priority,
    tag: str(raw.tag, 30).trim() || null,
    isAlarm,
    sound: str(raw.sound, 40) || (isAlarm ? 'radar' : null),
    doneDate: typeof raw.doneDate === 'string' ? raw.doneDate.slice(0, 10) : null,
    snoozedUntil,
    createdAt: Number.isFinite(Number(raw.createdAt)) && Number(raw.createdAt) > 0 ? Math.round(Number(raw.createdAt)) : now,
  };
}

export function summarizeAnalytics(
  events: AnalyticsEventRow[],
  remindersCount: number,
  usersCount: number,
  now = Date.now()
) {
  const byFeature: Record<string, number> = {};
  const byDay: Record<string, { events: number; done: number }> = {};
  const hours = Array<number>(24).fill(0);

  for (const e of events) {
    byFeature[e.type] = (byFeature[e.type] || 0) + 1;
    const d = new Date(e.ts);
    const day = d.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { events: 0, done: 0 };
    byDay[day].events++;
    if (e.type === 'reminder_done' || e.type === 'push_done' || e.type === 'banner_done') {
      byDay[day].done++;
    }
    hours[d.getUTCHours()]++;
  }

  const last7: { day: string; events: number; done: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now - i * 86400000).toISOString().slice(0, 10);
    last7.push({ day, events: byDay[day]?.events || 0, done: byDay[day]?.done || 0 });
  }

  return {
    totalEvents: events.length,
    users: usersCount,
    reminders: remindersCount,
    features: Object.entries(byFeature)
      .sort((a, b) => b[1] - a[1])
      .map(([feature, count]) => ({ feature, count })),
    last7,
    hoursUtc: hours,
  };
}

export const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Privacy Policy — reminderme</title>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #060812; color: #e2e8f0; line-height: 1.65; }
  main { max-width: 740px; margin: 0 auto; padding: 48px 20px 80px; }
  h1 { color: #f8fafc; font-size: 28px; margin: 0 0 8px; }
  h2 { color: #f8fafc; font-size: 18px; margin: 28px 0 8px; }
  p, li { color: #94a3b8; font-size: 15px; }
  a { color: #60a5fa; text-decoration: none; }
  .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; }
  .card { background: #0f1426; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; }
</style>
</head>
<body>
<main>
  <div class="card">
    <h1>Privacy Policy for reminderme</h1>
    <div class="meta">Effective Date: November 25, 2026 · Developer: Prajwal M (&lt;/yourstudio&gt;)</div>
    <p><strong>reminderme</strong> operates offline-first on your device with optional serverless cloud synchronization. We collect only the minimal information required to deliver alarms, reminders, and cross-device sync.</p>
    <h2>1. On-Device Guest Storage</h2>
    <p>In Guest Mode, all schedules, custom ringtones, and preferences stay exclusively on your device using native storage and IndexedDB.</p>
    <h2>2. Optional Account &amp; Edge Cloud Sync</h2>
    <p>When you create an account, we store your email address, display name, salted PBKDF2 password hash, timezone, synced schedules, and push subscription strictly to sync across devices and trigger lock-screen alerts.</p>
    <h2>3. Device Permissions</h2>
    <ul>
      <li><strong>Notifications &amp; Exact Alarms:</strong> Deliver scheduled alerts reliably even when the app is closed and the screen is locked.</li>
      <li><strong>Microphone (Optional):</strong> Used only when you tap Voice Quick-Add. Audio is never uploaded or stored.</li>
      <li><strong>Vibration &amp; Wake Lock:</strong> Provides haptic feedback and wakes the screen for urgent alarms.</li>
    </ul>
    <h2>4. Data Control &amp; Deletion</h2>
    <p>We never sell or share personal data with third-party advertisers. Contact <a href="mailto:admin@reminderme.app">admin@reminderme.app</a> to request full account deletion.</p>
  </div>
</main>
</body>
</html>`;
