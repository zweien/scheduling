import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, canWriteWithApiToken } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { addApiLog } from '@/lib/logs';
import { getLeaderScheduleByDate, setLeaderSchedule } from '@/lib/leader-schedules';
import { getLeaderById } from '@/lib/leaders';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ date: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = authenticateApiRequest(request);
  if (!auth) {
    return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
  }
  if (!canWriteWithApiToken(auth)) {
    return apiError(403, 'FORBIDDEN', 'Write access requires admin role');
  }

  const body = await request.json().catch(() => null) as { leaderId?: number } | null;
  if (!body?.leaderId) {
    return apiError(400, 'INVALID_INPUT', 'leaderId is required');
  }

  const { date } = await params;
  const leader = getLeaderById(body.leaderId);
  if (!leader) {
    return apiError(404, 'NOT_FOUND', 'Leader not found');
  }

  const previous = getLeaderScheduleByDate(date);
  setLeaderSchedule(date, leader.id, true);
  addApiLog('replace_leader_schedule', `日期: ${date}`, previous?.leader.name ?? '无', leader.name, request, {
    username: `token:${auth.token.name}`,
    role: auth.account.role,
  });

  const updated = getLeaderScheduleByDate(date);
  if (!updated) {
    return apiError(404, 'NOT_FOUND', 'Leader schedule not found');
  }

  return NextResponse.json({
    id: updated.id,
    date: updated.date,
    isManual: Boolean(updated.is_manual),
    leader: {
      id: updated.leader.id,
      name: updated.leader.name,
    },
  });
}
