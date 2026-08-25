import type {
  StudioGenerationConfig,
  StudioModelProvider,
  StudioVideoModelKey,
} from '../components/studio/video-model-catalog';

export const GENERATION_JOB_STATUSES = [
  'submitting',
  'queued',
  'processing',
  'storing',
  'succeeded',
  'failed',
  'cancelled',
] as const;

export type GenerationJobStatus = (typeof GENERATION_JOB_STATUSES)[number];

export type GenerationSubmission = {
  campaignId?: string;
  sceneId: string;
  versionId: string;
  prompt: string;
  config: StudioGenerationConfig;
  confirmations: {
    assetRights: boolean;
    noUnauthorizedIdentity: boolean;
    humanReview: boolean;
  };
  maximumCostUsd: number;
};

export type GenerationOutputMetadata = {
  provider: StudioModelProvider;
  providerRequestId: string;
  modelKey: StudioVideoModelKey;
  mimeType: string;
  fileSize: number | null;
  fileName: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean | null;
  seed: number | null;
  expandedPrompt: string | null;
};

export type GenerationJobView = {
  id: string;
  provider: StudioModelProvider;
  modelKey: StudioVideoModelKey;
  mode: StudioGenerationConfig['mode'];
  status: GenerationJobStatus;
  progress: number;
  providerRequestId: string | null;
  mediaUrl: string | null;
  error: string | null;
  estimatedCostUsd: number | null;
  output: GenerationOutputMetadata | null;
  reviewState: 'draft' | 'in-review' | 'approved' | 'changes-requested';
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type GenerationJobResponse = {
  job: GenerationJobView;
  pollAfterMs: number;
};

export type GenerationApiError = {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    fieldErrors?: Record<string, string>;
  };
};

export type ConnectionStatusResponse = {
  fal: { configured: boolean };
  minimax: { configured: boolean };
  database: { configured: boolean };
  mediaStorage: { configured: boolean };
};

export function isTerminalGenerationStatus(status: GenerationJobStatus) {
  return ['succeeded', 'failed', 'cancelled'].includes(status);
}
