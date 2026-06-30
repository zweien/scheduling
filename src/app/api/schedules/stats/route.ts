import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { withApiRequestLog } from '@/lib/api-logging';
import { getScheduleStats } from '@/lib/schedules';
import { getUserById } from '@/lib/users';
import { summarizeDutyDates } from '@/lib/duty-summary';
import { resolveStatsRange, holidayYearsForRange } from '@/lib/stats-range';
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

      // best-effort 拉取区间相关年份的法定节假日（含相邻年；失败自动回退到静态基线）。
      // 跨度过大返回 400，避免触发海量并发拉取。
      const years = holidayYearsForRange(range.start, range.end);
      if (!years) {
        return apiError(400, 'INVALID_INPUT', 'range too wide (max 10 years)');
      }
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
