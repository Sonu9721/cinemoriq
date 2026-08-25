import type { CampaignRecord } from '../campaigns/campaign-record-model';

export const STUDIO_SESSION_SCHEMA_VERSION = 1;
export const STUDIO_SESSIONS_STORAGE_KEY = 'cinemoriq.studioSessions.v1';

export type StudioGenerationState =
  | 'idle'
  | 'queued'
  | 'generating'
  | 'ready'
  | 'failed'
  | 'cancelled';

export type StudioApprovalState =
  | 'draft'
  | 'in-review'
  | 'approved'
  | 'changes-requested';

export type StudioVersion = {
  id: string;
  number: number;
  createdAt: string;
  mediaSrc: string | null;
  mediaAlt: string;
  illustrative: boolean;
  generationState: StudioGenerationState;
  generationProgress: number;
  approvalState: StudioApprovalState;
  reviewedAt: string | null;
};

export type StudioScene = {
  id: string;
  number: number;
  title: string;
  description: string;
  startSeconds: number;
  durationSeconds: number;
  prompt: string;
  visualStyle: 'Cinematic' | 'Minimal' | 'Noir' | 'Documentary';
  lensMm: number;
  lighting:
    | 'High Contrast / Low Key'
    | 'Soft Diffused'
    | 'Neon / Cyberpunk'
    | 'Natural Daylight';
  modelPreset: 'Kling' | 'Veo' | 'Seedance';
  selectedVersionId: string;
  versions: StudioVersion[];
};

export type StudioSession = {
  schemaVersion: number;
  campaignId: string;
  campaignName: string;
  createdAt: string;
  updatedAt: string;
  selectedSceneId: string;
  playheadSeconds: number;
  zoom: number;
  scenes: StudioScene[];
};

const demoSceneBlueprints = [
  {
    id: 'scene-establishing',
    title: 'City Arrival',
    description: 'A rain-lit metropolis establishes the premium near-future world.',
    startSeconds: 0,
    durationSeconds: 5,
    prompt:
      'Wide establishing shot of a rain-sculpted near-future city at blue hour, premium and restrained, cobalt reflections, slow cinematic push-in.',
    visualStyle: 'Cinematic' as const,
    lensMm: 24,
    lighting: 'Neon / Cyberpunk' as const,
    mediaSrc: '/neon-ascendance.webp',
    mediaAlt:
      'Illustrative rain-lit near-future city concept for the Project Noir campaign',
    version: 3,
    generationState: 'ready' as const,
    approvalState: 'approved' as const,
  },
  {
    id: 'scene-product-reveal',
    title: 'Product Reveal',
    description: 'A fictional grand tourer emerges from cobalt reflections.',
    startSeconds: 5,
    durationSeconds: 7,
    prompt:
      'Low tracking reveal of an unbranded electric grand tourer emerging through rain and cobalt neon, precise motion, premium automotive lighting.',
    visualStyle: 'Noir' as const,
    lensMm: 35,
    lighting: 'High Contrast / Low Key' as const,
    mediaSrc: '/studio/scene-02-product-reveal.webp',
    mediaAlt:
      'Illustrative electric grand tourer reveal for the Project Noir campaign',
    version: 2,
    generationState: 'ready' as const,
    approvalState: 'in-review' as const,
  },
  {
    id: 'scene-intelligent-cockpit',
    title: 'Intelligent Cockpit',
    description: 'Tactile materials and calm interface light close the product story.',
    startSeconds: 12,
    durationSeconds: 8,
    prompt:
      'Macro cinematic cockpit detail, obsidian materials, subtle cobalt interface glow, premium tactility, no readable text, slow controlled camera move.',
    visualStyle: 'Minimal' as const,
    lensMm: 85,
    lighting: 'Soft Diffused' as const,
    mediaSrc: '/studio/scene-03-cockpit-detail.webp',
    mediaAlt:
      'Illustrative premium cockpit detail for the Project Noir campaign',
    version: 1,
    generationState: 'idle' as const,
    approvalState: 'draft' as const,
  },
];

export function createStudioSession(record: CampaignRecord): StudioSession {
  const now = new Date().toISOString();
  const isDemo = record.kind === 'sample';
  const campaignName = record.draft.campaignName || 'Untitled campaign';
  const productName =
    record.draft.productName || record.draft.brandName || 'the selected product';
  const creativeStyle = record.draft.creativeStyle || 'Cinematic';
  const scenes: StudioScene[] = demoSceneBlueprints.map((blueprint, index) => {
    const sceneId = `${record.id}-${blueprint.id}`;
    const versionCount = isDemo ? blueprint.version : 1;
    const versions = Array.from({ length: versionCount }, (_, versionIndex) => {
      const number = versionIndex + 1;
      const isSelected = number === versionCount;
      return {
        id: `${sceneId}-v${number}`,
        number,
        createdAt: now,
        mediaSrc: isDemo ? blueprint.mediaSrc : null,
        mediaAlt: blueprint.mediaAlt,
        illustrative: isDemo,
        generationState: isDemo
          ? isSelected
            ? blueprint.generationState
            : ('ready' as const)
          : ('idle' as const),
        generationProgress: isDemo ? 100 : 0,
        approvalState:
          isSelected && isDemo ? blueprint.approvalState : ('draft' as const),
        reviewedAt:
          isSelected && isDemo && blueprint.approvalState === 'approved'
            ? now
            : null,
      };
    });
    return {
      id: sceneId,
      number: index + 1,
      title:
        index === 0
          ? 'Establishing World'
          : index === 1
            ? 'Product Reveal'
            : 'Signature Detail',
      description: isDemo
        ? blueprint.description
        : [
            `Establish the campaign world for ${productName}.`,
            `Reveal ${productName} with a clear product-first composition.`,
            `Close on a distinctive product detail and primary message beat.`,
          ][index],
      startSeconds: blueprint.startSeconds,
      durationSeconds: blueprint.durationSeconds,
      prompt: isDemo
        ? blueprint.prompt
        : [
            `${creativeStyle} establishing shot for ${productName}. ${record.draft.mustShow || 'Preserve the approved product story and brand tone.'}`,
            `${creativeStyle} product reveal for ${productName}. ${record.draft.valueProposition || 'Keep the product value clear and credible.'}`,
            `${creativeStyle} signature detail for ${productName}. Avoid: ${record.draft.avoidVisually || record.draft.brandAvoid || 'unapproved claims and identities.'}`,
          ][index],
      visualStyle: blueprint.visualStyle,
      lensMm: blueprint.lensMm,
      lighting: blueprint.lighting,
      modelPreset: index === 0 ? 'Veo' : index === 1 ? 'Kling' : 'Seedance',
      selectedVersionId: versions[versions.length - 1].id,
      versions,
    };
  });

  return {
    schemaVersion: STUDIO_SESSION_SCHEMA_VERSION,
    campaignId: record.id,
    campaignName,
    createdAt: now,
    updatedAt: now,
    selectedSceneId: scenes[0].id,
    playheadSeconds: 0,
    zoom: 100,
    scenes,
  };
}

export function getStudioDuration(session: StudioSession) {
  return session.scenes.reduce(
    (duration, scene) =>
      Math.max(duration, scene.startSeconds + scene.durationSeconds),
    0,
  );
}
