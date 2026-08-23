import {
  initialCampaignDraft,
  type CampaignDraft,
} from './campaign-wizard-model';

export const CAMPAIGN_RECORD_SCHEMA_VERSION = 1;
export const CAMPAIGN_RECORDS_STORAGE_KEY = 'cinemoriq.campaigns.v1';
export const DEMO_CAMPAIGN_ID = 'project-noir';

export type CampaignRecordKind = 'generated' | 'sample';
export type CampaignRecordStatus =
  | 'concept-development'
  | 'awaiting-review';

export type CampaignEvent = {
  id: string;
  title: string;
  detail: string;
  occurredAt: string | null;
  state: 'complete' | 'active' | 'waiting';
};

export type CampaignRecord = {
  schemaVersion: number;
  id: string;
  kind: CampaignRecordKind;
  createdAt: string;
  updatedAt: string;
  status: CampaignRecordStatus;
  activeWorkflowStage: number;
  paused: boolean;
  draft: CampaignDraft;
  conceptTitle: string;
  events: CampaignEvent[];
};

export const workflowStages = [
  { title: 'Research', agent: 'Data Analyst Alpha' },
  { title: 'Strategy', agent: 'Strategist Beta' },
  { title: 'Creative Concepts', agent: 'Creative Orchestrator' },
  { title: 'Video Generation', agent: 'Director X' },
  { title: 'Distribution', agent: 'Network Agent' },
] as const;

function createRecordId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42);
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);
  return `${slug || 'campaign'}-${suffix}`;
}

function initialEvents(
  draft: CampaignDraft,
  kind: CampaignRecordKind,
): CampaignEvent[] {
  const now = Date.now();
  return [
    {
      id: 'concept-preview',
      title:
        kind === 'sample'
          ? 'Creative concept preview prepared'
          : 'Campaign brief mapped to Concept A',
      detail:
        kind === 'sample'
          ? `${draft.creativeStyle || 'Creative direction'} organized into Concept A for review.`
          : `${draft.creativeStyle || 'Creative direction'} inputs are structured for review; no visual has been generated.`,
      occurredAt: new Date(now - 2 * 60 * 1000).toISOString(),
      state: 'active',
    },
    {
      id: 'strategy-ready',
      title: 'Audience strategy structured',
      detail: `${draft.audienceName || 'Target audience'} and channel inputs are ready for review.`,
      occurredAt: new Date(now - 45 * 60 * 1000).toISOString(),
      state: 'complete',
    },
    {
      id: 'review-waiting',
      title: 'Director X waiting for concept approval',
      detail: 'Video generation remains locked until a human approves the concept.',
      occurredAt: null,
      state: 'waiting',
    },
  ];
}

export function createCampaignRecord(
  draft: CampaignDraft,
  options?: { id?: string; kind?: CampaignRecordKind },
): CampaignRecord {
  const now = new Date().toISOString();
  const kind = options?.kind ?? 'generated';
  const generatedConceptTitle = `${draft.productName || draft.brandName || draft.campaignName || 'Campaign'} — Concept A`.slice(
    0,
    100,
  );
  return {
    schemaVersion: CAMPAIGN_RECORD_SCHEMA_VERSION,
    id: options?.id ?? createRecordId(draft.campaignName),
    kind,
    createdAt: now,
    updatedAt: now,
    status: 'concept-development',
    activeWorkflowStage: 2,
    paused: false,
    draft,
    conceptTitle: kind === 'sample' ? 'Neon Ascendance' : generatedConceptTitle,
    events: initialEvents(draft, kind),
  };
}

export const demoCampaignDraft: CampaignDraft = {
  ...initialCampaignDraft,
  objective: 'launch',
  audienceName: 'Design-led premium mobility buyers',
  audienceType: 'B2C',
  primaryMarkets: ['United States', 'United Kingdom', 'UAE'],
  audienceProfile:
    'Urban professionals and founders who value advanced engineering, refined design, and low-friction ownership.',
  audiencePain:
    'Premium electric vehicles often force buyers to choose between distinctive design, real performance, and trusted technology.',
  buyingStage: 'Comparing options',
  productName: 'Project Noir Electric Grand Tourer',
  productUrl: 'https://example.com/project-noir',
  valueProposition:
    'A cinematic electric grand tourer that pairs intelligent performance with uncompromising design.',
  keyBenefits: [
    'Long-range intelligent performance',
    'Sculpted premium interior',
    'Adaptive driver technology',
  ],
  primaryCta: 'Book a Demo',
  proofConstraints: 'All performance and range claims require final legal review.',
  brandName: 'Noir Mobility',
  brandTones: ['Premium', 'Innovative', 'Authoritative'],
  brandVoice:
    'Confident, precise, cinematic, and restrained—never loud or speculative.',
  requiredMessages: 'Intelligent performance. Designed for the next city.',
  brandAvoid: 'No dystopian clichés, racing behavior, or unverified autonomy claims.',
  brandReferenceUrl: 'https://example.com/noir-brand',
  channels: ['youtube', 'instagram', 'website'],
  primaryChannel: 'youtube',
  campaignDuration: '4 Weeks',
  destinationUrl: 'https://example.com/project-noir',
  creativeStyle: 'Cinematic Product Film',
  creativeEnergy: 'Precise & Restrained',
  masterDuration: '30 seconds',
  mustShow:
    'Rain-sculpted exterior surfaces, intelligent cockpit details, and a premium near-future city arrival.',
  avoidVisually: 'No visible competitor marks, reckless driving, or synthetic celebrity likenesses.',
  peoplePolicy: 'Product Only',
  syntheticRightsConfirmed: false,
  campaignName: 'Project Noir // Q4 Launch',
  confirmAssetRights: true,
  confirmNoUnauthorizedIdentity: true,
  confirmHumanReview: true,
};
