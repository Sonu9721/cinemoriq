import { getAuthenticatedEmail } from '../../../../lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const email = await getAuthenticatedEmail(request);
  if (!email) {
    return Response.json(
      {
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Sign in to continue.',
          retryable: false,
        },
      },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return Response.json(
    { authenticated: true, email },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
