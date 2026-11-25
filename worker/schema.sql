-- ====================================================================
-- Cloudflare D1 Database Schema for reminderme Serverless Edge Backend
-- Run: npx wrangler d1 execute reminder-db --remote --file=./schema.sql
-- ====================================================================

-- 1. Accounts
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tz TEXT NOT NULL DEFAULT 'UTC',
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 2. Auth Sessions (Bearer token + HttpOnly cookie)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Authenticated User Reminders & Alarms
CREATE TABLE IF NOT EXISTS user_reminders (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  days_json TEXT,
  one_time_date TEXT,
  emoji TEXT NOT NULL DEFAULT '⏰',
  color TEXT NOT NULL DEFAULT '#2F80FF',
  priority TEXT NOT NULL DEFAULT 'med',
  tag TEXT,
  is_alarm INTEGER NOT NULL DEFAULT 1,
  sound TEXT,
  done_date TEXT,
  snoozed_until INTEGER,
  sent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Authenticated Web Push Subscriptions
CREATE TABLE IF NOT EXISTS user_push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Native Mobile FCM / APNs Device Tokens (Capacitor Android & iOS)
CREATE TABLE IF NOT EXISTS fcm_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Activity & Streak Analytics Events
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  ts INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Deduplication Log for Daily Cron Firing
CREATE TABLE IF NOT EXISTS fired_log (
  fire_key TEXT PRIMARY KEY,
  fired_at INTEGER NOT NULL
);

-- 8. Legacy Anonymous Push Tables (preserved for backward compatibility)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  subscription_endpoint TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  due_at_utc INTEGER NOT NULL,
  sent INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (subscription_endpoint) REFERENCES subscriptions(endpoint) ON DELETE CASCADE
);

-- Performance Indexes for Edge Cron & Instant Account Sync
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_reminders_due ON user_reminders(sent, due_at);
CREATE INDEX IF NOT EXISTS idx_user_reminders_user ON user_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_subs_user ON user_push_subs(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_ts ON events(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_fired_log_at ON fired_log(fired_at);
CREATE INDEX IF NOT EXISTS idx_reminders_due_sent ON reminders(due_at_utc, sent);
CREATE INDEX IF NOT EXISTS idx_reminders_sub_endpoint ON reminders(subscription_endpoint);
