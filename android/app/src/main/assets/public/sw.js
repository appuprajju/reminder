/* reminderme Service Worker v8: offline shell + high-urgency Web Push + lock-screen snooze/dismiss actions */
const CACHE = 'reminderme-v8';
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

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
  );
});

self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type === 'alarm-firing' && data.reminder) {
    const r = data.reminder;
    const title = r.isAlarm ? `ALARM: ${r.title || 'Reminder'}` : (r.title || 'Reminder');
    const options = {
      body: r.note || `Scheduled for ${r.time} — tap Snooze or Dismiss`,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: 'r-' + r.id,
      requireInteraction: true,
      renotify: true,
      vibrate: [400, 200, 400, 200, 800],
      timestamp: Date.now(),
      data: { url: `/?ring=${encodeURIComponent(r.id)}`, reminderId: r.id },
      actions: [
        { action: 'snooze', title: 'Snooze 5 min' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
    e.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { title: 'reminderme', body: e.data ? e.data.text() : '' };
  }

  const id = data.id || data.reminderId;
  const title = data.title || 'reminderme';
  const body = data.body || 'You have a scheduled reminder.';
  const targetUrl = data.url || (id ? `/?ring=${encodeURIComponent(id)}` : '/');
  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || (id ? 'r-' + id : 'reminderme'),
    renotify: true,
    requireInteraction: true,
    vibrate: data.isAlarm !== false ? [400, 180, 400, 180, 700] : [200, 100, 200],
    timestamp: Date.now(),
    data: { id, reminderId: id, url: targetUrl },
    actions: [
      { action: 'snooze', title: 'Snooze 5 min' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(title, options).then(() =>
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) =>
        list.forEach((c) => c.postMessage({ type: 'push', data }))
      )
    )
  );
});

self.addEventListener('notificationclick', (e) => {
  const n = e.notification;
  const rid = n.data && (n.data.id || n.data.reminderId);
  n.close();
  const act = e.action;

  if (act === 'dismiss' || act === 'done') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((list) => list.forEach((c) => c.postMessage({ type: 'alarm-dismissed', reminderId: rid })))
        .then(() => {
          if (rid) {
            return fetch(`/api/reminders/${encodeURIComponent(rid)}/done`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'reminderme-sw' },
              body: JSON.stringify({ source: 'notification-dismiss' })
            }).catch(() => {});
          }
        })
    );
    return;
  }

  if (act === 'snooze') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((list) => list.forEach((c) => c.postMessage({ type: 'alarm-snoozed', reminderId: rid, minutes: 5 })))
        .then(() => {
          if (rid) {
            return fetch(`/api/reminders/${encodeURIComponent(rid)}/snooze`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'reminderme-sw' },
              body: JSON.stringify({ source: 'notification-snooze', minutes: 5 })
            }).catch(() => {});
          }
        })
    );
    return;
  }

  const openUrl = (n.data && n.data.url) || (rid ? `/?ring=${encodeURIComponent(rid)}` : '/');
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.postMessage({ type: 'notification-opened', reminderId: rid });
          return c.focus();
        }
      }
      return self.clients.openWindow(openUrl);
    })
  );
});
