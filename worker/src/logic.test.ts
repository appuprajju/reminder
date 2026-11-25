import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCorsHeaders,
  cleanReminder,
  computeNextDueAtUtc,
  hashPassword,
  isOriginAllowed,
  summarizeAnalytics,
  timingSafeEqualStr,
  verifyPassword,
} from './logic';

test('PBKDF2 password hashing and constant-time verification', async () => {
  const { salt, hash } = await hashPassword('s3curePass!42');
  assert.equal(salt.length, 32);
  assert.equal(hash.length, 64);
  assert.equal(await verifyPassword('s3curePass!42', salt, hash), true);
  assert.equal(await verifyPassword('wrongPassword', salt, hash), false);
  assert.equal(timingSafeEqualStr('abc123', 'abc123'), true);
  assert.equal(timingSafeEqualStr('abc123', 'abc124'), false);
  assert.equal(timingSafeEqualStr('abc', 'abcd'), false);
});

test('CORS allowlist accepts native Capacitor & production origins and blocks untrusted origins', () => {
  assert.equal(isOriginAllowed('https://reminder.makeuperfect.in'), true);
  assert.equal(isOriginAllowed('https://app.makeuperfect.in'), true);
  assert.equal(isOriginAllowed('capacitor://localhost'), true);
  assert.equal(isOriginAllowed('https://localhost'), true);
  assert.equal(isOriginAllowed('http://localhost:3000'), true);
  assert.equal(isOriginAllowed('https://evil.example.com'), false);
  assert.equal(isOriginAllowed('https://custom.example.com', 'https://custom.example.com'), true);

  const evilHeaders = buildCorsHeaders('https://evil.example.com');
  assert.equal(evilHeaders['Access-Control-Allow-Origin'], undefined);

  const goodHeaders = buildCorsHeaders('capacitor://localhost');
  assert.equal(goodHeaders['Access-Control-Allow-Origin'], 'capacitor://localhost');
  assert.equal(goodHeaders['Access-Control-Allow-Credentials'], 'true');
});

test('cleanReminder sanitizes invalid inputs and preserves valid fields', () => {
  const now = Date.UTC(2026, 10, 25, 10, 0, 0);
  const cleaned = cleanReminder(
    {
      title: '  Take Medicine  ',
      time: 'bad-time',
      color: 'javascript:alert(1)',
      priority: 'urgent',
      days: [1, 3, 9, -1],
      isAlarm: true,
    },
    'UTC',
    now
  );

  assert.equal(cleaned.title, 'Take Medicine');
  assert.equal(cleaned.time, '09:00');
  assert.equal(cleaned.color, '#2F80FF');
  assert.equal(cleaned.priority, 'med');
  assert.deepEqual(cleaned.days, [1, 3]);
  assert.equal(cleaned.isAlarm, true);
  assert.ok(cleaned.dueAt > now);
});

test('computeNextDueAtUtc advances to next matching day in user timezone', () => {
  // 2026-11-25 is Wednesday (day 3) at 14:00 UTC
  const wedAfternoon = new Date(Date.UTC(2026, 10, 25, 14, 0, 0));
  const nextFri = computeNextDueAtUtc('08:30', [5], 'UTC', wedAfternoon);
  const d = new Date(nextFri);
  assert.equal(d.getUTCDay(), 5);
  assert.equal(d.getUTCHours(), 8);
  assert.equal(d.getUTCMinutes(), 30);
});

test('summarizeAnalytics aggregates features and 7-day completion buckets', () => {
  const now = Date.UTC(2026, 10, 25, 12, 0, 0);
  const summary = summarizeAnalytics(
    [
      { type: 'reminder_add', ts: now - 1000 },
      { type: 'reminder_done', ts: now - 500 },
      { type: 'push_done', ts: now - 86400000 },
    ],
    4,
    2,
    now
  );
  assert.equal(summary.totalEvents, 3);
  assert.equal(summary.reminders, 4);
  assert.equal(summary.users, 2);
  assert.equal(summary.last7.length, 7);
  assert.equal(summary.last7[6].done, 1);
  assert.equal(summary.last7[5].done, 1);
});
