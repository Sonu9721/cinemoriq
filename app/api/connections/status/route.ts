import { getConnectionStatus } from '../../../../lib/server/runtime-env';

export const dynamic = 'force-dynamic';

export async function GET() {
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
}
