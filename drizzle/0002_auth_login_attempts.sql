CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked_until
ON auth_login_attempts(locked_until)
WHERE locked_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
ON auth_sessions(expires_at);

PRAGMA optimize;
