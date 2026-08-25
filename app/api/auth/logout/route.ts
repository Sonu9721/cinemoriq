import {
  assertSameOrigin,
  jsonError,
} from '../../../../lib/server/api-errors';
import {
  assertSessionCsrf,
  clearAuthCookies,
  getAuthenticatedSession,
  revokeAuthenticatedSession,
} from '../../../../lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const secure = new URL(request.url).protocol === 'https:';
    const session = await getAuthenticatedSession(request);
    if (session) {
      assertSessionCsrf(request, session);
      await revokeAuthenticatedSession(request);
    }
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Clear-Site-Data': '"cache"',
    });
    for (const cookie of clearAuthCookies(secure)) {
      headers.append('Set-Cookie', cookie);
    }
    return Response.json(
      { authenticated: false },
      { headers },
    );
  } catch (error) {
    return jsonError(error);
  }
}
