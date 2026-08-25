import { GenerationApiException, assertSameOrigin, jsonError, readLimitedJson } from '../../../../../../lib/server/api-errors';
import { reviewGeneration } from '../../../../../../lib/server/generation-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const body = await readLimitedJson(request, 2_048);
    const state = body && typeof body === 'object' ? (body as { state?: unknown }).state : null;
    if (state !== 'approved' && state !== 'changes-requested') {
      throw new GenerationApiException(400, 'INVALID_REVIEW_STATE', 'Choose approve or request changes.');
    }
    const { id } = await params;
    const response = await reviewGeneration(id, state);
    return Response.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
