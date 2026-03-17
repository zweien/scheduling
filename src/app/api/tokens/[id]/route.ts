import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth';
import { apiError } from '@/lib/api-errors';
import { disableApiToken } from '@/lib/api-tokens';
import { addWebLog } from '@/lib/logs';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const account = await getCurrentAccount();
  if (!account) {
    return apiError(401, 'UNAUTHORIZED', 'Login required');
  }

  const body = await request.json().catch(() => null) as { disabled?: boolean } | null;
  if (body?.disabled !== true) {
    return apiError(400, 'INVALID_INPUT', 'Only disabling a token is supported');
  }

  const { id } = await params;
  const token = disableApiToken(Number(id), account.id);
  if (!token) {
    return apiError(404, 'NOT_FOUND', 'Token not found');
  }

  await addWebLog('disable_token', `Token: ${token.name}`, undefined, token.prefix, {
    username: account.username,
    role: account.role,
  });

  return NextResponse.json(token);
}
