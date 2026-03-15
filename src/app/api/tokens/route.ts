import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth';
import { apiError } from '@/lib/api-errors';
import { createApiToken, listApiTokens } from '@/lib/api-tokens';
import { addWebLog } from '@/lib/logs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) {
    return apiError(401, 'UNAUTHORIZED', 'Login required');
  }
  if (account.role !== 'admin') {
    return apiError(403, 'FORBIDDEN', 'Admin role required');
  }

  return NextResponse.json(listApiTokens());
}

export async function POST(request: NextRequest) {
  const account = await getCurrentAccount();
  if (!account) {
    return apiError(401, 'UNAUTHORIZED', 'Login required');
  }
  if (account.role !== 'admin') {
    return apiError(403, 'FORBIDDEN', 'Admin role required');
  }

  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = body?.name?.trim();

  if (!name) {
    return apiError(400, 'INVALID_INPUT', 'Token name is required');
  }

  const token = createApiToken(name);
  await addWebLog('create_token', `Token: ${token.name}`, undefined, token.prefix, {
    username: account.username,
    role: account.role,
  });

  return NextResponse.json(token);
}
