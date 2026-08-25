import {
  STUDIO_SESSION_SCHEMA_VERSION,
  STUDIO_SESSIONS_STORAGE_KEY,
  type StudioApprovalState,
  type StudioGenerationState,
  type StudioScene,
  type StudioSession,
  type StudioVersion,
} from './studio-model';
import {
  createDefaultGenerationConfig,
  getVideoModel,
  isStudioGenerationMode,
  isStudioVideoModelKey,
  reconcileGenerationConfig,
  type StudioGenerationConfig,
  type StudioVideoModelKey,
} from './video-model-catalog';
import type { GenerationOutputMetadata } from '../../lib/generation-contract';

type StudioCollection = {
  schemaVersion: number;
  sessions: StudioSession[];
};

const styles = ['Cinematic', 'Minimal', 'Noir', 'Documentary'] as const;
const lightingOptions = [
  'High Contrast / Low Key',
  'Soft Diffused',
  'Neon / Cyberpunk',
  'Natural Daylight',
] as const;
const approvalStates: StudioApprovalState[] = [
  'draft',
  'in-review',
  'approved',
  'changes-requested',
];
const generationStates: StudioGenerationState[] = [
  'idle',
  'queued',
  'generating',
  'ready',
  'failed',
  'cancelled',
];

function finiteNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function safeText(value: unknown, maxLength = 2048) {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function safeTextList(value: unknown, maxItems: number) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.slice(0, 2048))
        .slice(0, maxItems)
    : [];
}

function legacyModelKey(value: unknown): StudioVideoModelKey {
  if (value === 'Kling') return 'kling-v3-standard';
  if (value === 'Seedance') return 'seedance-2.0';
  return 'veo-3.1';
}

function sanitizeGenerationConfig(
  value: unknown,
  legacyPreset: unknown,
): StudioGenerationConfig {
  const raw = value && typeof value === 'object'
    ? (value as Partial<StudioGenerationConfig>)
    : {};
  const modelKey = isStudioVideoModelKey(raw.modelKey)
    ? raw.modelKey
    : legacyModelKey(legacyPreset);
  const model = getVideoModel(modelKey);
  const requestedMode = isStudioGenerationMode(raw.mode)
    ? raw.mode
    : model.modes[0].key;
  const initial = createDefaultGenerationConfig(modelKey);
  const duration =
    raw.duration === 'auto' ||
    (typeof raw.duration === 'number' && Number.isFinite(raw.duration))
      ? raw.duration
      : initial.duration;
  const candidate: StudioGenerationConfig = {
    ...initial,
    mode: requestedMode,
    duration,
    resolution: safeText(raw.resolution, 32) || initial.resolution,
    aspectRatio: safeText(raw.aspectRatio, 16) || initial.aspectRatio,
    audioEnabled:
      typeof raw.audioEnabled === 'boolean'
        ? raw.audioEnabled
        : initial.audioEnabled,
    startImageUrl: safeText(raw.startImageUrl),
    endImageUrl: safeText(raw.endImageUrl),
    referenceImageUrls: safeTextList(raw.referenceImageUrls, 9),
    referenceVideoUrls: safeTextList(raw.referenceVideoUrls, 3),
    referenceAudioUrls: safeTextList(raw.referenceAudioUrls, 3),
    negativePrompt: safeText(raw.negativePrompt, 1200),
    shotType: raw.shotType === 'intelligent' ? 'intelligent' : 'customize',
    bitrateMode: raw.bitrateMode === 'high' ? 'high' : 'standard',
    promptExpansionMode: ['disabled', 'fast', 'balanced', 'quality'].includes(
      raw.promptExpansionMode ?? '',
    )
      ? (raw.promptExpansionMode as StudioGenerationConfig['promptExpansionMode'])
      : 'balanced',
    seed: safeText(raw.seed, 24),
  };
  return reconcileGenerationConfig(candidate, modelKey, requestedMode);
}

function sanitizeVersion(value: unknown): StudioVersion | null {
  if (!value || typeof value !== 'object') return null;
  const version = value as Partial<StudioVersion>;
  if (typeof version.id !== 'string' || !version.id) return null;
  const persistedGeneration = generationStates.includes(
    version.generationState as StudioGenerationState,
  )
    ? (version.generationState as StudioGenerationState)
    : 'idle';
  const generationJobId =
    typeof version.generationJobId === 'string' && version.generationJobId.length <= 100
      ? version.generationJobId
      : null;
  const generationState =
    ['queued', 'generating'].includes(persistedGeneration) && !generationJobId
      ? 'cancelled'
      : persistedGeneration;
  const approvalState = approvalStates.includes(
    version.approvalState as StudioApprovalState,
  )
    ? (version.approvalState as StudioApprovalState)
    : 'draft';
  return {
    id: version.id,
    number: finiteNumber(version.number, 1, 1, 99),
    createdAt:
      typeof version.createdAt === 'string' &&
      !Number.isNaN(Date.parse(version.createdAt))
        ? version.createdAt
        : new Date().toISOString(),
    mediaSrc:
      typeof version.mediaSrc === 'string' && version.mediaSrc.startsWith('/')
        ? version.mediaSrc
        : null,
    mediaType: version.mediaType === 'video' ? 'video' : 'image',
    mediaAlt:
      typeof version.mediaAlt === 'string' ? version.mediaAlt.slice(0, 220) : '',
    illustrative: Boolean(version.illustrative),
    generationState,
    generationProgress:
      generationState === 'ready'
        ? 100
        : finiteNumber(version.generationProgress, 0, 0, 100),
    generationJobId,
    submissionKey:
      typeof version.submissionKey === 'string' && version.submissionKey.length <= 128
        ? version.submissionKey
        : null,
    generationError:
      typeof version.generationError === 'string'
        ? version.generationError.slice(0, 500)
        : null,
    outputMetadata:
      version.outputMetadata && typeof version.outputMetadata === 'object'
        ? (version.outputMetadata as GenerationOutputMetadata)
        : null,
    approvalState,
    reviewedAt:
      typeof version.reviewedAt === 'string' &&
      !Number.isNaN(Date.parse(version.reviewedAt))
        ? version.reviewedAt
        : null,
  };
}

function sanitizeScene(value: unknown): StudioScene | null {
  if (!value || typeof value !== 'object') return null;
  const scene = value as Partial<StudioScene> & { modelPreset?: unknown };
  if (
    typeof scene.id !== 'string' ||
    !scene.id ||
    typeof scene.title !== 'string' ||
    typeof scene.prompt !== 'string'
  ) {
    return null;
  }

  const versions = Array.isArray(scene.versions)
    ? scene.versions
        .map(sanitizeVersion)
        .filter((version): version is StudioVersion => Boolean(version))
        .filter(
          (version, index, collection) =>
            collection.findIndex((item) => item.id === version.id) === index,
        )
        .slice(0, 12)
    : [];
  if (!versions.length) return null;
  const selectedVersionId = versions.some(
    (version) => version.id === scene.selectedVersionId,
  )
    ? (scene.selectedVersionId as string)
    : versions[versions.length - 1].id;

  return {
    id: scene.id,
    number: finiteNumber(scene.number, 1, 1, 99),
    title: scene.title.slice(0, 80),
    description:
      typeof scene.description === 'string' ? scene.description.slice(0, 220) : '',
    startSeconds: finiteNumber(scene.startSeconds, 0, 0, 3600),
    durationSeconds: finiteNumber(scene.durationSeconds, 5, 1, 120),
    prompt: scene.prompt.slice(0, 1200),
    visualStyle: styles.includes(scene.visualStyle as (typeof styles)[number])
      ? (scene.visualStyle as StudioScene['visualStyle'])
      : 'Cinematic',
    lensMm: finiteNumber(scene.lensMm, 35, 14, 200),
    lighting: lightingOptions.includes(
      scene.lighting as (typeof lightingOptions)[number],
    )
      ? (scene.lighting as StudioScene['lighting'])
      : 'High Contrast / Low Key',
    generationConfig: sanitizeGenerationConfig(
      scene.generationConfig,
      scene.modelPreset,
    ),
    selectedVersionId,
    versions,
  };
}

function sanitizeSession(value: unknown): StudioSession | null {
  if (!value || typeof value !== 'object') return null;
  const session = value as Partial<StudioSession>;
  if (
    ![1, 2, STUDIO_SESSION_SCHEMA_VERSION].includes(session.schemaVersion ?? -1) ||
    typeof session.campaignId !== 'string' ||
    !session.campaignId ||
    !Array.isArray(session.scenes)
  ) {
    return null;
  }
  const scenes = session.scenes
    .map(sanitizeScene)
    .filter((scene): scene is StudioScene => Boolean(scene))
    .filter(
      (scene, index, collection) =>
        collection.findIndex((item) => item.id === scene.id) === index,
    )
    .slice(0, 24);
  if (!scenes.length) return null;
  const selectedSceneId = scenes.some(
    (scene) => scene.id === session.selectedSceneId,
  )
    ? (session.selectedSceneId as string)
    : scenes[0].id;

  return {
    schemaVersion: STUDIO_SESSION_SCHEMA_VERSION,
    campaignId: session.campaignId,
    campaignName:
      typeof session.campaignName === 'string'
        ? session.campaignName.slice(0, 120)
        : 'Untitled campaign',
    createdAt:
      typeof session.createdAt === 'string' &&
      !Number.isNaN(Date.parse(session.createdAt))
        ? session.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof session.updatedAt === 'string' &&
      !Number.isNaN(Date.parse(session.updatedAt))
        ? session.updatedAt
        : new Date().toISOString(),
    selectedSceneId,
    playheadSeconds: finiteNumber(session.playheadSeconds, 0, 0, 3600),
    zoom: finiteNumber(session.zoom, 100, 75, 180),
    scenes,
  };
}

function loadCollection(): StudioCollection {
  try {
    const raw = window.localStorage.getItem(STUDIO_SESSIONS_STORAGE_KEY);
    if (!raw) {
      return { schemaVersion: STUDIO_SESSION_SCHEMA_VERSION, sessions: [] };
    }
    const parsed = JSON.parse(raw) as Partial<StudioCollection>;
    if (![1, 2, STUDIO_SESSION_SCHEMA_VERSION].includes(parsed.schemaVersion ?? -1)) {
      return { schemaVersion: STUDIO_SESSION_SCHEMA_VERSION, sessions: [] };
    }
    return {
      schemaVersion: STUDIO_SESSION_SCHEMA_VERSION,
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions
            .map(sanitizeSession)
            .filter((session): session is StudioSession => Boolean(session))
        : [],
    };
  } catch {
    return { schemaVersion: STUDIO_SESSION_SCHEMA_VERSION, sessions: [] };
  }
}

export function loadStudioSession(campaignId: string) {
  return (
    loadCollection().sessions.find(
      (session) => session.campaignId === campaignId,
    ) ?? null
  );
}

export function saveStudioSession(session: StudioSession) {
  const collection = loadCollection();
  const nextSession = { ...session, updatedAt: new Date().toISOString() };
  const sessions = [
    nextSession,
    ...collection.sessions.filter(
      (item) => item.campaignId !== session.campaignId,
    ),
  ].slice(0, 20);
  window.localStorage.setItem(
    STUDIO_SESSIONS_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: STUDIO_SESSION_SCHEMA_VERSION,
      sessions,
    }),
  );
  return nextSession;
}
