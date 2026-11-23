/**
 * Cloudflare Worker Backend for api.makeuperfect.in & reminderme
 *
 * Implements:
 * 1. Non-destructive routing: Handles /api/push/*, /api/reminders*, and /api/cron/check-reminders
 *    without interfering with any existing routes or handlers.
 * 2. Cloudflare D1 storage for PushSubscriptions and scheduled UTC reminders.
 * 3. 1-minute Cron Trigger (scheduled) and manual POST /api/cron/check-reminders.
 * 4. High-urgency lock-screen Web Push delivery via web-push (nodejs_compat).
 * 5. Automatic pruning of 410 Gone / 404 Not Found subscriptions.
 */

import webpush from 'web-push';

export interface Env {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT?: string;
  CRON_SECRET?: string;
  [key: string]: any; // Allow other existing environment bindings/variables
}

export interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: number;
}

export interface DueReminderRow {
  id: string;
  subscription_endpoint: string;
  title: string;
  body: string | null;
  due_at_utc: number;
  sent: number;
  p256dh: string;
  auth: string;
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const isAllowedOrigin = (
    origin === 'https://reminder.makeuperfect.in' ||
    origin.endsWith('.makeuperfect.in') ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://reminder.makeuperfect.in',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(data: unknown, status = 200, corsHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
    },
  });
}

function generateId(prefix = 'id'): string {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Shared reminder processor called by BOTH the scheduled() Cron Trigger
 * and the HTTP endpoint: POST /api/cron/check-reminders.
 */
export async function processDueReminders(env: Env) {
  const now = Date.now();
  let sentCount = 0;
  let prunedSubs = 0;

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.error('processDueReminders: Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY in Worker environment');
    return { ok: false, error: 'Missing VAPID configuration', checkedAt: new Date(now).toISOString() };
  }

  // Initialize VAPID details for web-push
  webpush.setVapidDetails(
    env.VAPID_SUBJECT || 'mailto:admin@reminderme.app',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  // 1. Query unsent reminders where due_at_utc <= now
  const query = `
    SELECT r.id, r.subscription_endpoint, r.title, r.body, r.due_at_utc, r.sent,
           s.p256dh, s.auth
    FROM reminders r
    JOIN subscriptions s ON r.subscription_endpoint = s.endpoint
    WHERE r.sent = 0 AND r.due_at_utc <= ?
    ORDER BY r.due_at_utc ASC
    LIMIT 100
  `;

  const { results } = await env.DB.prepare(query).bind(now).all<DueReminderRow>();
  const dueList = results || [];

  for (const r of dueList) {
    const isAlarm = true; // High-priority alarm notification
    const payload = JSON.stringify({
      id: r.id,
      title: `⏰ ALARM: ${r.title}`,
      body: r.body || `Alarm due — Swipe or tap to Turn Off`,
      tag: 'r-' + r.id,
      reminderId: r.id,
      isAlarm: isAlarm,
      sound: 'radar',
      url: 'https://reminder.makeuperfect.in',
    });

    const pushSubscription = {
      endpoint: r.subscription_endpoint,
      keys: {
        p256dh: r.p256dh,
        auth: r.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, payload, {
        TTL: 600,
        urgency: 'high',
      });
      sentCount++;

      // Mark reminder as sent = 1
      await env.DB.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').bind(r.id).run();
    } catch (err: any) {
      console.error(`Failed push to ${r.subscription_endpoint}:`, err.statusCode || err.message);

      // Auto-prune dead/expired subscriptions (404 Not Found or 410 Gone)
      if (err.statusCode === 404 || err.statusCode === 410) {
        await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint = ?').bind(r.subscription_endpoint).run();
        await env.DB.prepare('DELETE FROM reminders WHERE subscription_endpoint = ?').bind(r.subscription_endpoint).run();
        prunedSubs++;
      } else {
        // Mark as sent after failure so failing endpoints don't loop endlessly every minute
        await env.DB.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').bind(r.id).run();
      }
    }
  }

  // Cleanup old sent reminders older than 7 days to keep D1 storage lean
  const sevenDaysAgo = now - 7 * 86400000;
  await env.DB.prepare('DELETE FROM reminders WHERE sent = 1 AND due_at_utc < ?').bind(sevenDaysAgo).run();

  return {
    ok: true,
    checkedAt: new Date(now).toISOString(),
    dueCount: dueList.length,
    sentCount,
    prunedSubs,
  };
}

// Backward-compatibility alias
export const checkDueReminders = processDueReminders;

/**
 * Non-destructive reminder route dispatcher.
 * Returns Response if the request matches a reminder route, or null to allow
 * existing routes in the worker to handle the request.
 */
export async function handleReminderRoutes(request: Request, env: Env, ctx: ExecutionContext): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const cors = getCorsHeaders(request);

  // Handle CORS preflight for reminder routes
  if (method === 'OPTIONS' && (path.startsWith('/api/push') || path.startsWith('/api/reminders') || path.startsWith('/api/cron'))) {
    return new Response(null, { status: 204, headers: cors });
  }

  // ----------------------------------------------------
  // GET /api/health (Reminder status)
  // ----------------------------------------------------
  if ((path === '/api/health' || path === '/api/reminder/health') && method === 'GET') {
    return jsonResponse({
      ok: true,
      service: 'api.makeuperfect.in reminder-backend',
      time: Date.now(),
      utc: new Date().toISOString(),
    }, 200, cors);
  }

  // ----------------------------------------------------
  // GET /api/push/key - Public VAPID key
  // ----------------------------------------------------
  if (path === '/api/push/key' && method === 'GET') {
    return jsonResponse({
      ok: true,
      publicKey: env.VAPID_PUBLIC_KEY || '',
    }, 200, cors);
  }

  // ----------------------------------------------------
  // POST /api/push/subscribe - Upsert browser PushSubscription into D1
  // ----------------------------------------------------
  if (path === '/api/push/subscribe' && method === 'POST') {
    const body: any = await request.json().catch(() => ({}));
    const sub = body.subscription || body;

    if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
      return jsonResponse({ error: 'Invalid PushSubscription payload' }, 400, cors);
    }

    const id = generateId('sub');
    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO subscriptions (id, endpoint, p256dh, auth, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth
    `).bind(id, sub.endpoint, String(sub.keys.p256dh), String(sub.keys.auth), now).run();

    return jsonResponse({ ok: true, message: 'Subscription saved', endpoint: sub.endpoint }, 200, cors);
  }

  // ----------------------------------------------------
  // POST /api/push/test - Immediate test alarm delivery
  // ----------------------------------------------------
  if (path === '/api/push/test' && method === 'POST') {
    const body: any = await request.json().catch(() => ({}));
    let targetSub: SubscriptionRow | null = null;

    if (body.endpoint) {
      targetSub = await env.DB.prepare('SELECT * FROM subscriptions WHERE endpoint = ?').bind(body.endpoint).first<SubscriptionRow>();
    } else {
      targetSub = await env.DB.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1').first<SubscriptionRow>();
    }

    if (!targetSub) {
      return jsonResponse({ error: 'No subscribed device found. Tap Enable Lock-Screen Alarms first.' }, 400, cors);
    }

    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      return jsonResponse({ error: 'VAPID keys not configured in Worker' }, 500, cors);
    }

    webpush.setVapidDetails(
      env.VAPID_SUBJECT || 'mailto:admin@reminderme.app',
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );

    const testPayload = JSON.stringify({
      title: '⏰ ALARM TEST: reminderme',
      body: 'Lock-screen alerts are functioning properly on this device!',
      tag: 'test-' + Date.now(),
      isAlarm: true,
      sound: 'radar',
      url: '/',
    });

    await webpush.sendNotification({
      endpoint: targetSub.endpoint,
      keys: {
        p256dh: targetSub.p256dh,
        auth: targetSub.auth,
      },
    }, testPayload, { TTL: 60, urgency: 'high' });

    return jsonResponse({ ok: true, message: 'Test alarm delivered', sent: 1 }, 200, cors);
  }

  // ----------------------------------------------------
  // POST /api/reminders - Save / Upsert scheduled reminder in D1
  // ----------------------------------------------------
  if (path === '/api/reminders' && method === 'POST') {
    const body: any = await request.json().catch(() => ({}));
    const title = String(body.title || '').trim().slice(0, 80);
    const subEndpoint = String(body.subscription_endpoint || body.subscriptionEndpoint || '').trim();

    if (!title) {
      return jsonResponse({ error: 'Reminder title is required' }, 400, cors);
    }

    if (!subEndpoint) {
      return jsonResponse({ error: 'subscription_endpoint or subscriptionEndpoint is required to schedule background alarms' }, 400, cors);
    }

    // Convert due_at_utc to integer epoch milliseconds
    const rawDue = body.due_at_utc ?? body.dueAtUtc;
    let dueAtUtc = Date.now() + 60000;
    if (typeof rawDue === 'number' && Number.isFinite(rawDue)) {
      dueAtUtc = Math.round(rawDue);
    } else if (typeof rawDue === 'string') {
      const parsed = new Date(rawDue).getTime();
      if (Number.isFinite(parsed)) dueAtUtc = parsed;
    }

    const id = String(body.id || generateId('rem')).slice(0, 40);
    const note = String(body.body || body.note || '').slice(0, 120);
    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO reminders (id, subscription_endpoint, title, body, due_at_utc, sent, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
      ON CONFLICT(id) DO UPDATE SET
        subscription_endpoint = excluded.subscription_endpoint,
        title = excluded.title,
        body = excluded.body,
        due_at_utc = excluded.due_at_utc,
        sent = 0
    `).bind(id, subEndpoint, title, note, dueAtUtc, now).run();

    return jsonResponse({
      ok: true,
      reminder: {
        id,
        subscription_endpoint: subEndpoint,
        title,
        body: note,
        due_at_utc: dueAtUtc,
        due_at_iso: new Date(dueAtUtc).toISOString(),
        sent: 0,
      },
    }, 200, cors);
  }

  // ----------------------------------------------------
  // DELETE /api/reminders/:id - Cancel / Delete reminder from D1
  // ----------------------------------------------------
  const delMatch = path.match(/^\/api\/reminders\/([^/]+)$/);
  if (delMatch && method === 'DELETE') {
    const reminderId = decodeURIComponent(delMatch[1]);
    await env.DB.prepare('DELETE FROM reminders WHERE id = ?').bind(reminderId).run();
    return jsonResponse({ ok: true, deleted: reminderId }, 200, cors);
  }

  // ----------------------------------------------------
  // POST/GET /api/cron/check-reminders - Protected Cron Endpoint
  // ----------------------------------------------------
  if (path === '/api/cron/check-reminders' && (method === 'POST' || method === 'GET')) {
    if (env.CRON_SECRET) {
      const authHeader = request.headers.get('Authorization') || '';
      const customHeader = request.headers.get('X-Cron-Secret') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (customHeader || url.searchParams.get('key'));
      if (token !== env.CRON_SECRET) {
        return jsonResponse({ error: 'Unauthorized cron trigger request' }, 401, cors);
      }
    }

    const result = await processDueReminders(env);
    return jsonResponse(result, 200, cors);
  }

  // Not a reminder route: return null so existing routes can handle it
  return null;
}

export default {
  /**
   * Main fetch handler - Non-destructive routing:
   * 1. Checks reminder routes first.
   * 2. If not matched, passes through to existing handlers or returns 404.
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // 1. Check reminder Web Push routes
      const reminderResponse = await handleReminderRoutes(request, env, ctx);
      if (reminderResponse) {
        return reminderResponse;
      }

      // 2. Existing routes handler (Preserved without modification)
      // If your worker has existing logic or proxies, put it here:
      const url = new URL(request.url);
      if (url.pathname === '/' && request.method === 'GET') {
        return jsonResponse({
          ok: true,
          service: 'api.makeuperfect.in',
          message: 'Cloudflare Worker API gateway active',
        });
      }

      return jsonResponse({ error: `Route not found: ${request.method} ${url.pathname}` }, 404);
    } catch (err: any) {
      console.error('Worker fetch error:', err);
      return jsonResponse({ error: err.message || 'Worker Internal Server Error' }, 500);
    }
  },

  /**
   * 1-Minute Cron Trigger:
   * Runs processDueReminders(env) every minute without blocking.
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      processDueReminders(env)
        .then(res => console.log('processDueReminders finished:', JSON.stringify(res)))
        .catch(err => console.error('processDueReminders error:', err))
    );
  },
};
