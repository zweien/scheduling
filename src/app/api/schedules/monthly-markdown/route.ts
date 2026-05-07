import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { apiError } from '@/lib/api-errors';
import { withApiRequestLog } from '@/lib/api-logging';
import {
  buildMonthlyCalendarMarkdown,
  getMonthDateRange,
} from '@/lib/export/calendar-markdown';
import { getSchedulesByDateRange } from '@/lib/schedules';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withApiRequestLog(
    request,
    auth => {
      if (!auth) {
        return apiError(401, 'UNAUTHORIZED', 'Invalid or disabled token');
      }

      const month = request.nextUrl.searchParams.get('month');
      if (!month) {
        return apiError(400, 'INVALID_INPUT', 'month is required');
      }

      const dateRange = getMonthDateRange(month);
      if (!dateRange) {
        return apiError(400, 'INVALID_INPUT', 'month must use YYYY-MM format');
      }

      const schedules = getSchedulesByDateRange(dateRange.startDate, dateRange.endDate);
      const markdown = buildMonthlyCalendarMarkdown(month, schedules);

      return new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
        },
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
