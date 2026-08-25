import {
  AUTH_SESSIONS_EXPIRY_INDEX_SQL,
  AUTH_SESSIONS_TABLE_SQL,
  type AuthSessionRow,
} from '../../db/schema';
import { GenerationApiException } from './api-errors';
import { getRuntimeEnv } from './runtime-env';

export const AUTH_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const PASSWORD_HASH_PREFIX = 'pbkdf2-sha256';
const PASSWORD_HASH_ITERATIONS = 100_000;
const SESSION_TOKEN_PREFIX = 'v1';
const encoder = new TextEncoder();

export type AuthConfig = {
  email: string;
  passwordHash: string;
  sessionSecret: string;
};

export type AuthSessionContext = {
  email: string;
  tokenHash: string;
  csrfToken: string;
  expiresAt: number;
};

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(value.length / 4) * 4,
    '=',
  );
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getAuthConfig(): AuthConfig | null {
  const runtime = getRuntimeEnv();
  const email = normalizeAuthEmail(runtime.CINEMORIQ_ADMIN_EMAIL ?? '');
  const passwordHash = runtime.CINEMORIQ_ADMIN_PASSWORD_HASH?.trim() ?? '';
  const sessionSecret = runtime.CINEMORIQ_SESSION_SECRET?.trim() ?? '';
  if (
    !email ||
    !parsePasswordHash(passwordHash) ||
    sessionSecret.length < 32
  ) {
    return null;
  }
  return { email, passwordHash, sessionSecret };
}

export function getAuthConfigurationStatus() {
  const config = getAuthConfig();
  return {
    configured: Boolean(config),
    adminEmail: config?.email ?? null,
  };
}

function parsePasswordHash(value: string) {
  const [algorithm, iterationsValue, saltValue, digestValue] = value.split('$');
  const iterations = Number(iterationsValue);
  const salt = decodeBase64Url(saltValue ?? '');
  const digest = decodeBase64Url(digestValue ?? '');
  if (
    algorithm !== PASSWORD_HASH_PREFIX ||
    !Number.isSafeInteger(iterations) ||
    iterations !== PASSWORD_HASH_ITERATIONS ||
    !salt ||
    salt.byteLength < 16 ||
    !digest ||
    digest.byteLength !== 32
  ) {
    return null;
  }
  return { iterations, salt, digest };
}

export async function verifyConfiguredPassword(password: string) {
  const config = getAuthConfig();
  if (!config || password.length < 12 || password.length > 256) return false;
  const parsed = parsePasswordHash(config.passwordHash);
  if (!parsed) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: parsed.salt,
        iterations: parsed.iterations,
      },
      key,
      256,
    ),
  );
  return constantTimeEqual(derived, parsed.digest);
}

async function signSessionPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(payload)),
  );
}

async function verifySessionSignature(
  payload: string,
  signature: Uint8Array,
  secret: string,
) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signatureBuffer = new Uint8Array(signature).buffer;
  return crypto.subtle.verify(
    'HMAC',
    key,
    signatureBuffer,
    encoder.encode(payload),
  );
}

async function hashSessionId(sessionId: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(sessionId));
  return encodeBase64Url(new Uint8Array(digest));
}

function randomToken(bytes = 32) {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function getDatabase() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new Error('Authentication database is not configured.');
  return database;
}

async function ensureAuthSessionSchema() {
  const database = getDatabase();
  await database.batch([
    database.prepare(AUTH_SESSIONS_TABLE_SQL),
    database.prepare(AUTH_SESSIONS_EXPIRY_INDEX_SQL),
  ]);
  return database;
}

async function createCsrfToken(
  sessionId: string,
  expiresAt: number,
  secret: string,
) {
  return encodeBase64Url(
    await signSessionPayload(`csrf.${sessionId}.${expiresAt}`, secret),
  );
}

export async function createAuthSession(now = Date.now()) {
  const config = getAuthConfig();
  if (!config) return null;
  const database = await ensureAuthSessionSchema();
  const createdAt = Math.floor(now / 1_000);
  const expiresAt = createdAt + AUTH_SESSION_MAX_AGE_SECONDS;
  const sessionId = randomToken();
  const tokenHash = await hashSessionId(sessionId);
  const unsignedToken = `${SESSION_TOKEN_PREFIX}.${sessionId}.${expiresAt}`;
  const signature = await signSessionPayload(unsignedToken, config.sessionSecret);
  const token = `${unsignedToken}.${encodeBase64Url(signature)}`;
  const csrfToken = await createCsrfToken(
    sessionId,
    expiresAt,
    config.sessionSecret,
  );
  await database.batch([
    database
      .prepare(
        `INSERT INTO auth_sessions
          (token_hash, email, created_at, expires_at, revoked_at)
         VALUES (?, ?, ?, ?, NULL)`,
      )
      .bind(tokenHash, config.email, createdAt, expiresAt),
    database
      .prepare(
        `DELETE FROM auth_sessions
         WHERE expires_at <= ? OR (revoked_at IS NOT NULL AND revoked_at <= ?)`,
      )
      .bind(createdAt, createdAt - 24 * 60 * 60),
  ]);
  return { token, csrfToken, email: config.email, expiresAt };
}

export async function verifySessionToken(
  token: string | null | undefined,
  now = Date.now(),
): Promise<AuthSessionContext | null> {
  const config = getAuthConfig();
  if (!config || !token || token.length > 2_048) return null;
  const [version, sessionId, expiresAtValue, encodedSignature, extra] =
    token.split('.');
  const expiresAt = Number(expiresAtValue);
  if (
    version !== SESSION_TOKEN_PREFIX ||
    !sessionId ||
    !/^[A-Za-z0-9_-]{40,80}$/.test(sessionId) ||
    !Number.isSafeInteger(expiresAt) ||
    !encodedSignature ||
    extra
  ) {
    return null;
  }
  const providedSignature = decodeBase64Url(encodedSignature);
  if (!providedSignature) return null;
  const unsignedToken = `${version}.${sessionId}.${expiresAt}`;
  if (
    !(await verifySessionSignature(
      unsignedToken,
      providedSignature,
      config.sessionSecret,
    ))
  ) {
    return null;
  }
  const nowSeconds = Math.floor(now / 1000);
  if (expiresAt <= nowSeconds || expiresAt > nowSeconds + AUTH_SESSION_MAX_AGE_SECONDS) {
    return null;
  }
  const tokenHash = await hashSessionId(sessionId);
  const database = getDatabase();
  const row = await database
    .prepare(
      `SELECT token_hash, email, created_at, expires_at, revoked_at
       FROM auth_sessions WHERE token_hash = ? LIMIT 1`,
    )
    .bind(tokenHash)
    .first<AuthSessionRow>();
  if (
    !row ||
    row.revoked_at !== null ||
    row.expires_at !== expiresAt ||
    row.expires_at <= nowSeconds ||
    normalizeAuthEmail(row.email) !== config.email
  ) {
    return null;
  }
  return {
    email: config.email,
    tokenHash,
    csrfToken: await createCsrfToken(
      sessionId,
      expiresAt,
      config.sessionSecret,
    ),
    expiresAt,
  };
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() !== name) continue;
    return pair.slice(separator + 1).trim();
  }
  return null;
}

function isSecureRequest(request: Request) {
  return new URL(request.url).protocol === 'https:';
}

function sessionCookieName(secure: boolean) {
  return secure ? '__Host-cinemoriq_session' : 'cinemoriq_session';
}

function csrfCookieName(secure: boolean) {
  return secure ? '__Host-cinemoriq_csrf' : 'cinemoriq_csrf';
}

export async function getAuthenticatedSession(request: Request) {
  const secure = isSecureRequest(request);
  const token = readCookie(
    request.headers.get('cookie'),
    sessionCookieName(secure),
  );
  return verifySessionToken(token);
}

export async function getAuthenticatedEmail(request: Request) {
  return (await getAuthenticatedSession(request))?.email ?? null;
}

export async function requireAuthenticatedRequest(request: Request) {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    throw new GenerationApiException(
      401,
      'AUTHENTICATION_REQUIRED',
      'Sign in to continue.',
    );
  }
  return session;
}

export function assertSessionCsrf(
  request: Request,
  session: AuthSessionContext,
) {
  const secure = isSecureRequest(request);
  const cookieToken = readCookie(
    request.headers.get('cookie'),
    csrfCookieName(secure),
  );
  const headerToken = request.headers.get('x-csrf-token')?.trim() ?? '';
  const expected = encoder.encode(session.csrfToken);
  if (
    !cookieToken ||
    !headerToken ||
    !constantTimeEqual(encoder.encode(cookieToken), expected) ||
    !constantTimeEqual(encoder.encode(headerToken), expected)
  ) {
    throw new GenerationApiException(
      403,
      'CSRF_TOKEN_INVALID',
      'Refresh Cinemoriq and try again.',
    );
  }
}

export async function revokeAuthenticatedSession(request: Request) {
  const session = await getAuthenticatedSession(request);
  if (!session) return;
  const database = getDatabase();
  await database
    .prepare('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ?')
    .bind(Math.floor(Date.now() / 1_000), session.tokenHash)
    .run();
}

export function createAuthCookies(
  session: { token: string; csrfToken: string },
  secure: boolean,
) {
  const shared = [
    'Path=/',
    'SameSite=Strict',
    `Max-Age=${AUTH_SESSION_MAX_AGE_SECONDS}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
  return [
    `${sessionCookieName(secure)}=${session.token}; HttpOnly; ${shared}`,
    `${csrfCookieName(secure)}=${session.csrfToken}; ${shared}`,
  ];
}

export function clearAuthCookies(secure: boolean) {
  const shared = [
    'Path=/',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
  return [
    `${sessionCookieName(secure)}=; HttpOnly; ${shared}`,
    `${csrfCookieName(secure)}=; ${shared}`,
  ];
}
