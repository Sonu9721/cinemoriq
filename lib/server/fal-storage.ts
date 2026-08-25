import {
  STUDIO_ASSET_KINDS,
  type FalUploadInitiationResponse,
  type StudioAssetKind,
} from '../generation-contract';
import {
  isStudioVideoModelKey,
  type StudioVideoModelKey,
} from '../../components/studio/video-model-catalog';
import { GenerationApiException } from './api-errors';
import { getRuntimeEnv } from './runtime-env';

const FAL_STORAGE_INIT_URL =
  'https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3';
const UPLOAD_LIFETIME_SECONDS = 24 * 60 * 60;

const ASSET_RULES: Record<
  StudioAssetKind,
  { maximumBytes: number; mimeTypes: ReadonlySet<string> }
> = {
  image: {
    // Veo is the strictest supported image endpoint at 8 MB.
    maximumBytes: 8 * 1024 * 1024,
    mimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  },
  video: {
    // Keep uploads below fal's documented 90 MiB multipart threshold. Seedance
    // applies a stricter 50 MB combined reference limit in its model schema.
    maximumBytes: 50 * 1024 * 1024,
    mimeTypes: new Set(['video/mp4', 'video/quicktime']),
  },
  audio: {
    maximumBytes: 15 * 1024 * 1024,
    mimeTypes: new Set([
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
    ]),
  },
};

type UploadRequest = {
  fileName: string;
  mimeType: string;
  byteSize: number;
  kind: StudioAssetKind;
  modelKey: StudioVideoModelKey;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function providerMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.detail === 'string') return payload.detail.slice(0, 300);
  if (Array.isArray(payload.detail)) {
    const messages = payload.detail
      .map((item) =>
        isRecord(item) && typeof item.msg === 'string' ? item.msg : null,
      )
      .filter((item): item is string => Boolean(item));
    if (messages.length) return messages.join(' · ').slice(0, 300);
  }
  if (typeof payload.message === 'string') return payload.message.slice(0, 300);
  return fallback;
}

function safeHttpsUrl(value: unknown, field: string) {
  if (typeof value !== 'string') {
    throw new GenerationApiException(
      502,
      'FAL_UPLOAD_INVALID_RESPONSE',
      `fal.ai did not return a valid ${field}.`,
      true,
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GenerationApiException(
      502,
      'FAL_UPLOAD_INVALID_RESPONSE',
      `fal.ai did not return a valid ${field}.`,
      true,
    );
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new GenerationApiException(
      502,
      'FAL_UPLOAD_INVALID_RESPONSE',
      `fal.ai did not return a secure ${field}.`,
      true,
    );
  }
  return url.toString();
}

function parseUploadRequest(value: unknown): UploadRequest {
  if (
    !isRecord(value) ||
    !STUDIO_ASSET_KINDS.includes(value.kind as StudioAssetKind) ||
    !isStudioVideoModelKey(value.modelKey)
  ) {
    throw new GenerationApiException(
      400,
      'INVALID_UPLOAD_REQUEST',
      'Choose a supported image, video, or audio file.',
    );
  }
  const kind = value.kind as StudioAssetKind;
  const rule = ASSET_RULES[kind];
  const modelKey = value.modelKey;
  const maximumBytes =
    kind === 'image' && modelKey === 'seedance-2.0'
      ? 30 * 1024 * 1024
      : rule.maximumBytes;
  const fileName = typeof value.fileName === 'string' ? value.fileName.trim() : '';
  const mimeType =
    typeof value.mimeType === 'string'
      ? value.mimeType.split(';')[0].trim().toLowerCase()
      : '';
  const byteSize = Number(value.byteSize);
  if (
    !fileName ||
    fileName.length > 180 ||
    /[\u0000-\u001f\u007f]/.test(fileName)
  ) {
    throw new GenerationApiException(
      400,
      'INVALID_FILE_NAME',
      'Use a file name shorter than 180 characters.',
    );
  }
  if (!rule.mimeTypes.has(mimeType)) {
    throw new GenerationApiException(
      415,
      'UNSUPPORTED_ASSET_TYPE',
      kind === 'image'
        ? 'Upload a JPEG, PNG, or WebP image.'
        : kind === 'video'
          ? 'Upload an MP4 or MOV video.'
          : 'Upload an MP3 or WAV audio file.',
    );
  }
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) {
    throw new GenerationApiException(
      400,
      'INVALID_FILE_SIZE',
      'The selected file is empty or its size is unavailable.',
    );
  }
  if (byteSize > maximumBytes) {
    throw new GenerationApiException(
      413,
      'ASSET_TOO_LARGE',
      `${kind === 'image' ? 'Images' : kind === 'video' ? 'Videos' : 'Audio files'} must be ${Math.floor(maximumBytes / 1024 / 1024)} MB or smaller for this model.`,
    );
  }
  return { fileName, mimeType, byteSize, kind, modelKey };
}

export async function initiateFalUpload(
  value: unknown,
): Promise<FalUploadInitiationResponse> {
  const request = parseUploadRequest(value);
  const secret = getRuntimeEnv().FAL_KEY?.trim();
  if (!secret) {
    throw new GenerationApiException(
      503,
      'PROVIDER_NOT_CONFIGURED',
      'Add the server-side FAL_KEY before uploading model assets.',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(FAL_STORAGE_INIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Key ${secret}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Fal-Object-Lifecycle': JSON.stringify({
          expiration_duration_seconds: UPLOAD_LIFETIME_SECONDS,
        }),
      },
      body: JSON.stringify({
        file_name: request.fileName,
        content_type: request.mimeType,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    throw new GenerationApiException(
      502,
      'FAL_UPLOAD_UNAVAILABLE',
      error instanceof Error && error.name === 'AbortError'
        ? 'fal.ai upload preparation timed out.'
        : 'fal.ai upload preparation is temporarily unavailable.',
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new GenerationApiException(
      response.status === 401 || response.status === 403 ? 503 : 502,
      response.status === 401 || response.status === 403
        ? 'FAL_KEY_REJECTED'
        : 'FAL_UPLOAD_REJECTED',
      providerMessage(
        payload,
        response.status === 401 || response.status === 403
          ? 'fal.ai rejected the configured FAL_KEY.'
          : `fal.ai could not prepare this upload (HTTP ${response.status}).`,
      ),
      response.status === 429 || response.status >= 500,
    );
  }
  if (!isRecord(payload)) {
    throw new GenerationApiException(
      502,
      'FAL_UPLOAD_INVALID_RESPONSE',
      'fal.ai returned an invalid upload response.',
      true,
    );
  }

  const uploadUrl = safeHttpsUrl(payload.upload_url, 'upload URL');
  const fileUrl = safeHttpsUrl(payload.file_url, 'file URL');
  const expiresAt = new Date(
    Date.now() + UPLOAD_LIFETIME_SECONDS * 1000,
  ).toISOString();

  return {
    upload: {
      uploadUrl,
      fileUrl,
      expiresAt,
      fileName: request.fileName,
      mimeType: request.mimeType,
      byteSize: request.byteSize,
      kind: request.kind,
    },
  };
}
