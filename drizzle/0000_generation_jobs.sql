CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  scene_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model_key TEXT NOT NULL,
  generation_mode TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  provider_request_id TEXT,
  provider_status_url TEXT,
  provider_response_url TEXT,
  provider_cancel_url TEXT,
  input_json TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  output_json TEXT,
  object_key TEXT,
  mime_type TEXT,
  file_size INTEGER,
  error_code TEXT,
  error_message TEXT,
  estimated_cost_usd REAL,
  maximum_cost_usd REAL NOT NULL,
  next_poll_at INTEGER,
  poll_lease_until INTEGER,
  cancellation_requested_at TEXT,
  review_state TEXT NOT NULL DEFAULT 'draft',
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_active_created
ON generation_jobs(status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_idempotency
ON generation_jobs(idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_provider_request
ON generation_jobs(provider, provider_request_id)
WHERE provider_request_id IS NOT NULL;

PRAGMA optimize;
