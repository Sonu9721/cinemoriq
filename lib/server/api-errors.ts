import type { GenerationApiError } from '../generation-contract';

export class GenerationApiException extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'GenerationApiException';
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    throw new GenerationApiException(
      403,
      'ORIGIN_NOT_ALLOWED',
      'This request must come from the Cinemoriq site.',
    );
  }
}

export function jsonError(error: unknown) {
  if (!(error instanceof GenerationApiException)) {
    console.error('[cinemoriq-api] Unexpected server error', error);
  }
  const exception =
    error instanceof GenerationApiException
      ? error
      : new GenerationApiException(
          500,
          'INTERNAL_ERROR',
          'Cinemoriq could not complete this request.',
          true,
        );
  const body: GenerationApiError = {
    error: {
      code: exception.code,
      message: exception.message,
      retryable: exception.retryable,
      ...(exception.fieldErrors ? { fieldErrors: exception.fieldErrors } : {}),
    },
  };
  return Response.json(body, {
    status: exception.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function readLimitedJson(request: Request, maximumBytes = 65_536) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new GenerationApiException(
      415,
      'JSON_REQUIRED',
      'Send this request as application/json.',
    );
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new GenerationApiException(
      413,
      'REQUEST_TOO_LARGE',
      'Generation requests must be smaller than 64 KB.',
    );
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maximumBytes) {
    throw new GenerationApiException(
      413,
      'REQUEST_TOO_LARGE',
      'Generation requests must be smaller than 64 KB.',
    );
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new GenerationApiException(
      400,
      'INVALID_JSON',
      'The request body is not valid JSON.',
    );
  }
}
