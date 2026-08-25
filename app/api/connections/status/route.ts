import { getConnectionStatus } from '../../../../lib/server/runtime-env';
import { jsonError } from '../../../../lib/server/api-errors';
import { requireAuthenticatedRequest } from '../../../../lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAuthenticatedRequest(request);
    const status = getConnectionStatus();
    return Response.json(
      {
        fal: { configured: status.fal },
        minimax: { configured: status.minimax },
        database: { configured: status.database },
        mediaStorage: { configured: status.mediaStorage },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
