export const DEFAULT_AUTH_RETURN_PATH = '/';

export function safeAuthReturnPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return DEFAULT_AUTH_RETURN_PATH;
  }
  try {
    const parsed = new URL(value, 'https://cinemoriq.invalid');
    if (parsed.origin !== 'https://cinemoriq.invalid') {
      return DEFAULT_AUTH_RETURN_PATH;
    }
    if (
      parsed.pathname === '/login' ||
      parsed.pathname.startsWith('/api/auth/')
    ) {
      return DEFAULT_AUTH_RETURN_PATH;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return DEFAULT_AUTH_RETURN_PATH;
  }
}
