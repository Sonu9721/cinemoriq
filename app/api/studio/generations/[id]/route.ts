import { jsonError } from '../../../../../lib/server/api-errors';
import { refreshGeneration } from '../../../../../lib/server/generation-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const response = await refreshGeneration(id);
    return Response.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
