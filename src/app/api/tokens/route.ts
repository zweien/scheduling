import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { apiError } from '@/lib/api-errors';
import { createApiToken, listApiTokens } from '@/lib/api-tokens';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await checkAuth())) {
    return apiError(401, 'UNAUTHORIZED', 'Login required');
  }

  return NextResponse.json(listApiTokens());
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth())) {
    return apiError(401, 'UNAUTHORIZED', 'Login required');
  }

  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = body?.name?.trim();

  if (!name) {
    return apiError(400, 'INVALID_INPUT', 'Token name is required');
  }

  return NextResponse.json(createApiToken(name));
}
