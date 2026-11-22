// Glassy Daily server: static PWA + accounts + cloud-synced reminders + usage analytics + real Web Push.
// Run: npm install && npm start   (PORT, DATA_DIR, ADMIN_EMAILS, VAPID_SUBJECT are optional env vars)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const webpush = require('web-push');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC = path.join(__dirname, 'public');
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const SESSION_DAYS = 30;
const TICK_MS = Number(process.env.TICK_MS) || 20000;

/* ---------------- storage ---------------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { users: {}, sessions: {}, reminders: {}, subs: {}, events: [], snoozes: [], fired: {}, vapid: null };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* first run */ }
let saveTimer = null;
function persist(now) {
  const write = () => {
    saveTimer = null;
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  };
  if (now) { clearTimeout(saveTimer); write(); return; }
  if (!saveTimer) saveTimer = setTimeout(write, 300);
}

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  db.vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
} else if (!db.vapid) {
  db.vapid = webpush.generateVAPIDKeys();
  persist(true);
}
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@glassy-daily.app', db.vapid.publicKey, db.vapid.privateKey);

/* ---------------- helpers ---------------- */
const id = (n = 12) => crypto.randomBytes(n).toString('hex');
function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') };
}
function checkPassword(pw, user) {
  const h = crypto.scryptSync(pw, user.salt, 64);
  const stored = Buffer.from(user.hash, 'hex');
  return stored.length === h.length && crypto.timingSafeEqual(stored, h);
}
function validTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; }
}
function localParts(tz, d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: validTz(tz) ? tz : 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}
const isAdmin = u => ADMIN_EMAILS.length ? ADMIN_EMAILS.includes(u.email) : Object.values(db.users).sort((a, b) => a.createdAt - b.createdAt)[0]?.id === u.id;
const publicUser = u => ({ id: u.id, email: u.email, name: u.name, tz: u.tz, createdAt: u.createdAt, admin: isAdmin(u) });

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => { const i = c.indexOf('='); if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); });
  return out;
}
function currentUser(req) {
  const tok = parseCookies(req).gd_session || (req.headers.authorization || '').replace(/^Bearer /, '');
  const s = tok && db.sessions[tok];
  if (!s || s.exp < Date.now()) return null;
  return db.users[s.uid] || null;
}
function sessionCookie(req, token, maxAge) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted ? '; Secure' : '';
  return `gd_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers));
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 1e6) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}
const loginAttempts = new Map();
function rateLimited(key) {
  const now = Date.now(), list = (loginAttempts.get(key) || []).filter(t => now - t < 15 * 60 * 1000);
  list.push(now); loginAttempts.set(key, list);
  return list.length > 20;
}

const str = (v, max) => String(v == null ? '' : v).slice(0, max);
function cleanReminder(r) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ? r.time : '09:00';
  const days = Array.isArray(r.days) ? r.days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : null;
  return {
    id: str(r.id || id(6), 40), title: str(r.title, 60) || 'Reminder', note: str(r.note, 90), time,
    emoji: str(r.emoji, 8) || '🔔', color: /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : '#0a84ff',
    doneDate: typeof r.doneDate === 'string' ? r.doneDate.slice(0, 10) : null,
    days: days && days.length ? days : null,
    createdAt: Number(r.createdAt) || Date.now()
  };
}

function track(uid, type, meta = {}, ts = Date.now()) {
  db.events.push({ uid, type: str(type, 40), meta: JSON.parse(JSON.stringify(meta || {}).slice(0, 500) || '{}'), ts });
  if (db.events.length > 200000) db.events.splice(0, db.events.length - 200000);
}

/* ---------------- analytics ---------------- */
function summarize(events, reminders, usersCount) {
  const byFeature = {}, byDay = {}, hours = Array(24).fill(0);
  for (const e of events) {
    byFeature[e.type] = (byFeature[e.type] || 0) + 1;
    const day = new Date(e.ts).toISOString().slice(0, 10);
    byDay[day] = byDay[day] || { events: 0, done: 0 };
    byDay[day].events++;
    if (e.type === 'reminder_done' || e.type === 'push_done' || e.type === 'banner_done') byDay[day].done++;
    hours[new Date(e.ts).getUTCHours()]++;
  }
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    last7.push({ day: d, events: byDay[d]?.events || 0, done: byDay[d]?.done || 0 });
  }
  return {
    totalEvents: events.length, users: usersCount, reminders: reminders.length,
    features: Object.entries(byFeature).sort((a, b) => b[1] - a[1]).map(([feature, count]) => ({ feature, count })),
    last7, hoursUtc: hours
  };
}

/* ---------------- push scheduler ---------------- */
async function pushTo(uid, payload) {
  const subs = db.subs[uid] || [];
  let sent = 0;
  await Promise.all(subs.map(async s => {
    try { await webpush.sendNotification(s, JSON.stringify(payload), { TTL: 600, urgency: 'high' }); sent++; }
    catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) { db.subs[uid] = (db.subs[uid] || []).filter(x => x.endpoint !== s.endpoint); persist(); }
      else console.error('push error', err.statusCode || '', err.body || err.message);
    }
  }));
  return sent;
}
function reminderPayload(r) {
  const isAlarm = r.isAlarm !== false;
  return {
    title: isAlarm ? `⏰ ALARM: ${r.title}` : `${r.emoji || '🔔'} ${r.title}`,
    body: r.note || (isAlarm ? `Alarm ringing for ${r.time} — Swipe / tap to Turn Off` : `It's ${r.time} — time for this.`),
    tag: 'r-' + r.id,
    reminderId: r.id,
    isAlarm: isAlarm,
    sound: r.sound || 'radar',
    url: '/'
  };
}
async function tick() {
  const now = Date.now();
  const due = [];
  for (const uid of Object.keys(db.subs)) {
    if (!(db.subs[uid] || []).length || !db.users[uid]) continue;
    const { date, time } = localParts(db.users[uid].tz);
    const dow = new Date(date + 'T12:00:00Z').getUTCDay();
    for (const r of db.reminders[uid] || []) {
      if (r.doneDate === date || r.time !== time) continue;
      if (r.days && !r.days.includes(dow)) continue;
      const key = `${uid}:${r.id}:${date}`;
      if (db.fired[key]) continue;
      db.fired[key] = now; due.push([uid, r]);
    }
  }
  for (const sn of db.snoozes.filter(s => s.at <= now)) {
    const r = (db.reminders[sn.uid] || []).find(x => x.id === sn.rid);
    if (r) due.push([sn.uid, r]);
  }
  db.snoozes = db.snoozes.filter(s => s.at > now);
  for (const k of Object.keys(db.fired)) if (now - db.fired[k] > 3 * 864e5) delete db.fired[k];
  if (due.length) persist();
  for (const [uid, r] of due) {
    const n = await pushTo(uid, reminderPayload(r));
    track(uid, 'push_sent', { reminder: r.id, devices: n });
  }
}
setInterval(() => tick().catch(e => console.error('tick', e)), TICK_MS).unref();

/* ---------------- static files ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon' };
function serveStatic(req, res, pathname) {
  let p = decodeURIComponent(pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) {
      if (!path.extname(p)) return serveStatic(req, res, '/');      // SPA fallback
      return send(res, 404, { error: 'not found' });
    }
    const ext = path.extname(file);
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' };
    headers['Cache-Control'] = (ext === '.html' || p === '/sw.js' || ext === '.webmanifest') ? 'no-cache' : 'public, max-age=86400';
    if (p === '/sw.js') headers['Service-Worker-Allowed'] = '/';
    res.writeHead(200, headers); res.end(data);
  });
}

/* ---------------- API ---------------- */
async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  const user = currentUser(req);
  const needUser = () => { if (!user) { send(res, 401, { error: 'Please sign in' }); return false; } return true; };

  if (route === 'GET /api/health') return send(res, 200, { ok: true, time: Date.now() });

  if (route === 'POST /api/signup' || route === 'POST /api/login') {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (rateLimited(ip)) return send(res, 429, { error: 'Too many attempts. Try again in a few minutes.' });
    const b = await readBody(req);
    const email = str(b.email, 120).trim().toLowerCase(), password = String(b.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: 'Enter a valid email address' });
    let u = Object.values(db.users).find(x => x.email === email);
    if (route === 'POST /api/signup') {
      if (password.length < 6) return send(res, 400, { error: 'Password must be at least 6 characters' });
      if (u) return send(res, 409, { error: 'An account with this email already exists — sign in instead' });
      u = Object.assign({ id: id(8), email, name: str(b.name, 40).trim() || email.split('@')[0], tz: validTz(b.tz) ? b.tz : 'UTC', createdAt: Date.now() }, hashPassword(password));
      db.users[u.id] = u;
      db.reminders[u.id] = Array.isArray(b.reminders) ? b.reminders.slice(0, 100).map(cleanReminder) : [];
      track(u.id, 'signup');
    } else {
      if (!u || !checkPassword(password, u)) return send(res, 401, { error: 'Wrong email or password' });
      if (validTz(b.tz)) u.tz = b.tz;
      track(u.id, 'login');
    }
    const token = id(24);
    db.sessions[token] = { uid: u.id, exp: Date.now() + SESSION_DAYS * 864e5 };
    persist();
    return send(res, 200, { user: publicUser(u), reminders: db.reminders[u.id] || [] }, { 'Set-Cookie': sessionCookie(req, token, SESSION_DAYS * 86400) });
  }

  if (route === 'POST /api/logout') {
    const tok = parseCookies(req).gd_session;
    if (tok) delete db.sessions[tok];
    if (user) track(user.id, 'logout');
    persist();
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  }

  if (route === 'GET /api/me') {
    if (!needUser()) return;
    return send(res, 200, { user: publicUser(user), reminders: db.reminders[user.id] || [], pushDevices: (db.subs[user.id] || []).length });
  }

  if (route === 'PATCH /api/me') {
    if (!needUser()) return;
    const b = await readBody(req);
    if (b.tz && validTz(b.tz)) user.tz = b.tz;
    if (b.name) user.name = str(b.name, 40).trim() || user.name;
    persist();
    return send(res, 200, { user: publicUser(user) });
  }

  if (route === 'GET /api/reminders') {
    if (!needUser()) return;
    return send(res, 200, { reminders: db.reminders[user.id] || [] });
  }

  if (route === 'PUT /api/reminders') {
    if (!needUser()) return;
    const b = await readBody(req);
    if (!Array.isArray(b.reminders)) return send(res, 400, { error: 'reminders must be an array' });
    db.reminders[user.id] = b.reminders.slice(0, 100).map(cleanReminder);
    persist();
    return send(res, 200, { reminders: db.reminders[user.id] });
  }

  let m;
  if (req.method === 'POST' && (m = url.pathname.match(/^\/api\/reminders\/([^/]+)\/(done|snooze)$/))) {
    if (!needUser()) return;
    const r = (db.reminders[user.id] || []).find(x => x.id === m[1]);
    if (!r) return send(res, 404, { error: 'Reminder not found' });
    const b = await readBody(req).catch(() => ({}));
    if (m[2] === 'done') {
      const isSingleDay = Array.isArray(r.days) && r.days.length === 1;
      if (isSingleDay) {
        db.reminders[user.id] = (db.reminders[user.id] || []).filter(x => x.id !== r.id);
      } else {
        r.doneDate = localParts(user.tz).date;
      }
      db.snoozes = db.snoozes.filter(s => !(s.uid === user.id && s.rid === r.id));
      track(user.id, b.source === 'push' ? 'push_done' : 'reminder_done', { reminder: r.id });
    } else {
      const minutes = Math.min(Math.max(Number(b.minutes) || 10, 1), 240);
      db.snoozes = db.snoozes.filter(s => !(s.uid === user.id && s.rid === r.id));
      db.snoozes.push({ uid: user.id, rid: r.id, at: Date.now() + minutes * 60000 });
      track(user.id, b.source === 'push' ? 'push_snooze' : 'reminder_snooze', { reminder: r.id, minutes });
    }
    persist();
    return send(res, 200, { reminder: r });
  }

  if (route === 'POST /api/events') {
    if (!needUser()) return;
    const b = await readBody(req);
    const list = Array.isArray(b.events) ? b.events.slice(0, 200) : [];
    for (const e of list) if (e && e.type) track(user.id, e.type, e.meta, Math.min(Number(e.ts) || Date.now(), Date.now()));
    persist();
    return send(res, 200, { stored: list.length });
  }

  if (route === 'GET /api/analytics') {
    if (!needUser()) return;
    const ev = db.events.filter(e => e.uid === user.id);
    return send(res, 200, summarize(ev, db.reminders[user.id] || [], 1));
  }

  if (route === 'GET /api/admin/analytics') {
    if (!needUser()) return;
    if (!isAdmin(user)) return send(res, 403, { error: 'Admins only' });
    const s = summarize(db.events, Object.values(db.reminders).flat(), Object.keys(db.users).length);
    s.pushDevices = Object.values(db.subs).reduce((n, l) => n + l.length, 0);
    s.perUser = Object.values(db.users).map(u => ({
      email: u.email, name: u.name, reminders: (db.reminders[u.id] || []).length, devices: (db.subs[u.id] || []).length,
      events: db.events.filter(e => e.uid === u.id).length,
      lastSeen: Math.max(0, ...db.events.filter(e => e.uid === u.id).map(e => e.ts))
    }));
    return send(res, 200, s);
  }

  if (route === 'GET /api/push/key') return send(res, 200, { publicKey: db.vapid.publicKey });

  if (route === 'POST /api/push/subscribe') {
    if (!needUser()) return;
    const b = await readBody(req);
    const sub = b.subscription;
    if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return send(res, 400, { error: 'Invalid push subscription' });
    }
    const clean = { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } };
    db.subs[user.id] = (db.subs[user.id] || []).filter(s => s.endpoint !== clean.endpoint).concat(clean).slice(-10);
    if (b.tz && validTz(b.tz)) user.tz = b.tz;
    track(user.id, 'push_subscribed', { ua: str(req.headers['user-agent'], 120) });
    persist();
    return send(res, 200, { devices: db.subs[user.id].length });
  }

  if (route === 'POST /api/push/unsubscribe') {
    if (!needUser()) return;
    const b = await readBody(req);
    db.subs[user.id] = (db.subs[user.id] || []).filter(s => s.endpoint !== b.endpoint);
    persist();
    return send(res, 200, { devices: db.subs[user.id].length });
  }

  if (route === 'POST /api/push/test') {
    if (!needUser()) return;
    if (!(db.subs[user.id] || []).length) return send(res, 400, { error: 'No phone is subscribed yet — tap Enable alerts on your phone first' });
    const n = await pushTo(user.id, { title: '🔔 Glassy Daily', body: 'Real push notifications are working on this device.', tag: 'test', url: '/' });
    track(user.id, 'push_test', { devices: n });
    return send(res, 200, { sent: n });
  }

  return send(res, 404, { error: 'Unknown API route' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method not allowed' });
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    const status = /bad json|too large/.test(e.message) ? 400 : 500;
    if (status === 500) console.error(e);
    send(res, status, { error: status === 400 ? 'Bad request' : 'Server error' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Glassy Daily running on http://localhost:${PORT}`));
  const shutdown = () => { persist(true); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
module.exports = { server, tick, db, localParts };
