import { jsonError } from '../../../../../../lib/server/api-errors';
import { requireAuthenticatedRequest } from '../../../../../../lib/server/auth';
import { getGenerationJob } from '../../../../../../lib/server/generation-jobs';
import { getRuntimeEnv } from '../../../../../../lib/server/runtime-env';

export const dynamic = 'force-dynamic';

const privateMediaHeaders = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
} as const;

function mediaError(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
) {
  return Response.json(
    { error: { code, message, retryable } },
    { status, headers: privateMediaHeaders },
  );
}

function mediaHeaders(object: R2Object, contentType: string) {
  return new Headers({
    'Accept-Ranges': 'bytes',
    ...privateMediaHeaders,
    'Content-Type': contentType,
    ETag: object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
  });
}

function parseRange(value: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

async function serveMedia(
  request: Request,
  context: { params: Promise<{ id: string }> },
  headOnly: boolean,
) {
  const { id } = await context.params;
  const job = await getGenerationJob(id);
  if (!job?.object_key || job.status !== 'succeeded') {
    return mediaError(
      404,
      'MEDIA_NOT_FOUND',
      'Generated media is not available.',
      false,
    );
  }
  const bucket = getRuntimeEnv().MEDIA;
  if (!bucket) {
    return mediaError(
      503,
      'STORAGE_NOT_CONFIGURED',
      'Media storage is unavailable.',
      true,
    );
  }
  const head = await bucket.head(job.object_key);
  if (!head) {
    return mediaError(
      404,
      'MEDIA_NOT_FOUND',
      'Generated media is not available.',
      false,
    );
  }
  const contentType = job.mime_type ?? head.httpMetadata?.contentType ?? 'video/mp4';
  const headers = mediaHeaders(head, contentType);
  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    const range = parseRange(rangeHeader, head.size);
    if (!range) {
      headers.set('Content-Range', `bytes */${head.size}`);
      return new Response(null, { status: 416, headers });
    }
    const length = range.end - range.start + 1;
    headers.set('Content-Length', String(length));
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${head.size}`);
    if (headOnly) return new Response(null, { status: 206, headers });
    const object = await bucket.get(job.object_key, { range: { offset: range.start, length } });
    return object
      ? new Response(object.body, { status: 206, headers })
      : mediaError(
          404,
          'MEDIA_NOT_FOUND',
          'Generated media is not available.',
          false,
        );
  }
  headers.set('Content-Length', String(head.size));
  if (headOnly) return new Response(null, { status: 200, headers });
  const object = await bucket.get(job.object_key);
  return object
    ? new Response(object.body, { status: 200, headers })
    : mediaError(
        404,
        'MEDIA_NOT_FOUND',
        'Generated media is not available.',
        false,
      );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedRequest(request);
    return serveMedia(request, context, false);
  } catch (error) {
    const response = jsonError(error);
    response.headers.set('Cache-Control', privateMediaHeaders['Cache-Control']);
    response.headers.set('Vary', privateMediaHeaders.Vary);
    return response;
  }
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuthenticatedRequest(request);
    return serveMedia(request, context, true);
  } catch (error) {
    const response = jsonError(error);
    response.headers.set('Cache-Control', privateMediaHeaders['Cache-Control']);
    response.headers.set('Vary', privateMediaHeaders.Vary);
    return response;
  }
}
