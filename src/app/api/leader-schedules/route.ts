import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { getLeaderSchedulesByDateRange } from '@/lib/leader-schedules';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!authenticateApiRequest(request)) {
    return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
  }

  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');

  if (!start || !end) {
    return apiError(400, 'INVALID_INPUT', 'start and end are required');
  }

  const schedules = getLeaderSchedulesByDateRange(start, end).map(schedule => ({
    id: schedule.id,
    date: schedule.date,
    isManual: Boolean(schedule.is_manual),
    leader: {
      id: schedule.leader.id,
      name: schedule.leader.name,
    },
  }));

  return NextResponse.json(schedules);
}
