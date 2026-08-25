import type { GenerationJobRow } from '../../db/schema';
import {
  estimateGenerationCost,
  GENERATION_COST_LIMIT_USD,
  getAspectOptions,
  getResolutionOptions,
  getVideoModel,
  isStudioGenerationMode,
  isStudioVideoModelKey,
  validateGenerationConfig,
  type StudioGenerationConfig,
  type StudioGenerationMode,
  type StudioModelProvider,
  type StudioVideoModelKey,
} from '../../components/studio/video-model-catalog';
import type {
  GenerationJobResponse,
  GenerationJobStatus,
  GenerationJobView,
  GenerationOutputMetadata,
  GenerationSubmission,
} from '../generation-contract';
import { GenerationApiException } from './api-errors';
import {
  acquireGenerationPollLease,
  countActiveGenerationJobs,
  countRecentGenerationJobs,
  getGenerationJob,
  getGenerationJobByIdempotencyKey,
  getGenerationJobByVersion,
  insertGenerationJob,
  listGenerationJobsForCampaign,
  updateGenerationJob,
  updateGenerationJobIfCurrent,
} from './generation-jobs';
import {
  ProviderRequestError,
  cancelProviderGeneration,
  getServerEndpoint,
  pollProviderGeneration,
  submitProviderGeneration,
  type ProviderOutput,
} from './generation-providers';
import { getRuntimeEnv } from './runtime-env';

const MAXIMUM_MEDIA_BYTES = 500 * 1024 * 1024;
const ACTIVE_JOB_LIMIT = 2;
const SUBMISSION_LIMIT_PER_MINUTE = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(
  value: unknown,
  field: string,
  maximumLength: number,
  pattern?: RegExp,
) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maximumLength || (pattern && !pattern.test(text))) {
    throw new GenerationApiException(
      400,
      'INVALID_REQUEST',
      `Check the ${field} field and try again.`,
      false,
      { [field]: `Enter a valid ${field}.` },
    );
  }
  return text;
}

function optionalString(value: unknown, maximumLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) : '';
}

function stringList(value: unknown, maximumItems: number) {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new GenerationApiException(400, 'INVALID_REQUEST', 'Reference asset limits were exceeded.');
  }
  return value.map((item) => {
    if (typeof item !== 'string' || item.length > 2_048) {
      throw new GenerationApiException(400, 'INVALID_REQUEST', 'A reference asset URL is invalid.');
    }
    return item.trim();
  }).filter(Boolean);
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  );
}

function assertSafeHttpsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GenerationApiException(400, 'INVALID_MEDIA_URL', 'Reference assets must use valid HTTPS URLs.');
  }
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '[::1]' ||
    (hostname.includes(':') &&
      (hostname.replace(/^\[|\]$/g, '').startsWith('fc') ||
        hostname.replace(/^\[|\]$/g, '').startsWith('fd') ||
        hostname.replace(/^\[|\]$/g, '').startsWith('fe80:'))) ||
    isPrivateIpv4(hostname)
  ) {
    throw new GenerationApiException(400, 'UNSAFE_MEDIA_URL', 'Reference assets must use public HTTPS URLs.');
  }
  return url;
}

function parseGenerationConfig(value: unknown): StudioGenerationConfig {
  if (!isRecord(value) || !isStudioVideoModelKey(value.modelKey) || !isStudioGenerationMode(value.mode)) {
    throw new GenerationApiException(400, 'INVALID_MODEL_CONFIG', 'Select a supported model and generation mode.');
  }
  const modelKey = value.modelKey;
  const mode = value.mode;
  const model = getVideoModel(modelKey);
  if (!model.modes.some((candidate) => candidate.key === mode)) {
    throw new GenerationApiException(400, 'MODE_NOT_SUPPORTED', 'The selected model does not support this generation mode.');
  }
  const duration = value.duration;
  if ((duration !== 'auto' && (typeof duration !== 'number' || !Number.isInteger(duration))) || !model.durationOptions.includes(duration as never)) {
    throw new GenerationApiException(400, 'INVALID_DURATION', 'Select a supported generation duration.');
  }
  const resolution = optionalString(value.resolution, 16);
  const aspectRatio = optionalString(value.aspectRatio, 16);
  if (!getResolutionOptions(modelKey, duration, mode).some((option) => option.value === resolution)) {
    throw new GenerationApiException(400, 'INVALID_RESOLUTION', 'Select a supported output resolution.');
  }
  if (!getAspectOptions(modelKey, mode).some((option) => option.value === aspectRatio)) {
    throw new GenerationApiException(400, 'INVALID_ASPECT_RATIO', 'Select a supported aspect ratio.');
  }
  const config: StudioGenerationConfig = {
    modelKey,
    mode,
    duration,
    resolution,
    aspectRatio,
    audioEnabled: value.audioEnabled === true,
    startImageUrl: optionalString(value.startImageUrl, 2_048),
    endImageUrl: optionalString(value.endImageUrl, 2_048),
    referenceImageUrls: stringList(value.referenceImageUrls, 9),
    referenceVideoUrls: stringList(value.referenceVideoUrls, 3),
    referenceAudioUrls: stringList(value.referenceAudioUrls, 3),
    negativePrompt: optionalString(value.negativePrompt, 1_200),
    shotType: value.shotType === 'intelligent' ? 'intelligent' : 'customize',
    bitrateMode: value.bitrateMode === 'high' ? 'high' : 'standard',
    promptExpansionMode: ['disabled', 'fast', 'balanced', 'quality'].includes(String(value.promptExpansionMode))
      ? (value.promptExpansionMode as StudioGenerationConfig['promptExpansionMode'])
      : 'balanced',
    seed: optionalString(value.seed, 24),
  };
  if (model.audio === 'required' && !config.audioEnabled) {
    throw new GenerationApiException(400, 'AUDIO_REQUIRED', `${model.name} always generates native audio.`);
  }
  if (model.audio === 'unsupported' && config.audioEnabled) {
    throw new GenerationApiException(400, 'AUDIO_UNSUPPORTED', `${model.name} does not support native audio.`);
  }
  if (config.seed && !/^-?\d{1,20}$/.test(config.seed)) {
    throw new GenerationApiException(400, 'INVALID_SEED', 'Seed must be a whole number.');
  }
  [
    config.startImageUrl,
    config.endImageUrl,
    ...config.referenceImageUrls,
    ...config.referenceVideoUrls,
    ...config.referenceAudioUrls,
  ].filter(Boolean).forEach(assertSafeHttpsUrl);
  return config;
}

export function parseGenerationSubmission(value: unknown): GenerationSubmission {
  if (!isRecord(value) || !isRecord(value.confirmations)) {
    throw new GenerationApiException(400, 'INVALID_REQUEST', 'The generation request is incomplete.');
  }
  const idPattern = /^[A-Za-z0-9._:-]+$/;
  const submission: GenerationSubmission = {
    campaignId: value.campaignId === undefined ? undefined : requiredString(value.campaignId, 'campaignId', 160, idPattern),
    sceneId: requiredString(value.sceneId, 'sceneId', 180, idPattern),
    versionId: requiredString(value.versionId, 'versionId', 180, idPattern),
    prompt: requiredString(value.prompt, 'prompt', 2_000),
    config: parseGenerationConfig(value.config),
    confirmations: {
      assetRights: value.confirmations.assetRights === true,
      noUnauthorizedIdentity: value.confirmations.noUnauthorizedIdentity === true,
      humanReview: value.confirmations.humanReview === true,
    },
    maximumCostUsd: typeof value.maximumCostUsd === 'number' ? value.maximumCostUsd : Number.NaN,
  };
  if (!Object.values(submission.confirmations).every(Boolean)) {
    throw new GenerationApiException(403, 'GUARDRAILS_REQUIRED', 'Confirm asset rights, identity authorization, and human review before generation.');
  }
  if (!Number.isFinite(submission.maximumCostUsd) || submission.maximumCostUsd <= 0 || submission.maximumCostUsd > GENERATION_COST_LIMIT_USD) {
    throw new GenerationApiException(400, 'INVALID_COST_LIMIT', `Maximum cost must be between $0.01 and $${GENERATION_COST_LIMIT_USD.toFixed(2)}.`);
  }
  const errors = validateGenerationConfig(submission.config, submission.prompt);
  if (errors.length) throw new GenerationApiException(400, 'INVALID_MODEL_CONFIG', errors[0]);
  return submission;
}

function getIdempotencyKey(request: Request) {
  const value = request.headers.get('idempotency-key')?.trim() ?? '';
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(value)) {
    throw new GenerationApiException(400, 'IDEMPOTENCY_KEY_REQUIRED', 'A valid Idempotency-Key header is required.');
  }
  return value;
}

async function hashRequest(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function storageSafeSubmission(submission: GenerationSubmission): GenerationSubmission {
  return {
    ...submission,
    config: {
      ...submission.config,
      // Temporary fal CDN input URLs are intentionally not retained in D1.
      startImageUrl: '',
      endImageUrl: '',
      referenceImageUrls: [],
      referenceVideoUrls: [],
      referenceAudioUrls: [],
    },
  };
}

function parseOutput(row: GenerationJobRow) {
  if (!row.output_json) return null;
  try {
    return JSON.parse(row.output_json) as GenerationOutputMetadata;
  } catch {
    return null;
  }
}

function pollDelay(row: GenerationJobRow) {
  if (row.status === 'submitting') return 2_000;
  if (row.status === 'queued') return row.provider === 'minimax-direct' ? 10_000 : 3_000;
  if (row.status === 'processing') return row.provider === 'minimax-direct' ? 10_000 : 5_000;
  if (row.status === 'storing') return 2_000;
  return 0;
}

export function toGenerationJobResponse(row: GenerationJobRow): GenerationJobResponse {
  const status = row.status as GenerationJobStatus;
  const job: GenerationJobView = {
    id: row.id,
    campaignId: row.campaign_id,
    sceneId: row.scene_id,
    versionId: row.version_id,
    provider: row.provider,
    modelKey: row.model_key as StudioVideoModelKey,
    mode: row.generation_mode as StudioGenerationMode,
    status,
    progress: Math.min(100, Math.max(0, row.progress)),
    providerRequestId: row.provider_request_id,
    mediaUrl: status === 'succeeded' && row.object_key ? `/api/studio/generations/${encodeURIComponent(row.id)}/media` : null,
    error: row.error_message,
    estimatedCostUsd: row.estimated_cost_usd,
    output: parseOutput(row),
    reviewState: row.review_state,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
  return { job, pollAfterMs: pollDelay(row) };
}

function providerSecret(provider: StudioModelProvider) {
  const runtime = getRuntimeEnv();
  const secret = provider === 'fal-ai' ? runtime.FAL_KEY : runtime.MINIMAX_API_KEY;
  if (!secret?.trim()) {
    throw new GenerationApiException(
      503,
      'PROVIDER_NOT_CONFIGURED',
      provider === 'fal-ai' ? 'fal.ai is not connected yet.' : 'MiniMax Direct is not connected yet.',
    );
  }
  return secret.trim();
}

function assertInfrastructure() {
  const runtime = getRuntimeEnv();
  if (!runtime.DB || !runtime.MEDIA) {
    throw new GenerationApiException(503, 'STORAGE_NOT_CONFIGURED', 'Cinemoriq generation storage is not available yet.', true);
  }
}

export async function submitGeneration(request: Request, body: unknown) {
  assertInfrastructure();
  const submission = parseGenerationSubmission(body);
  const idempotencyKey = getIdempotencyKey(request);
  const requestHash = await hashRequest(submission);
  const existing = await getGenerationJobByIdempotencyKey(idempotencyKey);
  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw new GenerationApiException(409, 'IDEMPOTENCY_CONFLICT', 'This idempotency key was already used for a different request.');
    }
    return toGenerationJobResponse(existing);
  }
  const existingVersion = await getGenerationJobByVersion(
    submission.sceneId,
    submission.versionId,
  );
  if (existingVersion) {
    if (existingVersion.request_hash === requestHash) {
      return toGenerationJobResponse(existingVersion);
    }
    throw new GenerationApiException(
      409,
      'VERSION_ALREADY_SUBMITTED',
      'This exact scene version already has a provider job. Open its stored result or create a new variant.',
    );
  }

  if ((await countActiveGenerationJobs()) >= ACTIVE_JOB_LIMIT) {
    throw new GenerationApiException(429, 'ACTIVE_JOB_LIMIT', 'Wait for an active generation to finish before starting another.', true);
  }
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  if ((await countRecentGenerationJobs(minuteAgo)) >= SUBMISSION_LIMIT_PER_MINUTE) {
    throw new GenerationApiException(429, 'SUBMISSION_RATE_LIMIT', 'Generation is limited to five submissions per minute.', true);
  }

  const model = getVideoModel(submission.config.modelKey);
  const provider = model.provider;
  const secret = providerSecret(provider);
  const cost = estimateGenerationCost(submission.config);
  if (cost.amount > submission.maximumCostUsd || cost.amount > GENERATION_COST_LIMIT_USD) {
    throw new GenerationApiException(409, 'COST_LIMIT_EXCEEDED', `Estimated cost $${cost.amount.toFixed(2)} exceeds the approved maximum.`);
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const endpoint = getServerEndpoint(submission.config.modelKey, submission.config.mode);
  const row: GenerationJobRow = {
    id,
    campaign_id: submission.campaignId ?? null,
    scene_id: submission.sceneId,
    version_id: submission.versionId,
    idempotency_key: idempotencyKey,
    provider,
    model_key: submission.config.modelKey,
    generation_mode: submission.config.mode,
    endpoint_id: endpoint,
    status: 'submitting',
    progress: 0,
    provider_request_id: null,
    provider_status_url: null,
    provider_response_url: null,
    provider_cancel_url: null,
    input_json: JSON.stringify(storageSafeSubmission(submission)),
    request_hash: requestHash,
    output_json: null,
    object_key: null,
    mime_type: null,
    file_size: null,
    error_code: null,
    error_message: null,
    estimated_cost_usd: cost.amount,
    maximum_cost_usd: submission.maximumCostUsd,
    next_poll_at: null,
    poll_lease_until: null,
    poll_error_count: 0,
    cancellation_requested_at: null,
    review_state: 'draft',
    reviewed_at: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };
  try {
    await insertGenerationJob(row);
  } catch (error) {
    const raced = await getGenerationJobByIdempotencyKey(idempotencyKey);
    if (raced?.request_hash === requestHash) return toGenerationJobResponse(raced);
    const racedVersion = await getGenerationJobByVersion(
      submission.sceneId,
      submission.versionId,
    );
    if (racedVersion?.request_hash === requestHash) {
      return toGenerationJobResponse(racedVersion);
    }
    throw error;
  }

  try {
    const submitted = await submitProviderGeneration({
      provider,
      modelKey: submission.config.modelKey,
      mode: submission.config.mode,
      prompt: submission.prompt,
      config: submission.config,
      secret,
    });
    const updated = await updateGenerationJob(id, {
      status: 'queued',
      progress: 2,
      provider_request_id: submitted.requestId,
      provider_status_url: submitted.statusUrl,
      provider_response_url: submitted.responseUrl,
      provider_cancel_url: submitted.cancelUrl,
      next_poll_at: Date.now() + (provider === 'minimax-direct' ? 10_000 : 3_000),
      updated_at: new Date().toISOString(),
    });
    if (!updated) throw new GenerationApiException(500, 'JOB_NOT_FOUND', 'The generation job could not be stored.');
    return toGenerationJobResponse(updated);
  } catch (error) {
    const message = error instanceof ProviderRequestError ? error.message : 'The provider submission could not be confirmed.';
    const failed = await updateGenerationJob(id, {
      status: 'failed',
      error_code: error instanceof ProviderRequestError ? error.code : 'SUBMISSION_UNKNOWN',
      error_message: `${message} No automatic retry was made to prevent duplicate billing.`.slice(0, 500),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (failed) return toGenerationJobResponse(failed);
    throw error;
  }
}

async function fetchProviderMedia(remoteUrl: string) {
  let url = assertSafeHttpsUrl(remoteUrl);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    let response: Response;
    try {
      response = await fetch(url, { redirect: 'manual' });
    } catch {
      throw new GenerationApiException(
        502,
        'MEDIA_DOWNLOAD_FAILED',
        'Provider media could not be downloaded yet.',
        true,
      );
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirect === 3) throw new GenerationApiException(502, 'MEDIA_REDIRECT_FAILED', 'Provider media could not be downloaded.', true);
      url = assertSafeHttpsUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok || !response.body) throw new GenerationApiException(502, 'MEDIA_DOWNLOAD_FAILED', 'Provider media could not be downloaded.', true);
    const contentType = (response.headers.get('content-type') ?? 'video/mp4').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('video/') && contentType !== 'application/octet-stream') {
      throw new GenerationApiException(502, 'INVALID_MEDIA_TYPE', 'The provider output was not a video.');
    }
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > MAXIMUM_MEDIA_BYTES) throw new GenerationApiException(413, 'MEDIA_TOO_LARGE', 'Provider video exceeds the 500 MB storage limit.');
    return { response, contentType: contentType === 'application/octet-stream' ? 'video/mp4' : contentType };
  }
  throw new GenerationApiException(502, 'MEDIA_DOWNLOAD_FAILED', 'Provider media could not be downloaded.', true);
}

async function storeProviderOutput(job: GenerationJobRow, output: ProviderOutput) {
  const bucket = getRuntimeEnv().MEDIA;
  if (!bucket) throw new GenerationApiException(503, 'STORAGE_NOT_CONFIGURED', 'Cinemoriq media storage is not available.', true);
  const { response, contentType } = await fetchProviderMedia(output.remoteUrl);
  const reader = response.body!.getReader();
  let received = 0;
  let sizeLimitExceeded = false;
  const guardedStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const chunk = await reader.read();
      if (chunk.done) {
        controller.close();
        return;
      }
      received += chunk.value.byteLength;
      if (received > MAXIMUM_MEDIA_BYTES) {
        sizeLimitExceeded = true;
        await reader.cancel('Media size limit exceeded');
        controller.error(new Error('Media size limit exceeded'));
        return;
      }
      controller.enqueue(chunk.value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  const objectKey = `generations/${job.id}/output.mp4`;
  try {
    await bucket.put(objectKey, guardedStream, {
      httpMetadata: { contentType },
      customMetadata: {
        generationId: job.id,
        provider: job.provider,
        model: job.model_key,
      },
    });
  } catch {
    if (sizeLimitExceeded) {
      throw new GenerationApiException(
        413,
        'MEDIA_TOO_LARGE',
        'Provider video exceeds the 500 MB storage limit.',
      );
    }
    throw new GenerationApiException(
      503,
      'MEDIA_STORAGE_FAILED',
      'The paid provider output is ready, but private storage is temporarily unavailable. Cinemoriq will retry without regenerating.',
      true,
    );
  }
  const input = JSON.parse(job.input_json) as GenerationSubmission;
  const model = getVideoModel(input.config.modelKey);
  const metadata: GenerationOutputMetadata = {
    provider: job.provider,
    providerRequestId: job.provider_request_id ?? '',
    modelKey: input.config.modelKey,
    mimeType: contentType,
    fileSize: received || output.fileSize,
    fileName: output.fileName,
    durationSeconds: typeof input.config.duration === 'number' ? input.config.duration : null,
    width: output.width,
    height: output.height,
    hasAudio: model.audio === 'required' ? true : model.audio === 'unsupported' ? false : input.config.audioEnabled,
    seed: output.seed,
    expandedPrompt: output.expandedPrompt,
  };
  return { objectKey, metadata, fileSize: received || output.fileSize, contentType };
}

export async function refreshGeneration(id: string) {
  assertInfrastructure();
  let row = await getGenerationJob(id);
  if (!row) throw new GenerationApiException(404, 'JOB_NOT_FOUND', 'Generation job not found.');
  if (['succeeded', 'failed', 'cancelled'].includes(row.status)) return toGenerationJobResponse(row);
  if (row.status === 'submitting') {
    if (Date.now() - Date.parse(row.created_at) < 120_000) return toGenerationJobResponse(row);
    const failed = await updateGenerationJobIfCurrent(
      id,
      ['submitting'],
      row.poll_lease_until,
      {
        status: 'failed',
        error_code: 'SUBMISSION_UNKNOWN',
        error_message:
          'Provider submission could not be confirmed. No automatic retry was made to prevent duplicate billing.',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    );
    return toGenerationJobResponse(failed.row ?? row);
  }
  const nowMs = Date.now();
  if (row.next_poll_at && row.next_poll_at > nowMs) return toGenerationJobResponse(row);
  const leaseToken = nowMs + 30_000;
  const leased = await acquireGenerationPollLease(id, nowMs, leaseToken);
  if (!leased) return toGenerationJobResponse((await getGenerationJob(id)) ?? row);
  row = (await getGenerationJob(id)) ?? row;
  if (
    ['succeeded', 'failed', 'cancelled'].includes(row.status) ||
    row.poll_lease_until !== leaseToken
  ) {
    return toGenerationJobResponse(row);
  }
  let expectedStatus = row.status;
  let expectedLease = leaseToken;
  if (!row.provider_request_id || !row.provider_status_url) {
    const failed = await updateGenerationJobIfCurrent(
      id,
      [expectedStatus],
      expectedLease,
      {
        status: 'failed',
        error_code: 'PROVIDER_REQUEST_MISSING',
        error_message: 'Provider request details are unavailable.',
        completed_at: new Date().toISOString(),
        poll_lease_until: null,
        updated_at: new Date().toISOString(),
      },
    );
    return toGenerationJobResponse(failed.row ?? row);
  }
  try {
    const result = await pollProviderGeneration({
      provider: row.provider,
      requestId: row.provider_request_id,
      statusUrl: row.provider_status_url,
      responseUrl: row.provider_response_url,
      secret: providerSecret(row.provider),
    });
    if (result.state === 'queued' || result.state === 'processing') {
      const updated = await updateGenerationJobIfCurrent(
        id,
        [expectedStatus],
        expectedLease,
        {
          status: result.state,
          progress: result.progress,
          error_code: null,
          error_message: null,
          poll_error_count: 0,
          next_poll_at: Date.now() + result.nextPollMs,
          poll_lease_until: null,
          updated_at: new Date().toISOString(),
        },
      );
      return toGenerationJobResponse(updated.row ?? row);
    }
    if (result.state === 'cancelled') {
      const completedAt = new Date().toISOString();
      const updated = await updateGenerationJobIfCurrent(
        id,
        [expectedStatus],
        expectedLease,
        {
          status: 'cancelled',
          progress: 0,
          error_code: 'CANCELLED_BY_USER',
          error_message: null,
          completed_at: completedAt,
          poll_lease_until: null,
          updated_at: completedAt,
        },
      );
      return toGenerationJobResponse(updated.row ?? row);
    }
    if (result.state === 'failed') {
      const updated = await updateGenerationJobIfCurrent(
        id,
        [expectedStatus],
        expectedLease,
        {
          status: 'failed',
          error_code: result.code,
          error_message: result.message.slice(0, 500),
          completed_at: new Date().toISOString(),
          poll_lease_until: null,
          updated_at: new Date().toISOString(),
        },
      );
      return toGenerationJobResponse(updated.row ?? row);
    }
    const storageLease = Date.now() + 15 * 60_000;
    const storing = await updateGenerationJobIfCurrent(
      id,
      [expectedStatus],
      expectedLease,
      {
        status: 'storing',
        progress: 92,
        next_poll_at: null,
        poll_lease_until: storageLease,
        updated_at: new Date().toISOString(),
      },
    );
    if (!storing.updated || !storing.row) {
      return toGenerationJobResponse(storing.row ?? row);
    }
    row = storing.row;
    expectedStatus = 'storing';
    expectedLease = storageLease;
    const stored = await storeProviderOutput(row, result.output);
    const completedAt = new Date().toISOString();
    const updated = await updateGenerationJobIfCurrent(
      id,
      [expectedStatus],
      expectedLease,
      {
        status: 'succeeded',
        progress: 100,
        output_json: JSON.stringify(stored.metadata),
        object_key: stored.objectKey,
        mime_type: stored.contentType,
        file_size: stored.fileSize,
        provider_response_url: null,
        poll_lease_until: null,
        poll_error_count: 0,
        review_state: 'in-review',
        completed_at: completedAt,
        updated_at: completedAt,
      },
    );
    return toGenerationJobResponse(updated.row ?? row);
  } catch (error) {
    if (
      error instanceof ProviderRequestError &&
      error.httpStatus === 404 &&
      row.provider === 'fal-ai' &&
      row.cancellation_requested_at
    ) {
      const completedAt = new Date().toISOString();
      const cancelled = await updateGenerationJobIfCurrent(
        id,
        [expectedStatus],
        expectedLease,
        {
          status: 'cancelled',
          progress: 0,
          error_code: 'CANCELLED_BY_USER',
          error_message: null,
          completed_at: completedAt,
          poll_lease_until: null,
          updated_at: completedAt,
        },
      );
      return toGenerationJobResponse(cancelled.row ?? row);
    }
    const retryable =
      (error instanceof ProviderRequestError && error.retryable) ||
      (error instanceof GenerationApiException && error.retryable);
    const nextErrorCount = row.poll_error_count + 1;
    const maximumRetries = row.status === 'storing' ? 144 : 12;
    if (retryable && nextErrorCount <= maximumRetries) {
      const retryDelay = Math.min(
        60_000,
        5_000 * 2 ** Math.min(nextErrorCount - 1, 4),
      );
      const updated = await updateGenerationJobIfCurrent(
        id,
        [expectedStatus],
        expectedLease,
        {
          next_poll_at: Date.now() + retryDelay,
          poll_lease_until: null,
          poll_error_count: nextErrorCount,
          error_code:
            error instanceof ProviderRequestError ? error.code : 'FINALIZATION_RETRY',
          error_message: `${error.message} The paid job is preserved and will be retried.`.slice(
            0,
            500,
          ),
          updated_at: new Date().toISOString(),
        },
      );
      return toGenerationJobResponse(updated.row ?? row);
    }
    const message = error instanceof Error ? error.message : 'Generation polling failed.';
    const updated = await updateGenerationJobIfCurrent(
      id,
      [expectedStatus],
      expectedLease,
      {
        status: 'failed',
        error_code:
          error instanceof ProviderRequestError
            ? error.code
            : 'FINALIZATION_FAILED',
        error_message: message.slice(0, 500),
        poll_error_count: nextErrorCount,
        completed_at: new Date().toISOString(),
        poll_lease_until: null,
        updated_at: new Date().toISOString(),
      },
    );
    return toGenerationJobResponse(updated.row ?? row);
  }
}

export async function listCampaignGenerations(campaignId: string) {
  assertInfrastructure();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(campaignId)) {
    throw new GenerationApiException(
      400,
      'INVALID_CAMPAIGN_ID',
      'Choose a valid campaign before loading generation history.',
    );
  }
  const rows = await listGenerationJobsForCampaign(campaignId);
  return { jobs: rows.map((row) => toGenerationJobResponse(row).job) };
}

export async function cancelGeneration(id: string) {
  assertInfrastructure();
  const row = await getGenerationJob(id);
  if (!row) throw new GenerationApiException(404, 'JOB_NOT_FOUND', 'Generation job not found.');
  if (['succeeded', 'failed', 'cancelled'].includes(row.status)) return toGenerationJobResponse(row);
  if (row.status === 'storing') {
    throw new GenerationApiException(
      409,
      'OUTPUT_FINALIZING',
      'The provider has already finished. Cinemoriq is preserving the paid output now.',
    );
  }
  if (row.provider !== 'fal-ai') {
    throw new GenerationApiException(409, 'CANCELLATION_UNSUPPORTED', 'MiniMax Direct does not document task cancellation. This job will continue so its paid result is not lost.');
  }
  const outcome = await cancelProviderGeneration({
    provider: row.provider,
    cancelUrl: row.provider_cancel_url,
    secret: providerSecret(row.provider),
  });
  if (!outcome) {
    throw new GenerationApiException(
      409,
      'CANCELLATION_UNAVAILABLE',
      'This provider job does not expose a cancellation request.',
    );
  }
  if (outcome === 'already-completed') {
    await updateGenerationJob(id, {
      next_poll_at: 0,
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    });
    return refreshGeneration(id);
  }
  if (outcome === 'not-found') {
    const now = new Date().toISOString();
    const failed = await updateGenerationJobIfCurrent(
      id,
      [row.status],
      row.poll_lease_until,
      {
        status: 'failed',
        error_code: 'PROVIDER_JOB_NOT_FOUND',
        error_message: 'fal.ai could not find this provider request.',
        completed_at: now,
        updated_at: now,
      },
    );
    return toGenerationJobResponse(failed.row ?? row);
  }
  const now = new Date().toISOString();
  const updated = await updateGenerationJobIfCurrent(
    id,
    [row.status],
    row.poll_lease_until,
    {
      error_code: 'CANCELLATION_REQUESTED',
      error_message:
        'Cancellation requested. Cinemoriq will keep monitoring in case the paid job completes first.',
      next_poll_at: 0,
      cancellation_requested_at: now,
      updated_at: now,
      poll_lease_until: null,
    },
  );
  return toGenerationJobResponse(updated.row ?? row);
}

export async function reviewGeneration(id: string, state: 'approved' | 'changes-requested') {
  assertInfrastructure();
  const row = await getGenerationJob(id);
  if (!row) throw new GenerationApiException(404, 'JOB_NOT_FOUND', 'Generation job not found.');
  if (row.status !== 'succeeded') throw new GenerationApiException(409, 'JOB_NOT_REVIEWABLE', 'Only completed videos can be reviewed.');
  const now = new Date().toISOString();
  const updated = await updateGenerationJob(id, {
    review_state: state,
    reviewed_at: now,
    updated_at: now,
  });
  return toGenerationJobResponse(updated ?? row);
}
