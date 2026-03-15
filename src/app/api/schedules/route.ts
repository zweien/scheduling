import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { getSchedulesByDateRange } from '@/lib/schedules';

export async function GET(request: NextRequest) {
  if (!authenticateApiRequest(request)) {
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
}
