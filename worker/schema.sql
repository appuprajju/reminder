-- ====================================================================
-- Cloudflare D1 Database Schema for reminder-worker
-- ====================================================================

-- 1. Browser Push Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 2. Scheduled Reminders
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

-- Indexes for high-performance cron query
CREATE INDEX IF NOT EXISTS idx_reminders_due_sent ON reminders(due_at_utc, sent);
CREATE INDEX IF NOT EXISTS idx_reminders_sub_endpoint ON reminders(subscription_endpoint);
