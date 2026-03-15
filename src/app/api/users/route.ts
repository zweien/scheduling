import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { getAllUsers } from '@/lib/users';

export async function GET(request: NextRequest) {
  if (!authenticateApiRequest(request)) {
    return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
  }

  const users = getAllUsers().map(user => ({
    id: user.id,
    name: user.name,
    isActive: Boolean(user.is_active),
  }));

  return NextResponse.json(users);
}
