import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { withApiRequestLog } from '@/lib/api-logging';
import { getAllUsers } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withApiRequestLog(
    request,
    auth => {
      if (!auth) {
        return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
      }

      const users = getAllUsers().map(user => ({
        id: user.id,
        name: user.name,
        isActive: Boolean(user.is_active),
      }));

      return NextResponse.json(users);
    },
    {
      loadContext: authenticateApiRequest,
      getActor: auth => auth
        ? {
          username: `token:${auth.token.name}`,
          role: auth.account.role,
        }
        : {
          username: 'anonymous',
          role: null,
        },
    }
  );
}
