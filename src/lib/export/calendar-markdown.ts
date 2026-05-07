import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { ScheduleWithUser } from '@/types';

const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const weekStartsOn = { weekStartsOn: 1 as const };
const monthPattern = /^\d{4}-\d{2}$/;

type MonthDateRange = {
  startDate: string;
  endDate: string;
};

function parseMonth(month: string) {
  if (!monthPattern.test(month)) {
    return null;
  }

  const parsed = parse(month, 'yyyy-MM', new Date());
  if (!isValid(parsed) || format(parsed, 'yyyy-MM') !== month) {
    return null;
  }

  return parsed;
}

function buildScheduleMap(schedules: ScheduleWithUser[]) {
  return new Map(schedules.map(schedule => [schedule.date, schedule]));
}

function formatCell(day: Date, monthDate: Date, schedule?: ScheduleWithUser) {
  if (!isSameMonth(day, monthDate)) {
    return '';
  }

  const dayText = format(day, 'd');
  if (!schedule) {
    return dayText;
  }

  return `${dayText} ${schedule.user.name}`;
}

export function getMonthDateRange(month: string): MonthDateRange | null {
  const monthDate = parseMonth(month);
  if (!monthDate) {
    return null;
  }

  return {
    startDate: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
  };
}

export function buildMonthlyCalendarMarkdown(month: string, schedules: ScheduleWithUser[] = []) {
  const monthDate = parseMonth(month);
  if (!monthDate) {
    throw new Error('Invalid month');
  }

  const scheduleMap = buildScheduleMap(schedules);
  const calendarStart = startOfWeek(startOfMonth(monthDate), weekStartsOn);
  const calendarEnd = endOfWeek(endOfMonth(monthDate), weekStartsOn);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const lines = [
    `# ${format(monthDate, 'yyyy年M月')}值班表`,
    '',
    `| ${weekLabels.join(' | ')} |`,
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (let index = 0; index < days.length; index += 7) {
    const week = days.slice(index, index + 7);
    const cells = week.map(day => formatCell(day, monthDate, scheduleMap.get(format(day, 'yyyy-MM-dd'))));
    lines.push(`| ${cells.join(' | ')} |`);
  }

  return lines.join('\n');
}
