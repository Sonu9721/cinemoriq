export const GENERATION_JOBS_TABLE_SQL = `
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
    poll_error_count INTEGER NOT NULL DEFAULT 0,
    cancellation_requested_at TEXT,
    review_state TEXT NOT NULL DEFAULT 'draft',
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  )
`;

export const GENERATION_JOBS_ACTIVE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_generation_jobs_active_created
  ON generation_jobs(status, created_at)
`;

export const GENERATION_JOBS_IDEMPOTENCY_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_idempotency
  ON generation_jobs(idempotency_key)
`;

export const GENERATION_JOBS_PROVIDER_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_provider_request
  ON generation_jobs(provider, provider_request_id)
  WHERE provider_request_id IS NOT NULL
`;

export const GENERATION_JOBS_VERSION_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_scene_version
  ON generation_jobs(scene_id, version_id)
`;

export type GenerationJobRow = {
  id: string;
  campaign_id: string | null;
  scene_id: string;
  version_id: string;
  idempotency_key: string;
  provider: 'fal-ai' | 'minimax-direct';
  model_key: string;
  generation_mode: string;
  endpoint_id: string;
  status: string;
  progress: number;
  provider_request_id: string | null;
  provider_status_url: string | null;
  provider_response_url: string | null;
  provider_cancel_url: string | null;
  input_json: string;
  request_hash: string;
  output_json: string | null;
  object_key: string | null;
  mime_type: string | null;
  file_size: number | null;
  error_code: string | null;
  error_message: string | null;
  estimated_cost_usd: number | null;
  maximum_cost_usd: number;
  next_poll_at: number | null;
  poll_lease_until: number | null;
  poll_error_count: number;
  cancellation_requested_at: string | null;
  review_state: 'draft' | 'in-review' | 'approved' | 'changes-requested';
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export const AUTH_LOGIN_ATTEMPTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS auth_login_attempts (
    id TEXT PRIMARY KEY,
    window_started_at INTEGER NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    updated_at TEXT NOT NULL
  )
`;

export const AUTH_LOGIN_ATTEMPTS_LOCK_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked_until
  ON auth_login_attempts(locked_until)
  WHERE locked_until IS NOT NULL
`;

export type AuthLoginAttemptRow = {
  id: string;
  window_started_at: number;
  attempt_count: number;
  locked_until: number | null;
  updated_at: string;
};

export const AUTH_SESSIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER
  )
`;

export const AUTH_SESSIONS_EXPIRY_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
  ON auth_sessions(expires_at)
`;

export type AuthSessionRow = {
  token_hash: string;
  email: string;
  created_at: number;
  expires_at: number;
  revoked_at: number | null;
};
