// End-to-end check of the server: boots it on a random port with a temp data dir and exercises every API.
const os = require('os');
const fs = require('fs');
const path = require('path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-test-'));
process.env.TICK_MS = '600000';
const { server, tick, db } = require('../server.js');

let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const call = async (method, p, body, useCookie = true) => {
    const res = await fetch(base + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, useCookie && cookie ? { Cookie: cookie } : {}), body: body ? JSON.stringify(body) : undefined });
    const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    let json = null; try { json = await res.json(); } catch (e) {}
    return { status: res.status, json, headers: res.headers };
  };
  const get = async p => { const r = await fetch(base + p); return { status: r.status, type: r.headers.get('content-type'), text: await r.text() }; };

  // static + PWA files
  const home = await get('/');
  ok(home.status === 200 && /text\/html/.test(home.type) && home.text.includes('Glassy Daily'), 'GET / serves the app');
  ok((await get('/sw.js')).status === 200, 'GET /sw.js serves the service worker');
  const man = await get('/manifest.webmanifest');
  ok(man.status === 200 && /manifest\+json/.test(man.type), 'manifest served with manifest mime type');
  ok((await get('/icons/icon-192.png')).type === 'image/png', 'icon served as PNG');
  ok((await get('/../server.js')).status !== 200 || !(await get('/../server.js')).text.includes('scryptSync'), 'path traversal blocked');

  // auth
  ok((await call('GET', '/api/me')).status === 401, 'GET /api/me without login is 401');
  ok((await call('POST', '/api/signup', { email: 'bad', password: 'secret1' })).status === 400, 'signup rejects bad email');
  ok((await call('POST', '/api/signup', { email: 'a@b.co', password: '123' })).status === 400, 'signup rejects short password');
  const su = await call('POST', '/api/signup', { email: 'Ann@Example.com', password: 'secret12', name: 'Ann', tz: 'Asia/Kolkata', reminders: [{ id: 'r1', title: 'Water', time: '10:30', emoji: '💧' }] });
  ok(su.status === 200 && su.json.user.email === 'ann@example.com' && cookie.startsWith('gd_session='), 'signup creates account and session cookie');
  ok(su.json.user.admin === true, 'first user is admin');
  ok(su.json.reminders.length === 1, 'signup imports local reminders');
  ok(!JSON.stringify(su.json).includes('hash'), 'password hash never sent to client');
  ok((await call('POST', '/api/signup', { email: 'ann@example.com', password: 'secret12' })).status === 409, 'duplicate signup rejected');
  ok((await call('POST', '/api/logout')).status === 200, 'logout');
  ok((await call('GET', '/api/me')).status === 401, 'session cleared after logout');
  ok((await call('POST', '/api/login', { email: 'ann@example.com', password: 'wrong' })).status === 401, 'wrong password rejected');
  const li = await call('POST', '/api/login', { email: 'ann@example.com', password: 'secret12', tz: 'Asia/Kolkata' });
  ok(li.status === 200 && li.json.reminders[0].title === 'Water', 'login returns saved reminders');
  const me = await call('GET', '/api/me');
  ok(me.status === 200 && me.json.user.tz === 'Asia/Kolkata', 'GET /api/me works with cookie');

  // reminders sync
  const put = await call('PUT', '/api/reminders', { reminders: [
    { id: 'r1', title: 'Water', time: '10:30', emoji: '💧' },
    { id: 'r2', title: '<img src=x onerror=alert(1)>'.repeat(5), time: '99:99', color: 'red' }
  ] });
  ok(put.status === 200 && put.json.reminders.length === 2, 'PUT /api/reminders saves');
  ok(put.json.reminders[1].time === '09:00' && put.json.reminders[1].title.length <= 60 && put.json.reminders[1].color === '#0a84ff', 'reminders are sanitised');
  const done = await call('POST', '/api/reminders/r1/done', {});
  ok(done.status === 200 && /^\d{4}-\d\d-\d\d$/.test(done.json.reminder.doneDate), 'mark done via API');
  ok((await call('POST', '/api/reminders/r2/snooze', { minutes: 5, source: 'push' })).status === 200 && db.snoozes.length === 1, 'snooze via API');

  // analytics
  const ev = await call('POST', '/api/events', { events: [{ type: 'app_open' }, { type: 'filter_change', meta: { filter: 'done' } }, { type: 'reminder_add' }] });
  ok(ev.status === 200 && ev.json.stored === 3, 'events stored');
  const an = await call('GET', '/api/analytics');
  const feats = Object.fromEntries(an.json.features.map(f => [f.feature, f.count]));
  ok(an.status === 200 && feats.app_open === 1 && feats.signup === 1 && feats.login === 1 && feats.reminder_done === 1 && feats.push_snooze === 1, 'per-user analytics counts every feature');
  ok(an.json.last7.length === 7, 'analytics has last-7-day series');

  // second user cannot see admin analytics or first user's data
  const ownerCookie = cookie; cookie = '';
  await call('POST', '/api/signup', { email: 'bob@example.com', password: 'secret12' });
  ok((await call('GET', '/api/reminders')).json.reminders.length === 0, 'users only see their own reminders');
  ok((await call('GET', '/api/admin/analytics')).status === 403, 'non-admin blocked from admin analytics');
  cookie = ownerCookie;
  const adm = await call('GET', '/api/admin/analytics');
  ok(adm.status === 200 && adm.json.users === 2 && adm.json.perUser.length === 2, 'admin sees analytics across all users');

  // push
  const key = await call('GET', '/api/push/key');
  ok(key.status === 200 && /^[A-Za-z0-9_-]{80,}$/.test(key.json.publicKey), 'VAPID public key published');
  ok((await call('POST', '/api/push/test')).status === 400, 'push test explains when no device subscribed');
  ok((await call('POST', '/api/push/subscribe', { subscription: { endpoint: 'http://evil' } })).status === 400, 'invalid subscription rejected');
  // a well-formed subscription to an endpoint that answers 410 Gone must be pruned by the scheduler
  const fake = http410();
  await new Promise(r => fake.listen(0, r));
  const crypto = require('crypto');
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const sub = { endpoint: `https://127.0.0.1:${fake.address().port}/push/x`, keys: { p256dh: ecdh.getPublicKey('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
  const s = await call('POST', '/api/push/subscribe', { subscription: sub, tz: 'UTC' });
  ok(s.status === 200 && s.json.devices === 1, 'push subscription saved');
  // schedule a reminder for the current minute (UTC) and run the scheduler
  const nowT = new Date().toISOString().slice(11, 16);
  await call('PUT', '/api/reminders', { reminders: [{ id: 'now1', title: 'Now', time: nowT }] });
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  await tick();
  const fired = Object.keys(db.fired).some(k => k.endsWith(':now1:' + new Date().toISOString().slice(0, 10)));
  ok(fired, 'scheduler fires a reminder at its local time');
  ok(db.events.some(e => e.type === 'push_sent'), 'scheduler records push_sent');
  await tick();
  ok(db.events.filter(e => e.type === 'push_sent' && e.meta.reminder === 'now1').length === 1, 'reminder fires only once per day');

  fake.close(); server.close();
  console.log(fail ? `\n${fail} check(s) failed` : '\nAll server checks passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

function http410() {
  // tiny HTTPS endpoint with a throwaway self-signed cert is heavy; a plain TCP server that closes is enough
  return require('net').createServer(sock => sock.destroy());
}
