import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { withApiRequestLog } from '@/lib/api-logging';
import { getScheduleStats } from '@/lib/schedules';
import { getUserById } from '@/lib/users';
import { summarizeDutyDates } from '@/lib/duty-summary';
import { resolveStatsRange } from '@/lib/stats-range';
import { ensureHolidaysLoaded } from '@/lib/holidays';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withApiRequestLog(
    request,
    async auth => {
      if (!auth) {
        return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
      }

      const params = request.nextUrl.searchParams;
      const range = resolveStatsRange({
        start: params.get('start'),
        end: params.get('end'),
        year: params.get('year'),
        month: params.get('month'),
      });

      if (!range) {
        return apiError(400, 'INVALID_INPUT', 'provide start+end, year, or month');
      }

      // best-effort 拉取区间内各年份的法定节假日（失败自动回退到静态基线）
      const startYear = Number(range.start.slice(0, 4));
      const endYear = Number(range.end.slice(0, 4));
      const years: number[] = [];
      for (let y = startYear; y <= endYear; y++) years.push(y);
      await ensureHolidaysLoaded(years);

      const rawStats = getScheduleStats(range.start, range.end);

      const stats = rawStats.map(s => {
        const summary = summarizeDutyDates(s.dates);
        return {
          userId: s.userId,
          userName: getUserById(s.userId)?.name ?? '未知',
          count: s.count,
          restDayCount: summary.restDayCount,
          holidayCount: summary.holidayCount,
          adjustedWorkdayCount: summary.adjustedWorkdayCount,
          dates: s.dates,
          restDays: summary.restDays,
        };
      });

      return NextResponse.json({
        range,
        total: stats.reduce((sum, s) => sum + s.count, 0),
        userCount: stats.length,
        stats,
      });
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
