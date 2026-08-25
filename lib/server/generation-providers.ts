import type {
  StudioGenerationConfig,
  StudioGenerationMode,
  StudioModelProvider,
  StudioVideoModelKey,
} from '../../components/studio/video-model-catalog';

export type ProviderSubmissionResult = {
  requestId: string;
  statusUrl: string;
  responseUrl: string | null;
  cancelUrl: string | null;
};

export type ProviderOutput = {
  remoteUrl: string;
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  seed: number | null;
  expandedPrompt: string | null;
};

export type ProviderPollResult =
  | { state: 'queued'; progress: number; nextPollMs: number }
  | { state: 'processing'; progress: number; nextPollMs: number }
  | { state: 'completed'; output: ProviderOutput }
  | { state: 'cancelled' }
  | { state: 'failed'; code: string; message: string };

export type ProviderCancellationResult =
  | 'cancellation-requested'
  | 'already-completed'
  | 'not-found';

export class ProviderRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly httpStatus: number | null = null,
  ) {
    super(message);
    this.name = 'ProviderRequestError';
  }
}

const FAL_ENDPOINTS: Record<
  Exclude<StudioVideoModelKey, 'minimax-hailuo-02'>,
  Partial<Record<StudioGenerationMode, string>>
> = {
  'veo-3.1': {
    'text-to-video': 'fal-ai/veo3.1',
    'image-to-video': 'fal-ai/veo3.1/image-to-video',
    'first-last-frame': 'fal-ai/veo3.1/first-last-frame-to-video',
    'reference-to-video': 'fal-ai/veo3.1/reference-to-video',
  },
  'kling-v3-standard': {
    'text-to-video': 'fal-ai/kling-video/v3/standard/text-to-video',
    'image-to-video': 'fal-ai/kling-video/v3/standard/image-to-video',
    'first-last-frame': 'fal-ai/kling-video/v3/standard/image-to-video',
  },
  'seedance-2.0': {
    'text-to-video': 'bytedance/seedance-2.0/text-to-video',
    'image-to-video': 'bytedance/seedance-2.0/image-to-video',
    'first-last-frame': 'bytedance/seedance-2.0/image-to-video',
    'reference-to-video': 'bytedance/seedance-2.0/reference-to-video',
  },
  'minimax-h3': {
    'text-to-video': 'minimax/h3/text-to-video',
    'image-to-video': 'minimax/h3/image-to-video',
    'first-last-frame': 'minimax/h3/image-to-video',
    'reference-to-video': 'minimax/h3/reference-to-video',
  },
};

export function getServerEndpoint(
  modelKey: StudioVideoModelKey,
  mode: StudioGenerationMode,
) {
  if (modelKey === 'minimax-hailuo-02') return 'MiniMax-Hailuo-02';
  const endpoint = FAL_ENDPOINTS[modelKey][mode];
  if (!endpoint) throw new ProviderRequestError('MODE_NOT_SUPPORTED', 'This model does not support the selected mode.', false);
  return endpoint;
}

function optionalSeed(value: string) {
  if (!value.trim()) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

function buildFalInput(
  modelKey: Exclude<StudioVideoModelKey, 'minimax-hailuo-02'>,
  prompt: string,
  config: StudioGenerationConfig,
) {
  const seed = optionalSeed(config.seed);
  if (modelKey === 'veo-3.1') {
    const common: Record<string, unknown> = {
      prompt,
      duration: `${config.duration}s`,
      resolution: config.resolution,
      aspect_ratio: config.aspectRatio,
      generate_audio: config.audioEnabled,
      auto_fix: true,
      safety_tolerance: '4',
    };
    if (config.mode !== 'reference-to-video') {
      if (config.negativePrompt.trim()) common.negative_prompt = config.negativePrompt.trim();
      if (seed !== undefined) common.seed = seed;
    }
    if (config.mode === 'image-to-video') common.image_url = config.startImageUrl;
    if (config.mode === 'first-last-frame') {
      common.first_frame_url = config.startImageUrl;
      common.last_frame_url = config.endImageUrl;
      common.auto_fix = false;
    }
    if (config.mode === 'reference-to-video') {
      common.image_urls = config.referenceImageUrls.filter(Boolean);
    }
    return common;
  }

  if (modelKey === 'kling-v3-standard') {
    const input: Record<string, unknown> = {
      prompt,
      duration: String(config.duration),
      generate_audio: config.audioEnabled,
      shot_type: config.shotType,
      cfg_scale: 0.5,
    };
    if (config.negativePrompt.trim()) input.negative_prompt = config.negativePrompt.trim();
    if (config.mode === 'text-to-video') input.aspect_ratio = config.aspectRatio;
    if (config.mode !== 'text-to-video') input.start_image_url = config.startImageUrl;
    if (config.mode === 'first-last-frame') input.end_image_url = config.endImageUrl;
    return input;
  }

  if (modelKey === 'seedance-2.0') {
    const input: Record<string, unknown> = {
      prompt,
      duration: config.duration === 'auto' ? 'auto' : String(config.duration),
      resolution: config.resolution,
      aspect_ratio: config.aspectRatio,
      generate_audio: config.audioEnabled,
      bitrate_mode: config.bitrateMode,
      // Cinemoriq is currently a one-person workspace, so this stable opaque ID
      // represents its single end user without exposing account data.
      end_user_id: 'cinemoriq-owner-v1',
    };
    if (config.mode === 'image-to-video' || config.mode === 'first-last-frame') {
      input.image_url = config.startImageUrl;
    }
    if (config.mode === 'first-last-frame') input.end_image_url = config.endImageUrl;
    if (config.mode === 'reference-to-video') {
      const images = config.referenceImageUrls.filter(Boolean);
      const videos = config.referenceVideoUrls.filter(Boolean);
      const audio = config.referenceAudioUrls.filter(Boolean);
      if (images.length) input.image_urls = images;
      if (videos.length) input.video_urls = videos;
      if (audio.length) input.audio_urls = audio;
    }
    return input;
  }

  const input: Record<string, unknown> = {
    prompt,
    duration: Number(config.duration),
    resolution: config.resolution,
    prompt_expansion_mode: config.promptExpansionMode,
    enable_safety_checker: true,
    sync_mode: false,
  };
  if (seed !== undefined) input.seed = seed;
  if (config.mode === 'text-to-video' || config.mode === 'reference-to-video') {
    input.aspect_ratio = config.aspectRatio;
  }
  if (config.mode === 'image-to-video' || config.mode === 'first-last-frame') {
    input.image_url = config.startImageUrl;
  }
  if (config.mode === 'first-last-frame') input.end_image_url = config.endImageUrl;
  if (config.mode === 'reference-to-video') {
    const images = config.referenceImageUrls.filter(Boolean);
    const videos = config.referenceVideoUrls.filter(Boolean);
    const audio = config.referenceAudioUrls.filter(Boolean);
    if (images.length) input.reference_image_urls = images;
    if (videos.length) input.reference_video_urls = videos;
    if (audio.length) input.reference_audio_urls = audio;
  }
  return input;
}

function buildMiniMaxInput(prompt: string, config: StudioGenerationConfig) {
  const input: Record<string, unknown> = {
    model: 'MiniMax-Hailuo-02',
    prompt,
    duration: config.duration,
    resolution: config.resolution,
    prompt_optimizer: true,
  };
  if (config.mode !== 'first-last-frame') input.fast_pretreatment = false;
  if (config.mode === 'image-to-video' || config.mode === 'first-last-frame') {
    input.first_frame_image = config.startImageUrl;
  }
  if (config.mode === 'first-last-frame') input.last_frame_image = config.endImageUrl;
  return input;
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs = 60_000,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      const detail = payload?.detail;
      const detailMessage =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail
                .map((item) =>
                  item && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string'
                    ? item.msg
                    : null,
                )
                .filter((item): item is string => Boolean(item))
                .join(' · ')
            : '';
      const message = detailMessage ||
        (payload && typeof payload.message === 'string' ? payload.message : '') ||
        `Provider request failed with HTTP ${response.status}.`;
      throw new ProviderRequestError(
        'PROVIDER_HTTP_ERROR',
        message.slice(0, 300),
        response.status >= 500 || response.status === 429,
        response.status,
      );
    }
    if (!payload) throw new ProviderRequestError('PROVIDER_INVALID_RESPONSE', 'The provider returned an invalid response.', true);
    return payload;
  } catch (error) {
    if (error instanceof ProviderRequestError) throw error;
    throw new ProviderRequestError(
      'PROVIDER_NETWORK_ERROR',
      error instanceof Error && error.name === 'AbortError'
        ? 'The provider request timed out.'
        : 'The provider could not be reached.',
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

function falQueueUrl(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  try {
    const url = new URL(value);
    if (
      url.protocol === 'https:' &&
      url.hostname === 'queue.fal.run' &&
      !url.username &&
      !url.password
    ) {
      return url.toString();
    }
  } catch {
    // Fall through to the endpoint-derived queue URL.
  }
  return fallback;
}

function assertMiniMaxSuccess(payload: Record<string, unknown>) {
  const base = payload.base_resp as Record<string, unknown> | undefined;
  if (Number(base?.status_code ?? -1) !== 0) {
    throw new ProviderRequestError(
      `MINIMAX_${String(base?.status_code ?? 'UNKNOWN')}`,
      typeof base?.status_msg === 'string' ? base.status_msg.slice(0, 300) : 'MiniMax rejected the request.',
      [1000, 1001, 1002, 1024, 1033, 2045].includes(
        Number(base?.status_code),
      ),
    );
  }
}

export async function submitProviderGeneration(args: {
  provider: StudioModelProvider;
  modelKey: StudioVideoModelKey;
  mode: StudioGenerationMode;
  prompt: string;
  config: StudioGenerationConfig;
  secret: string;
}): Promise<ProviderSubmissionResult> {
  if (args.provider === 'fal-ai') {
    const endpoint = getServerEndpoint(args.modelKey, args.mode);
    const payload = await fetchJson(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${args.secret}`,
        'Content-Type': 'application/json',
        'X-Fal-Store-IO': '0',
        // Cinemoriq copies successful media into private R2. Keep the temporary
        // public provider object long enough for recovery if the browser closes.
        'X-Fal-Object-Lifecycle-Preference': JSON.stringify({
          expiration_duration_seconds: 7 * 24 * 60 * 60,
        }),
      },
      body: JSON.stringify(
        buildFalInput(
          args.modelKey as Exclude<StudioVideoModelKey, 'minimax-hailuo-02'>,
          args.prompt,
          args.config,
        ),
      ),
    });
    const requestId = typeof payload.request_id === 'string' ? payload.request_id : '';
    if (!requestId) throw new ProviderRequestError('PROVIDER_INVALID_RESPONSE', 'fal.ai did not return a request ID.', true);
    const base = `https://queue.fal.run/${endpoint}/requests/${encodeURIComponent(requestId)}`;
    return {
      requestId,
      statusUrl: falQueueUrl(payload.status_url, `${base}/status`),
      responseUrl: falQueueUrl(payload.response_url, `${base}/response`),
      cancelUrl: falQueueUrl(payload.cancel_url, `${base}/cancel`),
    };
  }

  const payload = await fetchJson('https://api.minimax.io/v1/video_generation', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildMiniMaxInput(args.prompt, args.config)),
  });
  assertMiniMaxSuccess(payload);
  const requestId = typeof payload.task_id === 'string' ? payload.task_id : '';
  if (!requestId) throw new ProviderRequestError('PROVIDER_INVALID_RESPONSE', 'MiniMax did not return a task ID.', true);
  return {
    requestId,
    statusUrl: `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(requestId)}`,
    responseUrl: null,
    cancelUrl: null,
  };
}

function readFalOutput(payload: Record<string, unknown>): ProviderOutput {
  const video = payload.video as Record<string, unknown> | undefined;
  const remoteUrl = typeof video?.url === 'string' ? video.url : '';
  if (!remoteUrl) throw new ProviderRequestError('PROVIDER_OUTPUT_MISSING', 'fal.ai completed without a video URL.', true);
  return {
    remoteUrl,
    mimeType: typeof video?.content_type === 'string' ? video.content_type : null,
    fileName: typeof video?.file_name === 'string' ? video.file_name : null,
    fileSize: typeof video?.file_size === 'number' ? video.file_size : null,
    width: typeof video?.width === 'number' ? video.width : null,
    height: typeof video?.height === 'number' ? video.height : null,
    seed: typeof payload.seed === 'number' ? payload.seed : null,
    expandedPrompt: typeof payload.expanded_prompt === 'string' ? payload.expanded_prompt : null,
  };
}

export async function pollProviderGeneration(args: {
  provider: StudioModelProvider;
  requestId: string;
  statusUrl: string;
  responseUrl: string | null;
  secret: string;
}): Promise<ProviderPollResult> {
  if (args.provider === 'fal-ai') {
    const payload = await fetchJson(`${args.statusUrl}?logs=1`, {
      headers: { Authorization: `Key ${args.secret}` },
    }, 30_000);
    const status = String(payload.status ?? '').toUpperCase();
    if (status === 'IN_QUEUE') return { state: 'queued', progress: 5, nextPollMs: 3_000 };
    if (status === 'IN_PROGRESS') return { state: 'processing', progress: 45, nextPollMs: 5_000 };
    if (status === 'CANCELLED' || status === 'CANCELED') return { state: 'cancelled' };
    if (status !== 'COMPLETED') {
      return { state: 'failed', code: 'PROVIDER_STATUS_UNKNOWN', message: 'fal.ai returned an unknown job status.' };
    }
    if (payload.error) {
      return { state: 'failed', code: 'PROVIDER_GENERATION_FAILED', message: 'fal.ai could not generate this video.' };
    }
    if (!args.responseUrl) return { state: 'failed', code: 'PROVIDER_RESPONSE_MISSING', message: 'fal.ai response location is unavailable.' };
    const result = await fetchJson(args.responseUrl, {
      headers: { Authorization: `Key ${args.secret}` },
    }, 30_000);
    if (result.error) return { state: 'failed', code: 'PROVIDER_GENERATION_FAILED', message: 'fal.ai could not generate this video.' };
    return { state: 'completed', output: readFalOutput(result) };
  }

  const payload = await fetchJson(args.statusUrl, {
    headers: { Authorization: `Bearer ${args.secret}` },
  }, 30_000);
  assertMiniMaxSuccess(payload);
  const status = String(payload.status ?? '');
  if (status === 'Preparing' || status === 'Queueing') {
    return { state: 'queued', progress: 8, nextPollMs: 10_000 };
  }
  if (status === 'Processing') return { state: 'processing', progress: 50, nextPollMs: 10_000 };
  if (status === 'Fail') return { state: 'failed', code: 'PROVIDER_GENERATION_FAILED', message: 'MiniMax could not generate this video.' };
  if (status !== 'Success') return { state: 'failed', code: 'PROVIDER_STATUS_UNKNOWN', message: 'MiniMax returned an unknown job status.' };
  const fileId = typeof payload.file_id === 'string' ? payload.file_id : '';
  if (!fileId) return { state: 'failed', code: 'PROVIDER_OUTPUT_MISSING', message: 'MiniMax completed without a file ID.' };
  const filePayload = await fetchJson(
    `https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`,
    { headers: { Authorization: `Bearer ${args.secret}` } },
    30_000,
  );
  assertMiniMaxSuccess(filePayload);
  const file = filePayload.file as Record<string, unknown> | undefined;
  const remoteUrl = typeof file?.download_url === 'string' ? file.download_url : '';
  if (!remoteUrl) return { state: 'failed', code: 'PROVIDER_OUTPUT_MISSING', message: 'MiniMax completed without a download URL.' };
  return {
    state: 'completed',
    output: {
      remoteUrl,
      mimeType: 'video/mp4',
      fileName: typeof file?.filename === 'string' ? file.filename : null,
      fileSize: typeof file?.bytes === 'number' ? file.bytes : null,
      width: typeof payload.video_width === 'number' ? payload.video_width : null,
      height: typeof payload.video_height === 'number' ? payload.video_height : null,
      seed: null,
      expandedPrompt: null,
    },
  };
}

export async function cancelProviderGeneration(args: {
  provider: StudioModelProvider;
  cancelUrl: string | null;
  secret: string;
}): Promise<ProviderCancellationResult | null> {
  if (args.provider !== 'fal-ai' || !args.cancelUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(args.cancelUrl, {
      method: 'PUT',
      headers: { Authorization: `Key ${args.secret}` },
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const status = String(payload?.status ?? '').toUpperCase();
    if (response.status === 202 || status === 'CANCELLATION_REQUESTED') {
      return 'cancellation-requested';
    }
    if (status === 'ALREADY_COMPLETED') return 'already-completed';
    if (response.status === 404 || status === 'NOT_FOUND') return 'not-found';
    throw new ProviderRequestError(
      'PROVIDER_CANCEL_ERROR',
      'fal.ai could not confirm the cancellation request.',
      response.status >= 500 || response.status === 429,
    );
  } catch (error) {
    if (error instanceof ProviderRequestError) throw error;
    throw new ProviderRequestError(
      'PROVIDER_CANCEL_NETWORK_ERROR',
      'fal.ai cancellation could not be confirmed. The job remains monitored.',
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}
