/* reminderme service worker: offline shell + real push notifications with actions. */
const CACHE = 'reminderme-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/badge-96.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // network first so updates show immediately, cache as offline fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { title: 'reminderme', body: e.data ? e.data.text() : '' }; }
  const title = data.title || 'reminderme';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || 'reminderme',
    renotify: true,
    requireInteraction: !!data.reminderId,
    vibrate: [30, 60, 30],
    timestamp: Date.now(),
    data: { url: data.url || '/', reminderId: data.reminderId || null },
    actions: data.reminderId ? [{ action: 'done', title: '✓ Mark done' }, { action: 'snooze', title: 'Snooze 10 min' }] : []
  };
  e.waitUntil(
    self.registration.showNotification(title, options).then(() =>
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list.forEach(c => c.postMessage({ type: 'push', data })))
    )
  );
});

self.addEventListener('notificationclick', e => {
  const n = e.notification;
  const rid = n.data && n.data.reminderId;
  n.close();
  const act = e.action;
  if (rid && (act === 'done' || act === 'snooze')) {
    e.waitUntil(
      fetch(`/api/reminders/${encodeURIComponent(rid)}/${act}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'push', minutes: 10 })
      }).then(() => self.clients.matchAll({ type: 'window' }).then(list => list.forEach(c => c.postMessage({ type: 'refresh' })))).catch(() => {})
    );
    return;
  }
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow((n.data && n.data.url) || '/');
    })
  );
});
