// src/lib/schedule.ts
import { getActiveUsers } from './users';
import { setSchedule, getSchedulesByDateRange } from './schedules';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { generateScheduleFromDate as doGenerateScheduleFromDate } from './auto-schedule';
import type { AutoScheduleStartMode } from '@/types';
import { getDefaultScheduleDays } from './config';
import { resolveScheduleEndDate } from './default-schedule-days';
import { getDefaultLeaderId, setLeaderSchedule } from './leader-schedules';

const defaultDeps = {
  getActiveUsers,
  getSchedulesByDateRange,
  setSchedule,
  getDefaultLeaderId,
  setLeaderSchedule,
};

export function generateSchedule(startDate: string, endDate?: string) {
  const users = defaultDeps.getActiveUsers();
  if (users.length === 0) {
    throw new Error('没有参与值班的人员');
  }

  const start = parseISO(startDate);
  const resolvedEndDate = resolveScheduleEndDate(startDate, endDate, getDefaultScheduleDays());
  const end = endDate ? parseISO(endDate) : parseISO(resolvedEndDate);
  const days = eachDayOfInterval({ start, end });

  const endDateStr = resolvedEndDate;

  // 获取已有手动调整的日期
  const existingSchedules = defaultDeps.getSchedulesByDateRange(startDate, endDateStr);
  const manualDates = new Set(
    existingSchedules.filter(s => s.is_manual).map(s => s.date)
  );

  let userIndex = 0;
  const assigned: string[] = [];

  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');

    // 跳过已手动调整的日期
    if (manualDates.has(dateStr)) {
      return;
    }

    const user = users[userIndex % users.length];
    defaultDeps.setSchedule(dateStr, user.id, false);

    // 同步生成值班领导
    const defaultLeaderId = defaultDeps.getDefaultLeaderId();
    if (defaultLeaderId) {
      defaultDeps.setLeaderSchedule(dateStr, defaultLeaderId, false);
    }

    assigned.push(`${dateStr}: ${user.name}`);
    userIndex++;
  });
}

export function generateScheduleFromDate(
  startDate: string,
  days: number,
  startMode: AutoScheduleStartMode
) {
  return doGenerateScheduleFromDate(startDate, days, startMode, defaultDeps);
}
