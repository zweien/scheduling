// src/lib/schedule.ts
import { getActiveUsers } from './users';
import { setSchedule, getSchedulesByDateRange } from './schedules';
import { format, eachDayOfInterval, parseISO, addDays } from 'date-fns';

export function generateSchedule(startDate: string, endDate?: string) {
  const users = getActiveUsers();
  if (users.length === 0) {
    throw new Error('没有参与值班的人员');
  }

  const start = parseISO(startDate);
  // 如果没有结束日期，只排一轮（参与人数 = 天数）
  const end = endDate ? parseISO(endDate) : addDays(start, users.length - 1);
  const days = eachDayOfInterval({ start, end });

  const endDateStr = endDate || format(end, 'yyyy-MM-dd');

  // 获取已有手动调整的日期
  const existingSchedules = getSchedulesByDateRange(startDate, endDateStr);
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
    setSchedule(dateStr, user.id, false);
    assigned.push(`${dateStr}: ${user.name}`);
    userIndex++;
  });
}
