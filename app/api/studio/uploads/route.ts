import { assertSameOrigin, jsonError, readLimitedJson } from '../../../../lib/server/api-errors';
import { initiateFalUpload } from '../../../../lib/server/fal-storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readLimitedJson(request, 16_384);
    const response = await initiateFalUpload(body);
    return Response.json(response, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return jsonError(error);
  }
}
