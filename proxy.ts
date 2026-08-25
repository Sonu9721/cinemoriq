import { NextRequest, NextResponse } from 'next/server';
import { safeAuthReturnPath } from './lib/auth-paths';
import {
  getAuthConfig,
  getAuthenticatedSession,
} from './lib/server/auth';

const PUBLIC_ASSET_EXACT_PATHS = new Set([
  '/favicon.ico',
  '/icon.png',
  '/apple-icon.png',
  '/og.png',
  '/neon-ascendance.webp',
]);

const PUBLIC_APP_EXACT_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
]);

const PUBLIC_PREFIXES = ['/_next/', '/brand/', '/studio/'];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_APP_EXACT_PATHS.has(pathname) ||
    PUBLIC_ASSET_EXACT_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isPublicAssetPath(pathname: string) {
  return (
    PUBLIC_ASSET_EXACT_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

function withPublicAssetHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

function apiError(status: number, code: string, message: string) {
  return withSecurityHeaders(
    NextResponse.json(
      { error: { code, message, retryable: status >= 500 } },
      { status },
    ),
  );
}

function loginRedirect(request: NextRequest, reason?: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set(
    'next',
    safeAuthReturnPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
  );
  if (reason) loginUrl.searchParams.set('reason', reason);
  return withSecurityHeaders(NextResponse.redirect(loginUrl));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  if (isPublicAssetPath(pathname)) {
    return withPublicAssetHeaders(NextResponse.next());
  }

  if (!getAuthConfig()) {
    if (pathname.startsWith('/api/') && pathname !== '/api/auth/login') {
      return apiError(
        503,
        'ACCESS_CONTROL_NOT_CONFIGURED',
        'Cinemoriq access control is not configured yet.',
      );
    }
    if (publicPath) return withSecurityHeaders(NextResponse.next());
    return loginRedirect(request, 'setup');
  }

  if (publicPath && pathname !== '/login') {
    return withSecurityHeaders(NextResponse.next());
  }

  try {
    const session = await getAuthenticatedSession(request);

    if (pathname === '/login') {
      if (!session) return withSecurityHeaders(NextResponse.next());
      const returnPath = safeAuthReturnPath(
        request.nextUrl.searchParams.get('next'),
      );
      return withSecurityHeaders(
        NextResponse.redirect(new URL(returnPath, request.url)),
      );
    }

    if (!session) {
      if (pathname.startsWith('/api/')) {
        return apiError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Sign in to continue.',
        );
      }
      return loginRedirect(request);
    }

    return withSecurityHeaders(NextResponse.next());
  } catch {
    if (pathname.startsWith('/api/')) {
      return apiError(
        503,
        'ACCESS_CONTROL_UNAVAILABLE',
        'Cinemoriq access control is temporarily unavailable.',
      );
    }
    return loginRedirect(request, 'unavailable');
  }
}

export const config = {
  matcher: ['/:path*'],
};
