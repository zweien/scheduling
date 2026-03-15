import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { apiError } from '@/lib/api-errors';
import { disableApiToken } from '@/lib/api-tokens';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await checkAuth())) {
    return apiError(401, 'UNAUTHORIZED', 'Login required');
  }

  const body = await request.json().catch(() => null) as { disabled?: boolean } | null;
  if (body?.disabled !== true) {
    return apiError(400, 'INVALID_INPUT', 'Only disabling a token is supported');
  }

  const { id } = await params;
  const token = disableApiToken(Number(id));
  if (!token) {
    return apiError(404, 'NOT_FOUND', 'Token not found');
  }

  return NextResponse.json(token);
}
