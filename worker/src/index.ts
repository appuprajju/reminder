/**
 * Cloudflare Worker + D1 Serverless Edge Backend for reminderme
 *
 * Full API parity with server.js plus backward compatibility for legacy /worker/ push routes:
 * - Zero always-on Node server needed: runs globally at the edge with 1-minute Cron Trigger.
 * - Full accounts & sessions (PBKDF2-SHA256 + Bearer token & HttpOnly SameSite=None cookie).
 * - Batched D1 reminder sync, done/snooze mutations, analytics, FCM & Web Push delivery.
 * - Hosted /privacy HTML page for Google Play Store & Apple App Store compliance.
 */

import webpush from 'web-push';
import {
  PRIVACY_HTML,
  buildCorsHeaders,
  cleanReminder,
  computeNextDueAtUtc,
  hashPassword,
  localParts,
  randomHex,
  str,
  summarizeAnalytics,
  timingSafeEqualStr,
  validTz,
  verifyPassword,
  type AnalyticsEventRow,
  type CleanReminder,
} from './logic';

export interface Env {
  DB: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  CRON_SECRET?: string;
  ADMIN_EMAILS?: string;
  ALLOWED_ORIGINS?: string;
  APP_URL?: string;
  [key: string]: unknown;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  tz: string;
  salt: string;
  password_hash: string;
  created_at: number;
}

interface UserReminderRow {
  id: string;
  user_id: string;
  title: string;
  note: string;
  time: string;
  due_at: number;
  days_json: string | null;
  one_time_date: string | null;
  emoji: string;
  color: string;
  priority: 'high' | 'med' | 'low';
  tag: string | null;
  is_alarm: number;
  sound: string | null;
  done_date: string | null;
  snoozed_until: number | null;
  sent: number;
  created_at: number;
}

interface PushSubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface LegacyDueReminderRow {
  id: string;
  subscription_endpoint: string;
  title: string;
  body: string | null;
  due_at_utc: number;
  sent: number;
  p256dh: string;
  auth: string;
}

const SESSION_DAYS = 30;
const authAttempts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (authAttempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  recent.push(now);
  authAttempts.set(ip, recent);
  if (authAttempts.size > 500) {
    authAttempts.clear();
  }
  return recent.length > 25;
}

export function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function parseCookies(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return out;
}

function sessionCookieHeader(request: Request, token: string, maxAge: number): string {
  const isHttps = request.url.startsWith('https://');
  if (isHttps) {
    return `gd_session=${token}; HttpOnly; Path=/; SameSite=None; Secure; Partitioned; Max-Age=${maxAge}`;
  }
  return `gd_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

function extractToken(request: Request): string {
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return parseCookies(request).gd_session || '';
}

function rowToReminder(row: UserReminderRow): CleanReminder {
  let days: number[] | null = null;
  if (row.days_json) {
    try {
      const parsed = JSON.parse(row.days_json);
      if (Array.isArray(parsed) && parsed.length > 0) days = parsed;
    } catch {
      days = null;
    }
  }
  return {
    id: row.id,
    title: row.title,
    note: row.note || '',
    time: row.time,
    dueAt: row.due_at,
    dueAtUtc: new Date(row.due_at).toISOString(),
    sent: row.sent === 1,
    days,
    oneTimeDate: row.one_time_date || null,
    emoji: row.emoji || (row.is_alarm ? '⏰' : '🔔'),
    color: row.color || '#2F80FF',
    priority: row.priority || 'med',
    tag: row.tag || null,
    isAlarm: row.is_alarm !== 0,
    sound: row.sound || (row.is_alarm ? 'radar' : null),
    doneDate: row.done_date || null,
    snoozedUntil: row.snoozed_until ?? null,
    createdAt: row.created_at,
  };
}

async function isAdminUser(env: Env, user: UserRow): Promise<boolean> {
  const configured = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length > 0) {
    return configured.includes(user.email.toLowerCase());
  }
  const first = await env.DB.prepare('SELECT id FROM users ORDER BY created_at ASC LIMIT 1').first<{ id: string }>();
  return first?.id === user.id;
}

async function toPublicUser(env: Env, user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tz: user.tz,
    createdAt: user.created_at,
    admin: await isAdminUser(env, user),
  };
}

async function getCurrentUser(request: Request, env: Env): Promise<UserRow | null> {
  const token = extractToken(request);
  if (!token) return null;
  const now = Date.now();
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.tz, u.salt, u.password_hash, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?
     LIMIT 1`
  )
    .bind(token, now)
    .first<UserRow>();
  return row || null;
}

async function fetchUserReminders(env: Env, userId: string): Promise<CleanReminder[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM user_reminders WHERE user_id = ? ORDER BY created_at DESC LIMIT 150'
  )
    .bind(userId)
    .all<UserReminderRow>();
  return (results || []).map(rowToReminder);
}

async function replaceUserReminders(env: Env, userId: string, userTz: string, list: unknown[]): Promise<CleanReminder[]> {
  const now = Date.now();
  const cleaned = list
    .slice(0, 120)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => cleanReminder(item, userTz, now));

  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM user_reminders WHERE user_id = ?').bind(userId),
  ];

  for (const r of cleaned) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO user_reminders
         (id, user_id, title, note, time, due_at, days_json, one_time_date, emoji, color, priority, tag, is_alarm, sound, done_date, snoozed_until, sent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        r.id,
        userId,
        r.title,
        r.note,
        r.time,
        r.dueAt,
        r.days ? JSON.stringify(r.days) : null,
        r.oneTimeDate,
        r.emoji,
        r.color,
        r.priority,
        r.tag,
        r.isAlarm ? 1 : 0,
        r.sound,
        r.doneDate,
        r.snoozedUntil,
        r.sent ? 1 : 0,
        r.createdAt,
        now
      )
    );
  }

  await env.DB.batch(statements);
  return cleaned;
}

async function recordUserEvent(
  env: Env,
  userId: string,
  type: string,
  meta: Record<string, unknown> = {},
  ts = Date.now()
) {
  const safeMeta = JSON.stringify(meta || {}).slice(0, 500);
  await env.DB.prepare('INSERT INTO events (user_id, type, meta_json, ts) VALUES (?, ?, ?, ?)')
    .bind(userId, str(type, 40), safeMeta, ts)
    .run();
}

function initWebPush(env: Env): boolean {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    env.VAPID_SUBJECT || 'mailto:admin@reminderme.app',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  return true;
}

async function pushToUser(env: Env, userId: string, payload: Record<string, unknown>): Promise<number> {
  if (!initWebPush(env)) return 0;
  const { results } = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM user_push_subs WHERE user_id = ?')
    .bind(userId)
    .all<PushSubRow>();
  const subs = results || [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 600, urgency: 'high' }
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await env.DB.prepare('DELETE FROM user_push_subs WHERE endpoint = ?').bind(s.endpoint).run();
        }
      }
    })
  );
  return sent;
}

/**
 * Edge Cron Processor (runs every minute via Cloudflare Triggers).
 * Fires due alarms for BOTH authenticated user accounts (`user_reminders`)
 * and legacy anonymous subscriptions (`reminders`).
 */
export async function processDueReminders(env: Env) {
  const now = Date.now();
  let sentCount = 0;
  let prunedSubs = 0;
  let dueCount = 0;

  if (!initWebPush(env)) {
    return {
      ok: false,
      error: 'Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY in Worker secrets',
      checkedAt: new Date(now).toISOString(),
    };
  }

  const appUrl = env.APP_URL || 'https://reminder.makeuperfect.in';

  // 1. Authenticated account reminders
  const { results: userDueRows } = await env.DB.prepare(
    `SELECT r.*, u.tz AS user_tz
     FROM user_reminders r
     JOIN users u ON u.id = r.user_id
     WHERE EXISTS (SELECT 1 FROM user_push_subs s WHERE s.user_id = r.user_id)
       AND r.sent = 0
       AND r.due_at <= ?
     ORDER BY r.due_at ASC
     LIMIT 100`
  )
    .bind(now + 15000)
    .all<UserReminderRow & { user_tz: string }>();

  for (const row of userDueRows || []) {
    const { date } = localParts(row.user_tz || 'UTC', new Date(now));
    if (row.done_date === date && !row.snoozed_until) continue;

    const fireKey = `${row.user_id}:${row.id}:${row.snoozed_until || date}`;
    const alreadyFired = await env.DB.prepare('SELECT 1 FROM fired_log WHERE fire_key = ?').bind(fireKey).first();
    if (alreadyFired) continue;

    dueCount++;
    const isAlarm = row.is_alarm !== 0;
    const n = await pushToUser(env, row.user_id, {
      id: row.id,
      reminderId: row.id,
      title: isAlarm ? `⏰ ALARM: ${row.title}` : `${row.emoji || '🔔'} ${row.title}`,
      body: row.note || (isAlarm ? `Alarm ringing for ${row.time} — Tap to dismiss or snooze` : `Scheduled for ${row.time}`),
      tag: `r-${row.id}`,
      isAlarm,
      sound: row.sound || 'radar',
      url: appUrl,
    });
    sentCount += n;

    // Schedule next occurrence if recurring, otherwise mark sent
    let days: number[] | null = null;
    if (row.days_json) {
      try {
        days = JSON.parse(row.days_json);
      } catch {
        days = null;
      }
    }
    const isOneTime = !!row.one_time_date || (Array.isArray(days) && days.length === 1);
    const nextDue = isOneTime
      ? row.due_at
      : computeNextDueAtUtc(row.time, days, row.user_tz || 'UTC', new Date(now + 70000));

    await env.DB.batch([
      env.DB.prepare('INSERT OR REPLACE INTO fired_log (fire_key, fired_at) VALUES (?, ?)').bind(fireKey, now),
      env.DB.prepare('UPDATE user_reminders SET sent = ?, snoozed_until = NULL, due_at = ? WHERE user_id = ? AND id = ?').bind(
        isOneTime ? 1 : 0,
        nextDue,
        row.user_id,
        row.id
      ),
      env.DB.prepare('INSERT INTO events (user_id, type, meta_json, ts) VALUES (?, ?, ?, ?)').bind(
        row.user_id,
        'push_sent',
        JSON.stringify({ reminder: row.id, devices: n }),
        now
      ),
    ]);
  }

  // 2. Legacy anonymous reminders table (backward compatibility)
  const { results: legacyRows } = await env.DB.prepare(
    `SELECT r.id, r.subscription_endpoint, r.title, r.body, r.due_at_utc, r.sent, s.p256dh, s.auth
     FROM reminders r
     JOIN subscriptions s ON r.subscription_endpoint = s.endpoint
     WHERE r.sent = 0 AND r.due_at_utc <= ?
     ORDER BY r.due_at_utc ASC
     LIMIT 100`
  )
    .bind(now)
    .all<LegacyDueReminderRow>();

  for (const r of legacyRows || []) {
    dueCount++;
    const payload = JSON.stringify({
      id: r.id,
      title: `⏰ ALARM: ${r.title}`,
      body: r.body || 'Alarm due — Swipe or tap to Turn Off',
      tag: `r-${r.id}`,
      reminderId: r.id,
      isAlarm: true,
      sound: 'radar',
      url: appUrl,
    });
    try {
      await webpush.sendNotification(
        { endpoint: r.subscription_endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
        payload,
        { TTL: 600, urgency: 'high' }
      );
      sentCount++;
      await env.DB.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').bind(r.id).run();
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM subscriptions WHERE endpoint = ?').bind(r.subscription_endpoint),
          env.DB.prepare('DELETE FROM reminders WHERE subscription_endpoint = ?').bind(r.subscription_endpoint),
        ]);
        prunedSubs++;
      } else {
        await env.DB.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').bind(r.id).run();
      }
    }
  }

  // 3. Periodic lightweight hygiene (keep D1 storage fast & lean)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM fired_log WHERE fired_at < ?').bind(now - 3 * 86400000),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM reminders WHERE sent = 1 AND due_at_utc < ?').bind(now - 7 * 86400000),
  ]);

  return {
    ok: true,
    engine: 'cloudflare-worker-d1',
    checkedAt: new Date(now).toISOString(),
    dueCount,
    sentCount,
    prunedSubs,
  };
}

export const checkDueReminders = processDueReminders;

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function handleReminderRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const origin = request.headers.get('Origin') || '';
  const cors = buildCorsHeaders(origin, env.ALLOWED_ORIGINS || '');

  // CORS Preflight
  if (method === 'OPTIONS' && path.startsWith('/api/')) {
    return new Response(null, { status: 204, headers: cors });
  }

  // Privacy Policy (Google Play & Apple App Store compliance)
  if ((path === '/privacy' || path === '/privacy-policy') && method === 'GET') {
    return new Response(PRIVACY_HTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  // Health & Edge Latency Probe
  if ((path === '/api/health' || path === '/api/reminder/health') && method === 'GET') {
    return jsonResponse(
      {
        ok: true,
        engine: 'cloudflare-worker-d1',
        service: 'reminderme Edge API',
        time: Date.now(),
        utc: new Date().toISOString(),
      },
      200,
      cors
    );
  }

  // Public VAPID Key
  if (path === '/api/push/key' && method === 'GET') {
    return jsonResponse({ ok: true, publicKey: env.VAPID_PUBLIC_KEY || '' }, 200, cors);
  }

  // Auth: Sign Up & Sign In
  if ((path === '/api/signup' || path === '/api/login') && method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    if (isRateLimited(ip)) {
      return jsonResponse({ error: 'Too many attempts. Try again in a few minutes.' }, 429, cors);
    }

    const body = await readJsonBody(request);
    const email = str(body.email, 120).trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Enter a valid email address' }, 400, cors);
    }

    let user = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRow>();
    const now = Date.now();
    const tz = validTz(body.tz) ? body.tz : 'UTC';

    if (path === '/api/signup') {
      if (password.length < 6) {
        return jsonResponse({ error: 'Password must be at least 6 characters' }, 400, cors);
      }
      if (user) {
        return jsonResponse({ error: 'An account with this email already exists — sign in instead' }, 409, cors);
      }
      const { salt, hash } = await hashPassword(password);
      const userId = randomHex(8);
      const name = str(body.name, 40).trim() || email.split('@')[0];
      await env.DB.prepare(
        'INSERT INTO users (id, email, name, tz, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(userId, email, name, tz, salt, hash, now)
        .run();

      user = { id: userId, email, name, tz, salt, password_hash: hash, created_at: now };

      if (Array.isArray(body.reminders) && body.reminders.length > 0) {
        await replaceUserReminders(env, userId, tz, body.reminders);
      }
      ctx.waitUntil(recordUserEvent(env, userId, 'signup', {}, now));
    } else {
      if (!user || !(await verifyPassword(password, user.salt, user.password_hash))) {
        return jsonResponse({ error: 'Wrong email or password' }, 401, cors);
      }
      if (validTz(body.tz) && body.tz !== user.tz) {
        await env.DB.prepare('UPDATE users SET tz = ? WHERE id = ?').bind(body.tz, user.id).run();
        user.tz = body.tz;
      }
      ctx.waitUntil(recordUserEvent(env, user.id, 'login', {}, now));
    }

    const token = randomHex(24);
    const expiresAt = now + SESSION_DAYS * 86400000;
    await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(token, user.id, expiresAt, now)
      .run();

    const reminders = await fetchUserReminders(env, user.id);
    return jsonResponse(
      { token, user: await toPublicUser(env, user), reminders },
      200,
      { ...cors, 'Set-Cookie': sessionCookieHeader(request, token, SESSION_DAYS * 86400) }
    );
  }

  // Auth: Sign Out
  if (path === '/api/logout' && method === 'POST') {
    const token = extractToken(request);
    if (token) {
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    }
    return jsonResponse({ ok: true }, 200, { ...cors, 'Set-Cookie': sessionCookieHeader(request, '', 0) });
  }

  // Cron Endpoint
  if (path === '/api/cron/check-reminders' && (method === 'POST' || method === 'GET')) {
    if (env.CRON_SECRET) {
      const authHeader = request.headers.get('Authorization') || '';
      const customHeader = request.headers.get('X-Cron-Secret') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : customHeader || url.searchParams.get('key') || '';
      const user = await getCurrentUser(request, env);
      const isAuthorizedAdmin = user ? await isAdminUser(env, user) : false;
      if (!timingSafeEqualStr(token, env.CRON_SECRET) && !isAuthorizedAdmin) {
        return jsonResponse({ error: 'Unauthorized cron trigger request' }, 401, cors);
      }
    }
    const result = await processDueReminders(env);
    return jsonResponse(result, 200, cors);
  }

  // Current Authenticated User
  const user = await getCurrentUser(request, env);

  if (path === '/api/me' && method === 'GET') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    const [reminders, subCount] = await Promise.all([
      fetchUserReminders(env, user.id),
      env.DB.prepare('SELECT COUNT(*) AS cnt FROM user_push_subs WHERE user_id = ?').bind(user.id).first<{ cnt: number }>(),
    ]);
    return jsonResponse(
      { user: await toPublicUser(env, user), reminders, pushDevices: Number(subCount?.cnt || 0) },
      200,
      cors
    );
  }

  if (path === '/api/me' && method === 'PATCH') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    const body = await readJsonBody(request);
    const nextTz = validTz(body.tz) ? body.tz : user.tz;
    const nextName = str(body.name, 40).trim() || user.name;
    await env.DB.prepare('UPDATE users SET tz = ?, name = ? WHERE id = ?').bind(nextTz, nextName, user.id).run();
    user.tz = nextTz;
    user.name = nextName;
    return jsonResponse({ user: await toPublicUser(env, user) }, 200, cors);
  }

  // Authenticated Reminders CRUD
  if (path === '/api/reminders' && method === 'GET') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    return jsonResponse({ reminders: await fetchUserReminders(env, user.id) }, 200, cors);
  }

  if (path === '/api/reminders' && method === 'PUT') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    const body = await readJsonBody(request);
    if (!Array.isArray(body.reminders)) {
      return jsonResponse({ error: 'reminders must be an array' }, 400, cors);
    }
    const saved = await replaceUserReminders(env, user.id, user.tz, body.reminders);
    return jsonResponse({ reminders: saved }, 200, cors);
  }

  // Mark Done / Snooze
  const actionMatch = path.match(/^\/api\/reminders\/([^/]+)\/(done|snooze)$/);
  if (actionMatch && method === 'POST') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    const reminderId = decodeURIComponent(actionMatch[1]);
    const action = actionMatch[2];
    const row = await env.DB.prepare('SELECT * FROM user_reminders WHERE user_id = ? AND id = ? LIMIT 1')
      .bind(user.id, reminderId)
      .first<UserReminderRow>();
    if (!row) return jsonResponse({ error: 'Reminder not found' }, 404, cors);

    const body = await readJsonBody(request);
    const reminder = rowToReminder(row);
    const now = Date.now();

    if (action === 'done') {
      const isSingleDay = !!reminder.oneTimeDate || (Array.isArray(reminder.days) && reminder.days.length === 1);
      if (isSingleDay) {
        await env.DB.prepare('DELETE FROM user_reminders WHERE user_id = ? AND id = ?').bind(user.id, reminderId).run();
      } else {
        reminder.doneDate = localParts(user.tz, new Date(now)).date;
        reminder.dueAt = computeNextDueAtUtc(reminder.time, reminder.days, user.tz, new Date(now + 12 * 3600000));
        reminder.dueAtUtc = new Date(reminder.dueAt).toISOString();
        reminder.snoozedUntil = null;
        reminder.sent = false;
        await env.DB.prepare(
          'UPDATE user_reminders SET done_date = ?, due_at = ?, snoozed_until = NULL, sent = 0, updated_at = ? WHERE user_id = ? AND id = ?'
        )
          .bind(reminder.doneDate, reminder.dueAt, now, user.id, reminderId)
          .run();
      }
      ctx.waitUntil(
        recordUserEvent(
          env,
          user.id,
          body.source === 'push' || body.source === 'notification-dismiss' ? 'push_done' : 'reminder_done',
          { reminder: reminderId },
          now
        )
      );
    } else {
      const minutes = Math.min(Math.max(Number(body.minutes) || 10, 1), 240);
      const snoozeAt = now + minutes * 60000;
      reminder.snoozedUntil = snoozeAt;
      reminder.dueAt = snoozeAt;
      reminder.dueAtUtc = new Date(snoozeAt).toISOString();
      reminder.sent = false;
      await env.DB.prepare(
        'UPDATE user_reminders SET due_at = ?, snoozed_until = ?, sent = 0, updated_at = ? WHERE user_id = ? AND id = ?'
      )
        .bind(snoozeAt, snoozeAt, now, user.id, reminderId)
        .run();
      ctx.waitUntil(
        recordUserEvent(
          env,
          user.id,
          body.source === 'push' || body.source === 'notification-snooze' ? 'push_snooze' : 'reminder_snooze',
          { reminder: reminderId, minutes },
          now
        )
      );
    }

    return jsonResponse({ reminder }, 200, cors);
  }

  // Events & Analytics
  if (path === '/api/events' && method === 'POST') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    const body = await readJsonBody(request);
    const list = Array.isArray(body.events) ? body.events.slice(0, 100) : [];
    const now = Date.now();
    const stmts: D1PreparedStatement[] = [];
    for (const ev of list) {
      if (ev && typeof ev === 'object' && typeof (ev as { type?: unknown }).type === 'string') {
        const e = ev as { type: string; meta?: Record<string, unknown>; ts?: number };
        stmts.push(
          env.DB.prepare('INSERT INTO events (user_id, type, meta_json, ts) VALUES (?, ?, ?, ?)').bind(
            user.id,
            str(e.type, 40),
            JSON.stringify(e.meta || {}).slice(0, 500),
            Math.min(Number(e.ts) || now, now)
          )
        );
      }
    }
    if (stmts.length > 0) await env.DB.batch(stmts);
    return jsonResponse({ stored: stmts.length }, 200, cors);
  }

  if (path === '/api/analytics' && method === 'GET') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    const [{ results: evRows }, remCount] = await Promise.all([
      env.DB.prepare('SELECT type, ts FROM events WHERE user_id = ? ORDER BY ts DESC LIMIT 2000')
        .bind(user.id)
        .all<AnalyticsEventRow>(),
      env.DB.prepare('SELECT COUNT(*) AS cnt FROM user_reminders WHERE user_id = ?').bind(user.id).first<{ cnt: number }>(),
    ]);
    return jsonResponse(summarizeAnalytics(evRows || [], Number(remCount?.cnt || 0), 1), 200, cors);
  }

  if (path === '/api/admin/analytics' && method === 'GET') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    if (!(await isAdminUser(env, user))) return jsonResponse({ error: 'Admins only' }, 403, cors);

    const [{ results: evRows }, { results: allUsers }, remCnt, subCnt] = await Promise.all([
      env.DB.prepare('SELECT type, ts FROM events ORDER BY ts DESC LIMIT 5000').all<AnalyticsEventRow>(),
      env.DB.prepare('SELECT id, email, name FROM users ORDER BY created_at DESC LIMIT 200').all<{
        id: string;
        email: string;
        name: string;
      }>(),
      env.DB.prepare('SELECT COUNT(*) AS cnt FROM user_reminders').first<{ cnt: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS cnt FROM user_push_subs').first<{ cnt: number }>(),
    ]);

    const summary = summarizeAnalytics(evRows || [], Number(remCnt?.cnt || 0), (allUsers || []).length);
    const perUser = await Promise.all(
      (allUsers || []).map(async (u) => {
        const [rC, dC, eC] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) AS cnt FROM user_reminders WHERE user_id = ?').bind(u.id).first<{ cnt: number }>(),
          env.DB.prepare('SELECT COUNT(*) AS cnt FROM user_push_subs WHERE user_id = ?').bind(u.id).first<{ cnt: number }>(),
          env.DB.prepare('SELECT COUNT(*) AS cnt, MAX(ts) AS last_ts FROM events WHERE user_id = ?')
            .bind(u.id)
            .first<{ cnt: number; last_ts: number | null }>(),
        ]);
        return {
          email: u.email,
          name: u.name,
          reminders: Number(rC?.cnt || 0),
          devices: Number(dC?.cnt || 0),
          events: Number(eC?.cnt || 0),
          lastSeen: Number(eC?.last_ts || 0),
        };
      })
    );

    return jsonResponse({ ...summary, pushDevices: Number(subCnt?.cnt || 0), perUser }, 200, cors);
  }

  // Push Subscriptions (supports BOTH authenticated accounts and legacy anonymous flow)
  if (path === '/api/push/subscribe' && method === 'POST') {
    const body = await readJsonBody(request);
    const sub = (body.subscription || body) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
      return jsonResponse({ error: 'Invalid PushSubscription payload' }, 400, cors);
    }

    const now = Date.now();
    if (user) {
      await env.DB.prepare(
        `INSERT INTO user_push_subs (endpoint, user_id, p256dh, auth, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`
      )
        .bind(sub.endpoint, user.id, String(sub.keys.p256dh), String(sub.keys.auth), now)
        .run();

      if (validTz(body.tz) && body.tz !== user.tz) {
        await env.DB.prepare('UPDATE users SET tz = ? WHERE id = ?').bind(body.tz, user.id).run();
      }
      const cnt = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM user_push_subs WHERE user_id = ?')
        .bind(user.id)
        .first<{ cnt: number }>();
      ctx.waitUntil(recordUserEvent(env, user.id, 'push_subscribed', {}, now));
      return jsonResponse({ ok: true, devices: Number(cnt?.cnt || 1), endpoint: sub.endpoint }, 200, cors);
    }

    // Legacy anonymous subscription fallback
    const subId = `sub_${randomHex(6)}`;
    await env.DB.prepare(
      `INSERT INTO subscriptions (id, endpoint, p256dh, auth, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
    )
      .bind(subId, sub.endpoint, String(sub.keys.p256dh), String(sub.keys.auth), now)
      .run();

    return jsonResponse({ ok: true, devices: 1, message: 'Subscription saved', endpoint: sub.endpoint }, 200, cors);
  }

  if (path === '/api/push/unsubscribe' && method === 'POST') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    const body = await readJsonBody(request);
    if (typeof body.endpoint === 'string') {
      await env.DB.prepare('DELETE FROM user_push_subs WHERE user_id = ? AND endpoint = ?')
        .bind(user.id, body.endpoint)
        .run();
    }
    const cnt = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM user_push_subs WHERE user_id = ?')
      .bind(user.id)
      .first<{ cnt: number }>();
    return jsonResponse({ devices: Number(cnt?.cnt || 0) }, 200, cors);
  }

  if (path === '/api/push/fcm' && method === 'POST') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    const body = await readJsonBody(request);
    const token = str(body.token, 512).trim();
    if (!token || token.length < 16) {
      return jsonResponse({ error: 'Invalid FCM device token' }, 400, cors);
    }
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO fcm_tokens (token, user_id, platform, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform, updated_at = excluded.updated_at`
    )
      .bind(token, user.id, str(body.platform || 'android', 20), now)
      .run();
    const cnt = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM fcm_tokens WHERE user_id = ?')
      .bind(user.id)
      .first<{ cnt: number }>();
    return jsonResponse({ devices: Number(cnt?.cnt || 1) }, 200, cors);
  }

  if (path === '/api/push/test' && method === 'POST') {
    if (!user) return jsonResponse({ error: 'Please sign in' }, 401, cors);
    if (!initWebPush(env)) {
      return jsonResponse({ error: 'VAPID keys not configured in Cloudflare Worker secrets' }, 500, cors);
    }
    const body = await readJsonBody(request);
    const delaySec = Math.min(Math.max(Number(body.delaySec) || 0, 0), 25);
    const payload = {
      title: 'ALARM: reminderme Lock-Screen Test',
      body:
        delaySec > 0
          ? `Delivered ${delaySec}s later via Cloudflare Edge Push.`
          : 'Cloudflare Edge Push notifications are active on this device.',
      tag: `test-${Date.now()}`,
      isAlarm: true,
      sound: 'radar',
      url: env.APP_URL || 'https://reminder.makeuperfect.in',
    };

    if (delaySec > 0) {
      ctx.waitUntil(
        new Promise<void>((resolve) => {
          setTimeout(() => {
            pushToUser(env, user.id, payload)
              .catch(() => {})
              .finally(resolve);
          }, delaySec * 1000);
        })
      );
      return jsonResponse({ scheduled: true, delaySec }, 200, cors);
    }

    const sent = await pushToUser(env, user.id, payload);
    if (sent === 0) {
      return jsonResponse({ error: 'No device is subscribed yet — enable alerts first' }, 400, cors);
    }
    return jsonResponse({ ok: true, sent }, 200, cors);
  }

  // Legacy anonymous POST /api/reminders & DELETE /api/reminders/:id (preserved for compatibility)
  if (path === '/api/reminders' && method === 'POST') {
    const body = await readJsonBody(request);
    const title = str(body.title, 80).trim();
    const subEndpoint = str(body.subscription_endpoint || body.subscriptionEndpoint, 500).trim();
    if (!title || !subEndpoint) {
      return jsonResponse({ error: 'title and subscription_endpoint are required' }, 400, cors);
    }
    const rawDue = body.due_at_utc ?? body.dueAtUtc;
    let dueAtUtc = Date.now() + 60000;
    if (typeof rawDue === 'number' && Number.isFinite(rawDue)) dueAtUtc = Math.round(rawDue);
    else if (typeof rawDue === 'string' && Number.isFinite(new Date(rawDue).getTime())) dueAtUtc = new Date(rawDue).getTime();

    const id = str(body.id || `rem_${randomHex(6)}`, 40);
    const note = str(body.body || body.note, 120);
    await env.DB.prepare(
      `INSERT INTO reminders (id, subscription_endpoint, title, body, due_at_utc, sent, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)
       ON CONFLICT(id) DO UPDATE SET
         subscription_endpoint = excluded.subscription_endpoint,
         title = excluded.title,
         body = excluded.body,
         due_at_utc = excluded.due_at_utc,
         sent = 0`
    )
      .bind(id, subEndpoint, title, note, dueAtUtc, Date.now())
      .run();

    return jsonResponse({ ok: true, reminder: { id, title, body: note, due_at_utc: dueAtUtc } }, 200, cors);
  }

  const delMatch = path.match(/^\/api\/reminders\/([^/]+)$/);
  if (delMatch && method === 'DELETE') {
    const reminderId = decodeURIComponent(delMatch[1]);
    if (user) {
      await env.DB.prepare('DELETE FROM user_reminders WHERE user_id = ? AND id = ?').bind(user.id, reminderId).run();
    } else {
      await env.DB.prepare('DELETE FROM reminders WHERE id = ?').bind(reminderId).run();
    }
    return jsonResponse({ ok: true, deleted: reminderId }, 200, cors);
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const response = await handleReminderRoutes(request, env, ctx);
      if (response) return response;

      const url = new URL(request.url);
      if (url.pathname === '/' && request.method === 'GET') {
        return jsonResponse({
          ok: true,
          engine: 'cloudflare-worker-d1',
          service: 'reminderme Edge API',
          message: 'Serverless Cloudflare Worker backend active',
        });
      }

      return jsonResponse({ error: `Route not found: ${request.method} ${url.pathname}` }, 404);
    } catch (err: unknown) {
      console.error('Worker fetch error:', err);
      return jsonResponse({ error: 'Worker Internal Server Error' }, 500);
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      processDueReminders(env)
        .then((res) => console.log('processDueReminders finished:', JSON.stringify(res)))
        .catch((err) => console.error('processDueReminders error:', err))
    );
  },
};
