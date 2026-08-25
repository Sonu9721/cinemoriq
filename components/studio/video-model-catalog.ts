export const VIDEO_MODEL_KEYS = [
  'veo-3.1',
  'kling-v3-standard',
  'seedance-2.0',
  'minimax-h3',
] as const;

export const GENERATION_MODES = [
  'text-to-video',
  'image-to-video',
  'first-last-frame',
  'reference-to-video',
] as const;

export type StudioVideoModelKey = (typeof VIDEO_MODEL_KEYS)[number];
export type StudioGenerationMode = (typeof GENERATION_MODES)[number];
export type StudioGenerationDuration = number | 'auto';

export type StudioGenerationConfig = {
  modelKey: StudioVideoModelKey;
  mode: StudioGenerationMode;
  duration: StudioGenerationDuration;
  resolution: string;
  aspectRatio: string;
  audioEnabled: boolean;
  startImageUrl: string;
  endImageUrl: string;
  referenceImageUrls: string[];
  referenceVideoUrls: string[];
  referenceAudioUrls: string[];
  negativePrompt: string;
  shotType: 'customize' | 'intelligent';
  bitrateMode: 'standard' | 'high';
  promptExpansionMode: 'disabled' | 'fast' | 'balanced' | 'quality';
  seed: string;
};

export type CatalogOption = {
  value: string;
  label: string;
  note?: string;
};

export type StudioReferenceLimits = {
  images: number;
  videos: number;
  audio: number;
  total: number;
  note: string;
};

export type StudioModeDefinition = {
  key: StudioGenerationMode;
  label: string;
  description: string;
  endpointId: string;
  aspectRatios?: CatalogOption[];
  references: StudioReferenceLimits;
  requiresStartImage?: boolean;
  requiresEndImage?: boolean;
};

export type StudioVideoModelDefinition = {
  key: StudioVideoModelKey;
  name: string;
  maker: string;
  shortName: string;
  description: string;
  recommendedFor: string;
  durationOptions: StudioGenerationDuration[];
  defaultDuration: StudioGenerationDuration;
  resolutions: CatalogOption[];
  defaultResolution: string;
  aspectRatios: CatalogOption[];
  defaultAspectRatio: string;
  audio: 'optional' | 'required' | 'unsupported';
  audioDescription: string;
  modes: StudioModeDefinition[];
  advancedFields: Array<
    'negative-prompt' | 'shot-type' | 'bitrate-mode' | 'prompt-expansion' | 'seed'
  >;
  capabilities: string[];
  outputFields: string[];
  pricingLabel: string;
  pricingNote: string;
  pricingVerifiedAt: string;
  resolutionNote?: string;
};

const noReferences: StudioReferenceLimits = {
  images: 0,
  videos: 0,
  audio: 0,
  total: 0,
  note: 'This mode does not accept reference assets.',
};

const firstFrameReferences: StudioReferenceLimits = {
  images: 1,
  videos: 0,
  audio: 0,
  total: 1,
  note: 'One starting image anchors the generated shot.',
};

const firstLastReferences: StudioReferenceLimits = {
  images: 2,
  videos: 0,
  audio: 0,
  total: 2,
  note: 'A start and end image control the transition.',
};

const wideAspectOptions: CatalogOption[] = [
  { value: 'auto', label: 'Auto' },
  { value: '21:9', label: '21:9 · Cinematic' },
  { value: '16:9', label: '16:9 · Landscape' },
  { value: '4:3', label: '4:3 · Classic' },
  { value: '1:1', label: '1:1 · Square' },
  { value: '3:4', label: '3:4 · Portrait' },
  { value: '9:16', label: '9:16 · Vertical' },
];

const standardAspectOptions: CatalogOption[] = wideAspectOptions.filter(
  (option) => option.value !== 'auto',
);

const veoAspectOptions: CatalogOption[] = [
  { value: '16:9', label: '16:9 · Landscape' },
  { value: '9:16', label: '9:16 · Vertical' },
];

const klingAspectOptions: CatalogOption[] = [
  { value: '16:9', label: '16:9 · Landscape' },
  { value: '9:16', label: '9:16 · Vertical' },
  { value: '1:1', label: '1:1 · Square' },
];

const sourceAspectOption: CatalogOption[] = [
  { value: 'source', label: 'From source image' },
];

export const VIDEO_MODEL_CATALOG: StudioVideoModelDefinition[] = [
  {
    key: 'veo-3.1',
    name: 'Veo 3.1',
    maker: 'Google',
    shortName: 'Veo',
    description: 'Premium cinematic generation with synchronized dialogue and sound.',
    recommendedFor: 'Hero films, dialogue, product storytelling, and final-quality shots.',
    durationOptions: [4, 6, 8],
    defaultDuration: 8,
    resolutions: [
      { value: '720p', label: '720p · Draft' },
      { value: '1080p', label: '1080p · Production' },
      { value: '4k', label: '4K · Master' },
    ],
    defaultResolution: '1080p',
    aspectRatios: veoAspectOptions,
    defaultAspectRatio: '16:9',
    audio: 'optional',
    audioDescription: 'Native dialogue, ambience, music, and sound effects.',
    modes: [
      {
        key: 'text-to-video',
        label: 'Text to video',
        description: 'Generate a complete shot from the prompt.',
        endpointId: 'fal-ai/veo3.1',
        references: noReferences,
      },
      {
        key: 'image-to-video',
        label: 'Image to video',
        description: 'Animate one approved opening frame.',
        endpointId: 'fal-ai/veo3.1/image-to-video',
        aspectRatios: [
          { value: 'auto', label: 'Auto from image' },
          ...veoAspectOptions,
        ],
        references: firstFrameReferences,
        requiresStartImage: true,
      },
      {
        key: 'first-last-frame',
        label: 'First + last frame',
        description: 'Interpolate between two approved keyframes.',
        endpointId: 'fal-ai/veo3.1/first-last-frame-to-video',
        references: firstLastReferences,
        requiresStartImage: true,
        requiresEndImage: true,
      },
      {
        key: 'reference-to-video',
        label: 'Reference to video',
        description: 'Guide subject, composition, or style with reference images.',
        endpointId: 'fal-ai/veo3.1/reference-to-video',
        references: {
          images: 3,
          videos: 0,
          audio: 0,
          total: 3,
          note: 'Cinemoriq exposes three current reference-image slots for this endpoint.',
        },
      },
    ],
    advancedFields: ['negative-prompt', 'seed'],
    capabilities: ['Native audio', 'First/last frames', 'Reference images', '4K option'],
    outputFields: ['MP4 URL', 'MIME type', 'File name', 'File size'],
    pricingLabel: '$0.20–$0.60 / second',
    pricingNote: 'Rate changes with resolution and audio.',
    pricingVerifiedAt: '2026-08-25',
  },
  {
    key: 'kling-v3-standard',
    name: 'Kling 3 Standard',
    maker: 'Kuaishou',
    shortName: 'Kling',
    description: 'Fluid motion, multi-shot direction, and strong product movement.',
    recommendedFor: 'Action, machinery, camera movement, and multi-shot sequences.',
    durationOptions: Array.from({ length: 13 }, (_, index) => index + 3),
    defaultDuration: 5,
    resolutions: [
      {
        value: 'standard',
        label: 'Standard · up to 1080p',
        note: '4K requires a separate fal.ai endpoint.',
      },
    ],
    defaultResolution: 'standard',
    aspectRatios: klingAspectOptions,
    defaultAspectRatio: '16:9',
    audio: 'optional',
    audioDescription: 'Native audio; current voice output is optimized for English and Chinese.',
    modes: [
      {
        key: 'text-to-video',
        label: 'Text to video',
        description: 'Generate one shot or an intelligently structured sequence.',
        endpointId: 'fal-ai/kling-video/v3/standard/text-to-video',
        references: noReferences,
      },
      {
        key: 'image-to-video',
        label: 'Image to video',
        description: 'Animate a start image and preserve its product composition.',
        endpointId: 'fal-ai/kling-video/v3/standard/image-to-video',
        aspectRatios: sourceAspectOption,
        references: firstFrameReferences,
        requiresStartImage: true,
      },
      {
        key: 'first-last-frame',
        label: 'First + last frame',
        description: 'Use the optional end-frame control on the image endpoint.',
        endpointId: 'fal-ai/kling-video/v3/standard/image-to-video',
        aspectRatios: sourceAspectOption,
        references: firstLastReferences,
        requiresStartImage: true,
        requiresEndImage: true,
      },
    ],
    advancedFields: ['negative-prompt', 'shot-type'],
    capabilities: ['Native audio', '3–15 seconds', 'Multi-shot', 'Start/end frames'],
    outputFields: ['MP4 URL', 'MIME type', 'File name', 'File size'],
    pricingLabel: '$0.084–$0.126 / second',
    pricingNote: 'Standard endpoint; voice control has a separate higher rate.',
    pricingVerifiedAt: '2026-08-25',
    resolutionNote: 'The Standard endpoint does not expose a resolution field. Native 4K uses a separate endpoint.',
  },
  {
    key: 'seedance-2.0',
    name: 'Seedance 2.0',
    maker: 'ByteDance',
    shortName: 'Seedance',
    description: 'Flexible multimodal direction with long shots and synchronized audio.',
    recommendedFor: 'Reference-heavy campaigns, physics, multi-shot edits, and 4–15s clips.',
    durationOptions: ['auto', ...Array.from({ length: 12 }, (_, index) => index + 4)],
    defaultDuration: 5,
    resolutions: [
      { value: '480p', label: '480p · Draft' },
      { value: '720p', label: '720p · Balanced' },
      { value: '1080p', label: '1080p · High' },
      { value: '4k', label: '4K · Highest' },
    ],
    defaultResolution: '720p',
    aspectRatios: wideAspectOptions,
    defaultAspectRatio: '16:9',
    audio: 'optional',
    audioDescription: 'Native synchronized audio is included at the same published rate.',
    modes: [
      {
        key: 'text-to-video',
        label: 'Text to video',
        description: 'Create a directed audiovisual shot from text.',
        endpointId: 'bytedance/seedance-2.0/text-to-video',
        references: noReferences,
      },
      {
        key: 'image-to-video',
        label: 'Image to video',
        description: 'Animate one opening image with an optional automatic ratio.',
        endpointId: 'bytedance/seedance-2.0/image-to-video',
        references: firstFrameReferences,
        requiresStartImage: true,
      },
      {
        key: 'first-last-frame',
        label: 'First + last frame',
        description: 'Control both ends of the shot through the image endpoint.',
        endpointId: 'bytedance/seedance-2.0/image-to-video',
        references: firstLastReferences,
        requiresStartImage: true,
        requiresEndImage: true,
      },
      {
        key: 'reference-to-video',
        label: 'Multimodal references',
        description: 'Combine appearance, motion, and sound references.',
        endpointId: 'bytedance/seedance-2.0/reference-to-video',
        references: {
          images: 9,
          videos: 3,
          audio: 3,
          total: 12,
          note: 'Up to 9 images, 3 videos, and 3 audio files; 12 files total.',
        },
      },
    ],
    advancedFields: ['bitrate-mode', 'seed'],
    capabilities: ['Native audio', 'Auto duration', 'Multimodal references', '4K option'],
    outputFields: ['MP4 URL', 'MIME type', 'File name', 'File size', 'Seed'],
    pricingLabel: 'Resolution-token based',
    pricingNote: 'Estimate uses published pixel-token formula; reference video can alter final billing.',
    pricingVerifiedAt: '2026-08-25',
  },
  {
    key: 'minimax-h3',
    name: 'MiniMax H3',
    maker: 'MiniMax',
    shortName: 'H3',
    description: 'Open-weight multimodal video with always-on native stereo audio.',
    recommendedFor: 'Longer audiovisual shots, typography, editing, motion and voice references.',
    durationOptions: Array.from({ length: 11 }, (_, index) => index + 5),
    defaultDuration: 5,
    resolutions: [
      { value: '480P', label: '480P · Draft' },
      { value: '768P', label: '768P · Native' },
      { value: '2K', label: '2K · Upscaled' },
      { value: '4K', label: '4K · Upscaled' },
    ],
    defaultResolution: '2K',
    aspectRatios: standardAspectOptions,
    defaultAspectRatio: '16:9',
    audio: 'required',
    audioDescription: 'Every generation includes synchronized native stereo audio.',
    modes: [
      {
        key: 'text-to-video',
        label: 'Text to video',
        description: 'Generate a 5–15 second audiovisual shot from text.',
        endpointId: 'minimax/h3/text-to-video',
        references: noReferences,
      },
      {
        key: 'image-to-video',
        label: 'Image to video',
        description: 'Animate one approved opening frame.',
        endpointId: 'minimax/h3/image-to-video',
        aspectRatios: sourceAspectOption,
        references: firstFrameReferences,
        requiresStartImage: true,
      },
      {
        key: 'first-last-frame',
        label: 'First + last frame',
        description: 'Generate a controlled transition between two keyframes.',
        endpointId: 'minimax/h3/image-to-video',
        aspectRatios: sourceAspectOption,
        references: firstLastReferences,
        requiresStartImage: true,
        requiresEndImage: true,
      },
      {
        key: 'reference-to-video',
        label: 'Multimodal references',
        description: 'Combine identity, motion, editing rhythm, and voice context.',
        endpointId: 'minimax/h3/reference-to-video',
        aspectRatios: [{ value: 'adaptive', label: 'Adaptive' }, ...standardAspectOptions],
        references: {
          images: 9,
          videos: 3,
          audio: 3,
          total: 12,
          note: 'Up to 9 images, 3 videos, and 3 audio clips; 12 files total.',
        },
      },
    ],
    advancedFields: ['prompt-expansion', 'seed'],
    capabilities: ['Native stereo', '5–15 seconds', 'Multimodal references', 'Open weights'],
    outputFields: ['MP4 URL', 'MIME type', 'File name', 'File size', 'Expanded prompt'],
    pricingLabel: '$0.05–$0.16 / second',
    pricingNote: 'Rate changes with resolution; reference images beyond five add $0.08 each.',
    pricingVerifiedAt: '2026-08-25',
    resolutionNote: '480P/768P are native; 2K/4K are upscaled from the 768P base.',
  },
];

export function isStudioVideoModelKey(value: unknown): value is StudioVideoModelKey {
  return VIDEO_MODEL_KEYS.includes(value as StudioVideoModelKey);
}

export function isStudioGenerationMode(value: unknown): value is StudioGenerationMode {
  return GENERATION_MODES.includes(value as StudioGenerationMode);
}

export function getVideoModel(modelKey: StudioVideoModelKey) {
  return (
    VIDEO_MODEL_CATALOG.find((model) => model.key === modelKey) ??
    VIDEO_MODEL_CATALOG[0]
  );
}

export function getModelMode(
  modelKey: StudioVideoModelKey,
  mode: StudioGenerationMode,
) {
  const model = getVideoModel(modelKey);
  return model.modes.find((candidate) => candidate.key === mode) ?? model.modes[0];
}

export function getAspectOptions(
  modelKey: StudioVideoModelKey,
  mode: StudioGenerationMode,
) {
  const model = getVideoModel(modelKey);
  return getModelMode(modelKey, mode).aspectRatios ?? model.aspectRatios;
}

export function createDefaultGenerationConfig(
  modelKey: StudioVideoModelKey = 'veo-3.1',
): StudioGenerationConfig {
  const model = getVideoModel(modelKey);
  const mode = model.modes[0];
  const aspectOptions = mode.aspectRatios ?? model.aspectRatios;
  return {
    modelKey: model.key,
    mode: mode.key,
    duration: model.defaultDuration,
    resolution: model.defaultResolution,
    aspectRatio:
      aspectOptions.find((option) => option.value === model.defaultAspectRatio)
        ?.value ?? aspectOptions[0].value,
    audioEnabled: model.audio !== 'unsupported',
    startImageUrl: '',
    endImageUrl: '',
    referenceImageUrls: [],
    referenceVideoUrls: [],
    referenceAudioUrls: [],
    negativePrompt: '',
    shotType: 'customize',
    bitrateMode: 'standard',
    promptExpansionMode: 'balanced',
    seed: '',
  };
}

export function reconcileGenerationConfig(
  previous: StudioGenerationConfig,
  modelKey: StudioVideoModelKey,
  requestedMode?: StudioGenerationMode,
) {
  const model = getVideoModel(modelKey);
  const mode =
    model.modes.find((candidate) => candidate.key === requestedMode) ??
    model.modes.find((candidate) => candidate.key === previous.mode) ??
    model.modes[0];
  const aspects = mode.aspectRatios ?? model.aspectRatios;
  const duration = model.durationOptions.includes(previous.duration)
    ? previous.duration
    : model.defaultDuration;
  const resolution = model.resolutions.some(
    (option) => option.value === previous.resolution,
  )
    ? previous.resolution
    : model.defaultResolution;
  const aspectRatio = aspects.some(
    (option) => option.value === previous.aspectRatio,
  )
    ? previous.aspectRatio
    : aspects.find((option) => option.value === model.defaultAspectRatio)?.value ??
      aspects[0].value;

  return {
    ...previous,
    modelKey: model.key,
    mode: mode.key,
    duration,
    resolution,
    aspectRatio,
    audioEnabled:
      model.audio === 'required'
        ? true
        : model.audio === 'unsupported'
          ? false
          : previous.audioEnabled,
  } satisfies StudioGenerationConfig;
}

export function countReferences(config: StudioGenerationConfig) {
  if (config.mode === 'image-to-video') return config.startImageUrl ? 1 : 0;
  if (config.mode === 'first-last-frame') {
    return Number(Boolean(config.startImageUrl)) + Number(Boolean(config.endImageUrl));
  }
  if (config.mode !== 'reference-to-video') return 0;
  return [
    ...config.referenceImageUrls,
    ...config.referenceVideoUrls,
    ...config.referenceAudioUrls,
  ].filter((value) => value.trim()).length;
}

export function formatGenerationDuration(duration: StudioGenerationDuration) {
  return duration === 'auto' ? 'Auto' : `${duration}s`;
}

export function getResolutionLabel(
  modelKey: StudioVideoModelKey,
  resolution: string,
) {
  return (
    getVideoModel(modelKey).resolutions.find(
      (option) => option.value === resolution,
    )?.label ?? resolution
  );
}

export function estimateGenerationCost(config: StudioGenerationConfig) {
  if (config.duration === 'auto') {
    return {
      amount: null,
      label: 'After duration',
      note: 'fal.ai will choose the duration, so cost is finalized after generation.',
    };
  }

  const duration = config.duration;
  let amount = 0;
  let note = 'Estimated from fal.ai public pricing; final provider charge may vary.';

  switch (config.modelKey) {
    case 'veo-3.1': {
      const is4k = config.resolution === '4k';
      const rate = is4k
        ? config.audioEnabled
          ? 0.6
          : 0.4
        : config.audioEnabled
          ? 0.4
          : 0.2;
      amount = duration * rate;
      break;
    }
    case 'kling-v3-standard':
      amount = duration * (config.audioEnabled ? 0.126 : 0.084);
      break;
    case 'seedance-2.0': {
      const pixels: Record<string, number> = {
        '480p': 854 * 480,
        '720p': 1280 * 720,
        '1080p': 1920 * 1080,
        '4k': 3840 * 2160,
      };
      const tokenRate = config.resolution === '4k' ? 0.008 : 0.014;
      const tokens = ((pixels[config.resolution] ?? pixels['720p']) * duration * 24) / 1024;
      amount = (tokens / 1000) * tokenRate;
      note = 'Pixel-token estimate; reference media duration can change the final charge.';
      break;
    }
    case 'minimax-h3': {
      const rates: Record<string, number> = {
        '480P': 0.05,
        '768P': 0.06,
        '2K': 0.13,
        '4K': 0.16,
      };
      amount = duration * (rates[config.resolution] ?? rates['2K']);
      if (config.mode === 'reference-to-video') {
        const imageCount = config.referenceImageUrls.filter((value) => value.trim()).length;
        amount += Math.max(0, imageCount - 5) * 0.08;
      }
      break;
    }
  }

  return {
    amount,
    label: `$${amount.toFixed(2)}`,
    note,
  };
}

function isPublicMediaUrl(value: string) {
  if (!value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateGenerationConfig(
  config: StudioGenerationConfig,
  prompt: string,
) {
  const errors: string[] = [];
  const mode = getModelMode(config.modelKey, config.mode);
  const imageUrls = config.referenceImageUrls.filter((value) => value.trim());
  const videoUrls = config.referenceVideoUrls.filter((value) => value.trim());
  const audioUrls = config.referenceAudioUrls.filter((value) => value.trim());
  const totalReferences = imageUrls.length + videoUrls.length + audioUrls.length;

  if (!prompt.trim()) errors.push('Add a scene prompt before generation.');
  if (mode.requiresStartImage && !isPublicMediaUrl(config.startImageUrl)) {
    errors.push('Add a valid public start-frame URL for this mode.');
  }
  if (mode.requiresEndImage && !isPublicMediaUrl(config.endImageUrl)) {
    errors.push('Add a valid public end-frame URL for this mode.');
  }
  if (config.mode === 'reference-to-video' && totalReferences === 0) {
    errors.push('Add at least one reference asset for reference-to-video.');
  }
  if (imageUrls.length > mode.references.images) {
    errors.push(`This endpoint accepts up to ${mode.references.images} image references in Cinemoriq.`);
  }
  if (videoUrls.length > mode.references.videos) {
    errors.push(`This endpoint accepts up to ${mode.references.videos} video references.`);
  }
  if (audioUrls.length > mode.references.audio) {
    errors.push(`This endpoint accepts up to ${mode.references.audio} audio references.`);
  }
  if (totalReferences > mode.references.total) {
    errors.push(`Reference assets exceed the ${mode.references.total}-file total limit.`);
  }
  if (
    config.mode === 'reference-to-video' &&
    audioUrls.length > 0 &&
    imageUrls.length + videoUrls.length === 0
  ) {
    errors.push('Audio references need at least one image or video reference.');
  }
  const invalidReference = [
    config.startImageUrl,
    config.endImageUrl,
    ...imageUrls,
    ...videoUrls,
    ...audioUrls,
  ].find((value) => value.trim() && !isPublicMediaUrl(value));
  if (invalidReference) {
    errors.push('Reference assets must use publicly accessible http(s) URLs.');
  }

  return Array.from(new Set(errors));
}
