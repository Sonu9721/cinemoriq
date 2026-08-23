import {
  CAMPAIGN_DRAFT_SCHEMA_VERSION,
  CAMPAIGN_DRAFT_STORAGE_KEY,
  initialCampaignDraft,
  type CampaignDraft,
  type CampaignDraftField,
} from './campaign-wizard-model';

export type StoredCampaignDraft = {
  schemaVersion: number;
  draft: CampaignDraft;
  currentStep: number;
  furthestStep: number;
  updatedAt: string;
};

export interface CampaignDraftStore {
  load(): StoredCampaignDraft | null;
  save(value: StoredCampaignDraft): void;
  clear(): void;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function sanitizeCampaignDraft(value: unknown): CampaignDraft | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Record<CampaignDraftField, unknown>>;
  const restored: CampaignDraft = { ...initialCampaignDraft };

  for (const field of Object.keys(initialCampaignDraft) as CampaignDraftField[]) {
    const expected = initialCampaignDraft[field];
    const incoming = candidate[field];

    if (typeof expected === 'string' && typeof incoming === 'string') {
      (restored[field] as string) = incoming;
    } else if (typeof expected === 'boolean' && typeof incoming === 'boolean') {
      (restored[field] as boolean) = incoming;
    } else if (Array.isArray(expected) && isStringArray(incoming)) {
      (restored[field] as string[]) = incoming;
    }
  }

  if (!['sales', 'leads', 'launch', 'awareness'].includes(restored.objective)) {
    restored.objective = initialCampaignDraft.objective;
  }

  const sanitizeEnum = (
    field: CampaignDraftField,
    allowed: readonly string[],
  ) => {
    const value = restored[field];
    if (typeof value === 'string' && !allowed.includes(value)) {
      (restored[field] as string) = '';
    }
  };

  sanitizeEnum('audienceType', ['B2B', 'B2C', 'Mixed']);
  sanitizeEnum('buyingStage', [
    'Problem aware',
    'Solution aware',
    'Comparing options',
    'Ready to act',
  ]);
  sanitizeEnum('primaryCta', [
    'Request a Quote',
    'Book a Demo',
    'Buy Now',
    'Learn More',
    'Join Waitlist',
  ]);
  sanitizeEnum('primaryChannel', [
    'linkedin',
    'youtube',
    'instagram',
    'paid-social',
    'website',
    'email',
  ]);
  sanitizeEnum('campaignDuration', [
    'Single Launch',
    '2 Weeks',
    '4 Weeks',
    'Always-on',
  ]);
  sanitizeEnum('creativeStyle', [
    'Cinematic Product Film',
    'Technical Explainer',
    'Documentary Story',
    'Editorial Luxury',
    'Creator-led Ad',
  ]);
  sanitizeEnum('creativeEnergy', [
    'Precise & Restrained',
    'Balanced',
    'Bold & Kinetic',
  ]);
  sanitizeEnum('masterDuration', ['15 seconds', '30 seconds', '60 seconds']);
  sanitizeEnum('peoplePolicy', [
    'Product Only',
    'Client-provided People or Footage',
    'Synthetic Performer',
  ]);

  const allowedMarkets = [
    'United States',
    'United Kingdom',
    'Europe',
    'UAE',
    'Asia-Pacific',
    'Global',
  ];
  const markets = [...new Set(restored.primaryMarkets)].filter((market) =>
    allowedMarkets.includes(market),
  );
  restored.primaryMarkets = markets.includes('Global')
    ? ['Global']
    : markets.slice(0, 3);

  const allowedTones = [
    'Authoritative',
    'Premium',
    'Innovative',
    'Technical',
    'Human',
    'Bold',
  ];
  restored.brandTones = [...new Set(restored.brandTones)]
    .filter((tone) => allowedTones.includes(tone))
    .slice(0, 3);

  const allowedChannels = [
    'linkedin',
    'youtube',
    'instagram',
    'paid-social',
    'website',
    'email',
  ];
  restored.channels = [...new Set(restored.channels)]
    .filter((channel) => allowedChannels.includes(channel))
    .slice(0, 4);
  if (!restored.channels.includes(restored.primaryChannel)) {
    restored.primaryChannel = '';
  }
  restored.keyBenefits = restored.keyBenefits.slice(0, 3);
  while (restored.keyBenefits.length < 3) restored.keyBenefits.push('');

  return restored;
}

function clampStep(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(6, Math.max(0, Math.floor(value)))
    : 0;
}

export const browserCampaignDraftStore: CampaignDraftStore = {
  load() {
    try {
      const raw = window.localStorage.getItem(CAMPAIGN_DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoredCampaignDraft>;
      if (parsed.schemaVersion !== CAMPAIGN_DRAFT_SCHEMA_VERSION) return null;
      const draft = sanitizeCampaignDraft(parsed.draft);
      if (!draft) return null;
      const currentStep = clampStep(parsed.currentStep);
      const furthestStep = Math.max(
        currentStep,
        clampStep(parsed.furthestStep),
      );
      return {
        schemaVersion: CAMPAIGN_DRAFT_SCHEMA_VERSION,
        draft,
        currentStep,
        furthestStep,
        updatedAt:
          typeof parsed.updatedAt === 'string'
            ? parsed.updatedAt
            : new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },
  save(value) {
    window.localStorage.setItem(CAMPAIGN_DRAFT_STORAGE_KEY, JSON.stringify(value));
  },
  clear() {
    window.localStorage.removeItem(CAMPAIGN_DRAFT_STORAGE_KEY);
  },
};

export function createStoredDraft(
  draft: CampaignDraft,
  currentStep: number,
  furthestStep: number,
): StoredCampaignDraft {
  return {
    schemaVersion: CAMPAIGN_DRAFT_SCHEMA_VERSION,
    draft,
    currentStep,
    furthestStep,
    updatedAt: new Date().toISOString(),
  };
}
