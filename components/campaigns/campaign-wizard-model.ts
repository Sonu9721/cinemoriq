export type ObjectiveId = 'sales' | 'leads' | 'launch' | 'awareness';

export type CampaignDraft = {
  objective: ObjectiveId;
  audienceName: string;
  audienceType: string;
  primaryMarkets: string[];
  audienceProfile: string;
  audiencePain: string;
  buyingStage: string;
  productName: string;
  productUrl: string;
  valueProposition: string;
  keyBenefits: string[];
  primaryCta: string;
  proofConstraints: string;
  brandName: string;
  brandTones: string[];
  brandVoice: string;
  requiredMessages: string;
  brandAvoid: string;
  brandReferenceUrl: string;
  channels: string[];
  primaryChannel: string;
  campaignDuration: string;
  destinationUrl: string;
  creativeStyle: string;
  creativeEnergy: string;
  masterDuration: string;
  mustShow: string;
  avoidVisually: string;
  peoplePolicy: string;
  syntheticRightsConfirmed: boolean;
  campaignName: string;
  confirmAssetRights: boolean;
  confirmNoUnauthorizedIdentity: boolean;
  confirmHumanReview: boolean;
};

export type CampaignDraftField = keyof CampaignDraft;
export type CampaignValidationErrors = Partial<
  Record<CampaignDraftField, string>
>;

export type CampaignStep = {
  title: string;
  description: string;
};

export const campaignSteps: CampaignStep[] = [
  { title: 'Intent', description: 'Campaign objective' },
  { title: 'Audience', description: 'Target demographics' },
  { title: 'Product', description: "What you're selling" },
  { title: 'Brand', description: 'Identity & Tone' },
  { title: 'Channels', description: 'Distribution strategy' },
  { title: 'Creative Direction', description: 'Visual styling' },
  { title: 'Generate', description: 'AI synthesis' },
];

export const objectiveLabels: Record<ObjectiveId, string> = {
  sales: 'Increase Sales',
  leads: 'Generate Leads',
  launch: 'Launch a Product',
  awareness: 'Build Awareness',
};

export const channelLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  instagram: 'Instagram / Reels',
  'paid-social': 'Paid Social',
  website: 'Website / Landing Page',
  email: 'Email',
};

export const initialCampaignDraft: CampaignDraft = {
  objective: 'sales',
  audienceName: '',
  audienceType: '',
  primaryMarkets: [],
  audienceProfile: '',
  audiencePain: '',
  buyingStage: '',
  productName: '',
  productUrl: '',
  valueProposition: '',
  keyBenefits: ['', '', ''],
  primaryCta: '',
  proofConstraints: '',
  brandName: '',
  brandTones: [],
  brandVoice: '',
  requiredMessages: '',
  brandAvoid: '',
  brandReferenceUrl: '',
  channels: [],
  primaryChannel: '',
  campaignDuration: '',
  destinationUrl: '',
  creativeStyle: '',
  creativeEnergy: '',
  masterDuration: '',
  mustShow: '',
  avoidVisually: '',
  peoplePolicy: '',
  syntheticRightsConfirmed: false,
  campaignName: '',
  confirmAssetRights: false,
  confirmNoUnauthorizedIdentity: false,
  confirmHumanReview: false,
};

export const CAMPAIGN_DRAFT_STORAGE_KEY = 'cinemoriq.campaignDraft.v1';
export const CAMPAIGN_DRAFT_SCHEMA_VERSION = 1;

export function isCampaignDraftField(field: string): field is CampaignDraftField {
  return field in initialCampaignDraft;
}

function isHttpUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function lengthBetween(value: string, min: number, max: number) {
  const length = value.trim().length;
  return length >= min && length <= max;
}

export function validateCampaignStep(
  step: number,
  draft: CampaignDraft,
): CampaignValidationErrors {
  const errors: CampaignValidationErrors = {};

  if (step === 1) {
    if (!lengthBetween(draft.audienceName, 3, 80)) {
      errors.audienceName = 'Use 3–80 characters for the audience name.';
    }
    if (!draft.audienceType) errors.audienceType = 'Choose an audience type.';
    if (draft.primaryMarkets.length < 1 || draft.primaryMarkets.length > 3) {
      errors.primaryMarkets = 'Choose between one and three primary markets.';
    } else if (
      draft.primaryMarkets.includes('Global') &&
      draft.primaryMarkets.length > 1
    ) {
      errors.primaryMarkets = 'Choose Global by itself, or select up to three markets.';
    }
    if (!lengthBetween(draft.audienceProfile, 10, 240)) {
      errors.audienceProfile = 'Describe the audience in 10–240 characters.';
    }
    if (!lengthBetween(draft.audiencePain, 15, 300)) {
      errors.audiencePain = 'Describe the key need in 15–300 characters.';
    }
    if (!draft.buyingStage) errors.buyingStage = 'Choose the buying stage.';
  }

  if (step === 2) {
    if (!lengthBetween(draft.productName, 2, 80)) {
      errors.productName = 'Use 2–80 characters for the offer name.';
    }
    if (!isHttpUrl(draft.productUrl)) {
      errors.productUrl = 'Enter a complete http:// or https:// URL.';
    }
    if (!lengthBetween(draft.valueProposition, 15, 180)) {
      errors.valueProposition = 'Keep the value proposition between 15 and 180 characters.';
    }
    const providedBenefits = draft.keyBenefits.filter((benefit) => benefit.trim());
    const validBenefits = providedBenefits.filter((benefit) =>
      lengthBetween(benefit, 3, 100),
    );
    if (
      validBenefits.length < 1 ||
      providedBenefits.length > 3 ||
      validBenefits.length !== providedBenefits.length
    ) {
      errors.keyBenefits = 'Add one to three benefits, each 3–100 characters.';
    }
    if (!draft.primaryCta) errors.primaryCta = 'Choose a primary call to action.';
    if (draft.proofConstraints.length > 400) {
      errors.proofConstraints = 'Keep proof and claim limits under 400 characters.';
    }
  }

  if (step === 3) {
    if (!lengthBetween(draft.brandName, 2, 80)) {
      errors.brandName = 'Use 2–80 characters for the brand name.';
    }
    if (draft.brandTones.length < 1 || draft.brandTones.length > 3) {
      errors.brandTones = 'Choose between one and three brand tones.';
    }
    if (!lengthBetween(draft.brandVoice, 15, 240)) {
      errors.brandVoice = 'Describe the brand voice in 15–240 characters.';
    }
    if (draft.requiredMessages.length > 300) {
      errors.requiredMessages = 'Keep required messages under 300 characters.';
    }
    if (draft.brandAvoid.length > 300) {
      errors.brandAvoid = 'Keep brand exclusions under 300 characters.';
    }
    if (!isHttpUrl(draft.brandReferenceUrl)) {
      errors.brandReferenceUrl = 'Enter a complete http:// or https:// URL.';
    }
  }

  if (step === 4) {
    if (draft.channels.length < 1 || draft.channels.length > 4) {
      errors.channels = 'Choose between one and four campaign channels.';
    }
    if (!draft.channels.includes(draft.primaryChannel)) {
      errors.primaryChannel = 'Choose a primary channel from the selected channels.';
    }
    if (!draft.campaignDuration) {
      errors.campaignDuration = 'Choose a campaign duration.';
    }
    if (!isHttpUrl(draft.destinationUrl)) {
      errors.destinationUrl = 'Enter a complete http:// or https:// URL.';
    }
  }

  if (step === 5) {
    if (!draft.creativeStyle) errors.creativeStyle = 'Choose a creative style.';
    if (!draft.creativeEnergy) errors.creativeEnergy = 'Choose the energy level.';
    if (!draft.masterDuration) errors.masterDuration = 'Choose a master duration.';
    if (!lengthBetween(draft.mustShow, 10, 300)) {
      errors.mustShow = 'Describe must-show elements in 10–300 characters.';
    }
    if (draft.avoidVisually.length > 300) {
      errors.avoidVisually = 'Keep visual exclusions under 300 characters.';
    }
    if (!draft.peoplePolicy) errors.peoplePolicy = 'Choose who may appear on screen.';
    if (
      draft.peoplePolicy === 'Synthetic Performer' &&
      !draft.syntheticRightsConfirmed
    ) {
      errors.syntheticRightsConfirmed =
        'Confirm identity rights and disclosure before using a synthetic performer.';
    }
  }

  if (step === 6) {
    if (!lengthBetween(draft.campaignName, 3, 100)) {
      errors.campaignName = 'Use 3–100 characters for the campaign name.';
    }
    if (!draft.confirmAssetRights) {
      errors.confirmAssetRights = 'Confirm permission for submitted assets and claims.';
    }
    if (!draft.confirmNoUnauthorizedIdentity) {
      errors.confirmNoUnauthorizedIdentity =
        'Confirm the campaign excludes unauthorized identities and protected material.';
    }
    if (!draft.confirmHumanReview) {
      errors.confirmHumanReview = 'Confirm that every output receives human review.';
    }
  }

  return errors;
}

export function validateEntireCampaign(draft: CampaignDraft) {
  return [1, 2, 3, 4, 5, 6].reduce<CampaignValidationErrors>(
    (allErrors, step) => ({
      ...allErrors,
      ...validateCampaignStep(step, draft),
    }),
    {},
  );
}
