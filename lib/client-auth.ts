'use client';

const CSRF_COOKIE_NAMES = [
  '__Host-cinemoriq_csrf',
  'cinemoriq_csrf',
] as const;

let authRedirectStarted = false;

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;

  for (const cookie of document.cookie.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator === -1) continue;
    if (cookie.slice(0, separator).trim() !== name) continue;

    const value = cookie.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

export function getCsrfToken() {
  for (const cookieName of CSRF_COOKIE_NAMES) {
    const token = readCookie(cookieName);
    if (token) return token;
  }
  return null;
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof window === 'undefined') return null;
  const value = input instanceof Request ? input.url : input.toString();

  try {
    return new URL(value, window.location.origin);
  } catch {
    return null;
  }
}

function currentReturnPath() {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function redirectToLogin() {
  if (typeof window === 'undefined' || authRedirectStarted) return;
  if (window.location.pathname === '/login') return;

  authRedirectStarted = true;
  const next = encodeURIComponent(currentReturnPath());
  window.location.assign(`/login?next=${next}`);
}

export async function cinemoriqFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const url = requestUrl(input);
  const sameOrigin =
    url !== null &&
    typeof window !== 'undefined' &&
    url.origin === window.location.origin;
  const method = (init.method ?? (input instanceof Request ? input.method : 'GET'))
    .toUpperCase();
  const isMutation = method !== 'GET' && method !== 'HEAD';
  let requestInit = init;

  if (sameOrigin && isMutation) {
    const headers = new Headers(
      init.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    const csrfToken = getCsrfToken();
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
    requestInit = { ...init, headers };
  }

  const response = await fetch(input, requestInit);
  if (sameOrigin && response.status === 401) redirectToLogin();
  return response;
}
