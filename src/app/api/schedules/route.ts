import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { withApiRequestLog } from '@/lib/api-logging';
import { getSchedulesByDateRange } from '@/lib/schedules';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withApiRequestLog(
    request,
    auth => {
      if (!auth) {
        return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
      }

      const start = request.nextUrl.searchParams.get('start');
      const end = request.nextUrl.searchParams.get('end');

      if (!start || !end) {
        return apiError(400, 'INVALID_INPUT', 'start and end are required');
      }

      const schedules = getSchedulesByDateRange(start, end).map(schedule => ({
        id: schedule.id,
        date: schedule.date,
        isManual: Boolean(schedule.is_manual),
        user: {
          id: schedule.user.id,
          name: schedule.user.name,
          isActive: Boolean(schedule.user.is_active),
        },
      }));

      return NextResponse.json(schedules);
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
