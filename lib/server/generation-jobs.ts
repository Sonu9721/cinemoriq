import {
  GENERATION_JOBS_ACTIVE_INDEX_SQL,
  GENERATION_JOBS_IDEMPOTENCY_INDEX_SQL,
  GENERATION_JOBS_PROVIDER_INDEX_SQL,
  GENERATION_JOBS_TABLE_SQL,
  GENERATION_JOBS_VERSION_INDEX_SQL,
  type GenerationJobRow,
} from '../../db/schema';
import { getRuntimeEnv } from './runtime-env';

const generationJobColumns = [
  'id',
  'campaign_id',
  'scene_id',
  'version_id',
  'idempotency_key',
  'provider',
  'model_key',
  'generation_mode',
  'endpoint_id',
  'status',
  'progress',
  'provider_request_id',
  'provider_status_url',
  'provider_response_url',
  'provider_cancel_url',
  'input_json',
  'request_hash',
  'output_json',
  'object_key',
  'mime_type',
  'file_size',
  'error_code',
  'error_message',
  'estimated_cost_usd',
  'maximum_cost_usd',
  'next_poll_at',
  'poll_lease_until',
  'poll_error_count',
  'cancellation_requested_at',
  'review_state',
  'reviewed_at',
  'created_at',
  'updated_at',
  'completed_at',
] as const satisfies ReadonlyArray<keyof GenerationJobRow>;

const mutableColumns = generationJobColumns.filter(
  (column) => column !== 'id' && column !== 'created_at',
) as Array<Exclude<(typeof generationJobColumns)[number], 'id' | 'created_at'>>;

function getDatabase() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new Error('Generation database is not configured.');
  return database;
}

export async function ensureGenerationSchema() {
  const database = getDatabase();
  await database.batch([
    database.prepare(GENERATION_JOBS_TABLE_SQL),
    database.prepare(GENERATION_JOBS_ACTIVE_INDEX_SQL),
    database.prepare(GENERATION_JOBS_IDEMPOTENCY_INDEX_SQL),
    database.prepare(GENERATION_JOBS_PROVIDER_INDEX_SQL),
    database.prepare(GENERATION_JOBS_VERSION_INDEX_SQL),
    database.prepare('PRAGMA optimize'),
  ]);
  return database;
}

export async function getGenerationJobByIdempotencyKey(idempotencyKey: string) {
  const database = await ensureGenerationSchema();
  return database
    .prepare('SELECT * FROM generation_jobs WHERE idempotency_key = ? LIMIT 1')
    .bind(idempotencyKey)
    .first<GenerationJobRow>();
}

export async function getGenerationJobByVersion(sceneId: string, versionId: string) {
  const database = await ensureGenerationSchema();
  return database
    .prepare(
      'SELECT * FROM generation_jobs WHERE scene_id = ? AND version_id = ? LIMIT 1',
    )
    .bind(sceneId, versionId)
    .first<GenerationJobRow>();
}

export async function listGenerationJobsForCampaign(campaignId: string) {
  const database = await ensureGenerationSchema();
  const result = await database
    .prepare(
      `SELECT * FROM generation_jobs
       WHERE campaign_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
    )
    .bind(campaignId)
    .all<GenerationJobRow>();
  return result.results ?? [];
}

export async function countActiveGenerationJobs() {
  const database = await ensureGenerationSchema();
  const result = await database
    .prepare(
      `SELECT COUNT(*) AS count FROM generation_jobs
       WHERE status IN ('submitting', 'queued', 'processing', 'storing')`,
    )
    .first<{ count: number }>();
  return Number(result?.count ?? 0);
}

export async function countRecentGenerationJobs(sinceIso: string) {
  const database = await ensureGenerationSchema();
  const result = await database
    .prepare('SELECT COUNT(*) AS count FROM generation_jobs WHERE created_at >= ?')
    .bind(sinceIso)
    .first<{ count: number }>();
  return Number(result?.count ?? 0);
}

export async function acquireGenerationPollLease(
  id: string,
  nowMs: number,
  leaseUntilMs: number,
) {
  const database = await ensureGenerationSchema();
  const result = await database
    .prepare(
      `UPDATE generation_jobs
       SET poll_lease_until = ?, updated_at = ?
       WHERE id = ?
         AND status IN ('queued', 'processing', 'storing')
         AND (poll_lease_until IS NULL OR poll_lease_until < ?)`,
    )
    .bind(leaseUntilMs, new Date(nowMs).toISOString(), id, nowMs)
    .run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function insertGenerationJob(row: GenerationJobRow) {
  const database = await ensureGenerationSchema();
  const placeholders = generationJobColumns.map(() => '?').join(', ');
  const values = generationJobColumns.map((column) => row[column]);
  await database
    .prepare(
      `INSERT INTO generation_jobs (${generationJobColumns.join(', ')}) VALUES (${placeholders})`,
    )
    .bind(...values)
    .run();
  return row;
}

export async function getGenerationJob(id: string) {
  const database = await ensureGenerationSchema();
  return database
    .prepare('SELECT * FROM generation_jobs WHERE id = ? LIMIT 1')
    .bind(id)
    .first<GenerationJobRow>();
}

export async function updateGenerationJob(
  id: string,
  patch: Partial<Omit<GenerationJobRow, 'id' | 'created_at'>>,
) {
  const entries = mutableColumns
    .filter((column) => Object.prototype.hasOwnProperty.call(patch, column))
    .map((column) => [column, patch[column]] as const);
  if (!entries.length) return getGenerationJob(id);
  const database = await ensureGenerationSchema();
  const assignments = entries.map(([column]) => `${column} = ?`).join(', ');
  await database
    .prepare(`UPDATE generation_jobs SET ${assignments} WHERE id = ?`)
    .bind(...entries.map(([, value]) => value), id)
    .run();
  return getGenerationJob(id);
}

export async function updateGenerationJobIfCurrent(
  id: string,
  expectedStatuses: string[],
  expectedPollLeaseUntil: number | null,
  patch: Partial<Omit<GenerationJobRow, 'id' | 'created_at'>>,
) {
  if (!expectedStatuses.length) {
    return { updated: false, row: await getGenerationJob(id) };
  }
  const entries = mutableColumns
    .filter((column) => Object.prototype.hasOwnProperty.call(patch, column))
    .map((column) => [column, patch[column]] as const);
  if (!entries.length) {
    return { updated: false, row: await getGenerationJob(id) };
  }
  const database = await ensureGenerationSchema();
  const assignments = entries.map(([column]) => `${column} = ?`).join(', ');
  const statusPlaceholders = expectedStatuses.map(() => '?').join(', ');
  const leaseClause =
    expectedPollLeaseUntil === null
      ? 'poll_lease_until IS NULL'
      : 'poll_lease_until = ?';
  const result = await database
    .prepare(
      `UPDATE generation_jobs SET ${assignments}
       WHERE id = ? AND status IN (${statusPlaceholders}) AND ${leaseClause}`,
    )
    .bind(
      ...entries.map(([, value]) => value),
      id,
      ...expectedStatuses,
      ...(expectedPollLeaseUntil === null ? [] : [expectedPollLeaseUntil]),
    )
    .run();
  return {
    updated: Number(result.meta.changes ?? 0) > 0,
    row: await getGenerationJob(id),
  };
}
