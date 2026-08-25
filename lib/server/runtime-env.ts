import { env } from 'cloudflare:workers';

export type CinemoriqRuntimeEnv = {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  FAL_KEY?: string;
  MINIMAX_API_KEY?: string;
  CINEMORIQ_ADMIN_EMAIL?: string;
  CINEMORIQ_ADMIN_PASSWORD_HASH?: string;
  CINEMORIQ_SESSION_SECRET?: string;
};

export function getRuntimeEnv() {
  return env as unknown as CinemoriqRuntimeEnv;
}

export function getConnectionStatus() {
  const runtime = getRuntimeEnv();
  return {
    fal: Boolean(runtime.FAL_KEY?.trim()),
    minimax: Boolean(runtime.MINIMAX_API_KEY?.trim()),
    database: Boolean(runtime.DB),
    mediaStorage: Boolean(runtime.MEDIA),
    accessControl: Boolean(
      runtime.CINEMORIQ_ADMIN_EMAIL?.trim() &&
        runtime.CINEMORIQ_ADMIN_PASSWORD_HASH?.trim() &&
        runtime.CINEMORIQ_SESSION_SECRET?.trim(),
    ),
  };
}
