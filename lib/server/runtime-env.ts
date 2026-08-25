import { env } from 'cloudflare:workers';

export type CinemoriqRuntimeEnv = {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  FAL_KEY?: string;
  MINIMAX_API_KEY?: string;
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
  };
}
