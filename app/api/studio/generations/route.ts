import { assertSameOrigin, jsonError, readLimitedJson } from '../../../../lib/server/api-errors';
import { submitGeneration } from '../../../../lib/server/generation-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
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
