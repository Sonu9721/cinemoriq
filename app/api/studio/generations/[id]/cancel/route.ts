import { assertSameOrigin, jsonError } from '../../../../../../lib/server/api-errors';
import { cancelGeneration } from '../../../../../../lib/server/generation-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const response = await cancelGeneration(id);
    return Response.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
