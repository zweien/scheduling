import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { addLog } from '@/lib/logs';
import { getScheduleByDate, setSchedule } from '@/lib/schedules';
import { getUserById } from '@/lib/users';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ date: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!authenticateApiRequest(request)) {
    return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
  }

  const body = await request.json().catch(() => null) as { userId?: number } | null;
  if (!body?.userId) {
    return apiError(400, 'INVALID_INPUT', 'userId is required');
  }

  const { date } = await params;
  const user = getUserById(body.userId);
  if (!user) {
    return apiError(404, 'NOT_FOUND', 'User not found');
  }

  const previous = getScheduleByDate(date);
  setSchedule(date, user.id, true);
  addLog('replace_schedule', `API 日期: ${date}`, previous?.user.name ?? '无', user.name);

  const updated = getScheduleByDate(date);
  if (!updated) {
    return apiError(404, 'NOT_FOUND', 'Schedule not found');
  }

  return NextResponse.json({
    id: updated.id,
    date: updated.date,
    isManual: Boolean(updated.is_manual),
    user: {
      id: updated.user.id,
      name: updated.user.name,
      isActive: Boolean(updated.user.is_active),
    },
  });
}
