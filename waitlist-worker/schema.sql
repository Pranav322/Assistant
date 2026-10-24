-- Waitlist signups. email is stored lowercased and is unique, so a repeat
-- signup is a harmless no-op.
CREATE TABLE IF NOT EXISTS waitlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  source     TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist (created_at);
