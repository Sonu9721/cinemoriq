import {
  createAuthCookies,
  createAuthSession,
  getAuthConfig,
  normalizeAuthEmail,
  verifyConfiguredPassword,
} from '../../../../lib/server/auth';
import {
  clearLoginFailures,
  reserveLoginAttempt,
} from '../../../../lib/server/auth-rate-limit';
import {
  assertSameOrigin,
  jsonError,
  readLimitedJson,
} from '../../../../lib/server/api-errors';

export const dynamic = 'force-dynamic';

function errorResponse(
  status: number,
  code: string,
  message: string,
  retryAfterSeconds?: number,
) {
  return Response.json(
    { error: { code, message, retryable: status >= 500 } },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...(retryAfterSeconds
          ? { 'Retry-After': String(retryAfterSeconds) }
          : {}),
      },
    },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const config = getAuthConfig();
    if (!config) {
      return errorResponse(
        503,
        'ACCESS_CONTROL_NOT_CONFIGURED',
        'Cinemoriq access control is not configured yet.',
      );
    }
    const body = await readLimitedJson(request, 4_096);
    const email =
      isRecord(body) && typeof body.email === 'string'
        ? normalizeAuthEmail(body.email)
        : '';
    const password =
      isRecord(body) && typeof body.password === 'string' ? body.password : '';
    const reservation = await reserveLoginAttempt(request, config.email);
    if (!reservation.allowed) {
      return errorResponse(
        429,
        'LOGIN_TEMPORARILY_LOCKED',
        'Too many attempts. Wait before trying again.',
        reservation.retryAfterSeconds,
      );
    }
    if (!email || email.length > 254 || !password || password.length > 256) {
      return errorResponse(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
      );
    }
    const passwordValid = await verifyConfiguredPassword(password);
    const credentialsValid = email === config.email && passwordValid;
    if (!credentialsValid) {
      return errorResponse(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
      );
    }
    await clearLoginFailures(request, config.email);
    const session = await createAuthSession();
    if (!session) {
      return errorResponse(
        503,
        'ACCESS_CONTROL_NOT_CONFIGURED',
        'Cinemoriq access control is not configured yet.',
      );
    }
    const secure = new URL(request.url).protocol === 'https:';
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    for (const cookie of createAuthCookies(session, secure)) {
      headers.append('Set-Cookie', cookie);
    }
    return Response.json(
      { authenticated: true, email: config.email },
      { headers },
    );
  } catch (error) {
    return jsonError(error);
  }
}
