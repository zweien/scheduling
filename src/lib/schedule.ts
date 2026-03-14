// src/lib/schedule.ts
import { getAllUsers } from './users';
import { setSchedule, getSchedulesByDateRange } from './schedules';
import { addLog } from './logs';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

export function generateSchedule(startDate: string, endDate: string) {
  const users = getAllUsers();
  if (users.length === 0) {
    throw new Error('请先添加值班人员');
  }

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days = eachDayOfInterval({ start, end });

  // 获取已有手动调整的日期
  const existingSchedules = getSchedulesByDateRange(startDate, endDate);
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

  addLog('generate_schedule', `日期: ${startDate} ~ ${endDate}`, undefined, assigned.join(', '));
}
