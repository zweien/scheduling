import { addDays, eachDayOfInterval, format, parseISO, subDays } from 'date-fns';

type AutoScheduleStartMode = 'continue' | 'from_first';

type AutoScheduleUser = {
  id: number;
  name: string;
};

type AutoScheduleSchedule = {
  date: string;
  user_id: number;
};

type AutoScheduleDeps = {
  getActiveUsers: () => AutoScheduleUser[];
  getSchedulesByDateRange: (startDate: string, endDate: string) => AutoScheduleSchedule[];
  setSchedule: (date: string, userId: number, isManual?: boolean) => void;
};

type AutoScheduledItem = {
  date: string;
  userId: number;
  userName: string;
};

export function generateScheduleFromDate(
  startDate: string,
  days: number,
  startMode: AutoScheduleStartMode,
  deps: AutoScheduleDeps
) {
  const normalizedDays = Number.parseInt(String(days), 10);
  if (!Number.isFinite(normalizedDays) || normalizedDays < 1) {
    throw new Error('连续天数必须大于等于 1');
  }

  const users = deps.getActiveUsers();
  if (users.length === 0) {
    throw new Error('没有参与值班的人员');
  }

  const start = parseISO(startDate);
  const end = addDays(start, normalizedDays - 1);
  const endDate = format(end, 'yyyy-MM-dd');
  const existingSchedules = deps.getSchedulesByDateRange(startDate, endDate);
  if (existingSchedules.length > 0) {
    throw new Error('所选范围内已有排班');
  }

  let startIndex = 0;
  if (startMode === 'continue') {
    const previousDate = format(subDays(start, 1), 'yyyy-MM-dd');
    const previousSchedules = deps.getSchedulesByDateRange('0001-01-01', previousDate);
    const previousSchedule = previousSchedules[previousSchedules.length - 1];
    if (previousSchedule) {
      const previousIndex = users.findIndex(user => user.id === previousSchedule.user_id);
      if (previousIndex >= 0) {
        startIndex = (previousIndex + 1) % users.length;
      }
    }
  }

  const assigned: AutoScheduledItem[] = [];
  eachDayOfInterval({ start, end }).forEach((day, index) => {
    const date = format(day, 'yyyy-MM-dd');
    const user = users[(startIndex + index) % users.length];
    deps.setSchedule(date, user.id, false);
    assigned.push({
      date,
      userId: user.id,
      userName: user.name,
    });
  });

  return {
    startDate,
    endDate,
    days: normalizedDays,
    startMode,
    assigned,
  };
}
