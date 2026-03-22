import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { getAllLeaders } from '@/lib/leaders';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!authenticateApiRequest(request)) {
    return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
  }

  const leaders = getAllLeaders().map(leader => ({
    id: leader.id,
    name: leader.name,
    isActive: Boolean(leader.is_active),
  }));

  return NextResponse.json(leaders);
}
