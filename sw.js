/* reminderme service worker: offline shell + push + lock-screen alarms with actions. */
const CACHE = 'reminderme-v5';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/badge-96.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // network first so updates show immediately, cache as offline fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});

/* Message handler from client window (e.g. alarm firing on locked/background screen) */
self.addEventListener('message', e => {
  const data = e.data || {};
  if (data.type === 'alarm-firing' && data.reminder) {
    const r = data.reminder;
    const title = `⏰ ALARM: ${r.title || 'Reminder'}`;
    const options = {
      body: r.note || `Alarm ringing for ${r.time} — Slide or tap to Turn Off`,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: 'reminderme-alarm',
      requireInteraction: true,
      renotify: true,
      vibrate: [400, 200, 400, 200, 800, 300, 800],
      timestamp: Date.now(),
      data: { url: '/', reminderId: r.id },
      actions: [
        { action: 'snooze', title: '😴 Snooze 5 min' },
        { action: 'dismiss', title: '🛑 Dismiss' }
      ]
    };
    e.waitUntil(self.registration.showNotification(title, options));
  }
});

/* Real Web Push event listener from backend push scheduler */
self.addEventListener('push', e => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch (err) {
    data = { title: 'reminderme', body: e.data ? e.data.text() : '' };
  }

  const title = data.title || 'reminderme';
  const isAlarm = !!data.isAlarm || (data.title && data.title.includes('ALARM'));
  const options = {
    body: data.body || 'You have a scheduled reminder.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || (isAlarm ? 'reminderme-alarm' : 'reminderme'),
    renotify: true,
    requireInteraction: true,
    vibrate: isAlarm ? [400, 200, 400, 200, 800, 300, 800] : [300, 100, 300, 100, 600],
    timestamp: Date.now(),
    data: { url: data.url || '/', reminderId: data.reminderId || null },
    actions: [
      { action: 'snooze', title: '😴 Snooze 5 min' },
      { action: 'dismiss', title: '🛑 Dismiss' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(title, options).then(() =>
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list =>
        list.forEach(c => c.postMessage({ type: 'push', data }))
      )
    )
  );
});

/* Notification action handler (snooze, dismiss, or open app) */
const WORKER_BASE = location.hostname === 'reminder.makeuperfect.in' || location.hostname.endsWith('makeuperfect.in')
  ? 'https://api.makeuperfect.in'
  : '';

self.addEventListener('notificationclick', e => {
  const n = e.notification;
  const rid = n.data && n.data.reminderId;
  n.close();
  const act = e.action;

  if (act === 'dismiss' || act === 'done') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        list.forEach(c => c.postMessage({ type: 'alarm-dismissed', reminderId: rid }));
      }).then(() => {
        if (rid) {
          if (WORKER_BASE) {
            fetch(`${WORKER_BASE}/api/reminders/${encodeURIComponent(rid)}`, { method: 'DELETE', mode: 'cors' }).catch(() => {});
          }
          return fetch(`/api/reminders/${encodeURIComponent(rid)}/done`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'notification-dismiss' })
          }).catch(() => {});
        }
      })
    );
    return;
  }

  if (act === 'snooze') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        list.forEach(c => c.postMessage({ type: 'alarm-snoozed', reminderId: rid, minutes: 5 }));
      }).then(() => {
        if (rid) {
          if (WORKER_BASE) {
            fetch(`${WORKER_BASE}/api/reminders`, {
              method: 'POST',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: rid,
                due_at_utc: Date.now() + 5 * 60000
              })
            }).catch(() => {});
          }
          return fetch(`/api/reminders/${encodeURIComponent(rid)}/snooze`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'notification-snooze', minutes: 5 })
          }).catch(() => {});
        }
      })
    );
    return;
  }

  // Default click on notification body: focus open window or open app
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow((n.data && n.data.url) || '/');
    })
  );
});
