import {
  AUTH_LOGIN_ATTEMPTS_LOCK_INDEX_SQL,
  AUTH_LOGIN_ATTEMPTS_TABLE_SQL,
  type AuthLoginAttemptRow,
} from '../../db/schema';
import { getAuthConfig } from './auth';
import { getRuntimeEnv } from './runtime-env';

const WINDOW_MS = 15 * 60 * 1_000;
const STALE_ROW_MS = 24 * 60 * 60 * 1_000;
const encoder = new TextEncoder();

const RATE_LIMITS = {
  ip: { maximumFailures: 5, lockMs: 15 * 60 * 1_000 },
  account: { maximumFailures: 25, lockMs: 5 * 60 * 1_000 },
} as const;

type RateLimitScope = keyof typeof RATE_LIMITS;

function getDatabase() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new Error('Authentication database is not configured.');
  return database;
}

async function ensureAuthRateLimitSchema() {
  const database = getDatabase();
  await database.batch([
    database.prepare(AUTH_LOGIN_ATTEMPTS_TABLE_SQL),
    database.prepare(AUTH_LOGIN_ATTEMPTS_LOCK_INDEX_SQL),
  ]);
  return database;
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function opaqueAttemptKey(scope: RateLimitScope, value: string) {
  const config = getAuthConfig();
  if (!config) throw new Error('Authentication is not configured.');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(config.sessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`login-rate:${scope}:${value}`),
  );
  return `${scope}:${encodeBase64Url(new Uint8Array(digest))}`;
}

function requestAddress(request: Request) {
  return request.headers.get('cf-connecting-ip')?.trim() || 'unknown';
}

async function attemptKeys(request: Request, configuredEmail: string) {
  const [account, ip] = await Promise.all([
    opaqueAttemptKey('account', configuredEmail),
    opaqueAttemptKey('ip', requestAddress(request)),
  ]);
  return { account, ip };
}

async function loadAttemptRows(
  database: D1Database,
  keys: Record<RateLimitScope, string>,
) {
  const result = await database
    .prepare(
      `SELECT id, window_started_at, attempt_count, locked_until, updated_at
       FROM auth_login_attempts
       WHERE id IN (?, ?)`,
    )
    .bind(keys.account, keys.ip)
    .all<AuthLoginAttemptRow>();
  return new Map((result.results ?? []).map((row) => [row.id, row]));
}

export async function getLoginRateLimit(
  request: Request,
  configuredEmail: string,
  now = Date.now(),
) {
  const database = await ensureAuthRateLimitSchema();
  const keys = await attemptKeys(request, configuredEmail);
  const rows = await loadAttemptRows(database, keys);
  const activeLocks = Object.values(keys)
    .map((key) => rows.get(key)?.locked_until ?? 0)
    .filter((lockedUntil) => lockedUntil > now);
  const lockedUntil = activeLocks.length ? Math.max(...activeLocks) : 0;
  return {
    allowed: lockedUntil === 0,
    retryAfterSeconds: lockedUntil
      ? Math.max(1, Math.ceil((lockedUntil - now) / 1_000))
      : 0,
  };
}

function failureUpsert(
  database: D1Database,
  scope: RateLimitScope,
  key: string,
  now: number,
) {
  const { maximumFailures, lockMs } = RATE_LIMITS[scope];
  const windowCutoff = now - WINDOW_MS;
  const lockedUntil = now + lockMs;
  const updatedAt = new Date(now).toISOString();

  return database
    .prepare(
      `INSERT INTO auth_login_attempts
        (id, window_started_at, attempt_count, locked_until, updated_at)
       VALUES (?, ?, 1, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET
         attempt_count = CASE
           WHEN auth_login_attempts.window_started_at <= ? THEN 1
           ELSE auth_login_attempts.attempt_count + 1
         END,
         locked_until = CASE
           WHEN auth_login_attempts.window_started_at <= ? THEN NULL
           WHEN auth_login_attempts.attempt_count + 1 >= ?
             THEN MAX(COALESCE(auth_login_attempts.locked_until, 0), ?)
           WHEN COALESCE(auth_login_attempts.locked_until, 0) > ?
             THEN auth_login_attempts.locked_until
           ELSE NULL
         END,
         window_started_at = CASE
           WHEN auth_login_attempts.window_started_at <= ? THEN ?
           ELSE auth_login_attempts.window_started_at
         END,
         updated_at = excluded.updated_at`,
    )
    .bind(
      key,
      now,
      updatedAt,
      windowCutoff,
      windowCutoff,
      maximumFailures,
      lockedUntil,
      now,
      windowCutoff,
      now,
    );
}

export async function recordLoginFailure(
  request: Request,
  configuredEmail: string,
  now = Date.now(),
) {
  const database = await ensureAuthRateLimitSchema();
  const keys = await attemptKeys(request, configuredEmail);
  await database.batch([
    failureUpsert(database, 'account', keys.account, now),
    failureUpsert(database, 'ip', keys.ip, now),
    database
      .prepare(
        `DELETE FROM auth_login_attempts
         WHERE updated_at < ?
           AND (locked_until IS NULL OR locked_until <= ?)`,
      )
      .bind(new Date(now - STALE_ROW_MS).toISOString(), now),
  ]);
}

export async function clearLoginFailures(
  request: Request,
  configuredEmail: string,
) {
  const database = await ensureAuthRateLimitSchema();
  const keys = await attemptKeys(request, configuredEmail);
  await database
    .prepare('DELETE FROM auth_login_attempts WHERE id IN (?, ?)')
    .bind(keys.account, keys.ip)
    .run();
}
