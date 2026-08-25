import { assertSameOrigin, jsonError, readLimitedJson } from '../../../../lib/server/api-errors';
import { assertSessionCsrf, requireAuthenticatedRequest } from '../../../../lib/server/auth';
import {
  listCampaignGenerations,
  submitGeneration,
} from '../../../../lib/server/generation-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuthenticatedRequest(request);
    const campaignId = new URL(request.url).searchParams.get('campaignId') ?? '';
    const response = await listCampaignGenerations(campaignId);
    return Response.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuthenticatedRequest(request);
    assertSameOrigin(request);
    assertSessionCsrf(request, session);
    const body = await readLimitedJson(request);
    const response = await submitGeneration(request, body);
    return Response.json(response, {
      status: ['succeeded', 'failed', 'cancelled'].includes(response.job.status)
        ? 200
        : 202,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return jsonError(error);
  }
}
