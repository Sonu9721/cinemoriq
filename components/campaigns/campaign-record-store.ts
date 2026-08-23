import { sanitizeCampaignDraft } from './campaign-draft-store';
import {
  CAMPAIGN_RECORD_SCHEMA_VERSION,
  CAMPAIGN_RECORDS_STORAGE_KEY,
  DEMO_CAMPAIGN_ID,
  createCampaignRecord,
  demoCampaignDraft,
  type CampaignEvent,
  type CampaignRecord,
  type CampaignRecordStatus,
} from './campaign-record-model';
import type { CampaignDraft } from './campaign-wizard-model';

type CampaignCollection = {
  schemaVersion: number;
  latestCampaignId: string | null;
  records: CampaignRecord[];
};

function emptyCollection(): CampaignCollection {
  return {
    schemaVersion: CAMPAIGN_RECORD_SCHEMA_VERSION,
    latestCampaignId: null,
    records: [],
  };
}

function sanitizeEvent(value: unknown): CampaignEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Partial<CampaignEvent> & { timeLabel?: unknown };
  if (
    typeof event.id !== 'string' ||
    typeof event.title !== 'string' ||
    typeof event.detail !== 'string' ||
    !['complete', 'active', 'waiting'].includes(event.state ?? '')
  ) {
    return null;
  }

  let occurredAt: string | null = null;
  if (
    typeof event.occurredAt === 'string' &&
    !Number.isNaN(Date.parse(event.occurredAt))
  ) {
    occurredAt = event.occurredAt;
  } else if (typeof event.timeLabel === 'string' && event.state !== 'waiting') {
    const legacyMinutes = Number.parseInt(event.timeLabel, 10);
    occurredAt = new Date(
      Date.now() - (Number.isFinite(legacyMinutes) ? legacyMinutes : 0) * 60 * 1000,
    ).toISOString();
  }

  return {
    id: event.id,
    title: event.title,
    detail: event.detail,
    occurredAt,
    state: event.state as CampaignEvent['state'],
  };
}

function sanitizeRecord(value: unknown): CampaignRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<CampaignRecord>;
  const draft = sanitizeCampaignDraft(record.draft);
  if (
    record.schemaVersion !== CAMPAIGN_RECORD_SCHEMA_VERSION ||
    typeof record.id !== 'string' ||
    !record.id.trim() ||
    !draft
  ) {
    return null;
  }

  const status: CampaignRecordStatus = [
    'concept-development',
    'awaiting-review',
  ].includes(record.status ?? '')
    ? (record.status as CampaignRecordStatus)
    : 'concept-development';

  return {
    schemaVersion: CAMPAIGN_RECORD_SCHEMA_VERSION,
    id: record.id,
    kind: record.kind === 'sample' ? 'sample' : 'generated',
    createdAt:
      typeof record.createdAt === 'string'
        ? record.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof record.updatedAt === 'string'
        ? record.updatedAt
        : new Date().toISOString(),
    status,
    activeWorkflowStage:
      typeof record.activeWorkflowStage === 'number'
        ? Math.min(4, Math.max(0, Math.floor(record.activeWorkflowStage)))
        : 2,
    paused: Boolean(record.paused),
    draft,
    conceptTitle:
      typeof record.conceptTitle === 'string' && record.conceptTitle.trim()
        ? record.conceptTitle.slice(0, 100)
        : record.kind === 'sample'
          ? 'Neon Ascendance'
          : `${draft.productName || draft.brandName || draft.campaignName || 'Campaign'} — Concept A`.slice(0, 100),
    events: Array.isArray(record.events)
      ? record.events
          .map(sanitizeEvent)
          .filter((event): event is CampaignEvent => Boolean(event))
          .slice(0, 20)
      : [],
  };
}

function loadCollection(): CampaignCollection {
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_RECORDS_STORAGE_KEY);
    if (!raw) return emptyCollection();
    const parsed = JSON.parse(raw) as Partial<CampaignCollection>;
    if (parsed.schemaVersion !== CAMPAIGN_RECORD_SCHEMA_VERSION) {
      return emptyCollection();
    }
    const records = Array.isArray(parsed.records)
      ? parsed.records
          .map(sanitizeRecord)
          .filter((record): record is CampaignRecord => Boolean(record))
      : [];
    const latestCampaignId =
      typeof parsed.latestCampaignId === 'string' &&
      records.some((record) => record.id === parsed.latestCampaignId)
        ? parsed.latestCampaignId
        : records[0]?.id ?? null;
    return {
      schemaVersion: CAMPAIGN_RECORD_SCHEMA_VERSION,
      latestCampaignId,
      records,
    };
  } catch {
    return emptyCollection();
  }
}

function saveCollection(collection: CampaignCollection) {
  window.localStorage.setItem(
    CAMPAIGN_RECORDS_STORAGE_KEY,
    JSON.stringify(collection),
  );
}

export function saveCampaignRecord(record: CampaignRecord) {
  const collection = loadCollection();
  const nextRecord = { ...record, updatedAt: new Date().toISOString() };
  const records = [
    nextRecord,
    ...collection.records.filter((item) => item.id !== record.id),
  ].slice(0, 20);
  saveCollection({
    schemaVersion: CAMPAIGN_RECORD_SCHEMA_VERSION,
    latestCampaignId: record.id,
    records,
  });
  return nextRecord;
}

export function createAndSaveCampaignRecord(draft: CampaignDraft) {
  return saveCampaignRecord(createCampaignRecord(draft));
}

export function loadLatestCampaignRecord() {
  const collection = loadCollection();
  return (
    collection.records.find(
      (record) => record.id === collection.latestCampaignId,
    ) ?? null
  );
}

export function loadCampaignRecord(campaignId: string) {
  const collection = loadCollection();
  return collection.records.find((record) => record.id === campaignId) ?? null;
}

export function ensureDemoCampaignRecord() {
  const collection = loadCollection();
  const existing = collection.records.find(
    (record) => record.id === DEMO_CAMPAIGN_ID,
  );
  if (existing) return existing;

  const demoRecord = createCampaignRecord(demoCampaignDraft, {
    id: DEMO_CAMPAIGN_ID,
    kind: 'sample',
  });
  saveCollection({
    schemaVersion: CAMPAIGN_RECORD_SCHEMA_VERSION,
    latestCampaignId: collection.latestCampaignId ?? demoRecord.id,
    records: [demoRecord, ...collection.records].slice(0, 20),
  });
  return demoRecord;
}
